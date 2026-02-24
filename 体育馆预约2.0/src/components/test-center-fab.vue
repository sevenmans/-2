<template>
  <view class="fab-container" v-if="showFab">
    <!-- 主按钮 -->
    <view class="fab-main" @click="toggleMenu" :class="{ active: menuOpen }">
      <text class="fab-icon">{{ menuOpen ? '✕' : '🧪' }}</text>
    </view>
    
    <!-- 子菜单 -->
    <view class="fab-menu" v-if="menuOpen">
      <view class="fab-item" @click="navigateToTool('comprehensive-migration-check')">
        <text class="fab-item-icon">🔍</text>
        <text class="fab-item-text">全面检查</text>
      </view>
      
      <view class="fab-item" @click="navigateToTool('quick-fix-validation')">
        <text class="fab-item-icon">🔧</text>
        <text class="fab-item-text">快速验证</text>
      </view>
      
      <view class="fab-item" @click="navigateToTool('api-diagnosis')">
        <text class="fab-item-icon">🌐</text>
        <text class="fab-item-text">API诊断</text>
      </view>
      
      <view class="fab-item" @click="navigateToTool('index')">
        <text class="fab-item-icon">🏠</text>
        <text class="fab-item-text">测试中心</text>
      </view>
    </view>
    
    <!-- 遮罩层 -->
    <view class="fab-overlay" v-if="menuOpen" @click="closeMenu"></view>
  </view>
</template>

<script>
export default {
  name: 'TestCenterFab',
  props: {
    show: {
      type: Boolean,
      default: true
    }
  },
  
  data() {
    return {
      menuOpen: false
    }
  },
  
  computed: {
    showFab() {
      // 只在开发环境或特定条件下显示
      return this.show && (process.env.NODE_ENV === 'development' || this.isDeveloper)
    },
    
    isDeveloper() {
      // 可以根据用户信息判断是否为开发者
      return true // 暂时总是显示
    }
  },
  
  methods: {
    toggleMenu() {
      this.menuOpen = !this.menuOpen
    },
    
    closeMenu() {
      this.menuOpen = false
    },
    
    navigateToTool(toolName) {
      this.closeMenu()
      
      console.log(`导航到测试工具: ${toolName}`)
      uni.navigateTo({
        url: `/pages/test/${toolName}`,
        fail: (error) => {
          console.error('导航失败:', error)
          uni.showToast({
            title: '页面不存在',
            icon: 'none'
          })
        }
      })
    }
  }
}
</script>

<style scoped>
.fab-container {
  position: fixed;
  right: 40rpx;
  bottom: 120rpx;
  z-index: 1000;
}

.fab-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 998;
}

.fab-main {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 25rpx rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  z-index: 999;
  position: relative;
}

.fab-main.active {
  transform: rotate(45deg);
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  box-shadow: 0 8rpx 25rpx rgba(255, 107, 107, 0.4);
}

.fab-icon {
  font-size: 40rpx;
  color: white;
  font-weight: bold;
}

.fab-menu {
  position: absolute;
  bottom: 140rpx;
  right: 0;
  z-index: 999;
}

.fab-item {
  width: 200rpx;
  height: 80rpx;
  background: white;
  border-radius: 40rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  padding: 0 30rpx;
  box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.1);
  animation: fabItemSlideIn 0.3s ease forwards;
  opacity: 0;
  transform: translateX(100rpx);
}

.fab-item:nth-child(1) { animation-delay: 0.1s; }
.fab-item:nth-child(2) { animation-delay: 0.2s; }
.fab-item:nth-child(3) { animation-delay: 0.3s; }
.fab-item:nth-child(4) { animation-delay: 0.4s; }

@keyframes fabItemSlideIn {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.fab-item-icon {
  font-size: 28rpx;
  margin-right: 15rpx;
}

.fab-item-text {
  font-size: 24rpx;
  color: #333;
  font-weight: 500;
}

.fab-item:active {
  transform: scale(0.95);
  background: #f5f5f5;
}

/* 响应式设计 */
@media screen and (max-width: 750rpx) {
  .fab-container {
    right: 30rpx;
    bottom: 100rpx;
  }
  
  .fab-main {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50rpx;
  }
  
  .fab-icon {
    font-size: 32rpx;
  }
  
  .fab-item {
    width: 180rpx;
    height: 70rpx;
    padding: 0 25rpx;
  }
  
  .fab-item-icon {
    font-size: 24rpx;
  }
  
  .fab-item-text {
    font-size: 22rpx;
  }
}
</style>
