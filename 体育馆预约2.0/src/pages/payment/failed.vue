<template>
  <view class="failed-container">
    <!-- 失败图标 -->
    <view class="failed-icon-container">
      <view class="failed-icon">❌</view>
      <text class="failed-title">支付失败</text>
      <text class="failed-subtitle">{{ failureReason || '支付过程中出现问题' }}</text>
    </view>

    <!-- 订单信息 -->
    <view class="order-info" v-if="orderInfo">
      <view class="info-item">
        <text class="info-label">订单号</text>
        <text class="info-value">{{ orderInfo.orderNo }}</text>
      </view>
      <view class="info-item">
        <text class="info-label">订单金额</text>
        <text class="info-value amount">¥{{ orderInfo.totalPrice }}</text>
      </view>
      <view class="info-item">
        <text class="info-label">场馆名称</text>
        <text class="info-value">{{ orderInfo.venueName }}</text>
      </view>
      <view class="info-item">
        <text class="info-label">预约时间</text>
        <text class="info-value">{{ formatDateTime(orderInfo.bookingDate, orderInfo.startTime, orderInfo.endTime) }}</text>
      </view>
    </view>

    <!-- 失败原因 -->
    <view class="failure-reasons">
      <text class="reasons-title">可能的原因</text>
      <text class="reason-item">• 账户余额不足</text>
      <text class="reason-item">• 银行卡信息有误</text>
      <text class="reason-item">• 网络连接异常</text>
      <text class="reason-item">• 支付密码错误</text>
    </view>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <button class="btn btn-secondary" @click="goBack">返回订单</button>
      <button class="btn btn-primary" @click="retryPayment">重新支付</button>
    </view>

    <!-- 客服联系 -->
    <view class="contact-service">
      <text class="contact-title">需要帮助？</text>
      <view class="contact-buttons">
        <button class="contact-btn" @click="callService">
          <text class="contact-icon">📞</text>
          <text class="contact-text">联系客服</text>
        </button>
        <button class="contact-btn" @click="viewFAQ">
          <text class="contact-icon">❓</text>
          <text class="contact-text">常见问题</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import { getOrderDetail } from '@/api/payment.js'

export default {
  name: 'PaymentFailed',
  data() {
    return {
      orderInfo: null,
      orderId: null,
      failureReason: ''
    }
  },
  
  onLoad(options) {
    this.orderId = options.orderId
    this.failureReason = options.reason || '支付过程中出现问题'

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
    // 加载订单信息
    async loadOrderInfo() {
      try {
        uni.showLoading({ title: '加载中...' })
        const response = await getOrderDetail(this.orderId)

        if (response && response.data) {
          this.orderInfo = response.data
        } else if (response) {
          this.orderInfo = response
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
          venueName: '体育场馆',
          bookingDate: new Date().toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '10:00'
        }

        uni.showToast({
          title: '加载订单信息失败，显示默认信息',
          icon: 'none',
          duration: 2000
        })
      }
    },
    
    // 格式化日期时间
    formatDateTime(date, startTime, endTime) {
      if (!date || !startTime) return '未知时间'
      
      const dateStr = new Date(date).toLocaleDateString('zh-CN')
      const start = startTime.substring(0, 5)
      const end = endTime ? endTime.substring(0, 5) : ''
      
      return `${dateStr} ${start}${end ? '-' + end : ''}`
    },
    
    // 返回订单页面
    goBack() {
      uni.navigateBack()
    },
    
    // 重新支付
    retryPayment() {
      if (this.orderId) {
        uni.redirectTo({
          url: `/pages/payment/index?orderId=${this.orderId}`
        })
      }
    },
    
    // 联系客服
    callService() {
      uni.showModal({
        title: '联系客服',
        content: '客服电话：400-123-4567\n工作时间：9:00-18:00',
        showCancel: true,
        cancelText: '取消',
        confirmText: '拨打',
        success: (res) => {
          if (res.confirm) {
            uni.makePhoneCall({
              phoneNumber: '400-123-4567'
            })
          }
        }
      })
    },
    
    // 查看常见问题
    viewFAQ() {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    }
  }
}
</script>

<style scoped>
.failed-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  padding: 40rpx 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.failed-icon-container {
  text-align: center;
  margin-bottom: 60rpx;
}

.failed-icon {
  font-size: 120rpx;
  margin-bottom: 20rpx;
}

.failed-title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: white;
  margin-bottom: 10rpx;
}

.failed-subtitle {
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

.failure-reasons {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  padding: 30rpx;
  width: 100%;
  margin-bottom: 40rpx;
}

.reasons-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: white;
  margin-bottom: 20rpx;
}

.reason-item {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin-bottom: 10rpx;
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

.contact-service {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  padding: 30rpx;
  width: 100%;
}

.contact-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: white;
  margin-bottom: 20rpx;
  text-align: center;
}

.contact-buttons {
  display: flex;
  gap: 20rpx;
}

.contact-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.2);
  border: 1rpx solid rgba(255, 255, 255, 0.3);
  border-radius: 15rpx;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.contact-icon {
  font-size: 40rpx;
}

.contact-text {
  font-size: 24rpx;
  color: white;
}
</style>
