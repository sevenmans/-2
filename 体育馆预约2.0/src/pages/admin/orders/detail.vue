<template>
  <view class="page-container">
    <NavBar
      title="订单详情"
      :showBack="true"
      backgroundColor="#ff6b35"
      titleColor="#ffffff"
      :showBorder="false"
      @left-click="goBack"
    />
    <view class="page-body" :style="{ paddingTop: navBarHeight + 'px' }">
      <scroll-view scroll-y class="detail-scroll">
        <view v-if="loading" class="loading-box">
          <text class="loading-text">加载中...</text>
        </view>

        <template v-if="order">
          <!-- 订单信息卡片 -->
          <view class="card">
            <view class="card-head">
              <text class="card-title">订单信息</text>
              <view class="status-tag" :style="{ background: order.statusColor }">
                <text class="status-tag-text">{{ order.statusText }}</text>
              </view>
            </view>
            <view class="detail-item">
              <text class="detail-label">订单号</text>
              <text class="detail-value">{{ order.orderNo }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">预约人</text>
              <text class="detail-value">{{ order.userName }} ({{ order.userPhone }})</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">场馆</text>
              <text class="detail-value">{{ order.venueName }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">时间</text>
              <text class="detail-value">{{ order.date }} {{ order.startTime }}-{{ order.endTime }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">金额</text>
              <text class="detail-value price">¥{{ order.price }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">类型</text>
              <view class="type-tag" :class="order.type === 'SHARED' ? 'tag-shared' : 'tag-exclusive'">
                <text>{{ order.typeText }}</text>
              </view>
            </view>
            <view class="detail-item">
              <text class="detail-label">下单时间</text>
              <text class="detail-value">{{ order.createTime }}</text>
            </view>
          </view>

          <!-- 拼场信息（仅 SHARED） -->
          <view v-if="order.type === 'SHARED'" class="card">
            <view class="card-head">
              <text class="card-title">拼场信息</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">队伍名称</text>
              <text class="detail-value">{{ order.teamName || '-' }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">拼场说明</text>
              <text class="detail-value">{{ order.sharingDescription || '-' }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">人数进度</text>
              <text class="detail-value">{{ order.currentPeople }}/{{ order.totalPeople }}人</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">人均费用</text>
              <text class="detail-value price">¥{{ order.pricePerPerson }}</text>
            </view>
          </view>

          <!-- 参与者列表 -->
          <view v-if="order.type === 'SHARED' && order.participants.length > 0" class="card">
            <view class="card-head">
              <text class="card-title">拼场成员</text>
            </view>
            <view
              v-for="(p, idx) in order.participants"
              :key="idx"
              class="participant-row"
            >
              <view class="participant-info">
                <text class="participant-name">{{ p.name }}</text>
                <text class="participant-phone">{{ p.phone }}</text>
              </view>
              <view class="participant-status" :class="getParticipantStatusClass(p.status)">
                <text>{{ getParticipantStatusText(p.status) }}</text>
              </view>
            </view>
          </view>
        </template>
      </scroll-view>

      <!-- 底部操作栏 -->
      <view v-if="order && hasActions" class="footer-actions">
        <view v-if="canVerify" class="action-btn btn-primary" @click="handleVerify">核销</view>
        <view v-if="canComplete" class="action-btn btn-success" @click="handleComplete">完成订单</view>
        <view v-if="canCancel" class="action-btn btn-danger" @click="handleCancel">取消/退款</view>
      </view>
      <view v-else-if="order" class="footer-actions footer-disabled">
        <text class="disabled-text">当前状态不可操作</text>
      </view>
    </view>
  </view>
</template>

<script>
import NavBar from '@/components/NavBar.vue'
import { get, clearCache } from '@/utils/request.js'
import { verifyOrder, completeOrder } from '@/api/verification.js'
import { adminCancelBooking } from '@/api/admin-dashboard.js'
import { adaptAdminOrder } from '@/utils/admin-adapter.js'
import { useAdminDashboardStore } from '@/stores/admin-dashboard.js'
import { useAdminOrdersStore } from '@/stores/admin-orders.js'

export default {
  components: { NavBar },

  data() {
    return {
      navBarHeight: 0,
      orderId: null,
      order: null,
      loading: false
    }
  },

  computed: {
    canVerify() {
      return ['PAID', 'SHARING_SUCCESS'].includes(this.order?.status)
    },
    canComplete() {
      return this.order?.status === 'VERIFIED'
    },
    canCancel() {
      return ['PAID', 'SHARING_SUCCESS'].includes(this.order?.status)
    },
    hasActions() {
      return this.canVerify || this.canComplete || this.canCancel
    }
  },

  onLoad(options) {
    this.orderId = options.id
    this.calcNavBarHeight()
    this.fetchDetail()
  },

  methods: {
    calcNavBarHeight() {
      const sys = uni.getSystemInfoSync()
      this.navBarHeight = (sys.statusBarHeight || 0) + 44
    },

    goBack() {
      uni.navigateBack()
    },

    async fetchDetail(forceRefresh = false) {
      if (!this.orderId) return
      this.loading = true
      try {
        // 如果需要强制刷新，禁用缓存
        const options = forceRefresh ? { cache: false } : {}
        const res = await get(`/bookings/${this.orderId}`, {}, options)
        const raw = res.data || res
        this.order = adaptAdminOrder(raw)
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    handleVerify() {
      uni.showModal({
        title: '确认核销',
        content: `确定要核销此订单吗？`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await verifyOrder(this.orderId)
            uni.showToast({ title: '核销成功', icon: 'success' })
            // 清除订单列表缓存并标记需要刷新
            clearCache('/admin/bookings')
            clearCache(`/bookings/${this.orderId}`)
            useAdminOrdersStore().needRefresh = true
            // 强制刷新详情页（禁用缓存）
            this.fetchDetail(true)
            try { useAdminDashboardStore().refreshStats() } catch {}
          } catch (e) {
            uni.showToast({ title: e.message || '核销失败', icon: 'none' })
          }
        }
      })
    },

    handleComplete() {
      uni.showModal({
        title: '完成订单',
        content: '确定要将此订单标记为已完成吗？',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await completeOrder(this.orderId)
            uni.showToast({ title: '订单已完成', icon: 'success' })
            // 清除订单列表缓存并标记需要刷新
            clearCache('/admin/bookings')
            clearCache(`/bookings/${this.orderId}`)
            useAdminOrdersStore().needRefresh = true
            // 强制刷新详情页（禁用缓存）
            this.fetchDetail(true)
            try { useAdminDashboardStore().refreshStats() } catch {}
          } catch (e) {
            uni.showToast({ title: e.message || '操作失败', icon: 'none' })
          }
        }
      })
    },

    handleCancel() {
      uni.showModal({
        title: '确认取消',
        content: '确定要取消此订单并退款吗？',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await adminCancelBooking(this.orderId)
            uni.showToast({ title: '已取消并退款', icon: 'success' })
            // 清除订单列表缓存并标记需要刷新
            clearCache('/admin/bookings')
            clearCache(`/bookings/${this.orderId}`)
            useAdminOrdersStore().needRefresh = true
            // 强制刷新详情页（禁用缓存）
            this.fetchDetail(true)
            try { useAdminDashboardStore().refreshStats() } catch {}
          } catch (e) {
            uni.showToast({ title: e.message || '取消失败', icon: 'none' })
          }
        }
      })
    },

    getParticipantStatusClass(status) {
      if (status === 'VERIFIED' || status === 'COMPLETED') return 'p-status-success'
      if (status === 'PAID') return 'p-status-warning'
      return 'p-status-default'
    },

    getParticipantStatusText(status) {
      const map = { VERIFIED: '已核销', PAID: '待核销', COMPLETED: '已完成', CANCELLED: '已取消' }
      return map[status] || status
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
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.detail-scroll {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  padding: 24rpx;
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
}

.card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
}

.status-tag {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.status-tag-text {
  font-size: 22rpx;
  color: #ffffff;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child { border-bottom: none; }
}

.detail-label {
  font-size: 26rpx;
  color: #909399;
  min-width: 140rpx;
}

.detail-value {
  font-size: 26rpx;
  color: #303133;
  flex: 1;
  text-align: right;

  &.price {
    color: #ff6b35;
    font-weight: bold;
  }
}

.type-tag {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;

  &.tag-exclusive { background: #e6f7ff; color: #2979ff; }
  &.tag-shared { background: #fff0f6; color: #ff6b35; }
}

.participant-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child { border-bottom: none; }
}

.participant-info {
  display: flex;
  flex-direction: column;
}

.participant-name {
  font-size: 28rpx;
  color: #303133;
  font-weight: 500;
}

.participant-phone {
  font-size: 24rpx;
  color: #909399;
  margin-top: 4rpx;
}

.participant-status {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;

  &.p-status-success { background: #f0f9eb; color: #19be6b; }
  &.p-status-warning { background: #fdf6ec; color: #ff9900; }
  &.p-status-default { background: #f4f4f5; color: #909399; }
}

.footer-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  box-sizing: border-box;
  background: #ffffff;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #ebeef5;
  display: flex;
  gap: 20rpx;
  z-index: 100;
}

.footer-disabled {
  justify-content: center;
}

.disabled-text {
  font-size: 28rpx;
  color: #909399;
}

.action-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
}

.btn-primary {
  background: #ff6b35;
  color: #ffffff;
}

.btn-success {
  background: #19be6b;
  color: #ffffff;
}

.btn-danger {
  background: #ffffff;
  color: #fa3534;
  border: 2rpx solid #fa3534;
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
