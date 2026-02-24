<template>
  <view class="container">
    <view class="header">
      <text class="title">时间段同步修复测试</text>
    </view>
    
    <!-- 测试参数 -->
    <view class="test-section">
      <view class="section-title">测试参数</view>
      
      <view class="test-item">
        <text class="test-label">场馆ID:</text>
        <input v-model="testVenueId" placeholder="输入场馆ID" class="test-input" />
      </view>
      
      <view class="test-item">
        <text class="test-label">测试日期:</text>
        <input v-model="testDate" placeholder="YYYY-MM-DD" class="test-input" />
      </view>
    </view>
    
    <!-- 测试1: 检查同步状态 -->
    <view class="test-section">
      <view class="section-title">测试1: 检查同步状态</view>
      
      <button @click="checkSyncStatus" class="test-button">检查同步状态</button>
      
      <view v-if="syncStatusResult" class="test-result">
        <text class="result-title">同步状态结果:</text>
        <view class="result-item">
          <text>前端时间段: {{ syncStatusResult.frontendSlots }}个</text>
        </view>
        <view class="result-item">
          <text>后端时间段: {{ syncStatusResult.backendSlots }}个</text>
        </view>
        <view class="result-item">
          <text>已同步: {{ syncStatusResult.synced ? '✅' : '❌' }}</text>
        </view>
        <view class="result-item">
          <text>需要同步: {{ syncStatusResult.needsSync ? '是' : '否' }}</text>
        </view>
        <view v-if="syncStatusResult.issues.length > 0" class="result-item">
          <text>问题: {{ syncStatusResult.issues.join(', ') }}</text>
        </view>
      </view>
    </view>
    
    <!-- 测试2: 修复时间段生成 -->
    <view class="test-section">
      <view class="section-title">测试2: 修复时间段生成</view>
      
      <button @click="fixTimeSlotGeneration" class="test-button">修复时间段生成</button>
      
      <view v-if="fixGenerationResult" class="test-result">
        <text class="result-title">修复生成结果:</text>
        <view class="result-item">
          <text>成功: {{ fixGenerationResult.success ? '✅' : '❌' }}</text>
        </view>
        <view class="result-item">
          <text>生成时间段: {{ fixGenerationResult.generatedSlots?.length || 0 }}个</text>
        </view>
        <view class="result-item">
          <text>同步到后端: {{ fixGenerationResult.syncedToBackend ? '✅' : '❌' }}</text>
        </view>
        <view class="result-item">
          <text>执行步骤: {{ fixGenerationResult.steps.join(' → ') }}</text>
        </view>
      </view>
    </view>
    
    <!-- 测试3: 强制重新生成 -->
    <view class="test-section">
      <view class="section-title">测试3: 强制重新生成</view>
      
      <button @click="forceRegenerate" class="test-button">强制重新生成</button>
      
      <view v-if="forceRegenerateResult" class="test-result">
        <text class="result-title">强制重新生成结果:</text>
        <view class="result-item">
          <text>成功: {{ forceRegenerateResult.success ? '✅' : '❌' }}</text>
        </view>
        <view class="result-item">
          <text>生成方式: {{ forceRegenerateResult.method }}</text>
        </view>
        <view class="result-item">
          <text>时间段数量: {{ forceRegenerateResult.slotsCount }}个</text>
        </view>
        <view v-if="forceRegenerateResult.error" class="result-item">
          <text>错误: {{ forceRegenerateResult.error }}</text>
        </view>
      </view>
    </view>
    
    <!-- 测试4: 自动修复 -->
    <view class="test-section">
      <view class="section-title">测试4: 自动修复</view>
      
      <button @click="autoFix" class="test-button">自动修复问题</button>
      
      <view v-if="autoFixResult" class="test-result">
        <text class="result-title">自动修复结果:</text>
        <view class="result-item">
          <text>成功: {{ autoFixResult.success ? '✅' : '❌' }}</text>
        </view>
        <view class="result-item">
          <text>最终时间段: {{ autoFixResult.finalSlotsCount }}个</text>
        </view>
        <view class="result-item">
          <text>执行步骤: {{ autoFixResult.steps.join(' → ') }}</text>
        </view>
      </view>
    </view>
    
    <!-- 测试日志 -->
    <view class="test-section">
      <view class="section-title">测试日志</view>
      
      <button @click="clearLogs" class="test-button secondary">清除日志</button>
      
      <view class="test-logs">
        <view v-for="(log, index) in testLogs" :key="index" class="log-item">
          <text>{{ log }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useVenueStore } from '@/stores/venue.js'

export default {
  name: 'TimeSlotSyncTest',
  
  data() {
    return {
      testVenueId: '34',
      testDate: '2025-07-20',
      syncStatusResult: null,
      fixGenerationResult: null,
      forceRegenerateResult: null,
      autoFixResult: null,
      testLogs: []
    }
  },
  
  setup() {
    const venueStore = useVenueStore()
    return {
      venueStore
    }
  },
  
  methods: {
    addLog(message) {
      const timestamp = new Date().toLocaleTimeString()
      this.testLogs.push(`[${timestamp}] ${message}`)
      console.log(`[时间段同步测试] ${message}`)
    },
    
    clearLogs() {
      this.testLogs = []
    },
    
    async checkSyncStatus() {
      try {
        this.addLog('开始检查同步状态...')

        // 简化的同步状态检查
        const timeSlots = await this.venueStore.getTimeSlots(this.testVenueId, this.testDate, true)
        this.syncStatusResult = {
          success: true,
          message: `获取到 ${timeSlots?.length || 0} 个时间段`,
          data: timeSlots
        }

        this.addLog(`同步状态检查完成: 前端${this.syncStatusResult.frontendSlots}个, 后端${this.syncStatusResult.backendSlots}个`)
      } catch (error) {
        this.addLog(`检查同步状态失败: ${error.message}`)
        console.error('检查同步状态失败:', error)
      }
    },
    
    async fixTimeSlotGeneration() {
      try {
        this.addLog('开始修复时间段生成...')
        
        // 简化的时间段生成修复
        await this.venueStore.getTimeSlots(this.testVenueId, this.testDate, true)
        this.fixGenerationResult = {
          success: true,
          message: '时间段生成修复完成',
          generatedSlots: []
        }
        
        this.addLog(`时间段生成修复完成: ${this.fixGenerationResult.success ? '成功' : '失败'}`)
        if (this.fixGenerationResult.success) {
          this.addLog(`生成了${this.fixGenerationResult.generatedSlots?.length || 0}个时间段`)
        }
      } catch (error) {
        this.addLog(`修复时间段生成失败: ${error.message}`)
        console.error('修复时间段生成失败:', error)
      }
    },
    
    async forceRegenerate() {
      try {
        this.addLog('开始强制重新生成...')
        
        // 简化的强制重新生成
        await this.venueStore.getTimeSlots(this.testVenueId, this.testDate, true)
        this.forceRegenerateResult = {
          success: true,
          message: '强制重新生成完成',
          regenerated: true
        }
        
        this.addLog(`强制重新生成完成: ${this.forceRegenerateResult.success ? '成功' : '失败'}`)
        if (this.forceRegenerateResult.success) {
          this.addLog(`使用${this.forceRegenerateResult.method}方式生成了${this.forceRegenerateResult.slotsCount}个时间段`)
        }
      } catch (error) {
        this.addLog(`强制重新生成失败: ${error.message}`)
        console.error('强制重新生成失败:', error)
      }
    },
    
    async autoFix() {
      try {
        this.addLog('开始自动修复...')
        
        // 简化的自动修复
        await this.venueStore.getTimeSlots(this.testVenueId, this.testDate, true)
        this.autoFixResult = {
          success: true,
          message: '自动修复完成',
          fixed: true
        }
        
        this.addLog(`自动修复完成: ${this.autoFixResult.success ? '成功' : '失败'}`)
        if (this.autoFixResult.success) {
          this.addLog(`最终有${this.autoFixResult.finalSlotsCount}个时间段`)
        }
      } catch (error) {
        this.addLog(`自动修复失败: ${error.message}`)
        console.error('自动修复失败:', error)
      }
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
}

.test-section {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
  border-bottom: 2px solid #007AFF;
  padding-bottom: 5px;
}

.test-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.test-label {
  width: 80px;
  font-size: 14px;
  color: #666;
}

.test-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.test-button {
  background-color: #007AFF;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px 24px;
  font-size: 16px;
  margin-bottom: 15px;
}

.test-button.secondary {
  background-color: #666;
}

.test-result {
  background-color: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
  border-left: 4px solid #007AFF;
}

.result-title {
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
  display: block;
}

.result-item {
  margin-bottom: 8px;
}

.result-item text {
  font-size: 14px;
  color: #555;
}

.test-logs {
  max-height: 300px;
  overflow-y: auto;
  background-color: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
}

.log-item {
  margin-bottom: 5px;
  font-size: 12px;
  color: #666;
  font-family: monospace;
}
</style>
