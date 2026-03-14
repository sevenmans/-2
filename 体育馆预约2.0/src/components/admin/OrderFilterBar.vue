<template>
  <scroll-view scroll-x class="filter-bar">
    <view
      v-for="item in filters"
      :key="item.value"
      class="filter-chip"
      :class="{ active: current === item.value }"
      @click="$emit('change', item.value)"
    >{{ item.label }}</view>
  </scroll-view>
</template>

<script>
export default {
  name: 'OrderFilterBar',
  props: {
    filters: { type: Array, default: () => [] },
    current: { type: String, default: '' }
  },
  emits: ['change']
}
</script>

<style lang="scss" scoped>
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
</style>
