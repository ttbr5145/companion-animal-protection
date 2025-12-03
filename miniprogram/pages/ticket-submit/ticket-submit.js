Page({
    data: {
      title: '',
      types: ['宠物伤人', '宠物虐待', '宠物遗弃', '其他'],
      typeIndex: 0,
      description: '',
      images: [],
      location: null,
      loading: false,
      contactInfo: '' // 提交者联系方式
    },
  
    onLoad() {
      // 获取用户信息作为默认提交者
      this.getUserInfo()
    },
  
    // 获取用户信息
    async getUserInfo() {
      try {
        const app = getApp()
        if (app.globalData.userInfo) {
          this.setData({
            contactInfo: app.globalData.userInfo.nickName || '匿名用户'
          })
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
      }
    },
  
    // 标题输入
    onTitleInput(e) {
      this.setData({ title: e.detail.value })
    },
  
    // 类型选择
    onTypeChange(e) {
      this.setData({ typeIndex: Number(e.detail.value) })
    },
  
    // 描述输入
    onDescriptionInput(e) {
      this.setData({ description: e.detail.value })
    },
  
    // 联系方式输入
    onContactInput(e) {
      this.setData({ contactInfo: e.detail.value })
    },
  
    // 选择图片
    async chooseImage() {
      try {
        const res = await wx.chooseMedia({
          count: 3,
          mediaType: ['image'],
          sourceType: ['album', 'camera']
        })
  
        const images = res.tempFiles.map(file => file.tempFilePath)
        this.setData({
          images: this.data.images.concat(images)
        })
      } catch (error) {
        console.error('选择图片失败:', error)
      }
    },
  
    // 预览图片
    previewImage(e) {
      const url = e.currentTarget.dataset.url
      wx.previewImage({
        urls: this.data.images,
        current: url
      })
    },
  
    // 删除图片
    deleteImage(e) {
      const index = e.currentTarget.dataset.index
      const images = this.data.images
      images.splice(index, 1)
      this.setData({ images })
    },
  
    // 选择位置
    async chooseLocation() {
      try {
        const res = await wx.chooseLocation()
        this.setData({
          location: {
            name: res.name,
            address: res.address,
            latitude: res.latitude,
            longitude: res.longitude
          }
        })
      } catch (error) {
        console.error('选择位置失败:', error)
      }
    },
  
    // 清除位置
    clearLocation() {
      this.setData({ location: null })
    },
  
    // 表单提交
    async formSubmit(e) {
      const { title, description, contactInfo } = e.detail.value
      const { typeIndex, images, location } = this.data
      
      // 表单验证
      if (!title.trim()) {
        wx.showToast({
          title: '请输入工单标题',
          icon: 'none'
        })
        return
      }
      
      if (!description.trim()) {
        wx.showToast({
          title: '请输入问题描述',
          icon: 'none'
        })
        return
      }
  
      if (!contactInfo.trim()) {
        wx.showToast({
          title: '请输入联系方式',
          icon: 'none'
        })
        return
      }
  
      this.setData({ loading: true })
  
      try {
        // 上传图片到云存储
        const uploadedImages = []
        for (const image of images) {
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: `tickets/${Date.now()}-${Math.random().toString(36).substr(2)}.jpg`,
            filePath: image
          })
          uploadedImages.push(uploadRes.fileID)
        }
  
        // 调用云函数提交工单
        const res = await wx.cloud.callFunction({
          name: 'ticket-add',
          data: {
            title: title.trim(),
            type: this.data.types[typeIndex],
            description: description.trim(),
            contactInfo: contactInfo.trim(),
            images: uploadedImages,
            location,
            status: 'pending', // 初始状态为审核中
            submitTime: new Date()
          }
        })
  
        if (res.result.code === 200) {
          wx.showToast({
            title: '提交成功',
            success() {
              setTimeout(() => {
                wx.navigateBack()
              }, 1500)
            }
          })
        } else {
          throw new Error(res.result.message)
        }
      } catch (error) {
        console.error('提交失败:', error)
        wx.showToast({
          title: '提交失败',
          icon: 'none'
        })
      } finally {
        this.setData({ loading: false })
      }
    },
  
    // 表单重置
    formReset() {
      this.setData({
        title: '',
        typeIndex: 0,
        description: '',
        contactInfo: this.data.contactInfo, // 保留联系方式
        images: [],
        location: null
      })
    }
  })