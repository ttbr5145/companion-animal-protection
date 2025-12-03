const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  // 添加 title 和 contactInfo 字段的解构
  const { title, type, description, images = [], location = null, contactInfo } = event
  const { OPENID } = cloud.getWXContext()
  
  try {
    // 获取用户信息
    const userRes = await cloud.database().collection('users')
      .where({ _openid: OPENID })
      .get()
    const userInfo = userRes.data[0] || {}
    
    // 构建完整的工单数据
    const ticketData = {
      _openid: OPENID,
      submitterInfo: {
        nickName: userInfo.nickName || '微信用户',
        avatarUrl: userInfo.avatarUrl || '',
        contactInfo: contactInfo || userInfo.nickName || '匿名用户'
      },
      title: title || '无标题', // 确保标题不为空
      submitTime: new Date(),
      type: type || '其他',
      description: description || '',
      images: images || [],
      location: location || null,
      status: 'pending',
      adminReply: '',
      updateTime: new Date()
    }
    
    // 验证必要字段
    if (!title || !description) {
      return {
        code: 400,
        message: '标题和描述不能为空'
      }
    }
    
    const res = await cloud.database().collection('tickets').add({
      data: ticketData
    })
    
    return {
      code: 200,
      message: '工单提交成功',
      data: {
        _id: res._id
      }
    }
  } catch (error) {
    console.error('工单提交失败:', error)
    return {
      code: 500,
      message: '工单提交失败：' + error.message
    }
  }
}