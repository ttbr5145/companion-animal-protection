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
        statusColor: {
          'pending': '#FF9500',
          'processing': '#007AFF', 
          'completed': '#34C759',
          'cancelled': '#8E8E93'
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
            
            // 使用原始日期字符串计算格式化时间
            const submitTime = ticket.submitTime
            const updateTime = ticket.updateTime
            
            // 设置格式化后的时间
            ticket.relativeSubmitTime = this.formatTime(submitTime)
            ticket.formattedSubmitTime = this.formatDetailedTime(submitTime)
            
            if (updateTime) {
              ticket.relativeUpdateTime = this.formatTime(updateTime)
              ticket.formattedUpdateTime = this.formatDetailedTime(updateTime)
            }
            
            this.setData({ ticket })
          } else {
            throw new Error(res.result.message)
          }
        } catch (error) {
          wx.showToast({
            title: error.message || '加载失败',
            icon: 'error',
            duration: 2000
          })
          console.error('加载工单详情失败:', error)
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
  
    // 复制位置坐标
    copyCoordinates() {
      const { latitude, longitude } = this.data.ticket.location
      wx.setClipboardData({
        data: `${latitude}, ${longitude}`,
        success: () => {
          wx.showToast({
            title: '坐标已复制',
            icon: 'success'
          })
        }
      })
    },
  
    // 导航到位置
    navigateToLocation() {
      const { latitude, longitude } = this.data.ticket.location
      wx.openLocation({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        scale: 18
      })
    },
  
    cancelTicket() {
      const that = this
      wx.showModal({
        title: '确认取消',
        content: '确定要取消此工单吗？',
        confirmColor: '#FF3B30',
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '处理中' })
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
                  icon: 'success',
                  success() {
                    setTimeout(() => {
                      that.loadTicketDetail()
                    }, 1500)
                  }
                })
              }
            } catch (error) {
              wx.showToast({
                title: '取消失败',
                icon: 'error'
              })
            }
          }
        }
      })
    },
  
    formatTime(dateString) {
        try {
          const date = new Date(dateString)
          const now = new Date()
          const diff = now - date
          
          if (diff < 60000) {
            return '刚刚'
          } else if (diff < 3600000) {
            return Math.floor(diff / 60000) + '分钟前'
          } else if (diff < 86400000) {
            return Math.floor(diff / 3600000) + '小时前'
          } else if (diff < 604800000) {
            return Math.floor(diff / 86400000) + '天前'
          } else {
            return `${date.getMonth() + 1}月${date.getDate()}日`
          }
        } catch (error) {
          console.error('formatTime错误:', error)
          return '未知时间'
        }
    },
    
    formatDetailedTime(dateString) {
        try {
          const date = new Date(dateString)
          const now = new Date()
          const diff = now - date
          
          const year = date.getFullYear()
          const month = date.getMonth() + 1
          const day = date.getDate()
          const hour = date.getHours().toString().padStart(2, '0')
          const minute = date.getMinutes().toString().padStart(2, '0')
          
          if (diff < 86400000) {
            return `${hour}:${minute}`
          } else if (diff < 31536000000) {
            return `${month}月${day}日 ${hour}:${minute}`
          } else {
            return `${year}年${month}月${day}日`
          }
        } catch (error) {
          console.error('formatDetailedTime错误:', error)
          return '未知时间'
        }
    },
    
    // 联系提交者
    contactSubmitter() {
      const { ticket } = this.data
      if (ticket.submitterInfo && ticket.submitterInfo.phone) {
        wx.makePhoneCall({
          phoneNumber: ticket.submitterInfo.phone
        })
      } else {
        wx.showToast({
          title: '暂无联系方式',
          icon: 'none'
        })
      }
    },

    // 页面分享功能
    onShareAppMessage() {
        return {
          title: `工单详情 - ${this.data.ticket.title}`,
          path: `/pages/ticket-detail/ticket-detail?id=${this.data.ticketId}`,
          imageUrl: this.data.ticket.images && this.data.ticket.images.length > 0 ? this.data.ticket.images[0] : ''
        }
    },
  
    // 下拉刷新
    onPullDownRefresh() {
        this.loadTicketDetail().then(() => {
          wx.stopPullDownRefresh()
        }).catch(() => {
          wx.stopPullDownRefresh()
        })
    },
    
    // 上拉加载更多（如有需要）
    onReachBottom() {
      // 如果有分页内容可以在这里加载
    }
})