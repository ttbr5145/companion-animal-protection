// cloudfunctions/getComments/index.js
const cloud = require('wx-server-sdk')  // 这里要改为 wx-server-sdk
cloud.init({
  env: 'cloud1-5g88rmqa7bde7156'  // 环境ID在这里指定
})

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const wxContext = cloud.getWXContext()
  
  try {
    const { postId, sortBy, page, pageSize } = event
    
    let query = db.collection('comments')
      .where({
        postId: postId,
        parentId: _.eq(null), // 只获取顶级评论
        status: 'published'
      })
    
    // 排序
    if (sortBy === 'time') {
      query = query.orderBy('createdAt', 'desc')
    } else {
      query = query.orderBy('likeCount', 'desc').orderBy('createdAt', 'desc')
    }
    
    // 分页
    const res = await query
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 处理点赞状态
    const comments = res.data.map(comment => ({
      ...comment,
      liked: comment.likes && comment.likes.includes(wxContext.OPENID)
    }))
    
    return { success: true, data: comments }
  } catch (error) {
    console.error('获取评论失败:', error)
    return { success: false, error: error.message }
  }
}