<template>
  <view class="page-container">
    <NavBar
      title="工作台"
      :showBack="false"
      backgroundColor="#ff6b35"
      titleColor="#ffffff"
      :showBorder="false"
    />
    <view class="page-body" :style="{ paddingTop: navBarHeight + 'px' }">
      <scroll-view scroll-y class="scroll-content">
        <!-- 时间范围切换 -->
        <view class="card time-card">
          <view class="time-header">
            <text class="section-title">数据概览</text>
            <text class="date-range">{{ dateRangeText }}</text>
          </view>
          <view class="time-tabs">
            <view
              v-for="item in timeOptions"
              :key="item.value"
              class="time-tab"
              :class="{ active: timeRange === item.value }"
              @click="switchTime(item.value)"
            >{{ item.label }}</view>
          </view>
          <!-- 自定义日期选择 -->
          <view v-if="timeRange === 'custom'" class="custom-date-row">
            <picker mode="date" :value="customStart" @change="onStartDateChange">
              <view class="date-picker-input">{{ customStart || '开始日期' }}</view>
            </picker>
            <text class="date-sep">~</text>
            <picker mode="date" :value="customEnd" @change="onEndDateChange">
              <view class="date-picker-input">{{ customEnd || '结束日期' }}</view>
            </picker>
            <view class="query-btn" :class="{ disabled: !canQueryCustom }" @click="queryCustom">查询</view>
          </view>
        </view>

        <!-- 统计卡片 -->
        <view class="stat-grid" v-if="stats">
          <view class="stat-card gradient-card">
            <text class="stat-value white">¥{{ stats.income }}</text>
            <text class="stat-label white-sub">预计收益</text>
          </view>
          <view class="stat-card">
            <text class="stat-value">{{ stats.totalOrders }}</text>
            <text class="stat-label">总订单数</text>
          </view>
          <view class="stat-card">
            <text class="stat-value warning">{{ stats.pendingVerification }}</text>
            <text class="stat-label">待核销</text>
          </view>
          <view class="stat-card">
            <text class="stat-value success">{{ stats.verified }}</text>
            <text class="stat-label">已核销</text>
          </view>
          <view class="stat-card">
            <text class="stat-value danger">{{ stats.refundOrCancel }}</text>
            <text class="stat-label">退款/取消</text>
          </view>
          <view class="stat-card">
            <text class="stat-value">¥{{ stats.avgPrice }}</text>
            <text class="stat-label">客单价</text>
          </view>
        </view>

        <!-- 加载态 -->
        <view v-if="loading" class="loading-box">
          <text class="loading-text">加载中...</text>
        </view>

        <!-- 功能入口提示 -->
        <view class="card hint-card">
          <text class="hint-text">更多功能请通过底部导航访问</text>
        </view>
      </scroll-view>
    </view>

    <AdminTabBar current="dashboard" />
  </view>
</template>

<script>
import NavBar from '@/components/NavBar.vue'
import AdminTabBar from '@/components/admin/AdminTabBar.vue'
import { useAdminDashboardStore } from '@/stores/admin-dashboard.js'

export default {
  components: { NavBar, AdminTabBar },

  data() {
    return {
      dashboardStore: null,
      navBarHeight: 0,
      timeRange: 'today',
      customStart: '',
      customEnd: '',
      timeOptions: [
        { label: '今日', value: 'today' },
        { label: '本周', value: 'week' },
        { label: '本月', value: 'month' },
        { label: '自定义', value: 'custom' }
      ]
    }
  },

  computed: {
    stats() { return this.dashboardStore?.stats },
    loading() { return this.dashboardStore?.loading },
    canQueryCustom() { return this.customStart && this.customEnd },
    dateRangeText() {
      if (this.timeRange === 'custom' && this.customStart && this.customEnd) {
        return `${this.customStart} ~ ${this.customEnd}`
      }
      const now = new Date()
      const today = this.formatDate(now)
      if (this.timeRange === 'today') return today
      if (this.timeRange === 'week') {
        const day = now.getDay() || 7
        const start = new Date(now)
        start.setDate(start.getDate() - day + 1)
        return `${this.formatDate(start)} ~ ${today}`
      }
      if (this.timeRange === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        return `${this.formatDate(start)} ~ ${today}`
      }
      return today
    }
  },

  onLoad() {
    this.dashboardStore = useAdminDashboardStore()
    this.calcNavBarHeight()
    this.fetchData()
  },

  onShow() {
    if (this.dashboardStore) this.fetchData()
  },

  methods: {
    calcNavBarHeight() {
      const sys = uni.getSystemInfoSync()
      this.navBarHeight = (sys.statusBarHeight || 0) + 44
    },

    formatDate(d) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },

    switchTime(val) {
      this.timeRange = val
      if (val !== 'custom') {
        this.dashboardStore.setTimeRange(val)
        this.fetchData()
      }
    },

    onStartDateChange(e) {
      this.customStart = e.detail.value
    },

    onEndDateChange(e) {
      this.customEnd = e.detail.value
    },

    queryCustom() {
      if (!this.canQueryCustom) return
      this.dashboardStore.setTimeRange('custom')
      this.dashboardStore.setCustomDates(this.customStart, this.customEnd)
      this.fetchData()
    },

    async fetchData() {
      try {
        await this.dashboardStore.fetchStats()
      } catch (e) {
        uni.showToast({ title: e.message || '获取统计失败', icon: 'none' })
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
  width: 100%;
  box-sizing: border-box;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
  overflow-x: hidden;
}

.scroll-content {
  width: 100%;
  box-sizing: border-box;
  padding: 24rpx;
}

.card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.time-card {
  padding-bottom: 24rpx;
}

.time-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
}

.date-range {
  font-size: 24rpx;
  color: #909399;
}

.time-tabs {
  display: flex;
  background: #f5f7fa;
  border-radius: 16rpx;
  padding: 6rpx;
}

.time-tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: #606266;
  border-radius: 12rpx;
  transition: all 0.2s;

  &.active {
    background: #ffffff;
    color: #ff6b35;
    font-weight: 600;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  }
}

.custom-date-row {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  gap: 12rpx;
}

.date-picker-input {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  background: #f5f7fa;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #303133;
  padding: 0 16rpx;
}

.date-sep {
  color: #909399;
  font-size: 26rpx;
}

.query-btn {
  padding: 0 24rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: #ff6b35;
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 26rpx;
  font-weight: 500;

  &.disabled {
    background: #cccccc;
  }
}

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.stat-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx 16rpx;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.gradient-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-value {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8rpx;

  &.white { color: #ffffff; }
  &.warning { color: #ff9900; }
  &.success { color: #19be6b; }
  &.danger { color: #fa3534; }
}

.stat-label {
  display: block;
  font-size: 24rpx;
  color: #909399;

  &.white-sub { color: rgba(255, 255, 255, 0.8); }
}

.loading-box {
  text-align: center;
  padding: 60rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #909399;
}

.hint-card {
  text-align: center;
}

.hint-text {
  font-size: 24rpx;
  color: #909399;
}
</style>
