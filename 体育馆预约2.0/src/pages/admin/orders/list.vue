<template>
  <view class="page-container">
    <NavBar
      title="订单管理"
      :showBack="false"
      backgroundColor="#ff6b35"
      titleColor="#ffffff"
      :showBorder="false"
    />
    <view class="page-body" :style="{ paddingTop: navBarHeight + 'px' }">
      <!-- 搜索框 -->
      <view class="search-bar">
        <view class="search-input-wrap">
          <text class="search-icon">🔍</text>
          <input
            class="search-input"
            v-model="keyword"
            placeholder="搜索手机号 / 核销码"
            confirm-type="search"
            @confirm="onSearch"
            @input="onSearchInput"
          />
          <text v-if="keyword" class="clear-icon" @click="clearSearch">✕</text>
        </view>
      </view>

      <!-- 状态筛选 -->
      <scroll-view scroll-x class="filter-bar">
        <view
          v-for="f in statusFilters"
          :key="f.value"
          class="filter-chip"
          :class="{ active: currentStatus === f.value }"
          @click="onFilterStatus(f.value)"
        >{{ f.label }}</view>
      </scroll-view>

      <!-- 订单列表 -->
      <scroll-view
        scroll-y
        class="order-list"
        @scrolltolower="loadMore"
      >
        <view v-if="orders.length === 0 && !loading" class="empty-state">
          <text class="empty-text">暂无订单数据</text>
        </view>

        <view
          v-for="order in orders"
          :key="order.id"
          class="order-card"
          @click="goDetail(order.id)"
        >
          <!-- 头部：场馆名 + 状态 -->
          <view class="card-header">
            <text class="venue-name">{{ order.venueName }}</text>
            <view class="status-badge" :style="{ background: order.statusColor }">
              <text class="status-text">{{ order.statusText }}</text>
            </view>
          </view>

          <!-- 信息行 -->
          <view class="info-section">
            <view class="info-row">
              <text class="info-label">订单号</text>
              <text class="info-value">{{ order.orderNo }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">预约时间</text>
              <text class="info-value highlight">{{ order.date }} {{ order.startTime }}-{{ order.endTime }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">类型</text>
              <view class="type-tag" :class="order.type === 'SHARED' ? 'tag-shared' : 'tag-exclusive'">
                <text>{{ order.typeText }}</text>
              </view>
            </view>
            <view class="info-row">
              <text class="info-label">用户</text>
              <text class="info-value">{{ order.userName }} ({{ order.phoneTail }})</text>
            </view>
          </view>

          <!-- 底部：金额 + 操作 -->
          <view class="card-footer">
            <view class="price-area">
              <text class="price-label">实付:</text>
              <text class="price-value">¥{{ order.price }}</text>
            </view>
            <view class="action-area">
              <view
                v-if="canCancel(order)"
                class="btn-action btn-danger"
                @click.stop="handleCancel(order)"
              >取消</view>
            </view>
          </view>
        </view>

        <LoadMore
          v-if="orders.length > 0"
          :status="loadMoreStatus"
          @loadmore="loadMore"
        />

        <view v-if="loading && orders.length === 0" class="loading-box">
          <text class="loading-text">加载中...</text>
        </view>
      </scroll-view>
    </view>

    <AdminTabBar current="orders" />
  </view>
</template>

<script>
import NavBar from '@/components/NavBar.vue'
import AdminTabBar from '@/components/admin/AdminTabBar.vue'
import LoadMore from '@/components/LoadMore.vue'
import { useAdminOrdersStore } from '@/stores/admin-orders.js'
import { useAdminDashboardStore } from '@/stores/admin-dashboard.js'

export default {
  components: { NavBar, AdminTabBar, LoadMore },

  data() {
    return {
      ordersStore: null,
      navBarHeight: 0,
      keyword: '',
      currentStatus: '',
      searchTimer: null,
      statusFilters: [
        { label: '全部', value: '' },
        { label: '待核销', value: 'PAID' },
        { label: '已核销', value: 'VERIFIED' },
        { label: '已完成', value: 'COMPLETED' },
        { label: '已退款', value: 'REFUNDED' },
        { label: '已取消', value: 'CANCELLED' },
        { label: '已过期', value: 'EXPIRED' }
      ]
    }
  },

  computed: {
    orders() { return this.ordersStore?.list || [] },
    loading() { return this.ordersStore?.loading },
    loadMoreStatus() {
      if (this.loading) return 'loading'
      if (!this.ordersStore?.pagination.hasMore) return 'nomore'
      return 'more'
    }
  },

  onLoad() {
    this.ordersStore = useAdminOrdersStore()
    this.calcNavBarHeight()
  },

  onShow() {
    // 检查是否需要强制刷新（核销/完成/取消订单后返回列表）
    if (this.ordersStore?.needRefresh) {
      this.ordersStore.pagination.page = 1
      this.ordersStore.list = []
    }
    this.fetchOrders()
  },

  methods: {
    calcNavBarHeight() {
      const sys = uni.getSystemInfoSync()
      this.navBarHeight = (sys.statusBarHeight || 0) + 44
    },

    canCancel(order) {
      return ['PAID', 'SHARING_SUCCESS'].includes(order.status)
    },

    onSearch() {
      this.ordersStore.setFilter('keyword', this.keyword)
      this.fetchOrders()
    },

    onSearchInput() {
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.ordersStore.setFilter('keyword', this.keyword)
        this.fetchOrders()
      }, 500)
    },

    clearSearch() {
      this.keyword = ''
      this.ordersStore.setFilter('keyword', '')
      this.fetchOrders()
    },

    onFilterStatus(val) {
      this.currentStatus = val
      // Map REFUNDED to CANCELLED for backend, frontend adapter handles display
      const backendStatus = val === 'REFUNDED' ? 'CANCELLED' : val
      this.ordersStore.setFilter('status', backendStatus)
      this.fetchOrders()
    },

    async fetchOrders() {
      try {
        await this.ordersStore.fetchOrders(false)
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      }
    },

    async loadMore() {
      try {
        await this.ordersStore.loadMore()
      } catch (e) {
        uni.showToast({ title: '加载更多失败', icon: 'none' })
      }
    },

    goDetail(id) {
      uni.navigateTo({ url: `/pages/admin/orders/detail?id=${id}` })
    },

    handleCancel(order) {
      uni.showModal({
        title: '确认取消',
        content: `确定要取消订单并退款吗？\n订单号: ${order.orderNo}`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await this.ordersStore.cancelOrder(order.id)
            uni.showToast({ title: '已取消并退款', icon: 'success' })
            // 刷新统计
            try { useAdminDashboardStore().refreshStats() } catch {}
          } catch (e) {
            uni.showToast({ title: e.message || '取消失败', icon: 'none' })
          }
        }
      })
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
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.search-bar {
  background: #ffffff;
  padding: 16rpx 24rpx;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  background: #f5f7fa;
  border-radius: 16rpx;
  padding: 0 24rpx;
  height: 72rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #303133;
}

.clear-icon {
  font-size: 28rpx;
  color: #909399;
  padding: 8rpx;
}

.filter-bar {
  white-space: nowrap;
  background: #ffffff;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.filter-chip {
  display: inline-block;
  padding: 10rpx 28rpx;
  margin-right: 16rpx;
  background: #f4f4f5;
  border-radius: 28rpx;
  font-size: 24rpx;
  color: #606266;

  &.active {
    background: #fff0e6;
    color: #ff6b35;
    font-weight: 500;
  }
}

.order-list {
  flex: 1;
  padding: 20rpx 24rpx;
}

.order-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
  margin-bottom: 20rpx;
}

.venue-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
}

.status-badge {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.status-text {
  font-size: 22rpx;
  color: #ffffff;
}

.info-section {
  margin-bottom: 16rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;

  &:last-child { margin-bottom: 0; }
}

.info-label {
  font-size: 26rpx;
  color: #909399;
}

.info-value {
  font-size: 26rpx;
  color: #303133;
  font-weight: 500;

  &.highlight {
    color: #ff6b35;
    font-weight: bold;
  }
}

.type-tag {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;

  &.tag-exclusive {
    background: #e6f7ff;
    color: #2979ff;
  }

  &.tag-shared {
    background: #fff0f6;
    color: #ff6b35;
  }
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid #f5f5f5;
}

.price-area {
  display: flex;
  align-items: center;
}

.price-label {
  font-size: 24rpx;
  color: #909399;
  margin-right: 4rpx;
}

.price-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #ff6b35;
}

.action-area {
  display: flex;
  gap: 16rpx;
}

.btn-action {
  padding: 10rpx 28rpx;
  border-radius: 40rpx;
  font-size: 24rpx;
  font-weight: 500;
}

.btn-danger {
  background: #ffffff;
  color: #fa3534;
  border: 1rpx solid #fa3534;
}

.empty-state {
  text-align: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #909399;
}

.loading-box {
  text-align: center;
  padding: 60rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #909399;
}
</style>
