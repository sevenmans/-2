<template>
  <view class="test-page">
    <view class="header">
      <text class="title">API测试页面</text>
    </view>
    
    <view class="section">
      <text class="section-title">认证状态</text>
      <view class="info-item">
        <text>Token: {{ token ? '已设置' : '未设置' }}</text>
      </view>
      <view class="info-item">
        <text>用户信息: {{ userInfo ? userInfo.username : '未登录' }}</text>
      </view>
    </view>
    
    <view class="section">
      <text class="section-title">测试操作</text>
      <button @click="testLogin" class="test-btn">测试登录</button>
      <button @click="testUserBookings" class="test-btn">测试获取预约列表</button>
      <button @click="clearAuth" class="test-btn danger">清除认证</button>
    </view>
    
    <view class="section">
      <text class="section-title">API响应</text>
      <view class="response-box">
        <text>{{ apiResponse }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useBookingStore } from '@/stores/booking'

const userStore = useUserStore()
const bookingStore = useBookingStore()

const token = ref('')
const userInfo = ref(null)
const apiResponse = ref('等待测试...')

// 测试登录
const testLogin = async () => {
  try {
    apiResponse.value = '正在登录...'
    const result = await userStore.login({
      username: 'testuser',
      password: '123456'
    })
    
    if (result.success) {
      apiResponse.value = `登录成功！Token: ${result.data.accessToken.substring(0, 20)}...`
      token.value = result.data.accessToken
      userInfo.value = result.data
    } else {
      apiResponse.value = `登录失败: ${result.message}`
    }
  } catch (error) {
    apiResponse.value = `登录错误: ${error.message}`
  }
}

// 测试获取预约列表
const testUserBookings = async () => {
  try {
    apiResponse.value = '正在获取预约列表...'
    const result = await bookingStore.getUserBookings({
      status: 'pending',
      page: 1,
      pageSize: 5
    })
    
    if (result.success) {
      apiResponse.value = `获取成功！共 ${result.data.total} 条预约记录`
    } else {
      apiResponse.value = `获取失败: ${result.message}`
    }
  } catch (error) {
    apiResponse.value = `获取错误: ${error.message}`
  }
}

// 清除认证
const clearAuth = () => {
  userStore.logout()
  token.value = ''
  userInfo.value = null
  apiResponse.value = '认证已清除'
}

// 页面加载时检查状态
onMounted(() => {
  token.value = userStore.token || ''
  userInfo.value = userStore.userInfo
})
</script>

<style scoped>
.test-page {
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

.section {
  background-color: white;
  margin-bottom: 30rpx;
  padding: 30rpx;
  border-radius: 10rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.info-item {
  margin-bottom: 15rpx;
  padding: 10rpx;
  background-color: #f8f9fa;
  border-radius: 5rpx;
}

.test-btn {
  width: 100%;
  margin-bottom: 20rpx;
  padding: 25rpx;
  background-color: #007aff;
  color: white;
  border: none;
  border-radius: 10rpx;
  font-size: 28rpx;
}

.test-btn.danger {
  background-color: #ff3b30;
}

.response-box {
  background-color: #f8f9fa;
  padding: 20rpx;
  border-radius: 10rpx;
  min-height: 100rpx;
  border: 1rpx solid #e9ecef;
  word-wrap: break-word;
}
</style>