// testLegal.js - 简化版本
Page({
    data: {
        testLog: '准备测试...\n',
        isLoading: false
    },

    onLoad() {
        this.addLog('测试页面加载完成');
        // 延迟执行测试，避免初始化冲突
        setTimeout(() => {
            this.testConnection();
        }, 1000);
    },

    // 添加日志
    addLog(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}\n`;
        this.setData({
            testLog: this.data.testLog + logEntry
        });
    },

    // 直接测试云函数连接
    // 在testLegal.js中修改测试函数
    async testConnection() {
        this.setData({ isLoading: true });
        this.addLog('开始详细诊断...');
        
        try {
            const res = await wx.cloud.callFunction({
                name: 'legalSearch',
                data: { 
                    action: 'test',
                    debug: true  // 添加调试模式
                }
            });
            
            this.addLog('云函数响应: ' + JSON.stringify(res, null, 2));
            
            if (res.result.success) {
                this.addLog('✅ API连接测试成功');
                this.addLog('Token信息: ' + JSON.stringify(res.result.token_info));
            } else {
                this.addLog('❌ API连接失败');
                this.addLog('错误代码: ' + res.result.error_code);
                this.addLog('详细错误: ' + res.result.error);
                
                // 提供解决建议
                if (res.result.error.includes('未找到token')) {
                    this.addLog('💡 解决方案: 需要调整token提取逻辑，请检查云函数日志中的响应体格式');
                }
            }
        } catch (error) {
            this.addLog('❌ 云函数调用异常: ' + error.message);
            console.error('详细错误:', error);
        } finally {
            this.setData({ isLoading: false });
        }
    },

    // 清空日志
    clearLog() {
        this.setData({ 
            testLog: '日志已清空\n',
            isLoading: false 
        });
    }
});