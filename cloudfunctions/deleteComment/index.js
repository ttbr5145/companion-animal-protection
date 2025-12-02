// cloudfunctions/deleteComment/index.js
const cloud = require('wx-server-sdk')  // 这里要改为 wx-server-sdk
cloud.init({
  env: 'cloud1-5g88rmqa7bde7156'  // 环境ID在这里指定
})

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  
  try {
    const { commentId, postId } = event
    
    // 事务操作：软删除评论并更新帖子评论数
    const result = await db.runTransaction(async transaction => {
      // 1. 软删除评论
      await transaction.collection('comments').doc(commentId).update({
        data: { status: 'deleted' }
      })
      
      // 2. 更新帖子评论数
      await transaction.collection('posts').doc(postId).update({
        data: { commentCount: _.inc(-1) }
      })
      
      return { success: true }
    })
    
    return result
  } catch (error) {
    console.error('删除评论失败:', error)
    return { success: false, error: error.message }
  }
}