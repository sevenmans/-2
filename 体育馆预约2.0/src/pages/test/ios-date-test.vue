<template>
  <view class="container">
    <view class="header">
      <text class="title">iOS日期兼容性测试</text>
    </view>
    
    <view class="test-section">
      <view class="section-title">日期格式测试</view>
      
      <view class="test-item">
        <text class="test-label">原始格式 (有问题):</text>
        <text class="test-value">{{ originalFormat }}</text>
        <text class="test-result" :class="originalResult.success ? 'success' : 'error'">
          {{ originalResult.message }}
        </text>
      </view>
      
      <view class="test-item">
        <text class="test-label">修复格式 (iOS兼容):</text>
        <text class="test-value">{{ fixedFormat }}</text>
        <text class="test-result" :class="fixedResult.success ? 'success' : 'error'">
          {{ fixedResult.message }}
        </text>
      </view>
      
      <view class="test-item">
        <text class="test-label">ISO格式 (推荐):</text>
        <text class="test-value">{{ isoFormat }}</text>
        <text class="test-result" :class="isoResult.success ? 'success' : 'error'">
          {{ isoResult.message }}
        </text>
      </view>
    </view>
    
    <view class="test-section">
      <view class="section-title">拼场时间检查测试</view>
      
      <view class="test-item" v-for="(test, index) in timeTests" :key="index">
        <text class="test-label">{{ test.label }}:</text>
        <text class="test-value">{{ test.dateTime }}</text>
        <text class="test-result" :class="test.result.success ? 'success' : 'error'">
          {{ test.result.message }}
        </text>
      </view>
    </view>
    
    <view class="actions">
      <button class="test-btn" @click="runTests">重新测试</button>
      <button class="back-btn" @click="goBack">返回</button>
    </view>
    
    <view class="logs">
      <view class="section-title">测试日志</view>
      <view class="log-item" v-for="(log, index) in logs" :key="index">
        <text class="log-text">{{ log }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'IOSDateTest',
  
  data() {
    return {
      selectedDate: '2025-08-07',
      startTime: '20:30',
      logs: [],
      originalFormat: '',
      fixedFormat: '',
      isoFormat: '',
      originalResult: { success: false, message: '' },
      fixedResult: { success: false, message: '' },
      isoResult: { success: false, message: '' },
      timeTests: []
    }
  },
  
  onLoad() {
    this.runTests()
  },
  
  methods: {
    log(message) {
      const timestamp = new Date().toLocaleTimeString()
      this.logs.unshift(`[${timestamp}] ${message}`)
      console.log(message)
    },
    
    runTests() {
      this.logs = []
      this.log('开始iOS日期兼容性测试...')
      
      // 测试不同的日期格式
      this.testDateFormats()
      
      // 测试拼场时间检查
      this.testSharingTimeValidation()
      
      this.log('测试完成')
    },
    
    testDateFormats() {
      this.log('=== 日期格式测试 ===')
      
      // 1. 原始格式 (有问题的格式)
      this.originalFormat = `${this.selectedDate} ${this.startTime}`
      try {
        const originalDate = new Date(this.originalFormat)
        if (isNaN(originalDate.getTime())) {
          this.originalResult = { success: false, message: '无效日期 (iOS不支持)' }
          this.log(`❌ 原始格式失败: ${this.originalFormat}`)
        } else {
          this.originalResult = { success: true, message: `有效: ${originalDate.toISOString()}` }
          this.log(`✅ 原始格式成功: ${this.originalFormat} -> ${originalDate.toISOString()}`)
        }
      } catch (error) {
        this.originalResult = { success: false, message: `错误: ${error.message}` }
        this.log(`❌ 原始格式异常: ${error.message}`)
      }
      
      // 2. 修复格式 (iOS兼容)
      const dateStr = this.selectedDate.replace(/-/g, '/')
      const timeStr = this.startTime + ':00'
      this.fixedFormat = `${dateStr} ${timeStr}`
      try {
        const fixedDate = new Date(this.fixedFormat)
        if (isNaN(fixedDate.getTime())) {
          this.fixedResult = { success: false, message: '无效日期' }
          this.log(`❌ 修复格式失败: ${this.fixedFormat}`)
        } else {
          this.fixedResult = { success: true, message: `有效: ${fixedDate.toISOString()}` }
          this.log(`✅ 修复格式成功: ${this.fixedFormat} -> ${fixedDate.toISOString()}`)
        }
      } catch (error) {
        this.fixedResult = { success: false, message: `错误: ${error.message}` }
        this.log(`❌ 修复格式异常: ${error.message}`)
      }
      
      // 3. ISO格式 (推荐)
      this.isoFormat = `${this.selectedDate}T${this.startTime}:00`
      try {
        const isoDate = new Date(this.isoFormat)
        if (isNaN(isoDate.getTime())) {
          this.isoResult = { success: false, message: '无效日期' }
          this.log(`❌ ISO格式失败: ${this.isoFormat}`)
        } else {
          this.isoResult = { success: true, message: `有效: ${isoDate.toISOString()}` }
          this.log(`✅ ISO格式成功: ${this.isoFormat} -> ${isoDate.toISOString()}`)
        }
      } catch (error) {
        this.isoResult = { success: false, message: `错误: ${error.message}` }
        this.log(`❌ ISO格式异常: ${error.message}`)
      }
    },
    
    testSharingTimeValidation() {
      this.log('=== 拼场时间检查测试 ===')
      
      const now = new Date()
      const testCases = [
        { hours: 1, label: '1小时后' },
        { hours: 2, label: '2小时后' },
        { hours: 3, label: '3小时后' },
        { hours: 4, label: '4小时后' }
      ]
      
      this.timeTests = testCases.map(testCase => {
        const futureTime = new Date(now.getTime() + testCase.hours * 60 * 60 * 1000)
        const dateStr = futureTime.toISOString().split('T')[0]
        const timeStr = futureTime.toTimeString().split(' ')[0].substring(0, 5)
        
        const result = this.isTimeSlotValidForSharing({
          startTime: timeStr
        }, dateStr)
        
        this.log(`${testCase.label}: ${result.success ? '✅' : '❌'} ${result.message}`)
        
        return {
          label: testCase.label,
          dateTime: `${dateStr} ${timeStr}`,
          result: result
        }
      })
    },
    
    // 模拟修复后的拼场时间检查方法
    isTimeSlotValidForSharing(slot, testDate = null) {
      try {
        const now = new Date()
        const selectedDate = testDate || this.selectedDate
        
        // 使用修复后的日期格式
        const dateStr = selectedDate.replace(/-/g, '/')
        const timeStr = slot.startTime + ':00'
        const selectedDateTime = new Date(`${dateStr} ${timeStr}`)
        
        if (isNaN(selectedDateTime.getTime())) {
          return { success: false, message: '无效的日期时间' }
        }
        
        const timeDiff = selectedDateTime.getTime() - now.getTime()
        const hoursDiff = timeDiff / (1000 * 60 * 60)
        
        const isValid = hoursDiff >= 3
        return {
          success: isValid,
          message: isValid ? 
            `有效 (提前${hoursDiff.toFixed(1)}小时)` : 
            `无效 (仅提前${hoursDiff.toFixed(1)}小时，需要3小时以上)`
        }
      } catch (error) {
        return { success: false, message: `错误: ${error.message}` }
      }
    },
    
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
  
  .title {
    font-size: 36rpx;
    font-weight: 600;
    color: #333;
  }
}

.test-section {
  background-color: white;
  border-radius: 12rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  
  .section-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
    margin-bottom: 30rpx;
    border-bottom: 2rpx solid #f0f0f0;
    padding-bottom: 20rpx;
  }
}

.test-item {
  margin-bottom: 30rpx;
  padding: 20rpx;
  background-color: #f8f9fa;
  border-radius: 8rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .test-label {
    display: block;
    font-size: 28rpx;
    font-weight: 600;
    color: #333;
    margin-bottom: 10rpx;
  }
  
  .test-value {
    display: block;
    font-size: 26rpx;
    color: #666;
    margin-bottom: 10rpx;
    font-family: monospace;
  }
  
  .test-result {
    display: block;
    font-size: 26rpx;
    
    &.success {
      color: #28a745;
    }
    
    &.error {
      color: #dc3545;
    }
  }
}

.actions {
  display: flex;
  gap: 20rpx;
  margin-bottom: 30rpx;
  
  .test-btn, .back-btn {
    flex: 1;
    height: 80rpx;
    border: none;
    border-radius: 8rpx;
    font-size: 28rpx;
  }
  
  .test-btn {
    background-color: #007bff;
    color: white;
  }
  
  .back-btn {
    background-color: #6c757d;
    color: white;
  }
}

.logs {
  background-color: white;
  border-radius: 12rpx;
  padding: 30rpx;
  
  .section-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
    margin-bottom: 20rpx;
  }
  
  .log-item {
    margin-bottom: 10rpx;
    
    .log-text {
      font-size: 24rpx;
      color: #666;
      font-family: monospace;
      line-height: 1.4;
    }
  }
}
</style>