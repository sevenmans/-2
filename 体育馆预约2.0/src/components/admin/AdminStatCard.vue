<template>
  <view class="admin-stat-card" :style="cardStyle">
    <text class="stat-value" :style="valueStyle">{{ displayValue }}</text>
    <text class="stat-label" :style="labelStyle">{{ label }}</text>
  </view>
</template>

<script>
export default {
  name: 'AdminStatCard',
  props: {
    value: { type: [String, Number], default: 0 },
    label: { type: String, default: '' },
    prefix: { type: String, default: '' },
    color: { type: String, default: '#303133' },
    gradient: { type: Boolean, default: false }
  },
  computed: {
    displayValue() {
      return this.prefix ? `${this.prefix}${this.value}` : this.value
    },
    cardStyle() {
      if (this.gradient) {
        return { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
      }
      return {}
    },
    valueStyle() {
      return { color: this.gradient ? '#ffffff' : this.color }
    },
    labelStyle() {
      return { color: this.gradient ? 'rgba(255,255,255,0.8)' : '#909399' }
    }
  }
}
</script>

<style lang="scss" scoped>
.admin-stat-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx 16rpx;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.stat-value {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.stat-label {
  display: block;
  font-size: 24rpx;
}
</style>
