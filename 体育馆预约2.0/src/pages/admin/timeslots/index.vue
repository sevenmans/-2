<template>
  <view class="page-container">
    <NavBar
      title="排期管理"
      :showBack="true"
      backgroundColor="#ff6b35"
      titleColor="#ffffff"
      :showBorder="false"
      @left-click="goBack"
    />
    <view class="page-body" :style="{ paddingTop: navBarHeight + 'px' }">
      <scroll-view scroll-y class="scroll-content">
        <!-- 选择器 -->
        <view class="card">
          <view class="form-group">
            <text class="form-label">选择场馆</text>
            <picker :range="venues" range-key="name" :value="venueIndex" @change="onVenueChange">
              <view class="form-input picker-input">{{ currentVenueName || '请选择场馆' }}</view>
            </picker>
          </view>
          <view class="form-group" style="margin-bottom: 0;">
            <text class="form-label">选择日期</text>
            <!-- 使用普通选择器替代日期选择器，只显示已生成时间段的日期 -->
            <picker v-if="generatedDates.length > 0" :range="generatedDates" :value="dateIndex" @change="onDatePickerChange">
              <view class="form-input picker-input">{{ selectedDate || '请选择日期' }}</view>
            </picker>
            <view v-else class="form-input picker-input disabled-input" @click="handleNoDateClick">
              {{ selectedVenueId ? (datesLoading ? '加载中...' : '暂无可选日期') : '请先选择场馆' }}
            </view>
          </view>
        </view>

        <!-- 图例 -->
        <view class="card legend-card">
          <view class="legend-header">
            <text class="card-title">时段状态</text>
            <view class="legend-items">
              <view class="legend-item">
                <view class="legend-dot dot-available"></view>
                <text class="legend-text">可用</text>
              </view>
              <view class="legend-item">
                <view class="legend-dot dot-maintenance"></view>
                <text class="legend-text">维护</text>
              </view>
              <view class="legend-item">
                <view class="legend-dot dot-booked"></view>
                <text class="legend-text">占用</text>
              </view>
            </view>
          </view>
          <text class="legend-hint">点击可用时段可设为维护，点击维护可解锁。</text>

          <!-- 时段网格 -->
          <view v-if="timeslotLoading" class="loading-box">
            <text class="loading-text">加载中...</text>
          </view>
          <view v-else-if="timeslots.length === 0" class="empty-state">
            <text class="empty-text">{{ selectedVenueId ? '暂无时段数据' : '请先选择场馆和日期' }}</text>
          </view>
          <view v-else class="timeslot-grid">
            <view
              v-for="slot in timeslots"
              :key="slot.id"
              class="timeslot-item"
              :class="getSlotClass(slot)"
              @click="handleSlotClick(slot)"
            >
              <text class="slot-time">{{ formatSlotTime(slot) }}</text>
              <text class="slot-status">{{ getSlotStatusText(slot.status) }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import NavBar from '@/components/NavBar.vue'
import { useAdminVenuesStore } from '@/stores/admin-venues.js'
import { getGeneratedDates } from '@/api/admin.js'

export default {
  components: { NavBar },

  data() {
    return {
      venuesStore: null,
      navBarHeight: 0,
      selectedVenueId: '',
      selectedDate: '',
      venues: [],
      generatedDates: [], // 已生成时间段的日期列表
      datesLoading: false // 日期加载状态
    }
  },

  computed: {
    timeslots() { return this.venuesStore?.timeslots || [] },
    timeslotLoading() { return this.venuesStore?.timeslotLoading },
    venueIndex() {
      return this.venues.findIndex(v => String(v.id) === String(this.selectedVenueId))
    },
    currentVenueName() {
      const v = this.venues.find(v => String(v.id) === String(this.selectedVenueId))
      return v ? v.name : ''
    },
    dateIndex() {
      // 获取当前选中日期在列表中的索引
      return this.generatedDates.findIndex(d => d === this.selectedDate)
    }
  },

  onLoad(options) {
    this.venuesStore = useAdminVenuesStore()
    this.calcNavBarHeight()

    if (options.venueId) {
      this.selectedVenueId = options.venueId
    }

    this.loadVenues()
  },

  methods: {
    calcNavBarHeight() {
      const sys = uni.getSystemInfoSync()
      this.navBarHeight = (sys.statusBarHeight || 0) + 44
    },

    goBack() {
      uni.navigateBack()
    },

    formatDate(d) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },

    async loadVenues() {
      try {
        await this.venuesStore.fetchManagedVenues()
        this.venues = this.venuesStore.managerVenues || []
        // 如果有预选场馆，加载该场馆的可选日期
        if (this.selectedVenueId) {
          await this.loadGeneratedDates()
        }
      } catch (e) {
        uni.showToast({ title: '加载场馆失败', icon: 'none' })
      }
    },

    async onVenueChange(e) {
      const venue = this.venues[e.detail.value]
      if (venue) {
        this.selectedVenueId = venue.id
        this.selectedDate = '' // 重置选中的日期
        this.generatedDates = [] // 重置日期列表
        await this.loadGeneratedDates()
      }
    },

    // 加载场馆已生成时间段的日期列表
    async loadGeneratedDates() {
      if (!this.selectedVenueId) return

      this.datesLoading = true
      try {
        const res = await getGeneratedDates(this.selectedVenueId)
        const rawData = res.data || res
        const dates = rawData.data || rawData || []
        this.generatedDates = Array.isArray(dates) ? dates : []

        console.log('[排期管理] 加载到可选日期:', this.generatedDates.length, '个')

        // 如果有可选日期，默认选中第一个（通常是今天）
        if (this.generatedDates.length > 0) {
          // 优先选择今天
          const today = this.formatDate(new Date())
          if (this.generatedDates.includes(today)) {
            this.selectedDate = today
          } else {
            this.selectedDate = this.generatedDates[0]
          }
          this.loadTimeslots()
        }
      } catch (e) {
        console.error('[排期管理] 加载可选日期失败:', e)
        uni.showToast({ title: '加载可选日期失败', icon: 'none' })
      } finally {
        this.datesLoading = false
      }
    },

    onDatePickerChange(e) {
      const dateStr = this.generatedDates[e.detail.value]
      if (dateStr) {
        this.selectedDate = dateStr
        this.loadTimeslots()
      }
    },

    handleNoDateClick() {
      if (!this.selectedVenueId) {
        uni.showToast({ title: '请先选择场馆', icon: 'none' })
      } else if (!this.datesLoading) {
        uni.showToast({ title: '该场馆暂无已生成的时间段', icon: 'none' })
      }
    },

    async loadTimeslots() {
      if (!this.selectedVenueId || !this.selectedDate) return
      try {
        await this.venuesStore.fetchTimeslots(this.selectedVenueId, this.selectedDate)
      } catch (e) {
        uni.showToast({ title: e.message || '加载时段失败', icon: 'none' })
      }
    },

    formatSlotTime(slot) {
      const start = slot.startTime ? slot.startTime.substring(0, 5) : ''
      const end = slot.endTime ? slot.endTime.substring(0, 5) : ''
      return `${start}-${end}`
    },

    getSlotClass(slot) {
      const s = (slot.status || '').toUpperCase()
      if (s === 'AVAILABLE') return 'slot-available'
      if (s === 'MAINTENANCE') return 'slot-maintenance'
      return 'slot-booked'
    },

    getSlotStatusText(status) {
      const s = (status || '').toUpperCase()
      if (s === 'AVAILABLE') return '可用'
      if (s === 'MAINTENANCE') return '维护'
      return '已占'
    },

    handleSlotClick(slot) {
      const s = (slot.status || '').toUpperCase()

      if (['BOOKED', 'OCCUPIED', 'RESERVED', 'LOCKED'].includes(s)) {
        uni.showToast({ title: '该时段已有订单，不可操作', icon: 'none' })
        return
      }

      if (s === 'AVAILABLE') {
        uni.showModal({
          title: '确认锁场',
          content: '将该时段设为维护中？',
          success: async (res) => {
            if (!res.confirm) return
            try {
              await this.venuesStore.changeTimeslotStatus(slot.id, 'MAINTENANCE')
              uni.showToast({ title: '已设为维护', icon: 'success' })
            } catch (e) {
              const msg = e.message || '操作失败'
              uni.showToast({ title: msg, icon: 'none', duration: 3000 })
            }
          }
        })
      } else if (s === 'MAINTENANCE') {
        this.unlockSlot(slot)
      }
    },

    async unlockSlot(slot) {
      try {
        await this.venuesStore.changeTimeslotStatus(slot.id, 'AVAILABLE')
        uni.showToast({ title: '已解锁', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '解锁失败', icon: 'none' })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: #f5f5f5;
  overflow-x: hidden;
}

.page-body {
  min-height: 100vh;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.scroll-content {
  width: 100%;
  box-sizing: border-box;
  padding: 24rpx;
  padding-bottom: 60rpx;
}

.card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.form-group {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #303133;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  padding: 0 24rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 16rpx;
  font-size: 28rpx;
  background: #ffffff;
  color: #303133;
  box-sizing: border-box;
}

.picker-input { color: #606266; }

.disabled-input {
  color: #909399;
  background: #f5f7fa;
  cursor: not-allowed;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
}

.legend-card {
  padding-bottom: 20rpx;
}

.legend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.legend-items {
  display: flex;
  gap: 24rpx;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.legend-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 4rpx;
}

.dot-available { background: #f0f9eb; border: 2rpx solid #e1f3d8; }
.dot-maintenance { background: #fef0f0; border: 2rpx solid #fde2e2; }
.dot-booked { background: #f4f4f5; border: 2rpx solid #dcdfe6; }

.legend-text {
  font-size: 22rpx;
  color: #606266;
}

.legend-hint {
  font-size: 24rpx;
  color: #909399;
  margin-bottom: 20rpx;
}

.timeslot-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.timeslot-item {
  background: #ffffff;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 16rpx 8rpx;
  text-align: center;

  &.slot-available {
    background: #f0f9eb;
    border-color: #e1f3d8;
  }

  &.slot-maintenance {
    background: #fef0f0;
    border-color: #fde2e2;
  }

  &.slot-booked {
    background: #f4f4f5;
    border-color: #dcdfe6;
    opacity: 0.7;
  }
}

.slot-time {
  display: block;
  font-size: 24rpx;
  color: #303133;
  margin-bottom: 4rpx;
}

.slot-status {
  display: block;
  font-size: 20rpx;
}

.slot-available .slot-status { color: #19be6b; }
.slot-maintenance .slot-status { color: #fa3534; }
.slot-booked .slot-status { color: #909399; }

.loading-box { text-align: center; padding: 60rpx 0; }
.loading-text { font-size: 28rpx; color: #909399; }

.empty-state { text-align: center; padding: 60rpx 0; }
.empty-text { font-size: 26rpx; color: #909399; }
</style>
