// pages/qualification/qualification.js
const app = getApp()

Page({
  data: {
    uploadProgressWidth: 0,
    uploadedCount: 0,
    currentStep: 1,
    reviewProgress: 0,
    currentTask: '准备审核...',
    canSubmit: false,
    isReviewing: false,

    identityCard: null,
    residenceProof: null,
    petSourceProof: null,
    healthProof: null,
    petIdentityProof: null,

    reviewResult: {
      passed: false,
      summary: '',
      details: [],
      suggestion: '',
      rating: '',
      ratingScore: 0,
      ratingColor: '',
      verification: ''
    },

    steps: [
      { number: 1, title: '材料上传', active: true },
      { number: 2, title: 'AI审核', active: false },
      { number: 3, title: '审核结果', active: false }
    ],

    fileStatus: {
      identityCard: { uploaded: false },
      residenceProof: { uploaded: false },
      petSourceProof: { uploaded: false },
      healthProof: { uploaded: false },
      petIdentityProof: { uploaded: false }
    }
  },

  onLoad: function () {
    this.initPage()
  },

  onShow: function () {
    this.checkCanSubmit()
  },

  checkCanSubmit: function () {
    const types = ['identityCard', 'residenceProof', 'petSourceProof', 'healthProof', 'petIdentityProof']
    const uploadedCount = types.filter(type => this.data[type]).length
    const canSubmit = uploadedCount === types.length

    const patch = {
      canSubmit,
      uploadedCount,
      uploadProgressWidth: (uploadedCount / types.length) * 100
    }

    types.forEach(type => {
      patch[`fileStatus.${type}.uploaded`] = Boolean(this.data[type])
    })

    this.setData(patch)
    return canSubmit
  },

  chooseIdentityCard: function () {
    this.chooseImage('identityCard', '身份证明')
  },

  chooseResidenceProof: function () {
    this.chooseImage('residenceProof', '居住证明')
  },

  choosePetSourceProof: function () {
    this.chooseImage('petSourceProof', '宠物来源证明')
  },

  chooseHealthProof: function () {
    this.chooseImage('healthProof', '健康证明')
  },

  choosePetIdentityProof: function () {
    this.chooseImage('petIdentityProof', '宠物身份标识')
  },

  chooseImage: function (type, description) {
    if (this.data.isReviewing) {
      wx.showToast({ title: '审核中，请稍后操作', icon: 'none' })
      return
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        wx.showLoading({ title: '处理中...' })

        const done = (sizeText, dimensionText) => {
          const patch = { [type]: tempFilePath }
          patch[`fileStatus.${type}`] = { uploaded: true }
          if (sizeText) patch[`fileStatus.${type}.size`] = sizeText
          if (dimensionText) patch[`fileStatus.${type}.dimensions`] = dimensionText

          this.setData(patch)
          this.checkCanSubmit()
          wx.hideLoading()
          wx.showToast({ title: '上传成功', icon: 'success', duration: 1500 })
        }

        wx.getImageInfo({
          src: tempFilePath,
          success: (info) => done(this.formatFileSize(info.size), `${info.width}×${info.height}`),
          fail: () => done(null, null)
        })
      },
      fail: (error) => {
        console.error(`选择${description}失败:`, error)
        wx.showToast({ title: '选择图片失败', icon: 'none' })
      }
    })
  },

  startReview: async function () {
    if (this.data.isReviewing) {
      wx.showToast({ title: '正在审核中，请稍候', icon: 'none' })
      return
    }

    if (!this.checkCanSubmit()) {
      wx.showToast({ title: '请上传所有必需材料', icon: 'none' })
      return
    }

    this.setData({
      isReviewing: true,
      currentStep: 2,
      reviewProgress: 0,
      currentTask: '准备审核材料...',
      steps: this.data.steps.map(step => ({ ...step, active: step.number === 2 })),
      reviewResult: {
        passed: false,
        summary: '',
        details: [],
        suggestion: '',
        rating: '',
        ratingScore: 0,
        ratingColor: '',
        verification: ''
      }
    })

    this.startProgressAnimation()

    try {
      const cloudFiles = await this.uploadImagesToCloud()

      if (Object.keys(cloudFiles).length === 0) {
        throw new Error('材料上传失败，请检查网络后重试')
      }

      const res = await this.callCloudFunctionWithRetry({
        name: 'qualificationReview',
        data: {
          action: 'review',
          images: cloudFiles,
          userInfo: this.getUserInfo()
        }
      }, 1)

      const payload = res && res.result

      if (!payload || !payload.success) {
        throw new Error((payload && payload.error) || '审核服务返回异常')
      }

      this.renderResult(payload.data)
    } catch (error) {
      console.error('审核过程出错:', error)
      this.stopProgressAnimation()
      this.setData({ isReviewing: false, currentStep: 1 })
      wx.showModal({
        title: '审核未完成',
        content: (error && error.message) || '调用审核服务失败，请稍后重试',
        showCancel: false
      })
      return
    }

    if (this.data.reviewResult.verification === 'materials_only') {
      wx.showModal({
        title: '仅完成材料初审',
        content: '当前未配置视觉模型，只校验了材料是否齐备，没有核验图像内容，建议转人工复核。',
        showCancel: false
      })
    }
  },

  renderResult: function (result) {
    this.stopProgressAnimation()

    const safe = result || {}

    this.setData({
      currentStep: 3,
      isReviewing: false,
      reviewProgress: 100,
      currentTask: '审核完成',
      steps: this.data.steps.map(step => ({ ...step, active: step.number === 3 })),
      reviewResult: {
        passed: Boolean(safe.passed),
        summary: safe.summary || '',
        details: Array.isArray(safe.details) ? safe.details : [],
        suggestion: safe.suggestion || '',
        rating: safe.rating || '',
        ratingScore: Number(safe.ratingScore) || 0,
        ratingColor: safe.ratingColor || '#9ca3af',
        verification: safe.verification || ''
      }
    })

    wx.showToast({ title: '审核完成', icon: 'success', duration: 2000 })
  },

  callCloudFunctionWithRetry: async function (callFunctionOptions, maxRetries = 1) {
    let lastError

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`尝试调用云函数，第 ${attempt + 1} 次`)
        return await wx.cloud.callFunction(callFunctionOptions)
      } catch (error) {
        lastError = error
        console.error(`云函数调用第 ${attempt + 1} 次失败:`, error)

        if (attempt < maxRetries) {
          const delayMs = 1000 * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }
      }
    }

    throw lastError
  },

  uploadImagesToCloud: async function () {
    const types = ['identityCard', 'residenceProof', 'petSourceProof', 'healthProof', 'petIdentityProof']
    const uploadTasks = []

    wx.showLoading({ title: '上传文件中...' })

    for (const type of types) {
      if (!this.data[type]) continue

      const cloudPath = `qualification/${Date.now()}_${type}.jpg`
      uploadTasks.push(
        wx.cloud.uploadFile({ cloudPath, filePath: this.data[type] })
          .then(res => ({ type, fileID: res.fileID }))
          .catch(error => {
            console.error(`上传${type}失败:`, error)
            return { type, error: error.message }
          })
      )
    }

    const results = await Promise.all(uploadTasks)
    const cloudFiles = {}

    results.forEach(result => {
      if (!result.error) cloudFiles[result.type] = result.fileID
    })

    wx.hideLoading()
    return cloudFiles
  },

  startProgressAnimation: function () {
    this.stopProgressAnimation()

    const tasks = [
      '验证身份证明文件...',
      '审核居住情况证明...',
      '检查宠物来源合法性...',
      '验证健康防疫证明...',
      '审核宠物身份标识...',
      '生成综合评估报告...'
    ]

    let currentIndex = 0

    this.progressTimer = setInterval(() => {
      if (currentIndex < tasks.length) {
        const progress = Math.min(99, Math.round(((currentIndex + 1) / tasks.length) * 100))
        this.setData({ currentTask: tasks[currentIndex], reviewProgress: progress })
        currentIndex += 1
      } else {
        this.stopProgressAnimation()
      }
    }, 800)
  },

  stopProgressAnimation: function () {
    if (this.progressTimer) {
      clearInterval(this.progressTimer)
      this.progressTimer = null
    }
  },

  getUserInfo: function () {
    return {
      openid: app.globalData.openid,
      userInfo: app.globalData.userInfo
    }
  },

  restartReview: function () {
    this.stopProgressAnimation()

    this.setData({
      currentStep: 1,
      isReviewing: false,
      reviewProgress: 0,
      currentTask: '准备审核...',
      uploadProgressWidth: 0,
      uploadedCount: 0,
      identityCard: null,
      residenceProof: null,
      petSourceProof: null,
      healthProof: null,
      petIdentityProof: null,
      reviewResult: {
        passed: false,
        summary: '',
        details: [],
        suggestion: '',
        rating: '',
        ratingScore: 0,
        ratingColor: '',
        verification: ''
      },
      steps: this.data.steps.map(step => ({ ...step, active: step.number === 1 })),
      fileStatus: {
        identityCard: { uploaded: false },
        residenceProof: { uploaded: false },
        petSourceProof: { uploaded: false },
        healthProof: { uploaded: false },
        petIdentityProof: { uploaded: false }
      }
    })
  },

  saveResult: function () {
    if (!this.data.reviewResult.passed) {
      wx.showToast({ title: '只有审核通过才能保存', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })

    wx.cloud.callFunction({
      name: 'qualificationReview',
      data: {
        action: 'saveResult',
        result: this.data.reviewResult,
        userInfo: this.getUserInfo()
      },
      success: (res) => {
        wx.hideLoading()
        const payload = res && res.result

        if (payload && payload.success) {
          wx.showModal({
            title: '保存成功',
            content: '您的资质审核结果已保存至个人档案',
            showCancel: false,
            confirmText: '知道了'
          })
          return
        }

        wx.showModal({
          title: '保存失败',
          content: (payload && payload.error) || '未能写入云端记录，请先在云开发控制台创建集合 qualificationReviews',
          showCancel: false
        })
      },
      fail: (error) => {
        wx.hideLoading()
        console.error('保存失败:', error)
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    })
  },

  formatFileSize: function (bytes) {
    if (!bytes) return ''
    const units = ['B', 'KB', 'MB', 'GB']
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
    const size = bytes / Math.pow(1024, index)
    return `${parseFloat(size.toFixed(2))} ${units[index]}`
  },

  initPage: function () {
    this.checkCanSubmit()
  },

  onShareAppMessage: function () {
    return {
      title: '宠物饲养资格AI智能审核',
      path: '/pages/qualification/qualification'
    }
  }
})
