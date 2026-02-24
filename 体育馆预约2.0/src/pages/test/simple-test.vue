<template>
  <view class="container">
    <view class="header">
      <text class="title">用户预约测试页面</text>
    </view>

    <view class="content">
      <view class="auth-section">
        <text class="section-title">认证状态</text>
        <text class="status">Token: {{ token ? '已设置' : '未设置' }}</text>
        <text class="status">用户: {{ userInfo ? userInfo.username : '未登录' }}</text>
        <button class="test-btn" @click="setAuth">设置测试认证</button>
      </view>

      <view class="api-section">
        <text class="section-title">API测试</text>
        <button class="test-btn" @click="testGetBookings">获取用户预约列表</button>
        <text class="status">状态: {{ apiStatus }}</text>
      </view>

      <view class="result-section">
        <text class="section-title">结果</text>
        <text class="result">{{ result }}</text>
      </view>

      <button class="test-btn" @click="goBack">
        返回首页
      </button>
    </view>
  </view>
</template>

<script>
import { getToken, getUserInfo, setToken, setUserInfo } from '@/utils/auth.js'
import * as userApi from '@/api/user.js'

export default {
  name: 'SimpleTest',

  data() {
    return {
      token: '',
      userInfo: null,
      apiStatus: '待测试',
      result: '暂无结果'
    }
  },

  onLoad() {
    this.refreshAuth()
  },

  methods: {
    refreshAuth() {
      this.token = getToken()
      this.userInfo = getUserInfo()
    },

    setAuth() {
      const realToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMzgwMDAwMDAwMSIsImlhdCI6MTc1MjQwMTgyMSwiZXhwIjoxNzUyNDg4MjIxfQ.vFAd19NFzyYyxS2cRXy3dCq_Va_dguz01QSX2lwN_c0'
      const realUserInfo = {
        id: 33,
        username: '13800000001',
        phone: '13800000001',
        nickname: '测试用户2'
      }

      setToken(realToken)
      setUserInfo(realUserInfo)
      this.refreshAuth()

      uni.showToast({
        title: '认证信息已设置',
        icon: 'success'
      })
    },

    async testGetBookings() {
      try {
        this.apiStatus = '请求中...'
        const response = await userApi.getUserBookings({ page: 1, pageSize: 10 })
        this.apiStatus = '请求成功'

        // 详细分析返回的数据
        let analysis = `总记录数: ${response.total}\n`
        analysis += `数据数组长度: ${response.data ? response.data.length : 0}\n\n`

        if (response.data && response.data.length > 0) {
          response.data.forEach((item, index) => {
            analysis += `=== 订单 ${index + 1} ===\n`
            analysis += `ID: ${item.id}\n`
            analysis += `订单号: ${item.orderNo}\n`
            analysis += `状态: ${item.status}\n`
            analysis += `类型: ${item.bookingType}\n`
            analysis += `场馆: ${item.venueName}\n`
            analysis += `价格: ${item.totalPrice}\n`
            analysis += `预约日期: ${item.bookingDate}\n`
            analysis += `开始时间: ${item.startTime}\n`
            analysis += `结束时间: ${item.endTime}\n`
            analysis += `创建时间: ${item.createdAt}\n\n`
          })
        } else {
          analysis += '没有找到任何订单数据\n'
        }

        this.result = analysis

        uni.showToast({
          title: `获取到${response.total}条记录`,
          icon: 'success'
        })
      } catch (error) {
        this.apiStatus = '请求失败'
        this.result = `错误: ${error.message}\n堆栈: ${error.stack || '无'}`

        uni.showToast({
          title: '请求失败',
          icon: 'error'
        })
      }
    },

    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  padding: 40rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
  
  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
  }
}

.content {
  .auth-section, .api-section, .result-section {
    background: white;
    padding: 30rpx;
    margin-bottom: 20rpx;
    border-radius: 12rpx;

    .section-title {
      display: block;
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 20rpx;
    }

    .status {
      display: block;
      font-size: 28rpx;
      color: #666;
      margin-bottom: 10rpx;
    }

    .result {
      display: block;
      font-size: 24rpx;
      color: #333;
      background: #f8f8f8;
      padding: 20rpx;
      border-radius: 8rpx;
      white-space: pre-wrap;
      word-break: break-all;
    }
  }

  .test-btn {
    width: 100%;
    height: 88rpx;
    background-color: #007aff;
    color: white;
    border: none;
    border-radius: 8rpx;
    font-size: 32rpx;
    margin-bottom: 20rpx;

    &:active {
      background-color: #0056cc;
    }
  }
}
</style>
