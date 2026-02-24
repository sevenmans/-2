<template>
  <view class="load-more" :class="`status-${status}`">
    <!-- 加载中状态 -->
    <view class="loading-container" v-if="status === 'loading'">
      <view class="loading-spinner">
        <view class="spinner-dot" v-for="i in 3" :key="i"></view>
      </view>
      <text class="loading-text">{{ loadingText }}</text>
    </view>
    
    <!-- 加载更多状态 -->
    <view class="loadmore-container" v-else-if="status === 'more'" @click="handleLoadMore">
      <text class="loadmore-text">{{ moreText }}</text>
      <text class="loadmore-icon">↓</text>
    </view>
    
    <!-- 没有更多状态 -->
    <view class="nomore-container" v-else-if="status === 'nomore'">
      <view class="nomore-line"></view>
      <text class="nomore-text">{{ nomoreText }}</text>
      <view class="nomore-line"></view>
    </view>
    
    <!-- 加载失败状态 -->
    <view class="error-container" v-else-if="status === 'error'" @click="handleRetry">
      <text class="error-icon">⚠️</text>
      <text class="error-text">{{ errorText }}</text>
      <text class="retry-text">点击重试</text>
    </view>
    
    <!-- 空状态 -->
    <view class="empty-container" v-else-if="status === 'empty'">
      <image :src="emptyImage" class="empty-image" v-if="emptyImage" />
      <text class="empty-text">{{ emptyText }}</text>
      <button class="refresh-btn" v-if="showRefreshBtn" @click="handleRefresh">
        {{ refreshText }}
      </button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'LoadMore',
  
  props: {
    // 状态：loading(加载中) | more(加载更多) | nomore(没有更多) | error(加载失败) | empty(空状态)
    status: {
      type: String,
      default: 'more',
      validator: (value) => {
        return ['loading', 'more', 'nomore', 'error', 'empty'].includes(value)
      }
    },
    
    // 加载中文本
    loadingText: {
      type: String,
      default: '加载中...'
    },
    
    // 加载更多文本
    moreText: {
      type: String,
      default: '点击加载更多'
    },
    
    // 没有更多文本
    nomoreText: {
      type: String,
      default: '没有更多了'
    },
    
    // 加载失败文本
    errorText: {
      type: String,
      default: '加载失败'
    },
    
    // 空状态文本
    emptyText: {
      type: String,
      default: '暂无数据'
    },
    
    // 空状态图片
    emptyImage: {
      type: String,
      default: '/static/images/empty.png'
    },
    
    // 是否显示刷新按钮
    showRefreshBtn: {
      type: Boolean,
      default: true
    },
    
    // 刷新按钮文本
    refreshText: {
      type: String,
      default: '刷新'
    },
    
    // 自定义样式
    customStyle: {
      type: Object,
      default: () => ({})
    },
    
    // 是否显示分割线
    showLine: {
      type: Boolean,
      default: true
    },
    
    // 组件高度
    height: {
      type: String,
      default: 'auto'
    }
  },
  
  computed: {
    containerStyle() {
      return {
        height: this.height,
        ...this.customStyle
      }
    }
  },
  
  methods: {
    // 加载更多
    handleLoadMore() {
      this.$emit('loadmore')
    },
    
    // 重试
    handleRetry() {
      this.$emit('retry')
    },
    
    // 刷新
    handleRefresh() {
      this.$emit('refresh')
    }
  }
}
</script>

<style lang="scss" scoped>
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30rpx;
  min-height: 80rpx;
}

// 加载中状态
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  
  .loading-spinner {
    display: flex;
    align-items: center;
    margin-right: 16rpx;
    
    .spinner-dot {
      width: 8rpx;
      height: 8rpx;
      background-color: #ff6b35;
      border-radius: 50%;
      margin: 0 2rpx;
      animation: loading-bounce 1.4s ease-in-out infinite both;
      
      &:nth-child(1) {
        animation-delay: -0.32s;
      }
      
      &:nth-child(2) {
        animation-delay: -0.16s;
      }
    }
  }
  
  .loading-text {
    font-size: 24rpx;
    color: #999999;
  }
}

@keyframes loading-bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

// 加载更多状态
.loadmore-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx;
  border-radius: 8rpx;
  background-color: #f8f8f8;
  transition: all 0.3s;
  
  &:active {
    background-color: #f0f0f0;
  }
  
  .loadmore-text {
    font-size: 24rpx;
    color: #666666;
    margin-right: 8rpx;
  }
  
  .loadmore-icon {
    font-size: 20rpx;
    color: #999999;
    animation: bounce 2s infinite;
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-6rpx);
  }
  60% {
    transform: translateY(-3rpx);
  }
}

// 没有更多状态
.nomore-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  
  .nomore-line {
    flex: 1;
    height: 1rpx;
    background-color: #e8e8e8;
    max-width: 120rpx;
  }
  
  .nomore-text {
    font-size: 24rpx;
    color: #999999;
    margin: 0 20rpx;
  }
}

// 加载失败状态
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20rpx;
  border-radius: 8rpx;
  background-color: #fff2f0;
  transition: all 0.3s;
  
  &:active {
    background-color: #ffebe8;
  }
  
  .error-icon {
    font-size: 32rpx;
    margin-bottom: 8rpx;
  }
  
  .error-text {
    font-size: 24rpx;
    color: #ff4d4f;
    margin-bottom: 4rpx;
  }
  
  .retry-text {
    font-size: 20rpx;
    color: #999999;
  }
}

// 空状态
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 30rpx;
  
  .empty-image {
    width: 200rpx;
    height: 200rpx;
    margin-bottom: 20rpx;
    opacity: 0.6;
  }
  
  .empty-text {
    font-size: 28rpx;
    color: #999999;
    margin-bottom: 30rpx;
    text-align: center;
  }
  
  .refresh-btn {
    padding: 16rpx 32rpx;
    background-color: #ff6b35;
    color: #ffffff;
    border: none;
    border-radius: 8rpx;
    font-size: 24rpx;
  }
}

// 不同状态的容器样式
.status-loading {
  background-color: transparent;
}

.status-more {
  background-color: transparent;
}

.status-nomore {
  background-color: transparent;
}

.status-error {
  background-color: transparent;
}

.status-empty {
  background-color: #fafafa;
  min-height: 400rpx;
}

// 紧凑模式
.load-more.compact {
  padding: 20rpx;
  min-height: 60rpx;
  
  .loading-container,
  .loadmore-container,
  .nomore-container,
  .error-container {
    .loading-text,
    .loadmore-text,
    .nomore-text,
    .error-text {
      font-size: 22rpx;
    }
  }
  
  .empty-container {
    padding: 40rpx 30rpx;
    
    .empty-image {
      width: 120rpx;
      height: 120rpx;
    }
    
    .empty-text {
      font-size: 24rpx;
    }
  }
}

// 深色主题适配
@media (prefers-color-scheme: dark) {
  .loadmore-container {
    background-color: #2a2a2a;
  }
  
  .error-container {
    background-color: #3a2a2a;
  }
  
  .status-empty {
    background-color: #1a1a1a;
  }
  
  .nomore-line {
    background-color: #404040;
  }
  
  .loading-text,
  .loadmore-text,
  .nomore-text,
  .empty-text {
    color: #cccccc;
  }
  
  .error-text {
    color: #ff7875;
  }
  
  .retry-text {
    color: #999999;
  }
}
</style>