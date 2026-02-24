<template>
  <view class="test-container">
    <view class="test-header">
      <text class="test-title">时间段显示修复测试</text>
      <text class="test-subtitle">验证非今日日期时间段显示是否正常</text>
    </view>
    
    <view class="test-section">
      <text class="section-title">测试场景</text>
      <view class="test-item">
        <text class="test-label">当前日期:</text>
        <text class="test-value">{{ currentDate }}</text>
      </view>
      <view class="test-item">
        <text class="test-label">测试日期:</text>
        <text class="test-value">{{ testDate }}</text>
      </view>
    </view>
    
    <view class="test-section">
      <text class="section-title">修复验证</text>
      <button @click="testTimeSlotExpiry" class="test-button">测试时间段过期检查</button>
      <button @click="testNonTodaySlots" class="test-button">测试非今日时间段</button>
      <button @click="clearLogs" class="test-button clear-btn">清空日志</button>
    </view>
    
    <view class="test-section">
      <text class="section-title">测试结果</text>
      <scroll-view class="log-container" scroll-y>
        <view v-for="(log, index) in testLogs" :key="index" class="log-item">
          <text class="log-text" :class="log.type">{{ log.message }}</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { TimeSlotValidator } from '@/utils/timeslot-validator.js'
import { UnifiedTimeSlotManager } from '@/utils/unified-timeslot-manager.js'

const currentDate = ref('')
const testDate = ref('')
const testLogs = ref([])

const addLog = (message, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString()
  testLogs.value.push({
    message: `[${timestamp}] ${message}`,
    type
  })
  console.log(`[TimeslotDisplayFixTest] ${message}`)
}

const clearLogs = () => {
  testLogs.value = []
  addLog('日志已清空', 'info')
}

const testTimeSlotExpiry = () => {
  addLog('开始测试时间段过期检查逻辑', 'info')
  
  // 测试今日时间段
  const todaySlot = {
    id: 1,
    date: currentDate.value,
    startTime: '09:00',
    endTime: '09:30',
    status: 'AVAILABLE'
  }
  
  const isTodayExpired = TimeSlotValidator.isSlotExpired(todaySlot)
  addLog(`今日时间段过期检查: ${isTodayExpired ? '已过期' : '未过期'}`, isTodayExpired ? 'warning' : 'success')
  
  // 测试非今日时间段
  const futureSlot = {
    id: 2,
    date: testDate.value,
    startTime: '09:00',
    endTime: '09:30',
    status: 'AVAILABLE'
  }
  
  const isFutureExpired = TimeSlotValidator.isSlotExpired(futureSlot)
  addLog(`非今日时间段过期检查: ${isFutureExpired ? '已过期' : '未过期'}`, isFutureExpired ? 'error' : 'success')
  
  if (!isFutureExpired) {
    addLog('✅ 修复成功：非今日时间段不会被标记为过期', 'success')
  } else {
    addLog('❌ 修复失败：非今日时间段仍被错误标记为过期', 'error')
  }
}

const testNonTodaySlots = () => {
  addLog('开始测试非今日时间段状态处理', 'info')
  
  const testSlots = [
    {
      id: 1,
      date: testDate.value,
      startTime: '09:00',
      endTime: '09:30',
      status: 'AVAILABLE'
    },
    {
      id: 2,
      date: testDate.value,
      startTime: '10:00',
      endTime: '10:30',
      status: 'AVAILABLE'
    },
    {
      id: 3,
      date: testDate.value,
      startTime: '11:00',
      endTime: '11:30',
      status: 'OCCUPIED'
    }
  ]
  
  // 创建时间段管理器实例进行测试
  const manager = new UnifiedTimeSlotManager()
  const processedSlots = manager.processTimeSlotStatus(testSlots, testDate.value)
  
  addLog(`处理了 ${processedSlots.length} 个时间段`, 'info')
  
  processedSlots.forEach((slot, index) => {
    const statusText = slot.status === 'AVAILABLE' ? '可用' : 
                      slot.status === 'OCCUPIED' ? '已占用' : 
                      slot.status === 'EXPIRED' ? '已过期' : slot.status
    
    addLog(`时间段 ${index + 1}: ${slot.startTime}-${slot.endTime} 状态: ${statusText}`, 
           slot.status === 'EXPIRED' ? 'error' : 'info')
  })
  
  const expiredCount = processedSlots.filter(slot => slot.status === 'EXPIRED').length
  const availableCount = processedSlots.filter(slot => slot.status === 'AVAILABLE').length
  
  if (expiredCount === 0 && availableCount > 0) {
    addLog('✅ 修复成功：非今日时间段状态正常', 'success')
  } else if (expiredCount > 0) {
    addLog(`❌ 修复失败：发现 ${expiredCount} 个非今日时间段被错误标记为过期`, 'error')
  }
}

onMounted(() => {
  const now = new Date()
  currentDate.value = now.toISOString().split('T')[0]
  
  // 设置测试日期为明天
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  testDate.value = tomorrow.toISOString().split('T')[0]
  
  addLog('时间段显示修复测试页面已加载', 'info')
  addLog('请点击测试按钮验证修复效果', 'info')
})
</script>

<style scoped>
.test-container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.test-header {
  text-align: center;
  margin-bottom: 30rpx;
  padding: 20rpx;
  background-color: #fff;
  border-radius: 10rpx;
}

.test-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.test-subtitle {
  font-size: 28rpx;
  color: #666;
  display: block;
}

.test-section {
  margin-bottom: 30rpx;
  padding: 20rpx;
  background-color: #fff;
  border-radius: 10rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
}

.test-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10rpx 0;
  border-bottom: 1rpx solid #eee;
}

.test-label {
  font-size: 28rpx;
  color: #666;
}

.test-value {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}

.test-button {
  width: 100%;
  margin-bottom: 20rpx;
  padding: 20rpx;
  background-color: #007aff;
  color: #fff;
  border: none;
  border-radius: 10rpx;
  font-size: 28rpx;
}

.clear-btn {
  background-color: #ff3b30;
}

.log-container {
  height: 400rpx;
  border: 1rpx solid #ddd;
  border-radius: 10rpx;
  padding: 10rpx;
  background-color: #f9f9f9;
}

.log-item {
  margin-bottom: 10rpx;
}

.log-text {
  font-size: 24rpx;
  line-height: 1.4;
  display: block;
}

.log-text.info {
  color: #333;
}

.log-text.success {
  color: #34c759;
  font-weight: bold;
}

.log-text.warning {
  color: #ff9500;
  font-weight: bold;
}

.log-text.error {
  color: #ff3b30;
  font-weight: bold;
}
</style>