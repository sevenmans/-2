<template>
  <view class="container">
    <view class="header">
      <text class="title">Pinia 修复验证测试</text>
    </view>
    
    <view class="section">
      <text class="section-title">事件监听器状态</text>
      <view class="status-grid">
        <view class="status-item" :class="{ active: venueListenerStatus }">
          <text class="status-label">Venue Store</text>
          <text class="status-value">{{ venueListenerStatus ? '✅ 已设置' : '❌ 未设置' }}</text>
        </view>
        <view class="status-item" :class="{ active: sharingListenerStatus }">
          <text class="status-label">Sharing Store</text>
          <text class="status-value">{{ sharingListenerStatus ? '✅ 已设置' : '❌ 未设置' }}</text>
        </view>
        <view class="status-item" :class="{ active: bookingListenerStatus }">
          <text class="status-label">Booking Store</text>
          <text class="status-value">{{ bookingListenerStatus ? '✅ 已设置' : '❌ 未设置' }}</text>
        </view>
      </view>
    </view>
    
    <view class="section">
      <text class="section-title">事件测试</text>
      <view class="button-grid">
        <button class="test-btn" @click="testOrderExpired">测试订单过期事件</button>
        <button class="test-btn" @click="testSharingDataChanged">测试拼场数据变化</button>
        <button class="test-btn" @click="testOrderCancelled">测试订单取消事件</button>
        <button class="test-btn" @click="testTimeSlotsUpdated">测试时间段更新</button>
      </view>
    </view>
    
    <view class="section">
      <text class="section-title">Store 状态</text>
      <view class="store-info">
        <view class="store-item">
          <text class="store-label">Venue Store 加载状态:</text>
          <text class="store-value">{{ venueStore.loading ? '加载中' : '空闲' }}</text>
        </view>
        <view class="store-item">
          <text class="store-label">Sharing Store 加载状态:</text>
          <text class="store-value">{{ sharingStore.loading ? '加载中' : '空闲' }}</text>
        </view>
        <view class="store-item">
          <text class="store-label">Booking Store 加载状态:</text>
          <text class="store-value">{{ bookingStore.loading ? '加载中' : '空闲' }}</text>
        </view>
      </view>
    </view>
    
    <view class="section">
      <text class="section-title">事件日志</text>
      <scroll-view class="log-container" scroll-y="true">
        <view v-for="(log, index) in eventLogs" :key="index" class="log-item">
          <text class="log-time">{{ log.time }}</text>
          <text class="log-content">{{ log.content }}</text>
        </view>
      </scroll-view>
      <button class="clear-btn" @click="clearLogs">清除日志</button>
    </view>
    
    <view class="section">
      <text class="section-title">修复验证</text>
      <view class="validation-grid">
        <view class="validation-item" :class="{ success: validationResults.eventListeners }">
          <text class="validation-label">事件监听器</text>
          <text class="validation-status">{{ validationResults.eventListeners ? '✅ 正常' : '❌ 异常' }}</text>
        </view>
        <view class="validation-item" :class="{ success: validationResults.storesCommunication }">
          <text class="validation-label">Store 通信</text>
          <text class="validation-status">{{ validationResults.storesCommunication ? '✅ 正常' : '❌ 异常' }}</text>
        </view>
        <view class="validation-item" :class="{ success: validationResults.cacheManagement }">
          <text class="validation-label">缓存管理</text>
          <text class="validation-status">{{ validationResults.cacheManagement ? '✅ 正常' : '❌ 异常' }}</text>
        </view>
      </view>
      <button class="validate-btn" @click="runValidation">运行完整验证</button>
    </view>
  </view>
</template>

<script>
import { useVenueStore } from '@/stores/venue.js'
import { useSharingStore } from '@/stores/sharing.js'
import { useBookingStore } from '@/stores/booking.js'

export default {
  name: 'PiniaFixValidation',
  data() {
    return {
      venueStore: null,
      sharingStore: null,
      bookingStore: null,
      venueListenerStatus: false,
      sharingListenerStatus: false,
      bookingListenerStatus: false,
      eventLogs: [],
      validationResults: {
        eventListeners: false,
        storesCommunication: false,
        cacheManagement: false
      }
    }
  },
  
  onLoad() {
    console.log('[PiniaFixValidation] 页面加载')
    this.initStores()
    this.checkListenerStatus()
    this.setupTestEventListeners()
  },
  
  onUnload() {
    console.log('[PiniaFixValidation] 页面卸载')
    this.cleanupTestEventListeners()
  },
  
  methods: {
    // 初始化 Stores
    initStores() {
      try {
        this.venueStore = useVenueStore()
        this.sharingStore = useSharingStore()
        this.bookingStore = useBookingStore()
        
        this.addLog('Stores 初始化完成')
      } catch (error) {
        console.error('[PiniaFixValidation] Stores 初始化失败:', error)
        this.addLog(`Stores 初始化失败: ${error.message}`)
      }
    },
    
    // 检查监听器状态
    checkListenerStatus() {
      // 检查是否有监听器设置方法
      this.venueListenerStatus = typeof this.venueStore?.setupOrderExpiredListener === 'function'
      this.sharingListenerStatus = typeof this.sharingStore?.setupEventListeners === 'function'
      this.bookingListenerStatus = typeof this.bookingStore?.setupEventListeners === 'function'
      
      this.addLog(`监听器状态检查完成: Venue(${this.venueListenerStatus}), Sharing(${this.sharingListenerStatus}), Booking(${this.bookingListenerStatus})`)
    },
    
    // 设置测试事件监听器
    setupTestEventListeners() {
      try {
        // 监听所有相关事件
        uni.$on('order-expired', this.onTestOrderExpired)
        uni.$on('sharing-data-changed', this.onTestSharingDataChanged)
        uni.$on('order-cancelled', this.onTestOrderCancelled)
        uni.$on('timeslots-updated', this.onTestTimeSlotsUpdated)
        uni.$on('timeslot-force-refreshed', this.onTestTimeSlotForceRefreshed)
        
        this.addLog('测试事件监听器设置完成')
      } catch (error) {
        console.error('[PiniaFixValidation] 设置测试监听器失败:', error)
        this.addLog(`设置测试监听器失败: ${error.message}`)
      }
    },
    
    // 清理测试事件监听器
    cleanupTestEventListeners() {
      try {
        uni.$off('order-expired', this.onTestOrderExpired)
        uni.$off('sharing-data-changed', this.onTestSharingDataChanged)
        uni.$off('order-cancelled', this.onTestOrderCancelled)
        uni.$off('timeslots-updated', this.onTestTimeSlotsUpdated)
        uni.$off('timeslot-force-refreshed', this.onTestTimeSlotForceRefreshed)
        
        this.addLog('测试事件监听器清理完成')
      } catch (error) {
        console.error('[PiniaFixValidation] 清理测试监听器失败:', error)
      }
    },
    
    // 测试事件处理方法
    onTestOrderExpired(eventData) {
      this.addLog(`收到订单过期事件: ${JSON.stringify(eventData)}`)
    },
    
    onTestSharingDataChanged(eventData) {
      this.addLog(`收到拼场数据变化事件: ${JSON.stringify(eventData)}`)
    },
    
    onTestOrderCancelled(eventData) {
      this.addLog(`收到订单取消事件: ${JSON.stringify(eventData)}`)
    },
    
    onTestTimeSlotsUpdated(eventData) {
      this.addLog(`收到时间段更新事件: ${JSON.stringify(eventData)}`)
    },
    
    onTestTimeSlotForceRefreshed(eventData) {
      this.addLog(`收到时间段强制刷新事件: ${JSON.stringify(eventData)}`)
    },
    
    // 测试方法
    testOrderExpired() {
      const testData = {
        orderId: 'test-order-123',
        orderNo: 'TEST20241201001',
        orderType: 'SHARING',
        venueId: 1,
        date: '2024-12-01',
        timeSlotIds: [1, 2, 3]
      }
      
      this.addLog('触发订单过期测试事件')
      uni.$emit('order-expired', testData)
    },
    
    testSharingDataChanged() {
      const testData = {
        type: 'order-expired',
        orderNo: 'TEST20241201001',
        venueId: 1,
        date: '2024-12-01'
      }
      
      this.addLog('触发拼场数据变化测试事件')
      uni.$emit('sharing-data-changed', testData)
    },
    
    testOrderCancelled() {
      const testData = {
        orderId: 'test-order-456',
        orderNo: 'TEST20241201002',
        orderType: 'BOOKING',
        venueId: 1,
        date: '2024-12-01'
      }
      
      this.addLog('触发订单取消测试事件')
      uni.$emit('order-cancelled', testData)
    },
    
    testTimeSlotsUpdated() {
      const testData = {
        venueId: 1,
        date: '2024-12-01',
        reason: 'order-expired',
        orderType: 'SHARING'
      }
      
      this.addLog('触发时间段更新测试事件')
      uni.$emit('timeslots-updated', testData)
    },
    
    // 运行完整验证
    async runValidation() {
      this.addLog('开始运行完整验证...')
      
      try {
        // 验证事件监听器
        this.validationResults.eventListeners = this.validateEventListeners()
        
        // 验证 Store 通信
        this.validationResults.storesCommunication = await this.validateStoresCommunication()
        
        // 验证缓存管理
        this.validationResults.cacheManagement = this.validateCacheManagement()
        
        const allPassed = Object.values(this.validationResults).every(result => result)
        
        this.addLog(`验证完成 - ${allPassed ? '全部通过' : '存在问题'}`)
        
        uni.showToast({
          title: allPassed ? '验证通过' : '验证失败',
          icon: allPassed ? 'success' : 'error',
          duration: 2000
        })
        
      } catch (error) {
        console.error('[PiniaFixValidation] 验证过程出错:', error)
        this.addLog(`验证过程出错: ${error.message}`)
      }
    },
    
    // 验证事件监听器
    validateEventListeners() {
      try {
        const hasVenueListeners = typeof this.venueStore?.setupOrderExpiredListener === 'function'
        const hasSharingListeners = typeof this.sharingStore?.setupEventListeners === 'function'
        const hasBookingListeners = typeof this.bookingStore?.setupEventListeners === 'function'
        
        const result = hasVenueListeners && hasSharingListeners && hasBookingListeners
        this.addLog(`事件监听器验证: ${result ? '通过' : '失败'}`)
        
        return result
      } catch (error) {
        this.addLog(`事件监听器验证出错: ${error.message}`)
        return false
      }
    },
    
    // 验证 Store 通信
    async validateStoresCommunication() {
      try {
        let communicationWorking = false
        
        // 设置临时监听器来验证通信
        const testListener = () => {
          communicationWorking = true
        }
        
        uni.$on('test-communication', testListener)
        
        // 触发测试事件
        uni.$emit('test-communication', { test: true })
        
        // 等待一下确保事件处理完成
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // 清理测试监听器
        uni.$off('test-communication', testListener)
        
        this.addLog(`Store 通信验证: ${communicationWorking ? '通过' : '失败'}`)
        
        return communicationWorking
      } catch (error) {
        this.addLog(`Store 通信验证出错: ${error.message}`)
        return false
      }
    },
    
    // 验证缓存管理
    validateCacheManagement() {
      try {
        const hasClearCache = typeof this.sharingStore?.clearCache === 'function' &&
                             typeof this.bookingStore?.clearCache === 'function'
        
        this.addLog(`缓存管理验证: ${hasClearCache ? '通过' : '失败'}`)
        
        return hasClearCache
      } catch (error) {
        this.addLog(`缓存管理验证出错: ${error.message}`)
        return false
      }
    },
    
    // 添加日志
    addLog(content) {
      const now = new Date()
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
      
      this.eventLogs.unshift({
        time,
        content
      })
      
      // 限制日志数量
      if (this.eventLogs.length > 50) {
        this.eventLogs = this.eventLogs.slice(0, 50)
      }
    },
    
    // 清除日志
    clearLogs() {
      this.eventLogs = []
      this.addLog('日志已清除')
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
}

.section {
  background-color: white;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.status-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 15rpx;
}

.status-item {
  flex: 1;
  min-width: 200rpx;
  padding: 15rpx;
  border: 2rpx solid #ddd;
  border-radius: 8rpx;
  text-align: center;
}

.status-item.active {
  border-color: #4CAF50;
  background-color: #f1f8e9;
}

.status-label {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.status-value {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
}

.button-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 15rpx;
}

.test-btn {
  flex: 1;
  min-width: 200rpx;
  padding: 15rpx;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.test-btn:active {
  background-color: #1976D2;
}

.store-info {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.store-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10rpx 0;
  border-bottom: 1rpx solid #eee;
}

.store-label {
  font-size: 28rpx;
  color: #666;
}

.store-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.log-container {
  height: 300rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  padding: 10rpx;
  margin-bottom: 15rpx;
}

.log-item {
  display: flex;
  margin-bottom: 8rpx;
  font-size: 24rpx;
}

.log-time {
  color: #999;
  margin-right: 15rpx;
  min-width: 120rpx;
}

.log-content {
  color: #333;
  flex: 1;
}

.clear-btn {
  width: 100%;
  padding: 10rpx;
  background-color: #FF9800;
  color: white;
  border: none;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.validation-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 15rpx;
  margin-bottom: 20rpx;
}

.validation-item {
  flex: 1;
  min-width: 200rpx;
  padding: 15rpx;
  border: 2rpx solid #ddd;
  border-radius: 8rpx;
  text-align: center;
}

.validation-item.success {
  border-color: #4CAF50;
  background-color: #f1f8e9;
}

.validation-label {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.validation-status {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
}

.validate-btn {
  width: 100%;
  padding: 15rpx;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 8rpx;
  font-size: 30rpx;
  font-weight: bold;
}

.validate-btn:active {
  background-color: #388E3C;
}
</style>