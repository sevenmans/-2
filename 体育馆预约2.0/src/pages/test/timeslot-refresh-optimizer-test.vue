<template>
  <view class="container">
    <view class="header">
      <text class="title">🚀 时间段刷新优化器测试</text>
      <text class="subtitle">测试智能刷新策略和性能优化效果</text>
    </view>

    <!-- 测试控制面板 -->
    <view class="control-panel">
      <view class="form-group">
        <text class="label">场馆ID:</text>
        <input v-model="testVenueId" placeholder="输入场馆ID" class="input" />
      </view>
      
      <view class="form-group">
        <text class="label">日期:</text>
        <input v-model="testDate" placeholder="YYYY-MM-DD" class="input" />
      </view>
      
      <view class="form-group">
        <text class="label">刷新场景:</text>
        <picker @change="onScenarioChange" :value="scenarioIndex" :range="scenarios">
          <view class="picker">{{ scenarios[scenarioIndex] }}</view>
        </picker>
      </view>
      
      <view class="checkbox-group">
        <checkbox-group @change="onOptionsChange">
          <label class="checkbox-item">
            <checkbox value="forceRefresh" />强制刷新
          </label>
          <label class="checkbox-item">
            <checkbox value="skipCache" />跳过缓存
          </label>
        </checkbox-group>
      </view>
    </view>

    <!-- 测试按钮 -->
    <view class="button-group">
      <button @click="testSmartRefresh" :disabled="isLoading" class="test-btn primary">
        {{ isLoading ? '刷新中...' : '🎯 智能刷新测试' }}
      </button>
      
      <button @click="testTraditionalRefresh" :disabled="isLoading" class="test-btn secondary">
        {{ isLoading ? '刷新中...' : '📡 传统刷新对比' }}
      </button>
      
      <button @click="clearCache" class="test-btn warning">
        🧹 清除缓存
      </button>
      
      <button @click="getPerformanceMetrics" class="test-btn info">
        📊 性能指标
      </button>
    </view>

    <!-- 结果显示 -->
    <view class="results-section">
      <view class="result-card" v-if="lastTestResult">
        <view class="card-header">
          <text class="card-title">📋 最新测试结果</text>
          <text class="timestamp">{{ lastTestResult.timestamp }}</text>
        </view>
        
        <view class="metrics">
          <view class="metric-item">
            <text class="metric-label">刷新方式:</text>
            <text class="metric-value">{{ lastTestResult.method }}</text>
          </view>
          <view class="metric-item">
            <text class="metric-label">耗时:</text>
            <text class="metric-value">{{ lastTestResult.duration }}ms</text>
          </view>
          <view class="metric-item">
            <text class="metric-label">时间段数量:</text>
            <text class="metric-value">{{ lastTestResult.timeSlotsCount }}</text>
          </view>
          <view class="metric-item">
            <text class="metric-label">策略:</text>
            <text class="metric-value">{{ lastTestResult.strategy || '未知' }}</text>
          </view>
        </view>
      </view>

      <!-- 性能指标 -->
      <view class="result-card" v-if="performanceMetrics">
        <view class="card-header">
          <text class="card-title">📊 性能指标</text>
        </view>
        
        <view class="metrics">
          <view class="metric-item">
            <text class="metric-label">总刷新次数:</text>
            <text class="metric-value">{{ performanceMetrics.totalRefreshes }}</text>
          </view>
          <view class="metric-item">
            <text class="metric-label">成功次数:</text>
            <text class="metric-value">{{ performanceMetrics.successfulRefreshes }}</text>
          </view>
          <view class="metric-item">
            <text class="metric-label">失败次数:</text>
            <text class="metric-value">{{ performanceMetrics.failedRefreshes }}</text>
          </view>
          <view class="metric-item">
            <text class="metric-label">平均耗时:</text>
            <text class="metric-value">{{ performanceMetrics.averageRefreshTime }}ms</text>
          </view>
          <view class="metric-item">
            <text class="metric-label">缓存命中率:</text>
            <text class="metric-value">{{ (performanceMetrics.cacheHitRate * 100).toFixed(1) }}%</text>
          </view>
        </view>
      </view>

      <!-- 时间段数据 -->
      <view class="result-card" v-if="timeSlots.length > 0">
        <view class="card-header">
          <text class="card-title">⏰ 时间段数据 ({{ timeSlots.length }}个)</text>
        </view>
        
        <scroll-view scroll-y class="timeslots-list">
          <view v-for="slot in timeSlots" :key="slot.id" class="timeslot-item">
            <view class="slot-time">{{ slot.startTime }} - {{ slot.endTime }}</view>
            <view class="slot-status" :class="slot.status.toLowerCase()">{{ slot.status }}</view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 日志输出 -->
    <view class="log-section">
      <view class="log-header">
        <text class="log-title">📝 测试日志</text>
        <button @click="clearLogs" class="clear-logs-btn">清除</button>
      </view>
      <scroll-view scroll-y class="log-content">
        <text v-for="(log, index) in logs" :key="index" class="log-item">{{ log }}</text>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { useVenueStore } from '@/stores/venue.js'

export default {
  name: 'TimeslotRefreshOptimizerTest',
  
  data() {
    return {
      testVenueId: '1', // 默认测试场馆ID
      testDate: '', // 默认今天
      scenarios: ['general', 'booking', 'payment', 'navigation'],
      scenarioIndex: 0,
      selectedOptions: [],
      isLoading: false,
      lastTestResult: null,
      performanceMetrics: null,
      timeSlots: [],
      logs: []
    }
  },
  
  computed: {
    venueStore() {
      return useVenueStore()
    },
    
    currentScenario() {
      return this.scenarios[this.scenarioIndex]
    }
  },
  
  mounted() {
    // 设置默认日期为今天
    const today = new Date()
    this.testDate = today.toISOString().split('T')[0]
    
    this.addLog('🚀 时间段刷新优化器测试页面已加载')
  },
  
  methods: {
    onScenarioChange(e) {
      this.scenarioIndex = e.detail.value
      this.addLog(`📋 切换测试场景: ${this.currentScenario}`)
    },
    
    onOptionsChange(e) {
      this.selectedOptions = e.detail.value
      this.addLog(`⚙️ 更新选项: ${this.selectedOptions.join(', ')}`)
    },
    
    async testSmartRefresh() {
      if (!this.testVenueId || !this.testDate) {
        uni.showToast({ title: '请填写场馆ID和日期', icon: 'none' })
        return
      }
      
      this.isLoading = true
      const startTime = Date.now()
      
      try {
        this.addLog(`🎯 开始智能刷新测试 - 场馆: ${this.testVenueId}, 日期: ${this.testDate}`)
        
        const options = {
          scenario: this.currentScenario,
          forceRefresh: this.selectedOptions.includes('forceRefresh'),
          skipCache: this.selectedOptions.includes('skipCache'),
          source: 'test_page'
        }
        
        this.addLog(`⚙️ 刷新选项: ${JSON.stringify(options)}`)
        
        // 调用智能刷新
        const result = await this.venueStore.refreshTimeSlotStatus(
          this.testVenueId, 
          this.testDate
        )
        
        const duration = Date.now() - startTime
        
        this.lastTestResult = {
          method: '智能刷新',
          duration,
          timeSlotsCount: result?.length || 0,
          strategy: '智能策略', // 这里可以从优化器获取实际使用的策略
          timestamp: new Date().toLocaleTimeString()
        }
        
        this.timeSlots = result || []
        
        this.addLog(`✅ 智能刷新成功 - 耗时: ${duration}ms, 获取: ${result?.length || 0}个时间段`)
        
        uni.showToast({ title: '智能刷新成功', icon: 'success' })
        
      } catch (error) {
        const duration = Date.now() - startTime
        this.addLog(`❌ 智能刷新失败 - 耗时: ${duration}ms, 错误: ${error.message}`)
        
        uni.showToast({ title: '智能刷新失败', icon: 'error' })
        console.error('智能刷新测试失败:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    async testTraditionalRefresh() {
      if (!this.testVenueId || !this.testDate) {
        uni.showToast({ title: '请填写场馆ID和日期', icon: 'none' })
        return
      }
      
      this.isLoading = true
      const startTime = Date.now()
      
      try {
        this.addLog(`📡 开始传统刷新测试 - 场馆: ${this.testVenueId}, 日期: ${this.testDate}`)
        
        // 调用传统的getTimeSlots方法作为对比
        const result = await this.venueStore.getTimeSlots(
          this.testVenueId, 
          this.testDate, 
          true // forceRefresh
        )
        
        const duration = Date.now() - startTime
        
        this.lastTestResult = {
          method: '传统刷新',
          duration,
          timeSlotsCount: result?.length || 0,
          strategy: '传统API调用',
          timestamp: new Date().toLocaleTimeString()
        }
        
        this.timeSlots = result || []
        
        this.addLog(`✅ 传统刷新成功 - 耗时: ${duration}ms, 获取: ${result?.length || 0}个时间段`)
        
        uni.showToast({ title: '传统刷新成功', icon: 'success' })
        
      } catch (error) {
        const duration = Date.now() - startTime
        this.addLog(`❌ 传统刷新失败 - 耗时: ${duration}ms, 错误: ${error.message}`)
        
        uni.showToast({ title: '传统刷新失败', icon: 'error' })
        console.error('传统刷新测试失败:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    clearCache() {
      try {
        // 清除优化器缓存
        if (this.venueStore.timeSlotRefreshOptimizer) {
          this.venueStore.timeSlotRefreshOptimizer.clearCache(this.testVenueId, this.testDate)
          this.addLog('🧹 清除优化器缓存')
        }
        
        // 清除时间段管理器缓存
        if (this.venueStore.timeSlotManager) {
          this.venueStore.timeSlotManager.clearCache(this.testVenueId, this.testDate)
          this.addLog('🧹 清除时间段管理器缓存')
        }
        
        // 清除本地存储
        uni.removeStorageSync(`timeslots_${this.testVenueId}_${this.testDate}`)
        this.addLog('🧹 清除本地存储缓存')
        
        uni.showToast({ title: '缓存已清除', icon: 'success' })
        
      } catch (error) {
        this.addLog(`❌ 清除缓存失败: ${error.message}`)
        uni.showToast({ title: '清除缓存失败', icon: 'error' })
      }
    },
    
    getPerformanceMetrics() {
      try {
        if (this.venueStore.timeSlotRefreshOptimizer) {
          this.performanceMetrics = this.venueStore.timeSlotRefreshOptimizer.getPerformanceMetrics()
          this.addLog('📊 获取性能指标成功')
        } else {
          this.addLog('⚠️ 优化器未初始化，无法获取性能指标')
          uni.showToast({ title: '优化器未初始化', icon: 'none' })
        }
      } catch (error) {
        this.addLog(`❌ 获取性能指标失败: ${error.message}`)
        uni.showToast({ title: '获取性能指标失败', icon: 'error' })
      }
    },
    
    addLog(message) {
      const timestamp = new Date().toLocaleTimeString()
      this.logs.unshift(`[${timestamp}] ${message}`)
      
      // 限制日志数量
      if (this.logs.length > 100) {
        this.logs = this.logs.slice(0, 100)
      }
    },
    
    clearLogs() {
      this.logs = []
      this.addLog('📝 日志已清除')
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

.control-panel {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 30rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 10rpx;
}

.input {
  width: 100%;
  height: 80rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}

.picker {
  height: 80rpx;
  line-height: 80rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  background: white;
}

.checkbox-group {
  margin-top: 20rpx;
}

.checkbox-item {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  font-size: 28rpx;
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.test-btn {
  flex: 1;
  min-width: 200rpx;
  height: 80rpx;
  border-radius: 8rpx;
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

.info {
  background: #5856D6;
  color: white;
}

.results-section {
  margin-bottom: 30rpx;
}

.result-card {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.timestamp {
  font-size: 24rpx;
  color: #999;
}

.metrics {
  display: flex;
  flex-direction: column;
  gap: 15rpx;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-size: 28rpx;
  color: #666;
}

.metric-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.timeslots-list {
  max-height: 400rpx;
}

.timeslot-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.slot-time {
  font-size: 28rpx;
  color: #333;
}

.slot-status {
  font-size: 24rpx;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  color: white;
}

.slot-status.available {
  background: #34C759;
}

.slot-status.occupied {
  background: #FF3B30;
}

.slot-status.maintenance {
  background: #FF9500;
}

.log-section {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.log-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.clear-logs-btn {
  background: #FF3B30;
  color: white;
  border: none;
  border-radius: 6rpx;
  padding: 10rpx 20rpx;
  font-size: 24rpx;
}

.log-content {
  max-height: 400rpx;
  background: #f8f8f8;
  border-radius: 8rpx;
  padding: 20rpx;
}

.log-item {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 10rpx;
  font-family: monospace;
}
</style>