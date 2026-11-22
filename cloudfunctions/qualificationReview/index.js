// cloudfunctions/qualificationReview/index.js
// 饲养资质材料审核：DeepSeek Chat API，可选视觉模型做图像核验
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const CONFIG = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  chatPath: '/chat/completions',
  textModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  visionModel: process.env.DEEPSEEK_VISION_MODEL || '',
  timeout: Number(process.env.DEEPSEEK_TIMEOUT) || 25000,
  maxImageBytes: Number(process.env.DEEPSEEK_MAX_IMAGE_BYTES) || 1536 * 1024
}

const MATERIAL_RULES = [
  { key: 'identityCard', type: '身份证明', standard: '饲养人身份证明，可体现完全民事行为能力' },
  { key: 'residenceProof', type: '居住证明', standard: '固定住所证明，可体现独户居住条件' },
  { key: 'petSourceProof', type: '宠物来源证明', standard: '合法来源凭证，如购买发票、领养协议、繁育资质' },
  { key: 'healthProof', type: '健康防疫证明', standard: '免疫或检疫记录，且在有效期内' },
  { key: 'petIdentityProof', type: '宠物身份标识', standard: '芯片、犬牌或登记编号等可溯源标识' }
]

const SYSTEM_PROMPT = [
  '你是伴侣动物饲养资质审核助手，依据各地养犬与养宠管理规定审核用户提交的证明材料。',
  '只依据用户消息中给出的材料清单和你实际看到的图像内容做判断，不得臆造未见过的材料信息。',
  '严格输出 JSON，不要输出 JSON 以外的任何文字。'
].join('')

exports.main = async (event) => {
  const { action = 'review', images = {}, userInfo = {}, result = {} } = event || {}

  try {
    if (action === 'test') {
      return {
        success: true,
        message: '云函数连接正常',
        config: {
          apiKeyConfigured: Boolean(CONFIG.apiKey),
          textModel: CONFIG.textModel,
          visionModel: CONFIG.visionModel || null
        }
      }
    }

    if (action === 'saveResult') {
      return await saveResult(result, userInfo)
    }

    if (action !== 'review') {
      return {
        success: false,
        error: `未知操作类型: ${action}`,
        supported_actions: ['review', 'test', 'saveResult']
      }
    }

    return await reviewQualification(images, userInfo)
  } catch (error) {
    console.error('资质审核云函数执行失败:', error.message)
    return { success: false, error: error.message, error_code: error.code || 'REVIEW_FAILED' }
  }
}

async function reviewQualification(images, userInfo) {
  if (!CONFIG.apiKey) {
    throw fail('未配置环境变量 DEEPSEEK_API_KEY', 'MISSING_API_KEY')
  }

  const materials = MATERIAL_RULES.map(rule => ({
    key: rule.key,
    type: rule.type,
    standard: rule.standard,
    fileID: (images && images[rule.key]) || ''
  }))

  const uploaded = materials.filter(item => item.fileID)
  if (uploaded.length === 0) {
    throw fail('没有收到任何材料', 'MISSING_MATERIALS')
  }

  const prompt = buildReviewPrompt(materials, userInfo)

  if (CONFIG.visionModel) {
    try {
      const parts = await buildImageParts(uploaded)
      if (parts.length > 0) {
        const text = await requestCompletion(CONFIG.visionModel, buildVisionContent(prompt, parts))
        return toReviewResult(text, materials, { imagesAnalyzed: true, model: CONFIG.visionModel })
      }
      console.warn('未能获取可用的图片内容，回退到文本初审')
    } catch (error) {
      console.error('视觉模型调用失败，回退到文本初审:', error.message)
    }
  }

  const text = await requestCompletion(CONFIG.textModel, prompt)
  return toReviewResult(text, materials, { imagesAnalyzed: false, model: CONFIG.textModel })
}

function buildReviewPrompt(materials, userInfo) {
  const lines = materials.map(item => {
    const status = item.fileID ? '已上传' : '未上传'
    return `- ${item.type}：${status}；审核要点：${item.standard}`
  })

  const uploadedCount = materials.filter(item => item.fileID).length

  return [
    '请审核以下伴侣动物饲养资质材料。',
    '',
    '材料清单：',
    ...lines,
    '',
    `已上传 ${uploadedCount}/${materials.length} 项。`,
    `申请人：${describeApplicant(userInfo)}`,
    '',
    '输出 JSON，字段如下：',
    '{',
    '  "passed": true 或 false,',
    '  "summary": "50 字以内总体结论",',
    '  "score": 0 到 100 的整数,',
    '  "details": [',
    '    { "type": "材料类型", "passed": true 或 false, "reason": "判断依据", "suggestion": "整改建议，可为空" }',
    '  ],',
    '  "suggestion": "100 字以内综合建议"',
    '}',
    'details 必须覆盖上述 5 类材料。若你看不到图像内容，reason 中必须写明「未获取到图像，无法核验」，不得编造材料内容。'
  ].join('\n')
}

function describeApplicant(userInfo) {
  const profile = (userInfo && userInfo.userInfo) || {}
  const parts = []
  if (profile.nickName) parts.push(`昵称 ${profile.nickName}`)
  if (Array.isArray(profile.region) && profile.region.length > 0) {
    parts.push(`地区 ${profile.region.join(' ')}`)
  }
  return parts.join('；') || '未提供申请人信息'
}

async function requestCompletion(model, content) {
  const response = await axios({
    method: 'POST',
    url: `${CONFIG.baseUrl}${CONFIG.chatPath}`,
    headers: {
      Authorization: `Bearer ${CONFIG.apiKey}`,
      'Content-Type': 'application/json'
    },
    data: {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content }
      ],
      stream: false,
      temperature: 0.1,
      max_tokens: 1200
    },
    timeout: CONFIG.timeout
  })

  const choice = response.data && response.data.choices && response.data.choices[0]
  const text = choice && choice.message && choice.message.content
  if (!text) throw fail('模型未返回有效内容', 'EMPTY_RESPONSE')
  return text
}

function buildVisionContent(prompt, parts) {
  return [{ type: 'text', text: prompt }].concat(parts)
}

async function buildImageParts(uploaded) {
  const parts = []

  for (const item of uploaded) {
    try {
      const res = await cloud.downloadFile({ fileID: item.fileID })
      const buffer = res.fileContent
      if (!buffer || buffer.length === 0) {
        console.warn(`${item.type} 内容为空，跳过`)
        continue
      }
      if (buffer.length > CONFIG.maxImageBytes) {
        console.warn(`${item.type} 超过 ${CONFIG.maxImageBytes} 字节，跳过图像核验`)
        continue
      }
      const base64 = Buffer.from(buffer).toString('base64')
      parts.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } })
    } catch (error) {
      console.error(`下载 ${item.type} 失败:`, error.message)
    }
  }

  return parts
}

function toReviewResult(text, materials, meta) {
  const missing = materials.filter(item => !item.fileID).map(item => item.type)
  const uploadedCount = materials.length - missing.length
  const completeness = Math.round((uploadedCount / materials.length) * 100)

  if (!meta.imagesAnalyzed) {
    return {
      success: true,
      data: {
        passed: missing.length === 0,
        summary: missing.length === 0
          ? `材料 ${uploadedCount}/${materials.length} 已齐备，未做图像核验，需人工复核`
          : `材料 ${uploadedCount}/${materials.length}，缺少 ${missing.join('、')}`,
        details: materials.map(item => ({
          type: item.type,
          passed: Boolean(item.fileID),
          reason: item.fileID ? '已收到材料，当前未配置视觉模型，未核验图像内容' : '未上传该材料',
          suggestion: item.fileID ? '如需核验真伪，请配置视觉模型或转人工复核' : `请补充${item.type}`
        })),
        suggestion: missing.length === 0 ? '材料齐备，建议转人工复核后出具结论' : '补齐材料后重新提交',
        score: completeness,
        rating: '初筛',
        ratingScore: completeness,
        ratingColor: '#9ca3af',
        verification: 'materials_only',
        imagesAnalyzed: false,
        model: meta.model,
        missingMaterials: missing,
        reviewedAt: new Date().toISOString()
      }
    }
  }

  const parsed = parseModelJSON(text)
  const score = clampScore(parsed.score)
  const grade = ratingOf(score)
  const details = normalizeDetails(parsed.details, materials)
  const passed = missing.length === 0 && parsed.passed !== false && score >= 60

  return {
    success: true,
    data: {
      passed,
      summary: parsed.summary || (passed ? '材料符合饲养资质要求' : '材料需要进一步完善'),
      details,
      suggestion: parsed.suggestion || '',
      score,
      rating: grade.rating,
      ratingScore: score,
      ratingColor: grade.color,
      verification: 'images_analyzed',
      imagesAnalyzed: true,
      model: meta.model,
      missingMaterials: missing,
      reviewedAt: new Date().toISOString()
    }
  }
}

function normalizeDetails(details, materials) {
  const source = Array.isArray(details) ? details : []

  return materials.map(item => {
    const hit = source.find(entry => entry && (entry.type === item.type || entry.type === item.key))
    if (hit) {
      return {
        type: item.type,
        passed: Boolean(hit.passed),
        reason: hit.reason || '',
        suggestion: hit.suggestion || ''
      }
    }
    return {
      type: item.type,
      passed: false,
      reason: '模型未返回该材料的审核结论',
      suggestion: ''
    }
  })
}

function parseModelJSON(text) {
  const cleaned = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')

  if (start === -1 || end <= start) {
    throw fail('模型返回内容不是有效 JSON', 'INVALID_MODEL_OUTPUT')
  }

  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch (error) {
    throw fail('解析模型返回 JSON 失败', 'INVALID_MODEL_OUTPUT')
  }
}

function clampScore(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.min(100, Math.round(num)))
}

function ratingOf(score) {
  if (score >= 90) return { rating: '优', color: '#10b981' }
  if (score >= 75) return { rating: '良', color: '#3b82f6' }
  if (score >= 60) return { rating: '中', color: '#f59e0b' }
  return { rating: '差', color: '#ef4444' }
}

async function saveResult(result, userInfo) {
  if (!result || !result.details) throw fail('缺少审核结果', 'MISSING_RESULT')

  const context = cloud.getWXContext()
  const db = cloud.database()
  const res = await db.collection('qualificationReviews').add({
    data: {
      openid: context.OPENID,
      nickName: (userInfo && userInfo.userInfo && userInfo.userInfo.nickName) || '',
      result,
      createdAt: new Date()
    }
  })

  return { success: true, data: { id: res._id } }
}

function fail(message, code) {
  const error = new Error(message)
  error.code = code
  return error
}
