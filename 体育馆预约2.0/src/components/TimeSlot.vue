<template>
  <view class="time-slot-container">
    <!-- 日期选择 -->
    <view class="date-section">
      <text class="section-title">选择日期</text>
      <scroll-view class="date-scroll" scroll-x>
        <view class="date-list">
          <view 
            class="date-item"
            :class="{ active: selectedDate === date.fulldate }"
            v-for="date in dateList"
            :key="date.fulldate"
            @click="selectDate(date)"
          >
            <text class="date-day">{{ date.day }}</text>
            <text class="date-text">{{ date.text }}</text>
            <text class="date-week">{{ date.week }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
    
    <!-- 时间段列表 -->
    <view class="slots-section">
      <view class="section-header">
        <text class="section-title">选择时间段</text>
        <view class="legend">
          <view class="legend-item">
            <view class="legend-dot available"></view>
            <text class="legend-text">可预约</text>
          </view>
          <view class="legend-item">
            <view class="legend-dot reserved"></view>
            <text class="legend-text">已预约</text>
          </view>
          <view class="legend-item">
            <view class="legend-dot maintenance"></view>
            <text class="legend-text">维护中</text>
          </view>
        </view>
      </view>
      
      <!-- 加载状态 -->
      <view class="loading-container" v-if="loading">
        <uni-load-more status="loading" content-text="{ contentText: { contentdown: '加载中...', contentrefresh: '加载中...', contentnomore: '加载中...' } }"></uni-load-more>
      </view>
      
      <!-- 时间段网格 -->
      <view class="slots-grid" v-else>
        <view 
          class="slot-item"
          :class="[
            `status-${slot.status.toLowerCase()}`,
            { selected: selectedSlot && selectedSlot.id === slot.id },
            { disabled: slot.status === 'RESERVED' || slot.status === 'MAINTENANCE' || slot.status === 'OCCUPIED' }
          ]"
          v-for="slot in timeSlots"
          :key="slot.id"
          @click="selectSlot(slot)"
        >
          <text class="slot-time">{{ slot.startTime }}-{{ slot.endTime }}</text>
          <text class="slot-price" v-if="slot.status === 'AVAILABLE'">¥{{ slot.price }}</text>
          <text class="slot-status" v-else>{{ getStatusText(slot.status) }}</text>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-container" v-if="!loading && timeSlots.length === 0">
        <image src="/static/images/empty-slots.png" class="empty-image" />
        <text class="empty-text">暂无可用时间段</text>
        <button class="refresh-btn" @click="refreshSlots">刷新</button>
      </view>
    </view>
    
    <!-- 选中信息 -->
    <view class="selected-info" v-if="selectedSlot">
      <view class="info-content">
        <text class="info-title">已选择</text>
        <text class="info-detail">
          {{ selectedDateText }} {{ selectedSlot.startTime }}-{{ selectedSlot.endTime }}
        </text>
        <text class="info-price">¥{{ selectedSlot.price }}</text>
      </view>
      <button class="confirm-btn" @click="confirmSelection">确认选择</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'TimeSlot',
  
  props: {
    venueId: {
      type: [String, Number],
      required: true
    },
    
    // 初始选中的日期
    initialDate: {
      type: String,
      default: ''
    },
    
    // 初始选中的时间段
    initialSlot: {
      type: Object,
      default: null
    },
    
    // 是否显示价格
    showPrice: {
      type: Boolean,
      default: true
    },
    
    // 可选择的天数范围
    dayRange: {
      type: Number,
      default: 7
    }
  },
  
  data() {
    return {
      selectedDate: '',
      selectedSlot: null,
      dateList: [],
      timeSlots: [],
      loading: false
    }
  },
  
  computed: {
    selectedDateText() {
      const date = this.dateList.find(d => d.fulldate === this.selectedDate)
      return date ? `${date.month}月${date.day}日` : ''
    }
  },
  
  mounted() {
    this.initDateList()
    this.initSelection()
  },
  
  methods: {
    // 初始化日期列表
    initDateList() {
      const today = new Date()
      const dateList = []
      
      for (let i = 0; i < this.dayRange; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        const week = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
        
        let text = ''
        if (i === 0) {
          text = '今天'
        } else if (i === 1) {
          text = '明天'
        } else {
          text = `${month}/${day}`
        }
        
        dateList.push({
          fulldate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          year,
          month,
          day,
          week,
          text
        })
      }
      
      this.dateList = dateList
    },
    
    // 初始化选择状态
    initSelection() {
      // 设置初始日期
      if (this.initialDate) {
        this.selectedDate = this.initialDate
      } else {
        this.selectedDate = this.dateList[0]?.fulldate || ''
      }
      
      // 设置初始时间段
      if (this.initialSlot) {
        this.selectedSlot = this.initialSlot
      }
      
      // 加载时间段
      if (this.selectedDate) {
        this.loadTimeSlots()
      }
    },
    
    // 选择日期
    selectDate(date) {
      if (this.selectedDate === date.fulldate) return
      
      this.selectedDate = date.fulldate
      this.selectedSlot = null
      this.loadTimeSlots()
      
      this.$emit('date-change', {
        date: date.fulldate,
        dateInfo: date
      })
    },
    
    // 加载时间段
    async loadTimeSlots() {
      if (!this.selectedDate || !this.venueId) {
        console.warn('[TimeSlot] 缺少必要参数:', { selectedDate: this.selectedDate, venueId: this.venueId })
        return
      }
      
      console.log('[TimeSlot] 开始加载时间段:', { venueId: this.venueId, date: this.selectedDate })
      this.loading = true
      
      try {
        // 调用真实的API获取时间段数据
        const result = await this.$store.dispatch('venue/getTimeSlots', {
          venueId: this.venueId,
          date: this.selectedDate,
          forceRefresh: false,
          loading: false
        })
        
        console.log('[TimeSlot] API调用结果:', result)
        
        // 从store中获取时间段数据
        const timeSlots = this.$store.getters['venue/timeSlots'] || []
        console.log('[TimeSlot] 获取到的时间段数据:', timeSlots)
        
        // 验证时间段数据的日期是否正确
        const correctDateSlots = timeSlots.filter(slot => {
          const slotDate = slot.date
          const isCorrectDate = slotDate === this.selectedDate
          if (!isCorrectDate) {
            console.warn('[TimeSlot] 发现日期不匹配的时间段:', {
              slotId: slot.id,
              slotDate: slotDate,
              selectedDate: this.selectedDate
            })
          }
          return isCorrectDate
        })
        
        console.log('[TimeSlot] 过滤后的正确日期时间段:', correctDateSlots.length, '个')
        this.timeSlots = correctDateSlots
        
        if (correctDateSlots.length === 0) {
          console.warn('[TimeSlot] 没有找到匹配日期的时间段')
          uni.showToast({
            title: '该日期暂无可预约时间段',
            icon: 'none'
          })
        }
        
      } catch (error) {
        console.error('[TimeSlot] 加载时间段失败:', error)
        uni.showToast({
          title: '加载失败，请重试',
          icon: 'error'
        })
        this.timeSlots = []
        
      } finally {
        this.loading = false
      }
    }
    
    // 选择时间段
    selectSlot(slot) {
      if (slot.status !== 'AVAILABLE') {
        uni.showToast({
          title: this.getStatusText(slot.status),
          icon: 'none'
        })
        return
      }
      
      this.selectedSlot = slot
      
      this.$emit('slot-change', {
        slot,
        date: this.selectedDate,
        dateInfo: this.dateList.find(d => d.fulldate === this.selectedDate)
      })
    },
    
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        'AVAILABLE': '可预约',
        'RESERVED': '已预约',
        'OCCUPIED': '已占用',
        'MAINTENANCE': '维护中',
        'BOOKED': '已预订',
        'SHARING': '拼场中',
        'EXPIRED': '已过期'
      }
      return statusMap[status] || status
    },
    
    // 刷新时间段
    refreshSlots() {
      this.loadTimeSlots()
    },
    
    // 确认选择
    confirmSelection() {
      if (!this.selectedSlot) return
      
      this.$emit('confirm', {
        date: this.selectedDate,
        slot: this.selectedSlot,
        dateInfo: this.dateList.find(d => d.fulldate === this.selectedDate)
      })
    },
    
    // 清除选择
    clearSelection() {
      this.selectedSlot = null
      this.$emit('slot-change', null)
    },
    
    // 获取当前选择
    getSelection() {
      return {
        date: this.selectedDate,
        slot: this.selectedSlot,
        dateInfo: this.dateList.find(d => d.fulldate === this.selectedDate)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.time-slot-container {
  background-color: #ffffff;
}

// 日期选择区域
.date-section {
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  
  .section-title {
    display: block;
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
    margin-bottom: 20rpx;
  }
  
  .date-scroll {
    white-space: nowrap;
  }
  
  .date-list {
    display: flex;
    gap: 20rpx;
  }
  
  .date-item {
    flex-shrink: 0;
    width: 120rpx;
    padding: 20rpx 0;
    text-align: center;
    border-radius: 12rpx;
    border: 2rpx solid #f0f0f0;
    background-color: #ffffff;
    transition: all 0.3s;
    
    &.active {
      border-color: #ff6b35;
      background-color: #ff6b35;
      
      .date-day,
      .date-text,
      .date-week {
        color: #ffffff;
      }
    }
    
    .date-day {
      display: block;
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
      margin-bottom: 4rpx;
    }
    
    .date-text {
      display: block;
      font-size: 24rpx;
      color: #666666;
      margin-bottom: 4rpx;
    }
    
    .date-week {
      display: block;
      font-size: 20rpx;
      color: #999999;
    }
  }
}

// 时间段区域
.slots-section {
  padding: 30rpx;
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    
    .section-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
    }
    
    .legend {
      display: flex;
      gap: 16rpx;
      
      .legend-item {
        display: flex;
        align-items: center;
        gap: 6rpx;
        
        .legend-dot {
          width: 12rpx;
          height: 12rpx;
          border-radius: 6rpx;
          
          &.available {
            background-color: #52c41a;
          }
          
          &.reserved {
            background-color: #ff4d4f;
          }
          
          &.maintenance {
            background-color: #faad14;
          }
        }
        
        .legend-text {
          font-size: 20rpx;
          color: #666666;
        }
      }
    }
  }
  
  .loading-container {
    padding: 60rpx 0;
    text-align: center;
  }
  
  .slots-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20rpx;
  }
  
  .slot-item {
    padding: 24rpx;
    border-radius: 12rpx;
    border: 2rpx solid #f0f0f0;
    text-align: center;
    transition: all 0.3s;
    position: relative;
    
    &.status-available {
      background-color: #f6ffed;
      border-color: #b7eb8f;
      
      &:active {
        background-color: #d9f7be;
      }
      
      &.selected {
        background-color: #52c41a;
        border-color: #52c41a;
        
        .slot-time,
        .slot-price {
          color: #ffffff;
        }
      }
    }
    
    &.status-reserved {
      background-color: #fff2f0;
      border-color: #ffccc7;
      opacity: 0.6;
      cursor: not-allowed;
      
      .slot-time {
        color: #999999;
      }
      
      .slot-status {
        color: #ff4d4f;
        font-weight: 500;
      }
    }
    
    &.status-maintenance {
      background-color: #fffbe6;
      border-color: #ffe58f;
      opacity: 0.6;
      cursor: not-allowed;
      
      .slot-time {
        color: #999999;
      }
      
      .slot-status {
        color: #ff9500;
        font-weight: 500;
      }
    }
    
    &.status-occupied {
      background-color: #f5f5f5;
      border-color: #d9d9d9;
      opacity: 0.6;
      cursor: not-allowed;
      
      .slot-time {
        color: #999999;
      }
      
      .slot-status {
        color: #999999;
        font-weight: 500;
      }
    }
    
    &.disabled {
      pointer-events: none;
      position: relative;
      
      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.3);
        border-radius: 12rpx;
      }
    }
    
    .slot-time {
      display: block;
      font-size: 28rpx;
      font-weight: 600;
      color: #333333;
      margin-bottom: 8rpx;
    }
    
    .slot-price {
      display: block;
      font-size: 24rpx;
      color: #52c41a;
      font-weight: 600;
    }
    
    .slot-status {
      display: block;
      font-size: 24rpx;
      color: #999999;
    }
  }
  
  .empty-container {
    padding: 80rpx 0;
    text-align: center;
    
    .empty-image {
      width: 200rpx;
      height: 200rpx;
      margin-bottom: 20rpx;
    }
    
    .empty-text {
      display: block;
      font-size: 28rpx;
      color: #999999;
      margin-bottom: 30rpx;
    }
    
    .refresh-btn {
      padding: 16rpx 32rpx;
      background-color: #ff6b35;
      color: #ffffff;
      border: none;
      border-radius: 8rpx;
      font-size: 24rpx;
    }
  }
}

// 选中信息
.selected-info {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  border-top: 1rpx solid #f0f0f0;
  padding: 20rpx 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  .info-content {
    flex: 1;
    
    .info-title {
      display: block;
      font-size: 24rpx;
      color: #999999;
      margin-bottom: 8rpx;
    }
    
    .info-detail {
      display: block;
      font-size: 28rpx;
      color: #333333;
      margin-bottom: 4rpx;
    }
    
    .info-price {
      display: block;
      font-size: 32rpx;
      font-weight: 600;
      color: #ff6b35;
    }
  }
  
  .confirm-btn {
    padding: 16rpx 32rpx;
    background-color: #ff6b35;
    color: #ffffff;
    border: none;
    border-radius: 8rpx;
    font-size: 28rpx;
    font-weight: 600;
  }
}
</style>