// dynamic/dynamic.js
Page({
    data: {
      currentTab: 'all',
      posts: [],
      isLoading: false,
      hasMore: true,
      pageSize: 10,
      currentPage: 0,
      userOpenid: '',
      // 细化举报帖子状态
      reportStatuses: {
        'pending_review': { name: '待审核', desc: '举报已提交，等待审核', color: '#FF9500' },
        'under_review': { name: '审核中', desc: '相关部门正在核实情况', color: '#007AFF' },
        'evidence_collection': { name: '取证中', desc: '正在收集相关证据', color: '#5856D6' },
        'processing': { name: '处理中', desc: '问题正在处理解决', color: '#FF3B30' },
        'resolved': { name: '已办结', desc: '举报事项已处理完成', color: '#4CAF50' }
      },
      // 支持服务帖子状态（保持不变）
      supportStatuses: {
        'pending': { name: '进行中', color: '#FFA500' },
        'completed': { name: '已处理', color: '#4CAF50' }
      }
    },
    getProgressWidth: function(reportStatus) {
        const progressMap = {
          'pending_review': 20,
          'under_review': 40,
          'evidence_collection': 60,
          'processing': 80,
          'resolved': 100
        };
        return progressMap[reportStatus] || 0;
    },
  
    onLoad: function (options) {
      this.getUserOpenid();
      this.loadPosts();
    },
  
    onShow: function () {
      this.refreshPosts();
    },
  
    onPullDownRefresh: function () {
      this.refreshPosts().then(() => {
        wx.stopPullDownRefresh();
      });
    },
  
    getUserOpenid: function () {
      const app = getApp();
      if (app.globalData.openid) {
        this.setData({ userOpenid: app.globalData.openid });
      }
    },
  
    switchTab: function (e) {
      const tab = e.currentTarget.dataset.tab;
      if (this.data.currentTab !== tab) {
        this.setData({ currentTab: tab });
        this.refreshPosts();
      }
    },
  
    refreshPosts: function () {
      this.setData({
        currentPage: 0,
        hasMore: true,
        posts: []
      });
      return this.loadPosts();
    },
  
    loadPosts: function () {
      if (this.data.isLoading || !this.data.hasMore) return Promise.resolve();
  
      this.setData({ isLoading: true });
  
      const db = wx.cloud.database();
      const _ = db.command;
      const { currentTab, currentPage, pageSize } = this.data;
  
      let query = db.collection('posts').where({
        status: _.neq('deleted')
      });
  
      if (currentTab !== 'all') {
        query = query.where({ postType: currentTab });
      }
  
      return query
        .orderBy('createdAt', 'desc')
        .skip(currentPage * pageSize)
        .limit(pageSize)
        .get()
        .then(res => {
          const newPosts = res.data;
          const hasMore = newPosts.length === pageSize;
  
          const processedPosts = this.processPostsData(newPosts);
  
          this.setData({
            posts: this.data.currentPage === 0 ? 
              processedPosts : this.data.posts.concat(processedPosts),
            hasMore: hasMore,
            currentPage: this.data.currentPage + 1,
            isLoading: false
          });
  
          return res;
        })
        .catch(err => {
          console.error('加载帖子失败:', err);
          this.setData({ isLoading: false });
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          });
        });
    },
  
    // 修改：处理帖子数据，添加状态显示逻辑
    processPostsData: function (posts) {
      const app = getApp();
      const userOpenid = app.globalData.openid;
  
      return posts.map(post => {
        const liked = post.likes && post.likes.includes(userOpenid);
        const latestComment = post.comments && post.comments.length > 0 ? 
          post.comments[post.comments.length - 1] : null;
  
        // 判断是否为发帖者
        const isAuthor = post._openid === userOpenid;
        
        // 处理状态显示
        let displayStatus = {};
        if (post.postType === 'report') {
          // 举报帖子：发帖者看到详细状态，非发帖者看到"未知"
          if (isAuthor) {
            const statusInfo = this.data.reportStatuses[post.reportStatus] || 
                             this.data.reportStatuses.pending_review;
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
          // 支持服务帖子：保持原有逻辑
          const statusInfo = this.data.supportStatuses[post.status] || 
                           this.data.supportStatuses.pending;
          displayStatus = {
            name: statusInfo.name,
            color: statusInfo.color,
            visible: true
          };
        }
  
        return {
          ...post,
          liked,
          likeCount: post.likes ? post.likes.length : 0,
          commentCount: post.comments ? post.comments.length : 0,
          latestComment,
          displayStatus,
          isAuthor
        };
      });
    },
  
    onReachBottom: function () {
      this.loadPosts();
    },
  
    likePost: function (e) {
      const post = e.currentTarget.dataset.post;
      const app = getApp();
      const userOpenid = app.globalData.openid;
      const db = wx.cloud.database();
      const _ = db.command;
  
      const isLiked = post.liked;
      const operation = isLiked ? _.pull(userOpenid) : _.push(userOpenid);
  
      db.collection('posts').doc(post._id).update({
        data: {
          likes: operation
        }
      }).then(() => {
        const posts = this.data.posts.map(p => {
          if (p._id === post._id) {
            const newLikes = isLiked ? 
              (p.likes || []).filter(id => id !== userOpenid) : 
              [...(p.likes || []), userOpenid];
            
            return {
              ...p,
              liked: !isLiked,
              likeCount: newLikes.length,
              likes: newLikes
            };
          }
          return p;
        });
  
        this.setData({ posts });
      }).catch(err => {
        console.error('点赞操作失败:', err);
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
      });
    },
  
    viewPostDetail: function (e) {
      const post = e.currentTarget.dataset.post;
      wx.navigateTo({
        url: `/pages/postDetail/postDetail?id=${post._id}`
      });
    },
  
    commentPost: function (e) {
      const post = e.currentTarget.dataset.post;
      wx.navigateTo({
        url: `/pages/postDetail/postDetail?id=${post._id}&comment=true`
      });
    },
  
    sharePost: function (e) {
      const post = e.currentTarget.dataset.post;
      wx.showActionSheet({
        itemList: ['分享给好友', '生成分享图'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.shareToFriend(post);
          } else {
            this.generateShareImage(post);
          }
        }
      });
    },
  
    // 修改：细化状态更改逻辑
    changeStatus: function (e) {
      const post = e.currentTarget.dataset.post;
      
      if (post.postType === 'report') {
        // 举报帖子：显示详细状态选项（仅发帖者可见）
        if (!post.isAuthor) {
          wx.showToast({
            title: '无权限操作',
            icon: 'none'
          });
          return;
        }
        
        this.showReportStatusOptions(post);
      } else {
        // 支持服务帖子：保持原有逻辑
        this.showSupportStatusOptions(post);
      }
    },
  
    // 新增：显示举报帖子状态选项
    showReportStatusOptions: function (post) {
      const statusOptions = [
        '待审核', '审核中', '取证中', '处理中', '已办结'
      ];
      
      wx.showActionSheet({
        itemList: statusOptions,
        success: (res) => {
          const statusMap = {
            0: 'pending_review',
            1: 'under_review',
            2: 'evidence_collection',
            3: 'processing',
            4: 'resolved'
          };
          
          const newStatus = statusMap[res.tapIndex];
          if (newStatus) {
            this.updatePostStatus(post, newStatus, 'reportStatus');
          }
        }
      });
    },
  
    // 修改：支持服务帖子状态选项
    showSupportStatusOptions: function (post) {
      wx.showActionSheet({
        itemList: ['标记为进行中', '标记为已处理', '取消'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.updatePostStatus(post, 'pending', 'status');
          } else if (res.tapIndex === 1) {
            this.updatePostStatus(post, 'completed', 'status');
          }
        }
      });
    },
  
    // 修改：更新帖子状态
    updatePostStatus: function (post, status, statusField = 'status') {
      const db = wx.cloud.database();
      
      const updateData = {};
      updateData[statusField] = status;
      updateData.updatedAt = new Date();
  
      db.collection('posts').doc(post._id).update({
        data: updateData
      }).then(() => {
        // 刷新当前页面数据
        this.refreshPosts();
        
        wx.showToast({
          title: '状态更新成功',
          icon: 'success'
        });
      }).catch(err => {
        console.error('更新状态失败:', err);
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
      });
    },
  
    previewImage: function (e) {
      const images = e.currentTarget.dataset.images;
      const index = e.currentTarget.dataset.index;
      
      wx.previewImage({
        urls: images,
        current: images[index]
      });
    },
  
    createPost: function () {
      wx.navigateTo({
        url: '/pages/postEdit/postEdit'
      });
    },
  
    formatTime: function (timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 60000) {
        return '刚刚';
      } else if (diff < 3600000) {
        return Math.floor(diff / 60000) + '分钟前';
      } else if (diff < 86400000) {
        return Math.floor(diff / 3600000) + '小时前';
      } else if (diff < 604800000) {
        return Math.floor(diff / 86400000) + '天前';
      } else {
        return date.getMonth() + 1 + '月' + date.getDate() + '日';
      }
    }
  });