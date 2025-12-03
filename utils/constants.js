// 工单状态常量
export const TICKET_STATUS = {
    PENDING: { value: 'pending', text: '待审核' },
    REVIEWING: { value: 'reviewing', text: '审核中' },
    PROCESSING: { value: 'processing', text: '处理中' },
    RESOLVED: { value: 'resolved', text: '已解决' },
    CANCELLED: { value: 'cancelled', text: '已取消' }
  }
  
  // 工单类型常量
  export const TICKET_TYPE = {
    VOLUNTEER: { value: 'volunteer', text: '志愿者申请' },
    REPORT: { value: 'report', text: '监督举报' },
    FEEDBACK: { value: 'feedback', text: '意见反馈' }
  }
  
  // 优先级常量
  export const PRIORITY = {
    LOW: { value: 'low', text: '低' },
    MEDIUM: { value: 'medium', text: '中' },
    HIGH: { value: 'high', text: '高' }
  }
  
  // 获取状态文本
  export const getStatusText = (status) => {
    const statusObj = Object.values(TICKET_STATUS).find(s => s.value === status)
    return statusObj ? statusObj.text : '未知状态'
  }
  
  // 获取类型文本
  export const getTypeText = (type) => {
    const typeObj = Object.values(TICKET_TYPE).find(t => t.value === type)
    return typeObj ? typeObj.text : '未知类型'
  }