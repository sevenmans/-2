<template>
  <view class="debug-container">
    <view class="header">
      <text class="title">时间段API调试</text>
      <button class="refresh-btn" @click="refreshData">刷新数据</button>
    </view>
    
    <view class="section">
      <text class="section-title">测试参数</text>
      <view class="param-item">
        <text class="param-label">场馆ID:</text>
        <input class="param-input" v-model="venueId" placeholder="请输入场馆ID" />
      </view>
      <view class="param-item">
        <text class="param-label">日期:</text>
        <input class="param-input" v-model="selectedDate" placeholder="YYYY-MM-DD" />
      </view>
      <button class="test-btn" @click="testAPI">测试API</button>
    </view>
    
    <view class="section" v-if="loading">
      <text class="section-title">加载中...</text>
    </view>
    
    <view class="section" v-if="apiResponse">
      <text class="section-title">API响应数据</text>
      <view class="response-info">
        <text class="info-item">响应时间: {{ responseTime }}ms</text>
        <text class="info-item">数据条数: {{ apiResponse.length }}</text>
      </view>
      <view class="response-data">
        <text class="data-title">原始响应:</text>
        <text class="data-content">{{ JSON.stringify(apiResponse, null, 2) }}</text>
      </view>
    </view>
    
    <view class="section" v-if="processedData.length > 0">
      <text class="section-title">处理后的时间段数据</text>
      <view class="timeslot-list">
        <view 
          class="timeslot-item"
          :class="getStatusClass(slot.status)"
          v-for="(slot, index) in processedData" 
          :key="index"
        >
          <view class="slot-info">
            <text class="slot-time">{{ slot.startTime }} - {{ slot.endTime }}</text>
            <text class="slot-status">状态: {{ slot.status }}</text>
            <text class="slot-price">价格: ¥{{ slot.price }}</text>
            <text class="slot-id">ID: {{ slot.id }}</text>
          </view>
        </view>
      </view>
    </view>
    
    <view class="section" v-if="errorInfo">
      <text class="section-title">错误信息</text>
      <text class="error-content">{{ errorInfo }}</text>
    </view>
    
    <view class="section">
      <text class="section-title">状态统计</text>
      <view class="stats-grid">
        <view class="stat-item">
          <text class="stat-label">可预约</text>
          <text class="stat-value">{{ getStatusCount('AVAILABLE') }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">已预约</text>
          <text class="stat-value">{{ getStatusCount('OCCUPIED') + getStatusCount('RESERVED') }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">维护中</text>
          <text class="stat-value">{{ getStatusCount('MAINTENANCE') }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">已过期</text>
          <text class="stat-value">{{ getStatusCount('EXPIRED') }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useVenueStore } from '@/stores/venue.js'
import { getVenueTimeSlots, getAvailableTimeSlots, checkTimeSlotAvailability, refreshTimeSlotStatus } from '@/api/timeslot.js'

export default {
  name: 'TimeslotApiDebug',
  
  data() {
    return {
      venueId: '1', // 默认场馆ID
      selectedDate: '',
      loading: false,
      apiResponse: null,
      processedData: [],
      errorInfo: '',
      responseTime: 0,
      venueStore: null
    }
  },
  
  mounted() {
    this.venueStore = useVenueStore()
    
    // 设置默认日期为今天
    const today = new Date()
    this.selectedDate = today.toISOString().split('T')[0]
    
    // 自动测试
    this.testAPI()
  },
  
  methods: {
    async testAPI() {
      if (!this.venueId || !this.selectedDate) {
        uni.showToast({
          title: '请输入场馆ID和日期',
          icon: 'none'
        })
        return
      }
      
      this.loading = true
      this.errorInfo = ''
      this.apiResponse = null
      this.processedData = []
      
      const startTime = Date.now()
      
      try {
        console.log('[TimeslotDebug] 开始测试API:', {
          venueId: this.venueId,
          date: this.selectedDate
        })
        
        // 方法1: 直接调用API
        console.log('[TimeslotDebug] 方法1: 直接调用API函数')
        try {
          const directResponse = await getVenueTimeSlots(this.venueId, this.selectedDate)
          console.log('[TimeslotDebug] 直接API响应:', directResponse)
          this.apiResponse = directResponse.data || directResponse
        } catch (directError) {
          console.error('[TimeslotDebug] 直接API调用失败:', directError)
        }
        
        // 方法2: 通过Store调用
        console.log('[TimeslotDebug] 方法2: 通过venueStore调用')
        try {
          const storeResponse = await this.venueStore.getVenueTimeSlots({
            venueId: this.venueId,
            date: this.selectedDate,
            forceRefresh: true
          })
          console.log('[TimeslotDebug] Store响应:', storeResponse)
          
          // 获取处理后的数据
          this.processedData = this.venueStore.timeSlots || []
          console.log('[TimeslotDebug] 处理后的数据:', this.processedData)
        } catch (storeError) {
          console.error('[TimeslotDebug] Store调用失败:', storeError)
        }
        
        this.responseTime = Date.now() - startTime
        
      } catch (error) {
        console.error('[TimeslotDebug] 测试失败:', error)
        this.errorInfo = error.message || '未知错误'
        
      } finally {
        this.loading = false
      }
    },
    
    refreshData() {
      this.testAPI()
    },
    
    getStatusClass(status) {
      const classMap = {
        'AVAILABLE': 'status-available',
        'OCCUPIED': 'status-occupied',
        'RESERVED': 'status-reserved',
        'MAINTENANCE': 'status-maintenance',
        'EXPIRED': 'status-expired'
      }
      return classMap[status] || 'status-unknown'
    },
    
    getStatusCount(status) {
      return this.processedData.filter(slot => slot.status === status).length
    }
  }
}
</script>

<style lang="scss" scoped>
.debug-container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
  
  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
  }
  
  .refresh-btn {
    padding: 10rpx 20rpx;
    background-color: #007aff;
    color: white;
    border-radius: 8rpx;
    font-size: 28rpx;
  }
}

.section {
  background-color: white;
  margin-bottom: 20rpx;
  padding: 30rpx;
  border-radius: 12rpx;
  
  .section-title {
    display: block;
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
  }
}

.param-item {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  
  .param-label {
    width: 150rpx;
    font-size: 28rpx;
    color: #666;
  }
  
  .param-input {
    flex: 1;
    padding: 15rpx;
    border: 1rpx solid #ddd;
    border-radius: 8rpx;
    font-size: 28rpx;
  }
}

.test-btn {
  width: 100%;
  padding: 20rpx;
  background-color: #ff6b35;
  color: white;
  border-radius: 8rpx;
  font-size: 30rpx;
  margin-top: 20rpx;
}

.response-info {
  margin-bottom: 20rpx;
  
  .info-item {
    display: block;
    font-size: 26rpx;
    color: #666;
    margin-bottom: 10rpx;
  }
}

.response-data {
  .data-title {
    display: block;
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 10rpx;
  }
  
  .data-content {
    display: block;
    font-size: 24rpx;
    color: #666;
    background-color: #f8f8f8;
    padding: 20rpx;
    border-radius: 8rpx;
    white-space: pre-wrap;
    word-break: break-all;
  }
}

.timeslot-list {
  .timeslot-item {
    padding: 20rpx;
    margin-bottom: 15rpx;
    border-radius: 8rpx;
    border: 2rpx solid #ddd;
    
    &.status-available {
      background-color: #e8f5e8;
      border-color: #4caf50;
    }
    
    &.status-occupied,
    &.status-reserved {
      background-color: #ffeaea;
      border-color: #f44336;
    }
    
    &.status-maintenance {
      background-color: #fff3e0;
      border-color: #ff9800;
    }
    
    &.status-expired {
      background-color: #f5f5f5;
      border-color: #999;
    }
    
    .slot-info {
      .slot-time {
        display: block;
        font-size: 30rpx;
        font-weight: bold;
        color: #333;
        margin-bottom: 8rpx;
      }
      
      .slot-status,
      .slot-price,
      .slot-id {
        display: block;
        font-size: 26rpx;
        color: #666;
        margin-bottom: 5rpx;
      }
    }
  }
}

.error-content {
  color: #f44336;
  font-size: 28rpx;
  background-color: #ffeaea;
  padding: 20rpx;
  border-radius: 8rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  
  .stat-item {
    text-align: center;
    padding: 20rpx;
    background-color: #f8f8f8;
    border-radius: 8rpx;
    
    .stat-label {
      display: block;
      font-size: 26rpx;
      color: #666;
      margin-bottom: 10rpx;
    }
    
    .stat-value {
      display: block;
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
    }
  }
}
</style>