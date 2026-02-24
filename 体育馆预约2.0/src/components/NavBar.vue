<template>
  <view class="nav-bar" :style="navBarStyle">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    
    <!-- 导航栏内容 -->
    <view class="nav-content" :style="{ height: navBarHeight + 'px' }">
      <!-- 左侧区域 -->
      <view class="nav-left" @click="handleLeftClick">
        <slot name="left">
          <view class="back-btn" v-if="showBack">
            <text class="back-icon">‹</text>
            <text class="back-text" v-if="backText">{{ backText }}</text>
          </view>
        </slot>
      </view>
      
      <!-- 中间标题区域 -->
      <view class="nav-center">
        <slot name="center">
          <text class="nav-title" :style="titleStyle">{{ title }}</text>
        </slot>
      </view>
      
      <!-- 右侧区域 -->
      <view class="nav-right" @click="handleRightClick">
        <slot name="right">
          <text class="nav-right-text" v-if="rightText">{{ rightText }}</text>
        </slot>
      </view>
    </view>
    
    <!-- 底部分割线 -->
    <view class="nav-border" v-if="showBorder"></view>
  </view>
</template>

<script>
export default {
  name: 'NavBar',
  
  props: {
    // 标题
    title: {
      type: String,
      default: ''
    },
    
    // 标题颜色
    titleColor: {
      type: String,
      default: '#333333'
    },
    
    // 背景色
    backgroundColor: {
      type: String,
      default: '#ffffff'
    },
    
    // 是否显示返回按钮
    showBack: {
      type: Boolean,
      default: true
    },
    
    // 返回按钮文字
    backText: {
      type: String,
      default: ''
    },
    
    // 右侧文字
    rightText: {
      type: String,
      default: ''
    },
    
    // 是否显示底部边框
    showBorder: {
      type: Boolean,
      default: true
    },
    
    // 是否固定定位
    fixed: {
      type: Boolean,
      default: true
    },
    
    // 层级
    zIndex: {
      type: Number,
      default: 999
    },
    
    // 是否沉浸式
    immersive: {
      type: Boolean,
      default: true
    },
    
    // 自定义样式
    customStyle: {
      type: Object,
      default: () => ({})
    }
  },
  
  data() {
    return {
      statusBarHeight: 0,
      navBarHeight: 44
    }
  },
  
  computed: {
    // 导航栏样式
    navBarStyle() {
      const style = {
        backgroundColor: this.backgroundColor,
        zIndex: this.zIndex,
        ...this.customStyle
      }
      
      if (this.fixed) {
        style.position = 'fixed'
        style.top = '0'
        style.left = '0'
        style.right = '0'
      }
      
      return style
    },
    
    // 标题样式
    titleStyle() {
      return {
        color: this.titleColor
      }
    },
    
    // 总高度
    totalHeight() {
      return this.statusBarHeight + this.navBarHeight
    }
  },
  
  mounted() {
    this.getSystemInfo()
  },
  
  methods: {
    // 获取系统信息
    getSystemInfo() {
      const systemInfo = uni.getSystemInfoSync()
      
      // 状态栏高度
      this.statusBarHeight = systemInfo.statusBarHeight || 0
      
      // 导航栏高度适配
      if (systemInfo.platform === 'ios') {
        this.navBarHeight = 44
      } else {
        this.navBarHeight = 48
      }
      
      // 如果不是沉浸式，状态栏高度为0
      if (!this.immersive) {
        this.statusBarHeight = 0
      }
    },
    
    // 左侧点击事件
    handleLeftClick() {
      this.$emit('left-click')
      
      // 如果显示返回按钮且没有监听left-click事件，默认执行返回
      if (this.showBack && !this.$listeners['left-click']) {
        this.goBack()
      }
    },
    
    // 右侧点击事件
    handleRightClick() {
      this.$emit('right-click')
    },
    
    // 返回上一页
    goBack() {
      const pages = getCurrentPages()
      
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        // 如果是第一个页面，跳转到首页
        uni.reLaunch({
          url: '/pages/index/index'
        })
      }
    },
    
    // 获取导航栏高度（供外部调用）
    getNavBarHeight() {
      return this.totalHeight
    }
  }
}
</script>

<style lang="scss" scoped>
.nav-bar {
  width: 100%;
  background-color: #ffffff;
}

.status-bar {
  width: 100%;
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30rpx;
  position: relative;
}

.nav-left {
  display: flex;
  align-items: center;
  min-width: 120rpx;
  
  .back-btn {
    display: flex;
    align-items: center;
    padding: 8rpx 0;
    
    .back-icon {
      font-size: 36rpx;
      font-weight: 600;
      color: #333333;
      margin-right: 8rpx;
      line-height: 1;
    }
    
    .back-text {
      font-size: 28rpx;
      color: #333333;
    }
  }
}

.nav-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 20rpx;
  
  .nav-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.nav-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 120rpx;
  
  .nav-right-text {
    font-size: 28rpx;
    color: #333333;
  }
}

.nav-border {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1rpx;
  background-color: #f0f0f0;
}

// 深色主题适配
@media (prefers-color-scheme: dark) {
  .nav-bar {
    background-color: #1f1f1f;
  }
  
  .nav-title,
  .back-icon,
  .back-text,
  .nav-right-text {
    color: #ffffff;
  }
  
  .nav-border {
    background-color: #333333;
  }
}

// 不同主题色适配
.nav-bar.theme-primary {
  background-color: #ff6b35;
  
  .nav-title,
  .back-icon,
  .back-text,
  .nav-right-text {
    color: #ffffff;
  }
}

.nav-bar.theme-transparent {
  background-color: transparent;
  
  .nav-border {
    display: none;
  }
}

.nav-bar.theme-gradient {
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  
  .nav-title,
  .back-icon,
  .back-text,
  .nav-right-text {
    color: #ffffff;
  }
}
</style>