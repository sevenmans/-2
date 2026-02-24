<template>
  <view class="tab-bar" :class="{ 'safe-area': safeArea }">
    <view 
      class="tab-item"
      :class="{ 'active': currentTab === item.key }"
      v-for="(item, index) in tabList"
      :key="item.key"
      @click="switchTab(item, index)"
    >
      <!-- 图标容器 -->
      <view class="tab-icon-container">
        <!-- 普通图标 -->
        <image 
          class="tab-icon"
          :src="currentTab === item.key ? item.selectedIconPath : item.iconPath"
          mode="aspectFit"
          v-if="!item.isCustom"
        />
        
        <!-- 自定义图标（如发布按钮） -->
        <view class="custom-icon" v-if="item.isCustom">
          <view class="custom-icon-bg">
            <image 
              class="custom-icon-image"
              :src="item.iconPath"
              mode="aspectFit"
            />
          </view>
        </view>
        
        <!-- 红点提示 -->
        <view class="red-dot" v-if="item.badge && item.badge.dot"></view>
        
        <!-- 数字徽章 -->
        <view class="badge" v-if="item.badge && item.badge.count > 0">
          <text class="badge-text">{{ formatBadgeCount(item.badge.count) }}</text>
        </view>
      </view>
      
      <!-- 标签文本 -->
      <text class="tab-text" v-if="!item.isCustom">{{ item.text }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'TabBar',
  
  props: {
    // 当前选中的标签
    current: {
      type: [String, Number],
      default: 0
    },
    
    // 标签列表
    list: {
      type: Array,
      default: () => [
        {
          key: 'home',
          text: '首页',
          iconPath: '/static/tabbar/home.png',
          selectedIconPath: '/static/tabbar/home-active.png',
          pagePath: '/pages/index/index'
        },
        {
          key: 'venue',
          text: '场馆',
          iconPath: '/static/tabbar/venue.png',
          selectedIconPath: '/static/tabbar/venue-active.png',
          pagePath: '/pages/venue/list'
        },
        {
          key: 'publish',
          text: '发布',
          iconPath: '/static/tabbar/publish.png',
          selectedIconPath: '/static/tabbar/publish.png',
          pagePath: '/pages/sharing/create',
          isCustom: true
        },
        {
          key: 'booking',
          text: '预约',
          iconPath: '/static/tabbar/booking.png',
          selectedIconPath: '/static/tabbar/booking-active.png',
          pagePath: '/pages/booking/list'
        },
        {
          key: 'user',
          text: '我的',
          iconPath: '/static/tabbar/user.png',
          selectedIconPath: '/static/tabbar/user-active.png',
          pagePath: '/pages/user/index'
        }
      ]
    },
    
    // 徽章配置
    badge: {
      type: Object,
      default: () => ({})
    },
    
    // 是否适配安全区域
    safeArea: {
      type: Boolean,
      default: true
    },
    
    // 背景色
    backgroundColor: {
      type: String,
      default: '#ffffff'
    },
    
    // 选中颜色
    activeColor: {
      type: String,
      default: '#ff6b35'
    },
    
    // 未选中颜色
    inactiveColor: {
      type: String,
      default: '#999999'
    },
    
    // 是否显示边框
    border: {
      type: Boolean,
      default: true
    },
    
    // 动画效果
    animation: {
      type: Boolean,
      default: true
    }
  },
  
  data() {
    return {
      currentTab: this.current
    }
  },
  
  computed: {
    // 处理后的标签列表
    tabList() {
      return this.list.map(item => {
        const badge = this.badge[item.key] || {}
        return {
          ...item,
          badge
        }
      })
    },
    
    // 动态样式
    tabBarStyle() {
      return {
        backgroundColor: this.backgroundColor,
        borderTopColor: this.border ? '#e5e5e5' : 'transparent'
      }
    }
  },
  
  watch: {
    current(newVal) {
      this.currentTab = newVal
    }
  },
  
  methods: {
    // 切换标签
    switchTab(item, index) {
      if (this.currentTab === item.key) {
        // 如果点击的是当前标签，触发刷新事件
        this.$emit('refresh', item)
        return
      }
      
      this.currentTab = item.key
      
      // 触发切换事件
      this.$emit('change', {
        item,
        index,
        key: item.key
      })
      
      // 如果是自定义按钮（如发布），触发特殊事件
      if (item.isCustom) {
        this.$emit('custom-click', item)
        return
      }
      
      // 页面跳转
      if (item.pagePath) {
        this.navigateToPage(item.pagePath)
      }
    },
    
    // 页面跳转
    navigateToPage(pagePath) {
      // 获取当前页面路径
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      const currentPath = '/' + currentPage.route
      
      // 如果是当前页面，不进行跳转
      if (currentPath === pagePath) {
        return
      }
      
      // 使用 switchTab 进行跳转（TabBar组件只处理tabbar页面）
      uni.switchTab({
        url: pagePath,
        fail: (err) => {
          console.error('TabBar 跳转失败:', err)
        }
      })
    },
    
    // 格式化徽章数量
    formatBadgeCount(count) {
      if (count > 99) {
        return '99+'
      }
      return count.toString()
    },
    
    // 设置徽章
    setBadge(key, badge) {
      this.$emit('badge-change', { key, badge })
    },
    
    // 清除徽章
    clearBadge(key) {
      this.$emit('badge-clear', key)
    },
    
    // 获取当前选中的标签
    getCurrentTab() {
      return this.tabList.find(item => item.key === this.currentTab)
    }
  }
}
</script>

<style lang="scss" scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background-color: #ffffff;
  border-top: 1rpx solid #e5e5e5;
  z-index: 1000;
  
  &.safe-area {
    padding-bottom: env(safe-area-inset-bottom);
  }
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10rpx 0 16rpx;
  position: relative;
  transition: all 0.3s ease;
  
  &:active {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  &.active {
    .tab-text {
      color: #ff6b35;
      font-weight: 600;
    }
  }
}

// 图标容器
.tab-icon-container {
  position: relative;
  margin-bottom: 8rpx;
  
  .tab-icon {
    width: 48rpx;
    height: 48rpx;
    transition: all 0.3s ease;
  }
  
  // 自定义图标
  .custom-icon {
    position: relative;
    
    .custom-icon-bg {
      width: 80rpx;
      height: 80rpx;
      background: linear-gradient(135deg, #ff6b35, #f7931e);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4rpx 12rpx rgba(255, 107, 53, 0.3);
      
      .custom-icon-image {
        width: 40rpx;
        height: 40rpx;
      }
    }
  }
  
  // 红点提示
  .red-dot {
    position: absolute;
    top: -4rpx;
    right: -4rpx;
    width: 16rpx;
    height: 16rpx;
    background-color: #ff4d4f;
    border-radius: 50%;
    border: 2rpx solid #ffffff;
  }
  
  // 数字徽章
  .badge {
    position: absolute;
    top: -8rpx;
    right: -8rpx;
    min-width: 32rpx;
    height: 32rpx;
    background-color: #ff4d4f;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2rpx solid #ffffff;
    
    .badge-text {
      font-size: 20rpx;
      color: #ffffff;
      font-weight: 600;
      padding: 0 8rpx;
      line-height: 1;
    }
  }
}

// 标签文本
.tab-text {
  font-size: 20rpx;
  color: #999999;
  transition: all 0.3s ease;
  line-height: 1;
}

// 动画效果
.tab-item.active {
  .tab-icon-container {
    .tab-icon {
      transform: scale(1.1);
    }
    
    .custom-icon {
      .custom-icon-bg {
        transform: scale(1.1);
      }
    }
  }
}

// 深色主题适配
@media (prefers-color-scheme: dark) {
  .tab-bar {
    background-color: #1f1f1f;
    border-top-color: #333333;
  }
  
  .tab-item {
    &:active {
      background-color: rgba(255, 255, 255, 0.1);
    }
    
    &.active {
      .tab-text {
        color: #ff6b35;
      }
    }
  }
  
  .tab-text {
    color: #cccccc;
  }
}

// 不同屏幕尺寸适配
@media screen and (max-width: 375px) {
  .tab-item {
    padding: 8rpx 0 12rpx;
    
    .tab-icon-container {
      margin-bottom: 6rpx;
      
      .tab-icon {
        width: 44rpx;
        height: 44rpx;
      }
      
      .custom-icon {
        .custom-icon-bg {
          width: 72rpx;
          height: 72rpx;
          
          .custom-icon-image {
            width: 36rpx;
            height: 36rpx;
          }
        }
      }
    }
    
    .tab-text {
      font-size: 18rpx;
    }
  }
}

@media screen and (min-width: 414px) {
  .tab-item {
    padding: 12rpx 0 20rpx;
    
    .tab-icon-container {
      margin-bottom: 10rpx;
      
      .tab-icon {
        width: 52rpx;
        height: 52rpx;
      }
      
      .custom-icon {
        .custom-icon-bg {
          width: 88rpx;
          height: 88rpx;
          
          .custom-icon-image {
            width: 44rpx;
            height: 44rpx;
          }
        }
      }
    }
    
    .tab-text {
      font-size: 22rpx;
    }
  }
}

// 横屏适配
@media screen and (orientation: landscape) {
  .tab-bar {
    flex-direction: row;
    height: 100rpx;
    
    &.safe-area {
      padding-bottom: 0;
      padding-right: env(safe-area-inset-right);
      padding-left: env(safe-area-inset-left);
    }
  }
  
  .tab-item {
    flex-direction: row;
    padding: 0 20rpx;
    
    .tab-icon-container {
      margin-bottom: 0;
      margin-right: 12rpx;
      
      .tab-icon {
        width: 40rpx;
        height: 40rpx;
      }
      
      .custom-icon {
        .custom-icon-bg {
          width: 60rpx;
          height: 60rpx;
          
          .custom-icon-image {
            width: 30rpx;
            height: 30rpx;
          }
        }
      }
    }
    
    .tab-text {
      font-size: 24rpx;
    }
  }
}
</style>