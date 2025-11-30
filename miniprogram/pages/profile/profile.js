Page({
    data: {
      userInfo: null,
      checkinDays: 5, // 连续打卡天数
      protectionDays: 1935, // 保护天数
      rescueCount: 635, // 救助数量
      showLogoutModal: false,
      showCheckinToast: false
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
      const userInfo = app.globalData.userInfo;
      
      if (userInfo) {
        this.setData({
          userInfo: userInfo
        });
      }
    },
  
    // 处理打卡
    handleCheckin: function () {
      // 模拟打卡成功
      this.setData({
        checkinDays: this.data.checkinDays + 1,
        showCheckinToast: true
      });
  
      // 3秒后隐藏提示
      setTimeout(() => {
        this.setData({
          showCheckinToast: false
        });
      }, 3000);
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
      this.hideLogoutModal();
      getApp().logout();
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