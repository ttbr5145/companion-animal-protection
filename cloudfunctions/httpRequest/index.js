// cloudfunctions/httpRequest/index.js
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event) => {
  const { url, method = 'GET', headers = {}, data = null } = event
  
  try {
    const result = await cloud.callFunction({
      name: 'httpRequest',
      data: {
        url,
        method,
        headers,
        data
      }
    })
    
    return {
      success: true,
      data: result.result
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}