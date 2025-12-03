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
      statusText: {
        'pending': '审核中',
        'processing': '处理中',
        'completed': '已完成',
        'cancelled': '已取消'
      }
    },
  
    onLoad() {
      this.loadTickets(true)
    },
  
    onPullDownRefresh() {
      this.setData({
        page: 1,
        tickets: []
      })
      this.loadTickets(true).finally(() => {
        wx.stopPullDownRefresh()
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
      
      if (showLoading) {
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
          const newTickets = res.result.data.tickets.map(ticket => ({
            ...ticket,
            submitTime: ticket.submitTime
          }))
          
          this.setData({
            tickets: this.data.page === 1 ? newTickets : this.data.tickets.concat(newTickets),
            hasMore: res.result.data.hasMore
          })
        } else {
          throw new Error(res.result.message)
        }
      } catch (error) {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        this.setData({ loading: false })
        if (showLoading) {
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
      wx.navigateTo({
        url: `/pages/ticket-detail/ticket-detail?id=${ticketId}`
      })
    },
  
    // 格式化时间
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
      } else if (diff < 604800000) { // 1周内
        return Math.floor(diff / 86400000) + '天前'
      } else {
        return `${date.getMonth() + 1}月${date.getDate()}日`
      }
    }
  })