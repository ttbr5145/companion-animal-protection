Page({
    data: {
      userInfo: null,
      checkinDays: 0,
      protectionDays: 0,
      rescueCount: 0,
      showLogoutModal: false,
      showCheckinToast: false,
      isCheckedIn: false, // 新增：今天是否已打卡
      lastCheckinDate: '', // 新增：最后打卡日期
      checkinButtonText: '打卡', // 新增：打卡按钮文本
      checkinButtonDisabled: false // 新增：打卡按钮禁用状态
    },
  
    onLoad: function() {
      this.checkLoginStatus();
      this.loadUserDataFromCloud();
      this.checkTodayCheckinStatus(); // 检查今日打卡状态
    },
  
    onShow: function() {
      this.loadUserDataFromCloud();
      this.checkTodayCheckinStatus(); // 每次显示页面时检查打卡状态
    },
  
    // 从云端加载用户数据
    loadUserDataFromCloud: function() {
      const app = getApp();
      const that = this;
      
      if (app.globalData.isLoggedIn && app.globalData.openid) {
        const db = wx.cloud.database();
        
        // 从云端加载用户完整信息
        db.collection('users').where({
          _openid: app.globalData.openid
        }).get({
          success: function(res) {
            if (res.data.length > 0) {
              const cloudUserInfo = res.data[0];
              
              // 更新全局数据和页面数据
              app.globalData.userInfo = cloudUserInfo;
              that.setData({
                userInfo: cloudUserInfo,
                checkinDays: cloudUserInfo.checkinDays || 0,
                protectionDays: cloudUserInfo.protectionDays || 0,
                rescueCount: cloudUserInfo.rescueCount || 0,
                lastCheckinDate: cloudUserInfo.lastCheckinDate || ''
              });
              
              // 检查今日打卡状态
              that.checkTodayCheckinStatus();
              
              // 更新本地存储
              wx.setStorageSync('userInfo', cloudUserInfo);
            }
          },
          fail: function(err) {
            console.error('从云端加载用户数据失败:', err);
            // 如果云端加载失败，使用本地数据
            that.setUserInfo();
          }
        });
      } else {
        this.setUserInfo();
      }
    },
  
    // 检查今日打卡状态
    checkTodayCheckinStatus: function() {
      const today = this.getTodayDate();
      const lastCheckinDate = this.data.lastCheckinDate;
      
      // 如果今天已经打卡过
      if (lastCheckinDate === today) {
        this.setData({
          isCheckedIn: true,
          checkinButtonText: '今日已打卡',
          checkinButtonDisabled: true
        });
      } else {
        this.setData({
          isCheckedIn: false,
          checkinButtonText: '打卡',
          checkinButtonDisabled: false
        });
      }
    },
  
    // 获取今日日期字符串（格式：YYYY-MM-DD）
    getTodayDate: function() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
  
    // 检查连续打卡天数
    checkConsecutiveDays: function(lastDate) {
      const today = new Date();
      const lastCheckin = new Date(lastDate);
      
      // 计算两天之间的差异（单位：天）
      const timeDiff = today.getTime() - lastCheckin.getTime();
      const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
      
      // 如果昨天打卡了，连续天数+1，否则重置为1
      return dayDiff === 1 ? this.data.checkinDays + 1 : 1;
    },
  
    // 处理打卡功能
    handleCheckin: function() {
      const that = this;
      const today = this.getTodayDate();
      
      // 检查是否已打卡
      if (this.data.isCheckedIn) {
        wx.showToast({
          title: '今天已经打卡过了哦~',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      // 显示加载中
      wx.showLoading({
        title: '打卡中...',
        mask: true
      });
      
      // 更新本地状态
      this.setData({
        checkinButtonDisabled: true,
        checkinButtonText: '打卡中...'
      });
      
      // 计算新的连续打卡天数
      const newCheckinDays = this.data.lastCheckinDate ? 
        this.checkConsecutiveDays(this.data.lastCheckinDate) : 1;
      
      // 准备更新的数据
      const updateData = {
        checkinDays: newCheckinDays,
        lastCheckinDate: today,
        protectionDays: this.data.protectionDays + 1, // 保护天数+1
        updateTime: new Date()
      };
      
      // 上传到云端
      this.updateCheckinToCloud(updateData, today, newCheckinDays);
    },
  
    // 更新打卡数据到云端
    updateCheckinToCloud: function(updateData, today, newCheckinDays) {
      const that = this;
      const app = getApp();
      const db = wx.cloud.database();
      
      db.collection('users').where({
        _openid: app.globalData.openid
      }).update({
        data: updateData,
        success: function(res) {
          wx.hideLoading();
          
          if (res.stats.updated > 0) {
            // 更新成功
            that.setData({
              checkinDays: newCheckinDays,
              protectionDays: updateData.protectionDays,
              lastCheckinDate: today,
              isCheckedIn: true,
              checkinButtonText: '今日已打卡',
              showCheckinToast: true
            });
            
            // 更新全局数据
            app.globalData.userInfo = {
              ...app.globalData.userInfo,
              ...updateData
            };
            
            // 更新本地存储
            wx.setStorageSync('userInfo', app.globalData.userInfo);
            
            // 显示成功提示
            wx.showToast({
              title: `打卡成功！连续${newCheckinDays}天`,
              icon: 'success',
              duration: 2000
            });
            
            // 3秒后隐藏自定义提示
            setTimeout(() => {
              that.setData({
                showCheckinToast: false
              });
            }, 3000);
            
            // 记录打卡历史（可选）
            that.recordCheckinHistory(today);
          } else {
            that.handleCheckinError('打卡失败，请重试');
          }
        },
        fail: function(err) {
          wx.hideLoading();
          console.error('云端打卡失败:', err);
          that.handleCheckinError('网络错误，打卡失败');
        }
      });
    },
  
    // 记录打卡历史（可选功能）
    recordCheckinHistory: function(today) {
      const that = this;
      const app = getApp();
      const db = wx.cloud.database();
      
      // 在checkinHistory集合中记录打卡历史
      db.collection('checkinHistory').add({
        data: {
          _openid: app.globalData.openid,
          checkinDate: today,
          checkinTime: new Date(),
          continuousDays: this.data.checkinDays,
          createdAt: new Date()
        },
        success: function(res) {
          console.log('打卡历史记录成功');
        },
        fail: function(err) {
          console.error('记录打卡历史失败:', err);
        }
      });
    },
  
    // 处理打卡错误
    handleCheckinError: function(errorMsg) {
      this.setData({
        checkinButtonDisabled: false,
        checkinButtonText: '打卡'
      });
      
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
      });
    },
  
    // 检查登录状态
    checkLoginStatus: function() {
      if (!getApp().globalData.isLoggedIn) {
        wx.redirectTo({
          url: '/pages/login/login'
        });
      }
    },
  
    // 设置用户信息
    setUserInfo: function() {
      const app = getApp();
      const userInfo = app.globalData.userInfo;
      
      if (userInfo) {
        this.setData({
          userInfo: userInfo,
          checkinDays: userInfo.checkinDays || 0,
          protectionDays: userInfo.protectionDays || 0,
          rescueCount: userInfo.rescueCount || 0,
          lastCheckinDate: userInfo.lastCheckinDate || ''
        });
        
        // 检查今日打卡状态
        this.checkTodayCheckinStatus();
      }
    },


    // 注册为志愿者
    registerAsVolunteer: function () {
      wx.showModal({
        title: '注册志愿者',
        content: '您确定要注册为伴侣动物保护志愿者吗？',
        success: (res) => {
          if (res.confirm) {
            wx.showToast({
              title: '注册成功！',
              icon: 'success',
              duration: 2000
            });
          }
        }
      });
    },
  
    // 显示退出确认模态框
    showLogoutConfirm: function () {
      this.setData({
        showLogoutModal: true
      });
    },
  
    // 隐藏退出确认模态框
    hideLogoutModal: function () {
      this.setData({
        showLogoutModal: false
      });
    },
  
    // 退出登录
    logout: function () {
        const app = getApp();

        // 可选：添加确认对话框，避免误操作
        wx.showModal({
        title: '确认退出',
        content: '确定要退出登录吗？',
        success: (res) => {
            if (res.confirm) {
            // 用户点击“确定”
            this.performLogout(app);
            }
            // 用户点击“取消”，则什么都不做
        }
        });
    },
    /**
   * 执行退出登录的具体操作
   * @param {Object} app 全局应用实例
   */
    performLogout: function (app) {
        // 1. 清除本地存储的登录状态和用户信息
        // 使用 Sync 方法同步清除，确保清除完成后再跳转[1,3](@ref)
        try {
        wx.clearStorageSync(); // 清除所有本地缓存，简单彻底[1](@ref)
        // 或者选择性清除（推荐，避免清除其他无关缓存）：
        // wx.removeStorageSync('userInfo');
        // wx.removeStorageSync('openid');
        // wx.removeStorageSync('session_key');
        } catch (e) {
        console.error('清除本地存储失败：', e);
        }

        // 2. 重置全局数据中的用户状态[5](@ref)
        app.globalData.userInfo = null;
        app.globalData.isLoggedIn = false;
        app.globalData.openid = null; // 如果适用

        // 3. 跳转到登录页面
        // 使用 wx.redirectTo 关闭当前页面并跳转（登录页非 tabBar 时适用）[6,7](@ref)
        wx.redirectTo({
        url: '/pages/login/login' // 请确保路径正确，如 '/pages/auth/login'
        });

        // 如果你的登录页是 tabBar 页面，必须使用 wx.switchTab[6,8](@ref)
        // wx.switchTab({
        //   url: '/pages/index/index' // 假设登录后跳转到的首页是 tabBar 页
        // });

        // 如果你想关闭所有页面并打开登录页（完全重启应用状态），可使用 wx.reLaunch[6,7](@ref)
        // wx.reLaunch({
        //   url: '/pages/login/login'
        // });

        // 可选：给出退出成功的提示[4](@ref)
        // wx.showToast({
        //   title: '已退出登录',
        //   icon: 'success',
        //   duration: 1500
        // });
    },
  
  
    // 导航功能 - 图标网格
    navigateToMessage: function () {
      wx.showToast({
        title: '消息功能开发中',
        icon: 'none'
      });
    },
  
    navigateToBadges: function () {
      wx.showToast({
        title: '徽章功能开发中',
        icon: 'none'
      });
    },
  
    navigateToPoints: function () {
      wx.showToast({
        title: '积分功能开发中',
        icon: 'none'
      });
    },
  
    navigateToInvite: function () {
      wx.showToast({
        title: '邀请好友功能开发中',
        icon: 'none'
      });
    },
  
    navigateToSettings: function () {
      wx.showToast({
        title: '设置功能开发中',
        icon: 'none'
      });
    },
  
    // 导航功能 - 全屏宽度列表项
    navigateToAnimalRecords: function () {
      wx.showToast({
        title: '动物档案功能开发中',
        icon: 'none'
      });
    },
  
    navigateToFamilyPets: function () {
      wx.showToast({
        title: '家庭宠物功能开发中',
        icon: 'none'
      });
    },
  
    navigateToHelp: function () {
      wx.showToast({
        title: '使用帮助功能开发中',
        icon: 'none'
      });
    },
  
    navigateToFeedback: function () {
      wx.showToast({
        title: '意见反馈功能开发中',
        icon: 'none'
      });
    },
  

    navigateToAbout: function () {
        wx.navigateTo({
        url: '/pages/about/about'
        });
    },
  
    // 新增功能 - 修改个人信息
    // 修改个人信息
    updateProfile: function () {
        wx.navigateTo({
        url: '/pages/updateProfile/updateProfile'
        });
    },
  
    // 新增功能 - 绑定手机号
    bindPhone: function () {
      wx.showModal({
        title: '绑定手机号',
        content: '此功能将允许您绑定手机号，用于找回密码等操作',
        success: (res) => {
          if (res.confirm) {
            wx.showToast({
              title: '功能开发中',
              icon: 'none'
            });
          }
        }
      });
    }
  });