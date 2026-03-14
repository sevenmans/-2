<template>
  <view class="admin-tabbar">
    <view
      v-for="(tab, idx) in tabs"
      :key="tab.key"
      class="tab-item"
      :class="{ active: current === tab.key, highlight: tab.highlight }"
      @click="switchTab(tab)"
    >
      <view v-if="tab.highlight" class="tab-icon-wrapper">
        <text class="tab-icon">{{ tab.icon }}</text>
      </view>
      <text v-else class="tab-icon">{{ tab.icon }}</text>
      <text class="tab-text" :class="{ 'tab-text-highlight': tab.highlight }">{{ tab.label }}</text>
    </view>
  </view>
</template>

<script>
const TAB_CONFIG = [
  { key: 'dashboard', icon: '📊', label: '工作台', path: '/pages/admin/dashboard' },
  { key: 'orders', icon: '📋', label: '订单', path: '/pages/admin/orders/list' },
  { key: 'verification', icon: '📷', label: '核销', path: '/pages/admin/verification/index', highlight: true },
  { key: 'venues', icon: '🏟️', label: '场馆', path: '/pages/admin/venues/list' },
  { key: 'security', icon: '👤', label: '我的', path: '/pages/admin/security/password' }
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
  height: calc(100rpx + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: #ffffff;
  border-top: 1rpx solid #ebeef5;
  display: flex;
  z-index: 999;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666666;
  font-size: 20rpx;
  position: relative;

  &.active {
    color: #ff6b35;
  }
}

.tab-icon {
  font-size: 44rpx;
  margin-bottom: 4rpx;
  line-height: 1;
}

.tab-text {
  font-size: 20rpx;
  line-height: 1.2;
}

.tab-text-highlight {
  margin-top: 48rpx;
}

.tab-item.highlight {
  overflow: visible;

  .tab-icon-wrapper {
    position: absolute;
    top: -40rpx;
    width: 96rpx;
    height: 96rpx;
    background: #ff6b35;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.1);
    border: 8rpx solid #ffffff;

    .tab-icon {
      font-size: 52rpx;
      margin-bottom: 0;
      color: #ffffff;
    }
  }
}
</style>
