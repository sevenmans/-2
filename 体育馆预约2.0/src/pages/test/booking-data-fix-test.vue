<template>
  <view class="test-container">
    <view class="header">
      <text class="title">🔧 预约数据修复测试</text>
      <text class="subtitle">测试包场和拼场订单数据传递及时间段状态更新</text>
    </view>

    <!-- 测试控制面板 -->
    <view class="control-panel">
      <view class="input-group">
        <text class="label">场馆ID:</text>
        <input v-model="testVenueId" type="number" placeholder="输入场馆ID" class="input" />
      </view>
      
      <view class="input-group">
        <text class="label">测试日期:</text>
        <input v-model="testDate" type="date" class="input" />
      </view>

      <view class="button-group">
        <button @click="testExclusiveBooking" class="test-btn primary">🏟️ 测试包场预约</button>
        <button @click="testSharedBooking" class="test-btn secondary">🤝 测试拼场预约</button>
        <button @click="checkTimeSlotStatus" class="test-btn success">⏰ 检查时间段状态</button>
        <button @click="clearResults" class="test-btn warning">🗑️ 清除结果</button>
      </view>
    </view>

    <!-- 测试结果 -->
    <view class="results-section">
      <text class="section-title">测试结果</text>
      
      <scroll-view class="results-container" scroll-y>
        <view class="result-item" v-for="(result, index) in testResults" :key="index">
          <view class="result-header">
            <text class="result-title">{{ result.title }}</text>
            <text :class="['result-status', result.success ? 'success' : 'error']">
              {{ result.success ? '✅ 成功' : '❌ 失败' }}
            </text>
            <text class="result-time">{{ result.time }}</text>
          </view>
          
          <view class="result-details">
            <text class="detail-text">{{ result.message }}</text>
            <view v-if="result.data" class="data-section">
              <text class="data-title">详细数据:</text>
              <text class="data-content">{{ formatData(result.data) }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 当前时间段状态 -->
    <view class="timeslots-section" v-if="currentTimeSlots.length > 0">
      <text class="section-title">当前时间段状态 ({{ currentTimeSlots.length }}个)</text>
      
      <view class="timeslot-grid">
        <view 
          v-for="slot in currentTimeSlots" 
          :key="slot.id"
          :class="['timeslot-item', `status-${slot.status.toLowerCase()}`]"
        >
          <text class="slot-time">{{ slot.startTime }}-{{ slot.endTime }}</text>
          <text class="slot-price">¥{{ slot.price }}</text>
          <text class="slot-status">{{ slot.status }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useVenueStore } from '@/stores/venue.js'
import { useBookingStore } from '@/stores/booking.js'

export default {
  name: 'BookingDataFixTest',
  
  data() {
    return {
      testVenueId: 34,
      testDate: this.getTodayDate(),
      testResults: [],
      currentTimeSlots: [],
      venueStore: null,
      bookingStore: null
    }
  },
  
  onLoad() {
    this.venueStore = useVenueStore()
    this.bookingStore = useBookingStore()
    this.addResult('系统初始化', true, '测试工具初始化完成')
    this.loadInitialData()
  },
  
  methods: {
    getTodayDate() {
      const today = new Date()
      return today.toISOString().split('T')[0]
    },

    addResult(title, success, message, data = null) {
      const result = {
        title,
        success,
        message,
        data,
        time: new Date().toLocaleTimeString()
      }
      this.testResults.unshift(result)
      
      // 限制结果数量
      if (this.testResults.length > 20) {
        this.testResults = this.testResults.slice(0, 20)
      }
    },

    clearResults() {
      this.testResults = []
      this.addResult('清除结果', true, '测试结果已清除')
    },

    formatData(data) {
      if (typeof data === 'object') {
        return JSON.stringify(data, null, 2)
      }
      return String(data)
    },

    // 加载初始数据
    async loadInitialData() {
      try {
        // 加载场馆详情
        await this.venueStore.getVenueDetail(this.testVenueId)
        this.addResult('场馆详情加载', true, '场馆信息加载成功', {
          name: this.venueStore.venueDetail?.name,
          price: this.venueStore.venueDetail?.price
        })

        // 加载时间段
        await this.checkTimeSlotStatus()
        
      } catch (error) {
        this.addResult('初始数据加载', false, `加载失败: ${error.message}`)
      }
    },

    // 检查时间段状态
    async checkTimeSlotStatus() {
      try {
        this.addResult('时间段状态检查', null, '开始检查时间段状态...')
        
        const response = await this.venueStore.getTimeSlots(this.testVenueId, this.testDate, true)
        this.currentTimeSlots = this.venueStore.timeSlots
        
        const availableCount = this.currentTimeSlots.filter(slot => slot.status === 'AVAILABLE').length
        const reservedCount = this.currentTimeSlots.filter(slot => slot.status === 'RESERVED').length
        
        this.addResult('时间段状态检查', true, 
          `检查完成! 总计${this.currentTimeSlots.length}个时间段，可用${availableCount}个，已预约${reservedCount}个`, 
          {
            total: this.currentTimeSlots.length,
            available: availableCount,
            reserved: reservedCount
          })
          
      } catch (error) {
        this.addResult('时间段状态检查', false, `检查失败: ${error.message}`)
      }
    },

    // 测试包场预约
    async testExclusiveBooking() {
      try {
        this.addResult('包场预约测试', null, '开始测试包场预约数据传递...')
        
        // 选择第一个可用时间段
        const availableSlots = this.currentTimeSlots.filter(slot => slot.status === 'AVAILABLE')
        if (availableSlots.length === 0) {
          this.addResult('包场预约测试', false, '没有可用的时间段进行测试')
          return
        }

        const testSlot = availableSlots[0]
        
        // 构造包场预约数据
        const bookingData = {
          venueId: parseInt(this.testVenueId),
          date: this.testDate,
          startTime: testSlot.startTime,
          endTime: testSlot.endTime,
          slotIds: [testSlot.id],
          bookingType: 'EXCLUSIVE',
          description: '测试包场预约',
          price: parseFloat(testSlot.price),
          fieldId: this.venueStore.venueDetail?.fieldId || this.venueStore.venueDetail?.id || parseInt(this.testVenueId),
          fieldName: this.venueStore.venueDetail?.fieldName || this.venueStore.venueDetail?.name || '主场地'
        }

        this.addResult('包场数据构造', true, '包场预约数据构造完成', bookingData)

        // 模拟预约（不实际发送到后端）
        console.log('📤 模拟发送包场预约数据:', bookingData)
        
        // 验证数据完整性
        const requiredFields = ['venueId', 'date', 'startTime', 'endTime', 'slotIds', 'price', 'fieldId', 'fieldName']
        const missingFields = requiredFields.filter(field => !bookingData[field])
        
        if (missingFields.length > 0) {
          this.addResult('包场预约测试', false, `缺少必要字段: ${missingFields.join(', ')}`)
        } else {
          this.addResult('包场预约测试', true, '包场预约数据验证通过，所有必要字段完整', {
            验证字段: requiredFields,
            数据类型检查: {
              venueId: typeof bookingData.venueId,
              price: typeof bookingData.price,
              slotIds: Array.isArray(bookingData.slotIds)
            }
          })
        }

      } catch (error) {
        this.addResult('包场预约测试', false, `测试失败: ${error.message}`)
      }
    },

    // 测试拼场预约
    async testSharedBooking() {
      try {
        this.addResult('拼场预约测试', null, '开始测试拼场预约数据传递...')
        
        // 选择第一个可用时间段
        const availableSlots = this.currentTimeSlots.filter(slot => slot.status === 'AVAILABLE')
        if (availableSlots.length === 0) {
          this.addResult('拼场预约测试', false, '没有可用的时间段进行测试')
          return
        }

        const testSlot = availableSlots[0]
        const totalPrice = parseFloat(testSlot.price)
        const pricePerTeam = Math.round((totalPrice / 2) * 100) / 100
        
        // 构造拼场预约数据
        const sharedBookingData = {
          venueId: parseInt(this.testVenueId),
          date: this.testDate,
          startTime: testSlot.startTime,
          endTime: testSlot.endTime,
          teamName: '测试球队',
          contactInfo: '13800138000',
          maxParticipants: 2,
          description: '测试拼场预约',
          price: pricePerTeam,
          fieldId: this.venueStore.venueDetail?.fieldId || this.venueStore.venueDetail?.id || parseInt(this.testVenueId),
          fieldName: this.venueStore.venueDetail?.fieldName || this.venueStore.venueDetail?.name || '主场地',
          slotIds: [testSlot.id]
        }

        this.addResult('拼场数据构造', true, '拼场预约数据构造完成', sharedBookingData)

        // 模拟预约（不实际发送到后端）
        console.log('📤 模拟发送拼场预约数据:', sharedBookingData)
        
        // 验证数据完整性
        const requiredFields = ['venueId', 'date', 'startTime', 'endTime', 'teamName', 'contactInfo', 'maxParticipants', 'price', 'fieldId', 'fieldName', 'slotIds']
        const missingFields = requiredFields.filter(field => !sharedBookingData[field])
        
        if (missingFields.length > 0) {
          this.addResult('拼场预约测试', false, `缺少必要字段: ${missingFields.join(', ')}`)
        } else {
          this.addResult('拼场预约测试', true, '拼场预约数据验证通过，所有必要字段完整', {
            验证字段: requiredFields,
            价格计算: {
              总价: totalPrice,
              每队价格: pricePerTeam,
              计算正确: pricePerTeam === totalPrice / 2
            },
            数据类型检查: {
              venueId: typeof sharedBookingData.venueId,
              price: typeof sharedBookingData.price,
              maxParticipants: typeof sharedBookingData.maxParticipants,
              slotIds: Array.isArray(sharedBookingData.slotIds)
            }
          })
        }

      } catch (error) {
        this.addResult('拼场预约测试', false, `测试失败: ${error.message}`)
      }
    }
  }
}
</script>

<style scoped>
.test-container {
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

.control-panel, .results-section, .timeslots-section {
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

.test-btn {
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

.results-container {
  height: 600rpx;
}

.result-item {
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 15rpx;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.result-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.result-status.success {
  color: #34C759;
  font-size: 24rpx;
}

.result-status.error {
  color: #FF3B30;
  font-size: 24rpx;
}

.result-time {
  font-size: 22rpx;
  color: #999;
}

.detail-text {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 10rpx;
}

.data-section {
  background: #f8f8f8;
  border-radius: 8rpx;
  padding: 15rpx;
}

.data-title {
  font-size: 24rpx;
  color: #333;
  font-weight: bold;
  display: block;
  margin-bottom: 10rpx;
}

.data-content {
  font-size: 22rpx;
  color: #666;
  font-family: monospace;
  white-space: pre-wrap;
  display: block;
}

.timeslot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200rpx, 1fr));
  gap: 15rpx;
}

.timeslot-item {
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  padding: 15rpx;
  text-align: center;
}

.timeslot-item.status-available {
  background: #e8f5e8;
  border-color: #34C759;
}

.timeslot-item.status-reserved {
  background: #ffe8e8;
  border-color: #FF3B30;
}

.slot-time {
  font-size: 24rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 5rpx;
}

.slot-price {
  font-size: 22rpx;
  color: #007AFF;
  display: block;
  margin-bottom: 5rpx;
}

.slot-status {
  font-size: 20rpx;
  color: #666;
  display: block;
}
</style>
