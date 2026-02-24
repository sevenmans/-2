<template>
  <view class="container">
    <view class="header">
      <text class="title">认证测试页面</text>
    </view>
    
    <view class="status-section">
      <text class="section-title">当前状态</text>
      <view class="status-item">
        <text>Token: {{ currentToken || '未设置' }}</text>
      </view>
      <view class="status-item">
        <text>用户信息: {{ currentUserInfo ? JSON.stringify(currentUserInfo) : '未设置' }}</text>
      </view>
      <view class="status-item">
        <text>登录状态: {{ isLoggedIn ? '已登录' : '未登录' }}</text>
      </view>
    </view>
    
    <view class="action-section">
      <text class="section-title">测试操作</text>
      
      <button class="action-btn" @click="setTestAuth">设置测试认证信息</button>
      <button class="action-btn" @click="clearAuth">清除认证信息</button>
      <button class="action-btn" @click="refreshStatus">刷新状态</button>
      
      <view class="divider"></view>
      
      <button class="action-btn" @click="testNavigateToProfile">测试跳转到个人中心</button>
      <button class="action-btn" @click="testNavigateToBooking">测试跳转到预约页面</button>
      <button class="action-btn" @click="testNavigateToVenueList">测试跳转到场馆列表</button>
    </view>
  </view>
</template>

<script>
import { getToken, getUserInfo, setToken, setUserInfo, clearAuth, isLoggedIn } from '@/utils/auth.js'

export default {
  data() {
    return {
      currentToken: '',
      currentUserInfo: null,
      isLoggedIn: false
    }
  },
  
  onLoad() {
    this.refreshStatus()
  },
  
  onShow() {
    this.refreshStatus()
  },
  
  methods: {
    // 刷新状态
    refreshStatus() {
      this.currentToken = getToken()
      this.currentUserInfo = getUserInfo()
      this.isLoggedIn = isLoggedIn()
    },
    
    // 设置测试认证信息
    setTestAuth() {
      // 使用真实的token和用户信息
      const realToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMzgwMDAwMDAwMSIsImlhdCI6MTc1MjQwMTgyMSwiZXhwIjoxNzUyNDg4MjIxfQ.vFAd19NFzyYyxS2cRXy3dCq_Va_dguz01QSX2lwN_c0'
      const realUserInfo = {
        id: 33,
        username: '13800000001',
        phone: '13800000001',
        nickname: '测试用户2',
        avatar: '/static/images/default-avatar.svg'
      }

      setToken(realToken)
      setUserInfo(realUserInfo)

      uni.showToast({
        title: '真实认证信息已设置',
        icon: 'success'
      })

      this.refreshStatus()
    },
    
    // 清除认证信息
    clearAuth() {
      clearAuth()
      
      uni.showToast({
        title: '认证信息已清除',
        icon: 'success'
      })
      
      this.refreshStatus()
    },
    
    // 测试跳转到个人中心（需要登录）
    testNavigateToProfile() {
      uni.navigateTo({
        url: '/pages/user/profile'
      })
    },
    
    // 测试跳转到预约页面（需要登录）
    testNavigateToBooking() {
      uni.navigateTo({
        url: '/pages/booking/create'
      })
    },
    
    // 测试跳转到场馆列表（不需要登录）
    testNavigateToVenueList() {
      uni.navigateTo({
        url: '/pages/venue/list'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.status-section, .action-section {
  background-color: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.status-item {
  padding: 15rpx 0;
  border-bottom: 1rpx solid #eee;
  
  &:last-child {
    border-bottom: none;
  }
  
  text {
    font-size: 28rpx;
    color: #666;
    word-break: break-all;
  }
}

.action-btn {
  width: 100%;
  height: 80rpx;
  background-color: #007aff;
  color: white;
  border: none;
  border-radius: 12rpx;
  font-size: 30rpx;
  margin-bottom: 20rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &:active {
    background-color: #0056cc;
  }
}

.divider {
  height: 1rpx;
  background-color: #eee;
  margin: 30rpx 0;
}
</style>