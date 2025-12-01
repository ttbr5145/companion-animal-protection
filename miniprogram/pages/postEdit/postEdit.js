const app = getApp()

Page({
  data: {
    postType: 'support', // 帖子类型：support/report
    typeText: '支持服务', // 类型显示文本
    title: '', // 帖子标题
    content: '', // 帖子内容
    images: [], // 图片临时路径
    location: {}, // 位置信息
    isLoading: false, // 加载状态
    canSubmit: false // 是否可以提交
  },

  onLoad: function (options) {
    // 接收传入的类型参数
    const type = options.type || 'support'
    const typeText = type === 'support' ? '支持服务' : '监督举报'
    
    // 动态设置导航栏标题
    wx.setNavigationBarTitle({
      title: `发布${typeText}`
    })

    this.setData({
      postType: type,
      typeText: typeText
    })
  },

  // 标题输入
  onTitleInput: function (e) {
    this.setData({
      title: e.detail.value
    })
    this.checkSubmitable()
  },

  // 内容输入
  onContentInput: function (e) {
    this.setData({
      content: e.detail.value
    })
    this.checkSubmitable()
  },

  // 检查是否可以提交
  checkSubmitable: function () {
    const { title, content } = this.data
    const canSubmit = title.trim().length > 0 && content.trim().length > 0
    this.setData({ canSubmit })
  },

  // 选择图片
  chooseImage: function () {
    const that = this
    wx.chooseImage({
      count: 3 - that.data.images.length, // 最多3张
      sizeType: ['compressed'], // 压缩图
      sourceType: ['album', 'camera'], // 相册或相机
      success: function (res) {
        that.setData({
          images: that.data.images.concat(res.tempFilePaths)
        })
      }
    })
  },

  // 删除图片
  removeImage: function (e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.images
    images.splice(index, 1)
    this.setData({ images })
  },

  // 选择位置
  chooseLocation: function () {
    const that = this
    wx.chooseLocation({
      success: function (res) {
        that.setData({
          location: {
            name: res.name,
            address: res.address,
            latitude: res.latitude,
            longitude: res.longitude
          }
        })
      },
      fail: function (err) {
        console.log('位置选择取消或失败:', err)
      }
    })
  },

  // 取消发布
  onCancel: function () {
    wx.showModal({
      title: '提示',
      content: '确定要取消发布吗？已编辑的内容将丢失',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack()
        }
      }
    })
  },

  // 提交帖子
  onSubmit: function () {
    const that = this
    const { title, content, postType, images, location } = this.data

    // 再次验证
    if (!title.trim() || !content.trim()) {
      wx.showToast({
        title: '请填写标题和内容',
        icon: 'none'
      })
      return
    }

    // 内容安全验证（重要）
    if (!this.contentSecurityCheck(content)) {
      wx.showToast({
        title: '内容包含违规信息',
        icon: 'none'
      })
      return
    }

    this.setData({ isLoading: true })

    // 执行发布流程
    this.publishPost()
  },

  // 内容安全检查
  contentSecurityCheck: function (content) {
    // 这里应该调用微信的内容安全API[1](@ref)
    // 以下为简单示例，实际项目中需要实现完整的安全校验
    const forbiddenWords = ['违规词1', '违规词2'] // 示例敏感词
    for (let word of forbiddenWords) {
      if (content.includes(word)) {
        return false
      }
    }
    return true
  },

  // 发布帖子
  async publishPost() {
    const that = this
    try {
      // 1. 上传图片到云存储
      let imageUrls = []
      if (that.data.images.length > 0) {
        imageUrls = await this.uploadImages()
      }

      // 2. 准备帖子数据
      const postData = {
        title: that.data.title.trim(),
        content: that.data.content.trim(),
        images: imageUrls,
        location: that.data.location,
        postType: that.data.postType,
        author: app.globalData.userInfo,
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // 3. 保存到云数据库[6](@ref)
      const db = wx.cloud.database()
      const result = await db.collection('posts').add({
        data: postData
      })

      // 4. 发布成功
      this.setData({ isLoading: false })
      
      wx.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 1500
      })

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)

    } catch (err) {
      // 5. 发布失败
      this.setData({ isLoading: false })
      console.error('发布失败:', err)
      
      wx.showToast({
        title: '发布失败，请重试',
        icon: 'none'
      })
    }
  },

  // 上传图片到云存储
  uploadImages: function () {
    const that = this
    const uploadTasks = this.data.images.map((tempFilePath) => {
      return new Promise((resolve, reject) => {
        // 生成唯一文件名
        const cloudPath = `posts/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`
        
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: res => {
            resolve(res.fileID) // 返回文件ID
          },
          fail: err => {
            reject(err)
          }
        })
      })
    })
    
    return Promise.all(uploadTasks)
  }
})