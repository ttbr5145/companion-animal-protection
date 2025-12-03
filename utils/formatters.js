// 时间格式化
export const formatTime = (time) => {
    if (!time) return '未知时间'
    
    const date = typeof time === 'string' ? new Date(time) : time
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    // 今天内显示时间
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
    
    // 今年内显示月日
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('zh-CN', { 
        month: '2-digit', 
        day: '2-digit' 
      })
    }
    
    // 其他显示年月日
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit' 
    })
  }
  
  // 格式化详细时间
  export const formatFullTime = (time) => {
    if (!time) return '未知时间'
    
    const date = typeof time === 'string' ? new Date(time) : time
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }