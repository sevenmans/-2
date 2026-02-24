<template>
  <view class="container">
    <view class="header">
      <text class="title">时间段状态同步测试</text>
    </view>

    <view class="test-section">
      <text class="section-title">测试配置</text>
      <view class="form-item">
        <text class="label">场馆ID:</text>
        <input v-model="testVenueId" type="number" placeholder="请输入场馆ID" class="input" />
      </view>
      <view class="form-item">
        <text class="label">测试日期:</text>
        <picker mode="date" :value="testDate" @change="onDateChange" class="picker">
          <view class="picker-text">{{ testDate || '请选择日期' }}</view>
        </picker>
      </view>
    </view>

    <view class="test-section">
      <text class="section-title">测试操作</text>
      <view class="button-group">
        <button @click="loadTimeSlots" class="test-btn primary">加载时间段</button>
        <button @click="clearAllCache" class="test-btn secondary">清理缓存</button>
        <button @click="refreshTimeSlots" class="test-btn primary">刷新状态</button>
        <button @click="simulateBooking" class="test-btn warning">模拟预约</button>
      </view>
    </view>

    <view class="test-section">
      <text class="section-title">测试结果</text>
      <view class="log-container">
        <text v-for="(log, index) in logs" :key="index" class="log-item">{{ log }}</text>
      </view>
    </view>

    <view class="test-section" v-if="timeSlots.length > 0">
      <text class="section-title">时间段列表 ({{ timeSlots.length }}个)</text>
      <view class="timeslot-list">
        <view 
          v-for="slot in timeSlots" 
          :key="slot.id" 
          class="timeslot-item"
          :class="{ 
            'available': slot.status === 'AVAILABLE',
            'booked': slot.status === 'BOOKED' || slot.status === 'RESERVED'
          }"
        >
          <view class="slot-time">{{ slot.startTime }} - {{ slot.endTime }}</view>
          <view class="slot-status">{{ getStatusText(slot.status) }}</view>
          <view class="slot-price">¥{{ slot.price }}</view>
          <view class="slot-id">ID: {{ slot.id }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { mapStores } from 'pinia'
import { useVenueStore } from '@/stores/venue.js'
import { useBookingStore } from '@/stores/booking.js'

export default {
  name: 'TimeslotSyncTest',
  data() {
    return {
      testVenueId: 1,
      testDate: '',
      timeSlots: [],
      logs: []
    }
  },
  computed: {
    ...mapStores(useVenueStore, useBookingStore)
  },
  mounted() {
    // 设置默认日期为今天
    const today = new Date()
    this.testDate = today.toISOString().split('T')[0]
    this.addLog('测试页面已加载')
  },
  methods: {
    addLog(message) {
      const timestamp = new Date().toLocaleTimeString()
      this.logs.unshift(`[${timestamp}] ${message}`)
      if (this.logs.length > 50) {
        this.logs = this.logs.slice(0, 50)
      }
    },

    onDateChange(e) {
      this.testDate = e.detail.value
      this.addLog(`日期已更改为: ${this.testDate}`)
    },

    async loadTimeSlots() {
      try {
        this.addLog(`开始加载时间段 - 场馆ID: ${this.testVenueId}, 日期: ${this.testDate}`)
        
        const result = await this.venueStore.getVenueTimeSlots(this.testVenueId, this.testDate)
        
        if (result && result.data) {
          this.timeSlots = result.data
          this.addLog(`✅ 加载成功 - 共${this.timeSlots.length}个时间段`)
          
          // 统计状态
          const statusCount = {}
          this.timeSlots.forEach(slot => {
            statusCount[slot.status] = (statusCount[slot.status] || 0) + 1
          })
          this.addLog(`状态统计: ${JSON.stringify(statusCount)}`)
        } else {
          this.addLog('❌ 加载失败 - 无数据返回')
        }
      } catch (error) {
        this.addLog(`❌ 加载失败: ${error.message}`)
        console.error('加载时间段失败:', error)
      }
    },

    async clearAllCache() {
      try {
        this.addLog('开始清理所有缓存...')
        
        await this.venueStore.clearTimeSlotCache(this.testVenueId, this.testDate)
        
        this.addLog('✅ 缓存清理完成')
      } catch (error) {
        this.addLog(`❌ 缓存清理失败: ${error.message}`)
        console.error('清理缓存失败:', error)
      }
    },

    async refreshTimeSlots() {
      try {
        this.addLog('开始刷新时间段状态...')
        
        const beforeCount = this.timeSlots.filter(slot => 
          slot.status === 'BOOKED' || slot.status === 'RESERVED'
        ).length
        
        const result = await this.venueStore.refreshTimeSlotStatus(this.testVenueId, this.testDate)
        
        if (result && result.data) {
          this.timeSlots = result.data
          
          const afterCount = this.timeSlots.filter(slot => 
            slot.status === 'BOOKED' || slot.status === 'RESERVED'
          ).length
          
          this.addLog(`✅ 刷新完成 - 已预约时间段: ${beforeCount} → ${afterCount}`)
          
          // 统计状态
          const statusCount = {}
          this.timeSlots.forEach(slot => {
            statusCount[slot.status] = (statusCount[slot.status] || 0) + 1
          })
          this.addLog(`状态统计: ${JSON.stringify(statusCount)}`)
        } else {
          this.addLog('❌ 刷新失败 - 无数据返回')
        }
      } catch (error) {
        this.addLog(`❌ 刷新失败: ${error.message}`)
        console.error('刷新时间段失败:', error)
      }
    },

    async simulateBooking() {
      try {
        // 找到第一个可用的时间段
        const availableSlot = this.timeSlots.find(slot => slot.status === 'AVAILABLE')
        if (!availableSlot) {
          this.addLog('❌ 没有可用的时间段进行模拟预约')
          return
        }

        this.addLog(`开始模拟预约 - 时间段: ${availableSlot.startTime}-${availableSlot.endTime}`)

        // 构造预约数据
        const bookingData = {
          venueId: this.testVenueId,
          date: this.testDate,
          startTime: availableSlot.startTime,
          endTime: availableSlot.endTime,
          slotIds: [availableSlot.id],
          price: availableSlot.price,
          playerName: '测试用户',
          playerPhone: '13800138000',
          paymentMethod: 'WECHAT'
        }

        // 记录预约前的状态
        const beforeBookedCount = this.timeSlots.filter(slot => 
          slot.status === 'BOOKED' || slot.status === 'RESERVED'
        ).length

        // 调用预约方法
        const result = await this.bookingStore.createBooking(bookingData)

        if (result && result.success) {
          this.addLog(`✅ 模拟预约成功 - 预约ID: ${result.data?.id || 'N/A'}`)
          
          // 等待一下让状态同步完成
          setTimeout(async () => {
            // 重新加载时间段查看状态变化
            await this.loadTimeSlots()
            
            const afterBookedCount = this.timeSlots.filter(slot => 
              slot.status === 'BOOKED' || slot.status === 'RESERVED'
            ).length
            
            this.addLog(`状态同步结果 - 已预约时间段: ${beforeBookedCount} → ${afterBookedCount}`)
            
            if (afterBookedCount > beforeBookedCount) {
              this.addLog('✅ 时间段状态同步成功！')
            } else {
              this.addLog('⚠️ 时间段状态可能未正确同步')
            }
          }, 2000)
          
        } else {
          this.addLog(`❌ 模拟预约失败: ${result?.message || '未知错误'}`)
        }
      } catch (error) {
        this.addLog(`❌ 模拟预约异常: ${error.message}`)
        console.error('模拟预约失败:', error)
      }
    },

    getStatusText(status) {
      const statusMap = {
        'AVAILABLE': '可预约',
        'BOOKED': '已预约',
        'RESERVED': '已预约',
        'UNAVAILABLE': '不可用'
      }
      return statusMap[status] || status
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

.test-section {
  background-color: white;
  margin-bottom: 20rpx;
  padding: 20rpx;
  border-radius: 10rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.form-item {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.label {
  width: 150rpx;
  font-size: 28rpx;
  color: #666;
}

.input {
  flex: 1;
  padding: 10rpx;
  border: 1px solid #ddd;
  border-radius: 5rpx;
  font-size: 28rpx;
}

.picker {
  flex: 1;
}

.picker-text {
  padding: 10rpx;
  border: 1px solid #ddd;
  border-radius: 5rpx;
  font-size: 28rpx;
  color: #333;
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
}

.test-btn.primary {
  background-color: #007aff;
  color: white;
}

.test-btn.secondary {
  background-color: #6c757d;
  color: white;
}

.test-btn.warning {
  background-color: #ff9500;
  color: white;
}

.log-container {
  max-height: 400rpx;
  overflow-y: auto;
  background-color: #f8f9fa;
  padding: 20rpx;
  border-radius: 5rpx;
}

.log-item {
  display: block;
  font-size: 24rpx;
  color: #333;
  margin-bottom: 10rpx;
  line-height: 1.4;
  word-break: break-all;
}

.timeslot-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.timeslot-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  border-radius: 10rpx;
  border: 1px solid #ddd;
}

.timeslot-item.available {
  background-color: #e8f5e8;
  border-color: #28a745;
}

.timeslot-item.booked {
  background-color: #f8d7da;
  border-color: #dc3545;
}

.slot-time {
  flex: 2;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.slot-status {
  flex: 1;
  font-size: 24rpx;
  color: #666;
  text-align: center;
}

.slot-price {
  flex: 1;
  font-size: 24rpx;
  color: #ff6b35;
  text-align: center;
}

.slot-id {
  flex: 2;
  font-size: 20rpx;
  color: #999;
  text-align: right;
}
</style>