// qualification.js
const app = getApp()

Page({
  data: {
    currentStep: 1,
    reviewProgress: 0,
    currentTask: '准备审核...',
    canSubmit: false,
    isReviewing: false, // 控制审核中的状态
    
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
      suggestion: ''
    }
  },

  onLoad: function (options) {
    console.log('资格审核页面加载')
    this.initPage()
  },

  onShow: function () {
    this.checkCanSubmit()
  },

  // 检查是否可以提交
  checkCanSubmit: function() {
    const canSubmit = this.data.identityCard && 
                     this.data.residenceProof && 
                     this.data.petSourceProof && 
                     this.data.healthProof && 
                     this.data.petIdentityProof
    
    this.setData({ canSubmit })
    return canSubmit
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
        
        this.setData({
          [type]: tempFilePath
        })
        
        this.checkCanSubmit()
        
        wx.showToast({
          title: `${description}选择成功`,
          icon: 'success',
          duration: 1500
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
    // 检查是否正在审核中
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

    // 设置审核状态
    this.setData({ 
      isReviewing: true,
      currentStep: 2,
      reviewProgress: 0,
      currentTask: '准备审核材料...'
    })

    this.startProgressAnimation()

    try {
        console.log('开始调用云函数审核...')
        
        // 上传图片到云存储
        const cloudFiles = await this.uploadImagesToCloud()
        
        // 调用云函数进行AI审核 - 关键修改在此处
        const result = await this.callCloudFunctionWithRetry({
            name: 'qualificationReview',
            data: {
                action: 'review',
                images: cloudFiles,
                userInfo: this.getUserInfo()
            },
            timeout: 30000 // 单位：毫秒。此处设置为30秒，与云函数平台配置的超时时间匹配或稍短[1](@ref)
        }, 2); // 第二个参数是最大重试次数，这里设置为2（最多尝试3次）

        console.log('云函数返回结果:', result)
      
        if (result.result.success) {
            this.setData({
            currentStep: 3,
            reviewResult: result.result.data
            })
            
            wx.showToast({
            title: '审核完成',
            icon: 'success',
            duration: 2000
            })
        } else {
            throw new Error(result.result.error || '审核失败')
        }
    } catch (error) {
        console.error('审核全过程出错:', error)
        
        // 使用模拟数据作为回退
        this.setData({
            currentStep: 3,
            reviewResult: this.getMockReviewResult()
        })
        
        wx.showToast({
            title: '使用演示数据',
            icon: 'none',
            duration: 3000
        })
        } finally {
        // 无论成功失败，都重置审核状态
        this.setData({ isReviewing: false })
        }
    },
    // 新增：一个带重试机制的云函数调用封装方法
    callCloudFunctionWithRetry: async function (callFunctionOptions, maxRetries = 1) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                console.log(`尝试调用云函数，第 ${attempt + 1} 次`);
                const result = await wx.cloud.callFunction(callFunctionOptions);
                return result; // 如果成功，直接返回结果
                
            } catch (error) {
                lastError = error;
                console.error(`云函数调用第 ${attempt + 1} 次失败:`, error);
                
                // 如果不是最后一次尝试，则等待一段时间后重试
                if (attempt < maxRetries) {
                    const delayMs = 1000 * Math.pow(2, attempt); // 指数退避：1秒, 2秒, 4秒...
                    console.log(`等待 ${delayMs/1000} 秒后重试...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }
        
        // 所有重试都失败了，抛出最后一次的错误
        throw lastError;
    },

  // 上传图片到云存储
  uploadImagesToCloud: async function() {
    const uploadTasks = []
    const imageTypes = [
      'identityCard', 'residenceProof', 'petSourceProof', 
      'healthProof', 'petIdentityProof'
    ]
    
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

  // 模拟审核结果（用于演示）
  getMockReviewResult: function() {
    const isPassed = Math.random() > 0.3 // 70%通过率
    return {
      passed: isPassed,
      summary: isPassed ? "所有材料符合饲养资格要求" : "部分材料需要补充完善",
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
      suggestion: isPassed ? "恭喜您通过审核，请妥善保管相关证明文件" : "请根据建议完善材料后重新提交审核"
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
  restartReview: function() {
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
        suggestion: ''
      },
      reviewProgress: 0,
      currentTask: '准备审核...'
    })
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
          wx.showToast({
            title: '保存成功',
            icon: 'success'
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