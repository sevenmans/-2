<template>
  <view class="skeleton-container">
    <!-- 简化的骨架屏卡片 -->
    <view 
      v-for="n in count" 
      :key="n" 
      class="skeleton-card"
    >
      <view class="skeleton-header">
        <view class="skeleton-line skeleton-title"></view>
        <view class="skeleton-line skeleton-status"></view>
      </view>
      
      <view class="skeleton-content">
        <view class="skeleton-line skeleton-text"></view>
        <view class="skeleton-line skeleton-text"></view>
        <view class="skeleton-line skeleton-price"></view>
      </view>
      
      <view class="skeleton-actions">
        <view class="skeleton-btn"></view>
      </view>
    </view>
  </view>
</template>

<script setup>
// 定义props
const props = defineProps({
  count: {
    type: Number,
    default: 3
  }
})
</script>

<style scoped>
.skeleton-container {
  padding: 0 32rpx;
}

.skeleton-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24rpx;
}

.skeleton-venue-info {
  flex: 1;
}

.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.skeleton-line {
  background: #f0f0f0;
  border-radius: 6rpx;
  margin-bottom: 12rpx;
}

.skeleton-title {
  height: 32rpx;
  width: 200rpx;
}

.skeleton-status {
  height: 24rpx;
  width: 80rpx;
}

.skeleton-content {
  margin-bottom: 20rpx;
}

.skeleton-text {
  height: 24rpx;
  width: 160rpx;
}

.skeleton-price {
  height: 28rpx;
  width: 100rpx;
}

.skeleton-actions {
  display: flex;
  justify-content: flex-end;
}

.skeleton-btn {
  height: 56rpx;
  width: 120rpx;
  background: #f0f0f0;
  border-radius: 28rpx;
}
</style>