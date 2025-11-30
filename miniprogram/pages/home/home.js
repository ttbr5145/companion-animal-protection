// miniprogram/pages/home/home.js
Page({
    data: {
      userInfo: null
    },
  
    onLoad: function (options) {
      this.checkLoginStatus();
      this.loadUserInfo();
    },
  
    onShow: function () {
      this.loadUserInfo();
    },
  
    // 检查登录状态
    checkLoginStatus: function () {
      const app = getApp();
      if (!app.globalData.isLoggedIn) {
        wx.redirectTo({
          url: '/pages/login/login'
        });
      }
    },
  
    // 加载用户信息
    loadUserInfo: function () {
      const app = getApp();
      const userInfo = app.globalData.userInfo;
      
      if (userInfo) {
        this.setData({
          userInfo: userInfo
        });
      } else {
        // 从缓存中获取
        const cachedUserInfo = wx.getStorageSync('userInfo');
        if (cachedUserInfo) {
          this.setData({
            userInfo: cachedUserInfo
          });
          app.globalData.userInfo = cachedUserInfo;
        }
      }
    },
  
    // 跳转到责任明晰板块
    navigateToResponsibility: function () {
      wx.navigateTo({
        url: '/pages/responsibility/responsibility'
      });
    },
  
    // 跳转到资质查询板块
    navigateToQualification: function () {
      wx.navigateTo({
        url: '/pages/qualification/qualification'
      });
    },
  
    // 跳转到支持服务板块
    navigateToSupport: function () {
      wx.navigateTo({
        url: '/pages/support/support'
      });
    },
  
    // 跳转到监督举报板块
    navigateToReport: function () {
      wx.navigateTo({
        url: '/pages/report/report'
      });
    },
  
    // 退出登录
    logout: function () {
      wx.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            const app = getApp();
            app.logout();
          }
        }
      });
    }
  });