const cloud = require('wx-server-sdk');
cloud.init();

exports.main = async (event) => {
  try {
    // 测试连接
    const testResult = await cloud.callFunction({
      name: 'legalSearch',
      data: {
        action: 'test'
      }
    });
    
    if (testResult.result.success) {
      // 测试搜索
      const searchResult = await cloud.callFunction({
        name: 'legalSearch', 
        data: {
          action: 'search',
          query: '劳动合同解除',
          top_k: 3
        }
      });
      
      return {
        connection: '成功',
        search_test: searchResult.result.success ? '成功' : '失败',
        search_data: searchResult.result.data || [],
        error: searchResult.result.error
      };
    } else {
      return {
        connection: '失败', 
        error: testResult.result.error
      };
    }
  } catch (error) {
    return {
      connection: '异常',
      error: error.message
    };
  }
};