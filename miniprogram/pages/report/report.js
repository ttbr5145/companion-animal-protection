Page({
    data: {
      tickets: [], // 举报工单列表
      isLoading: false,
      hasMore: true,
      pageSize: 10,
      currentPage: 0
    },
  
    onLoad: function(options) {
      console.log('举报页面加载');
      this.loadTickets();
    },
  
    onPullDownRefresh: function() {
      // 下拉刷新
      this.setData({
        currentPage: 0,
        hasMore: true
      });
      this.loadTickets().then(() => {
        wx.stopPullDownRefresh();
      });
    },
  
    onReachBottom: function() {
      // 上拉加载更多
      if (this.data.hasMore && !this.data.isLoading) {
        this.loadMoreTickets();
      }
    },
  
    // 跳转到工单提交页面
    gotoTicketSubmit: function() {
        const app = getApp();
        let userId = '';
        
        if (app.globalData.userInfo && app.globalData.userInfo._id) {
        userId = app.globalData.userInfo._id;
        }
        
        wx.navigateTo({
        url: `/pages/ticketSubmit/ticketSubmit?type=report&userId=${userId}`
        });
    },
  
    // 加载举报工单列表
    loadTickets: function() {
      const that = this;
      const app = getApp();
      
      return new Promise((resolve, reject) => {
        // 获取用户ID
        let userId = '';
        if (app.globalData.userInfo && app.globalData.userInfo._id) {
          userId = app.globalData.userInfo._id;
        } else {
          wx.showToast({
            title: '请先登录',
            icon: 'none'
          });
          reject('未登录');
          return;
        }
  
        that.setData({ isLoading: true });
  
        // 使用云函数获取举报工单
        wx.cloud.callFunction({
          name: 'getTicketsByType',
          data: {
            userId: userId,
            type: 'report',
            page: that.data.currentPage,
            pageSize: that.data.pageSize
          },
          success: function(res) {
            console.log('获取举报工单成功:', res);
            
            if (res.result && res.result.success) {
              const tickets = res.result.data;
              const hasMore = tickets.length === that.data.pageSize;
              
              if (that.data.currentPage === 0) {
                // 第一页，直接替换
                that.setData({
                  tickets: tickets,
                  hasMore: hasMore,
                  isLoading: false
                });
              } else {
                // 加载更多，合并数据
                that.setData({
                  tickets: that.data.tickets.concat(tickets),
                  hasMore: hasMore,
                  isLoading: false
                });
              }
              
              resolve(tickets);
            } else {
              that.handleLoadError(res.result ? res.result.error : '获取数据失败');
              reject(res.result ? res.result.error : '获取数据失败');
            }
          },
          fail: function(err) {
            console.error('获取举报工单失败:', err);
            that.handleLoadError(err);
            reject(err);
          }
        });
      });
    },
  
    // 加载更多工单
    loadMoreTickets: function() {
      if (!this.data.hasMore) return;
      
      this.setData({
        currentPage: this.data.currentPage + 1
      });
      
      this.loadTickets();
    },
  
    // 处理加载错误
    handleLoadError: function(err) {
      this.setData({ isLoading: false });
      
      let errorMsg = '加载失败，请重试';
      if (err.message) {
        errorMsg = err.message;
      }
      
      wx.showToast({
        title: errorMsg,
        icon: 'none'
      });
    },
  
    // 查看工单详情
    viewTicketDetail: function(e) {
        const ticketId = e.currentTarget.dataset.id;
        
        wx.navigateTo({
            url: `/pages/ticketDetail/ticketDetail?id=${ticketId}`
        });
    },
  
    // 获取状态文本
    getStatusText: function(status) {
      const statusMap = {
        'pending': '待处理',
        'processing': '处理中',
        'resolved': '已解决',
        'rejected': '已拒绝'
      };
      return statusMap[status] || '未知状态';
    },
  
    // 格式化时间
    formatTime: function(time) {
      if (!time) return '';
      
      const date = new Date(time);
      const now = new Date();
      const diff = now - date;
      
      // 如果是今天，显示时间
      if (diff < 24 * 60 * 60 * 1000) {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
      
      // 如果是今年，显示月日
      if (date.getFullYear() === now.getFullYear()) {
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      }
      
      // 其他情况显示年月日
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }
  });