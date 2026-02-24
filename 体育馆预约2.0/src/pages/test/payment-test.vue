<template>
  <view class="payment-test-container">
    <view class="header">
      <text class="title">支付功能测试</text>
      <text class="subtitle">验证所有订单类型都能正常支付</text>
    </view>

    <!-- 测试订单列表 -->
    <view class="test-orders">
      <view class="section-title">测试订单</view>
      
      <view v-for="order in testOrders" :key="order.id" class="order-card">
        <view class="order-header">
          <text class="order-no">{{ order.orderNo }}</text>
          <view class="order-type" :class="getTypeClass(order.bookingType)">
            {{ getTypeText(order.bookingType) }}
          </view>
        </view>
        
        <view class="order-info">
          <text class="venue-name">{{ order.venueName }}</text>
          <text class="booking-time">{{ order.bookingDate }} {{ order.startTime }}-{{ order.endTime }}</text>
          <text class="price">¥{{ order.totalPrice }}</text>
        </view>
        
        <view class="order-status">
          <text class="status-text" :class="getStatusClass(order.status)">
            {{ getStatusText(order.status) }}
          </text>
        </view>
        
        <view class="order-actions">
          <!-- 支付按钮 - 所有PENDING状态的订单都应该显示 -->
          <button 
            v-if="order.status === 'PENDING'" 
            class="action-btn pay-btn" 
            @click="testPayment(order)"
          >
            立即支付
          </button>
          
          <button 
            v-else 
            class="action-btn disabled-btn" 
            disabled
          >
            {{ order.status === 'PAID' ? '已支付' : '不可支付' }}
          </button>
        </view>
      </view>
    </view>

    <!-- 测试结果 -->
    <view class="test-results">
      <view class="section-title">测试结果</view>
      <view v-for="result in testResults" :key="result.id" class="result-item">
        <text class="result-order">{{ result.orderNo }}</text>
        <text class="result-status" :class="result.success ? 'success' : 'error'">
          {{ result.success ? '✅ 支付成功' : '❌ 支付失败' }}
        </text>
        <text class="result-message">{{ result.message }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { payOrder } from '@/api/payment.js'

export default {
  name: 'PaymentTest',
  data() {
    return {
      testOrders: [
        {
          id: 1,
          orderNo: 'TEST001',
          bookingType: 'EXCLUSIVE',
          venueName: '篮球场A',
          bookingDate: '2025-01-15',
          startTime: '09:00',
          endTime: '10:00',
          totalPrice: 100,
          status: 'PENDING'
        },
        {
          id: 2,
          orderNo: 'TEST002',
          bookingType: 'SHARED',
          venueName: '羽毛球场B',
          bookingDate: '2025-01-15',
          startTime: '14:00',
          endTime: '15:00',
          totalPrice: 50,
          status: 'PENDING'
        },
        {
          id: 3,
          orderNo: 'TEST003',
          bookingType: 'EXCLUSIVE',
          venueName: '网球场C',
          bookingDate: '2025-01-15',
          startTime: '16:00',
          endTime: '17:00',
          totalPrice: 150,
          status: 'PAID'
        },
        {
          id: 4,
          orderNo: 'TEST004',
          bookingType: 'SHARED',
          venueName: '乒乓球场D',
          bookingDate: '2025-01-15',
          startTime: '19:00',
          endTime: '20:00',
          totalPrice: 30,
          status: 'PENDING'
        }
      ],
      testResults: []
    }
  },
  
  methods: {
    // 测试支付功能
    async testPayment(order) {
      try {
        uni.showLoading({ title: '测试支付中...' })
        
        // 模拟支付API调用
        const response = await payOrder(order.id)
        
        // 更新订单状态
        order.status = 'PAID'
        
        // 记录测试结果
        this.testResults.push({
          id: Date.now(),
          orderNo: order.orderNo,
          success: true,
          message: `${this.getTypeText(order.bookingType)}订单支付成功`
        })
        
        uni.hideLoading()
        uni.showToast({
          title: '支付测试成功',
          icon: 'success'
        })
        
      } catch (error) {
        console.error('支付测试失败:', error)
        
        // 记录测试结果
        this.testResults.push({
          id: Date.now(),
          orderNo: order.orderNo,
          success: false,
          message: `支付失败: ${error.message || '未知错误'}`
        })
        
        uni.hideLoading()
        uni.showToast({
          title: '支付测试失败',
          icon: 'error'
        })
      }
    },
    
    // 获取订单类型文本
    getTypeText(bookingType) {
      const typeMap = {
        'EXCLUSIVE': '独享',
        'SHARED': '拼场'
      }
      return typeMap[bookingType] || '普通'
    },
    
    // 获取订单类型样式
    getTypeClass(bookingType) {
      const classMap = {
        'EXCLUSIVE': 'type-exclusive',
        'SHARED': 'type-shared'
      }
      return classMap[bookingType] || 'type-normal'
    },
    
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        'PENDING': '待支付',
        'PAID': '已支付',
        'CONFIRMED': '已确认',
        'SHARING': '拼场中',
        'SHARING_SUCCESS': '拼场成功',
        'COMPLETED': '已完成',
        'CANCELLED': '已取消',
        'EXPIRED': '已过期'
      }
      return statusMap[status] || '未知状态'
    },
    
    // 获取状态样式
    getStatusClass(status) {
      const classMap = {
        'PENDING': 'status-pending',
        'PAID': 'status-paid',
        'CONFIRMED': 'status-confirmed',
        'SHARING': 'status-sharing',
        'COMPLETED': 'status-completed',
        'CANCELLED': 'status-cancelled'
      }
      return classMap[status] || 'status-default'
    }
  }
}
</script>

<style scoped>
.payment-test-container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: #666;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin: 30rpx 0 20rpx 0;
}

.order-card {
  background: white;
  border-radius: 12rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.order-no {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.order-type {
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: white;
}

.type-exclusive {
  background-color: #007aff;
}

.type-shared {
  background-color: #ff9500;
}

.type-normal {
  background-color: #8e8e93;
}

.order-info {
  margin-bottom: 20rpx;
}

.venue-name {
  display: block;
  font-size: 30rpx;
  color: #333;
  margin-bottom: 10rpx;
}

.booking-time {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.price {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #ff6b35;
}

.order-status {
  margin-bottom: 20rpx;
}

.status-text {
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: white;
}

.status-pending {
  background-color: #ff9500;
}

.status-paid {
  background-color: #34c759;
}

.status-confirmed {
  background-color: #007aff;
}

.status-sharing {
  background-color: #ff9500;
}

.order-actions {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 500;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pay-btn {
  background-color: #ff6b35;
  color: white;
}

.disabled-btn {
  background-color: #e0e0e0;
  color: #999;
}

.test-results {
  margin-top: 40rpx;
}

.result-item {
  background: white;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 15rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-order {
  font-size: 26rpx;
  color: #333;
}

.result-status {
  font-size: 26rpx;
  font-weight: bold;
}

.result-status.success {
  color: #34c759;
}

.result-status.error {
  color: #ff3b30;
}

.result-message {
  font-size: 24rpx;
  color: #666;
}
</style>
