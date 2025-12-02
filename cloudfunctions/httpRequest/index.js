const cloud = require('wx-server-sdk');
const rp = require('request-promise');

cloud.init();

/**
 * 通用的HTTP请求云函数
 * 用于支持其他云函数发起HTTP请求
 */
exports.main = async (event) => {
  const {
    url,
    method = 'GET',
    headers = {},
    data = {},
    timeout = 10000
  } = event;
  
  try {
    const options = {
      method: method,
      uri: url,
      headers: headers,
      json: true,
      timeout: timeout
    };
    
    // 根据请求方法设置数据
    if (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT') {
      options.body = data;
    } else {
      options.qs = data;
    }
    
    const result = await rp(options);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('HTTP请求失败:', error);
    return {
      success: false,
      error: error.message,
      error_code: 'HTTP_REQUEST_FAILED'
    };
  }
};