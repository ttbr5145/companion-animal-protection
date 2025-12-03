// pages/ticket-detail/ticket-detail.js
Page({
    data: {
      ticketId: '',
      ticket: {},
      statusText: {
        'pending': '审核中',
        'processing': '处理中', 
        'completed': '已完成',
        'cancelled': '已取消'
      },
      typeText: {
        '宠物伤人': '宠物伤人事件',
        '宠物虐待': '宠物虐待事件', 
        '宠物遗弃': '宠物遗弃事件',
        '其他': '其他事件'
      }
    },
  
    onLoad(options) {
      this.setData({ ticketId: options.id })
      this.loadTicketDetail()
    },
  
    async loadTicketDetail() {
      wx.showLoading({ title: '加载中' })
      
      try {
        const res = await wx.cloud.callFunction({
          name: 'ticket-detail',
          data: { ticketId: this.data.ticketId }
        })
  
        if (res.result.code === 200) {
          const ticket = res.result.data
          ticket.submitTime = this.formatTime(ticket.submitTime)
          this.setData({ ticket })
        } else {
          throw new Error(res.result.message)
        }
      } catch (error) {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        wx.hideLoading()
      }
    },
  
    previewImage(e) {
      const url = e.currentTarget.dataset.url
      const urls = this.data.ticket.images
      wx.previewImage({
        urls: urls,
        current: url
      })
    },
  
    cancelTicket() {
      const that = this
      wx.showModal({
        title: '确认取消',
        content: '确定要取消此工单吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const result = await wx.cloud.callFunction({
                name: 'ticket-update',
                data: {
                  ticketId: that.data.ticketId,
                  status: 'cancelled'
                }
              })
  
              if (result.result.code === 200) {
                wx.showToast({
                  title: '取消成功',
                  success() {
                    that.loadTicketDetail()
                  }
                })
              }
            } catch (error) {
              wx.showToast({
                title: '取消失败',
                icon: 'none'
              })
            }
          }
        }
      })
    },
  
    formatTime(dateString) {
      const date = new Date(dateString)
      const now = new Date()
      const diff = now - date
      
      if (diff < 60000) { // 1分钟内
        return '刚刚'
      } else if (diff < 3600000) { // 1小时内
        return Math.floor(diff / 60000) + '分钟前'
      } else if (diff < 86400000) { // 1天内
        return Math.floor(diff / 3600000) + '小时前'
      } else {
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`
      }
    },

    // 添加页面分享功能
    onShareAppMessage() {
        return {
        title: `工单详情 - ${this.data.ticket.title}`,
        path: `/pages/ticket-detail/ticket-detail?id=${this.data.ticketId}`
        }
    },
  
    // 添加下拉刷新
    onPullDownRefresh() {
        this.loadTicketDetail().then(() => {
        wx.stopPullDownRefresh()
        })
    },
    
    // 优化错误处理
    async loadTicketDetail() {
        wx.showLoading({ title: '加载中' })
        
        try {
        const res = await wx.cloud.callFunction({
            name: 'ticket-detail',
            data: { ticketId: this.data.ticketId }
        })
    
        if (res.result.code === 200) {
            const ticket = res.result.data
            ticket.submitTime = this.formatTime(ticket.submitTime)
            // 添加更新时间格式化
            if (ticket.updateTime) {
            ticket.updateTime = this.formatTime(ticket.updateTime)
            }
            this.setData({ ticket })
        } else {
            throw new Error(res.result.message || '加载失败')
        }
        } catch (error) {
        console.error('加载工单详情失败:', error)
        wx.showToast({
            title: error.message || '加载失败',
            icon: 'none',
            duration: 2000
        })
        } finally {
        wx.hideLoading()
        }
    }
  })