<template>
  <view class="container">
    <view class="header">
      <text class="title">🎉 Pinia迁移最终验证</text>
      <text class="subtitle">验证所有核心功能是否正常工作</text>
    </view>

    <scroll-view scroll-y class="content">
      <!-- 用户认证测试 -->
      <view class="test-section">
        <text class="section-title">👤 用户认证测试</text>
        <view class="test-item">
          <text class="test-label">登录状态:</text>
          <text :class="['test-value', userStore.isLoggedIn ? 'success' : 'error']">
            {{ userStore.isLoggedIn ? '已登录' : '未登录' }}
          </text>
        </view>
        <view class="test-item" v-if="userStore.isLoggedIn">
          <text class="test-label">用户信息:</text>
          <text class="test-value">{{ userStore.nickname || '未设置' }}</text>
        </view>
        <button class="test-btn" @click="testUserAuth">测试用户认证</button>
      </view>

      <!-- 场馆数据测试 -->
      <view class="test-section">
        <text class="section-title">🏟️ 场馆数据测试</text>
        <view class="test-item">
          <text class="test-label">场馆列表:</text>
          <text class="test-value">{{ venueStore.venueListGetter.length }} 个场馆</text>
        </view>
        <view class="test-item">
          <text class="test-label">加载状态:</text>
          <text :class="['test-value', venueStore.isLoading ? 'warning' : 'success']">
            {{ venueStore.isLoading ? '加载中' : '就绪' }}
          </text>
        </view>
        <button class="test-btn" @click="testVenueData">测试场馆数据</button>
      </view>

      <!-- 预订功能测试 -->
      <view class="test-section">
        <text class="section-title">📅 预订功能测试</text>
        <view class="test-item">
          <text class="test-label">预订列表:</text>
          <text class="test-value">{{ bookingStore.bookingListGetter.length }} 个预订</text>
        </view>
        <view class="test-item">
          <text class="test-label">加载状态:</text>
          <text :class="['test-value', bookingStore.isLoading ? 'warning' : 'success']">
            {{ bookingStore.isLoading ? '加载中' : '就绪' }}
          </text>
        </view>
        <button class="test-btn" @click="testBookingData">测试预订数据</button>
      </view>

      <!-- 拼场功能测试 -->
      <view class="test-section">
        <text class="section-title">🤝 拼场功能测试</text>
        <view class="test-item">
          <text class="test-label">拼场订单:</text>
          <text class="test-value">{{ sharingStore.sharingOrdersGetter.length }} 个订单</text>
        </view>
        <view class="test-item">
          <text class="test-label">加载状态:</text>
          <text :class="['test-value', sharingStore.isLoading ? 'warning' : 'success']">
            {{ sharingStore.isLoading ? '加载中' : '就绪' }}
          </text>
        </view>
        <button class="test-btn" @click="testSharingData">测试拼场数据</button>
      </view>

      <!-- 全面测试 -->
      <view class="test-section">
        <text class="section-title">🔍 全面功能测试</text>
        <button class="test-btn primary" @click="runFullTest">运行完整测试</button>
        <button class="test-btn secondary" @click="clearTestData">清除测试数据</button>
      </view>

      <!-- 测试结果 -->
      <view class="test-results" v-if="testResults.length > 0">
        <text class="section-title">📊 测试结果</text>
        <view class="result-item" v-for="(result, index) in testResults" :key="index">
          <text :class="['result-status', result.success ? 'success' : 'error']">
            {{ result.success ? '✅' : '❌' }}
          </text>
          <text class="result-text">{{ result.message }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { useUserStore } from '@/stores/user.js'
import { useVenueStore } from '@/stores/venue.js'
import { useBookingStore } from '@/stores/booking.js'
import { useSharingStore } from '@/stores/sharing.js'
import { useAppStore } from '@/stores/app.js'

export default {
  name: 'PiniaMigrationFinalValidation',
  
  data() {
    return {
      testResults: []
    }
  },
  
  onLoad() {
    // 初始化所有Pinia stores
    this.userStore = useUserStore()
    this.venueStore = useVenueStore()
    this.bookingStore = useBookingStore()
    this.sharingStore = useSharingStore()
    this.appStore = useAppStore()
    
    console.log('🎉 Pinia迁移最终验证页面加载完成')
    this.addResult(true, 'Pinia stores初始化成功')
  },
  
  methods: {
    // 添加测试结果
    addResult(success, message) {
      this.testResults.push({
        success,
        message,
        timestamp: new Date().toLocaleTimeString()
      })
    },
    
    // 测试用户认证
    async testUserAuth() {
      try {
        console.log('🧪 开始测试用户认证...')
        
        // 检查用户store是否正常工作
        if (typeof this.userStore.checkLoginStatus === 'function') {
          await this.userStore.checkLoginStatus()
          this.addResult(true, '用户认证功能正常')
        } else {
          this.addResult(false, '用户认证方法不存在')
        }
      } catch (error) {
        console.error('用户认证测试失败:', error)
        this.addResult(false, `用户认证测试失败: ${error.message}`)
      }
    },
    
    // 测试场馆数据
    async testVenueData() {
      try {
        console.log('🧪 开始测试场馆数据...')
        
        if (typeof this.venueStore.getVenueList === 'function') {
          await this.venueStore.getVenueList({ page: 1, pageSize: 5 })
          this.addResult(true, '场馆数据获取成功')
        } else {
          this.addResult(false, '场馆数据方法不存在')
        }
      } catch (error) {
        console.error('场馆数据测试失败:', error)
        this.addResult(false, `场馆数据测试失败: ${error.message}`)
      }
    },
    
    // 测试预订数据
    async testBookingData() {
      try {
        console.log('🧪 开始测试预订数据...')
        
        if (typeof this.bookingStore.getUserBookings === 'function') {
          await this.bookingStore.getUserBookings({ page: 1, pageSize: 5 })
          this.addResult(true, '预订数据获取成功')
        } else {
          this.addResult(false, '预订数据方法不存在')
        }
      } catch (error) {
        console.error('预订数据测试失败:', error)
        this.addResult(false, `预订数据测试失败: ${error.message}`)
      }
    },
    
    // 测试拼场数据
    async testSharingData() {
      try {
        console.log('🧪 开始测试拼场数据...')
        
        if (typeof this.sharingStore.getAllSharingOrders === 'function') {
          await this.sharingStore.getAllSharingOrders({ page: 1, pageSize: 5 })
          this.addResult(true, '拼场数据获取成功')
        } else {
          this.addResult(false, '拼场数据方法不存在')
        }
      } catch (error) {
        console.error('拼场数据测试失败:', error)
        this.addResult(false, `拼场数据测试失败: ${error.message}`)
      }
    },
    
    // 运行完整测试
    async runFullTest() {
      console.log('🚀 开始运行完整测试...')
      this.clearTestData()
      
      this.addResult(true, '开始完整功能测试')
      
      // 依次测试所有功能
      await this.testUserAuth()
      await this.testVenueData()
      await this.testBookingData()
      await this.testSharingData()
      
      // 统计测试结果
      const successCount = this.testResults.filter(r => r.success).length
      const totalCount = this.testResults.length
      
      if (successCount === totalCount) {
        this.addResult(true, `🎉 所有测试通过! (${successCount}/${totalCount})`)
        uni.showToast({
          title: '所有测试通过!',
          icon: 'success'
        })
      } else {
        this.addResult(false, `⚠️ 部分测试失败 (${successCount}/${totalCount})`)
        uni.showToast({
          title: '部分测试失败',
          icon: 'none'
        })
      }
    },
    
    // 清除测试数据
    clearTestData() {
      this.testResults = []
    }
  }
}
</script>

<style scoped>
.container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
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

.content {
  height: calc(100vh - 200rpx);
}

.test-section {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
}

.section-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 30rpx;
}

.test-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.test-label {
  font-size: 28rpx;
  color: #666;
}

.test-value {
  font-size: 28rpx;
  font-weight: bold;
}

.test-value.success {
  color: #52c41a;
}

.test-value.error {
  color: #ff4d4f;
}

.test-value.warning {
  color: #faad14;
}

.test-btn {
  width: 100%;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  margin-top: 20rpx;
  border: none;
  background: #1890ff;
  color: white;
}

.test-btn.primary {
  background: #52c41a;
}

.test-btn.secondary {
  background: #ff4d4f;
}

.test-results {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}

.result-item {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  padding: 20rpx;
  border-radius: 10rpx;
  background: #f9f9f9;
}

.result-status {
  font-size: 32rpx;
  margin-right: 20rpx;
}

.result-text {
  font-size: 28rpx;
  color: #333;
  flex: 1;
}
</style>
