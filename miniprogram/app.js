// miniprogram/app.js
App({
    onLaunch: function () {
      // 初始化云开发
      wx.cloud.init({
        env: 'cloud1-5g88rmqa7bde7156', // 您的环境ID
        traceUser: true
      });
  
      // 检查登录状态并初始化云数据
      this.checkLoginStatus();
      this.initializeCloudData();
    },
  
    globalData: {
      userInfo: null,
      openid: null,
      isLoggedIn: false,
      cloudEnv: 'cloud1-5g88rmqa7bde7156' // 云环境配置
    },
  
    /**
     * 检查用户登录状态
     */
    checkLoginStatus: function () {
      const that = this;
      
      // 先从本地存储获取用户信息
      const localUserInfo = wx.getStorageSync('userInfo');
      const localOpenid = wx.getStorageSync('openid');
      
      if (localUserInfo && localOpenid) {
        this.globalData.userInfo = localUserInfo;
        this.globalData.openid = localOpenid;
        this.globalData.isLoggedIn = true;
        
        // 同步检查云端数据是否更新
        this.syncCloudData(localOpenid);
      } else {
        // 如果没有本地数据，尝试静默登录获取openid
        this.getUserOpenId();
      }
    },
  
    /**
     * 获取用户openid
     */
    getUserOpenId: function () {
      const that = this;
      
      wx.login({
        success: res => {
          if (res.code) {
            // 通过云函数获取openid
            wx.cloud.callFunction({
              name: 'getOpenId',
              data: { code: res.code },
              success: cloudRes => {
                const openid = cloudRes.result.openid;
                that.globalData.openid = openid;
                wx.setStorageSync('openid', openid);
                
                // 检查用户是否已存在云端
                that.checkUserExists(openid);
              },
              fail: err => {
                console.error('获取openid失败:', err);
                that.handleLoginError('获取用户信息失败');
              }
            });
          }
        },
        fail: err => {
          console.error('wx.login失败:', err);
          that.handleLoginError('登录失败');
        }
      });
    },
  
    /**
     * 检查用户是否在云端存在
     */
    checkUserExists: function (openid) {
      const that = this;
      const db = wx.cloud.database();
      
      db.collection('users').where({
        _openid: openid
      }).get({
        success: res => {
          if (res.data.length > 0) {
            // 用户已存在，加载云端数据
            const cloudUserInfo = res.data[0];
            that.globalData.userInfo = cloudUserInfo;
            that.globalData.isLoggedIn = true;
            wx.setStorageSync('userInfo', cloudUserInfo);
            
            // 触发数据更新事件
            that.emitUserInfoUpdate(cloudUserInfo);
          } else {
            // 新用户，创建默认数据
            that.createNewUser(openid);
          }
        },
        fail: err => {
          console.error('查询用户数据失败:', err);
          // 查询失败时使用默认数据
          that.createNewUser(openid);
        }
      });
    },
  
    /**
     * 创建新用户数据
     */
    createNewUser: function (openid) {
      const defaultUserInfo = {
        _openid: openid,
        nickName: '微信用户',
        avatarUrl: '/images/default-avatar.png',
        bio: '',
        email: '',
        phone: '',
        gender: 'unknown',
        region: [],
        createTime: new Date(),
        updateTime: new Date(),
        isNewUser: true
      };
      
      this.globalData.userInfo = defaultUserInfo;
      this.globalData.isLoggedIn = true;
      wx.setStorageSync('userInfo', defaultUserInfo);
      
      // 将新用户保存到云端
      this.saveUserToCloud(defaultUserInfo);
    },
  
    /**
     * 保存用户数据到云端
     */
    saveUserToCloud: function (userInfo) {
      const db = wx.cloud.database();
      
      db.collection('users').add({
        data: userInfo
      }).then(res => {
        console.log('用户数据已保存到云端', res);
      }).catch(err => {
        console.error('保存用户数据到云端失败:', err);
      });
    },
  
    /**
     * 同步云端数据
     */
    syncCloudData: function (openid) {
      const that = this;
      const db = wx.cloud.database();
      
      db.collection('users').where({
        _openid: openid
      }).get({
        success: res => {
          if (res.data.length > 0) {
            const cloudUserInfo = res.data[0];
            const localUserInfo = that.globalData.userInfo;
            
            // 比较更新时间，使用最新的数据
            const cloudUpdateTime = new Date(cloudUserInfo.updateTime).getTime();
            const localUpdateTime = new Date(localUserInfo.updateTime).getTime();
            
            if (cloudUpdateTime > localUpdateTime) {
              // 云端数据更新，使用云端数据
              that.globalData.userInfo = cloudUserInfo;
              wx.setStorageSync('userInfo', cloudUserInfo);
              that.emitUserInfoUpdate(cloudUserInfo);
            }
          }
        },
        fail: err => {
          console.error('同步云端数据失败:', err);
        }
      });
    },
  
    /**
     * 更新用户信息（供其他页面调用）
     */
    updateUserInfo: function (newUserInfo) {
      const that = this;
      const updatedInfo = {
        ...newUserInfo,
        updateTime: new Date()
      };
      
      // 更新全局数据
      that.globalData.userInfo = updatedInfo;
      wx.setStorageSync('userInfo', updatedInfo);
      
      // 保存到云端
      const db = wx.cloud.database();
      db.collection('users').where({
        _openid: that.globalData.openid
      }).update({
        data: updatedInfo
      }).then(res => {
        console.log('用户信息云端更新成功', res);
        that.emitUserInfoUpdate(updatedInfo);
      }).catch(err => {
        console.error('用户信息云端更新失败:', err);
        // 即使云端失败，也保持本地数据更新
        that.emitUserInfoUpdate(updatedInfo);
      });
      
      return updatedInfo;
    },
  
    /**
     * 初始化云端数据相关功能
     */
    initializeCloudData: function () {
      // 可以在这里初始化其他云相关功能
      console.log('云端数据模块初始化完成');
    },
  
    /**
     * 触发用户信息更新事件
     */
    emitUserInfoUpdate: function (userInfo) {
      // 可以通过事件总线或全局事件触发页面更新
      if (this.userInfoUpdateCallback) {
        this.userInfoUpdateCallback(userInfo);
      }
    },
  
    /**
     * 注册用户信息更新回调
     */
    onUserInfoUpdate: function (callback) {
      this.userInfoUpdateCallback = callback;
    },
  
    /**
     * 处理登录错误
     */
    handleLoginError: function (errorMsg) {
      console.error('登录流程错误:', errorMsg);
      // 可以在这里添加错误处理逻辑，如显示提示等
    },
  
    /**
     * 用户登出
     */
    logout: function () {
      // 清除本地数据
      this.globalData.userInfo = null;
      this.globalData.openid = null;
      this.globalData.isLoggedIn = false;
      
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('openid');
      
      // 触发登出事件
      if (this.userInfoUpdateCallback) {
        this.userInfoUpdateCallback(null);
      }
      
      // 重新检查登录状态
      this.checkLoginStatus();
    }
  });