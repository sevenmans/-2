<template>
  <view class="page-container">
    <NavBar
      title="场馆管理"
      :showBack="false"
      backgroundColor="#ff6b35"
      titleColor="#ffffff"
      :showBorder="false"
      rightText="新增"
      @right-click="goCreate"
    />
    <view class="page-body" :style="{ paddingTop: navBarHeight + 'px' }">
      <scroll-view scroll-y class="scroll-content">
        <view v-if="loading" class="loading-box">
          <text class="loading-text">加载中...</text>
        </view>

        <view v-if="!loading && venues.length === 0" class="empty-state">
          <text class="empty-text">暂无管理的场馆</text>
          <view class="empty-btn" @click="goCreate">新增场馆</view>
        </view>

        <view v-for="venue in venues" :key="venue.id" class="venue-card">
          <view class="venue-header">
            <text class="venue-name">{{ venue.name }}</text>
            <view class="venue-status" :class="getStatusClass(venue.status)">
              <text>{{ getStatusText(venue.status) }}</text>
            </view>
          </view>
          <view class="venue-meta">
            <text>{{ venue.type }}</text>
            <text class="meta-sep">|</text>
            <text>¥{{ venue.price }}/小时</text>
            <text class="meta-sep">|</text>
            <text>{{ venue.openTime }}-{{ venue.closeTime }}</text>
          </view>
          <view v-if="venue.supportSharing" class="sharing-badge">
            <text class="sharing-badge-text">支持拼场</text>
          </view>
          <view class="venue-actions">
            <view class="action-btn" :class="venue.status === 'OPEN' ? 'btn-outline-danger' : 'btn-outline-success'" @click="toggleStatus(venue)">
              {{ venue.status === 'OPEN' ? '下架' : '上架' }}
            </view>
            <view class="action-btn btn-outline-primary" @click="goEdit(venue.id)">编辑</view>
            <view class="action-btn btn-outline-default" @click="goTimeslots(venue.id)">排期</view>
          </view>
        </view>
      </scroll-view>
    </view>

    <AdminTabBar current="venues" />
  </view>
</template>

<script>
import NavBar from '@/components/NavBar.vue'
import AdminTabBar from '@/components/admin/AdminTabBar.vue'
import { useAdminVenuesStore } from '@/stores/admin-venues.js'

export default {
  components: { NavBar, AdminTabBar },

  data() {
    return {
      venuesStore: null,
      navBarHeight: 0
    }
  },

  computed: {
    venues() { return this.venuesStore?.managerVenues || [] },
    loading() { return this.venuesStore?.loading }
  },

  onLoad() {
    this.venuesStore = useAdminVenuesStore()
    this.calcNavBarHeight()
  },

  onShow() {
    this.fetchVenues()
  },

  methods: {
    calcNavBarHeight() {
      const sys = uni.getSystemInfoSync()
      this.navBarHeight = (sys.statusBarHeight || 0) + 44
    },

    async fetchVenues() {
      try {
        await this.venuesStore.fetchManagedVenues()
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      }
    },

    getStatusClass(status) {
      if (status === 'OPEN') return 'status-open'
      if (status === 'CLOSED') return 'status-closed'
      return 'status-maintenance'
    },

    getStatusText(status) {
      const map = { OPEN: '营业中', CLOSED: '休息中', MAINTENANCE: '维护中' }
      return map[status] || status
    },

    toggleStatus(venue) {
      const newStatus = venue.status === 'OPEN' ? 'CLOSED' : 'OPEN'
      const action = newStatus === 'OPEN' ? '上架' : '下架'

      uni.showModal({
        title: `确认${action}`,
        content: `确定要将「${venue.name}」${action}吗？`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await this.venuesStore.toggleVenueStatus(venue.id, newStatus)
            uni.showToast({ title: `${action}成功`, icon: 'success' })
          } catch (e) {
            uni.showToast({ title: e.message || `${action}失败`, icon: 'none' })
          }
        }
      })
    },

    goCreate() {
      uni.navigateTo({ url: '/pages/admin/venues/create' })
    },

    goEdit(id) {
      uni.navigateTo({ url: `/pages/admin/venues/edit?id=${id}` })
    },

    goTimeslots(venueId) {
      uni.navigateTo({ url: `/pages/admin/timeslots/index?venueId=${venueId}` })
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.page-body {
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.scroll-content {
  padding: 24rpx;
}

.venue-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.venue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.venue-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
}

.venue-status {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;

  &.status-open { background: #f0f9eb; color: #19be6b; }
  &.status-closed { background: #fef0f0; color: #fa3534; }
  &.status-maintenance { background: #fdf6ec; color: #ff9900; }
}

.venue-meta {
  font-size: 24rpx;
  color: #909399;
  margin-bottom: 12rpx;
}

.meta-sep {
  margin: 0 8rpx;
}

.sharing-badge {
  display: inline-block;
  margin-bottom: 16rpx;
}

.sharing-badge-text {
  font-size: 22rpx;
  color: #ff6b35;
  background: #fff0e6;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.venue-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f5f5f5;
}

.action-btn {
  padding: 10rpx 28rpx;
  border-radius: 40rpx;
  font-size: 24rpx;
  font-weight: 500;
}

.btn-outline-primary {
  color: #ff6b35;
  border: 1rpx solid #ff6b35;
}

.btn-outline-danger {
  color: #fa3534;
  border: 1rpx solid #fa3534;
}

.btn-outline-success {
  color: #19be6b;
  border: 1rpx solid #19be6b;
}

.btn-outline-default {
  color: #606266;
  border: 1rpx solid #dcdfe6;
}

.empty-state {
  text-align: center;
  padding: 120rpx 0;
}

.empty-text {
  display: block;
  font-size: 28rpx;
  color: #909399;
  margin-bottom: 24rpx;
}

.empty-btn {
  display: inline-block;
  padding: 16rpx 48rpx;
  background: #ff6b35;
  color: #ffffff;
  border-radius: 44rpx;
  font-size: 28rpx;
}

.loading-box {
  text-align: center;
  padding: 120rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #909399;
}
</style>
