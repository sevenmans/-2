<template>
  <view v-if="showCountdown" class="countdown-container" :class="countdownClass">
    <view class="countdown-icon">⏰</view>
    <view class="countdown-content">
      <text class="countdown-label">{{ label }}</text>
      <text class="countdown-time">{{ countdownText }}</text>
    </view>
  </view>
</template>

<script>
import { 
  getSharingOrderCountdown, 
  shouldShowCountdown, 
  formatCountdownShort,
  getCountdownClass,
  createCountdownTimer,
  clearCountdownTimer
} from '@/utils/countdown.js'

export default {
  name: 'CountdownTimer',
  props: {
    // 订单对象
    order: {
      type: Object,
      required: true
    },
    // 显示标签
    label: {
      type: String,
      default: '自动取消'
    },
    // 是否使用简短格式
    short: {
      type: Boolean,
      default: false
    },
    // 更新间隔（毫秒）
    interval: {
      type: Number,
      default: 1000
    }
  },
  
  data() {
    return {
      countdown: null,
      timerId: null,
      showCountdown: false,
      countdownText: '',
      countdownClass: ''
    }
  },
  
  mounted() {
    console.log('CountdownTimer组件mounted，订单:', this.order?.orderNo)
    this.initCountdown()
  },
  
  beforeDestroy() {
    this.cleanup()
  },
  
  watch: {
    order: {
      handler() {
        this.initCountdown()
      },
      deep: true
    }
  },
  
  methods: {
    // 初始化倒计时
    initCountdown() {
      console.log('CountdownTimer初始化，订单:', this.order?.orderNo)
      this.cleanup()

      if (!shouldShowCountdown(this.order)) {
        this.showCountdown = false
        return
      }

      this.showCountdown = true
      // 立即执行一次计算，传入 true 表示初始化
      const isExpired = this.updateCountdown(true)

      // 如果没有过期，启动定时器
      if (!isExpired) {
        this.timerId = createCountdownTimer(() => {
          this.updateCountdown(false)
        }, this.interval)
      }
    },
    
    // 更新倒计时
    updateCountdown(isInit = false) {
      const countdownInfo = getSharingOrderCountdown(this.order)
      this.countdown = countdownInfo

      if (!countdownInfo.showCountdown) {
        this.showCountdown = false
        return false
      }

      // 更新显示文本
      if (this.short) {
        this.countdownText = formatCountdownShort(countdownInfo)
      } else {
        this.countdownText = countdownInfo.formatted
      }

      // 更新样式类
      this.countdownClass = getCountdownClass(countdownInfo)

      // 如果已过期，停止定时器
      if (countdownInfo.isExpired) {
        this.cleanup()
        
        // 🔥 关键修复：仅在非初始化阶段（即倒计时自然结束时）才触发过期事件
        // 防止初始化 -> 发现过期 -> 触发事件 -> 刷新列表 -> 组件重载 -> 初始化 -> 循环
        if (!isInit) {
          // 触发过期事件
          this.$emit('expired', this.order)
          
          // 🔥 新增：触发全局订单过期事件，通知其他页面更新状态
          if (this.order) {
            console.log('[CountdownTimer] 触发全局订单过期事件:', this.order.orderNo)
            uni.$emit('order-expired', {
              orderId: this.order.id,
              orderNo: this.order.orderNo,
              venueId: this.order.venueId,
              date: this.order.bookingDate,
              timeSlotIds: this.order.timeSlotIds || [],
              orderType: this.order.bookingType || 'EXCLUSIVE'
            })
          }
        } else {
          console.log('[CountdownTimer] 订单加载时已过期，跳过事件触发:', this.order?.orderNo)
        }
        
        return true
      }
      
      return false
    },
    
    // 清理资源
    cleanup() {
      if (this.timerId) {
        clearCountdownTimer(this.timerId)
        this.timerId = null
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.countdown-container {
  display: flex;
  align-items: center;
  padding: 8rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  
  .countdown-icon {
    margin-right: 6rpx;
    font-size: 24rpx;
  }
  
  .countdown-content {
    display: flex;
    flex-direction: column;
    
    .countdown-label {
      font-size: 18rpx;
      opacity: 0.8;
      margin-bottom: 2rpx;
    }
    
    .countdown-time {
      font-size: 20rpx;
      font-weight: bold;
    }
  }
  
  // 正常状态（绿色）
  &.countdown-normal {
    background-color: #f6ffed;
    border: 1rpx solid #b7eb8f;
    color: #52c41a;
    
    .countdown-icon {
      color: #52c41a;
    }
  }
  
  // 警告状态（橙色）
  &.countdown-warning {
    background-color: #fff7e6;
    border: 1rpx solid #ffd591;
    color: #fa8c16;
    
    .countdown-icon {
      color: #fa8c16;
    }
  }
  
  // 紧急状态（红色）
  &.countdown-urgent {
    background-color: #fff2f0;
    border: 1rpx solid #ffccc7;
    color: #ff4d4f;
    
    .countdown-icon {
      color: #ff4d4f;
    }
    
    // 紧急状态下闪烁效果
    animation: blink 1s infinite;
  }
  
  // 已过期状态（灰色）
  &.countdown-expired {
    background-color: #f5f5f5;
    border: 1rpx solid #d9d9d9;
    color: #999999;
    
    .countdown-icon {
      color: #999999;
    }
  }
}

// 闪烁动画
@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0.5;
  }
}

// 简化版本样式（用于列表页面）
.countdown-container.simple {
  padding: 4rpx 8rpx;
  font-size: 18rpx;
  
  .countdown-icon {
    font-size: 20rpx;
    margin-right: 4rpx;
  }
  
  .countdown-content {
    flex-direction: row;
    align-items: center;
    
    .countdown-label {
      margin-right: 4rpx;
      margin-bottom: 0;
    }
    
    .countdown-time {
      font-size: 18rpx;
    }
  }
}
</style>
