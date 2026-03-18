<template>
  <view class="admin-tabbar safe-area">
    <view
      v-for="tab in tabs"
      :key="tab.key"
      class="tab-item"
      :class="{ active: current === tab.key }"
      @click="switchTab(tab)"
    >
      <view class="tab-icon-container">
        <image
          class="tab-icon"
          :src="current === tab.key ? tab.selectedIconPath : tab.iconPath"
          mode="aspectFit"
        />
      </view>
      <text class="tab-text">{{ tab.label }}</text>
    </view>
  </view>
</template>

<script>
const TAB_CONFIG = [
  {
    key: 'dashboard',
    label: '工作台',
    path: '/pages/admin/dashboard',
    iconPath: '/static/icons/admin/dashboard.svg',
    selectedIconPath: '/static/icons/admin/dashboard-active.svg'
  },
  {
    key: 'orders',
    label: '订单',
    path: '/pages/admin/orders/list',
    iconPath: '/static/icons/admin/orders.svg',
    selectedIconPath: '/static/icons/admin/orders-active.svg'
  },
  {
    key: 'verification',
    label: '核销',
    path: '/pages/admin/verification/index',
    iconPath: '/static/icons/admin/scan.svg',
    selectedIconPath: '/static/icons/admin/scan-active.svg'
  },
  {
    key: 'venues',
    label: '场馆',
    path: '/pages/admin/venues/list',
    iconPath: '/static/icons/admin/venue.svg',
    selectedIconPath: '/static/icons/admin/venue-active.svg'
  },
  {
    key: 'security',
    label: '我的',
    path: '/pages/admin/security/password',
    iconPath: '/static/icons/admin/user.svg',
    selectedIconPath: '/static/icons/admin/user-active.svg'
  }
]

export default {
  name: 'AdminTabBar',
  props: {
    current: {
      type: String,
      default: 'dashboard'
    }
  },
  data() {
    return {
      tabs: TAB_CONFIG
    }
  },
  methods: {
    switchTab(tab) {
      if (tab.key === this.current) return
      uni.redirectTo({ url: tab.path })
    }
  }
}
</script>

<style lang="scss" scoped>
.admin-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background: #ffffff;
  border-top: 1rpx solid #ebeef5;
  display: flex;
  z-index: 1000;
}

.admin-tabbar.safe-area {
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10rpx 0 16rpx;
  color: #999999;
  font-size: 20rpx;
  position: relative;

  &.active {
    color: #ff6b35;
  }
}

.tab-icon-container {
  position: relative;
  margin-bottom: 8rpx;
}

.tab-icon {
  width: 48rpx;
  height: 48rpx;
}

.tab-text {
  font-size: 20rpx;
  line-height: 1.2;
}
</style>
