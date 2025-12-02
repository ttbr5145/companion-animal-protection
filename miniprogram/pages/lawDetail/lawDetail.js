Page({
    data: {
        lawId: '',
        lawDetail: {},
        isLoading: true,
        loadError: null
    },

    onLoad: function(options) {
        const lawId = options.lawId;
        if (!lawId) {
            this.setData({
                loadError: '缺少法规ID参数',
                isLoading: false
            });
            return;
        }
        
        console.log('🔍 详情页接收参数:', { lawId, options });
        this.setData({ lawId: lawId });
        this.loadLawDetail(lawId);
    },

    // 加载法规详情
    loadLawDetail: async function(lawId) {
        this.setData({ isLoading: true });
        
        try {
            const res = await wx.cloud.callFunction({
                name: 'legal-search',
                data: {
                    action: 'detail',
                    law_id: lawId
                }
            });
            
            console.log('📨 详情页API响应:', res);
            
            if (res.result.success) {
                const detailData = res.result.data;
                
                // 关键修复：正确映射字段名
                const lawDetail = {
                    // 基本信息
                    lawId: detailData.rjs8 || lawId,
                    lawName: detailData.lawName || '未知法规',
                    issuingOrgan: detailData.issuingOrgan || '未知机关',
                    filenum: detailData.issuingNo || '无',
                    timeliness: detailData.timeliness || '未知',
                    releaseDate: this.formatDate(detailData.releaseYearMonthDate),
                    implementDate: this.formatDate(detailData.implementYearMonthDate),
                    
                    // 内容处理
                    content: this.processContent(detailData.lawSourceContent),
                    rawContent: detailData.lawSourceContent, // 保留原始内容用于复制
                    
                    // 其他信息
                    enclosure: detailData.enclosure || []
                };
                
                this.setData({
                    lawDetail: lawDetail,
                    isLoading: false
                });
                
                console.log('✅ 详情数据处理完成:', lawDetail);
                
            } else {
                throw new Error(res.result.error || '获取详情失败');
            }
            
        } catch (error) {
            console.error('❌ 加载详情失败:', error);
            this.setData({
                isLoading: false,
                loadError: this.parseErrorMessage(error.message)
            });
        }
    },
    
    // 新增：内容处理函数
    processContent: function(htmlContent) {
        if (!htmlContent) return '暂无内容';
        
        // 方法1：去除HTML标签，保留纯文本
        let plainText = htmlContent
            .replace(/<[^>]+>/g, '') // 移除HTML标签
            .replace(/\r\n/g, '\n')   // 统一换行符
            .replace(/\s+/g, ' ')     // 合并多余空格
            .replace(/&nbsp;/g, ' ')  // 替换空格实体
            .trim();
        
        // 方法2：或者使用简单的HTML标签替换为小程序可识别的格式
        let formattedText = htmlContent
            .replace(/<p[^>]*>/g, '\n')  // p标签换行
            .replace(/<\/p>/g, '\n')
            .replace(/<br\s*\/?>/g, '\n') // br标签换行
            .replace(/<strong>/g, '【')   // strong标签
            .replace(/<\/strong>/g, '】')
            .replace(/<[^>]+>/g, '')     // 移除其他标签
            .replace(/\n\s*\n/g, '\n\n') // 合并空行
            .trim();
        
        return formattedText || plainText;
    },

    // 解析错误信息，提供友好提示
    parseErrorMessage: function(errorMsg) {
        if (errorMsg.includes('rjs8')) {
            return '接口参数错误，请联系技术支持';
        } else if (errorMsg.includes('400')) {
            return '请求参数不正确';
        } else if (errorMsg.includes('401')) {
            return '认证失败，请重新登录';
        } else if (errorMsg.includes('404')) {
            return '法规不存在或已被删除';
        } else if (errorMsg.includes('500')) {
            return '服务器繁忙，请稍后重试';
        } else {
            return errorMsg;
        }
    },

    // 重试加载
    onRetry: function() {
        this.loadLawDetail(this.data.lawId);
    },

    // 返回
    onGoBack: function() {
        wx.navigateBack();
    },

    // 复制全文
    onCopyAll: function() {
        const content = this.data.lawDetail.content;
        if (!content || content === '暂无内容') {
            wx.showToast({ title: '无内容可复制', icon: 'none' });
            return;
        }
        
        wx.setClipboardData({
            data: content,
            success: () => {
                wx.showToast({ title: '全文已复制', icon: 'success' });
            }
        });
    },

    // 分享
    onShare: function() {
        const lawDetail = this.data.lawDetail;
        wx.showShareMenu({
            withShareTicket: true
        });
    },

    // 日期格式化
    formatDate: function(dateStr) {
        if (!dateStr) return '未知';
        if (dateStr.length === 8) {
            return `${dateStr.substring(0,4)}年${dateStr.substring(4,6)}月${dateStr.substring(6,8)}日`;
        }
        return dateStr;
    },

    // 分享功能
    onShareAppMessage: function() {
        const lawDetail = this.data.lawDetail;
        return {
            title: lawDetail.lawName || '法规详情',
            path: `/pages/lawDetail/lawDetail?lawId=${this.data.lawId}`,
            imageUrl: '/images/share-law.png' // 可配置分享图片
        };
    },

    // 下拉刷新
    onPullDownRefresh: function() {
        this.loadLawDetail(this.data.lawId);
        wx.stopPullDownRefresh();
    }
});