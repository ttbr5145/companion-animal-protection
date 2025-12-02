const cloud = require('wx-server-sdk');
const rp = require('request-promise');
const config = require('./config.json');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const { LEGAL_STAR_CONFIG } = config;

// 全局token缓存
let tokenCache = {
  token: null,
  expireTime: 0
};

/**
 * 获取法律之星API访问令牌
 */
async function getAccessToken() {
    const now = Date.now();
    
    if (tokenCache.token && now < tokenCache.expireTime - 300000) {
        return tokenCache.token;
    }
    
    try {
        const authData = {
            appid: LEGAL_STAR_CONFIG.APP_ID,
            appsecret: LEGAL_STAR_CONFIG.APP_SECRET
        };
        
        console.log('🔐 发送认证请求...');
        
        const options = {
            method: 'POST',
            uri: `${LEGAL_STAR_CONFIG.BASE_URL}${LEGAL_STAR_CONFIG.ENDPOINTS.GET_TOKEN}`,
            headers: {
                'Content-Type': 'application/json'
            },
            body: authData,
            json: true,
            timeout: LEGAL_STAR_CONFIG.TIMEOUT,
            resolveWithFullResponse: true
        };
        
        const response = await rp(options);
        
        console.log('📨 认证响应状态:', response.statusCode);
        
        if (response.statusCode === 200) {
            const result = response.body;
            
            // 修复：兼容字符串和数字状态码
            const statusCode = parseInt(result.code) || result.code;
            if (statusCode === 200 || statusCode === "200") {
                let token = result.data?.Authorization;
                
                if (!token) {
                    token = result.Authorization || result.data?.token || result.token;
                }
                
                if (token) {
                    // 清理token
                    token = token.replace(/^Bearer\s+/i, '');
                    
                    console.log('✅ Token提取成功，长度:', token.length);
                    
                    tokenCache = {
                        token: token,
                        expireTime: now + 7200000
                    };
                    
                    return tokenCache.token;
                } else {
                    throw new Error('认证成功但未找到有效的Authorization令牌');
                }
            } else {
                throw new Error(`认证失败: ${result.msg || '未知错误'} (代码: ${result.code})`);
            }
        } else {
            throw new Error(`HTTP错误: ${response.statusCode}`);
        }
    } catch (error) {
        console.error('❌ 获取Token失败:', error.message);
        tokenCache = { token: null, expireTime: 0 };
        throw error;
    }
}

/**
 * 统一检查API响应状态
 */
function checkApiResponse(result) {
    // 兼容数字和字符串状态码
    const statusCode = parseInt(result.code) || result.code;
    
    if (statusCode === 200 || statusCode === "200") {
        return { isValid: true, message: result.msg || '成功' };
    } else {
        return { 
            isValid: false, 
            message: result.msg || `API错误 (代码: ${result.code})` 
        };
    }
}

/**
 * 执行向量查询
 */
async function vectorQuery(query, filters = {}) {
    try {
        const token = await getAccessToken();
        
        // 构建查询参数
        const queryParams = {
            vector: query,
            rows: filters.rows || filters.top_k || 10
        };
        
        // 添加筛选条件
        if (filters.area) queryParams.areaFacet = filters.area;
        if (filters.timeliness) queryParams.lawstatexlsFacet = filters.timeliness;
        if (filters.effect_level) queryParams.xls = filters.effect_level;
        // ...其他筛选条件
        
        // 构建URL查询字符串
        const queryString = Object.keys(queryParams)
            .filter(key => queryParams[key] !== undefined && queryParams[key] !== '')
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
            .join('&');
        
        const url = `${LEGAL_STAR_CONFIG.BASE_URL}${LEGAL_STAR_CONFIG.ENDPOINTS.VECTOR_QUERY}?${queryString}`;
        
        const options = {
            method: 'GET',
            uri: url,
            headers: {
                'Authorization': token,  // 成功方案：直接使用token
                'Content-Type': 'application/json'
            },
            json: true,
            timeout: LEGAL_STAR_CONFIG.TIMEOUT
        };
        
        const result = await rp(options);
        const statusCheck = checkApiResponse(result);
        
        if (!statusCheck.isValid) {
            throw new Error(statusCheck.message);
        }
        
        return result;
        
    } catch (error) {
        console.error('向量查询失败:', error.message);
        
        // 处理401错误：清除token缓存
        if (error.statusCode === 401) {
            tokenCache = { token: null, expireTime: 0 };
            throw new Error('Token已过期，请重试');
        }
        
        throw error;
    }
}

/**
 * 获取法规详情
 */
/**
 * 获取法规详情 - 修正版
 */
async function getLawDetail(lawId) {
    try {
        const token = await getAccessToken();
        
        // 关键修复：使用正确的参数名 rjs8 而不是 lawId
        const url = `${LEGAL_STAR_CONFIG.BASE_URL}${LEGAL_STAR_CONFIG.ENDPOINTS.LAW_DETAIL}?rjs8=${lawId}`;
        
        console.log('🔍 详情请求URL:', url.replace(token, '***'));
        
        const options = {
            method: 'GET',
            uri: url,
            headers: {
                'Authorization': token,  // 直接使用token，不加Bearer
                'Content-Type': 'application/json',
                'User-Agent': 'LegalSearch-Client/1.0.0'
            },
            json: true,
            timeout: LEGAL_STAR_CONFIG.TIMEOUT,
            resolveWithFullResponse: true
        };
        
        const response = await rp(options);
        
        console.log('📊 详情API响应状态:', response.statusCode);
        console.log('📦 详情API响应体:', JSON.stringify(response.body, null, 2));
        
        if (response.statusCode === 200) {
            return response.body;
        } else {
            throw new Error(`HTTP错误: ${response.statusCode} - ${JSON.stringify(response.body)}`);
        }
        
    } catch (error) {
        console.error('❌ 获取法规详情失败:', {
            message: error.message,
            statusCode: error.statusCode,
            error: error.error
        });
        
        if (error.statusCode === 400) {
            throw new Error(`参数错误: 请检查lawId格式是否正确`);
        } else if (error.statusCode === 401) {
            // Token过期，清除缓存
            tokenCache = { token: null, expireTime: 0 };
            throw new Error('认证已过期，请重新登录');
        } else {
            throw error;
        }
    }
}

/**
 * 测试API连接 - 修复版（避免无限重试）
 */
async function testConnection() {
    try {
        console.log('开始详细连接测试...');
        
        // 1. 测试网络连通性
        try {
            await rp({
                method: 'HEAD',
                uri: LEGAL_STAR_CONFIG.BASE_URL,
                timeout: 5000
            });
            console.log('✅ 网络连通性正常');
        } catch (error) {
            return {
                success: false,
                error: `网络连接失败: ${error.message}`,
                error_code: 'NETWORK_ERROR'
            };
        }
        
        // 2. 获取token（只获取一次，不重试）
        const token = await getAccessToken();
        
        if (!token) {
            return {
                success: false,
                error: 'Token获取失败',
                error_code: 'TOKEN_EMPTY'
            };
        }
        
        console.log('✅ Token获取成功，长度:', token.length);
        
        // 3. 测试API接口（只测试一次）
        try {
            const testResult = await vectorQuery('测试', { rows: 1 });
            
            if (testResult.code == 200) {
                return {
                    success: true,
                    message: 'API连接测试成功',
                    token_info: {
                        length: token.length,
                        valid: true
                    },
                    api_response: {
                        code: testResult.code,
                        msg: testResult.msg,
                        data_count: testResult.data ? testResult.data.length : 0
                    }
                };
            } else {
                return {
                    success: false,
                    error: `API返回错误: ${testResult.msg} (代码: ${testResult.code})`,
                    error_code: `API_${testResult.code}`,
                    api_response: testResult
                };
            }
        } catch (apiError) {
            return {
                success: false,
                error: `API调用失败: ${apiError.message}`,
                error_code: 'API_CALL_FAILED',
                details: 'Token可能使用方式不正确'
            };
        }
        
    } catch (error) {
        console.error('连接测试失败:', error.message);
        
        return {
            success: false,
            error: error.message,
            error_code: error.statusCode ? `HTTP_${error.statusCode}` : 'UNKNOWN_ERROR'
        };
    }
}

// 云函数主入口
exports.main = async (event, context) => {
  const { action, ...params } = event;
  
  console.log('收到云函数调用:', { action, params: { ...params, query: params.query ? params.query.substring(0, 50) + '...' : null } });
  
  try {
    switch (action) {
        // 在云函数主入口中修改搜索处理部分
        // 在云函数的search case中，确保返回格式一致
        case 'search':
            try {
                const searchResult = await vectorQuery(params.query, {
                    top_k: params.top_k || 10
                });
                
                console.log('搜索API响应:', {
                    code: searchResult.code,
                    msg: searchResult.msg,
                    data_length: searchResult.data ? searchResult.data.length : 0
                });
                
                if (searchResult.code == 200) {
                    return {
                        success: true,
                        message: searchResult.msg || '查询成功',
                        data: {
                            result: searchResult.data || [], // 确保数据结构一致
                            total: searchResult.total || (searchResult.data ? searchResult.data.length : 0)
                        }
                    };
                } else {
                    return {
                        success: false,
                        error: searchResult.msg || '查询失败',
                        error_code: `API_${searchResult.code}`
                    };
                }
                
            } catch (error) {
                console.error('搜索处理异常:', error);
                return {
                    success: false,
                    error: error.message,
                    error_code: 'SEARCH_ERROR'
                };
            }
        // 在legal-search云函数中确保有详情接口
        case 'detail':
            try {
                const detailResult = await getLawDetail(params.law_id);
                
                if (detailResult.code == 200) {
                    return {
                        success: true,
                        data: detailResult.data
                    };
                } else {
                    return {
                        success: false,
                        error: detailResult.msg || '获取详情失败',
                        error_code: `API_${detailResult.code}`
                    };
                }
            } catch (error) {
                console.error('详情接口错误:', error);
                return {
                    success: false,
                    error: error.message,
                    error_code: 'DETAIL_ERROR'
                };
            }
            
        case 'test':
            // 测试连接
            return await testConnection();
            
        case 'debug':
            // 调试模式，返回详细日志
            const token = await getAccessToken();
            return {
            success: true,
            token_info: {
                valid: !!token,
                length: token ? token.length : 0,
                cache_valid: tokenCache.token ? (Date.now() < tokenCache.expireTime) : false
            },
            config: {
                base_url: LEGAL_STAR_CONFIG.BASE_URL,
                endpoints: LEGAL_STAR_CONFIG.ENDPOINTS
            }
            };
            
        default:
            return {
            success: false,
            error: `未知操作: ${action}`,
            supported_actions: ['search', 'detail', 'test', 'debug']
            };
    }
  } catch (error) {
    console.error('法律之星API调用错误:', error);
    
    return {
      success: false,
      error: error.message,
      error_code: error.statusCode ? `HTTP_${error.statusCode}` : 'API_CALL_FAILED',
      timestamp: new Date().toISOString()
    };
  }
};