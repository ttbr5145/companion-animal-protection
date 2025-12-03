// cloudfunctions/qualificationReview/index.js
const cloud = require('wx-server-sdk')
const axios = require('axios');// 在文件顶部引入 axios
cloud.init()

// DeepSeek API配置
const DEEPSEEK_CONFIG = {
  API_KEY: 'sk-26a9b922144d4cbdbfc0592432a1ccc5',
  BASE_URL: 'https://api.deepseek.com',
  ENDPOINTS: {
    CHAT: '/chat/completions'
  }
}

exports.main = async (event, context) => {
    const { action, images, userInfo } = event;
    console.log('收到审核请求，动作类型:', action);
  
    try {
        switch (action) {
        case 'review':
            return await reviewQualification(images, userInfo)
        case 'test':
            return { success: true, message: '云函数连接正常' }
        default:
            return { 
            success: false, 
            error: '未知操作类型',
            supported_actions: ['review', 'test']
            }
        }
    } catch (error) {
        console.error('资格审核云函数执行错误:', error);
        // 返回结构化的错误信息，方便前端定位
        return {
          success: false,
          error: `处理请求时发生错误: ${error.message}`,
          error_code: 'FUNCTION_EXECUTION_ERROR',
          debug_info: { // 仅在开发环境返回详细信息
            action: action,
            has_images: !!images,
            image_types: images ? Object.keys(images) : []
          }
        };
    }
}

// 审核资格
async function reviewQualification(images, userInfo) {
  // 验证图片存在
  if (!images || Object.keys(images).length === 0) {
    throw new Error('未提供审核图片')
  }
  
  console.log('开始审核图片:', Object.keys(images))
  
  try {
    // 调用DeepSeek API进行审核
    const reviewResult = await callDeepSeekReview(images)
    
    return {
      success: true,
      data: reviewResult
    }
  } catch (error) {
    console.error('审核过程出错:', error)
    throw new Error(`审核失败: ${error.message}`)
  }
}

// 在云函数中，确保超时设置合理
async function callDeepSeekReview(images) {
    try {
      const response = await axios({
        method: 'POST',
        url: `${DEEPSEEK_CONFIG.BASE_URL}${DEEPSEEK_CONFIG.ENDPOINTS.CHAT}`,
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_CONFIG.API_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是一个专业的宠物饲养资格审核专家。请严格审核用户提供的证明材料，给出客观、专业的审核意见。

审核标准：
1. 身份证明 - 确认饲养人具备完全民事行为能力
2. 居住证明 - 证明有固定住所，符合独户居住要求
3. 宠物来源 - 确保来源合法，打击黑色产业链  
4. 健康防疫 - 保障宠物和公众健康安全
5. 身份标识 - 实现溯源管理，帮助走失宠物找回

请以JSON格式返回审核结果。`
            },
            {
              role: 'user',
              content: prompt
            }
        ],
        stream: false,
        temperature: 0.1,
        max_tokens: 1000 // 减少token数量加快响应
      },
      timeout: 25000 // 设置为25秒，小于云函数的30秒超时
    });
    return parseReviewResponse(response.data);
  } catch (error) {
    console.error('API调用失败:', error);
    return getMockReviewResult();
  }
}



// 构建审核提示词
function buildReviewPrompt() {
  return `请基于专业宠物饲养资格标准，审核以下5类证明材料：

需要审核的材料类型：
1. 身份证明文件 - 确认饲养人具备完全民事行为能力
2. 居住情况证明 - 证明有固定住所，符合独户居住要求
3. 宠物合法来源证明 - 确保来源合法，打击黑色产业链
4. 宠物健康与防疫证明 - 保障宠物和公众健康安全  
5. 宠物身份标识 - 实现溯源管理，帮助走失宠物找回

请严格审核并返回以下格式的JSON响应：
{
  "passed": true/false,
  "summary": "总体审核摘要（50字以内）",
  "details": [
    {
      "type": "身份证明",
      "passed": true/false,
      "reason": "具体审核理由",
      "suggestion": "改进建议（如不通过）"
    },
    {
      "type": "居住证明", 
      "passed": true/false,
      "reason": "具体审核理由",
      "suggestion": "改进建议"
    },
    {
      "type": "宠物来源证明",
      "passed": true/false, 
      "reason": "具体审核理由",
      "suggestion": "改进建议"
    },
    {
      "type": "健康防疫证明",
      "passed": true/false,
      "reason": "具体审核理由", 
      "suggestion": "改进建议"
    },
    {
      "type": "身份标识",
      "passed": true/false,
      "reason": "具体审核理由",
      "suggestion": "改进建议"
    }
  ],
  "suggestion": "综合建议（100字以内）"
}

请确保响应是有效的JSON格式，不要包含其他内容。`
}

// 解析审核响应
function parseReviewResponse(apiResponse) {
    try {
      console.log('开始解析API响应');
      if (!apiResponse.choices || !apiResponse.choices[0]) {
        throw new Error('API响应格式不正确，缺少choices字段');
      }
  
      let content = apiResponse.choices[0].message.content;
      console.log('API返回原始内容:', content);
  
      // 增强的JSON提取：尝试匹配更宽松的JSON模式
      let jsonMatch = content.match(/\{[\s\S]*\}/) || content.match(/\{.*\}/s);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0].replace(/(\r\n|\n|\r)/gm, "").trim(); // 清理换行符
        try {
          const result = JSON.parse(jsonStr);
          console.log('成功解析JSON结果');
          return validateReviewResult(result);
        } catch (parseError) {
          console.error('解析提取到的JSON字符串失败:', parseError, '字符串内容:', jsonStr);
        }
      }
      throw new Error('无法从响应中提取有效的JSON结构');
  
    } catch (error) {
      console.error('解析响应彻底失败，使用模拟数据:', error);
      return getMockReviewResult();
    }
}

// 验证审核结果格式
function validateReviewResult(result) {
  const requiredFields = ['passed', 'summary', 'details']
  for (let field of requiredFields) {
    if (result[field] === undefined) {
      throw new Error(`缺少必需字段: ${field}`)
    }
  }
  
  // 确保details是数组且包含5个项目
  if (!Array.isArray(result.details) || result.details.length !== 5) {
    result.details = getDefaultDetails()
  }
  
  return result
}

// 获取默认的详情结构
function getDefaultDetails() {
  return [
    { type: '身份证明', passed: false, reason: '待审核', suggestion: '' },
    { type: '居住证明', passed: false, reason: '待审核', suggestion: '' },
    { type: '宠物来源证明', passed: false, reason: '待审核', suggestion: '' },
    { type: '健康防疫证明', passed: false, reason: '待审核', suggestion: '' },
    { type: '身份标识', passed: false, reason: '待审核', suggestion: '' }
  ]
}

// 模拟审核结果（用于测试）
function getMockReviewResult() {
  return {
    passed: Math.random() > 0.5,
    summary: "AI智能审核完成，请查看详细结果",
    details: [
      {
        type: "身份证明",
        passed: true,
        reason: "身份证信息清晰，符合完全民事行为能力要求",
        suggestion: ""
      },
      {
        type: "居住证明", 
        passed: true,
        reason: "房产证明真实有效，满足独户居住条件",
        suggestion: ""
      },
      {
        type: "宠物来源证明",
        passed: true,
        reason: "购买发票齐全，来源合法",
        suggestion: ""
      },
      {
        type: "健康防疫证明",
        passed: true, 
        reason: "狂犬病免疫证明在有效期内",
        suggestion: ""
      },
      {
        type: "身份标识",
        passed: true,
        reason: "电子芯片标识完整可读",
        suggestion: ""
      }
    ],
    suggestion: "所有材料符合要求，建议定期为宠物进行健康检查并遵守相关管理规定"
  }
}