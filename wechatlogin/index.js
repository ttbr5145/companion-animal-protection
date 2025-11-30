const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { userInfo } = event
  const wxContext = cloud.getWXContext()

  try {
    console.log('云函数开始执行，event:', event)
    
    // 获取 openid
    const openid = wxContext.OPENID
    const appid = wxContext.APPID

    if (!openid) {
      return {
        success: false,
        message: '获取用户标识失败'
      }
    }

    console.log('获取到openid:', openid)

    // 检查用户是否已存在
    let userQuery
    try {
      userQuery = await db.collection('users')
        .where({
          _openid: openid
        })
        .get()
      console.log('用户查询结果:', userQuery)
    } catch (dbError) {
      console.error('数据库查询错误:', dbError)
      return {
        success: false,
        message: '数据库服务异常'
      }
    }

    let userData = {
      _openid: openid,
      lastLoginTime: new Date(),
      userInfo: userInfo || null,
      appid: appid
    }

    let resultData = {}

    if (userQuery.data.length === 0) {
      // 新用户，创建记录
      console.log('创建新用户')
      userData.createTime = new Date()
      try {
        const addResult = await db.collection('users').add({
          data: userData
        })
        userData._id = addResult._id
        userData.isNewUser = true
        resultData = {
          success: true,
          openid: openid,
          userInfo: userData,
          isNewUser: true
        }
      } catch (addError) {
        console.error('添加用户错误:', addError)
        return {
          success: false,
          message: '创建用户失败'
        }
      }
    } else {
      // 老用户，更新最后登录时间
      console.log('更新老用户')
      userData._id = userQuery.data[0]._id
      userData.isNewUser = false
      try {
        await db.collection('users').doc(userData._id).update({
          data: {
            lastLoginTime: userData.lastLoginTime,
            userInfo: userInfo || userQuery.data[0].userInfo
          }
        })
        resultData = {
          success: true,
          openid: openid,
          userInfo: { ...userQuery.data[0], ...userData },
          isNewUser: false
        }
      } catch (updateError) {
        console.error('更新用户错误:', updateError)
        return {
          success: false,
          message: '更新用户信息失败'
        }
      }
    }

    console.log('云函数执行成功，返回:', resultData)
    return resultData

  } catch (error) {
    console.error('登录云函数错误:', error)
    return {
      success: false,
      message: '登录服务异常: ' + error.message
    }
  }
}