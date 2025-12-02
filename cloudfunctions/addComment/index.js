// cloudfunctions/addComment/index.js
const cloud = require('wx-server-sdk')  // 这里要改为 wx-server-sdk
cloud.init({
  env: 'cloud1-5g88rmqa7bde7156'  // 环境ID在这里指定
})

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const wxContext = cloud.getWXContext()
  
  try {
    // 事务操作：添加评论并更新帖子评论数
    const result = await db.runTransaction(async transaction => {
      // 1. 添加评论
      const commentRes = await transaction.collection('comments').add({
        data: {
          ...event.commentData,
          _openid: wxContext.OPENID
        }
      })
      
      // 2. 更新帖子评论数
      await transaction.collection('posts').doc(event.postId).update({
        data: {
          commentCount: _.inc(1)
        }
      })
      
      return { commentId: commentRes._id }
    })
    
    return { success: true, data: result }
  } catch (error) {
    console.error('添加评论失败:', error)
    return { success: false, error: error.message }
  }
}