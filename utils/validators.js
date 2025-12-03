// 表单验证函数
export const validateTicketForm = (formData) => {
    const errors = {}
    
    // 标题验证
    if (!formData.title || formData.title.trim().length === 0) {
      errors.title = '标题不能为空'
    } else if (formData.title.length > 50) {
      errors.title = '标题不能超过50个字符'
    }
    
    // 内容验证
    if (!formData.content || formData.content.trim().length === 0) {
      errors.content = '内容不能为空'
    } else if (formData.content.length > 500) {
      errors.content = '内容不能超过500个字符'
    }
    
    // 联系方式验证
    if (!formData.contactInfo || formData.contactInfo.trim().length === 0) {
      errors.contactInfo = '联系方式不能为空'
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }
  
  // 邮箱验证
  export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  // 手机号验证
  export const validatePhone = (phone) => {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
  }