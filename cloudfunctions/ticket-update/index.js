// 功能正常，权限控制完善
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  const { ticketId, status } = event
  const { OPENID } = cloud.getWXContext()
  
  try {
    // 验证权限 - 只能操作自己的工单
    const ticketRes = await cloud.database().collection('tickets')
      .doc(ticketId)
      .get()
    
    if (ticketRes.data._openid !== OPENID) {
      return {
        code: 403,
        message: '无权操作此工单'
      }
    }
    
    const updateData = {
      status,
      updateTime: new Date()
    }
    
    await cloud.database().collection('tickets')
      .doc(ticketId)
      .update({
        data: updateData
      })
    
    return {
      code: 200,
      message: '工单状态更新成功'
    }
  } catch (error) {
    return {
      code: 500,
      message: '工单状态更新失败：' + error.message
    }
  }
}