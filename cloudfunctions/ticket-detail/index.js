// 功能正常，但可以优化
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  const { ticketId } = event
  
  try {
    const res = await cloud.database().collection('tickets')
      .doc(ticketId)
      .get()
    
    if (!res.data) {
      return {
        code: 404,
        message: '工单不存在'
      }
    }
    
    return {
      code: 200,
      data: res.data
    }
  } catch (error) {
    return {
      code: 500,
      message: '获取工单详情失败：' + error.message
    }
  }
}