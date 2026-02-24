<template>
  <view class="container">
    <view class="header">
      <text class="title">API调试页面</text>
    </view>

    <view class="section">
      <text class="section-title">认证状态</text>
      <view class="info-item">
        <text>Token: {{ currentToken || '未设置' }}</text>
      </view>
      <view class="info-item">
        <text>用户信息: {{ currentUserInfo ? JSON.stringify(currentUserInfo) : '未设置' }}</text>
      </view>
      <view class="info-item">
        <text>登录状态: {{ isLoggedIn ? '已登录' : '未登录' }}</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">API测试</text>
      <button class="test-btn" @click="testUserBookingsAPI">测试用户预约API</button>
      <button class="test-btn" @click="testUserInfoAPI">测试用户信息API</button>
      <button class="test-btn" @click="setTestAuth">设置测试认证</button>
      <button class="test-btn" @click="clearAuth">清除认证</button>
    </view>

    <view class="section">
      <text class="section-title">API响应</text>
      <view class="response-box">
        <text>{{ apiResponse }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getToken, getUserInfo, setToken, setUserInfo, clearAuth } from '@/utils/auth.js'
import { get } from '@/utils/request.js'

export default {
  data() {
    return {
      currentToken: '',
      currentUserInfo: null,
      isLoggedIn: false,
      apiResponse: '暂无响应'
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
      this.isLoggedIn = !!(this.currentToken && this.currentUserInfo)
      console.log('[API调试] 当前状态:', {
        token: this.currentToken,
        userInfo: this.currentUserInfo,
        isLoggedIn: this.isLoggedIn
      })
    },

    // 测试用户预约API
    async testUserBookingsAPI() {
      try {
        console.log('[API调试] 开始测试用户预约API')
        this.apiResponse = '正在请求...'
        
        const response = await get('/users/me/bookings', {
          status: 'pending',
          page: 1,
          pageSize: 1
        })
        
        console.log('[API调试] 用户预约API响应:', response)
        this.apiResponse = JSON.stringify(response, null, 2)
        
        uni.showToast({
          title: 'API调用成功',
          icon: 'success'
        })
      } catch (error) {
        console.error('[API调试] 用户预约API失败:', error)
        this.apiResponse = `错误: ${error.message}\n\n详细信息: ${JSON.stringify(error, null, 2)}`
        
        uni.showToast({
          title: 'API调用失败',
          icon: 'error'
        })
      }
    },

    // 测试用户信息API
    async testUserInfoAPI() {
      try {
        console.log('[API调试] 开始测试用户信息API')
        this.apiResponse = '正在请求...'
        
        const response = await get('/users/me')
        
        console.log('[API调试] 用户信息API响应:', response)
        this.apiResponse = JSON.stringify(response, null, 2)
        
        uni.showToast({
          title: 'API调用成功',
          icon: 'success'
        })
      } catch (error) {
        console.error('[API调试] 用户信息API失败:', error)
        this.apiResponse = `错误: ${error.message}\n\n详细信息: ${JSON.stringify(error, null, 2)}`
        
        uni.showToast({
          title: 'API调用失败',
          icon: 'error'
        })
      }
    },

    // 设置测试认证
    setTestAuth() {
      const testToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMzgwMDAwMDAwMSIsImlhdCI6MTc1MjQwMTgyMSwiZXhwIjoxNzUyNDg4MjIxfQ.vFAd19NFzyYyxS2cRXy3dCq_Va_dguz01QSX2lwN_c0'
      const testUserInfo = {
        id: 33,
        username: '13800000001',
        phone: '13800000001',
        nickname: '测试用户2'
      }
      
      setToken(testToken)
      setUserInfo(testUserInfo)
      
      this.refreshStatus()
      
      uni.showToast({
        title: '测试认证已设置',
        icon: 'success'
      })
    },

    // 清除认证
    clearAuth() {
      clearAuth()
      this.refreshStatus()
      
      uni.showToast({
        title: '认证已清除',
        icon: 'success'
      })
    }
  }
}
</script>

<style scoped>
.container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.section {
  background-color: white;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
  display: block;
}

.info-item {
  margin-bottom: 10px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 5px;
}

.test-btn {
  background-color: #007aff;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  margin: 5px;
  font-size: 16px;
}

.test-btn:active {
  background-color: #0056b3;
}

.response-box {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  padding: 15px;
  min-height: 100px;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>