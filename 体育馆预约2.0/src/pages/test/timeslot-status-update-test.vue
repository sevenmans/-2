<template>
  <view class="test-container">
    <view class="test-header">
      <text class="test-title">时间段状态更新测试</text>
      <text class="test-subtitle">验证订单取消后前端状态更新</text>
    </view>

    <view class="test-section">
      <text class="section-title">测试配置</text>
      <view class="config-item">
        <text>场馆ID:</text>
        <input v-model="testConfig.venueId" placeholder="输入场馆ID" class="config-input" />
      </view>
      <view class="config-item">
        <text>日期:</text>
        <input v-model="testConfig.date" placeholder="YYYY-MM-DD" class="config-input" />
      </view>
      <view class="config-item">
        <text>时间段ID:</text>
        <input v-model="testConfig.timeslotId" placeholder="输入时间段ID" class="config-input" />
      </view>
    </view>

    <view class="test-section">
      <text class="section-title">测试操作</text>
      <view class="button-group">
        <button @click="initializeTest" class="test-btn primary">初始化测试</button>
        <button @click="simulateOrderCancel" class="test-btn warning">模拟订单取消</button>
        <button @click="checkTimeslotStatus" class="test-btn info">检查时间段状态</button>
        <button @click="clearAllCache" class="test-btn danger">清除所有缓存</button>
        <button @click="forceRefresh" class="test-btn success">强制刷新</button>
      </view>
    </view>

    <view class="test-section">
      <text class="section-title">当前状态</text>
      <view class="status-display">
        <view class="status-item">
          <text class="status-label">时间段状态:</text>
          <text :class="['status-value', getStatusClass(currentStatus)]">{{ currentStatus || '未知' }}</text>
        </view>
        <view class="status-item">
          <text class="status-label">缓存状态:</text>
          <text class="status-value">{{ cacheStatus }}</text>
        </view>
        <view class="status-item">
          <text class="status-label">最后更新:</text>
          <text class="status-value">{{ lastUpdate }}</text>
        </view>
      </view>
    </view>

    <view class="test-section">
      <text class="section-title">测试结果</text>
      <scroll-view class="test-results" scroll-y>
        <view v-for="(result, index) in testResults" :key="index" 
              :class="['result-item', result.type]">
          <text class="result-time">{{ result.time }}</text>
          <text class="result-message">{{ result.message }}</text>
        </view>
      </scroll-view>
    </view>

    <view class="test-section">
      <text class="section-title">事件监听状态</text>
      <view class="event-status">
        <view v-for="(status, event) in eventListeners" :key="event" class="event-item">
          <text class="event-name">{{ event }}:</text>
          <text :class="['event-status', status ? 'active' : 'inactive']">{{ status ? '已监听' : '未监听' }}</text>
        </view>
      </view>
    </view>

    <view class="test-section">
      <text class="section-title">缓存详情</text>
      <scroll-view class="cache-details" scroll-y>
        <view v-for="(value, key) in cacheDetails" :key="key" class="cache-item">
          <text class="cache-key">{{ key }}:</text>
          <text class="cache-value">{{ JSON.stringify(value) }}</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useVenueStore } from '@/stores/venue'
import { useBookingStore } from '@/stores/booking'
import { useCacheManager } from '@/utils/cache-manager'
import { useUnifiedTimeSlotManager } from '@/utils/unified-timeslot-manager'
import { useTimeSlotManager } from '@/utils/timeslot-manager'

// 测试配置
const testConfig = reactive({
  venueId: '1',
  date: new Date().toISOString().split('T')[0],
  timeslotId: ''
})

// 状态数据
const currentStatus = ref('')
const cacheStatus = ref('未检查')
const lastUpdate = ref('')
const testResults = ref([])
const cacheDetails = ref({})

// 事件监听器状态
const eventListeners = reactive({
  'timeslot-updated': false,
  'force-refresh-timeslots': false,
  'timeslots-status-updated': false,
  'timeslots-refreshed': false,
  'booking-status-changed': false,
  'orderCancelled': false
})

// Store实例
const venueStore = useVenueStore()
const bookingStore = useBookingStore()
const cacheManager = useCacheManager()
const unifiedTimeSlotManager = useUnifiedTimeSlotManager()
const timeSlotManager = useTimeSlotManager()

// 添加测试结果
const addTestResult = (message, type = 'info') => {
  testResults.value.unshift({
    time: new Date().toLocaleTimeString(),
    message,
    type
  })
  // 限制结果数量
  if (testResults.value.length > 50) {
    testResults.value = testResults.value.slice(0, 50)
  }
}

// 获取状态样式类
const getStatusClass = (status) => {
  switch (status) {
    case 'AVAILABLE': return 'status-available'
    case 'BOOKED': return 'status-booked'
    case 'MAINTENANCE': return 'status-maintenance'
    default: return 'status-unknown'
  }
}

// 初始化测试
const initializeTest = async () => {
  try {
    addTestResult('开始初始化测试...', 'info')
    
    // 设置事件监听器
    setupEventListeners()
    
    // 检查当前时间段状态
    await checkTimeslotStatus()
    
    // 检查缓存状态
    await checkCacheStatus()
    
    addTestResult('测试初始化完成', 'success')
  } catch (error) {
    addTestResult(`初始化失败: ${error.message}`, 'error')
  }
}

// 设置事件监听器
const setupEventListeners = () => {
  const events = Object.keys(eventListeners)
  
  events.forEach(eventName => {
    try {
      uni.$off(eventName) // 先移除旧监听器
      uni.$on(eventName, (data) => {
        addTestResult(`收到事件: ${eventName}`, 'event')
        if (data) {
          addTestResult(`事件数据: ${JSON.stringify(data)}`, 'event')
        }
        
        // 如果是时间段相关事件，自动检查状态
        if (eventName.includes('timeslot') || eventName.includes('booking')) {
          setTimeout(() => {
            checkTimeslotStatus()
          }, 100)
        }
      })
      eventListeners[eventName] = true
      addTestResult(`已监听事件: ${eventName}`, 'success')
    } catch (error) {
      addTestResult(`监听事件失败 ${eventName}: ${error.message}`, 'error')
    }
  })
}

// 模拟订单取消
const simulateOrderCancel = async () => {
  try {
    addTestResult('开始模拟订单取消...', 'info')
    
    // 1. 发送订单取消事件
    uni.$emit('orderCancelled', {
      venueId: testConfig.venueId,
      date: testConfig.date,
      timeslotId: testConfig.timeslotId,
      timestamp: Date.now()
    })
    
    // 2. 发送时间段更新事件
    uni.$emit('timeslot-updated', {
      venueId: testConfig.venueId,
      date: testConfig.date,
      timeslotId: testConfig.timeslotId,
      status: 'AVAILABLE',
      immediateUpdate: true
    })
    
    // 3. 发送强制刷新事件
    uni.$emit('force-refresh-timeslots', {
      venueId: testConfig.venueId,
      date: testConfig.date,
      source: 'order-cancel-test'
    })
    
    // 4. 调用统一时间段管理器释放时间段
    if (unifiedTimeSlotManager && unifiedTimeSlotManager.immediateReleaseTimeSlots) {
      await unifiedTimeSlotManager.immediateReleaseTimeSlots({
        venueId: testConfig.venueId,
        date: testConfig.date,
        timeslotId: testConfig.timeslotId
      })
    }
    
    // 5. 清除相关缓存
    await clearRelatedCache()
    
    addTestResult('订单取消模拟完成', 'success')
    
    // 延迟检查状态
    setTimeout(async () => {
      await checkTimeslotStatus()
      await checkCacheStatus()
    }, 500)
    
  } catch (error) {
    addTestResult(`模拟订单取消失败: ${error.message}`, 'error')
  }
}

// 检查时间段状态
const checkTimeslotStatus = async () => {
  try {
    addTestResult('检查时间段状态...', 'info')
    
    // 从多个来源检查状态
    const sources = [
      { name: 'Venue Store', getter: () => venueStore.getTimeSlotStatus?.(testConfig.timeslotId) },
      { name: 'Booking Store', getter: () => bookingStore.getTimeslotStatus?.(testConfig.timeslotId) },
      { name: 'Unified Manager', getter: () => unifiedTimeSlotManager.getTimeslotStatus?.(testConfig.timeslotId) },
      { name: 'TimeSlot Manager', getter: () => timeSlotManager.getTimeslotStatus?.(testConfig.timeslotId) }
    ]
    
    for (const source of sources) {
      try {
        const status = source.getter()
        addTestResult(`${source.name} 状态: ${status || '未找到'}`, 'info')
        if (status) {
          currentStatus.value = status
        }
      } catch (error) {
        addTestResult(`${source.name} 检查失败: ${error.message}`, 'warning')
      }
    }
    
    // 从API获取最新状态
    try {
      const response = await venueStore.getTimeSlots(testConfig.venueId, testConfig.date)
      if (response && response.data) {
        const timeslot = response.data.find(slot => slot.id == testConfig.timeslotId)
        if (timeslot) {
          currentStatus.value = timeslot.status
          addTestResult(`API 状态: ${timeslot.status}`, 'success')
        } else {
          addTestResult('API中未找到对应时间段', 'warning')
        }
      }
    } catch (error) {
      addTestResult(`API检查失败: ${error.message}`, 'error')
    }
    
    lastUpdate.value = new Date().toLocaleTimeString()
    
  } catch (error) {
    addTestResult(`检查时间段状态失败: ${error.message}`, 'error')
  }
}

// 检查缓存状态
const checkCacheStatus = async () => {
  try {
    addTestResult('检查缓存状态...', 'info')
    
    const cacheKeys = [
      `timeslots_${testConfig.venueId}_${testConfig.date}`,
      `venue_detail_${testConfig.venueId}`,
      `timeslot_status_${testConfig.timeslotId}`,
      'booking_cache',
      'venue_cache'
    ]
    
    const details = {}
    let hasCache = false
    
    for (const key of cacheKeys) {
      try {
        // 检查不同的缓存来源
        const sources = [
          { name: 'uni.getStorageSync', getter: () => uni.getStorageSync(key) },
          { name: 'cacheManager', getter: () => cacheManager.get?.(key) },
          { name: 'venueStore cache', getter: () => venueStore.cache?.[key] },
          { name: 'bookingStore cache', getter: () => bookingStore.cache?.[key] }
        ]
        
        for (const source of sources) {
          try {
            const value = source.getter()
            if (value) {
              details[`${key} (${source.name})`] = value
              hasCache = true
              addTestResult(`发现缓存: ${key} in ${source.name}`, 'info')
            }
          } catch (error) {
            // 忽略单个缓存检查错误
          }
        }
      } catch (error) {
        addTestResult(`检查缓存 ${key} 失败: ${error.message}`, 'warning')
      }
    }
    
    cacheDetails.value = details
    cacheStatus.value = hasCache ? '存在缓存' : '无缓存'
    
    addTestResult(`缓存检查完成: ${cacheStatus.value}`, 'success')
    
  } catch (error) {
    addTestResult(`检查缓存状态失败: ${error.message}`, 'error')
  }
}

// 清除相关缓存
const clearRelatedCache = async () => {
  try {
    addTestResult('清除相关缓存...', 'info')
    
    const cacheKeys = [
      `timeslots_${testConfig.venueId}_${testConfig.date}`,
      `venue_detail_${testConfig.venueId}`,
      `timeslot_status_${testConfig.timeslotId}`,
      'booking_cache',
      'venue_cache'
    ]
    
    // 清除uni storage
    for (const key of cacheKeys) {
      try {
        uni.removeStorageSync(key)
        addTestResult(`已清除 uni storage: ${key}`, 'success')
      } catch (error) {
        addTestResult(`清除 uni storage 失败 ${key}: ${error.message}`, 'warning')
      }
    }
    
    // 清除 cache manager
    if (cacheManager && cacheManager.clear) {
      try {
        await cacheManager.clear()
        addTestResult('已清除 cache manager', 'success')
      } catch (error) {
        addTestResult(`清除 cache manager 失败: ${error.message}`, 'warning')
      }
    }
    
    // 清除 store 缓存
    if (venueStore.clearCache) {
      try {
        await venueStore.clearCache()
        addTestResult('已清除 venue store 缓存', 'success')
      } catch (error) {
        addTestResult(`清除 venue store 缓存失败: ${error.message}`, 'warning')
      }
    }
    
    if (bookingStore.clearCache) {
      try {
        await bookingStore.clearCache()
        addTestResult('已清除 booking store 缓存', 'success')
      } catch (error) {
        addTestResult(`清除 booking store 缓存失败: ${error.message}`, 'warning')
      }
    }
    
  } catch (error) {
    addTestResult(`清除缓存失败: ${error.message}`, 'error')
  }
}

// 清除所有缓存
const clearAllCache = async () => {
  await clearRelatedCache()
  await checkCacheStatus()
}

// 强制刷新
const forceRefresh = async () => {
  try {
    addTestResult('执行强制刷新...', 'info')
    
    // 清除缓存
    await clearRelatedCache()
    
    // 调用各种刷新方法
    const refreshMethods = [
      { name: 'venueStore.refreshTimeSlotStatusSafe', method: () => venueStore.refreshTimeSlotStatusSafe?.(true) },
      { name: 'venueStore.forceRefreshTimeSlots', method: () => venueStore.forceRefreshTimeSlots?.() },
      { name: 'timeSlotManager.refreshStatus', method: () => timeSlotManager.refreshStatus?.() },
      { name: 'unifiedTimeSlotManager.forceRefresh', method: () => unifiedTimeSlotManager.forceRefresh?.() }
    ]
    
    for (const refresh of refreshMethods) {
      try {
        if (refresh.method) {
          await refresh.method()
          addTestResult(`${refresh.name} 执行成功`, 'success')
        } else {
          addTestResult(`${refresh.name} 方法不存在`, 'warning')
        }
      } catch (error) {
        addTestResult(`${refresh.name} 执行失败: ${error.message}`, 'error')
      }
    }
    
    // 发送刷新事件
    uni.$emit('force-refresh-timeslots', {
      venueId: testConfig.venueId,
      date: testConfig.date,
      source: 'manual-test'
    })
    
    // 延迟检查结果
    setTimeout(async () => {
      await checkTimeslotStatus()
      await checkCacheStatus()
    }, 1000)
    
  } catch (error) {
    addTestResult(`强制刷新失败: ${error.message}`, 'error')
  }
}

// 组件挂载
onMounted(() => {
  addTestResult('测试页面已加载', 'info')
  initializeTest()
})

// 组件卸载
onUnmounted(() => {
  // 清理事件监听器
  Object.keys(eventListeners).forEach(eventName => {
    try {
      uni.$off(eventName)
    } catch (error) {
      // 忽略清理错误
    }
  })
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
  border-bottom: 2rpx solid #eee;
  padding-bottom: 10rpx;
}

.config-item {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.config-item text {
  width: 150rpx;
  font-size: 28rpx;
  color: #333;
}

.config-input {
  flex: 1;
  padding: 10rpx 20rpx;
  border: 2rpx solid #ddd;
  border-radius: 5rpx;
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
  border-radius: 10rpx;
  font-size: 28rpx;
  border: none;
  color: #fff;
}

.test-btn.primary {
  background-color: #007aff;
}

.test-btn.warning {
  background-color: #ff9500;
}

.test-btn.info {
  background-color: #5ac8fa;
}

.test-btn.danger {
  background-color: #ff3b30;
}

.test-btn.success {
  background-color: #34c759;
}

.status-display {
  display: flex;
  flex-direction: column;
  gap: 15rpx;
}

.status-item {
  display: flex;
  align-items: center;
  padding: 15rpx;
  background-color: #f8f8f8;
  border-radius: 8rpx;
}

.status-label {
  width: 200rpx;
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}

.status-value {
  flex: 1;
  font-size: 28rpx;
  color: #666;
}

.status-available {
  color: #34c759;
  font-weight: bold;
}

.status-booked {
  color: #ff3b30;
  font-weight: bold;
}

.status-maintenance {
  color: #ff9500;
  font-weight: bold;
}

.status-unknown {
  color: #999;
}

.test-results {
  height: 400rpx;
  border: 2rpx solid #eee;
  border-radius: 8rpx;
  padding: 10rpx;
}

.result-item {
  padding: 10rpx;
  margin-bottom: 10rpx;
  border-radius: 5rpx;
  border-left: 6rpx solid #ddd;
}

.result-item.success {
  background-color: #f0f9ff;
  border-left-color: #34c759;
}

.result-item.error {
  background-color: #fff5f5;
  border-left-color: #ff3b30;
}

.result-item.warning {
  background-color: #fffbf0;
  border-left-color: #ff9500;
}

.result-item.info {
  background-color: #f8f9fa;
  border-left-color: #007aff;
}

.result-item.event {
  background-color: #f0f8ff;
  border-left-color: #5ac8fa;
}

.result-time {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 5rpx;
}

.result-message {
  font-size: 26rpx;
  color: #333;
  display: block;
}

.event-status {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.event-item {
  display: flex;
  align-items: center;
  padding: 10rpx;
  background-color: #f8f8f8;
  border-radius: 5rpx;
}

.event-name {
  flex: 1;
  font-size: 26rpx;
  color: #333;
}

.event-status {
  font-size: 24rpx;
  padding: 5rpx 10rpx;
  border-radius: 3rpx;
}

.event-status.active {
  background-color: #34c759;
  color: #fff;
}

.event-status.inactive {
  background-color: #ff3b30;
  color: #fff;
}

.cache-details {
  height: 300rpx;
  border: 2rpx solid #eee;
  border-radius: 8rpx;
  padding: 10rpx;
}

.cache-item {
  padding: 10rpx;
  margin-bottom: 10rpx;
  background-color: #f8f8f8;
  border-radius: 5rpx;
}

.cache-key {
  font-size: 26rpx;
  color: #333;
  font-weight: bold;
  display: block;
  margin-bottom: 5rpx;
}

.cache-value {
  font-size: 24rpx;
  color: #666;
  display: block;
  word-break: break-all;
}
</style>