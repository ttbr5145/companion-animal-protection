// postEdit/postEdit.js
const app = getApp()

Page({
  data: {
    postType: 'support',
    typeText: '支持服务',
    title: '',
    content: '',
    images: [],
    location: {},
    isLoading: false,
    canSubmit: false
  },

  onLoad: function (options) {
    const type = options.type || 'support'
    const typeText = type === 'support' ? '支持服务' : '监督举报'
    
    wx.setNavigationBarTitle({
      title: `发布${typeText}`
    })

    this.setData({
      postType: type,
      typeText: typeText
    })
  },

  onTitleInput: function (e) {
    this.setData({
      title: e.detail.value
    })
    this.checkSubmitable()
  },

  onContentInput: function (e) {
    this.setData({
      content: e.detail.value
    })
    this.checkSubmitable()
  },

  checkSubmitable: function () {
    const { title, content } = this.data
    const canSubmit = title.trim().length > 0 && content.trim().length > 0
    this.setData({ canSubmit })
  },

  chooseImage: function () {
    const that = this
    wx.chooseImage({
      count: 3 - that.data.images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        that.setData({
          images: that.data.images.concat(res.tempFilePaths)
        })
      }
    })
  },

  removeImage: function (e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.images
    images.splice(index, 1)
    this.setData({ images })
  },

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

  onSubmit: function () {
    const { title, content, postType } = this.data

    if (!title.trim() || !content.trim()) {
      wx.showToast({
        title: '请填写标题和内容',
        icon: 'none'
      })
      return
    }

    if (!this.contentSecurityCheck(content)) {
      wx.showToast({
        title: '内容包含违规信息',
        icon: 'none'
      })
      return
    }

    this.setData({ isLoading: true })
    this.publishPost()
  },

  contentSecurityCheck: function (content) {
    const forbiddenWords = ['违规词1', '违规词2']
    for (let word of forbiddenWords) {
      if (content.includes(word)) {
        return false
      }
    }
    return true
  },

  async publishPost() {
    const that = this
    try {
      // 上传图片
      let imageUrls = []
      if (that.data.images.length > 0) {
        imageUrls = await this.uploadImages()
      }

      // 准备帖子数据
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

      // 新增：根据帖子类型设置不同的状态字段
      if (that.data.postType === 'report') {
        // 举报帖子：使用细化状态
        postData.reportStatus = 'pending_review' // 初始状态为待审核
      } else {
        // 支持服务帖子：使用简单状态
        postData.status = 'pending' // 初始状态为进行中
      }

      // 保存到数据库
      const db = wx.cloud.database()
      const result = await db.collection('posts').add({
        data: postData
      })

      this.setData({ isLoading: false })
      
      wx.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 1500
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)

    } catch (err) {
      this.setData({ isLoading: false })
      console.error('发布失败:', err)
      
      wx.showToast({
        title: '发布失败，请重试',
        icon: 'none'
      })
    }
  },

  uploadImages: function () {
    const that = this
    const uploadTasks = this.data.images.map((tempFilePath) => {
      return new Promise((resolve, reject) => {
        const cloudPath = `posts/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`
        
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: res => {
            resolve(res.fileID)
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