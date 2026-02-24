<template>
  <view class="skeleton-container">
    <!-- 轮播图骨架屏 -->
    <view v-if="showBanner" class="skeleton-banner">
      <view class="skeleton-item skeleton-banner-item"></view>
    </view>
    
    <!-- 快捷功能骨架屏 -->
    <view v-if="showActions" class="skeleton-actions">
      <view 
        v-for="i in 4" 
        :key="i" 
        class="skeleton-item skeleton-action-item"
      ></view>
    </view>
    
    <!-- 场馆列表骨架屏 -->
    <view v-if="showVenues" class="skeleton-venues">
      <view class="skeleton-section-header">
        <view class="skeleton-item skeleton-title"></view>
        <view class="skeleton-item skeleton-more"></view>
      </view>
      <view class="skeleton-venue-list">
        <view 
          v-for="i in count" 
          :key="i" 
          class="skeleton-venue-card"
        >
          <view class="skeleton-item skeleton-venue-image"></view>
          <view class="skeleton-venue-info">
            <view class="skeleton-item skeleton-venue-name"></view>
            <view class="skeleton-item skeleton-venue-location"></view>
            <view class="skeleton-item skeleton-venue-price"></view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 拼场列表骨架屏 -->
    <view v-if="showSharings" class="skeleton-sharings">
      <view class="skeleton-section-header">
        <view class="skeleton-item skeleton-title"></view>
        <view class="skeleton-item skeleton-more"></view>
      </view>
      <view 
        v-for="i in count" 
        :key="i" 
        class="skeleton-sharing-card"
      >
        <view class="skeleton-item skeleton-sharing-header"></view>
        <view class="skeleton-item skeleton-sharing-info"></view>
        <view class="skeleton-item skeleton-sharing-price"></view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'SkeletonScreen',
  props: {
    // 显示轮播图骨架屏
    showBanner: {
      type: Boolean,
      default: false
    },
    // 显示快捷功能骨架屏
    showActions: {
      type: Boolean,
      default: false
    },
    // 显示场馆列表骨架屏
    showVenues: {
      type: Boolean,
      default: false
    },
    // 显示拼场列表骨架屏
    showSharings: {
      type: Boolean,
      default: false
    },
    // 骨架屏数量
    count: {
      type: Number,
      default: 3
    }
  }
}
</script>

<style scoped>
.skeleton-container {
  padding: 20rpx;
}

.skeleton-item {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 8rpx;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 轮播图骨架屏 */
.skeleton-banner {
  margin-bottom: 30rpx;
}

.skeleton-banner-item {
  width: 100%;
  height: 300rpx;
  border-radius: 16rpx;
}

/* 快捷功能骨架屏 */
.skeleton-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 40rpx;
  padding: 0 20rpx;
}

.skeleton-action-item {
  width: 120rpx;
  height: 120rpx;
  border-radius: 16rpx;
}

/* 场馆列表骨架屏 */
.skeleton-venues {
  margin-bottom: 40rpx;
}

.skeleton-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.skeleton-title {
  width: 160rpx;
  height: 40rpx;
}

.skeleton-more {
  width: 80rpx;
  height: 30rpx;
}

.skeleton-venue-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.skeleton-venue-card {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.skeleton-venue-image {
  width: 160rpx;
  height: 120rpx;
  border-radius: 12rpx;
  margin-right: 20rpx;
}

.skeleton-venue-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.skeleton-venue-name {
  width: 200rpx;
  height: 32rpx;
}

.skeleton-venue-location {
  width: 160rpx;
  height: 24rpx;
}

.skeleton-venue-price {
  width: 120rpx;
  height: 28rpx;
}

/* 拼场列表骨架屏 */
.skeleton-sharings {
  margin-bottom: 40rpx;
}

.skeleton-sharing-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.skeleton-sharing-header {
  width: 100%;
  height: 32rpx;
  margin-bottom: 16rpx;
}

.skeleton-sharing-info {
  width: 80%;
  height: 24rpx;
  margin-bottom: 12rpx;
}

.skeleton-sharing-price {
  width: 120rpx;
  height: 28rpx;
}

/* 响应式适配 */
@media (max-width: 750rpx) {
  .skeleton-actions {
    padding: 0 10rpx;
  }
  
  .skeleton-action-item {
    width: 100rpx;
    height: 100rpx;
  }
  
  .skeleton-venue-image {
    width: 140rpx;
    height: 100rpx;
  }
}
</style>