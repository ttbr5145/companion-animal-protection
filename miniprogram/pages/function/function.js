// function/function.js
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
  
    // 跳转到功能页面 - 修改report跳转逻辑
    navigateToPage: function (e) {
        const page = e.currentTarget.dataset.page;
        
        // 添加点击反馈
        wx.vibrateShort({ type: 'light' });
        
        if (page === 'support') {
        wx.navigateTo({
            url: `/pages/postEdit/postEdit?type=${page}`,
            fail: (err) => {
            console.error('跳转到发帖页失败:', err);
            wx.showToast({
                title: '页面不存在或未注册',
                icon: 'none',
                duration: 2000
            });
            }
        });
        } else if (page === 'report') {
        // 跳转到工单创建页面，传递类型参数
        wx.navigateTo({
            url: '/pages/ticket-list/ticket-list',
            fail: (err) => {
            console.error('跳转到工单创建页失败:', err);
            wx.showToast({
                title: '页面不存在或未注册',
                icon: 'none',
                duration: 2000
            });
            }
        });
        } else {
        const pageMap = {
            'responsibility': '/pages/responsibility/responsibility',
            'qualification': '/pages/qualification/qualification'
        };
        
        if (pageMap[page]) {
            wx.navigateTo({
            url: pageMap[page],
            fail: (err) => {
                console.error('页面跳转失败:', err);
                wx.showToast({
                title: '功能暂未开放',
                icon: 'none',
                duration: 2000
                });
            }
            });
        } else {
            wx.showToast({
            title: '功能不存在',
            icon: 'none',
            duration: 2000
            });
        }
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