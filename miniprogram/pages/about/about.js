Page({
    data: {
      // 页面数据
      platformInfo: {
        name: '伴侣动物保护平台',
        version: '1.0.0',
        description: '伴侣动物保护平台致力于为伴侣动物提供全面的保护与服务，通过责任明晰、资质查询、支持服务和监督举报等功能模块，构建完善的动物保护生态系统。'
      },
      teamInfo: {
        organizer: '俞李依',
        developer: '吴桐'
      },
      contactInfo: {
        phone: '18098695953',
        note: '我们将尽快为您解答和处理'
      }
    },
  
    onLoad: function (options) {
      // 页面加载时的逻辑
      console.log('关于我们页面加载');
    },
  
    onShow: function () {
      // 页面显示时的逻辑
    },
  
    // 拨打电话
    makePhoneCall: function () {
      wx.makePhoneCall({
        phoneNumber: this.data.contactInfo.phone,
        success: () => {
          console.log('拨打电话成功');
        },
        fail: (err) => {
          console.error('拨打电话失败:', err);
          wx.showToast({
            title: '拨打电话失败',
            icon: 'none'
          });
        }
      });
    },
  
    // 返回上一页
    goBack: function () {
      wx.navigateBack({
        delta: 1
      });
    },
  
    // 复制联系方式
    copyContact: function () {
      wx.setClipboardData({
        data: this.data.contactInfo.phone,
        success: () => {
          wx.showToast({
            title: '联系方式已复制',
            icon: 'success'
          });
        }
      });
    }
  });