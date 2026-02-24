<template>
  <view class="validation-container">
    <view class="header">
      <text class="title">🔍 字段映射完整性验证</text>
      <text class="subtitle">验证拼场、包场、时间段所有字段都与后端数据库完全匹配</text>
    </view>

    <!-- 控制面板 -->
    <view class="control-panel">
      <view class="input-group">
        <text class="label">场馆ID:</text>
        <input v-model="venueId" type="number" class="input" />
      </view>
      
      <view class="input-group">
        <text class="label">测试日期:</text>
        <input v-model="testDate" type="date" class="input" />
      </view>

      <view class="button-group">
        <button @click="validateExclusiveBooking" class="btn primary">🏟️ 验证包场字段</button>
        <button @click="validateSharedBooking" class="btn secondary">🤝 验证拼场字段</button>
        <button @click="validateTimeSlots" class="btn success">⏰ 验证时间段字段</button>
        <button @click="runFullValidation" class="btn warning">🔍 全面验证</button>
        <button @click="clearResults" class="btn error">🗑️ 清除结果</button>
      </view>
    </view>

    <!-- 验证结果 -->
    <view class="results-section">
      <text class="section-title">验证结果 ({{ validationResults.length }}项)</text>
      
      <scroll-view class="results-container" scroll-y>
        <view v-for="(result, index) in validationResults" :key="index" :class="['result-item', result.status]">
          <view class="result-header">
            <text class="result-title">{{ result.title }}</text>
            <text :class="['result-status', result.status]">
              {{ getStatusText(result.status) }}
            </text>
            <text class="result-time">{{ result.time }}</text>
          </view>
          
          <view class="result-content">
            <text class="result-message">{{ result.message }}</text>
            
            <!-- 字段映射详情 -->
            <view v-if="result.mapping" class="mapping-details">
              <text class="mapping-title">字段映射:</text>
              <view v-for="(map, mapIndex) in result.mapping.mappings" :key="mapIndex" class="mapping-item">
                <text class="mapping-text">{{ map.from }} → {{ map.to }}: {{ map.value }}</text>
              </view>
              
              <view v-if="result.mapping.additions.length > 0" class="additions-section">
                <text class="additions-title">新增字段:</text>
                <view v-for="(add, addIndex) in result.mapping.additions" :key="addIndex" class="addition-item">
                  <text class="addition-text">{{ add.field }}: {{ add.value }} ({{ add.reason }})</text>
                </view>
              </view>
            </view>
            
            <!-- 验证错误 -->
            <view v-if="result.validation && result.validation.errors.length > 0" class="errors-section">
              <text class="errors-title">验证错误:</text>
              <view v-for="(error, errorIndex) in result.validation.errors" :key="errorIndex" class="error-item">
                <text class="error-text">❌ {{ error }}</text>
              </view>
            </view>
            
            <!-- 验证警告 -->
            <view v-if="result.validation && result.validation.warnings.length > 0" class="warnings-section">
              <text class="warnings-title">验证警告:</text>
              <view v-for="(warning, warnIndex) in result.validation.warnings" :key="warnIndex" class="warning-item">
                <text class="warning-text">⚠️ {{ warning }}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 统计信息 -->
    <view class="stats-section" v-if="validationStats">
      <text class="section-title">验证统计</text>
      <view class="stats-grid">
        <view class="stat-item success">
          <text class="stat-number">{{ validationStats.passed }}</text>
          <text class="stat-label">通过</text>
        </view>
        <view class="stat-item warning">
          <text class="stat-number">{{ validationStats.warnings }}</text>
          <text class="stat-label">警告</text>
        </view>
        <view class="stat-item error">
          <text class="stat-number">{{ validationStats.failed }}</text>
          <text class="stat-label">失败</text>
        </view>
        <view class="stat-item info">
          <text class="stat-number">{{ validationStats.total }}</text>
          <text class="stat-label">总计</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useVenueStore } from '@/stores/venue.js'
// 字段映射工具已简化，不再需要复杂的验证工具

export default {
  name: 'FieldMappingValidation',
  
  data() {
    return {
      venueId: 34,
      testDate: this.getTodayDate(),
      validationResults: [],
      validationStats: null,
      venueStore: null
    }
  },
  
  onLoad() {
    this.venueStore = useVenueStore()
    this.addResult('系统初始化', 'success', '字段映射验证工具初始化完成')
  },
  
  methods: {
    getTodayDate() {
      const today = new Date()
      return today.toISOString().split('T')[0]
    },

    addResult(title, status, message, mapping = null, validation = null) {
      const result = {
        title,
        status, // 'success', 'warning', 'error', 'info'
        message,
        mapping,
        validation,
        time: new Date().toLocaleTimeString()
      }
      this.validationResults.unshift(result)
      
      // 限制结果数量
      if (this.validationResults.length > 50) {
        this.validationResults = this.validationResults.slice(0, 50)
      }
      
      this.updateStats()
    },

    updateStats() {
      const stats = {
        total: this.validationResults.length,
        passed: this.validationResults.filter(r => r.status === 'success').length,
        warnings: this.validationResults.filter(r => r.status === 'warning').length,
        failed: this.validationResults.filter(r => r.status === 'error').length
      }
      this.validationStats = stats
    },

    clearResults() {
      this.validationResults = []
      this.validationStats = null
      this.addResult('清除结果', 'info', '验证结果已清除')
    },

    getStatusText(status) {
      const statusMap = {
        'success': '✅ 通过',
        'warning': '⚠️ 警告', 
        'error': '❌ 失败',
        'info': 'ℹ️ 信息'
      }
      return statusMap[status] || status
    },

    // 验证包场订单字段映射
    async validateExclusiveBooking() {
      try {
        this.addResult('包场字段验证', 'info', '开始验证包场订单字段映射...')
        
        // 加载场馆详情
        await this.venueStore.getVenueDetail(this.venueId)
        
        // 模拟包场订单数据
        const rawData = {
          venueId: this.venueId,
          date: this.testDate,
          startTime: '10:00',
          endTime: '12:00',
          price: 200,
          bookingType: 'EXCLUSIVE',
          description: '测试包场预约',
          slotIds: [1, 2]
        }

        // 🔧 修复：使用静态导入的字段映射工具
        
        // 修复数据
        const fixedData = fixExclusiveBookingData(rawData)
        
        // 验证数据
        const validation = validateDataIntegrity(fixedData, 'exclusive')
        
        // 生成映射报告
        const mapping = generateFieldMappingReport(rawData, fixedData, 'exclusive')
        
        // 添加结果
        const status = validation.valid ? (validation.warnings.length > 0 ? 'warning' : 'success') : 'error'
        this.addResult(
          '包场字段映射验证',
          status,
          validation.valid ? '包场字段映射验证通过' : '包场字段映射验证失败',
          mapping,
          validation
        )

      } catch (error) {
        this.addResult('包场字段验证', 'error', `验证失败: ${error.message}`)
      }
    },

    // 验证拼场订单字段映射
    async validateSharedBooking() {
      try {
        this.addResult('拼场字段验证', 'info', '开始验证拼场订单字段映射...')
        
        // 加载场馆详情
        await this.venueStore.getVenueDetail(this.venueId)
        
        // 模拟拼场订单数据
        const rawData = {
          venueId: this.venueId,
          date: this.testDate,
          startTime: '14:00',
          endTime: '16:00',
          price: 100, // 每队价格
          teamName: '测试球队',
          contactInfo: '13800138000',
          maxParticipants: 2,
          description: '测试拼场预约',
          slotIds: [3, 4]
        }

        // 🔧 修复：使用静态导入的字段映射工具
        
        // 修复数据
        const fixedData = fixSharedBookingData(rawData)
        
        // 验证数据
        const validation = validateDataIntegrity(fixedData, 'shared')
        
        // 生成映射报告
        const mapping = generateFieldMappingReport(rawData, fixedData, 'shared')
        
        // 添加结果
        const status = validation.valid ? (validation.warnings.length > 0 ? 'warning' : 'success') : 'error'
        this.addResult(
          '拼场字段映射验证',
          status,
          validation.valid ? '拼场字段映射验证通过' : '拼场字段映射验证失败',
          mapping,
          validation
        )

      } catch (error) {
        this.addResult('拼场字段验证', 'error', `验证失败: ${error.message}`)
      }
    },

    // 验证时间段字段映射
    async validateTimeSlots() {
      try {
        this.addResult('时间段字段验证', 'info', '开始验证时间段字段映射...')
        
        // 获取时间段数据
        await this.venueStore.getTimeSlots(this.venueId, this.testDate, true)
        const timeSlots = this.venueStore.timeSlots
        
        if (timeSlots.length === 0) {
          this.addResult('时间段字段验证', 'warning', '没有时间段数据可供验证')
          return
        }

        // 🔧 修复：使用静态导入的字段映射工具
        
        let validCount = 0
        let errorCount = 0
        
        // 验证前5个时间段
        for (let i = 0; i < Math.min(5, timeSlots.length); i++) {
          const slot = timeSlots[i]
          
          try {
            // 修复时间段数据
            const fixedSlot = fixTimeSlotData(slot, this.venueId, this.testDate)
            
            // 验证数据
            const validation = validateDataIntegrity(fixedSlot, 'timeslot')
            
            if (validation.valid) {
              validCount++
            } else {
              errorCount++
              this.addResult(
                `时间段${i + 1}验证`,
                'error',
                `时间段验证失败: ${validation.errors.join(', ')}`,
                null,
                validation
              )
            }
          } catch (error) {
            errorCount++
            this.addResult(`时间段${i + 1}验证`, 'error', `时间段处理失败: ${error.message}`)
          }
        }
        
        // 总结结果
        const status = errorCount === 0 ? 'success' : (validCount > 0 ? 'warning' : 'error')
        this.addResult(
          '时间段字段映射验证',
          status,
          `验证完成: ${validCount}个通过, ${errorCount}个失败`
        )

      } catch (error) {
        this.addResult('时间段字段验证', 'error', `验证失败: ${error.message}`)
      }
    },

    // 运行全面验证
    async runFullValidation() {
      this.addResult('全面验证', 'info', '开始运行全面字段映射验证...')
      
      try {
        await this.validateExclusiveBooking()
        await this.validateSharedBooking()
        await this.validateTimeSlots()
        
        this.addResult('全面验证', 'success', '全面验证完成，请查看各项验证结果')
      } catch (error) {
        this.addResult('全面验证', 'error', `全面验证失败: ${error.message}`)
      }
    }
  }
}
</script>

<style scoped>
.validation-container {
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

.control-panel, .results-section, .stats-section {
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
  min-width: 180rpx;
  height: 70rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  border: none;
  color: white;
}

.primary { background: #007AFF; }
.secondary { background: #5856D6; }
.success { background: #34C759; }
.warning { background: #FF9500; }
.error { background: #FF3B30; }

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
}

.results-container {
  height: 600rpx;
}

.result-item {
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 15rpx;
  border-left: 6rpx solid;
}

.result-item.success { 
  background: #e8f5e8; 
  border-left-color: #34C759;
}

.result-item.warning { 
  background: #fff3e0; 
  border-left-color: #FF9500;
}

.result-item.error { 
  background: #ffebee; 
  border-left-color: #FF3B30;
}

.result-item.info { 
  background: #e3f2fd; 
  border-left-color: #2196F3;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15rpx;
}

.result-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.result-status {
  font-size: 24rpx;
  font-weight: bold;
}

.result-status.success { color: #34C759; }
.result-status.warning { color: #FF9500; }
.result-status.error { color: #FF3B30; }
.result-status.info { color: #2196F3; }

.result-time {
  font-size: 22rpx;
  color: #999;
}

.result-message {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 15rpx;
}

.mapping-details, .errors-section, .warnings-section {
  background: rgba(0,0,0,0.05);
  border-radius: 8rpx;
  padding: 15rpx;
  margin-bottom: 10rpx;
}

.mapping-title, .errors-title, .warnings-title, .additions-title {
  font-size: 24rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.mapping-item, .error-item, .warning-item, .addition-item {
  margin-bottom: 8rpx;
}

.mapping-text, .error-text, .warning-text, .addition-text {
  font-size: 22rpx;
  color: #666;
  display: block;
  font-family: monospace;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}

.stat-item {
  text-align: center;
  padding: 20rpx;
  border-radius: 12rpx;
  color: white;
}

.stat-number {
  font-size: 36rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  display: block;
}
</style>
