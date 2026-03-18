<template>
  <view class="venue-card" @click="handleCardClick">
    <!-- 场馆图片 -->
    <view class="venue-image-container">
      <image 
        :src="venue.image || '/static/images/default-venue.png'" 
        class="venue-image"
        mode="aspectFill"
        @error="handleImageError"
      />
      
      <!-- 状态标签 -->
      <view class="status-badge" :class="`status-${venue.status.toLowerCase()}`">
        <text class="status-text">{{ getStatusText(venue.status) }}</text>
      </view>
      
      <!-- 收藏按钮 -->
      <view class="favorite-btn" @click.stop="toggleFavorite">
        <text class="favorite-icon" :class="{ active: venue.isFavorite }">♥</text>
      </view>
      
      <!-- 图片指示器 -->
      <view class="image-indicator" v-if="venue.images && venue.images.length > 1">
        <text class="indicator-text">1/{{ venue.images.length }}</text>
      </view>
    </view>
    
    <!-- 场馆信息 -->
    <view class="venue-info">
      <!-- 基本信息 -->
      <view class="basic-info">
        <text class="venue-name">{{ venue.name }}</text>
      </view>
      
      <!-- 位置信息 -->
      <view class="location-info">
        <text class="location-icon">📍</text>
        <text class="location-text">{{ venue.location }}</text>
        <text class="distance" v-if="venue.distance">{{ formatDistance(venue.distance) }}</text>
      </view>
      
      <!-- 场馆类型和标签 -->
      <view class="type-tags">
        <view class="venue-type">
          <text class="type-text">{{ venue.type }}</text>
        </view>
        <view class="tags" v-if="venue.tags && venue.tags.length > 0">
          <text 
            class="tag"
            v-for="tag in venue.tags.slice(0, 3)"
            :key="tag"
          >
            {{ tag }}
          </text>
        </view>
      </view>
      
      <!-- 价格和营业时间 -->
      <view class="price-time">
        <view class="price-info">
          <text class="price-label">¥</text>
          <text class="price-value">{{ venue.price }}</text>
          <text class="price-unit">/小时</text>
        </view>
        <view class="time-info">
          <text class="time-text">{{ venue.openTime }}-{{ venue.closeTime }}</text>
        </view>
      </view>
      
      <!-- 特色服务 -->
      <view class="features" v-if="venue.features && venue.features.length > 0">
        <view 
          class="feature-item"
          v-for="feature in venue.features.slice(0, 4)"
          :key="feature"
        >
          <text class="feature-icon">{{ getFeatureIcon(feature) }}</text>
          <text class="feature-text">{{ feature }}</text>
        </view>
      </view>
      
      <!-- 预约状态 -->
      <view class="booking-status" v-if="showBookingStatus">
        <view class="available-slots" v-if="venue.availableSlots > 0">
          <text class="available-text">今日还有{{ venue.availableSlots }}个时段可预约</text>
        </view>
        <view class="no-slots" v-else>
          <text class="no-slots-text">今日已约满</text>
        </view>
      </view>
    </view>
    
    <!-- 快速操作 -->
    <view class="quick-actions" v-if="showQuickActions">
      <button class="action-btn call-btn" @click.stop="handleCall">
        <text class="btn-icon">📞</text>
        <text class="btn-text">电话</text>
      </button>
      <button class="action-btn navigate-btn" @click.stop="handleNavigate">
        <text class="btn-icon">🧭</text>
        <text class="btn-text">导航</text>
      </button>
      <button class="action-btn book-btn" @click.stop="handleQuickBook">
        <text class="btn-icon">📅</text>
        <text class="btn-text">预约</text>
      </button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'VenueCard',
  
  props: {
    // 场馆数据
    venue: {
      type: Object,
      required: true
    },
    
    // 卡片模式：grid(网格) | list(列表) | detail(详情)
    mode: {
      type: String,
      default: 'list'
    },
    
    // 是否显示预约状态
    showBookingStatus: {
      type: Boolean,
      default: true
    },
    
    // 是否显示快速操作
    showQuickActions: {
      type: Boolean,
      default: false
    },
    
    // 是否显示距离
    showDistance: {
      type: Boolean,
      default: true
    }
  },
  
  methods: {
    // 卡片点击
    handleCardClick() {
      this.$emit('click', this.venue)
    },
    
    // 切换收藏
    toggleFavorite() {
      this.$emit('favorite', {
        venue: this.venue,
        isFavorite: !this.venue.isFavorite
      })
    },
    
    // 图片加载错误
    handleImageError() {
      console.log('场馆图片加载失败')
    },
    
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        'OPEN': '营业中',
        'CLOSED': '已关闭',
        'MAINTENANCE': '维护中',
        'FULL': '已约满'
      }
      return statusMap[status] || status
    },
    
    // 格式化距离
    formatDistance(distance) {
      if (distance < 1000) {
        return `${Math.round(distance)}m`
      } else {
        return `${(distance / 1000).toFixed(1)}km`
      }
    },
    
    // 获取特色服务图标
    getFeatureIcon(feature) {
      const iconMap = {
        '免费WiFi': '📶',
        '停车场': '🅿️',
        '淋浴间': '🚿',
        '更衣室': '👕',
        '空调': '❄️',
        '器材租赁': '🏓',
        '教练服务': '👨‍🏫',
        '饮水机': '💧'
      }
      return iconMap[feature] || '✨'
    },
    
    // 拨打电话
    handleCall() {
      if (this.venue.phone) {
        uni.makePhoneCall({
          phoneNumber: this.venue.phone
        })
      } else {
        uni.showToast({
          title: '暂无联系电话',
          icon: 'none'
        })
      }
    },
    
    // 导航
    handleNavigate() {
      if (this.venue.latitude && this.venue.longitude) {
        uni.openLocation({
          latitude: this.venue.latitude,
          longitude: this.venue.longitude,
          name: this.venue.name,
          address: this.venue.location
        })
      } else {
        uni.showToast({
          title: '暂无位置信息',
          icon: 'none'
        })
      }
    },
    
    // 快速预约
    handleQuickBook() {
      this.$emit('quick-book', this.venue)
    }
  }
}
</script>

<style lang="scss" scoped>
.venue-card {
  background-color: #ffffff;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.1);
  margin-bottom: 20rpx;
}

// 场馆图片
.venue-image-container {
  position: relative;
  height: 300rpx;
  
  .venue-image {
    width: 100%;
    height: 100%;
  }
  
  .status-badge {
    position: absolute;
    top: 16rpx;
    left: 16rpx;
    padding: 6rpx 12rpx;
    border-radius: 16rpx;
    
    .status-text {
      font-size: 20rpx;
      font-weight: 600;
    }
    
    &.status-open {
      background-color: rgba(82, 196, 26, 0.9);
      
      .status-text {
        color: #ffffff;
      }
    }
    
    &.status-closed {
      background-color: rgba(255, 77, 79, 0.9);
      
      .status-text {
        color: #ffffff;
      }
    }
    
    &.status-maintenance {
      background-color: rgba(250, 173, 20, 0.9);
      
      .status-text {
        color: #ffffff;
      }
    }
    
    &.status-full {
      background-color: rgba(153, 153, 153, 0.9);
      
      .status-text {
        color: #ffffff;
      }
    }
  }
  
  .favorite-btn {
    position: absolute;
    top: 16rpx;
    right: 16rpx;
    width: 56rpx;
    height: 56rpx;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 28rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .favorite-icon {
      font-size: 28rpx;
      color: #cccccc;
      transition: all 0.3s;
      
      &.active {
        color: #ff4d4f;
      }
    }
  }
  
  .image-indicator {
    position: absolute;
    bottom: 16rpx;
    right: 16rpx;
    padding: 4rpx 8rpx;
    background-color: rgba(0, 0, 0, 0.6);
    border-radius: 12rpx;
    
    .indicator-text {
      font-size: 20rpx;
      color: #ffffff;
    }
  }
}

// 场馆信息
.venue-info {
  padding: 24rpx;
  
  .basic-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16rpx;
    
    .venue-name {
      flex: 1;
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
      margin-right: 20rpx;
    }
  }
  
  .location-info {
    display: flex;
    align-items: center;
    margin-bottom: 16rpx;
    
    .location-icon {
      font-size: 24rpx;
      margin-right: 8rpx;
    }
    
    .location-text {
      flex: 1;
      font-size: 24rpx;
      color: #666666;
    }
    
    .distance {
      font-size: 24rpx;
      color: #999999;
    }
  }
  
  .type-tags {
    display: flex;
    align-items: center;
    margin-bottom: 16rpx;
    
    .venue-type {
      margin-right: 16rpx;
      
      .type-text {
        padding: 4rpx 12rpx;
        background-color: #f0f0f0;
        color: #666666;
        font-size: 20rpx;
        border-radius: 12rpx;
      }
    }
    
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8rpx;
      
      .tag {
        padding: 4rpx 8rpx;
        background-color: #fff7e6;
        color: #fa8c16;
        font-size: 20rpx;
        border-radius: 8rpx;
      }
    }
  }
  
  .price-time {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
    
    .price-info {
      display: flex;
      align-items: baseline;
      
      .price-label {
        font-size: 24rpx;
        color: #ff6b35;
        font-weight: 600;
      }
      
      .price-value {
        font-size: 36rpx;
        color: #ff6b35;
        font-weight: 600;
        margin: 0 4rpx;
      }
      
      .price-unit {
        font-size: 24rpx;
        color: #999999;
      }
    }
    
    .time-info {
      .time-text {
        font-size: 24rpx;
        color: #666666;
      }
    }
  }
  
  .features {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    margin-bottom: 16rpx;
    
    .feature-item {
      display: flex;
      align-items: center;
      
      .feature-icon {
        font-size: 20rpx;
        margin-right: 4rpx;
      }
      
      .feature-text {
        font-size: 20rpx;
        color: #666666;
      }
    }
  }
  
  .booking-status {
    .available-slots {
      .available-text {
        font-size: 24rpx;
        color: #52c41a;
      }
    }
    
    .no-slots {
      .no-slots-text {
        font-size: 24rpx;
        color: #ff4d4f;
      }
    }
  }
}

// 快速操作
.quick-actions {
  display: flex;
  border-top: 1rpx solid #f0f0f0;
  
  .action-btn {
    flex: 1;
    height: 80rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: none;
    background-color: #ffffff;
    
    &:not(:last-child) {
      border-right: 1rpx solid #f0f0f0;
    }
    
    .btn-icon {
      font-size: 28rpx;
      margin-bottom: 4rpx;
    }
    
    .btn-text {
      font-size: 20rpx;
      color: #666666;
    }
    
    &.call-btn {
      .btn-icon {
        color: #52c41a;
      }
    }
    
    &.navigate-btn {
      .btn-icon {
        color: #1890ff;
      }
    }
    
    &.book-btn {
      .btn-icon {
        color: #ff6b35;
      }
    }
  }
}

// 网格模式样式
.venue-card.grid-mode {
  .venue-image-container {
    height: 200rpx;
  }
  
  .venue-info {
    padding: 16rpx;
    
    .basic-info {
      margin-bottom: 12rpx;
      
      .venue-name {
        font-size: 28rpx;
      }
    }
    
    .location-info,
    .type-tags,
    .price-time {
      margin-bottom: 12rpx;
    }
    
    .features {
      display: none;
    }
  }
}
</style>