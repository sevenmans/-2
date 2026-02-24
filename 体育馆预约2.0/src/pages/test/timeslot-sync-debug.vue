<template>
  <view class="debug-container">
    <view class="header">
      <text class="title">🔍 时间段同步调试</text>
      <text class="subtitle">专门调试前后端同步问题</text>
    </view>

    <!-- 控制面板 -->
    <view class="control-panel">
      <view class="input-group">
        <text class="label">场馆ID:</text>
        <input v-model="venueId" type="number" class="input" />
      </view>
      
      <view class="input-group">
        <text class="label">日期:</text>
        <input v-model="testDate" type="date" class="input" />
      </view>

      <view class="button-group">
        <button @click="testDirectGenerate" class="btn primary">🔧 直接调用生成API</button>
        <button @click="testDirectQuery" class="btn secondary">📋 直接查询时间段</button>
        <button @click="testFullFlow" class="btn success">🔄 测试完整流程</button>
        <button @click="clearLogs" class="btn warning">🗑️ 清除日志</button>
      </view>
    </view>

    <!-- 调试日志 -->
    <view class="logs-section">
      <text class="section-title">调试日志</text>
      <scroll-view class="logs-container" scroll-y>
        <view v-for="(log, index) in logs" :key="index" :class="['log-item', log.type]">
          <text class="log-time">{{ log.time }}</text>
          <text class="log-message">{{ log.message }}</text>
          <view v-if="log.data" class="log-data">
            <text class="data-content">{{ JSON.stringify(log.data, null, 2) }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 当前状态 -->
    <view class="status-section">
      <text class="section-title">当前状态</text>
      <view class="status-item">
        <text class="status-label">后端时间段数量:</text>
        <text class="status-value">{{ backendSlotsCount }}</text>
      </view>
      <view class="status-item">
        <text class="status-label">前端时间段数量:</text>
        <text class="status-value">{{ frontendSlotsCount }}</text>
      </view>
      <view class="status-item">
        <text class="status-label">最后操作:</text>
        <text class="status-value">{{ lastOperation }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { generateTimeSlots, getVenueTimeSlots } from '@/api/timeslot.js'
import { useVenueStore } from '@/stores/venue.js'

export default {
  name: 'TimeslotSyncDebug',
  
  data() {
    return {
      venueId: 34,
      testDate: this.getTodayDate(),
      logs: [],
      backendSlotsCount: 0,
      frontendSlotsCount: 0,
      lastOperation: '无',
      venueStore: null
    }
  },
  
  onLoad() {
    this.venueStore = useVenueStore()
    this.addLog('info', '调试工具初始化完成')
  },
  
  methods: {
    getTodayDate() {
      const today = new Date()
      return today.toISOString().split('T')[0]
    },

    addLog(type, message, data = null) {
      const log = {
        type,
        message,
        data,
        time: new Date().toLocaleTimeString()
      }
      this.logs.unshift(log)
      
      // 限制日志数量
      if (this.logs.length > 50) {
        this.logs = this.logs.slice(0, 50)
      }
    },

    clearLogs() {
      this.logs = []
      this.addLog('info', '日志已清除')
    },

    // 直接调用生成API
    async testDirectGenerate() {
      this.lastOperation = '直接生成API'
      this.addLog('info', `开始直接调用生成API - 场馆${this.venueId}, 日期${this.testDate}`)
      
      try {
        const response = await generateTimeSlots(this.venueId, this.testDate)
        this.addLog('success', '生成API调用成功', response)
        
        // 立即查询验证
        setTimeout(async () => {
          await this.queryBackendSlots()
        }, 1000)
        
      } catch (error) {
        this.addLog('error', `生成API调用失败: ${error.message}`, error)
      }
    },

    // 直接查询时间段
    async testDirectQuery() {
      this.lastOperation = '直接查询'
      await this.queryBackendSlots()
    },

    // 查询后端时间段
    async queryBackendSlots() {
      this.addLog('info', `查询后端时间段 - 场馆${this.venueId}, 日期${this.testDate}`)
      
      try {
        const response = await getVenueTimeSlots(this.venueId, this.testDate, true)
        
        if (response && response.data) {
          this.backendSlotsCount = response.data.length
          this.addLog('success', `后端查询成功，获取到${response.data.length}个时间段`, {
            count: response.data.length,
            firstSlot: response.data[0],
            lastSlot: response.data[response.data.length - 1]
          })
        } else {
          this.backendSlotsCount = 0
          this.addLog('warning', '后端查询成功但无数据', response)
        }
        
      } catch (error) {
        this.backendSlotsCount = 0
        this.addLog('error', `后端查询失败: ${error.message}`, error)
      }
    },

    // 测试完整流程
    async testFullFlow() {
      this.lastOperation = '完整流程测试'
      this.addLog('info', '开始完整流程测试')
      
      try {
        // 1. 先查询当前状态
        this.addLog('info', '步骤1: 查询当前后端状态')
        await this.queryBackendSlots()
        
        // 2. 调用生成API
        this.addLog('info', '步骤2: 调用生成API')
        const generateResponse = await generateTimeSlots(this.venueId, this.testDate)
        this.addLog('success', '生成API调用成功', generateResponse)
        
        // 3. 等待500ms后查询
        this.addLog('info', '步骤3: 等待500ms后查询')
        await new Promise(resolve => setTimeout(resolve, 500))
        await this.queryBackendSlots()
        
        // 4. 再等待1000ms后查询
        this.addLog('info', '步骤4: 再等待1000ms后查询')
        await new Promise(resolve => setTimeout(resolve, 1000))
        await this.queryBackendSlots()
        
        // 5. 使用venue store获取
        this.addLog('info', '步骤5: 使用venue store获取')
        await this.venueStore.getVenueDetail(this.venueId)
        const storeResponse = await this.venueStore.getTimeSlots(this.venueId, this.testDate, true)
        
        this.frontendSlotsCount = this.venueStore.timeSlots.length
        this.addLog('success', `Venue store获取完成，前端时间段数量: ${this.frontendSlotsCount}`, {
          storeSlots: this.venueStore.timeSlots.length,
          response: storeResponse
        })
        
      } catch (error) {
        this.addLog('error', `完整流程测试失败: ${error.message}`, error)
      }
    }
  }
}
</script>

<style scoped>
.debug-container {
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

.control-panel, .logs-section, .status-section {
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
  flex-wrap: wrap;
  gap: 15rpx;
  margin-top: 30rpx;
}

.btn {
  flex: 1;
  min-width: 200rpx;
  height: 70rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
  border: none;
  color: white;
}

.primary { background: #007AFF; }
.secondary { background: #5856D6; }
.success { background: #34C759; }
.warning { background: #FF9500; }

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
}

.logs-container {
  height: 600rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  padding: 15rpx;
}

.log-item {
  border-radius: 8rpx;
  padding: 15rpx;
  margin-bottom: 10rpx;
}

.log-item.info { background: #e3f2fd; }
.log-item.success { background: #e8f5e8; }
.log-item.warning { background: #fff3e0; }
.log-item.error { background: #ffebee; }

.log-time {
  font-size: 22rpx;
  color: #666;
  display: block;
  margin-bottom: 5rpx;
}

.log-message {
  font-size: 26rpx;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.log-data {
  background: #f5f5f5;
  border-radius: 6rpx;
  padding: 10rpx;
}

.data-content {
  font-size: 22rpx;
  color: #666;
  font-family: monospace;
  white-space: pre-wrap;
  display: block;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15rpx;
  padding: 15rpx;
  background: #f8f8f8;
  border-radius: 8rpx;
}

.status-label {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}

.status-value {
  font-size: 28rpx;
  color: #007AFF;
}
</style>
