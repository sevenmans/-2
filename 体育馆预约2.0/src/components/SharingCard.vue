<template>
  <view class="sharing-card" @click="handleCardClick">
    <!-- 状态标签 -->
    <view class="status-badge" :class="`status-${sharing.status.toLowerCase()}`">
      <text class="status-text">{{ getStatusText(sharing.status) }}</text>
    </view>
    
    <!-- 场馆信息 -->
    <view class="venue-info">
      <image 
        :src="sharing.venue.image || '/static/images/default-venue.png'" 
        class="venue-image"
        mode="aspectFill"
      />
      <view class="venue-details">
        <text class="venue-name">{{ sharing.venue.name }}</text>
        <text class="venue-location">{{ sharing.venue.location }}</text>
        <text class="venue-type">{{ sharing.venue.type }}</text>
      </view>
    </view>
    
    <!-- 拼场信息 -->
    <view class="sharing-info">
      <!-- 时间信息 -->
      <view class="time-info">
        <view class="info-item">
          <text class="item-label">预约日期</text>
          <text class="item-value">{{ formatDate(sharing.bookingDate) }}</text>
        </view>
        <view class="info-item">
          <text class="item-label">时间段</text>
          <text class="item-value">{{ sharing.startTime }}-{{ sharing.endTime }}</text>
        </view>
      </view>
      
      <!-- 队伍信息 -->
      <view class="team-info">
        <view class="team-header">
          <text class="team-name">{{ sharing.teamName }}</text>
          <view class="team-members">
            <text class="members-count">{{ sharing.currentParticipants }}/{{ sharing.maxParticipants }}人</text>
            <view class="progress-bar">
              <view 
                class="progress-inner"
                :style="{ width: `${(sharing.currentParticipants / sharing.maxParticipants) * 100}%` }"
              ></view>
            </view>
          </view>
        </view>
        
        <!-- 人均费用 -->
        <view class="cost-info">
          <text class="cost-label">人均费用</text>
          <text class="cost-value">¥{{ calculatePerPersonCost() }}</text>
        </view>
        
        <!-- 描述信息 -->
        <view class="description" v-if="sharing.description">
          <text class="description-text">{{ sharing.description }}</text>
        </view>
      </view>
      
      <!-- 发起人信息 -->
      <view class="creator-info">
        <image 
          :src="sharing.creator.avatar || '/static/images/default-avatar.svg'" 
          class="creator-avatar"
          mode="aspectFill"
        />
        <view class="creator-details">
          <text class="creator-name">{{ sharing.creator.nickname }}</text>
          <text class="creator-level" v-if="sharing.creator.level">
            Lv.{{ sharing.creator.level }}
          </text>
        </view>
        <view class="creator-rating" v-if="sharing.creator.rating">
          <text class="rating-value">{{ sharing.creator.rating.toFixed(1) }}</text>
          <text class="rating-icon">★</text>
        </view>
      </view>
    </view>
    
    <!-- 操作按钮 -->
    <view class="action-buttons" v-if="showActions">
      <!-- 加入拼场 -->
      <button 
        class="action-btn join-btn"
        v-if="canJoin"
        @click.stop="handleJoin"
      >
        加入拼场
      </button>
      
      <!-- 查看详情 -->
      <button 
        class="action-btn detail-btn"
        @click.stop="handleViewDetail"
      >
        查看详情
      </button>
      
      <!-- 联系队长 -->
      <button 
        class="action-btn contact-btn"
        v-if="canContact"
        @click.stop="handleContact"
      >
        联系队长
      </button>
    </view>
    
    <!-- 倒计时 -->
    <view class="countdown" v-if="showCountdown">
      <text class="countdown-label">{{ countdownLabel }}</text>
      <text class="countdown-time">{{ countdownText }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'SharingCard',
  
  props: {
    // 拼场数据
    sharing: {
      type: Object,
      required: true
    },
    
    // 是否显示操作按钮
    showActions: {
      type: Boolean,
      default: true
    },
    
    // 是否显示倒计时
    showCountdown: {
      type: Boolean,
      default: false
    },
    
    // 卡片模式：list(列表模式) | detail(详情模式)
    mode: {
      type: String,
      default: 'list'
    },
    
    // 当前用户ID
    currentUserId: {
      type: [String, Number],
      default: null
    }
  },
  
  data() {
    return {
      countdownTimer: null,
      remainingTime: 0
    }
  },
  
  computed: {
    // 是否可以加入
    canJoin() {
      return this.sharing.status === 'RECRUITING' && 
             this.sharing.currentParticipants < this.sharing.maxParticipants &&
             !this.isCreator && 
             !this.isParticipant
    },
    
    // 是否可以联系队长
    canContact() {
      return this.sharing.status === 'RECRUITING' && !this.isCreator
    },
    
    // 是否是创建者
    isCreator() {
      return this.currentUserId && this.sharing.creator.id === this.currentUserId
    },
    
    // 是否是参与者
    isParticipant() {
      if (!this.currentUserId || !this.sharing.participants) return false
      return this.sharing.participants.some(p => p.id === this.currentUserId)
    },
    
    // 倒计时标签
    countdownLabel() {
      if (this.sharing.status === 'RECRUITING') {
        return '距离开始时间'
      } else if (this.sharing.status === 'ONGOING') {
        return '距离结束时间'
      }
      return ''
    },
    
    // 倒计时文本
    countdownText() {
      if (this.remainingTime <= 0) {
        return '00:00:00'
      }
      
      const hours = Math.floor(this.remainingTime / 3600)
      const minutes = Math.floor((this.remainingTime % 3600) / 60)
      const seconds = this.remainingTime % 60
      
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
  },
  
  mounted() {
    if (this.showCountdown) {
      this.startCountdown()
    }
  },
  
  beforeDestroy() {
    this.clearCountdown()
  },
  
  methods: {
    // 格式化日期
    formatDate(dateString) {
      const date = new Date(dateString)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${month}月${day}日`
    },
    
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        'RECRUITING': '招募中',
        'FULL': '已满员',
        'ONGOING': '进行中',
        'COMPLETED': '已完成',
        'CANCELLED': '已取消'
      }
      return statusMap[status] || status
    },
    
    // 计算人均费用
    calculatePerPersonCost() {
      if (!this.sharing.totalAmount || !this.sharing.currentParticipants) {
        return 0
      }
      
      return (this.sharing.totalAmount / this.sharing.currentParticipants).toFixed(2)
    },
    
    // 卡片点击
    handleCardClick() {
      this.$emit('click', this.sharing)
    },
    
    // 加入拼场
    handleJoin() {
      this.$emit('join', this.sharing)
    },
    
    // 查看详情
    handleViewDetail() {
      this.$emit('view-detail', this.sharing)
    },
    
    // 联系队长
    handleContact() {
      this.$emit('contact', this.sharing)
    },
    
    // 开始倒计时
    startCountdown() {
      this.calculateRemainingTime()
      
      this.countdownTimer = setInterval(() => {
        this.remainingTime--
        
        if (this.remainingTime <= 0) {
          this.clearCountdown()
          this.$emit('countdown-end', this.sharing)
        }
      }, 1000)
    },
    
    // 计算剩余时间
    calculateRemainingTime() {
      const now = new Date().getTime()
      let targetTime
      
      if (this.sharing.status === 'RECRUITING' || this.sharing.status === 'FULL') {
        // 距离开始时间
        const bookingDateTime = `${this.sharing.bookingDate} ${this.sharing.startTime}`
        targetTime = new Date(bookingDateTime).getTime()
      } else if (this.sharing.status === 'ONGOING') {
        // 距离结束时间
        const bookingDateTime = `${this.sharing.bookingDate} ${this.sharing.endTime}`
        targetTime = new Date(bookingDateTime).getTime()
      }
      
      this.remainingTime = Math.max(0, Math.floor((targetTime - now) / 1000))
    },
    
    // 清除倒计时
    clearCountdown() {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer)
        this.countdownTimer = null
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.sharing-card {
  background-color: #ffffff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.1);
  position: relative;
}

// 状态标签
.status-badge {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  z-index: 2;
  
  .status-text {
    font-size: 20rpx;
    font-weight: 600;
  }
  
  &.status-recruiting {
    background-color: #f6ffed;
    
    .status-text {
      color: #52c41a;
    }
  }
  
  &.status-full {
    background-color: #fff7e6;
    
    .status-text {
      color: #fa8c16;
    }
  }
  
  &.status-ongoing {
    background-color: #e6f7ff;
    
    .status-text {
      color: #1890ff;
    }
  }
  
  &.status-completed {
    background-color: #f9f0ff;
    
    .status-text {
      color: #722ed1;
    }
  }
  
  &.status-cancelled {
    background-color: #fff2f0;
    
    .status-text {
      color: #ff4d4f;
    }
  }
}

// 场馆信息
.venue-info {
  display: flex;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  
  .venue-image {
    width: 120rpx;
    height: 120rpx;
    border-radius: 8rpx;
    margin-right: 20rpx;
    flex-shrink: 0;
  }
  
  .venue-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    
    .venue-name {
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
      margin-bottom: 8rpx;
    }
    
    .venue-location {
      font-size: 24rpx;
      color: #666666;
      margin-bottom: 8rpx;
    }
    
    .venue-type {
      font-size: 24rpx;
      color: #999999;
    }
  }
}

// 拼场信息
.sharing-info {
  padding: 30rpx;
  
  // 时间信息
  .time-info {
    display: flex;
    margin-bottom: 20rpx;
    
    .info-item {
      flex: 1;
      
      .item-label {
        display: block;
        font-size: 24rpx;
        color: #999999;
        margin-bottom: 8rpx;
      }
      
      .item-value {
        display: block;
        font-size: 28rpx;
        color: #333333;
        font-weight: 600;
      }
    }
  }
  
  // 队伍信息
  .team-info {
    margin-bottom: 20rpx;
    
    .team-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16rpx;
      
      .team-name {
        font-size: 28rpx;
        font-weight: 600;
        color: #333333;
      }
      
      .team-members {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        
        .members-count {
          font-size: 24rpx;
          color: #666666;
          margin-bottom: 8rpx;
        }
        
        .progress-bar {
          width: 120rpx;
          height: 8rpx;
          background-color: #f0f0f0;
          border-radius: 4rpx;
          overflow: hidden;
          
          .progress-inner {
            height: 100%;
            background-color: #52c41a;
            border-radius: 4rpx;
          }
        }
      }
    }
    
    // 人均费用
    .cost-info {
      display: flex;
      align-items: center;
      margin-bottom: 16rpx;
      
      .cost-label {
        font-size: 24rpx;
        color: #999999;
        margin-right: 16rpx;
      }
      
      .cost-value {
        font-size: 32rpx;
        color: #ff6b35;
        font-weight: 600;
      }
    }
    
    // 描述信息
    .description {
      background-color: #f9f9f9;
      padding: 16rpx;
      border-radius: 8rpx;
      
      .description-text {
        font-size: 24rpx;
        color: #666666;
        line-height: 1.5;
      }
    }
  }
  
  // 发起人信息
  .creator-info {
    display: flex;
    align-items: center;
    padding-top: 20rpx;
    border-top: 1rpx dashed #f0f0f0;
    
    .creator-avatar {
      width: 64rpx;
      height: 64rpx;
      border-radius: 32rpx;
      margin-right: 16rpx;
    }
    
    .creator-details {
      flex: 1;
      
      .creator-name {
        font-size: 28rpx;
        color: #333333;
        margin-bottom: 4rpx;
      }
      
      .creator-level {
        font-size: 20rpx;
        color: #ff6b35;
        background-color: #fff7e6;
        padding: 2rpx 8rpx;
        border-radius: 8rpx;
      }
    }
    
    .creator-rating {
      display: flex;
      align-items: center;
      
      .rating-value {
        font-size: 28rpx;
        color: #333333;
        margin-right: 4rpx;
      }
      
      .rating-icon {
        font-size: 28rpx;
        color: #fadb14;
      }
    }
  }
}

// 操作按钮
.action-buttons {
  display: flex;
  padding: 20rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
  gap: 20rpx;
  
  .action-btn {
    flex: 1;
    height: 64rpx;
    border: none;
    border-radius: 8rpx;
    font-size: 26rpx;
    font-weight: 600;
    
    &.join-btn {
      background-color: #ff6b35;
      color: #ffffff;
    }
    
    &.detail-btn {
      background-color: #f5f5f5;
      color: #666666;
    }
    
    &.contact-btn {
      background-color: #1890ff;
      color: #ffffff;
    }
  }
}

// 倒计时
.countdown {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  background-color: #fff7e6;
  border-top: 1rpx solid #ffe58f;
  
  .countdown-label {
    font-size: 24rpx;
    color: #fa8c16;
  }
  
  .countdown-time {
    font-size: 28rpx;
    font-weight: 600;
    color: #fa8c16;
    font-family: 'Courier New', monospace;
  }
}

// 列表模式样式调整
.sharing-card.list-mode {
  .venue-info {
    padding: 20rpx;
    
    .venue-image {
      width: 80rpx;
      height: 80rpx;
    }
    
    .venue-details {
      .venue-name {
        font-size: 28rpx;
      }
      
      .venue-location,
      .venue-type {
        font-size: 22rpx;
      }
    }
  }
  
  .sharing-info {
    padding: 20rpx;
    
    .time-info {
      margin-bottom: 16rpx;
    }
    
    .team-info {
      margin-bottom: 16rpx;
    }
    
    .creator-info {
      padding-top: 16rpx;
      
      .creator-avatar {
        width: 48rpx;
        height: 48rpx;
      }
      
      .creator-name {
        font-size: 24rpx;
      }
    }
  }
}
</style>