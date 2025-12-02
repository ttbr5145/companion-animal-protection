// cloudfunctions/likeComment/index.js
const cloud = require('wx-server-sdk')  // 这里要改为 wx-server-sdk
cloud.init({
  env: 'cloud1-5g88rmqa7bde7156'  // 环境ID在这里指定
})

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const wxContext = cloud.getWXContext()
  
  try {
    const { commentId, isLiked } = event
    
    const result = await db.collection('comments').doc(commentId).update({
      data: {
        likes: isLiked ? _.pull(wxContext.OPENID) : _.push(wxContext.OPENID),
        likeCount: _.inc(isLiked ? -1 : 1)
      }
    })
    
    return { success: true, data: result }
  } catch (error) {
    console.error('点赞操作失败:', error)
    return { success: false, error: error.message }
  }
}