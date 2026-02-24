<template>
  <view class="container">
    <!-- 骨架屏 -->
    <SkeletonScreen
      v-if="loading"
      :show-banner="true"
      :show-actions="true"
      :show-venues="true"
      :show-sharings="true"
      :count="3"
    />

    <!-- 实际内容 -->
    <view v-else>

    <!-- 轮播图 -->
    <view class="banner-section">
      <swiper class="banner-swiper" indicator-dots circular autoplay>
        <swiper-item v-for="(banner, index) in banners" :key="index">
          <image 
            :src="banner.image" 
            class="banner-image" 
            mode="aspectFill"
            lazy-load
            @load="onImageLoad"
            @error="onImageError"
          />
        </swiper-item>
      </swiper>
    </view>
    
    <!-- 快捷功能 -->
    <view class="quick-actions">
      <view class="action-item" @click="navigateTo('/pages/venue/list')">
        <view class="action-icon">
          <text class="iconfont icon-venue">🏟️</text>
        </view>
        <text class="action-text">场馆预约</text>
      </view>
      <view class="action-item" @click="navigateTo('/pages/sharing/list')">
        <view class="action-icon">
          <text class="iconfont icon-sharing">👥</text>
        </view>
        <text class="action-text">拼场活动</text>
      </view>
      <view class="action-item" @click="navigateTo('/pages/booking/list')">
        <view class="action-icon">
          <text class="iconfont icon-booking">📅</text>
        </view>
        <text class="action-text">我的预约</text>
      </view>
      <view class="action-item" @click="navigateTo('/pages/user/profile')">
        <view class="action-icon">
          <text class="iconfont icon-user">👤</text>
        </view>
        <text class="action-text">个人中心</text>
      </view>
    </view>
    
    <!-- 热门场馆 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">热门场馆</text>
        <text class="section-more" @click="navigateTo('/pages/venue/list')">更多 ›</text>
      </view>
      <view class="venue-list">
        <view 
          v-for="venue in safePopularVenues" 
          :key="venue.id" 
          class="venue-card"
          @click="navigateTo(`/pages/venue/detail?id=${venue.id}`)"
        >
          <image 
            :src="(venue.images && venue.images[0]) || '/static/default-venue.jpg'" 
            class="venue-image" 
            mode="aspectFill"
            lazy-load
            @load="onImageLoad"
            @error="onImageError"
          />
          <view class="venue-info">
            <text class="venue-name">{{ venue.name || '未知场馆' }}</text>
            <text class="venue-location">{{ venue.location || '位置未知' }}</text>
            <view class="venue-price">
              <text class="price-text">¥{{ venue.price || 0 }}/小时</text>
              <text class="venue-status" :class="getStatusClass(venue.status)">{{ getStatusText(venue.status) }}</text>
            </view>
          </view>
        </view>
        <!-- 无数据提示 -->
        <view v-if="safePopularVenues.length === 0" class="no-data">
          <text class="no-data-text">暂无热门场馆数据</text>
        </view>
      </view>
    </view>
    
    <!-- 最新拼场 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">最新拼场</text>
        <text class="section-more" @click="navigateTo('/pages/sharing/list')">更多 ›</text>
      </view>
      <view class="sharing-list">
        <view 
          v-for="sharing in latestSharingOrders" 
          :key="sharing.id" 
          class="sharing-card"
          @click="navigateTo(`/pages/sharing/detail?id=${sharing.id}`)"
        >
          <view class="sharing-header">
            <text class="sharing-venue">{{ sharing.venueName }}</text>
            <text class="sharing-time">{{ formatDate(sharing.bookingDate) }} {{ sharing.startTime }}-{{ sharing.endTime }}</text>
          </view>
          <view class="sharing-info">
            <text class="sharing-team">{{ sharing.teamName }}</text>
            <text class="sharing-participants">{{ sharing.currentParticipants }}/{{ sharing.maxParticipants }}人</text>
          </view>
          <view class="sharing-price">
            <text class="price-per-person">¥{{ sharing.pricePerPerson }}/人</text>
          </view>
        </view>
      </view>
    </view>
    </view>
  </view>
</template>

<script>
import { useVenueStore } from '@/stores/venue.js'
import { useBookingStore } from '@/stores/booking.js'
import { smartNavigate } from '@/utils/navigation.js'
import { formatDate } from '@/utils/helpers.js'
import { CacheManager, SimplePerformanceMonitor, debounce } from '@/utils/performance.js'
import SkeletonScreen from '@/components/SkeletonScreen.vue'
// WebSocket功能已被移除

export default {
  name: 'IndexPage',

  components: {
    SkeletonScreen
  },

  data() {
    return {
      venueStore: null,
      bookingStore: null,
      loading: false,
      // WebSocket状态变量已被移除
      banners: [
        {
          image: '/static/banner1.jpg',
          title: '专业体育场馆'
        },
        {
          image: '/static/banner2.jpg',
          title: '便捷预约服务'
        },
        {
          image: '/static/banner3.jpg',
          title: '拼场找队友'
        }
      ]
    }
  },
  
  computed: {
    popularVenues() {
      return this.venueStore?.popularVenuesGetter || []
    },

    availableSharingOrders() {
      return this.bookingStore?.sharingOrdersGetter || []
    },

    latestSharingOrders() {
      // 确保数据存在且为数组
      if (!this.availableSharingOrders || !Array.isArray(this.availableSharingOrders)) {
        return []
      }
      return this.availableSharingOrders.slice(0, 3)
    },

    // 确保热门场馆数据安全
    safePopularVenues() {
      if (!this.popularVenues || !Array.isArray(this.popularVenues)) {
        return []
      }
      return this.popularVenues
    }
  },
  
  onLoad() {
    // 初始化Pinia stores
    this.venueStore = useVenueStore()
    this.bookingStore = useBookingStore()

    // WebSocket初始化已被移除

    // 使用缓存优化的数据加载
    this.loadHomeDataWithCache()
  },
  
  onPullDownRefresh() {
    this.refreshData()
  },
  
  onShow() {
    // 页面显示时检查缓存，避免频繁刷新
    const cacheKey = 'homePageData'
    const cached = CacheManager.get(cacheKey)
    
    // 如果没有缓存或缓存已过期，才刷新数据
    if (!cached) {
      this.loadHomeDataWithCache()
    }
  },
  
  methods: {
    
    // WebSocket初始化方法已被移除
    
    // WebSocket测试方法已被移除
    
    // 优化的首页数据加载（带缓存和超时处理）
    async loadHomeDataWithCache() {
      const cacheKey = 'homePageData'
      
      try {
        // 开始性能监控
        SimplePerformanceMonitor.mark('homeDataLoad')
        
        // 检查缓存
        const cached = CacheManager.get(cacheKey)
        if (cached) {
          // 通过store更新数据，而不是直接赋值给computed属性
          this.venueStore.setPopularVenues(cached.popularVenues || [])
          this.bookingStore.setSharingOrders(cached.latestSharingOrders || [])
          console.log('使用缓存数据')
          SimplePerformanceMonitor.measure('homeDataLoad')
          return
        }
        
        this.loading = true
        
        // 无论是否登录都加载首页数据
        // 移除登录检查，允许未登录用户查看首页信息
        console.log('加载首页数据，无需登录验证')
        
        // 设置请求超时时间（5秒）
        const timeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('请求超时')), 5000)
        })
        
        // 并发请求所有数据，添加超时控制
        const dataPromise = Promise.allSettled([
          this.venueStore.getPopularVenues(),
          this.bookingStore.getSharingOrdersList({ page: 1, pageSize: 3 })
        ])
        
        // 使用Promise.race竞争超时
        const results = await Promise.race([
          dataPromise,
          timeout.then(() => {
            // 超时时使用缓存或空数据
            console.warn('请求超时，使用备用数据')
            return [
              { status: 'rejected', reason: '请求超时' },
              { status: 'rejected', reason: '请求超时' }
            ]
          })
        ])
        
        // 处理请求结果 - 数据已通过store actions自动更新
        const [venuesResult, sharingsResult] = results
        
        if (venuesResult.status === 'rejected') {
          console.warn('获取场馆数据失败:', venuesResult.reason)
          // 确保store中有空数组
          this.venueStore.setPopularVenues([])
        }

        if (sharingsResult.status === 'rejected') {
          console.warn('获取拼场数据失败:', sharingsResult.reason)
          // 确保store中有空数组
          this.bookingStore.setSharingOrders([])
        }
        
        // 只有当有数据时才缓存
        if (this.popularVenues.length > 0 || this.latestSharingOrders.length > 0) {
          const cacheData = {
            popularVenues: this.popularVenues,
            latestSharingOrders: this.latestSharingOrders
          }
          CacheManager.set(cacheKey, cacheData, 5 * 60 * 1000) // 5分钟缓存
        }
        
        SimplePerformanceMonitor.measure('homeDataLoad')
        
      } catch (error) {
        console.error('加载首页数据失败:', error)
        // 检查是否是登录过期错误
        if (error.code === 'LOGIN_EXPIRED') {
          console.log('登录已过期，但允许继续浏览首页')
          // 清空数据但不显示错误
          this.venueStore.setPopularVenues([])
          this.bookingStore.setSharingOrders([])
        } else {
          uni.showToast({
            title: '数据加载失败',
            icon: 'none'
          })
        }
      } finally {
        this.loading = false
      }
    },
     
     // 图片加载成功处理
     onImageLoad(e) {
       console.log('图片加载成功')
     },
     
     // 图片加载失败处理
     onImageError(e) {
       console.log('图片加载失败:', e)
       // 可以设置默认图片
     },
     
     // 下拉刷新（清除缓存）
     async refreshData() {
       try {
         // 清除缓存
         CacheManager.remove('homePageData')
         // 重新加载数据
         await this.loadHomeDataWithCache()
       } catch (error) {
         console.error('刷新数据失败:', error)
         uni.showToast({
           title: '刷新失败',
           icon: 'none'
         })
       } finally {
         uni.stopPullDownRefresh()
       }
     },
     
     // 初始化数据（备用方法）
    async initData() {
      try {
        await Promise.all([
          this.venueStore.getPopularVenues(),
          this.bookingStore.getSharingOrdersList({ page: 1, pageSize: 3 })
        ])
      } catch (error) {
        console.error('初始化数据失败:', error)
      }
    },
    
    // 页面跳转
    navigateTo(url) {
      smartNavigate(url)
    },
    
    // 格式化日期
    formatDate(date) {
      return formatDate(date, 'MM-DD')
    },
    
    // 获取状态样式类
    getStatusClass(status) {
      const statusMap = {
        'AVAILABLE': 'status-available',
        'MAINTENANCE': 'status-maintenance',
        'OCCUPIED': 'status-occupied'
      }
      return statusMap[status] || 'status-available'
    },
    
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        'AVAILABLE': '可用',
        'MAINTENANCE': '维护中',
        'OCCUPIED': '已占用'
      }
      return statusMap[status] || '可用'
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
}

// 轮播图
.banner-section {
  height: 400rpx;
  
  .banner-swiper {
    height: 100%;
    
    .banner-image {
      width: 100%;
      height: 100%;
    }
  }
}

// 快捷功能
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  background-color: #ffffff;
  padding: 40rpx 30rpx;
  margin-bottom: 20rpx;
  gap: 20rpx;

  .action-item {
    width: calc(25% - 15rpx);
    display: flex;
    flex-direction: column;
    align-items: center;

    .action-icon {
      width: 80rpx;
      height: 80rpx;
      background: linear-gradient(135deg, #ff6b35 0%, #ff8a65 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16rpx;
      font-size: 36rpx;
    }

    .action-text {
      font-size: 24rpx;
      color: #333333;
    }
  }
}

// 通用区块
.section {
  background-color: #ffffff;
  margin-bottom: 20rpx;
  padding: 30rpx;
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
    
    .section-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
    }
    
    .section-more {
      font-size: 24rpx;
      color: #ff6b35;
    }
  }
}

// 场馆列表
.venue-list {
  .venue-card {
    display: flex;
    margin-bottom: 24rpx;
    padding: 20rpx;
    background-color: #f8f8f8;
    border-radius: 12rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .venue-image {
      width: 120rpx;
      height: 120rpx;
      border-radius: 8rpx;
      margin-right: 20rpx;
    }
    
    .venue-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      
      .venue-name {
        font-size: 28rpx;
        font-weight: 600;
        color: #333333;
        margin-bottom: 8rpx;
      }
      
      .venue-location {
        font-size: 24rpx;
        color: #666666;
        margin-bottom: 16rpx;
      }
      
      .venue-price {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .price-text {
          font-size: 26rpx;
          color: #ff6b35;
          font-weight: 600;
        }
        
        .venue-status {
          font-size: 20rpx;
          padding: 4rpx 12rpx;
          border-radius: 12rpx;
          
          &.status-available {
            background-color: #e6f7ff;
            color: #1890ff;
          }
          
          &.status-maintenance {
            background-color: #fff7e6;
            color: #fa8c16;
          }
          
          &.status-occupied {
            background-color: #fff2f0;
            color: #ff4d4f;
          }
        }
      }
    }
  }
}

// 拼场列表
.sharing-list {
  .sharing-card {
    padding: 24rpx;
    background-color: #f8f8f8;
    border-radius: 12rpx;
    margin-bottom: 20rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .sharing-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16rpx;
      
      .sharing-venue {
        font-size: 28rpx;
        font-weight: 600;
        color: #333333;
      }
      
      .sharing-time {
        font-size: 24rpx;
        color: #666666;
      }
    }
    
    .sharing-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16rpx;
      
      .sharing-team {
        font-size: 26rpx;
        color: #333333;
      }
      
      .sharing-participants {
        font-size: 24rpx;
        color: #666666;
      }
    }
    
    .sharing-price {
      text-align: right;
      
      .price-per-person {
        font-size: 26rpx;
        color: #ff6b35;
        font-weight: 600;
      }
    }
  }
}
</style>
