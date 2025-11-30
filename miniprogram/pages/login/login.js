// miniprogram/pages/login/login.js
Page({
    data: {
      canIUse: wx.canIUse('button.open-type.getUserInfo')
    },
  
    onLoad: function () {
      this.checkLoginStatus();
    },
  
    // 检查登录状态
    checkLoginStatus: function () {
      const app = getApp();
      if (app.globalData.userInfo) {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    },
  
    // 微信登录按钮点击事件
    onWeChatLogin: function () {
      if (!this.data.canIUse) {
        this.weChatLogin();
      }
    },
  
    // 获取用户信息回调
    onGetUserInfo: function (e) {
      if (e.detail.userInfo) {
        this.weChatLogin(e.detail.userInfo);
      } else {
        wx.showToast({
          title: '需要授权才能使用',
          icon: 'none'
        });
      }
    },
  
    // 微信登录主逻辑
    weChatLogin: function (userInfo) {
      wx.showLoading({ title: '登录中...' });
  
      wx.login({
        success: (loginRes) => {
          if (loginRes.code) {
            wx.cloud.callFunction({
              name: 'wechatlogin',
              data: { code: loginRes.code, userInfo: userInfo },
              success: (res) => {
                wx.hideLoading();
                if (res.result.success) {
                  this.handleLoginSuccess(res.result);
                } else {
                  wx.showToast({
                    title: res.result.message || '登录失败',
                    icon: 'none'
                  });
                }
              },
              fail: (err) => {
                wx.hideLoading();
                console.error('云函数调用失败:', err);
                wx.showToast({
                  title: '网络错误，请重试',
                  icon: 'none'
                });
              }
            });
          } else {
            wx.hideLoading();
            wx.showToast({ title: '登录失败，请重试', icon: 'none' });
          }
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({ title: '登录失败，请重试', icon: 'none' });
        }
      });
    },
  
    // 处理登录成功 - 确保这个函数在Page({})内部
    handleLoginSuccess: function (result) {
        const app = getApp();
        
        // 存储用户信息到全局数据
        app.globalData.userInfo = result.userInfo || result.userInfo.userInfo;
        app.globalData.openid = result.openid;
        app.globalData.isLoggedIn = true;
        
        // 存储到本地缓存
        wx.setStorageSync('userInfo', app.globalData.userInfo);
        wx.setStorageSync('openid', result.openid);
        
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500,
          success: () => {
            setTimeout(() => {
              // 跳转到功能页面（TabBar页面）
              wx.switchTab({
                url: '/pages/function/function'
              });
            }, 1500);
          }
        });
    }
  });