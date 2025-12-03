const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  const { page = 1, pageSize = 10, status = '', type = '' } = event
  
  try {
    let query = cloud.database().collection('tickets')
    
    // 添加筛选条件
    if (status) {
      query = query.where({ status })
    }
    
    if (type) {
      query = query.where({ type })
    }
    
    const res = await query
      .orderBy('submitTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取总数
    const countRes = await query.count()
    
    return {
      code: 200,
      data: {
        tickets: res.data,
        total: countRes.total,
        hasMore: (page * pageSize) < countRes.total
      }
    }
  } catch (error) {
    return {
      code: 500,
      message: '获取工单列表失败：' + error.message
    }
  }
}