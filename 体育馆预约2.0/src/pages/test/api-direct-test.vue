<template>
  <view class="container">
    <view class="header">
      <text class="title">🔍 API直接测试</text>
      <text class="subtitle">测试时间段API的实际响应数据</text>
    </view>

    <view class="test-section">
      <view class="input-group">
        <text class="label">场馆ID:</text>
        <input v-model="venueId" type="number" placeholder="输入场馆ID" class="input" />
      </view>
      
      <view class="input-group">
        <text class="label">日期:</text>
        <input v-model="testDate" type="text" placeholder="YYYY-MM-DD" class="input" />
      </view>
      
      <button @click="testDirectAPI" class="test-btn" :disabled="loading">
        {{ loading ? '测试中...' : '🚀 直接测试API' }}
      </button>
    </view>

    <view class="results-section" v-if="apiResponse">
      <view class="section-title">📋 API原始响应</view>
      <view class="code-block">{{ JSON.stringify(apiResponse, null, 2) }}</view>
    </view>

    <view class="results-section" v-if="processedData.length > 0">
      <view class="section-title">📊 处理后的时间段数据</view>
      <view class="timeslot-list">
        <view v-for="(slot, index) in processedData" :key="index" class="timeslot-item">
          <view class="time-range">{{ slot.startTime }} - {{ slot.endTime }}</view>
          <view class="status" :class="getStatusClass(slot.status)">{{ slot.status }}</view>
          <view class="price">¥{{ slot.price }}</view>
        </view>
      </view>
    </view>

    <view class="results-section" v-if="statusStats">
      <view class="section-title">📈 状态统计</view>
      <view class="stats-grid">
        <view class="stat-item">
          <text class="stat-label">总数</text>
          <text class="stat-value">{{ statusStats.total }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">可预约</text>
          <text class="stat-value available">{{ statusStats.AVAILABLE || 0 }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">已预约</text>
          <text class="stat-value reserved">{{ statusStats.RESERVED || 0 }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">已占用</text>
          <text class="stat-value occupied">{{ statusStats.OCCUPIED || 0 }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">维护中</text>
          <text class="stat-value maintenance">{{ statusStats.MAINTENANCE || 0 }}</text>
        </view>
      </view>
    </view>

    <view class="results-section" v-if="errorMessage">
      <view class="section-title">❌ 错误信息</view>
      <view class="error-message">{{ errorMessage }}</view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      venueId: '1',
      testDate: this.getTodayDate(),
      loading: false,
      apiResponse: null,
      processedData: [],
      statusStats: null,
      errorMessage: ''
    }
  },
  
  methods: {
    getTodayDate() {
      const today = new Date()
      return today.toISOString().split('T')[0]
    },
    
    async testDirectAPI() {
      if (!this.venueId || !this.testDate) {
        uni.showToast({
          title: '请输入场馆ID和日期',
          icon: 'none'
        })
        return
      }
      
      this.loading = true
      this.errorMessage = ''
      this.apiResponse = null
      this.processedData = []
      this.statusStats = null
      
      try {
        console.log('🚀 开始直接API测试:', { venueId: this.venueId, date: this.testDate })
        
        // 直接调用uni.request测试API
        const response = await this.makeDirectRequest()
        
        console.log('📋 API原始响应:', response)
        this.apiResponse = response
        
        // 处理响应数据
        this.processResponseData(response)
        
      } catch (error) {
        console.error('❌ API测试失败:', error)
        this.errorMessage = error.message || '请求失败'
        
        uni.showToast({
          title: '测试失败: ' + this.errorMessage,
          icon: 'none',
          duration: 3000
        })
      } finally {
        this.loading = false
      }
    },
    
    makeDirectRequest() {
      return new Promise((resolve, reject) => {
        const url = `http://localhost:8080/api/timeslots/venue/${this.venueId}/date/${this.testDate}`
        
        console.log('🌐 请求URL:', url)
        
        uni.request({
          url: url,
          method: 'GET',
          header: {
            'Content-Type': 'application/json'
          },
          timeout: 15000,
          success: (res) => {
            console.log('✅ 请求成功:', res)
            if (res.statusCode === 200) {
              resolve(res.data)
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${res.data?.message || '请求失败'}`))
            }
          },
          fail: (err) => {
            console.error('❌ 请求失败:', err)
            reject(new Error(err.errMsg || '网络请求失败'))
          }
        })
      })
    },
    
    processResponseData(response) {
      let timeSlots = []
      
      // 处理不同的响应格式
      if (response && response.success && response.data) {
        timeSlots = response.data
      } else if (response && Array.isArray(response)) {
        timeSlots = response
      } else if (response && response.data && Array.isArray(response.data)) {
        timeSlots = response.data
      } else {
        console.warn('⚠️ 无法识别的响应格式:', response)
        return
      }
      
      console.log('📊 处理时间段数据:', timeSlots)
      this.processedData = timeSlots
      
      // 统计状态
      this.calculateStatusStats(timeSlots)
    },
    
    calculateStatusStats(timeSlots) {
      const stats = {
        total: timeSlots.length
      }
      
      timeSlots.forEach(slot => {
        const status = slot.status || 'UNKNOWN'
        stats[status] = (stats[status] || 0) + 1
      })
      
      this.statusStats = stats
      console.log('📈 状态统计:', stats)
    },
    
    getStatusClass(status) {
      const classMap = {
        'AVAILABLE': 'available',
        'RESERVED': 'reserved',
        'OCCUPIED': 'occupied',
        'MAINTENANCE': 'maintenance'
      }
      return classMap[status] || 'unknown'
    }
  }
}
</script>

<style scoped>
.container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: #666;
  display: block;
}

.test-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.input-group {
  margin-bottom: 15px;
}

.label {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 5px;
}

.input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
}

.test-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(45deg, #007AFF, #5AC8FA);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  margin-top: 10px;
}

.test-btn:disabled {
  background: #ccc;
}

.results-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
  display: block;
}

.code-block {
  background: #f8f8f8;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 15px;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.timeslot-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timeslot-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8f8f8;
  border-radius: 8px;
  border-left: 4px solid #ddd;
}

.time-range {
  font-weight: bold;
  color: #333;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.status.available {
  background: #e8f5e8;
  color: #4caf50;
}

.status.reserved {
  background: #fff3e0;
  color: #ff9800;
}

.status.occupied {
  background: #ffebee;
  color: #f44336;
}

.status.maintenance {
  background: #f3e5f5;
  color: #9c27b0;
}

.price {
  font-weight: bold;
  color: #ff6b35;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 15px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background: #f8f8f8;
  border-radius: 8px;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.stat-value.available {
  color: #4caf50;
}

.stat-value.reserved {
  color: #ff9800;
}

.stat-value.occupied {
  color: #f44336;
}

.stat-value.maintenance {
  color: #9c27b0;
}

.error-message {
  background: #ffebee;
  color: #f44336;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #f44336;
}
</style>