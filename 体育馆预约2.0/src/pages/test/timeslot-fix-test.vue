<template>
  <view class="test-container">
    <view class="header">
      <text class="title">🔧 时间段修复测试</text>
      <text class="subtitle">测试营业时间生成、前后端同步、状态刷新</text>
    </view>

    <!-- 测试控制面板 -->
    <view class="control-panel">
      <view class="input-group">
        <text class="label">场馆ID:</text>
        <input v-model="testVenueId" type="number" placeholder="输入场馆ID" class="input" />
      </view>
      
      <view class="input-group">
        <text class="label">测试日期:</text>
        <input v-model="testDate" type="date" class="input" />
      </view>

      <view class="button-group">
        <button @click="testTimeSlotGeneration" class="test-btn primary">🏗️ 测试时间段生成</button>
        <button @click="testStatusRefresh" class="test-btn secondary">🔄 测试状态刷新</button>
        <button @click="clearCache" class="test-btn warning">🗑️ 清除缓存</button>
      </view>
    </view>

    <!-- 测试结果 -->
    <view class="results-section">
      <text class="section-title">测试结果</text>
      
      <view class="result-item" v-for="(result, index) in testResults" :key="index">
        <view class="result-header">
          <text class="result-title">{{ result.title }}</text>
          <text :class="['result-status', result.success ? 'success' : 'error']">
            {{ result.success ? '✅ 成功' : '❌ 失败' }}
          </text>
        </view>
        
        <view class="result-details">
          <text class="detail-text">{{ result.message }}</text>
          <view v-if="result.data" class="data-section">
            <text class="data-title">详细数据:</text>
            <text class="data-content">{{ JSON.stringify(result.data, null, 2) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 时间段展示 -->
    <view class="timeslots-section" v-if="currentTimeSlots.length > 0">
      <text class="section-title">当前时间段 ({{ currentTimeSlots.length }}个)</text>
      
      <view class="timeslot-grid">
        <view 
          v-for="slot in currentTimeSlots" 
          :key="slot.id"
          :class="['timeslot-item', `status-${slot.status.toLowerCase()}`]"
        >
          <text class="slot-time">{{ slot.startTime }}-{{ slot.endTime }}</text>
          <text class="slot-price">¥{{ slot.price }}</text>
          <text class="slot-status">{{ slot.status }}</text>
        </view>
      </view>
    </view>

    <!-- 场馆信息展示 -->
    <view class="venue-info" v-if="venueInfo">
      <text class="section-title">场馆信息</text>
      <view class="info-item">
        <text class="info-label">名称:</text>
        <text class="info-value">{{ venueInfo.name }}</text>
      </view>
      <view class="info-item">
        <text class="info-label">营业时间:</text>
        <text class="info-value">{{ venueInfo.openTime || venueInfo.open_time }} - {{ venueInfo.closeTime || venueInfo.close_time }}</text>
      </view>
      <view class="info-item">
        <text class="info-label">价格:</text>
        <text class="info-value">¥{{ venueInfo.price }}/小时</text>
      </view>
    </view>
  </view>
</template>

<script>
import { useVenueStore } from '@/stores/venue.js'

export default {
  name: 'TimeSlotFixTest',
  
  data() {
    return {
      testVenueId: 1,
      testDate: this.getTodayDate(),
      testResults: [],
      currentTimeSlots: [],
      venueInfo: null,
      venueStore: null
    }
  },
  
  onLoad() {
    this.venueStore = useVenueStore()
    this.loadVenueInfo()
  },
  
  methods: {
    // 获取今天日期
    getTodayDate() {
      const today = new Date()
      return today.toISOString().split('T')[0]
    },

    // 加载场馆信息
    async loadVenueInfo() {
      try {
        await this.venueStore.getVenueDetail(this.testVenueId)
        this.venueInfo = this.venueStore.venueDetail
        this.addResult('场馆信息加载', true, '场馆信息加载成功', this.venueInfo)
      } catch (error) {
        this.addResult('场馆信息加载', false, `加载失败: ${error.message}`)
      }
    },

    // 测试时间段生成
    async testTimeSlotGeneration() {
      this.addResult('时间段生成测试', null, '开始测试时间段生成...')
      
      try {
        // 清除现有时间段
        this.venueStore.setTimeSlots([])
        
        // 测试获取时间段
        const response = await this.venueStore.getTimeSlots(this.testVenueId, this.testDate, true)
        
        this.currentTimeSlots = this.venueStore.timeSlots
        
        if (this.currentTimeSlots.length > 0) {
          const firstSlot = this.currentTimeSlots[0]
          const lastSlot = this.currentTimeSlots[this.currentTimeSlots.length - 1]
          
          this.addResult('时间段生成测试', true, 
            `生成成功! 共${this.currentTimeSlots.length}个时间段，时间范围: ${firstSlot.startTime}-${lastSlot.endTime}`, 
            {
              count: this.currentTimeSlots.length,
              timeRange: `${firstSlot.startTime}-${lastSlot.endTime}`,
              sampleSlot: firstSlot
            })
        } else {
          this.addResult('时间段生成测试', false, '生成失败，没有时间段数据')
        }
        
      } catch (error) {
        this.addResult('时间段生成测试', false, `生成失败: ${error.message}`)
      }
    },

    // 测试状态刷新
    async testStatusRefresh() {
      this.addResult('状态刷新测试', null, '开始测试状态刷新...')
      
      try {
        const response = await this.venueStore.refreshTimeSlotStatus(this.testVenueId, this.testDate)
        
        this.currentTimeSlots = this.venueStore.timeSlots
        
        this.addResult('状态刷新测试', true, 
          `刷新成功! 当前时间段数量: ${this.currentTimeSlots.length}`, 
          {
            count: this.currentTimeSlots.length,
            refreshTime: new Date().toLocaleTimeString()
          })
          
      } catch (error) {
        this.addResult('状态刷新测试', false, `刷新失败: ${error.message}`)
      }
    },

    // 清除缓存
    clearCache() {
      try {
        if (this.venueStore.timeSlotManager) {
          this.venueStore.timeSlotManager.clearCache()
          this.addResult('清除缓存', true, '缓存清除成功')
        } else {
          this.addResult('清除缓存', false, '时间段管理器未初始化')
        }
      } catch (error) {
        this.addResult('清除缓存', false, `清除失败: ${error.message}`)
      }
    },

    // 添加测试结果
    addResult(title, success, message, data = null) {
      this.testResults.unshift({
        title,
        success,
        message,
        data,
        timestamp: new Date().toLocaleTimeString()
      })
      
      // 限制结果数量
      if (this.testResults.length > 10) {
        this.testResults = this.testResults.slice(0, 10)
      }
    }
  }
}
</script>

<style scoped>
.test-container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 30rpx;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.subtitle {
  font-size: 28rpx;
  color: #666;
  display: block;
}

.control-panel {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
}

.input-group {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.label {
  width: 150rpx;
  font-size: 28rpx;
  color: #333;
}

.input {
  flex: 1;
  height: 70rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}

.button-group {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}

.test-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
}

.primary {
  background: #007AFF;
  color: white;
}

.secondary {
  background: #34C759;
  color: white;
}

.warning {
  background: #FF9500;
  color: white;
}

.results-section, .timeslots-section, .venue-info {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
}

.result-item {
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.result-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.result-status.success {
  color: #34C759;
}

.result-status.error {
  color: #FF3B30;
}

.detail-text {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 10rpx;
}

.data-section {
  background: #f8f8f8;
  border-radius: 8rpx;
  padding: 15rpx;
}

.data-title {
  font-size: 24rpx;
  color: #333;
  font-weight: bold;
  display: block;
  margin-bottom: 10rpx;
}

.data-content {
  font-size: 22rpx;
  color: #666;
  font-family: monospace;
  white-space: pre-wrap;
  display: block;
}

.timeslot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200rpx, 1fr));
  gap: 15rpx;
}

.timeslot-item {
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  padding: 15rpx;
  text-align: center;
}

.timeslot-item.status-available {
  background: #e8f5e8;
  border-color: #34C759;
}

.timeslot-item.status-reserved {
  background: #ffe8e8;
  border-color: #FF3B30;
}

.slot-time {
  font-size: 24rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 5rpx;
}

.slot-price {
  font-size: 22rpx;
  color: #007AFF;
  display: block;
  margin-bottom: 5rpx;
}

.slot-status {
  font-size: 20rpx;
  color: #666;
  display: block;
}

.info-item {
  display: flex;
  margin-bottom: 15rpx;
}

.info-label {
  width: 150rpx;
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}

.info-value {
  flex: 1;
  font-size: 28rpx;
  color: #666;
}
</style>
