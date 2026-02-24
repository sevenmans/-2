<template>
  <view class="booking-card" @click="handleCardClick">
    <!-- 预约状态标签 -->
    <view class="status-badge" :class="`status-${booking.status.toLowerCase()}`">
      <text class="status-text">{{ getStatusText(booking.status) }}</text>
    </view>
    
    <!-- 场馆信息 -->
    <view class="venue-info">
      <image 
        :src="booking.venue.image || '/static/images/default-venue.png'" 
        class="venue-image"
        mode="aspectFill"
      />
      <view class="venue-details">
        <text class="venue-name">{{ booking.venue.name }}</text>
        <text class="venue-location">{{ booking.venue.location }}</text>
        <text class="venue-type">{{ booking.venue.type }}</text>
      </view>
    </view>
    
    <!-- 预约信息 -->
    <view class="booking-info">
      <view class="info-row">
        <text class="info-label">订单号</text>
        <text class="info-value">{{ booking.orderNo }}</text>
      </view>
      
      <view class="info-row">
        <text class="info-label">预约时间</text>
        <text class="info-value">
          {{ formatDate(booking.bookingDate) }} {{ booking.startTime }}-{{ booking.endTime }}
        </text>
      </view>
      
      <view class="info-row">
        <text class="info-label">预约类型</text>
        <view class="booking-type-container">
          <text class="info-value booking-type" :class="getBookingTypeClass(booking.bookingType)">
            {{ getBookingTypeText(booking.bookingType) }}
          </text>
          <view v-if="booking.bookingType === 'SHARED'" class="shared-badge">
            <text class="shared-badge-text">拼场</text>
          </view>
        </view>
      </view>
      
      <!-- 拼场信息 -->
      <view class="info-row" v-if="booking.bookingType === 'SHARED' && booking.teamName">
        <text class="info-label">队伍名称</text>
        <text class="info-value">{{ booking.teamName }}</text>
      </view>
      
      <!-- 参与人数 -->
      <view class="info-row" v-if="booking.bookingType === 'SHARED'">
        <text class="info-label">参与人数</text>
        <text class="info-value">
          {{ booking.currentParticipants || 1 }}/{{ booking.maxParticipants || 1 }}人
        </text>
      </view>
      
      <view class="info-row">
        <text class="info-label">总费用</text>
        <text class="info-value price">¥{{ booking.totalAmount }}</text>
      </view>
    </view>
    
    <!-- 操作按钮 -->
    <view class="action-buttons" v-if="showActions">
      <!-- 取消预约 -->
      <button 
        class="action-btn cancel-btn"
        v-if="canCancel"
        @click.stop="handleCancel"
      >
        取消预约
      </button>
      
      <!-- 支付按钮 -->
      <button 
        class="action-btn pay-btn"
        v-if="canPay"
        @click.stop="handlePay"
      >
        立即支付
      </button>
      

      
      <!-- 评价按钮 -->
      <button 
        class="action-btn review-btn"
        v-if="canReview"
        @click.stop="handleReview"
      >
        评价场馆
      </button>
      
      <!-- 再次预约 -->
      <button 
        class="action-btn rebook-btn"
        v-if="canRebook"
        @click.stop="handleRebook"
      >
        再次预约
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
  name: 'BookingCard',
  
  props: {
    // 预约数据
    booking: {
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
    }
  },
  
  data() {
    return {
      countdownTimer: null,
      remainingTime: 0
    }
  },
  
  computed: {
    // 是否可以取消
    canCancel() {
      return ['PENDING', 'CONFIRMED'].includes(this.booking.status)
    },
    
    // 是否可以支付
    canPay() {
      return this.booking.status === 'PENDING'
    },
    

    
    // 是否可以评价
    canReview() {
      return this.booking.status === 'COMPLETED' && !this.booking.reviewed
    },
    
    // 是否可以再次预约
    canRebook() {
      return ['COMPLETED', 'CANCELLED'].includes(this.booking.status)
    },
    
    // 倒计时标签
    countdownLabel() {
      if (this.booking.status === 'PENDING') {
        return '支付剩余时间'
      } else if (this.booking.status === 'CONFIRMED') {
        return '距离开始时间'
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
        'PENDING': '待支付',
        'CONFIRMED': '已确认',
        'COMPLETED': '已完成',
        'CANCELLED': '已取消',
        'EXPIRED': '已过期'
      }
      return statusMap[status] || status
    },
    
    // 卡片点击
    handleCardClick() {
      this.$emit('click', this.booking)
    },
    
    // 取消预约
    handleCancel() {
      uni.showModal({
        title: '确认取消',
        content: '确定要取消这个预约吗？',
        success: (res) => {
          if (res.confirm) {
            this.$emit('cancel', this.booking)
          }
        }
      })
    },
    
    // 支付
    handlePay() {
      this.$emit('pay', this.booking)
    },
    

    
    // 评价
    handleReview() {
      this.$emit('review', this.booking)
    },
    
    // 再次预约
    handleRebook() {
      this.$emit('rebook', this.booking)
    },
    
    // 获取预约类型文本
    getBookingTypeText(bookingType) {
      const typeMap = {
        'EXCLUSIVE': '包场',
        'SHARED': '拼场'
      }
      return typeMap[bookingType] || '--'
    },
    
    // 获取预约类型样式类
    getBookingTypeClass(bookingType) {
      const classMap = {
        'EXCLUSIVE': 'booking-type-exclusive',
        'SHARED': 'booking-type-shared'
      }
      return classMap[bookingType] || ''
    },
    
    // 开始倒计时
    startCountdown() {
      this.calculateRemainingTime()
      
      this.countdownTimer = setInterval(() => {
        this.remainingTime--
        
        if (this.remainingTime <= 0) {
          this.clearCountdown()
          this.$emit('countdown-end', this.booking)
        }
      }, 1000)
    },
    
    // 计算剩余时间
    calculateRemainingTime() {
      const now = new Date().getTime()
      let targetTime
      
      if (this.booking.status === 'PENDING') {
        // 支付倒计时：创建时间 + 30分钟
        targetTime = new Date(this.booking.createdAt).getTime() + 30 * 60 * 1000
      } else if (this.booking.status === 'CONFIRMED') {
        // 开始倒计时：预约开始时间
        const bookingDateTime = `${this.booking.bookingDate} ${this.booking.startTime}`
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
.booking-card {
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
  
  &.status-pending {
    background-color: #fff7e6;
    
    .status-text {
      color: #fa8c16;
    }
  }
  
  &.status-confirmed {
    background-color: #f6ffed;
    
    .status-text {
      color: #52c41a;
    }
  }
  
  &.status-completed {
    background-color: #e6f7ff;
    
    .status-text {
      color: #1890ff;
    }
  }
  
  &.status-cancelled {
    background-color: #fff2f0;
    
    .status-text {
      color: #ff4d4f;
    }
  }
  
  &.status-expired {
    background-color: #f5f5f5;
    
    .status-text {
      color: #999999;
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

// 预约信息
.booking-info {
  padding: 30rpx;
  
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .info-label {
      font-size: 28rpx;
      color: #666666;
    }
    
    .info-value {
      font-size: 28rpx;
      color: #333333;
      text-align: right;
      flex: 1;
      margin-left: 20rpx;
      
      &.price {
        font-size: 32rpx;
        font-weight: 600;
        color: #ff6b35;
      }
      
      &.booking-type {
        padding: 6rpx 12rpx;
        border-radius: 16rpx;
        font-size: 24rpx;
        font-weight: 500;
        
        &.booking-type-exclusive {
          background-color: #e6f7ff;
          color: #1890ff;
        }
        
        &.booking-type-shared {
          background-color: #fff7e6;
          color: #fa8c16;
        }
      }
    }
    
    .booking-type-container {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12rpx;
      flex: 1;
      margin-left: 20rpx;
    }
    
    .shared-badge {
      padding: 4rpx 8rpx;
      background-color: #ff4d4f;
      border-radius: 12rpx;
      
      .shared-badge-text {
        font-size: 20rpx;
        color: #ffffff;
        font-weight: 600;
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
    
    &.cancel-btn {
      background-color: #f5f5f5;
      color: #666666;
    }
    
    &.pay-btn {
      background-color: #ff6b35;
      color: #ffffff;
    }
    
    &.sharing-btn {
      background-color: #1890ff;
      color: #ffffff;
    }
    
    &.review-btn {
      background-color: #52c41a;
      color: #ffffff;
    }
    
    &.rebook-btn {
      background-color: #722ed1;
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
.booking-card.list-mode {
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
  
  .booking-info {
    padding: 20rpx;
    
    .info-row {
      margin-bottom: 12rpx;
      
      .info-label,
      .info-value {
        font-size: 24rpx;
      }
      
      .info-value.price {
        font-size: 28rpx;
      }
    }
  }
}
</style>