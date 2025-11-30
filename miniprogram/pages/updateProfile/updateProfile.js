// pages/updateProfile/updateProfile.js
Page({
    data: {
      // 用户信息
      userInfo: {},
      
      // 原始数据
      tempAvatarUrl: '',
      tempNickName: '',
      tempBio: '',
      tempEmail: '',
      tempPhone: '',
      genderIndex: 2,
      region: [],
      
      // 计算后的数据
      computedAvatarUrl: '',
      computedNickName: '',
      computedBio: '',
      computedEmail: '',
      computedPhone: '',
      computedGenderText: '请选择',
      computedRegionText: '请选择地区',
      bioLength: 0,
      
      // 选项数据
      genderOptions: ['男', '女', '保密'],
      
      // UI状态
      showToast: false,
      toastText: '',
      isLoading: false,
      isNewUser: false // 标记是否是新用户
    },
  
    onLoad: function (options) {
      this.loadUserInfo();
      this.computeAllData();
    },
  
    // 加载用户信息
    loadUserInfo: function () {
      const app = getApp();
      const userInfo = app.globalData.userInfo || {};
      
      this.setData({
        userInfo: userInfo,
        genderIndex: this.getGenderIndex(userInfo.gender),
        region: userInfo.region || [],
        isNewUser: !userInfo.nickName // 如果没有昵称，认为是新用户
      });
      
      this.computeAllData();
    },
  
    // 计算所有需要在WXML中使用的数据
    computeAllData: function () {
      const { 
        tempAvatarUrl, userInfo, tempNickName, tempBio, 
        tempEmail, tempPhone, genderIndex, region, genderOptions 
      } = this.data;
      
      const computedAvatarUrl = tempAvatarUrl || userInfo.avatarUrl || '/images/default-avatar.png';
      const computedNickName = tempNickName || userInfo.nickName || '';
      const computedBio = tempBio || userInfo.bio || '';
      const bioLength = computedBio.length;
      const computedEmail = tempEmail || userInfo.email || '';
      const computedPhone = tempPhone || userInfo.phone || '';
      const computedGenderText = genderOptions[genderIndex] || '请选择';
      
      let computedRegionText = '请选择地区';
      if (region && region.length >= 3 && region[0] && region[1] && region[2]) {
        computedRegionText = region[0] + ' ' + region[1] + ' ' + region[2];
      }
      
      this.setData({
        computedAvatarUrl: computedAvatarUrl,
        computedNickName: computedNickName,
        computedBio: computedBio,
        computedEmail: computedEmail,
        computedPhone: computedPhone,
        computedGenderText: computedGenderText,
        computedRegionText: computedRegionText,
        bioLength: bioLength
      });
    },
  
    // 性别选项转换
    getGenderIndex: function (gender) {
      switch (gender) {
        case 'male': return 0;
        case 'female': return 1;
        default: return 2;
      }
    },
  
    getGenderValue: function (index) {
      switch (index) {
        case 0: return 'male';
        case 1: return 'female';
        default: return 'unknown';
      }
    },
  
    // 返回上一页
    goBack: function () {
      wx.navigateBack();
    },
  
    // 选择头像（需要上传到云存储）
    chooseAvatar: function () {
      const that = this;
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: function (res) {
          that.uploadAvatarToCloud(res.tempFilePaths[0]);
        },
        fail: function (err) {
          console.error('选择头像失败:', err);
          that.showToast('选择头像失败');
        }
      });
    },
  
    // 上传头像到云存储
    uploadAvatarToCloud: function (filePath) {
      const that = this;
      const app = getApp();
      
      // 显示加载中
      wx.showLoading({
        title: '上传头像中...',
      });
      
      // 生成唯一文件名
      const cloudPath = 'avatars/' + app.globalData.openid + '/' + Date.now() + '.jpg';
      
      // 上传到云存储
      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath,
        success: res => {
          wx.hideLoading();
          // 获取文件ID，可用于生成访问链接
          const fileID = res.fileID;
          that.setData({
            tempAvatarUrl: fileID
          });
          that.computeAllData();
          that.showToast('头像上传成功');
        },
        fail: err => {
          wx.hideLoading();
          console.error('头像上传失败:', err);
          that.showToast('头像上传失败');
        }
      });
    },
  
    // 表单输入处理（保持不变）
    onNickNameInput: function (e) {
      this.setData({ tempNickName: e.detail.value });
      this.computeAllData();
    },
  
    onGenderChange: function (e) {
      this.setData({ genderIndex: parseInt(e.detail.value) });
      this.computeAllData();
    },
  
    onRegionChange: function (e) {
      this.setData({ region: e.detail.value });
      this.computeAllData();
    },
  
    onBioInput: function (e) {
      this.setData({ tempBio: e.detail.value });
      this.computeAllData();
    },
  
    onEmailInput: function (e) {
      this.setData({ tempEmail: e.detail.value });
      this.computeAllData();
    },
  
    onPhoneInput: function (e) {
      this.setData({ tempPhone: e.detail.value });
      this.computeAllData();
    },
  
    // 保存个人信息到云端
    saveProfile: function () {
      const that = this;
      
      // 简单验证
      if (!this.data.computedNickName || this.data.computedNickName.length < 2) {
        this.showToast('昵称至少2个字符');
        return;
      }
  
      if (this.data.computedPhone && !/^1[3-9]\d{9}$/.test(this.data.computedPhone)) {
        this.showToast('请输入正确的手机号');
        return;
      }
  
      this.setData({ isLoading: true });
  
      // 准备用户数据
      const userData = {
        nickName: this.data.computedNickName,
        avatarUrl: this.data.computedAvatarUrl,
        bio: this.data.computedBio,
        email: this.data.computedEmail,
        phone: this.data.computedPhone,
        gender: this.getGenderValue(this.data.genderIndex),
        region: this.data.region,
        updateTime: new Date()
      };
  
      // 保存到云端数据库
      this.saveUserToCloud(userData);
    },
  
    // 保存用户信息到云数据库
    saveUserToCloud: function (userData) {
      const that = this;
      const app = getApp();
      const db = wx.cloud.database();
      
      if (app.globalData.openid) {
        // 检查用户是否已存在
        db.collection('users').where({
          _openid: app.globalData.openid
        }).get({
          success: function (res) {
            if (res.data.length > 0) {
              // 用户已存在，更新数据
              that.updateUserInCloud(userData, res.data[0]._id);
            } else {
              // 新用户，添加数据
              that.addUserToCloud(userData);
            }
          },
          fail: function (err) {
            console.error('查询用户失败:', err);
            that.handleSaveError('查询用户信息失败');
          }
        });
      } else {
        that.handleSaveError('用户身份验证失败');
      }
    },
  
    // 更新用户信息
    updateUserInCloud: function (userData, userId) {
      const that = this;
      const db = wx.cloud.database();
      
      db.collection('users').doc(userId).update({
        data: userData,
        success: function (res) {
          that.handleSaveSuccess(userData);
        },
        fail: function (err) {
          console.error('更新用户信息失败:', err);
          that.handleSaveError('更新个人信息失败');
        }
      });
    },
  
    // 添加新用户
    addUserToCloud: function (userData) {
      const that = this;
      const db = wx.cloud.database();
      const app = getApp();
      
      // 添加创建时间
      userData.createTime = new Date();
      userData.lastLoginTime = new Date();
      
      db.collection('users').add({
        data: userData,
        success: function (res) {
          that.handleSaveSuccess(userData);
        },
        fail: function (err) {
          console.error('添加用户失败:', err);
          that.handleSaveError('保存个人信息失败');
        }
      });
    },
  
    // 处理保存成功
    handleSaveSuccess: function (userData) {
      const app = getApp();
      
      // 更新全局数据
      app.globalData.userInfo = { ...app.globalData.userInfo, ...userData };
      
      // 更新本地存储
      wx.setStorageSync('userInfo', app.globalData.userInfo);
      
      this.setData({ isLoading: false });
      this.showToast('个人信息保存成功');
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    },
  
    // 处理保存失败
    handleSaveError: function (errorMsg) {
      this.setData({ isLoading: false });
      this.showToast(errorMsg);
    },
  
    // 显示提示
    showToast: function (text) {
      this.setData({
        showToast: true,
        toastText: text
      });
      
      setTimeout(() => {
        this.setData({
          showToast: false
        });
      }, 2000);
    }
  });