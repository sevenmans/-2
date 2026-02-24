<template>
  <view class="debug-container">
    <view class="header">
      <text class="title">🔍 时间段状态刷新深度调试</text>
      <text class="subtitle">深入分析时间段状态刷新不生效的根本原因</text>
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
        <button @click="loadTimeSlots" class="btn primary">📋 加载时间段</button>
        <button @click="simulateBooking" class="btn secondary">🎯 模拟预约</button>
        <button @click="checkSlotIds" class="btn success">🔍 检查ID匹配</button>
        <button @click="clearLogs" class="btn warning">🗑️ 清除日志</button>
      </view>
    </view>

    <!-- 时间段对比 -->
    <view class="comparison-section">
      <text class="section-title">时间段ID对比分析</text>
      
      <view class="comparison-grid">
        <view class="comparison-column">
          <text class="column-title">前端时间段 ({{ frontendSlots.length }}个)</text>
          <scroll-view class="slots-list" scroll-y>
            <view v-for="slot in frontendSlots" :key="slot.id" class="slot-item frontend">
              <text class="slot-id">ID: {{ slot.id }}</text>
              <text class="slot-time">{{ slot.startTime }}-{{ slot.endTime }}</text>
              <text class="slot-status">{{ slot.status }}</text>
              <text class="slot-type">{{ slot.isGenerated ? '前端生成' : '后端数据' }}</text>
            </view>
          </scroll-view>
        </view>

        <view class="comparison-column">
          <text class="column-title">后端时间段 ({{ backendSlots.length }}个)</text>
          <scroll-view class="slots-list" scroll-y>
            <view v-for="slot in backendSlots" :key="slot.id" class="slot-item backend">
              <text class="slot-id">ID: {{ slot.id }}</text>
              <text class="slot-time">{{ slot.startTime }}-{{ slot.endTime }}</text>
              <text class="slot-status">{{ slot.status }}</text>
              <text class="slot-type">后端数据</text>
            </view>
          </scroll-view>
        </view>
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
            <text class="data-content">{{ formatData(log.data) }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- ID匹配分析 -->
    <view class="analysis-section" v-if="idAnalysis.length > 0">
      <text class="section-title">ID匹配分析</text>
      <view v-for="(analysis, index) in idAnalysis" :key="index" class="analysis-item">
        <text class="analysis-title">{{ analysis.title }}</text>
        <text class="analysis-result">{{ analysis.result }}</text>
        <view v-if="analysis.details" class="analysis-details">
          <text class="details-content">{{ analysis.details }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useVenueStore } from '@/stores/venue.js'
import { getVenueTimeSlots } from '@/api/timeslot.js'

export default {
  name: 'TimeslotStatusDebug',
  
  data() {
    return {
      venueId: 34,
      testDate: this.getTodayDate(),
      logs: [],
      frontendSlots: [],
      backendSlots: [],
      idAnalysis: [],
      venueStore: null
    }
  },
  
  onLoad() {
    this.venueStore = useVenueStore()
    this.addLog('info', '深度调试工具初始化完成')
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
      
      if (this.logs.length > 30) {
        this.logs = this.logs.slice(0, 30)
      }
    },

    clearLogs() {
      this.logs = []
      this.idAnalysis = []
      this.addLog('info', '日志和分析结果已清除')
    },

    formatData(data) {
      if (typeof data === 'object') {
        return JSON.stringify(data, null, 2)
      }
      return String(data)
    },

    // 加载时间段
    async loadTimeSlots() {
      try {
        this.addLog('info', '开始加载时间段数据...')
        
        // 1. 加载场馆详情
        await this.venueStore.getVenueDetail(this.venueId)
        this.addLog('success', '场馆详情加载成功', {
          name: this.venueStore.venueDetail?.name,
          openTime: this.venueStore.venueDetail?.openTime,
          closeTime: this.venueStore.venueDetail?.closeTime
        })

        // 2. 获取前端时间段（通过venue store）
        await this.venueStore.getTimeSlots(this.venueId, this.testDate, true)
        this.frontendSlots = [...this.venueStore.timeSlots]
        this.addLog('success', `前端时间段加载完成: ${this.frontendSlots.length}个`, {
          sampleSlot: this.frontendSlots[0],
          idTypes: this.frontendSlots.map(slot => ({ id: slot.id, type: typeof slot.id }))
        })

        // 3. 直接从后端API获取时间段
        const backendResponse = await getVenueTimeSlots(this.venueId, this.testDate, true)
        this.backendSlots = backendResponse?.data || []
        this.addLog('success', `后端时间段加载完成: ${this.backendSlots.length}个`, {
          sampleSlot: this.backendSlots[0],
          idTypes: this.backendSlots.map(slot => ({ id: slot.id, type: typeof slot.id }))
        })

        // 4. 分析ID匹配情况
        this.analyzeIdMatching()

      } catch (error) {
        this.addLog('error', `加载时间段失败: ${error.message}`)
      }
    },

    // 分析ID匹配情况
    analyzeIdMatching() {
      this.idAnalysis = []

      // 分析1: ID格式对比
      const frontendIdFormats = this.frontendSlots.map(slot => ({
        id: slot.id,
        type: typeof slot.id,
        isString: typeof slot.id === 'string',
        isNumber: typeof slot.id === 'number',
        format: this.analyzeIdFormat(slot.id)
      }))

      const backendIdFormats = this.backendSlots.map(slot => ({
        id: slot.id,
        type: typeof slot.id,
        isString: typeof slot.id === 'string',
        isNumber: typeof slot.id === 'number',
        format: this.analyzeIdFormat(slot.id)
      }))

      this.idAnalysis.push({
        title: 'ID格式分析',
        result: `前端: ${frontendIdFormats[0]?.format || '无'}, 后端: ${backendIdFormats[0]?.format || '无'}`,
        details: `前端ID示例: ${frontendIdFormats[0]?.id}, 后端ID示例: ${backendIdFormats[0]?.id}`
      })

      // 分析2: ID匹配度
      const frontendIds = this.frontendSlots.map(slot => slot.id)
      const backendIds = this.backendSlots.map(slot => slot.id)
      const matchingIds = frontendIds.filter(id => backendIds.includes(id))

      this.idAnalysis.push({
        title: 'ID匹配度分析',
        result: `匹配: ${matchingIds.length}/${frontendIds.length}`,
        details: `匹配的ID: ${matchingIds.slice(0, 5).join(', ')}${matchingIds.length > 5 ? '...' : ''}`
      })

      // 分析3: 时间段对应关系
      const timeMatches = this.frontendSlots.filter(frontSlot => {
        return this.backendSlots.some(backSlot => 
          frontSlot.startTime === backSlot.startTime && 
          frontSlot.endTime === backSlot.endTime
        )
      })

      this.idAnalysis.push({
        title: '时间段对应关系',
        result: `时间匹配: ${timeMatches.length}/${this.frontendSlots.length}`,
        details: `相同时间段但ID不同的情况可能导致状态刷新失败`
      })

      this.addLog('success', 'ID匹配分析完成', this.idAnalysis)
    },

    // 分析ID格式
    analyzeIdFormat(id) {
      if (typeof id === 'string') {
        if (id.startsWith('frontend_') || id.startsWith('default_')) {
          return '前端生成格式'
        } else if (/^\d+$/.test(id)) {
          return '字符串数字'
        } else {
          return '其他字符串格式'
        }
      } else if (typeof id === 'number') {
        return '数字格式'
      } else {
        return '未知格式'
      }
    },

    // 模拟预约
    async simulateBooking() {
      try {
        if (this.frontendSlots.length === 0) {
          this.addLog('warning', '请先加载时间段数据')
          return
        }

        const availableSlots = this.frontendSlots.filter(slot => slot.status === 'AVAILABLE')
        if (availableSlots.length === 0) {
          this.addLog('warning', '没有可用的时间段进行模拟')
          return
        }

        const testSlot = availableSlots[0]
        this.addLog('info', '开始模拟预约状态刷新...', {
          testSlot: testSlot,
          slotId: testSlot.id,
          slotIdType: typeof testSlot.id
        })

        // 模拟调用onBookingSuccess
        await this.venueStore.onBookingSuccess(this.venueId, this.testDate, [testSlot.id])
        
        // 检查状态是否更新
        const updatedSlot = this.venueStore.timeSlots.find(slot => slot.id === testSlot.id)
        if (updatedSlot && updatedSlot.status === 'RESERVED') {
          this.addLog('success', '乐观更新成功', {
            slotId: testSlot.id,
            oldStatus: testSlot.status,
            newStatus: updatedSlot.status
          })
        } else {
          this.addLog('error', '乐观更新失败', {
            slotId: testSlot.id,
            expectedStatus: 'RESERVED',
            actualStatus: updatedSlot?.status || '未找到'
          })
        }

        // 等待后端确认
        setTimeout(() => {
          this.checkBackendUpdate(testSlot.id)
        }, 2000)

      } catch (error) {
        this.addLog('error', `模拟预约失败: ${error.message}`)
      }
    },

    // 检查后端更新
    async checkBackendUpdate(slotId) {
      try {
        this.addLog('info', '检查后端状态更新...')
        
        // 重新获取后端数据
        const backendResponse = await getVenueTimeSlots(this.venueId, this.testDate, true)
        const newBackendSlots = backendResponse?.data || []
        
        const updatedBackendSlot = newBackendSlots.find(slot => slot.id === slotId)
        if (updatedBackendSlot) {
          this.addLog('success', '找到后端对应时间段', {
            slotId: slotId,
            backendStatus: updatedBackendSlot.status
          })
        } else {
          this.addLog('warning', '后端未找到对应时间段', {
            searchId: slotId,
            backendIds: newBackendSlots.map(slot => slot.id).slice(0, 5)
          })
        }

      } catch (error) {
        this.addLog('error', `检查后端更新失败: ${error.message}`)
      }
    },

    // 检查时间段ID
    checkSlotIds() {
      if (this.frontendSlots.length === 0 || this.backendSlots.length === 0) {
        this.addLog('warning', '请先加载时间段数据')
        return
      }

      this.addLog('info', '开始详细检查时间段ID...')

      // 详细对比前5个时间段
      for (let i = 0; i < Math.min(5, this.frontendSlots.length); i++) {
        const frontSlot = this.frontendSlots[i]
        const backSlot = this.backendSlots[i]

        this.addLog('info', `时间段${i + 1}对比`, {
          frontend: {
            id: frontSlot?.id,
            time: `${frontSlot?.startTime}-${frontSlot?.endTime}`,
            status: frontSlot?.status
          },
          backend: {
            id: backSlot?.id,
            time: `${backSlot?.startTime}-${backSlot?.endTime}`,
            status: backSlot?.status
          },
          idMatch: frontSlot?.id === backSlot?.id,
          timeMatch: frontSlot?.startTime === backSlot?.startTime && frontSlot?.endTime === backSlot?.endTime
        })
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

.control-panel, .comparison-section, .logs-section, .analysis-section {
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

.comparison-grid {
  display: flex;
  gap: 20rpx;
}

.comparison-column {
  flex: 1;
}

.column-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 15rpx;
  text-align: center;
}

.slots-list {
  height: 400rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  padding: 10rpx;
}

.slot-item {
  border-radius: 8rpx;
  padding: 15rpx;
  margin-bottom: 10rpx;
}

.slot-item.frontend {
  background: #e3f2fd;
  border-left: 4rpx solid #2196F3;
}

.slot-item.backend {
  background: #e8f5e8;
  border-left: 4rpx solid #4CAF50;
}

.slot-id, .slot-time, .slot-status, .slot-type {
  font-size: 24rpx;
  display: block;
  margin-bottom: 5rpx;
}

.slot-id {
  color: #333;
  font-weight: bold;
}

.slot-time {
  color: #666;
}

.slot-status {
  color: #007AFF;
}

.slot-type {
  color: #999;
  font-size: 22rpx;
}

.logs-container {
  height: 400rpx;
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

.analysis-item {
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  padding: 20rpx;
  margin-bottom: 15rpx;
}

.analysis-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.analysis-result {
  font-size: 26rpx;
  color: #007AFF;
  display: block;
  margin-bottom: 10rpx;
}

.analysis-details {
  background: #f8f8f8;
  border-radius: 6rpx;
  padding: 10rpx;
}

.details-content {
  font-size: 24rpx;
  color: #666;
  display: block;
}
</style>
