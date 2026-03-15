<template>
  <view class="success-container">
    <!-- 成功图标 -->
    <view class="success-icon-container">
      <view class="success-icon">✅</view>
      <text class="success-title">支付成功</text>
      <text class="success-subtitle">您的订单已支付完成</text>
    </view>

    <!-- 订单信息 -->
    <view class="order-info" v-if="orderInfo">
      <view class="info-item">
        <text class="info-label">订单号</text>
        <text class="info-value">{{ orderInfo.orderNo }}</text>
      </view>
      <view class="info-item">
        <text class="info-label">支付金额</text>
        <text class="info-value amount">¥{{ getPaymentAmount() }}</text>
      </view>
      <view class="info-item">
        <text class="info-label">场馆名称</text>
        <text class="info-value">{{ orderInfo.venueName }}</text>
      </view>
      <view class="info-item">
        <text class="info-label">预约时间</text>
        <text class="info-value">{{ formatOrderDateTime() }}</text>
      </view>
      <view class="info-item">
        <text class="info-label">支付时间</text>
        <text class="info-value">{{ formatPaymentTime() }}</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <button class="btn btn-secondary" @click="viewOrder">{{ getViewOrderText() }}</button>
      <button class="btn btn-primary" @click="goHome">{{ getGoHomeText() }}</button>
    </view>

    <!-- 温馨提示 -->
    <view class="tips">
      <text class="tips-title">温馨提示</text>
      <text class="tips-text">• 请按时到达场馆，凭订单号入场</text>
      <text class="tips-text">• 如需取消或修改，请提前联系客服</text>
      <text class="tips-text">• 预约时间前30分钟可免费取消</text>
    </view>
  </view>
</template>

<script>
import { getOrderDetail } from '@/api/payment.js'
import { get, clearCache } from '@/utils/request.js'
import { useAdminOrdersStore } from '@/stores/admin-orders.js'
// 已移除popup-protection相关导入

export default {
  name: 'PaymentSuccess',
  data() {
    return {
      orderInfo: null,
      orderId: null,
      fromPage: '' // 来源页面
    }
  },
  
  onLoad(options) {
    this.orderId = options.orderId
    this.fromPage = options.from || '' // 记录来源页面
    this.notifyAdminOrdersNeedRefresh()

    if (this.orderId) {
      this.loadOrderInfo()
    } else {
      // 如果没有订单ID，显示默认信息
      this.orderInfo = {
        orderNo: '未知订单',
        totalPrice: 0,
        venueName: '未知场馆',
        bookingDate: new Date().toISOString().split('T')[0],
        startTime: '00:00',
        endTime: '00:00'
      }
    }
  },
  
  methods: {
    notifyAdminOrdersNeedRefresh() {
      clearCache('/admin/bookings')
      clearCache('/admin/dashboard/stats')
      try {
        const adminOrdersStore = useAdminOrdersStore()
        adminOrdersStore.needRefresh = true
      } catch {}
    },

    // 加载订单信息
    async loadOrderInfo() {
      try {
        uni.showLoading({ title: '加载中...' })

        // 检查是否是虚拟订单（负数ID）
        const isVirtualOrder = this.orderId < 0

        let response
        if (isVirtualOrder) {
          // 虚拟订单：使用申请ID调用虚拟订单API
          const requestId = Math.abs(this.orderId) // 转换为正数
          response = await get(`/users/me/virtual-order/${requestId}`)
        } else {
          // 真实订单：使用原有API
          response = await getOrderDetail(this.orderId)
        }

        if (response && response.data) {
          this.orderInfo = response.data

          // 如果是虚拟订单，添加特殊标识
          if (isVirtualOrder) {
            this.orderInfo.isVirtualOrder = true
          }
        } else if (response) {
          // 如果response直接是订单数据
          this.orderInfo = response
          if (isVirtualOrder) {
            this.orderInfo.isVirtualOrder = true
          }
        } else {
          throw new Error('未获取到订单数据')
        }

        uni.hideLoading()
      } catch (error) {
        uni.hideLoading()
        console.error('加载订单信息失败:', error)

        // 设置默认订单信息，避免页面空白
        this.orderInfo = {
          orderNo: `ORD${Date.now()}`,
          totalPrice: 0,
          paymentAmount: 0,
          venueName: '体育场馆',
          bookingDate: new Date().toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '10:00',
          isVirtualOrder: this.orderId < 0
        }

        uni.showToast({
          title: '加载订单信息失败，显示默认信息',
          icon: 'none',
          duration: 2000
        })
      }
    },
    
    // 格式化订单时间（兼容虚拟订单和普通订单）
    formatOrderDateTime() {
      if (!this.orderInfo) return '未知时间'

      // 虚拟订单使用 bookingTime 和 endTime (LocalDateTime格式)
      if (this.orderInfo.isVirtualOrder || this.orderInfo.bookingTime) {
        const startTime = this.orderInfo.bookingTime
        const endTime = this.orderInfo.endTime

        if (!startTime) return '未设置'

        try {
          // 处理LocalDateTime格式，转换为iOS兼容格式
          let startDateTime, endDateTime

          if (typeof startTime === 'string') {
            const isoTime = startTime.replace(' ', 'T')
            startDateTime = new Date(isoTime)
          } else {
            startDateTime = new Date(startTime)
          }

          if (endTime) {
            if (typeof endTime === 'string') {
              const isoEndTime = endTime.replace(' ', 'T')
              endDateTime = new Date(isoEndTime)
            } else {
              endDateTime = new Date(endTime)
            }
          }

          // 检查日期是否有效
          if (isNaN(startDateTime.getTime())) {
            console.error('无效的开始时间:', startTime)
            return '时间格式错误'
          }

          const dateStr = startDateTime.toLocaleDateString('zh-CN', {
            month: '2-digit',
            day: '2-digit'
          })
          const startTimeStr = startDateTime.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })

          let result = `${dateStr} ${startTimeStr}`

          if (endDateTime && !isNaN(endDateTime.getTime())) {
            const endTimeStr = endDateTime.toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })
            result += `-${endTimeStr}`
          }

          return result
        } catch (error) {
          console.error('时间格式化错误:', error)
          return '时间格式错误'
        }
      }

      // 普通订单使用 bookingDate, startTime, endTime
      return this.formatDateTime(this.orderInfo.bookingDate, this.orderInfo.startTime, this.orderInfo.endTime)
    },

    // 格式化日期时间（普通订单）
    formatDateTime(date, startTime, endTime) {
      if (!date || !startTime) return '未知时间'

      const dateStr = new Date(date).toLocaleDateString('zh-CN')
      const start = startTime.substring(0, 5)
      const end = endTime ? endTime.substring(0, 5) : ''

      return `${dateStr} ${start}${end ? '-' + end : ''}`
    },
    
    // 格式化支付时间
    formatPaymentTime() {
      return new Date().toLocaleString('zh-CN')
    },

    // 获取查看订单按钮文本
    getViewOrderText() {
      if (this.fromPage === 'sharing-manage') {
        return '返回管理'
      } else if (this.fromPage === 'sharing-list' || this.fromPage === 'sharing-detail') {
        return '查看预约'
      } else {
        return '查看订单'
      }
    },

    // 获取返回按钮文本
    getGoHomeText() {
      if (this.fromPage === 'sharing-list') {
        return '返回拼场'
      } else if (this.fromPage === 'sharing-detail') {
        return '返回拼场'
      } else if (this.fromPage === 'sharing-manage') {
        return '返回上页'
      } else {
        return '返回首页'
      }
    },
    
    // 查看订单
    viewOrder() {
      if (this.orderId) {
        // 发送支付成功事件通知相关页面刷新数据
        uni.$emit('paymentSuccess', {
          orderId: this.orderId,
          fromPage: this.fromPage,
          type: this.fromPage?.includes('sharing') ? 'sharing' : 'booking',
          timestamp: Date.now(),
          preventAutoPopup: true // 添加标识防止自动弹窗
        })
        
        // 根据来源页面决定跳转目标
        if (this.fromPage === 'sharing-manage') {
          // 从拼场管理页面来的，跳转到我的预约页面查看订单
          uni.switchTab({
            url: '/pages/booking/list'
          })
        } else if (this.fromPage === 'sharing-list' || this.fromPage === 'sharing-detail') {
          // 从拼场相关页面来的，跳转到我的预约页面
          uni.switchTab({
            url: '/pages/booking/list'
          })
        } else {
          // 默认跳转到订单详情
          uni.navigateTo({
            url: `/pages/booking/detail?id=${this.orderId}`
          })
        }
      }
    },

    // 返回首页
    goHome() {
      // 发送支付成功事件通知相关页面刷新数据
      uni.$emit('paymentSuccess', {
        orderId: this.orderId,
        fromPage: this.fromPage,
        type: this.fromPage?.includes('sharing') ? 'sharing' : 'booking',
        timestamp: Date.now(),
        preventAutoPopup: true // 添加标识防止自动弹窗
      })
      
      // 根据来源页面智能跳转
      if (this.fromPage === 'sharing-manage') {
        // 从拼场管理页面来的，返回拼场管理页面
        uni.navigateBack()
      } else if (this.fromPage === 'sharing-list') {
        // 从拼场列表来的，返回拼场列表
        uni.switchTab({
          url: '/pages/sharing/list'
        })
      } else if (this.fromPage === 'sharing-detail') {
        // 从拼场详情来的，返回拼场列表
        uni.switchTab({
          url: '/pages/sharing/list'
        })
      } else {
        // 默认返回首页
        uni.switchTab({
          url: '/pages/index/index'
        })
      }
    },

    // 获取支付金额（兼容虚拟订单和普通订单）
    getPaymentAmount() {
      if (!this.orderInfo) return '0.00'

      // 虚拟订单使用 paymentAmount，普通订单使用 totalPrice
      const amount = this.orderInfo.isVirtualOrder
        ? this.orderInfo.paymentAmount
        : this.orderInfo.totalPrice

      return amount?.toFixed(2) || '0.00'
    }
  }
}
</script>

<style scoped>
.success-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.success-icon-container {
  text-align: center;
  margin-bottom: 60rpx;
}

.success-icon {
  font-size: 120rpx;
  margin-bottom: 20rpx;
}

.success-title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: white;
  margin-bottom: 10rpx;
}

.success-subtitle {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.order-info {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 40rpx;
  width: 100%;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.1);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 28rpx;
  color: #666;
}

.info-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.info-value.amount {
  color: #ff6b35;
  font-weight: bold;
  font-size: 32rpx;
}

.action-buttons {
  display: flex;
  gap: 20rpx;
  width: 100%;
  margin-bottom: 40rpx;
}

.btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 500;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-primary {
  background: #ff6b35;
  color: white;
}

.btn-secondary {
  background: white;
  color: #ff6b35;
  border: 2rpx solid #ff6b35;
}

.tips {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  padding: 30rpx;
  width: 100%;
}

.tips-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: white;
  margin-bottom: 20rpx;
}

.tips-text {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin-bottom: 10rpx;
}
</style>
