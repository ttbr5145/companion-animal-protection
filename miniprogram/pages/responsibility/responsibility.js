Page({
    data: {
        query: '',
        searchResults: [],
        isLoading: false,
        hasSearched: false
    },

    onLoad: function() {
        console.log('搜索页面加载完成');
    },

    onInput: function(e) {
        this.setData({ query: e.detail.value });
    },

    onSearch: async function() {
        if (!this.data.query.trim()) {
            wx.showToast({ title: '请输入搜索内容', icon: 'none' });
            return;
        }
        
        this.setData({ 
            isLoading: true,
            hasSearched: true
        });
        
        try {
            const res = await wx.cloud.callFunction({
                name: 'legal-search',
                data: {
                    action: 'search',
                    query: this.data.query,
                    top_k: 100
                }
            });
            
            console.log('🔍 完整API响应:', JSON.stringify(res, null, 2));
            
            if (res.result.success) {
                // 关键修复：正确解析嵌套数据结构
                const resultData = res.result.data;
                let searchResults = [];
                
                console.log('📊 数据结构分析:', {
                    has_data: !!resultData,
                    data_keys: resultData ? Object.keys(resultData) : '无数据',
                    has_result: !!resultData?.result,
                    result_type: typeof resultData?.result
                });
                
                // 修复：正确处理嵌套的result结构
                if (resultData && resultData.result) {
                    const actualData = resultData.result;
                    
                    // 检查是否是数组
                    if (Array.isArray(actualData)) {
                        console.log('✅ 直接获取到数组，长度:', actualData.length);
                        searchResults = actualData.map((item, index) => this.formatLawItem(item, index));
                    } 
                    // 处理双重嵌套的情况（result.result）
                    else if (actualData.result && Array.isArray(actualData.result)) {
                        console.log('🔄 处理双重嵌套结构');
                        searchResults = actualData.result.map((item, index) => this.formatLawItem(item, index));
                    }
                    // 处理对象格式
                    else if (typeof actualData === 'object') {
                        console.log('📦 处理对象结构');
                        // 如果是单条结果，包装成数组
                        searchResults = [this.formatLawItem(actualData, 0)];
                    }
                }
                
                console.log('📈 处理后的搜索结果:', searchResults);
                
                this.setData({
                    searchResults: searchResults,
                    isLoading: false
                });
                
                if (searchResults.length > 0) {
                    wx.showToast({ 
                        title: `找到${searchResults.length}条相关法规`, 
                        icon: 'success',
                        duration: 2000
                    });
                } else {
                    wx.showToast({ 
                        title: '未找到相关法规', 
                        icon: 'none',
                        duration: 2000
                    });
                }
            } else {
                throw new Error(res.result.error || '搜索失败');
            }
            
        } catch (error) {
            console.error('❌ 搜索异常:', error);
            wx.showToast({
                title: '搜索失败: ' + error.message,
                icon: 'none',
                duration: 3000
            });
            this.setData({ 
                isLoading: false,
                searchResults: []
            });
        }
    },
    
    // 增强的数据格式化函数
    formatLawItem: function(item, index) {
        if (!item) return null;
        
        return {
            lawId: item.lawId || item.id || `item_${index}`,
            lawName: item.lawName || item.title || '未知法规',
            content: this.processContent(item.content || ''),
            issuingOrgan: item.issuingOrgan || item.publishOrg || '未知机关',
            timeliness: item.timeliness || item.lawState || '未知',
            score: item.score || 0,
            scorePercent: ((item.score || 0) * 100).toFixed(1),
            releaseDate: this.formatDate(item.releaseYearMonthDate),
            index: index + 1
        };
    },
    
    // 内容处理函数
    processContent: function(content) {
        if (!content) return '暂无内容';
        
        // 去除HTML标签，保留纯文本
        let plainText = content
            .replace(/<[^>]+>/g, '')
            .replace(/\r\n/g, '\n')
            .replace(/\s+/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .trim();
        
        // 截断过长的内容
        if (plainText.length > 150) {
            plainText = plainText.substring(0, 150) + '...';
        }
        
        return plainText;
    },

    // 快捷搜索
    quickSearch: function(e) {
        const query = e.currentTarget.dataset.query;
        this.setData({ query: query });
        this.onSearch();
    },

    // 查看详情
    onViewDetail: function(e) {
        const lawId = e.currentTarget.dataset.lawid;
        if (!lawId) {
            wx.showToast({ title: '法规ID无效', icon: 'none' });
            return;
        }
        
        // 添加点击反馈
        wx.vibrateShort({ type: 'light' });
        
        wx.navigateTo({
            url: `/pages/lawDetail/lawDetail?lawId=${lawId}`
        });
    },

    // 清空搜索
    clearSearch: function() {
        this.setData({
            query: '',
            searchResults: [],
            hasSearched: false
        });
    },

    // 格式化法规项
    formatLawItem: function(item, index) {
        return {
            lawId: item.lawId,
            lawName: item.lawName || '未知法规',
            content: this.truncateContent(item.content || ''),
            issuingOrgan: item.issuingOrgan || '未知机关',
            timeliness: item.timeliness || '未知',
            score: item.score || 0,
            scorePercent: ((item.score || 0) * 100).toFixed(1),
            releaseDate: this.formatDate(item.releaseYearMonthDate),
            index: index
        };
    },

    // 内容截断
    truncateContent: function(content) {
        if (!content) return '暂无内容';
        if (content.length > 150) {
            return content.substring(0, 150) + '...';
        }
        return content;
    },

    // 日期格式化
    formatDate: function(dateStr) {
        if (!dateStr) return '未知';
        if (dateStr.length === 8) {
            return `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
        }
        return dateStr;
    },

    // 下拉刷新
    onPullDownRefresh: function() {
        if (this.data.query) {
            this.onSearch();
        }
        wx.stopPullDownRefresh();
    },

    // 分享功能
    onShareAppMessage: function() {
        return {
            title: '法律智能检索 - 专业法律查询工具',
            path: '/pages/responsibility/responsibility',
            imageUrl: '/images/share-law.png'
        };
    }
});