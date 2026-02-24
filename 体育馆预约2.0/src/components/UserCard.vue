<template>
  <view class="user-card" :class="{ 'card-clickable': clickable }" @click="handleCardClick">
    <!-- 用户头像 -->
    <view class="avatar-container">
      <image 
        :src="user.avatar || '/static/images/default-avatar.svg'" 
        class="user-avatar"
        mode="aspectFill"
        @error="handleAvatarError"
      />
      
      <!-- 在线状态 -->
      <view class="online-status" v-if="showOnlineStatus && user.isOnline"></view>
      
      <!-- 等级标签 -->
      <view class="level-badge" v-if="user.level">
        <text class="level-text">Lv.{{ user.level }}</text>
      </view>
    </view>
    
    <!-- 用户信息 -->
    <view class="user-info">
      <!-- 基本信息 -->
      <view class="basic-info">
        <text class="user-name">{{ user.nickname || user.username }}</text>
        
        <!-- 认证标识 -->
        <view class="verify-badges">
          <view class="verify-badge" v-if="user.isVerified">
            <text class="verify-icon">✓</text>
          </view>
          <view class="vip-badge" v-if="user.isVip">
            <text class="vip-text">VIP</text>
          </view>
        </view>
      </view>
      
      <!-- 用户标签 -->
      <view class="user-tags" v-if="user.tags && user.tags.length">
        <text 
          class="tag-item" 
          v-for="(tag, index) in user.tags.slice(0, 3)" 
          :key="index"
        >
          {{ tag }}
        </text>
        <text class="tag-more" v-if="user.tags.length > 3">+{{ user.tags.length - 3 }}</text>
      </view>
      
      <!-- 运动偏好 -->
      <view class="sport-preferences" v-if="user.sportPreferences && user.sportPreferences.length">
        <text class="preferences-label">偏好运动：</text>
        <text class="preferences-text">{{ user.sportPreferences.slice(0, 2).join('、') }}</text>
        <text class="preferences-more" v-if="user.sportPreferences.length > 2">等{{ user.sportPreferences.length }}项</text>
      </view>
      
      <!-- 位置信息 -->
      <view class="location-info" v-if="user.city || user.distance">
        <text class="location-icon">📍</text>
        <text class="location-text">{{ user.city }}</text>
        <text class="distance-text" v-if="user.distance">距离{{ formatDistance(user.distance) }}</text>
      </view>
      
      <!-- 统计信息 -->
      <view class="stats-info" v-if="showStats">
        <view class="stat-item" v-if="user.bookingCount !== undefined">
          <text class="stat-value">{{ user.bookingCount }}</text>
          <text class="stat-label">预约</text>
        </view>
        <view class="stat-item" v-if="user.sharingCount !== undefined">
          <text class="stat-value">{{ user.sharingCount }}</text>
          <text class="stat-label">拼场</text>
        </view>
        <view class="stat-item" v-if="user.rating !== undefined">
          <text class="stat-value">{{ user.rating.toFixed(1) }}</text>
          <text class="stat-label">评分</text>
        </view>
      </view>
    </view>
    
    <!-- 操作按钮 -->
    <view class="action-buttons" v-if="showActions">
      <!-- 关注按钮 -->
      <button 
        class="action-btn follow-btn"
        :class="{ 'followed': user.isFollowed }"
        v-if="showFollowButton"
        @click.stop="handleFollow"
      >
        {{ user.isFollowed ? '已关注' : '关注' }}
      </button>
      
      <!-- 私信按钮 -->
      <button 
        class="action-btn message-btn"
        v-if="showMessageButton"
        @click.stop="handleMessage"
      >
        私信
      </button>
      
      <!-- 邀请按钮 -->
      <button 
        class="action-btn invite-btn"
        v-if="showInviteButton"
        @click.stop="handleInvite"
      >
        邀请
      </button>
    </view>
    
    <!-- 最近活动 -->
    <view class="recent-activity" v-if="showRecentActivity && user.recentActivity">
      <text class="activity-label">最近活动：</text>
      <text class="activity-text">{{ user.recentActivity }}</text>
      <text class="activity-time">{{ formatTime(user.lastActiveTime) }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'UserCard',
  
  props: {
    // 用户数据
    user: {
      type: Object,
      required: true
    },
    
    // 是否可点击
    clickable: {
      type: Boolean,
      default: true
    },
    
    // 是否显示在线状态
    showOnlineStatus: {
      type: Boolean,
      default: false
    },
    
    // 是否显示统计信息
    showStats: {
      type: Boolean,
      default: true
    },
    
    // 是否显示操作按钮
    showActions: {
      type: Boolean,
      default: true
    },
    
    // 是否显示关注按钮
    showFollowButton: {
      type: Boolean,
      default: true
    },
    
    // 是否显示私信按钮
    showMessageButton: {
      type: Boolean,
      default: true
    },
    
    // 是否显示邀请按钮
    showInviteButton: {
      type: Boolean,
      default: false
    },
    
    // 是否显示最近活动
    showRecentActivity: {
      type: Boolean,
      default: false
    },
    
    // 卡片模式：normal(普通) | compact(紧凑) | mini(迷你)
    mode: {
      type: String,
      default: 'normal'
    },
    
    // 当前用户ID
    currentUserId: {
      type: [String, Number],
      default: null
    }
  },
  
  computed: {
    // 是否是当前用户
    isCurrentUser() {
      return this.currentUserId && this.user.id === this.currentUserId
    }
  },
  
  methods: {
    // 格式化距离
    formatDistance(distance) {
      if (distance < 1000) {
        return `${distance}m`
      } else {
        return `${(distance / 1000).toFixed(1)}km`
      }
    },
    
    // 格式化时间
    formatTime(timestamp) {
      if (!timestamp) return ''
      
      const now = new Date().getTime()
      const time = new Date(timestamp).getTime()
      const diff = now - time
      
      if (diff < 60000) {
        return '刚刚'
      } else if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`
      } else if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前`
      } else {
        return `${Math.floor(diff / 86400000)}天前`
      }
    },
    
    // 头像加载错误
    handleAvatarError() {
      // 可以设置默认头像或者触发重新加载
      console.log('头像加载失败')
    },
    
    // 卡片点击
    handleCardClick() {
      if (this.clickable) {
        this.$emit('click', this.user)
      }
    },
    
    // 关注用户
    handleFollow() {
      this.$emit('follow', this.user)
    },
    
    // 发送私信
    handleMessage() {
      this.$emit('message', this.user)
    },
    
    // 邀请用户
    handleInvite() {
      this.$emit('invite', this.user)
    }
  }
}
</script>

<style lang="scss" scoped>
.user-card {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  
  &.card-clickable {
    &:active {
      background-color: #f8f8f8;
    }
  }
  
  display: flex;
  align-items: flex-start;
}

// 头像容器
.avatar-container {
  position: relative;
  margin-right: 20rpx;
  flex-shrink: 0;
  
  .user-avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 48rpx;
    border: 2rpx solid #f0f0f0;
  }
  
  // 在线状态
  .online-status {
    position: absolute;
    bottom: 4rpx;
    right: 4rpx;
    width: 20rpx;
    height: 20rpx;
    background-color: #52c41a;
    border: 2rpx solid #ffffff;
    border-radius: 50%;
  }
  
  // 等级标签
  .level-badge {
    position: absolute;
    top: -8rpx;
    right: -8rpx;
    background: linear-gradient(135deg, #ff6b35, #f7931e);
    border-radius: 12rpx;
    padding: 4rpx 8rpx;
    
    .level-text {
      font-size: 18rpx;
      color: #ffffff;
      font-weight: 600;
    }
  }
}

// 用户信息
.user-info {
  flex: 1;
  
  // 基本信息
  .basic-info {
    display: flex;
    align-items: center;
    margin-bottom: 12rpx;
    
    .user-name {
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
      margin-right: 12rpx;
    }
    
    .verify-badges {
      display: flex;
      align-items: center;
      gap: 8rpx;
      
      .verify-badge {
        width: 32rpx;
        height: 32rpx;
        background-color: #52c41a;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        
        .verify-icon {
          font-size: 18rpx;
          color: #ffffff;
          font-weight: 600;
        }
      }
      
      .vip-badge {
        background: linear-gradient(135deg, #fadb14, #fa8c16);
        padding: 4rpx 8rpx;
        border-radius: 8rpx;
        
        .vip-text {
          font-size: 18rpx;
          color: #ffffff;
          font-weight: 600;
        }
      }
    }
  }
  
  // 用户标签
  .user-tags {
    display: flex;
    align-items: center;
    margin-bottom: 12rpx;
    flex-wrap: wrap;
    gap: 8rpx;
    
    .tag-item {
      background-color: #f0f0f0;
      color: #666666;
      font-size: 20rpx;
      padding: 4rpx 8rpx;
      border-radius: 8rpx;
    }
    
    .tag-more {
      color: #999999;
      font-size: 20rpx;
    }
  }
  
  // 运动偏好
  .sport-preferences {
    display: flex;
    align-items: center;
    margin-bottom: 12rpx;
    
    .preferences-label {
      font-size: 24rpx;
      color: #999999;
      margin-right: 8rpx;
    }
    
    .preferences-text {
      font-size: 24rpx;
      color: #666666;
    }
    
    .preferences-more {
      font-size: 24rpx;
      color: #999999;
      margin-left: 4rpx;
    }
  }
  
  // 位置信息
  .location-info {
    display: flex;
    align-items: center;
    margin-bottom: 12rpx;
    
    .location-icon {
      font-size: 24rpx;
      margin-right: 8rpx;
    }
    
    .location-text {
      font-size: 24rpx;
      color: #666666;
      margin-right: 16rpx;
    }
    
    .distance-text {
      font-size: 24rpx;
      color: #999999;
    }
  }
  
  // 统计信息
  .stats-info {
    display: flex;
    align-items: center;
    gap: 32rpx;
    margin-bottom: 12rpx;
    
    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      
      .stat-value {
        font-size: 28rpx;
        font-weight: 600;
        color: #333333;
        margin-bottom: 4rpx;
      }
      
      .stat-label {
        font-size: 20rpx;
        color: #999999;
      }
    }
  }
}

// 操作按钮
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-left: 20rpx;
  flex-shrink: 0;
  
  .action-btn {
    width: 120rpx;
    height: 56rpx;
    border: none;
    border-radius: 8rpx;
    font-size: 24rpx;
    font-weight: 600;
    
    &.follow-btn {
      background-color: #ff6b35;
      color: #ffffff;
      
      &.followed {
        background-color: #f0f0f0;
        color: #666666;
      }
    }
    
    &.message-btn {
      background-color: #1890ff;
      color: #ffffff;
    }
    
    &.invite-btn {
      background-color: #52c41a;
      color: #ffffff;
    }
  }
}

// 最近活动
.recent-activity {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx dashed #f0f0f0;
  
  .activity-label {
    font-size: 22rpx;
    color: #999999;
    margin-right: 8rpx;
  }
  
  .activity-text {
    font-size: 22rpx;
    color: #666666;
    margin-right: 8rpx;
  }
  
  .activity-time {
    font-size: 22rpx;
    color: #999999;
  }
}

// 紧凑模式
.user-card.compact-mode {
  padding: 16rpx;
  
  .avatar-container {
    .user-avatar {
      width: 64rpx;
      height: 64rpx;
      border-radius: 32rpx;
    }
    
    .level-badge {
      top: -4rpx;
      right: -4rpx;
      
      .level-text {
        font-size: 16rpx;
      }
    }
  }
  
  .user-info {
    .basic-info {
      margin-bottom: 8rpx;
      
      .user-name {
        font-size: 28rpx;
      }
    }
    
    .user-tags,
    .sport-preferences,
    .location-info,
    .stats-info {
      margin-bottom: 8rpx;
    }
  }
  
  .action-buttons {
    .action-btn {
      width: 100rpx;
      height: 48rpx;
      font-size: 22rpx;
    }
  }
}

// 迷你模式
.user-card.mini-mode {
  padding: 12rpx;
  
  .avatar-container {
    margin-right: 12rpx;
    
    .user-avatar {
      width: 48rpx;
      height: 48rpx;
      border-radius: 24rpx;
    }
    
    .level-badge {
      display: none;
    }
  }
  
  .user-info {
    .basic-info {
      margin-bottom: 4rpx;
      
      .user-name {
        font-size: 24rpx;
      }
      
      .verify-badges {
        .verify-badge {
          width: 24rpx;
          height: 24rpx;
          
          .verify-icon {
            font-size: 14rpx;
          }
        }
        
        .vip-badge {
          padding: 2rpx 6rpx;
          
          .vip-text {
            font-size: 16rpx;
          }
        }
      }
    }
    
    .user-tags,
    .sport-preferences,
    .stats-info {
      display: none;
    }
    
    .location-info {
      margin-bottom: 0;
      
      .location-icon,
      .location-text,
      .distance-text {
        font-size: 20rpx;
      }
    }
  }
  
  .action-buttons {
    margin-left: 12rpx;
    
    .action-btn {
      width: 80rpx;
      height: 40rpx;
      font-size: 20rpx;
    }
  }
  
  .recent-activity {
    display: none;
  }
}
</style>