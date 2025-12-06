// pages/qualification/qualification.js
const app = getApp()

Page({
  data: {
    uploadProgressWidth: 0, // 新增：上传进度宽度
    currentStep: 1,
    reviewProgress: 0,
    currentTask: '准备审核...',
    canSubmit: false,
    isReviewing: false,
    
    // 上传的图片
    identityCard: null,
    residenceProof: null,
    petSourceProof: null,
    healthProof: null,
    petIdentityProof: null,
    
    // 审核结果
    reviewResult: {
        passed: false,
        summary: '',
        details: [],
        suggestion: '',
        rating: '', // 新增：评级（优、良、中、差）
        ratingScore: 0, // 新增：评分（0-100）
        ratingColor: '' // 新增：评级对应的颜色
    },
    
    // 美化新增
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

  onLoad: function (options) {
    console.log('资格审核页面加载')
    this.initPage()
  },

  onShow: function () {
    this.checkCanSubmit()
  },

   // 修改 checkCanSubmit 函数
    checkCanSubmit: function() {
        const canSubmit = this.data.identityCard && 
                        this.data.residenceProof && 
                        this.data.petSourceProof && 
                        this.data.healthProof && 
                        this.data.petIdentityProof;
        
        // 计算上传进度
        const uploadedCount = [
        this.data.identityCard,
        this.data.residenceProof,
        this.data.petSourceProof,
        this.data.healthProof,
        this.data.petIdentityProof
        ].filter(item => item !== null).length;
        
        const uploadProgressWidth = (uploadedCount / 5) * 100;
        
        this.setData({ 
        canSubmit,
        uploadProgressWidth,
        uploadedCount, // 添加到data中供wxml使用
        'fileStatus.identityCard.uploaded': !!this.data.identityCard,
        'fileStatus.residenceProof.uploaded': !!this.data.residenceProof,
        'fileStatus.petSourceProof.uploaded': !!this.data.petSourceProof,
        'fileStatus.healthProof.uploaded': !!this.data.healthProof,
        'fileStatus.petIdentityProof.uploaded': !!this.data.petIdentityProof
        });
        
        return canSubmit;
    },

  // 选择身份证
  chooseIdentityCard: function() {
    this.chooseImage('identityCard', '身份证明')
  },

  // 选择居住证明
  chooseResidenceProof: function() {
    this.chooseImage('residenceProof', '居住证明')
  },

  // 选择宠物来源证明
  choosePetSourceProof: function() {
    this.chooseImage('petSourceProof', '宠物来源证明')
  },

  // 选择健康证明
  chooseHealthProof: function() {
    this.chooseImage('healthProof', '健康证明')
  },

  // 选择宠物身份标识
  choosePetIdentityProof: function() {
    this.chooseImage('petIdentityProof', '宠物身份标识')
  },

  // 通用选择图片方法
  chooseImage: function(type, description) {
    if (this.data.isReviewing) {
      wx.showToast({
        title: '审核中，请稍后操作',
        icon: 'none'
      })
      return
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        console.log(`选择了${description}:`, tempFilePath)
        
        wx.showLoading({ title: '处理中...' })
        
        // 预览图片
        wx.getImageInfo({
          src: tempFilePath,
          success: (info) => {
            this.setData({
              [type]: tempFilePath,
              [`fileStatus.${type}`]: {
                uploaded: true,
                size: this.formatFileSize(info.size),
                dimensions: `${info.width}×${info.height}`
              }
            })
            
            this.checkCanSubmit()
            
            wx.hideLoading()
            wx.showToast({
              title: '上传成功',
              icon: 'success',
              duration: 1500
            })
          },
          fail: () => {
            wx.hideLoading()
            this.setData({
              [type]: tempFilePath,
              [`fileStatus.${type}.uploaded`]: true
            })
            this.checkCanSubmit()
            wx.showToast({
              title: '上传成功',
              icon: 'success',
              duration: 1500
            })
          }
        })
      },
      fail: (error) => {
        console.error('选择图片失败:', error)
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        })
      }
    })
  },

    // 开始审核
    startReview: async function() {
        if (this.data.isReviewing) {
        wx.showToast({
            title: '正在审核中，请稍候',
            icon: 'none'
        })
        return
        }
    
        if (!this.checkCanSubmit()) {
        wx.showToast({
            title: '请上传所有必需材料',
            icon: 'none'
        })
        return
        }
    
        // 更新步骤状态
        const steps = this.data.steps.map(step => {
        step.active = step.number === 2
        return step
        })
    
        this.setData({ 
        isReviewing: true,
        currentStep: 2,
        reviewProgress: 0,
        currentTask: '准备审核材料...',
        steps
        })
    
        this.startProgressAnimation()
    
        try {
        console.log('开始调用云函数审核...')
        
        // 上传图片到云存储（保留这部分，因为可能需要上传图片）
        const cloudFiles = await this.uploadImagesToCloud()
        
        // 调用云函数进行AI审核（但我们会忽略它的结果）
        const result = await this.callCloudFunctionWithRetry({
            name: 'qualificationReview',
            data: {
            action: 'review',
            images: cloudFiles,
            userInfo: this.getUserInfo()
            },
            timeout: 30000
        }, 2)
    
        console.log('云函数返回结果:', result)
        
        // 🎯 关键修改：无论云函数是否成功，都使用模拟数据
        console.log('🎯 使用模拟随机评级数据')
        
        } catch (error) {
        console.error('审核过程出错:', error)
        // 即使出错也继续使用模拟数据
        }
        
        // 🎯 无论try/catch结果如何，都使用模拟数据
        setTimeout(() => {
        this.showMockResult();
        }, 2000); // 延迟2秒，模拟审核过程
    },
    
    // 🎯 新增：显示模拟结果的函数
    showMockResult: function() {
        console.log('🎯 显示模拟审核结果');
        
        const steps = this.data.steps.map(step => {
        step.active = step.number === 3
        return step
        })
        
        // 获取模拟数据
        const mockResult = this.getMockReviewResult();
        
        console.log('🎯 模拟数据详情:', mockResult);
        console.log('🎯 rating字段值:', mockResult.rating);
        console.log('🎯 ratingScore字段值:', mockResult.ratingScore);
        console.log('🎯 ratingColor字段值:', mockResult.ratingColor);
        
        this.setData({
        currentStep: 3,
        reviewResult: mockResult,
        steps,
        isReviewing: false
        })
        
        wx.showToast({
        title: '审核完成',
        icon: 'success',
        duration: 2000
        })
  },

  // 带重试机制的云函数调用封装方法
  callCloudFunctionWithRetry: async function (callFunctionOptions, maxRetries = 1) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                console.log(`尝试调用云函数，第 ${attempt + 1} 次`)
                const result = await wx.cloud.callFunction(callFunctionOptions)
                return result
                
            } catch (error) {
                lastError = error;
                console.error(`云函数调用第 ${attempt + 1} 次失败:`, error)
                
                if (attempt < maxRetries) {
                    const delayMs = 1000 * Math.pow(2, attempt)
                    console.log(`等待 ${delayMs/1000} 秒后重试...`)
                    await new Promise(resolve => setTimeout(resolve, delayMs))
                }
            }
        }
        
        throw lastError
  },

  // 上传图片到云存储
  uploadImagesToCloud: async function() {
    const uploadTasks = []
    const imageTypes = [
      'identityCard', 'residenceProof', 'petSourceProof', 
      'healthProof', 'petIdentityProof'
    ]
    
    wx.showLoading({ title: '上传文件中...' })
    
    for (const type of imageTypes) {
      if (this.data[type]) {
        const cloudPath = `qualification/${Date.now()}_${type}.jpg`
        uploadTasks.push(
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: this.data[type]
          }).then(res => {
            return { type, fileID: res.fileID }
          }).catch(error => {
            console.error(`上传${type}失败:`, error)
            return { type, error: error.message }
          })
        )
      }
    }
    
    const results = await Promise.all(uploadTasks)
    const cloudFiles = {}
    
    results.forEach(result => {
      if (!result.error) {
        cloudFiles[result.type] = result.fileID
      }
    })
    
    wx.hideLoading()
    return cloudFiles
  },

  // 进度动画
  startProgressAnimation: function() {
    const tasks = [
      '验证身份证明文件...',
      '审核居住情况证明...', 
      '检查宠物来源合法性...',
      '验证健康防疫证明...',
      '审核宠物身份标识...',
      '生成综合评估报告...'
    ]
    
    let currentIndex = 0
    const totalTasks = tasks.length
    
    const interval = setInterval(() => {
      if (currentIndex < totalTasks) {
        const progress = Math.min(100, Math.round((currentIndex + 1) / totalTasks * 100))
        
        this.setData({
          currentTask: tasks[currentIndex],
          reviewProgress: progress
        })
        
        currentIndex++
      } else {
        clearInterval(interval)
      }
    }, 800)
  },

    getMockReviewResult: function() {
        // 先随机决定等级（0-3分别对应差、中、良、优）
        const level = Math.floor(Math.random() * 4); // 0-3
        let score, rating, ratingColor;
        
        // 根据等级确定分数范围和评级
        switch(level) {
            case 0: // 差：0-59分
                score = Math.floor(Math.random() * 60);
                rating = '差';
                ratingColor = '#ef4444'; // 红色
                break;
            case 1: // 中：60-74分
                score = 60 + Math.floor(Math.random() * 15); // 60-74
                rating = '中';
                ratingColor = '#f59e0b'; // 黄色
                break;
            case 2: // 良：75-89分
                score = 75 + Math.floor(Math.random() * 15); // 75-89
                rating = '良';
                ratingColor = '#3b82f6'; // 蓝色
                break;
            case 3: // 优：90-100分
                score = 90 + Math.floor(Math.random() * 11); // 90-100
                rating = '优';
                ratingColor = '#10b981'; // 绿色
                break;
        }
        
        console.log(`🎲 生成随机评级：等级=${level}, 分数=${score}, 评级=${rating}, 颜色=${ratingColor}`);
        
        const isPassed = score >= 60; // 60分以上为通过
        
        return {
            passed: isPassed,
            summary: isPassed ? "材料符合饲养资格要求" : "材料需要补充完善",
            details: [
                {
                    type: "身份证明",
                    passed: true,
                    reason: "身份证信息清晰完整",
                    suggestion: ""
                },
                {
                    type: "居住证明", 
                    passed: isPassed,
                    reason: isPassed ? "居住证明真实有效" : "居住证明需要更新",
                    suggestion: isPassed ? "" : "请提供最新的居住证明"
                },
                {
                    type: "宠物来源证明",
                    passed: isPassed,
                    reason: isPassed ? "来源证明齐全合法" : "缺少完整的购买凭证",
                    suggestion: isPassed ? "" : "请补充完整的购买发票"
                },
                {
                    type: "健康防疫证明",
                    passed: true, 
                    reason: "防疫记录完整有效",
                    suggestion: ""
                },
                {
                    type: "身份标识",
                    passed: isPassed,
                    reason: isPassed ? "身份标识清晰可读" : "标识信息不够清晰",
                    suggestion: isPassed ? "" : "请重新拍摄清晰的标识照片"
                }
            ],
            suggestion: isPassed ? "恭喜您通过审核，请妥善保管相关证明文件" : "请根据建议完善材料后重新提交审核",
            rating: rating,
            ratingScore: score,
            ratingColor: ratingColor
        }
    },

  // 获取用户信息
  getUserInfo: function() {
    return {
      openId: app.globalData.openId,
      userInfo: app.globalData.userInfo
    }
  },

  // 重新审核
  // 重新审核
  restartReview: function() {
    const steps = this.data.steps.map(step => {
      step.active = step.number === 1
      return step
    })
    
    // 使用和 getMockReviewResult 相同的结构
    this.setData({
      currentStep: 1,
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
        rating: '未评级',  // 改为非空字符串，便于调试
        ratingScore: 0,
        ratingColor: '#9ca3af'  // 灰色
      },
      reviewProgress: 0,
      currentTask: '准备审核...',
      steps,
      fileStatus: {
        identityCard: { uploaded: false },
        residenceProof: { uploaded: false },
        petSourceProof: { uploaded: false },
        healthProof: { uploaded: false },
        petIdentityProof: { uploaded: false }
      }
    })
    
    console.log('重置后的 reviewResult:', this.data.reviewResult);
  },

  // 保存审核结果
  saveResult: function() {
    if (!this.data.reviewResult.passed) {
      wx.showToast({
        title: '只有审核通过才能保存',
        icon: 'none'
      })
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
        if (res.result.success) {
          wx.showModal({
            title: '保存成功',
            content: '您的资质审核结果已保存至个人档案',
            showCancel: false,
            confirmText: '知道了'
          })
        } else {
          throw new Error(res.result.error)
        }
      },
      fail: (error) => {
        wx.hideLoading()
        console.error('保存失败:', error)
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    })
  },

  // 格式化文件大小
  formatFileSize: function(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  // 初始化页面
  initPage: function() {
    console.log('初始化审核页面')
    this.checkCanSubmit()
  },

  onShareAppMessage: function() {
    return {
      title: '宠物饲养资格AI智能审核',
      path: '/pages/qualification/qualification'
    }
  }
})