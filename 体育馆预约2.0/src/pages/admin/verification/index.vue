<template>
  <view class="page-container">
    <NavBar
      title="核销中心"
      :showBack="false"
      backgroundColor="#ff6b35"
      titleColor="#ffffff"
      :showBorder="false"
    />
    <view class="page-body" :style="{ paddingTop: navBarHeight + 'px' }">
      <scroll-view scroll-y class="scroll-content">
        <!-- 核销码输入区 -->
        <view class="card verify-card">
          <view class="verify-icon-area">
            <text class="verify-icon">📷</text>
          </view>
          <view class="input-group">
            <input
              class="verify-input"
              v-model="code"
              placeholder="输入核销码"
              confirm-type="search"
              @confirm="handleVerify"
            />
          </view>
          <view class="verify-btn" :class="{ disabled: !code.trim() || verifying }" @click="handleVerify">
            <text class="verify-btn-text">{{ verifying ? '核销中...' : '查询并核销' }}</text>
          </view>
        </view>

        <!-- 核销结果展示 -->
        <view v-if="verifyResult" class="card result-card">
          <view class="card-head">
            <text class="card-title">查询结果</text>
            <view class="status-tag" :style="{ background: verifyResult.statusColor }">
              <text class="status-tag-text">{{ verifyResult.statusText }}</text>
            </view>
          </view>
          <view class="detail-item">
            <text class="detail-label">订单号</text>
            <text class="detail-value">{{ verifyResult.orderNo }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">场馆</text>
            <text class="detail-value">{{ verifyResult.venueName }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">时间</text>
            <text class="detail-value">{{ verifyResult.date }} {{ verifyResult.startTime }}-{{ verifyResult.endTime }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">用户</text>
            <text class="detail-value">{{ verifyResult.userName }}</text>
          </view>
        </view>

        <!-- 最近核销记录 -->
        <view class="card">
          <view class="card-head">
            <text class="card-title">最近核销记录</text>
          </view>
          <view v-if="history.length === 0" class="empty-state">
            <text class="empty-text">暂无记录</text>
          </view>
          <view v-for="(h, idx) in history" :key="idx" class="history-row">
            <view class="history-info">
              <text class="history-code">{{ h.code }}</text>
              <text class="history-desc">{{ h.venueName }} - {{ h.userName }}</text>
            </view>
            <text class="history-time">{{ h.time }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <AdminTabBar current="verification" />
  </view>
</template>

<script>
import NavBar from '@/components/NavBar.vue'
import AdminTabBar from '@/components/admin/AdminTabBar.vue'
import { useAdminVerificationStore } from '@/stores/admin-verification.js'
import { useAdminDashboardStore } from '@/stores/admin-dashboard.js'
import { useAdminOrdersStore } from '@/stores/admin-orders.js'
import { clearCache } from '@/utils/request.js'

export default {
  components: { NavBar, AdminTabBar },

  data() {
    return {
      verifyStore: null,
      navBarHeight: 0,
      code: ''
    }
  },

  computed: {
    verifying() { return this.verifyStore?.verifying },
    verifyResult() { return this.verifyStore?.verifyResult },
    history() { return this.verifyStore?.history || [] }
  },

  onLoad() {
    this.verifyStore = useAdminVerificationStore()
    this.calcNavBarHeight()
  },

  methods: {
    calcNavBarHeight() {
      const sys = uni.getSystemInfoSync()
      this.navBarHeight = (sys.statusBarHeight || 0) + 44
    },

    async handleVerify() {
      const trimmed = this.code.trim()
      if (!trimmed) return

      try {
        // First query the order by code
        await this.verifyStore.queryByCode(trimmed)

        const order = this.verifyStore.verifyResult
        if (!order) {
          uni.showToast({ title: '核销码无效或不存在', icon: 'none' })
          return
        }

        // Check if order can be verified
        if (!['PAID', 'SHARING_SUCCESS'].includes(order.status)) {
          uni.showToast({ title: `当前状态不可核销: ${order.statusText}`, icon: 'none' })
          return
        }

        // Confirm and verify
        uni.showModal({
          title: '确认核销',
          content: `订单号: ${order.orderNo}\n场馆: ${order.venueName}\n时间: ${order.date} ${order.startTime}-${order.endTime}\n用户: ${order.userName}`,
          success: async (res) => {
            if (!res.confirm) return
            try {
              await this.verifyStore.executeVerify(trimmed)
              uni.showToast({ title: '核销成功', icon: 'success' })

              // 清除订单列表缓存并标记需要刷新
              clearCache('/admin/bookings')
              if (order.id) {
                clearCache(`/bookings/${order.id}`)
              }
              useAdminOrdersStore().needRefresh = true

              this.code = ''
              this.verifyStore.clearResult()
              try { useAdminDashboardStore().refreshStats() } catch {}
            } catch (e) {
              uni.showToast({ title: e.message || '核销失败', icon: 'none' })
            }
          }
        })
      } catch (e) {
        uni.showToast({ title: e.message || '查询失败', icon: 'none' })
      }
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

.card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.verify-card {
  text-align: center;
  padding: 60rpx 28rpx;
}

.verify-icon-area {
  margin-bottom: 40rpx;
}

.verify-icon {
  font-size: 100rpx;
}

.input-group {
  margin-bottom: 32rpx;
}

.verify-input {
  width: 100%;
  height: 100rpx;
  text-align: center;
  font-size: 40rpx;
  letter-spacing: 8rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 16rpx;
  background: #f5f7fa;
  color: #303133;
}

.verify-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #ff6b35;
  color: #ffffff;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;

  &.disabled {
    background: #cccccc;
  }
}

.verify-btn-text {
  color: #ffffff;
}

.result-card {
  border-left: 8rpx solid #ff6b35;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
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
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child { border-bottom: none; }
}

.detail-label {
  font-size: 26rpx;
  color: #909399;
}

.detail-value {
  font-size: 26rpx;
  color: #303133;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 40rpx;
}

.empty-text {
  font-size: 26rpx;
  color: #909399;
}

.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child { border-bottom: none; }
}

.history-info {
  display: flex;
  flex-direction: column;
}

.history-code {
  font-size: 28rpx;
  font-weight: 500;
  color: #303133;
}

.history-desc {
  font-size: 24rpx;
  color: #909399;
  margin-top: 4rpx;
}

.history-time {
  font-size: 24rpx;
  color: #909399;
}
</style>
