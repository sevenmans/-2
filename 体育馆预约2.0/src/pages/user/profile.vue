<template>
  <view class="container">
    <!-- 头部用户信息 -->
    <view class="header">
      <view class="user-info">
        <view class="avatar-wrapper" @click="changeAvatar">
          <image 
            :src="userInfo?.avatar || '/static/images/default-avatar.svg'" 
            class="avatar"
            mode="aspectFill"
          />
          <view class="avatar-edit">
            <text class="edit-icon">📷</text>
          </view>
        </view>
        
        <view class="user-details">
          <text class="nickname">{{ userInfo?.nickname || userInfo?.username || '未设置昵称' }}</text>
          <text class="username">用户名: {{ userInfo?.username || '未设置用户名' }}</text>
          <text class="phone">{{ formatPhone(userInfo?.phone || '') }}</text>
        </view>
        
        <view class="edit-btn" @click="editProfile">
          <text class="edit-text">编辑</text>
        </view>
      </view>
      
      <!-- 统计信息 -->
      <view class="stats">
        <view class="stat-item" @click="navigateTo('/pages/booking/list')">
          <text class="stat-number">{{ userStats.totalBookings || 0 }}</text>
          <text class="stat-label">总预约</text>
        </view>
        <view class="stat-item" @click="navigateTo('/pages/sharing/list?tab=my')">
          <text class="stat-number">{{ userStats.totalSharings || 0 }}</text>
          <text class="stat-label">拼场次数</text>
        </view>
      </view>
    </view>
    
    <!-- 功能菜单 -->
    <view class="menu-section">
      <!-- 我的订单 -->
      <view class="menu-group">
        <view class="group-title">
          <text class="title-text">我的订单</text>
        </view>
        
        <view class="menu-item" @click="navigateTo('/pages/booking/list')">
          <view class="item-left">
            <text class="item-icon">📅</text>
            <text class="item-text">我的预约</text>
          </view>
          <view class="item-right">
            <text v-if="pendingBookings > 0" class="badge">{{ pendingBookings }}</text>
            <text class="arrow">›</text>
          </view>
        </view>

        <view class="menu-item" @click="navigateTo('/pages/sharing/list?tab=my')">
          <view class="item-left">
            <text class="item-icon">👥</text>
            <text class="item-text">我的拼场</text>
          </view>
          <view class="item-right">
            <text v-if="pendingSharings > 0" class="badge">{{ pendingSharings }}</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>
      
      <!-- 拼场申请 -->
      <view class="menu-group">
        <view class="group-title">
          <text class="title-text">拼场申请</text>
        </view>
        
        <view class="menu-item" @click="navigateTo('/pages/sharing/requests')">
          <view class="item-left">
            <text class="item-icon">📝</text>
            <text class="item-text">我的申请</text>
          </view>
          <view class="item-right">
            <text v-if="pendingRequests > 0" class="badge">{{ pendingRequests }}</text>
            <text class="arrow">›</text>
          </view>
        </view>

        <view class="menu-item" @click="navigateTo('/pages/sharing/received')">
          <view class="item-left">
            <text class="item-icon">📬</text>
            <text class="item-text">收到的申请</text>
          </view>
          <view class="item-right">
            <text v-if="receivedRequests > 0" class="badge">{{ receivedRequests }}</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>
      
      <!-- 设置 -->
      <view class="menu-group">
        <view class="group-title">
          <text class="title-text">设置</text>
        </view>

        <view class="menu-item" @click="showLogoutConfirm">
          <view class="item-left">
            <text class="item-icon">🚪</text>
            <text class="item-text">退出登录</text>
          </view>
          <view class="item-right">
            <text class="arrow">›</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useUserStore } from '@/stores/user.js'
import { useBookingStore } from '@/stores/booking.js'
import { useSharingStore } from '@/stores/sharing.js'
import requestQueue from '@/utils/request-queue.js'

export default {
  name: 'UserProfile',

  data() {
    return {
      userStore: null,
      bookingStore: null,
      sharingStore: null,
      pendingBookings: 0,
      pendingSharings: 0,
      pendingRequests: 0,
      receivedRequests: 0,
      isLoading: false,
      // 防重复请求标记
      loadingFlags: {
        userInfo: false,
        userStats: false,
        pendingCounts: false
      },
      // 请求缓存时间戳
      lastLoadTime: {
        userInfo: 0,
        userStats: 0,
        pendingCounts: 0
      },
      // 缓存有效期（毫秒）
      cacheTimeout: 30000, // 30秒
      // 整体缓存时间戳
      lastRefreshTime: 0,
      isRefreshing: false,
      isLoggingOut: false
    }
  },
  
  computed: {
    userInfo() {
      return this.userStore?.userInfoGetter || {}
    },

    userStats() {
      return this.userStore?.userStats || {}
    },

    isLoggedIn() {
      return this.userStore?.getIsLoggedIn || false
    }
  },

  onLoad() {
    // 初始化Pinia stores
    this.userStore = useUserStore()
    this.bookingStore = useBookingStore()
    this.sharingStore = useSharingStore()

    // 加载用户数据
    this.loadUserData();
  },
  
  onShow() {
    // 页面显示时使用缓存优化，避免频繁刷新
    this.loadUserDataWithCache();
  },
  
  onUnload() {
  },
  
  methods: {
    
    // 缓存优化的数据加载方法
    async loadUserDataWithCache() {
      // 防重复请求
      if (this.isRefreshing) {
        console.log('[Profile] 正在刷新中，跳过重复请求')
        return
      }

      // 检查缓存有效性
      const now = Date.now()
      const hasData = this.userInfo && Object.keys(this.userInfo).length > 0
      
      if (hasData && this.lastRefreshTime && 
          (now - this.lastRefreshTime) < this.cacheTimeout) {
        console.log('[Profile] 使用缓存数据，跳过请求')
        return
      }

      // 执行数据加载
      await this.loadUserData()
    },
    
    // 检查缓存是否有效
    isCacheValid(type) {
      const now = Date.now()
      const lastTime = this.lastLoadTime[type]
      return (now - lastTime) < this.cacheTimeout
    },

    // 加载用户数据
    async loadUserData() {
      console.log('[Profile] 开始加载用户数据')
      
      // 防止重复加载
      if (this.isLoading || this.isRefreshing) {
        console.log('[Profile] 正在加载中，跳过重复请求')
        return
      }
      
      this.isLoading = true
      this.isRefreshing = true
      
      try {
        // 🔥 性能优化：用户信息 + 统计 + 角标数量三组请求并行执行
        await Promise.all([
          // 第一组：核心数据（用户信息 + 统计），失败会抛异常
          Promise.all([
            this.loadUserInfo(),
            this.loadUserStats()
          ]),
          // 第二组：角标数量，失败只静默降级，不影响页面渲染
          this.loadPendingCounts().catch(error => {
            console.warn('[Profile] 加载待处理数量失败:', error.message)
          })
        ])
        
        console.log('[Profile] 用户数据加载完成')
        
        // 更新缓存时间
        this.lastRefreshTime = Date.now()
        
      } catch (error) {
        console.error('[Profile] 加载用户数据失败:', error)
        uni.showToast({
          title: '加载用户信息失败',
          icon: 'none',
          duration: 2000
        })
      } finally {
        this.isLoading = false
        this.isRefreshing = false
      }
    },

    // 加载用户信息
    async loadUserInfo() {
      // 检查是否正在加载或缓存有效
      if (this.loadingFlags.userInfo) {
        console.log('[Profile] 用户信息正在加载中，跳过')
        return
      }
      
      if (this.isCacheValid('userInfo') && this.userInfo && Object.keys(this.userInfo).length > 0) {
        console.log('[Profile] 使用缓存的用户信息')
        return
      }
      
      this.loadingFlags.userInfo = true
      
      try {
        console.log('[Profile] 开始加载用户信息')
        await this.userStore.getUserInfo()
        this.lastLoadTime.userInfo = Date.now()
        console.log('[Profile] 用户信息加载成功')
      } catch (error) {
        console.error('[Profile] 用户信息加载失败:', error)
        throw error
      } finally {
        this.loadingFlags.userInfo = false
      }
    },

    // 加载用户统计
    async loadUserStats() {
      // 检查是否正在加载或缓存有效
      if (this.loadingFlags.userStats) {
        console.log('[Profile] 用户统计正在加载中，跳过')
        return
      }
      
      if (this.isCacheValid('userStats') && this.userStats && Object.keys(this.userStats).length > 0) {
        console.log('[Profile] 使用缓存的用户统计')
        return
      }
      
      this.loadingFlags.userStats = true
      
      try {
        console.log('[Profile] 开始加载用户统计')
        await this.userStore.getUserStats()
        this.lastLoadTime.userStats = Date.now()
        console.log('[Profile] 用户统计加载成功')
      } catch (error) {
        console.warn('[Profile] 用户统计加载失败，使用默认值:', error.message)
        // 设置默认统计数据
        this.userStats = {
          totalBookings: 0,
          pendingBookings: 0,
          completedBookings: 0,
          totalSpent: 0
        }
      } finally {
        this.loadingFlags.userStats = false
      }
    },
    
    // 加载待处理数量
    async loadPendingCounts() {
      // 检查是否正在加载或缓存有效
      if (this.loadingFlags.pendingCounts) {
        console.log('[Profile] 待处理数量正在加载中，跳过重复请求')
        return
      }
      
      if (this.isCacheValid('pendingCounts')) {
        console.log('[Profile] 使用缓存的待处理数量')
        return
      }
      
      console.log('[Profile] 开始加载待处理数量')
      this.loadingFlags.pendingCounts = true
      
      // 设置默认值
      this.pendingBookings = 0
      this.pendingSharings = 0
      this.pendingRequests = 0
      this.receivedRequests = 0
      
      try {
        // 🔥 性能优化：4 个角标请求并行执行，每个独立容错
        await Promise.allSettled([
          this.loadPendingBookings(),
          this.loadPendingSharings(),
          this.loadPendingRequests(),
          this.loadReceivedRequests()
        ])
        
        this.lastLoadTime.pendingCounts = Date.now()
        
        console.log('[Profile] 所有待处理数量加载完成:', {
          pendingBookings: this.pendingBookings,
          pendingSharings: this.pendingSharings,
          pendingRequests: this.pendingRequests,
          receivedRequests: this.receivedRequests
        })
        
      } catch (error) {
        console.error('[Profile] 加载待处理数量失败:', error)
      } finally {
        this.loadingFlags.pendingCounts = false
      }
    },

    // 延迟函数
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    },

    // 创建超时Promise
    createTimeoutPromise(timeout = 5000) {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), timeout)
      })
    },

    // 加载待确认预约数量
    async loadPendingBookings() {
      try {
        console.log('[Profile] 加载待确认预约数量')
        const result = await Promise.race([
          this.bookingStore.getUserBookings({
            status: 'pending',
            page: 1,
            pageSize: 1 // 🔥 只需要 total 数字，不需要完整数据
          }),
          this.createTimeoutPromise(5000)
        ])
        
        this.pendingBookings = result.total || 0
        console.log('[Profile] 待确认预约数量:', this.pendingBookings)
      } catch (error) {
        console.warn('[Profile] 加载待确认预约数量失败:', error.message)
        this.pendingBookings = 0
      }
    },

    // 加载待处理拼场数量
    async loadPendingSharings() {
      try {
        console.log('[Profile] 加载待处理拼场数量')
        const result = await Promise.race([
          this.bookingStore.getUserSharingOrders({
            status: 'PENDING',
            page: 1,
            pageSize: 1 // 🔥 只需要 total 数字，不需要完整数据
          }),
          this.createTimeoutPromise(5000)
        ])
        
        // 处理拼场数据，可能是数组格式
        if (Array.isArray(result.data)) {
          this.pendingSharings = result.data.length
        } else {
          this.pendingSharings = result.total || 0
        }
        console.log('[Profile] 待处理拼场数量:', this.pendingSharings)
      } catch (error) {
        console.warn('[Profile] 加载待处理拼场数量失败:', error.message)
        this.pendingSharings = 0
      }
    },

    // 加载我发出的待处理申请数量
    async loadPendingRequests() {
      try {
        console.log('[Profile] 加载我发出的待处理申请数量')
        const result = await Promise.race([
          this.sharingStore.getSentRequestsList({
            status: 'PENDING',
            page: 1,
            pageSize: 1 // 🔥 只需要 total 数字，不需要完整数据
          }),
          this.createTimeoutPromise(5000)
        ])
        
        const myRequests = result?.data || result?.list || result || []
        if (Array.isArray(myRequests)) {
          // 后端如果支持 status 过滤，这里返回的应该都是 PENDING，但为了保险再次过滤
          this.pendingRequests = myRequests.filter(req => (req.status || '').toString().toUpperCase() === 'PENDING').length
        } else {
          this.pendingRequests = 0
        }
        console.log('[Profile] 我发出的待处理申请数量:', this.pendingRequests)
      } catch (error) {
        console.warn('[Profile] 加载我发出的待处理申请数量失败:', error.message)
        this.pendingRequests = 0
      }
    },

    // 加载收到的待处理申请数量
    async loadReceivedRequests() {
      try {
        console.log('[Profile] 加载收到的待处理申请数量')
        const result = await Promise.race([
          this.sharingStore.getReceivedRequestsList({
            status: 'PENDING',
            page: 1,
            pageSize: 1 // 🔥 只需要 total 数字，不需要完整数据
          }),
          this.createTimeoutPromise(5000)
        ])
        
        const receivedRequests = result?.data || result?.list || result || []
        if (Array.isArray(receivedRequests)) {
          this.receivedRequests = receivedRequests.filter(req => (req.status || '').toString().toUpperCase() === 'PENDING').length
        } else {
          this.receivedRequests = 0
        }
        console.log('[Profile] 收到的待处理申请数量:', this.receivedRequests)
      } catch (error) {
        console.warn('[Profile] 加载收到的待处理申请数量失败:', error.message)
        this.receivedRequests = 0
      }
    },
    
    // 格式化手机号
    formatPhone(phone) {
      if (!phone) return ''
      return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3')
    },
    
    // 更换头像
    changeAvatar() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0]
          this.uploadAvatar(tempFilePath)
        }
      })
    },
    
    // 上传头像
    async uploadAvatar(filePath) {
      try {
        uni.showLoading({ title: '上传中...' })
        
        // 调用 store 的 uploadAvatar 方法
        await this.userStore.uploadAvatar(filePath)
        
        uni.hideLoading()
        uni.showToast({
          title: '头像更新成功',
          icon: 'success'
        })
        
      } catch (error) {
        uni.hideLoading()
        console.error('[Profile] 上传头像失败:', error)
        uni.showToast({
          title: error.message || '上传失败',
          icon: 'error'
        })
      }
    },
    
    // 编辑资料
    editProfile() {
      // 确保用户信息已加载
      if (!this.userInfo) {
        this.loadUserData()
      }
      uni.navigateTo({
        url: '/pages/user/edit-profile'
      })
    },
    
    // 页面跳转
    navigateTo(url) {
      // 检查是否为tabbar页面
      const tabbarPages = [
        '/pages/index/index',
        '/pages/venue/list', 
        '/pages/sharing/list',
        '/pages/booking/list',
        '/pages/user/profile'
      ]
      
      // 提取页面路径（去掉查询参数）
      const pagePath = url.split('?')[0]
      
      if (tabbarPages.includes(pagePath)) {
        // 如果是tabbar页面，使用switchTab
        uni.switchTab({ url: pagePath })
      } else {
        // 普通页面使用navigateTo
        uni.navigateTo({ url })
      }
    },
    
    // 显示退出登录确认
    showLogoutConfirm() {
      if (this.isLoggingOut) {
        return
      }
      uni.showModal({
        title: '确认退出',
        content: '确定要退出登录吗？',
        confirmText: '退出',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.handleLogoutConfirm()
          }
        }
      })
    },
    
    // 确认退出登录
    async handleLogoutConfirm() {
      try {
        if (this.isLoggingOut) return
        this.isLoggingOut = true
        await this.userStore.logout()
        
        uni.showToast({
          title: '已退出登录',
          icon: 'success'
        })
        
        // 跳转到登录页
        setTimeout(() => {
          uni.reLaunch({
            url: '/pages/user/login'
          })
        }, 500)
        
      } catch (error) {
        console.error('[Profile] 退出登录失败:', error)
        uni.showToast({
          title: '退出失败',
          icon: 'error'
        })
      } finally {
        this.isLoggingOut = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

// 头部
.header {
  background: linear-gradient(135deg, #ff6b35 0%, #ff8f65 100%);
  padding: 40rpx 40rpx 30rpx;
  
  // 用户信息
  .user-info {
    display: flex;
    align-items: center;
    margin-bottom: 40rpx;
    
    .avatar-wrapper {
      position: relative;
      margin-right: 24rpx;
      
      .avatar {
        width: 120rpx;
        height: 120rpx;
        border-radius: 60rpx;
        border: 4rpx solid rgba(255, 255, 255, 0.3);
      }
      
      .avatar-edit {
        position: absolute;
        bottom: -8rpx;
        right: -8rpx;
        width: 40rpx;
        height: 40rpx;
        background-color: #ffffff;
        border-radius: 20rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
        
        .edit-icon {
          font-size: 20rpx;
        }
      }
    }
    
    .user-details {
      flex: 1;
      
      .nickname {
        display: block;
        font-size: 36rpx;
        font-weight: 600;
        color: #ffffff;
        margin-bottom: 8rpx;
      }
      
      .username {
        display: block;
        font-size: 24rpx;
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 8rpx;
      }
      
      .phone {
        display: block;
        font-size: 26rpx;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 12rpx;
      }
      

    }
    
    .edit-btn {
      padding: 12rpx 24rpx;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 20rpx;
      
      .edit-text {
        font-size: 24rpx;
        color: #ffffff;
      }
    }
  }
  
  // 统计信息
  .stats {
    display: flex;
    background-color: rgba(255, 255, 255, 0.15);
    border-radius: 16rpx;
    padding: 20rpx 0;
    
    .stat-item {
      flex: 1;
      text-align: center;
      
      .stat-number {
        display: block;
        font-size: 32rpx;
        font-weight: 600;
        color: #ffffff;
        margin-bottom: 8rpx;
      }
      
      .stat-label {
        font-size: 22rpx;
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }
}

// 菜单区域
.menu-section {
  padding: 20rpx;
  
  .menu-group {
    background-color: #ffffff;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
    overflow: hidden;
    
    .group-title {
      padding: 24rpx 32rpx 16rpx;
      
      .title-text {
        font-size: 28rpx;
        font-weight: 600;
        color: #333333;
      }
    }
    
    .menu-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24rpx 32rpx;
      border-bottom: 1rpx solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      .item-left {
        display: flex;
        align-items: center;
        
        .item-icon {
          font-size: 32rpx;
          margin-right: 20rpx;
        }
        
        .item-text {
          font-size: 28rpx;
          color: #333333;
        }
      }
      
      .item-right {
        display: flex;
        align-items: center;
        
        .badge {
          background-color: #ff4d4f;
          color: #ffffff;
          font-size: 20rpx;
          padding: 4rpx 8rpx;
          border-radius: 10rpx;
          margin-right: 12rpx;
          min-width: 32rpx;
          text-align: center;
        }
        

        
        .arrow {
          font-size: 24rpx;
          color: #cccccc;
        }
      }
    }
  }
}
</style>
