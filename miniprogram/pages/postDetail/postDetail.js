// pages/postDetail/postDetail.js
Page({
    data: {
      // 评论数据
      comments: [],
      commentText: '',
      commentImages: [],
      sortBy: 'time', // time: 时间, hot: 热度
      currentPage: 0,
      pageSize: 10,
      hasMoreComments: true,
      
      // UI状态
      isInputFocus: false,
      showImagePanel: false,
      replyingTo: null, // 回复的评论
    },
  
    onLoad: function(options) {
      this.setData({ 
        postId: options.id,
        userOpenid: getApp().globalData.openid
      });
      this.loadPostDetail();
      this.loadComments();
    },
  
    // 加载评论列表
    loadComments: function() {
      if (this.data.isLoadingComments) return;
      
      this.setData({ isLoadingComments: true });
      
      const db = wx.cloud.database();
      const _ = db.command;
      let query = db.collection('comments')
        .where({
          postId: this.data.postId,
          parentId: _.eq(null) // 只加载顶级评论
        });
      
      // 排序方式
      if (this.data.sortBy === 'time') {
        query = query.orderBy('createdAt', 'desc');
      } else {
        query = query.orderBy('likeCount', 'desc').orderBy('createdAt', 'desc');
      }
      
      query
        .skip(this.data.currentPage * this.data.pageSize)
        .limit(this.data.pageSize)
        .get()
        .then(res => {
          const newComments = res.data.map(comment => ({
            ...comment,
            liked: comment.likes && comment.likes.includes(this.data.userOpenid)
          }));
          
          const hasMore = newComments.length === this.data.pageSize;
          
          this.setData({
            comments: this.data.currentPage === 0 ? 
              newComments : this.data.comments.concat(newComments),
            hasMoreComments: hasMore,
            currentPage: this.data.currentPage + 1,
            isLoadingComments: false
          });
        })
        .catch(err => {
          console.error('加载评论失败:', err);
          this.setData({ isLoadingComments: false });
        });
    },
  
    // 提交评论
    submitComment: function() {
      const that = this;
      const { commentText, commentImages, replyingTo, postId } = this.data;
      
      if (!commentText.trim()) {
        wx.showToast({ title: '请输入评论内容', icon: 'none' });
        return;
      }
      
      // 检查登录状态
      if (!getApp().globalData.isLoggedIn) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      
      const db = wx.cloud.database();
      const _ = db.command;
      const userInfo = getApp().globalData.userInfo;
      
      // 构建评论数据
      const commentData = {
        postId: postId,
        parentId: replyingTo ? replyingTo._id : null,
        author: {
          openid: getApp().globalData.openid,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        },
        content: commentText.trim(),
        images: commentImages,
        likes: [],
        likeCount: 0,
        isAuthor: this.checkIsAuthor(replyingTo),
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // 显示加载中
      wx.showLoading({ title: '发布中...', mask: true });
      
      // 上传图片
      this.uploadCommentImages().then(imageUrls => {
        commentData.images = imageUrls;
        
        // 保存评论到数据库
        return db.collection('comments').add({
          data: commentData
        });
      }).then(() => {
        // 更新帖子评论数
        return db.collection('posts').doc(postId).update({
          data: {
            commentCount: _.inc(1)
          }
        });
      }).then(() => {
        wx.hideLoading();
        wx.showToast({ title: '评论成功', icon: 'success' });
        
        // 重置状态
        this.setData({
          commentText: '',
          commentImages: [],
          replyingTo: null,
          currentPage: 0,
          hasMoreComments: true
        });
        
        // 重新加载评论
        this.loadComments();
        this.loadPostDetail(); // 刷新帖子数据
        
      }).catch(err => {
        wx.hideLoading();
        console.error('评论失败:', err);
        wx.showToast({ title: '评论失败，请重试', icon: 'none' });
      });
    },
  
    // 点赞/取消点赞评论
    likeComment: function(e) {
      const comment = e.currentTarget.dataset.comment;
      const that = this;
      const userOpenid = this.data.userOpenid;
      
      if (!userOpenid) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      
      const db = wx.cloud.database();
      const _ = db.command;
      const isLiked = comment.liked;
      
      db.collection('comments').doc(comment._id).update({
        data: {
          likes: isLiked ? _.pull(userOpenid) : _.push(userOpenid),
          likeCount: _.inc(isLiked ? -1 : 1)
        }
      }).then(() => {
        // 更新本地数据
        const comments = that.data.comments.map(c => {
          if (c._id === comment._id) {
            return {
              ...c,
              liked: !isLiked,
              likeCount: c.likeCount + (isLiked ? -1 : 1)
            };
          }
          return c;
        });
        
        that.setData({ comments });
      }).catch(err => {
        console.error('点赞操作失败:', err);
      });
    },
  
    // 删除评论
    deleteComment: function(e) {
      const that = this;
      const comment = e.currentTarget.dataset.comment;
      
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这条评论吗？',
        success: function(res) {
          if (res.confirm) {
            const db = wx.cloud.database();
            const _ = db.command;
            
            db.collection('comments').doc(comment._id).update({
              data: { status: 'deleted' }
            }).then(() => {
              // 更新帖子评论数
              return db.collection('posts').doc(comment.postId).update({
                data: { commentCount: _.inc(-1) }
              });
            }).then(() => {
              wx.showToast({ title: '删除成功', icon: 'success' });
              
              // 重新加载数据
              that.setData({
                currentPage: 0,
                hasMoreComments: true
              });
              that.loadComments();
              that.loadPostDetail();
            }).catch(err => {
              console.error('删除评论失败:', err);
              wx.showToast({ title: '删除失败', icon: 'none' });
            });
          }
        }
      });
    },
  
    // 检查是否是帖主回复
    checkIsAuthor: function(comment) {
      if (!comment) return false;
      const postAuthorId = this.data.post && this.data.post._openid;
      return getApp().globalData.openid === postAuthorId;
    },
  
    // 图片上传
    uploadCommentImages: function() {
      const that = this;
      const uploadTasks = this.data.commentImages.map(tempFilePath => {
        return new Promise((resolve, reject) => {
          const cloudPath = `comments/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
          
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath,
            success: resolve,
            fail: reject
          });
        });
      });
      
      return Promise.all(uploadTasks).then(results => 
        results.map(res => res.fileID)
      );
    }
  });