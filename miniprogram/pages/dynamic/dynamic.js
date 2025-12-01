Page({
    data: {
      currentTab: 'all',
      posts: [],
      isLoading: false,
      hasMore: true,
      pageSize: 10,
      currentPage: 0,
      userOpenid: ''
    },
  
    onLoad: function (options) {
      this.getUserOpenid();
      this.loadPosts();
    },
  
    onShow: function () {
      // 页面显示时刷新数据
      this.refreshPosts();
    },
  
    onPullDownRefresh: function () {
      this.refreshPosts().then(() => {
        wx.stopPullDownRefresh();
      });
    },
  
    // 获取用户openid
    getUserOpenid: function () {
      const app = getApp();
      if (app.globalData.openid) {
        this.setData({ userOpenid: app.globalData.openid });
      }
    },
  
    // 切换选项卡
    switchTab: function (e) {
      const tab = e.currentTarget.dataset.tab;
      if (this.data.currentTab !== tab) {
        this.setData({ currentTab: tab });
        this.refreshPosts();
      }
    },
  
    // 刷新帖子列表
    refreshPosts: function () {
      this.setData({
        currentPage: 0,
        hasMore: true,
        posts: []
      });
      return this.loadPosts();
    },
  
    // 加载帖子列表
    loadPosts: function () {
      if (this.data.isLoading || !this.data.hasMore) return Promise.resolve();
  
      this.setData({ isLoading: true });
  
      const db = wx.cloud.database();
      const _ = db.command;
      const { currentTab, currentPage, pageSize } = this.data;
  
      // 构建查询条件
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
  
          // 处理帖子数据，添加交互状态
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
  
    // 处理帖子数据
    processPostsData: function (posts) {
      const app = getApp();
      const userOpenid = app.globalData.openid;
  
      return posts.map(post => {
        // 检查用户是否点赞
        const liked = post.likes && post.likes.includes(userOpenid);
        // 获取最新评论
        const latestComment = post.comments && post.comments.length > 0 ? 
          post.comments[post.comments.length - 1] : null;
  
        return {
          ...post,
          liked,
          likeCount: post.likes ? post.likes.length : 0,
          commentCount: post.comments ? post.comments.length : 0,
          latestComment
        };
      });
    },
  
    // 滚动触底加载更多
    onReachBottom: function () {
      this.loadPosts();
    },
  
    // 点赞/取消点赞
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
        // 更新本地数据
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
  
    // 查看帖子详情
    viewPostDetail: function (e) {
      const post = e.currentTarget.dataset.post;
      wx.navigateTo({
        url: `/pages/postDetail/postDetail?id=${post._id}`
      });
    },
  
    // 评论帖子
    commentPost: function (e) {
      const post = e.currentTarget.dataset.post;
      wx.navigateTo({
        url: `/pages/postDetail/postDetail?id=${post._id}&comment=true`
      });
    },
  
    // 分享帖子
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
  
    // 改变帖子状态
    changeStatus: function (e) {
      const post = e.currentTarget.dataset.post;
      const newStatus = post.status === 'completed' ? 'pending' : 'completed';
      
      wx.showActionSheet({
        itemList: ['标记为进行中', '标记为已处理', '取消'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.updatePostStatus(post, 'pending');
          } else if (res.tapIndex === 1) {
            this.updatePostStatus(post, 'completed');
          }
        }
      });
    },
  
    // 更新帖子状态
    updatePostStatus: function (post, status) {
      const db = wx.cloud.database();
      
      db.collection('posts').doc(post._id).update({
        data: { status }
      }).then(() => {
        const posts = this.data.posts.map(p => {
          if (p._id === post._id) {
            return { ...p, status };
          }
          return p;
        });
        
        this.setData({ posts });
        
        wx.showToast({
          title: status === 'completed' ? '已标记为已处理' : '已标记为进行中',
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
  
    // 预览图片
    previewImage: function (e) {
      const images = e.currentTarget.dataset.images;
      const index = e.currentTarget.dataset.index;
      
      wx.previewImage({
        urls: images,
        current: images[index]
      });
    },
  
    // 创建新帖子
    createPost: function () {
      wx.navigateTo({
        url: '/pages/postEdit/postEdit'
      });
    },
  
    // 时间格式化
    formatTime: function (timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 60000) { // 1分钟内
        return '刚刚';
      } else if (diff < 3600000) { // 1小时内
        return Math.floor(diff / 60000) + '分钟前';
      } else if (diff < 86400000) { // 1天内
        return Math.floor(diff / 3600000) + '小时前';
      } else if (diff < 604800000) { // 1周内
        return Math.floor(diff / 86400000) + '天前';
      } else {
        return date.getMonth() + 1 + '月' + date.getDate() + '日';
      }
    }
  });