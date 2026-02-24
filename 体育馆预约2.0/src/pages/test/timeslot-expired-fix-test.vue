<template>
  <view class="container">
    <view class="header">
      <text class="title">🔧 时间段过期状态修复测试</text>
      <text class="subtitle">测试时间段过期判断逻辑的修复效果</text>
    </view>

    <view class="test-section">
      <view class="section-title">📊 测试控制</view>
      
      <view class="form-group">
        <text class="label">选择场馆:</text>
        <picker :value="venueIndex" :range="venueOptions" range-key="name" @change="onVenueChange">
          <view class="picker">
            {{ selectedVenue ? selectedVenue.name : '请选择场馆' }}
          </view>
        </picker>
      </view>

      <view class="form-group">
        <text class="label">选择日期:</text>
        <picker mode="date" :value="selectedDate" @change="onDateChange">
          <view class="picker">{{ selectedDate || '请选择日期' }}</view>
        </picker>
      </view>

      <view class="button-group">
        <button class="test-btn primary" @click="testTimeSlotStatus" :disabled="loading">
          {{ loading ? '测试中...' : '🔍 测试时间段状态' }}
        </button>
        <button class="test-btn secondary" @click="refreshTimeSlots" :disabled="loading">
          🔄 刷新时间段
        </button>
        <button class="test-btn warning" @click="clearResults">
          🧹 清除结果
        </button>
      </view>
    </view>

    <view class="results-section" v-if="testResults.length > 0">
      <view class="section-title">📋 测试结果</view>
      
      <view class="result-item" v-for="(result, index) in testResults" :key="index">
        <view class="result-header">
          <text class="result-title">{{ result.title }}</text>
          <text class="result-time">{{ result.timestamp }}</text>
        </view>
        <view class="result-content">
          <text class="result-text">{{ result.message }}</text>
          <view class="result-data" v-if="result.data">
            <text class="data-title">详细数据:</text>
            <text class="data-content">{{ JSON.stringify(result.data, null, 2) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="timeslots-section" v-if="timeSlots.length > 0">
      <view class="section-title">⏰ 时间段状态</view>
      
      <view class="status-summary">
        <view class="status-item" v-for="(count, status) in statusSummary" :key="status">
          <text class="status-label">{{ getStatusText(status) }}:</text>
          <text class="status-count">{{ count }}</text>
        </view>
      </view>

      <view class="timeslot-grid">
        <view 
          class="timeslot-item" 
          v-for="slot in timeSlots" 
          :key="slot.id"
          :class="getSlotClass(slot)"
        >
          <text class="slot-time">{{ slot.startTime }}-{{ slot.endTime }}</text>
          <text class="slot-status">{{ getStatusText(slot.status) }}</text>
          <text class="slot-id">ID: {{ slot.id }}</text>
        </view>
      </view>
    </view>

    <view class="debug-section" v-if="debugInfo">
      <view class="section-title">🐛 调试信息</view>
      <text class="debug-content">{{ JSON.stringify(debugInfo, null, 2) }}</text>
    </view>
  </view>
</template>

<script>
import { refreshTimeSlotStatus, getVenueTimeSlots } from '@/api/timeslot.js'
import { getVenues } from '@/api/venue.js'

export default {
  name: 'TimeslotExpiredFixTest',
  data() {
    return {
      loading: false,
      venues: [],
      venueIndex: 0,
      selectedDate: '',
      timeSlots: [],
      testResults: [],
      debugInfo: null,
      
      // 默认选择今天
      today: new Date().toISOString().split('T')[0]
    }
  },
  
  computed: {
    venueOptions() {
      return this.venues.map(venue => ({
        id: venue.id,
        name: venue.name
      }))
    },
    
    selectedVenue() {
      return this.venues[this.venueIndex] || null
    },
    
    statusSummary() {
      const summary = {}
      this.timeSlots.forEach(slot => {
        const status = slot.status || 'UNKNOWN'
        summary[status] = (summary[status] || 0) + 1
      })
      return summary
    }
  },
  
  async onLoad() {
    this.selectedDate = this.today
    await this.loadVenues()
  },
  
  methods: {
    async loadVenues() {
      try {
        this.loading = true
        const response = await getVenues()
        if (response && response.data) {
          this.venues = response.data
          this.addResult('✅ 场馆加载成功', `加载了 ${this.venues.length} 个场馆`)
        }
      } catch (error) {
        this.addResult('❌ 场馆加载失败', error.message)
      } finally {
        this.loading = false
      }
    },
    
    onVenueChange(e) {
      this.venueIndex = e.detail.value
      this.addResult('🏟️ 场馆切换', `选择了场馆: ${this.selectedVenue?.name}`)
    },
    
    onDateChange(e) {
      this.selectedDate = e.detail.value
      this.addResult('📅 日期切换', `选择了日期: ${this.selectedDate}`)
    },
    
    async testTimeSlotStatus() {
      if (!this.selectedVenue || !this.selectedDate) {
        uni.showToast({
          title: '请选择场馆和日期',
          icon: 'none'
        })
        return
      }
      
      try {
        this.loading = true
        this.addResult('🔍 开始测试', `场馆: ${this.selectedVenue.name}, 日期: ${this.selectedDate}`)
        
        // 获取当前时间信息
        const now = new Date()
        const currentTime = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        const isToday = this.selectedDate === this.today
        
        this.debugInfo = {
          测试时间: currentTime,
          选择日期: this.selectedDate,
          是否今日: isToday,
          时区: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
        
        // 调用刷新API
        const response = await refreshTimeSlotStatus(this.selectedVenue.id, this.selectedDate)
        
        if (response && response.success) {
          this.timeSlots = response.data || []
          
          // 分析时间段状态
          const analysis = this.analyzeTimeSlots(this.timeSlots, now, isToday)
          
          this.addResult('✅ 时间段状态获取成功', 
            `共 ${this.timeSlots.length} 个时间段`, 
            {
              总数: this.timeSlots.length,
              状态分布: response.statusDistribution || {},
              分析结果: analysis
            }
          )
        } else {
          this.addResult('❌ 时间段状态获取失败', response?.message || '未知错误')
        }
        
      } catch (error) {
        this.addResult('❌ 测试失败', error.message)
        console.error('测试失败:', error)
      } finally {
        this.loading = false
      }
    },
    
    analyzeTimeSlots(slots, currentTime, isToday) {
      const analysis = {
        总数: slots.length,
        可用: 0,
        已预约: 0,
        已过期: 0,
        其他: 0,
        错误过期: []
      }
      
      slots.forEach(slot => {
        switch (slot.status) {
          case 'AVAILABLE':
            analysis.可用++
            break
          case 'BOOKED':
          case 'RESERVED':
            analysis.已预约++
            break
          case 'EXPIRED':
            analysis.已过期++
            
            // 检查是否为错误的过期状态
            if (isToday && slot.endTime) {
              try {
                const [endHour, endMinute] = slot.endTime.split(':').map(Number)
                const slotEndTime = new Date()
                slotEndTime.setHours(endHour, endMinute, 0, 0)
                
                if (currentTime <= slotEndTime) {
                  analysis.错误过期.push({
                    id: slot.id,
                    时间: `${slot.startTime}-${slot.endTime}`,
                    结束时间: slotEndTime.toLocaleString(),
                    当前时间: currentTime.toLocaleString()
                  })
                }
              } catch (error) {
                console.error('分析时间段时出错:', error)
              }
            }
            break
          default:
            analysis.其他++
        }
      })
      
      return analysis
    },
    
    async refreshTimeSlots() {
      await this.testTimeSlotStatus()
    },
    
    clearResults() {
      this.testResults = []
      this.timeSlots = []
      this.debugInfo = null
      this.addResult('🧹 结果已清除', '测试结果和时间段数据已清空')
    },
    
    addResult(title, message, data = null) {
      this.testResults.unshift({
        title,
        message,
        data,
        timestamp: new Date().toLocaleTimeString()
      })
      
      // 限制结果数量
      if (this.testResults.length > 20) {
        this.testResults = this.testResults.slice(0, 20)
      }
    },
    
    getStatusText(status) {
      const statusMap = {
        'AVAILABLE': '可用',
        'BOOKED': '已预约',
        'RESERVED': '已预约',
        'EXPIRED': '已过期',
        'MAINTENANCE': '维护中'
      }
      return statusMap[status] || status
    },
    
    getSlotClass(slot) {
      const baseClass = 'timeslot-item'
      switch (slot.status) {
        case 'AVAILABLE':
          return `${baseClass} available`
        case 'BOOKED':
        case 'RESERVED':
          return `${baseClass} booked`
        case 'EXPIRED':
          return `${baseClass} expired`
        case 'MAINTENANCE':
          return `${baseClass} maintenance`
        default:
          return `${baseClass} unknown`
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

.test-section, .results-section, .timeslots-section, .debug-section {
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
  margin-bottom: 20rpx;
  display: block;
}

.form-group {
  margin-bottom: 30rpx;
}

.label {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.picker {
  padding: 20rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  background: #fafafa;
  font-size: 28rpx;
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.test-btn {
  flex: 1;
  min-width: 200rpx;
  padding: 20rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  border: none;
}

.test-btn.primary {
  background: #007aff;
  color: white;
}

.test-btn.secondary {
  background: #34c759;
  color: white;
}

.test-btn.warning {
  background: #ff9500;
  color: white;
}

.test-btn:disabled {
  opacity: 0.6;
}

.result-item {
  border-bottom: 2rpx solid #f0f0f0;
  padding-bottom: 20rpx;
  margin-bottom: 20rpx;
}

.result-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.result-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.result-time {
  font-size: 24rpx;
  color: #999;
}

.result-text {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 10rpx;
}

.result-data {
  background: #f8f8f8;
  padding: 20rpx;
  border-radius: 8rpx;
  margin-top: 10rpx;
}

.data-title {
  font-size: 26rpx;
  color: #333;
  font-weight: bold;
  display: block;
  margin-bottom: 10rpx;
}

.data-content {
  font-size: 24rpx;
  color: #666;
  font-family: monospace;
  white-space: pre-wrap;
  display: block;
}

.status-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.status-item {
  background: #f0f0f0;
  padding: 10rpx 20rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.status-label {
  font-size: 26rpx;
  color: #333;
}

.status-count {
  font-size: 26rpx;
  font-weight: bold;
  color: #007aff;
}

.timeslot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200rpx, 1fr));
  gap: 20rpx;
}

.timeslot-item {
  padding: 20rpx;
  border-radius: 8rpx;
  text-align: center;
  border: 2rpx solid #e0e0e0;
}

.timeslot-item.available {
  background: #e8f5e8;
  border-color: #34c759;
}

.timeslot-item.booked {
  background: #ffe8e8;
  border-color: #ff3b30;
}

.timeslot-item.expired {
  background: #f0f0f0;
  border-color: #8e8e93;
}

.timeslot-item.maintenance {
  background: #fff3cd;
  border-color: #ff9500;
}

.timeslot-item.unknown {
  background: #f8f8f8;
  border-color: #c7c7cc;
}

.slot-time {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 5rpx;
}

.slot-status {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 5rpx;
}

.slot-id {
  font-size: 22rpx;
  color: #999;
  display: block;
}

.debug-content {
  font-size: 24rpx;
  color: #666;
  font-family: monospace;
  white-space: pre-wrap;
  display: block;
  background: #f8f8f8;
  padding: 20rpx;
  border-radius: 8rpx;
}
</style>
