<template>
  <view class="container">
    <view class="header">
      <text class="title">Loading 状态修复测试</text>
    </view>
    
    <view class="test-section">
      <text class="section-title">测试场景</text>
      <view class="test-item">
        <button @click="testWithManualLoading" class="test-btn">
          测试手动 Loading (应该正常)
        </button>
      </view>
      <view class="test-item">
        <button @click="testWithAutoLoading" class="test-btn">
          测试自动 Loading (应该正常)
        </button>
      </view>
    </view>
    
    <view class="log-section">
      <text class="section-title">测试日志</text>
      <scroll-view class="log-container" scroll-y>
        <view v-for="(log, index) in logs" :key="index" class="log-item">
          <text class="log-time">{{ log.time }}</text>
          <text class="log-message">{{ log.message }}</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { mapStores } from 'pinia'
import { useVenueStore } from '@/stores/venue'

export default {
  name: 'LoadingFixTest',
  data() {
    return {
      logs: [],
      testVenueId: 1,
      testDate: '2024-08-09'
    }
  },
  computed: {
    ...mapStores(useVenueStore)
  },
  onLoad() {
    this.addLog('测试页面加载完成')
  },
  methods: {
    addLog(message) {
      const now = new Date()
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
      this.logs.unshift({
        time,
        message
      })
      console.log(`[LoadingTest] ${time} ${message}`)
    },

    // 测试手动 Loading 控制
    async testWithManualLoading() {
      try {
        this.addLog('开始测试手动 Loading 控制...')
        
        // 手动显示 loading
        uni.showLoading({ title: '手动加载中...' })
        this.addLog('✅ 手动调用 uni.showLoading')
        
        // 调用 API，禁用自动 loading
        const result = await this.venueStore.getVenueTimeSlots({
          venueId: this.testVenueId,
          date: this.testDate,
          loading: false  // 🔥 关键：禁用 API 的自动 loading
        })
        
        this.addLog('✅ API 调用完成，未触发自动 loading')
        
        // 手动隐藏 loading
        uni.hideLoading()
        this.addLog('✅ 手动调用 uni.hideLoading')
        
        this.addLog(`✅ 手动 Loading 测试成功，获取到 ${result?.data?.length || 0} 个时间段`)
        
      } catch (error) {
        uni.hideLoading()
        this.addLog(`❌ 手动 Loading 测试失败: ${error.message}`)
      }
    },

    // 测试自动 Loading 控制
    async testWithAutoLoading() {
      try {
        this.addLog('开始测试自动 Loading 控制...')
        
        // 不手动调用 showLoading，让 API 自动处理
        this.addLog('📡 调用 API，启用自动 loading')
        
        const result = await this.venueStore.getVenueTimeSlots({
          venueId: this.testVenueId,
          date: this.testDate,
          loading: true  // 🔥 关键：启用 API 的自动 loading
        })
        
        this.addLog('✅ API 调用完成，自动 loading 已处理')
        this.addLog(`✅ 自动 Loading 测试成功，获取到 ${result?.data?.length || 0} 个时间段`)
        
      } catch (error) {
        this.addLog(`❌ 自动 Loading 测试失败: ${error.message}`)
      }
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
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.test-section {
  background-color: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.test-item {
  margin-bottom: 20rpx;
}

.test-btn {
  width: 100%;
  background-color: #007aff;
  color: white;
  border: none;
  border-radius: 12rpx;
  padding: 24rpx;
  font-size: 28rpx;
}

.test-btn:active {
  background-color: #0056cc;
}

.log-section {
  background-color: white;
  border-radius: 16rpx;
  padding: 30rpx;
  height: 600rpx;
}

.log-container {
  height: 500rpx;
  border: 1px solid #eee;
  border-radius: 8rpx;
  padding: 20rpx;
}

.log-item {
  margin-bottom: 16rpx;
  padding: 12rpx;
  background-color: #f8f9fa;
  border-radius: 8rpx;
}

.log-time {
  color: #666;
  font-size: 24rpx;
  margin-right: 20rpx;
}

.log-message {
  color: #333;
  font-size: 26rpx;
}
</style>