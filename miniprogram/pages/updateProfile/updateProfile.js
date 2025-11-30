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
      
      // 计算后的数据（避免WXML复杂表达式）
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
      isLoading: false
    },
  
    onLoad: function (options) {
      this.loadUserInfo();
      this.computeAllData(); // 初始化计算数据
    },
  
    // 加载用户信息
    loadUserInfo: function () {
      const app = getApp();
      const userInfo = app.globalData.userInfo || {};
      
      this.setData({
        userInfo: userInfo,
        genderIndex: this.getGenderIndex(userInfo.gender),
        region: userInfo.region || []
      });
      
      this.computeAllData(); // 数据加载后重新计算
    },
  
    // 计算所有需要在WXML中使用的数据
    computeAllData: function () {
      const { 
        tempAvatarUrl, userInfo, tempNickName, tempBio, 
        tempEmail, tempPhone, genderIndex, region, genderOptions 
      } = this.data;
      
      // 计算头像URL
      const computedAvatarUrl = tempAvatarUrl || userInfo.avatarUrl || '/images/default-avatar.png';
      
      // 计算昵称
      const computedNickName = tempNickName || userInfo.nickName || '';
      
      // 计算个人简介
      const computedBio = tempBio || userInfo.bio || '';
      const bioLength = computedBio.length;
      
      // 计算联系方式
      const computedEmail = tempEmail || userInfo.email || '';
      const computedPhone = tempPhone || userInfo.phone || '';
      
      // 计算性别显示文本
      const computedGenderText = genderOptions[genderIndex] || '请选择';
      
      // 计算地区显示文本
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
  
    // 返回上一页
    goBack: function () {
      wx.navigateBack();
    },
  
    // 选择头像
    chooseAvatar: function () {
      const that = this;
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: function (res) {
          that.setData({
            tempAvatarUrl: res.tempFilePaths[0]
          });
          that.computeAllData(); // 更新计算数据
          that.showToast('头像已选择，记得保存哦~');
        },
        fail: function (err) {
          console.error('选择头像失败:', err);
          that.showToast('选择头像失败');
        }
      });
    },
  
    // 表单输入处理
    onNickNameInput: function (e) {
      this.setData({
        tempNickName: e.detail.value
      });
      this.computeAllData(); // 输入时实时更新计算数据
    },
  
    onGenderChange: function (e) {
      this.setData({
        genderIndex: parseInt(e.detail.value)
      });
      this.computeAllData(); // 选择后更新计算数据
    },
  
    onRegionChange: function (e) {
      this.setData({
        region: e.detail.value
      });
      this.computeAllData(); // 选择后更新计算数据
    },
  
    onBioInput: function (e) {
      this.setData({
        tempBio: e.detail.value
      });
      this.computeAllData(); // 输入时实时更新计算数据
    },
  
    onEmailInput: function (e) {
      this.setData({
        tempEmail: e.detail.value
      });
      this.computeAllData(); // 输入时实时更新计算数据
    },
  
    onPhoneInput: function (e) {
      this.setData({
        tempPhone: e.detail.value
      });
      this.computeAllData(); // 输入时实时更新计算数据
    },
  
    // 保存个人信息
    saveProfile: function () {
      // ... 保存逻辑保持不变，但使用计算后的数据
      const that = this;
      
      // 简单验证
      if (this.data.computedNickName && this.data.computedNickName.length < 2) {
        this.showToast('昵称至少2个字符');
        return;
      }
  
      if (this.data.computedPhone && !/^1[3-9]\d{9}$/.test(this.data.computedPhone)) {
        this.showToast('请输入正确的手机号');
        return;
      }
  
      this.setData({ isLoading: true });
  
      // 模拟保存过程
      setTimeout(() => {
        const updatedInfo = {
          nickName: this.data.computedNickName,
          avatarUrl: this.data.computedAvatarUrl,
          bio: this.data.computedBio,
          email: this.data.computedEmail,
          phone: this.data.computedPhone,
          gender: this.getGenderValue(this.data.genderIndex),
          region: this.data.region,
          updateTime: new Date()
        };
  
        // 更新全局数据
        const app = getApp();
        app.globalData.userInfo = { ...app.globalData.userInfo, ...updatedInfo };
  
        // 更新本地存储
        wx.setStorageSync('userInfo', app.globalData.userInfo);
        
        this.setData({ isLoading: false });
        this.showToast('个人信息更新成功');
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }, 1000);
    },
  
    getGenderValue: function (index) {
      switch (index) {
        case 0: return 'male';
        case 1: return 'female';
        default: return 'unknown';
      }
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