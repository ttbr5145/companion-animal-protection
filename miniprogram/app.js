// miniprogram/app.js
App({
    onLaunch: function () {
      // 初始化云开发
      wx.cloud.init({
        env: 'cloud1-5g88rmqa7bde7156',
        traceUser: true
      });
  
      // 检查登录状态 - 简化逻辑
      this.checkLoginStatus();
    },
  
    globalData: {
      userInfo: null,
      openid: null,
      isLoggedIn: false
    },
  
    // 简化检查登录状态方法
    checkLoginStatus: function () {
      const userInfo = wx.getStorageSync('userInfo');
      const openid = wx.getStorageSync('openid');
      
      if (userInfo && openid) {
        this.globalData.userInfo = userInfo;
        this.globalData.openid = openid;
        this.globalData.isLoggedIn = true;
      }
      // 移除自动跳转逻辑，由各个页面自行控制
    }
  });