Page({
    data: {
      userInfo: null
    },
  
    onLoad: function () {
      this.checkLoginStatus();
      this.setUserInfo();
    },
  
    onShow: function () {
      this.setUserInfo();
    },
  
    // 检查登录状态
    checkLoginStatus: function () {
      if (!getApp().globalData.isLoggedIn) {
        wx.redirectTo({
          url: '/pages/login/login'
        });
      }
    },
  
    // 设置用户信息
    setUserInfo: function () {
      const app = getApp();
      if (app.globalData.userInfo) {
        this.setData({
          userInfo: app.globalData.userInfo
        });
      }
    },
  
    // 跳转到功能页面
    navigateToPage: function (e) {
      const page = e.currentTarget.dataset.page;
      const pageMap = {
        'responsibility': '/pages/responsibility/responsibility',
        'qualification': '/pages/qualification/qualification',
        'support': '/pages/support/support',
        'report': '/pages/report/report'
      };
      
      // 添加点击反馈
      wx.vibrateShort({ type: 'light' });
      
      if (pageMap[page]) {
        wx.navigateTo({
          url: pageMap[page],
          fail: (err) => {
            console.error('页面跳转失败:', err);
            wx.showToast({
              title: '功能开发中',
              icon: 'none'
            });
          }
        });
      }
    },
  
    // 下拉刷新
    onPullDownRefresh: function () {
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
      setTimeout(() => {
        wx.stopPullDownRefresh();
      }, 1000);
    }
  });