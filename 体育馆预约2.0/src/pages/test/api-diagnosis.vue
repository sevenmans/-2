<template>
  <view class="container">
    <view class="header">
      <text class="title">🔍 API诊断工具</text>
      <text class="subtitle">专门用于排查Pinia迁移中的API问题</text>
    </view>

    <!-- API测试按钮 -->
    <view class="test-section">
      <text class="section-title">🌐 API连通性测试</text>
      
      <button class="test-btn" @click="testBookingApis" :disabled="testing">
        测试Booking APIs
      </button>
      
      <button class="test-btn" @click="testSharingApis" :disabled="testing">
        测试Sharing APIs
      </button>
      
      <button class="test-btn" @click="testUserApis" :disabled="testing">
        测试User APIs
      </button>
      
      <button class="test-btn" @click="testAllApis" :disabled="testing">
        测试所有APIs
      </button>
    </view>

    <!-- 测试结果 -->
    <view class="results-section">
      <text class="section-title">📊 测试结果</text>
      <view class="log-container">
        <view v-for="(log, index) in logs" :key="index" :class="['log-item', log.type]">
          <text class="log-text">{{ log.message }}</text>
          <text class="log-time">{{ log.time }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useBookingStore } from '@/stores/booking.js'
import { useSharingStore } from '@/stores/sharing.js'
import { useUserStore } from '@/stores/user.js'

export default {
  name: 'ApiDiagnosis',
  data() {
    return {
      testing: false,
      logs: []
    }
  },
  
  setup() {
    const bookingStore = useBookingStore()
    const sharingStore = useSharingStore()
    const userStore = useUserStore()
    
    return {
      bookingStore,
      sharingStore,
      userStore
    }
  },

  methods: {
    addLog(type, message) {
      this.logs.push({
        type,
        message,
        time: new Date().toLocaleTimeString()
      })
      console.log(`[API诊断] ${type.toUpperCase()}: ${message}`)
    },

    clearLogs() {
      this.logs = []
    },

    // 测试Booking APIs
    async testBookingApis() {
      this.testing = true
      this.addLog('info', '🔍 开始测试Booking APIs...')

      try {
        // 测试API方法存在性
        const bookingApiMethods = [
          'createBooking', 'getBookingDetail', 'createSharedBooking',
          'cancelBooking', 'getUserBookings', 'getSharingOrdersList',
          'getVenueAvailableSlots', 'applySharedBooking'
        ]
        
        for (const method of bookingApiMethods) {
          if (typeof this.bookingStore[method] === 'function') {
            this.addLog('success', `✅ bookingStore.${method}: 方法存在`)
          } else {
            this.addLog('error', `❌ bookingStore.${method}: 方法不存在或类型错误`)
          }
        }

        // 测试实际API调用（使用安全的测试数据）
        try {
          this.addLog('info', '测试getUserBookings API调用...')
          await this.bookingStore.getUserBookings({ page: 1, pageSize: 1 })
          this.addLog('success', '✅ getUserBookings API调用成功')
        } catch (error) {
          this.addLog('error', `❌ getUserBookings API调用失败: ${error.message}`)
        }

        this.addLog('success', '🎉 Booking APIs测试完成')
      } catch (error) {
        this.addLog('error', `Booking APIs测试失败: ${error.message}`)
      } finally {
        this.testing = false
      }
    },

    // 测试Sharing APIs
    async testSharingApis() {
      this.testing = true
      this.addLog('info', '🔍 开始测试Sharing APIs...')

      try {
        // 测试API方法存在性
        const sharingApiMethods = [
          'getSharingOrdersList', 'getOrderDetail', 'createOrder', 
          'handleRequest', 'applyJoinSharingOrder', 'confirmSharingOrder'
        ]
        
        for (const method of sharingApiMethods) {
          if (typeof this.sharingStore[method] === 'function') {
            this.addLog('success', `✅ sharingStore.${method}: 方法存在`)
          } else {
            this.addLog('error', `❌ sharingStore.${method}: 方法不存在或类型错误`)
          }
        }

        // 测试实际API调用
        try {
          this.addLog('info', '测试getSharingOrdersList API调用...')
          await this.sharingStore.getSharingOrdersList({ page: 1, pageSize: 1 })
          this.addLog('success', '✅ getSharingOrdersList API调用成功')
        } catch (error) {
          this.addLog('error', `❌ getSharingOrdersList API调用失败: ${error.message}`)
        }

        this.addLog('success', '🎉 Sharing APIs测试完成')
      } catch (error) {
        this.addLog('error', `Sharing APIs测试失败: ${error.message}`)
      } finally {
        this.testing = false
      }
    },

    // 测试User APIs
    async testUserApis() {
      this.testing = true
      this.addLog('info', '🔍 开始测试User APIs...')

      try {
        // 测试API方法存在性
        const userApiMethods = [
          'login', 'logout', 'getUserInfo', 'updateUserInfo', 'register'
        ]
        
        for (const method of userApiMethods) {
          if (typeof this.userStore[method] === 'function') {
            this.addLog('success', `✅ userStore.${method}: 方法存在`)
          } else {
            this.addLog('error', `❌ userStore.${method}: 方法不存在或类型错误`)
          }
        }

        // 测试实际API调用
        try {
          this.addLog('info', '测试getUserInfo API调用...')
          await this.userStore.getUserInfo()
          this.addLog('success', '✅ getUserInfo API调用成功')
        } catch (error) {
          this.addLog('error', `❌ getUserInfo API调用失败: ${error.message}`)
        }

        this.addLog('success', '🎉 User APIs测试完成')
      } catch (error) {
        this.addLog('error', `User APIs测试失败: ${error.message}`)
      } finally {
        this.testing = false
      }
    },

    // 测试所有APIs
    async testAllApis() {
      this.testing = true
      this.clearLogs()
      this.addLog('info', '🚀 开始全面API测试...')

      try {
        await this.testBookingApis()
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        await this.testSharingApis()
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        await this.testUserApis()
        
        this.addLog('success', '🎉 全面API测试完成！')
      } catch (error) {
        this.addLog('error', `全面API测试失败: ${error.message}`)
      } finally {
        this.testing = false
      }
    }
  }
}
</script>

<style scoped>
.container {
  padding: 40rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 60rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
}

.subtitle {
  font-size: 28rpx;
  color: #666;
  display: block;
}

.test-section {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 30rpx;
}

.test-btn {
  width: 100%;
  height: 80rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 40rpx;
  font-size: 28rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.test-btn:disabled {
  background: #ccc;
}

.results-section {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
}

.log-container {
  max-height: 800rpx;
  overflow-y: auto;
}

.log-item {
  padding: 20rpx;
  margin-bottom: 10rpx;
  border-radius: 10rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-item.info {
  background-color: #e3f2fd;
  border-left: 4rpx solid #2196f3;
}

.log-item.success {
  background-color: #e8f5e8;
  border-left: 4rpx solid #4caf50;
}

.log-item.error {
  background-color: #ffebee;
  border-left: 4rpx solid #f44336;
}

.log-text {
  font-size: 26rpx;
  flex: 1;
}

.log-time {
  font-size: 22rpx;
  color: #999;
  margin-left: 20rpx;
}
</style>
