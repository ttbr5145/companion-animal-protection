// pages/postDetail/postDetail.js
Page({
    data: {
        // 帖子详情数据
        post: null,
        isLoading: true,
        
        // 评论数据
        comments: [],
        commentText: '',
        commentImages: [],
        sortBy: 'time', // time: 时间, hot: 热度
        currentPage: 0,
        pageSize: 10,
        hasMoreComments: true,
        isLoadingComments: false,
        
        // UI状态
        isInputFocus: false,
        showImagePanel: false,
        replyingTo: null, // 回复的评论
        showStatusModal: false,
        
        // 用户信息
        userOpenid: '',
        isAuthor: false
    },

    onLoad: function(options) {
        this.setData({ 
            postId: options.id,
            userOpenid: getApp().globalData.openid
        });
        this.loadPostDetail();
        this.loadComments();
    },

    // 加载帖子详情
    loadPostDetail: function() {
        const db = wx.cloud.database();
        const _ = db.command;
        
        db.collection('posts').doc(this.data.postId).get()
            .then(res => {
                const post = res.data;
                const isAuthor = post._openid === this.data.userOpenid;
                
                // 处理状态显示
                let displayStatus = {};
                if (post.postType === 'report') {
                    // 举报帖子：仅发帖者可见详细状态
                    if (isAuthor) {
                        const statusInfo = this.getReportStatusInfo(post.status);
                        displayStatus = {
                            name: statusInfo.name,
                            desc: statusInfo.desc,
                            color: statusInfo.color,
                            visible: true
                        };
                    } else {
                        displayStatus = {
                            name: '未知',
                            desc: '举报进度仅发帖者可见',
                            color: '#999999',
                            visible: false
                        };
                    }
                } else {
                    // 支持帖子：公开可见
                    const statusInfo = this.getSupportStatusInfo(post.status);
                    displayStatus = {
                        name: statusInfo.name,
                        color: statusInfo.color,
                        visible: true
                    };
                }
                
                this.setData({
                    post: {
                        ...post,
                        displayStatus: displayStatus
                    },
                    isAuthor: isAuthor,
                    isLoading: false
                });
            })
            .catch(err => {
                console.error('加载帖子详情失败:', err);
                wx.showToast({ title: '加载失败', icon: 'none' });
                this.setData({ isLoading: false });
            });
    },

    // 获取举报帖状态信息
    getReportStatusInfo: function(status) {
        const statusMap = {
            'pending': { name: '待审核', desc: '举报已提交，等待审核', color: '#FF9500' },
            'reviewing': { name: '审核中', desc: '相关部门正在核实情况', color: '#007AFF' },
            'collecting': { name: '取证中', desc: '正在收集相关证据', color: '#5856D6' },
            'processing': { name: '处理中', desc: '问题正在处理解决', color: '#FF3B30' },
            'completed': { name: '已办结', desc: '举报事项已处理完成', color: '#4CAF50' }
        };
        return statusMap[status] || statusMap.pending;
    },

    // 获取支持帖状态信息
    getSupportStatusInfo: function(status) {
        const statusMap = {
            'pending': { name: '进行中', color: '#FFA500' },
            'completed': { name: '已处理', color: '#4CAF50' }
        };
        return statusMap[status] || statusMap.pending;
    },

    // 获取状态文本
    getStatusText: function(status) {
        const statusMap = {
            'pending': '🕒 待审核',
            'reviewing': '🔍 审核中',
            'collecting': '📋 取证中',
            'processing': '⚙️ 处理中',
            'completed': '✅ 已办结'
        };
        return statusMap[status] || '未知状态';
    },

    // 获取进度条宽度（仅用于举报帖）
    getProgressWidth: function(status) {
        const progressMap = {
            'pending': 20,
            'reviewing': 40,
            'collecting': 60,
            'processing': 80,
            'completed': 100
        };
        return progressMap[status] || 0;
    },

    // 判断步骤是否完成
    isStepCompleted: function(stepStatus, currentStatus) {
        const statusOrder = ['pending', 'reviewing', 'collecting', 'processing', 'completed'];
        const currentIndex = statusOrder.indexOf(currentStatus);
        const stepIndex = statusOrder.indexOf(stepStatus);
        return stepIndex < currentIndex;
    },

    // 显示状态修改模态框
    showStatusModal: function() {
        if (!this.data.isAuthor) {
            wx.showToast({ title: '无权限操作', icon: 'none' });
            return;
        }
        this.setData({ showStatusModal: true });
    },

    // 修改状态
    changeStatus: function(e) {
        const status = e.currentTarget.dataset.status;
        const post = this.data.post;
        post.status = status;
        
        // 更新显示状态
        if (post.postType === 'report') {
            post.displayStatus = this.getReportStatusInfo(status);
        } else {
            post.displayStatus = this.getSupportStatusInfo(status);
        }
        
        this.setData({ post: post });
    },

    // 确认状态修改
    confirmStatusChange: function() {
        const that = this;
        const db = wx.cloud.database();
        
        db.collection('posts').doc(this.data.postId).update({
            data: {
                status: this.data.post.status,
                updatedAt: new Date()
            }
        }).then(() => {
            wx.showToast({ title: '状态更新成功', icon: 'success' });
            that.hideStatusModal();
        }).catch(err => {
            console.error('更新状态失败:', err);
            wx.showToast({ title: '更新失败', icon: 'none' });
        });
    },

    // 其他原有方法保持不变...
    previewImage: function(e) {
        // 原有实现
    },

    onReachBottom: function() {
        // 原有实现
    },

    // ... 其他方法
});