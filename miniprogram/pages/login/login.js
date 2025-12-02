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
  
    // 处理登录成功 - 添加昵称判断逻辑
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
              // 判断用户是否设置了昵称
              this.checkUserNickname(result.userInfo);
            }, 1500);
          }
        });
    },
  
    // 检查用户昵称并决定跳转路径
    checkUserNickname: function(userInfo) {
      // 从用户信息中获取昵称，优先从根级别获取，如果没有则从userInfo对象获取
      const nickName = userInfo.nickName || 
                      (userInfo.userInfo && userInfo.userInfo.nickName) || 
                      '';
      
      // 判断昵称是否为空或者是微信默认昵称
      const isDefaultNickname = !nickName || 
                              nickName === '微信用户' || 
                              nickName === '微信用户' || 
                              nickName.trim() === '';
      
      if (isDefaultNickname) {
        // 未设置昵称，跳转到修改信息界面
        wx.navigateTo({
          url: '/pages/updateProfile/updateProfile'
        });
      } else {
        // 已设置昵称，跳转到功能页面
        wx.switchTab({
          url: '/pages/function/function'
        });
      }
    }
  });