<template>
  <view class="container">
    <view class="header">
      <text class="title">🔧 快速修复验证</text>
      <text class="subtitle">验证刚刚修复的API方法</text>
    </view>

    <!-- 修复验证按钮 -->
    <view class="test-section">
      <text class="section-title">🚀 修复验证测试</text>
      
      <button class="test-btn success" @click="testFixedMethods" :disabled="testing">
        验证修复的方法
      </button>
      
      <button class="test-btn info" @click="testBookingStoreMethods" :disabled="testing">
        测试Booking Store方法
      </button>
      
      <button class="test-btn warning" @click="testUserStoreMethods" :disabled="testing">
        测试User Store方法
      </button>
    </view>

    <!-- 测试结果 -->
    <view class="results-section">
      <text class="section-title">📊 验证结果</text>
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
import { useUserStore } from '@/stores/user.js'

export default {
  name: 'QuickFixValidation',
  data() {
    return {
      testing: false,
      logs: []
    }
  },
  
  setup() {
    const bookingStore = useBookingStore()
    const userStore = useUserStore()
    
    return {
      bookingStore,
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
      console.log(`[快速修复验证] ${type.toUpperCase()}: ${message}`)
    },

    clearLogs() {
      this.logs = []
    },

    // 验证修复的方法
    async testFixedMethods() {
      this.testing = true
      this.clearLogs()
      this.addLog('info', '🔧 开始验证修复的方法...')

      try {
        // 验证Booking Store新增的方法
        this.addLog('info', '验证Booking Store新增方法...')
        
        const fixedBookingMethods = [
          'getVenueAvailableSlots',
          'applySharedBooking'
        ]
        
        for (const method of fixedBookingMethods) {
          if (typeof this.bookingStore[method] === 'function') {
            this.addLog('success', `✅ bookingStore.${method}: 方法已修复`)
          } else {
            this.addLog('error', `❌ bookingStore.${method}: 方法仍然缺失`)
          }
        }

        // 验证User Store新增的方法
        this.addLog('info', '验证User Store新增方法...')
        
        const fixedUserMethods = [
          'getUserInfo',
          'updateUserInfo'
        ]
        
        for (const method of fixedUserMethods) {
          if (typeof this.userStore[method] === 'function') {
            this.addLog('success', `✅ userStore.${method}: 方法已修复`)
          } else {
            this.addLog('error', `❌ userStore.${method}: 方法仍然缺失 (类型: ${typeof this.userStore[method]})`)
          }
        }

        this.addLog('success', '🎉 修复验证完成！')
      } catch (error) {
        this.addLog('error', `修复验证失败: ${error.message}`)
      } finally {
        this.testing = false
      }
    },

    // 测试Booking Store方法
    async testBookingStoreMethods() {
      this.testing = true
      this.addLog('info', '🔍 测试Booking Store所有方法...')

      try {
        const allBookingMethods = [
          'createBooking', 'getBookingDetail', 'createSharedBooking', 
          'cancelBooking', 'getUserBookings', 'getSharingOrdersList',
          'getVenueAvailableSlots', 'applySharedBooking', 'createSharingOrderNew'
        ]
        
        let successCount = 0
        let totalCount = allBookingMethods.length
        
        for (const method of allBookingMethods) {
          if (typeof this.bookingStore[method] === 'function') {
            this.addLog('success', `✅ bookingStore.${method}: 存在`)
            successCount++
          } else {
            this.addLog('error', `❌ bookingStore.${method}: 不存在`)
          }
        }

        this.addLog('info', `📊 Booking Store方法统计: ${successCount}/${totalCount} 个方法可用`)
        
        if (successCount === totalCount) {
          this.addLog('success', '🎉 所有Booking Store方法都可用！')
        } else {
          this.addLog('warning', `⚠️ 还有 ${totalCount - successCount} 个方法需要修复`)
        }

      } catch (error) {
        this.addLog('error', `Booking Store方法测试失败: ${error.message}`)
      } finally {
        this.testing = false
      }
    },

    // 测试User Store方法
    async testUserStoreMethods() {
      this.testing = true
      this.addLog('info', '🔍 测试User Store所有方法...')

      try {
        const allUserMethods = [
          'login', 'logout', 'register', 'getUserInfo', 'updateUserInfo', 'checkLoginStatus'
        ]
        
        let successCount = 0
        let totalCount = allUserMethods.length
        
        for (const method of allUserMethods) {
          if (typeof this.userStore[method] === 'function') {
            this.addLog('success', `✅ userStore.${method}: 存在`)
            successCount++
          } else {
            this.addLog('error', `❌ userStore.${method}: 不存在`)
          }
        }

        this.addLog('info', `📊 User Store方法统计: ${successCount}/${totalCount} 个方法可用`)
        
        if (successCount === totalCount) {
          this.addLog('success', '🎉 所有User Store方法都可用！')
        } else {
          this.addLog('warning', `⚠️ 还有 ${totalCount - successCount} 个方法需要修复`)
        }

      } catch (error) {
        this.addLog('error', `User Store方法测试失败: ${error.message}`)
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
  color: white;
  border: none;
  border-radius: 40rpx;
  font-size: 28rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.test-btn.success {
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
}

.test-btn.info {
  background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
}

.test-btn.warning {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
}

.test-btn:disabled {
  background: #ccc !important;
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

.log-item.warning {
  background-color: #fff3e0;
  border-left: 4rpx solid #ff9800;
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
