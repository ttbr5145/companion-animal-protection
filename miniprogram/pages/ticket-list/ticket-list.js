// pages/ticket-list/ticket-list.js
Page({
    data: {
      tickets: [],
      statusIndex: 0,
      typeIndex: 0,
      statusOptions: ['全部状态', '审核中', '处理中', '已完成', '已取消'],
      typeOptions: ['全部类型', '宠物伤人', '宠物虐待', '宠物遗弃', '其他'],
      page: 1,
      pageSize: 10,
      hasMore: false,
      loading: false,
      isRefreshing: false,
      statusText: {
        'pending': '审核中',
        'processing': '处理中',
        'completed': '已完成',
        'cancelled': '已取消'
      },
      statusColors: {
        'pending': '#FF9500',
        'processing': '#007AFF',
        'completed': '#34C759',
        'cancelled': '#8E8E93'
      }
    },

    onLoad() {
      this.loadTickets(true)
    },

    onShow() {
      // 如果是从工单详情返回，重新加载数据
      this.loadTickets(false)
    },

    onPullDownRefresh() {
      this.setData({
        page: 1,
        tickets: [],
        isRefreshing: true
      })
      this.loadTickets(true).finally(() => {
        wx.stopPullDownRefresh()
        setTimeout(() => {
          this.setData({ isRefreshing: false })
        }, 300)
      })
    },

    onReachBottom() {
      this.loadMore()
    },

    // 跳转到提交页面
    toSubmit() {
      wx.navigateTo({
        url: '/pages/ticket-submit/ticket-submit'
      })
    },

    // 状态筛选变化
    statusChange(e) {
      const index = e.detail.value
      this.setData({
        statusIndex: index,
        page: 1,
        tickets: []
      })
      this.loadTickets(true)
    },

    // 类型筛选变化
    typeChange(e) {
      const index = e.detail.value
      this.setData({
        typeIndex: index,
        page: 1,
        tickets: []
      })
      this.loadTickets(true)
    },

    // 加载工单列表
    async loadTickets(showLoading = false) {
      if (this.data.loading) return
      
      this.setData({ loading: true })
      
      if (showLoading && !this.data.isRefreshing) {
        wx.showLoading({ title: '加载中' })
      }
      
      try {
        const status = this.data.statusIndex === 0 ? '' : 
            ['pending', 'processing', 'completed', 'cancelled'][this.data.statusIndex - 1]
        
        const type = this.data.typeIndex === 0 ? '' : 
            ['宠物伤人', '宠物虐待', '宠物遗弃', '其他'][this.data.typeIndex - 1]
        
        const res = await wx.cloud.callFunction({
          name: 'ticket-list',
          data: {
            status,
            type,
            page: this.data.page,
            pageSize: this.data.pageSize
          }
        })

        if (res.result.code === 200) {
          const newTickets = res.result.data.tickets.map(ticket => {
            const submitTime = ticket.submitTime
            return {
              ...ticket,
              relativeSubmitTime: this.formatTime(submitTime),
              formattedSubmitTime: this.formatDetailedTime(submitTime),
              statusColor: this.data.statusColors[ticket.status] || '#8E8E93'
            }
          })
          
          this.setData({
            tickets: this.data.page === 1 ? newTickets : [...this.data.tickets, ...newTickets],
            hasMore: res.result.data.hasMore
          })
        } else {
          throw new Error(res.result.message)
        }
      } catch (error) {
        console.error('加载工单列表失败:', error)
        wx.showToast({
          title: error.message || '加载失败',
          icon: 'error',
          duration: 2000
        })
      } finally {
        this.setData({ loading: false })
        if (showLoading && !this.data.isRefreshing) {
          wx.hideLoading()
        }
      }
    },

    // 加载更多
    loadMore() {
      if (!this.data.hasMore || this.data.loading) return
      
      this.setData({
        page: this.data.page + 1
      })
      this.loadTickets()
    },

    // 查看详情
    viewDetail(e) {
      const ticketId = e.currentTarget.dataset.id
      // 添加点击动画
      const card = e.currentTarget
      wx.createSelectorQuery()
        .select(`#card-${ticketId}`)
        .boundingClientRect()
        .exec((rect) => {
          if (rect[0]) {
            wx.navigateTo({
              url: `/pages/ticket-detail/ticket-detail?id=${ticketId}`,
              success: () => {
                // 可以在这里添加页面跳转动画
              }
            })
          }
        })
    },

    // 格式化时间为相对时间
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
        return '未知时间'
      }
    },
    
    // 格式化详细时间
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
        return '未知时间'
      }
    },
    
    // 刷新列表
    refreshList() {
      this.setData({
        page: 1,
        tickets: []
      })
      this.loadTickets(true)
    }
})