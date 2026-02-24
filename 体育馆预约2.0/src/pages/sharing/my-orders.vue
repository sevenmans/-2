<template>
  <view class="container">
    <!-- 通知提示区域 -->
    <view v-if="notifications.length > 0" class="notification-area">
      <view 
        v-for="(notification, index) in notifications" 
        :key="index"
        class="notification-item"
        :class="notification.type"
        @click="dismissNotification(index)"
      >
        <text class="notification-icon">{{ getNotificationIcon(notification.type) }}</text>
        <text class="notification-text">{{ notification.message }}</text>
        <text class="notification-close">×</text>
      </view>
    </view>
    
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="nav-left" @click="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">我的拼场</text>
      <view class="nav-right"></view>
    </view>
    
    <!-- 标签切换 -->
    <view class="tabs-container">
      <view 
        v-for="tab in tabs" 
        :key="tab.value"
        class="tab-item"
        :class="{ active: currentTab === tab.value }"
        @click="switchTab(tab.value)"
      >
        <text class="tab-text">{{ tab.label }}</text>
        <text v-if="tab.count > 0" class="tab-count">{{ tab.count }}</text>
      </view>
    </view>
    
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>
    
    <!-- 错误状态 -->
    <view v-else-if="error" class="error-state">
      <text class="error-icon">⚠️</text>
      <text class="error-text">{{ error }}</text>
      <button class="retry-btn" @click="loadData">
        重新加载
      </button>
    </view>
    
    <!-- 内容区域 -->
    <view v-else class="content">
      <!-- 我创建的拼场 -->
      <view v-if="currentTab === 'created'" class="orders-list">
        <view v-if="sortedCreatedOrders.length > 0">
          <view
            v-for="order in sortedCreatedOrders"
            :key="order.id"
            class="order-item"
            @click="goToDetail(order.id)"
          >
            <view class="order-header">
              <text class="venue-name">{{ order.venueName }}</text>
              <view class="status-badge" :class="getStatusClass(order.status)">
                <text class="status-text">{{ getStatusText(order.status) }}</text>
              </view>
            </view>
            
            <view class="order-info">
              <view class="info-row">
                <text class="time-icon">🕐</text>
                <text class="info-value">{{ formatTimeRange(order) }}</text>
              </view>
              
              <view class="info-row">
                <text class="location-icon">📍</text>
                <text class="info-value">{{ order.venueLocation || '位置未知' }}</text>
              </view>
              
              <view class="info-row">
                <text class="team-icon">👥</text>
                <text class="info-value">{{ order.teamName }}</text>
              </view>
              
              <view class="info-row">
                <text class="participants-icon">👥</text>
                <text class="info-value">参与球队：{{ order.currentParticipants || 0 }}/{{ order.maxParticipants || 2 }}支</text>
              </view>
              
              <view class="info-row">
                <text class="price-icon">💰</text>
                <text class="info-value">费用：¥{{ formatPrice(getPerTeamPrice(order)) }}（每队平分）</text>
              </view>
              
              <view class="info-row">
                <text class="create-icon">📅</text>
                <text class="info-value">创建时间：{{ formatCreateTime(order.createdAt) }}</text>
              </view>
            </view>
            
            <view class="order-actions">
              <button 
                v-if="order.status === 'OPEN'"
                class="action-btn manage-btn"
                @click.stop="goToManage(order.id)"
              >
                管理
              </button>
              <button 
                v-if="order.status === 'OPEN'"
                class="action-btn cancel-btn"
                @click.stop="cancelOrder(order.id)"
              >
                取消
              </button>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text class="empty-icon">📝</text>
          <text class="empty-text">您还没有创建过拼场订单</text>
          <button class="browse-btn" @click="goToVenueList">
            去场馆预约
          </button>
        </view>
      </view>
      
      <!-- 我申请的拼场 -->
      <view v-if="currentTab === 'applied'" class="orders-list">
        <view v-if="sortedAppliedOrders.length > 0">
          <view
            v-for="request in sortedAppliedOrders"
            :key="request.id"
            class="order-item"
            @click="goToRequestDetail(request)"
          >
            <view class="order-header">
              <text class="venue-name">{{ request.venueName }}</text>
              <view class="status-badge" :class="getRequestStatusClass(request.status)">
                <text class="status-text">{{ getRequestStatusText(request.status) }}</text>
              </view>
            </view>
            
            <view class="order-info">
              <view class="info-row">
                <text class="time-icon">🕐</text>
                <text class="info-value">{{ formatTimeRange(request.sharingOrder || request) }}</text>
              </view>
              
              <view class="info-row">
                <text class="location-icon">📍</text>
                <text class="info-value">{{ request.venueLocation || request.sharingOrder?.venueLocation || request.venueName || request.sharingOrder?.venueName || '位置未知' }}</text>
              </view>
              
              <view class="info-row">
                <text class="team-icon">👥</text>
                <text class="info-value">对方队伍：{{ request.teamName }}</text>
              </view>
              
              <view class="info-row">
                <text class="price-icon">💰</text>
                <text class="info-value">费用：¥{{ formatPrice(getPerTeamPrice(request.sharingOrder || request)) }}（每队平分）</text>
              </view>
              
              <view class="info-row">
                <text class="create-icon">📅</text>
                <text class="info-value">申请时间：{{ formatCreateTime(request.createdAt) }}</text>
              </view>
              
              <view v-if="request.responseMessage" class="info-row">
                <text class="message-icon">💬</text>
                <text class="info-value">回复：{{ request.responseMessage }}</text>
              </view>
            </view>
            
            <view class="order-actions">
              <button 
                v-if="request.status === 'PENDING'"
                class="action-btn cancel-btn"
                @click.stop="cancelRequest(request.id)"
              >
                取消申请
              </button>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text class="empty-icon">📋</text>
          <text class="empty-text">您还没有申请过拼场</text>
          <button class="browse-btn" @click="goToBrowse">
            浏览拼场
          </button>
        </view>
      </view>
      
      <!-- 拼场成功的订单 -->
      <view v-if="currentTab === 'success'" class="orders-list">
        <view v-if="sortedSuccessOrders.length > 0">
          <view
            v-for="order in sortedSuccessOrders"
            :key="order.id"
            class="order-item success-item"
            @click="goToDetail(order.id)"
          >
            <view class="order-header">
              <text class="venue-name">{{ order.venueName }}</text>
              <view class="status-badge success">
                <text class="status-text">拼场成功</text>
              </view>
            </view>
            
            <view class="order-info">
              <view class="info-row">
                <text class="info-label">时间：</text>
                <text class="info-value">{{ formatTimeRange(order) }}</text>
              </view>
              <view class="info-row">
                <text class="info-label">位置：</text>
                <text class="info-value">{{ order.venueLocation || order.venueName || '位置未知' }}</text>
              </view>
              <view class="info-row">
                <text class="info-label">队伍：</text>
                <text class="info-value">{{ order.teamName }}</text>
              </view>
              <view class="info-row">
                <text class="info-label">人数：</text>
                <text class="info-value">{{ order.currentParticipants }}/{{ order.maxParticipants }}人</text>
              </view>
              <view class="info-row">
                <text class="info-label">费用：</text>
                <text class="info-value">¥{{ formatPrice(getPerTeamPrice(order)) }}（每队平分）</text>
              </view>
              <view class="info-row">
                <text class="info-label">联系方式：</text>
                <text class="info-value">{{ order.contactInfo }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">
          <text class="empty-icon">🎉</text>
          <text class="empty-text">还没有拼场成功的订单</text>
          <button class="browse-btn" @click="goToBrowse">
            去拼场
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useSharingStore } from '@/stores/sharing.js'
import { useUserStore } from '@/stores/user.js'

export default {
  name: 'MyOrders',
  data() {
    return {
      sharingStore: null,
      userStore: null,
      currentTab: 'created',
      loading: false,
      error: null,
      createdOrders: [],
      appliedOrders: [],
      successOrders: [],
      notifications: [], // 通知数组
      // 缓存优化相关字段
      lastLoadTime: 0,
      cacheTimeout: 30000, // 30秒缓存
      isLoading: false
    }
  },
  
  computed: {
    userInfo() {
      return this.userStore?.userInfoGetter || {}
    },

    // 按时间倒序排列的订单列表
    sortedCreatedOrders() {
      return [...this.createdOrders].sort((a, b) => {
        const dateA = new Date(a.createdAt?.replace(/-/g, '/') || 0);
        const dateB = new Date(b.createdAt?.replace(/-/g, '/') || 0);
        return dateB.getTime() - dateA.getTime(); // 倒序：最新的在前
      });
    },

    sortedAppliedOrders() {
      return [...this.appliedOrders].sort((a, b) => {
        const dateA = new Date(a.createdAt?.replace(/-/g, '/') || 0);
        const dateB = new Date(b.createdAt?.replace(/-/g, '/') || 0);
        return dateB.getTime() - dateA.getTime(); // 倒序：最新的在前
      });
    },

    sortedSuccessOrders() {
      return [...this.successOrders].sort((a, b) => {
        const dateA = new Date(a.createdAt?.replace(/-/g, '/') || 0);
        const dateB = new Date(b.createdAt?.replace(/-/g, '/') || 0);
        return dateB.getTime() - dateA.getTime(); // 倒序：最新的在前
      });
    },

    tabs() {
      return [
        {
          value: 'created',
          label: '我创建的',
          count: this.sortedCreatedOrders.length
        },
        {
          value: 'applied',
          label: '我申请的',
          count: this.sortedAppliedOrders.length
        },
        {
          value: 'success',
          label: '拼场成功',
          count: this.sortedSuccessOrders.length
        }
      ]
    }
  },
  
  onLoad() {
    // 初始化Pinia stores
    this.sharingStore = useSharingStore()
    this.userStore = useUserStore()

    this.loadData();
    this.checkForNewNotifications();
  },
  
  onShow() {
    // 使用缓存优化，避免频繁刷新
    this.loadDataWithCache()
    // 页面显示时检查新通知
    this.checkForNewNotifications()
  },
  
  onPullDownRefresh() {
    this.loadData().finally(() => {
      uni.stopPullDownRefresh()
    })
  },
  
  methods: {
    
    // 🚀 缓存优化的数据加载
    async loadDataWithCache() {
      // 防重复请求
      if (this.isLoading) {
        return
      }

      // 检查缓存有效性
      const now = Date.now()
      const hasData = this.createdOrders.length > 0 || this.appliedOrders.length > 0 || this.successOrders.length > 0
      if (hasData && 
          this.lastLoadTime && 
          (now - this.lastLoadTime) < this.cacheTimeout) {
        return
      }

      await this.loadData()
    },

    async loadData() {
      this.isLoading = true
      this.loading = true
      this.error = null
      
      // 清除相关缓存
      if (typeof window !== 'undefined' && window.cacheManager) {
        window.cacheManager.clearUrl('/sharing-orders/my-created')
        window.cacheManager.clearUrl('/shared/my-requests')
      }
      
      try {
        await Promise.all([
          this.loadCreatedOrders(),
          this.loadAppliedOrders(),
          this.loadSuccessOrders()
        ])
        
        // 更新缓存时间
        this.lastLoadTime = Date.now()
        
        // 强制更新视图，确保显示最新数据
        this.$forceUpdate()
      } catch (error) {
        console.error('加载数据失败:', error)
        this.error = error.message || '加载失败'
      } finally {
        this.loading = false
        this.isLoading = false
      }
    },
    
    async loadCreatedOrders() {
      try {
        const response = await this.sharingStore.getMyOrders()
        
        // 检查不同的响应格式
        let orders = []
        if (Array.isArray(response)) {
          orders = response
        } else if (response && Array.isArray(response.data)) {
          orders = response.data
        } else if (response && Array.isArray(response.list)) {
          orders = response.list
        }
        
        
        // 显示所有创建的拼场订单，不管状态如何（OPEN、FULL、CONFIRMED、CANCELLED等）
        this.createdOrders = orders
      } catch (error) {
        console.error('❌ 加载创建的订单失败:', error)
        this.createdOrders = []
      }
    },
    
    async loadAppliedOrders() {
      try {
        const response = await this.sharingStore.getSentRequestsList()
        
        // 检查不同的响应格式
        let requests = []
        if (Array.isArray(response)) {
          requests = response
        } else if (response && Array.isArray(response.data)) {
          requests = response.data
        } else if (response && Array.isArray(response.list)) {
          requests = response.list
        }
        
        
        this.appliedOrders = requests
      } catch (error) {
        console.error('加载申请的订单失败:', error)
        this.appliedOrders = []
      }
    },
    
    async loadSuccessOrders() {
      try {
        
        // 获取我创建的成功拼场订单（状态为FULL或CONFIRMED）
        const createdResponse = await this.sharingStore.getMyOrders()
        
        const createdOrders = createdResponse.data || createdResponse.list || createdResponse || []
        
        const myCreatedSuccessOrders = createdOrders.filter(order =>
          order.status === 'FULL' || order.status === 'CONFIRMED' || order.status === 'SHARING_SUCCESS'
        )
        
        // 获取我申请成功的拼场订单（申请状态为APPROVED且拼场状态为FULL或CONFIRMED）
        const appliedResponse = await this.sharingStore.getSentRequestsList()

        const appliedRequests = appliedResponse.data || appliedResponse.list || appliedResponse || []

        const myAppliedSuccessOrders = appliedRequests.filter(request => {
          const isPaid = request.status === 'PAID'
          return isPaid
        }).map(request => {
          return {
            // 使用申请记录中的订单信息，而不是sharingOrder
            id: request.orderId || request.id,
            orderNo: request.orderNo || `REQ_${request.id}`,
            venueName: request.venueName || '未知场馆',
            venueId: request.venueId,
            venueLocation: request.venueLocation || '位置未知',
            status: 'SHARING_SUCCESS', // 申请成功的订单状态
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,

            // 拼场相关信息
            teamName: request.applicantTeamName || request.teamName || '未知队伍',
            contactInfo: request.applicantContact || request.contactInfo || '未知联系方式',
            currentParticipants: request.currentParticipants || 2,
            maxParticipants: request.maxParticipants || 2,
            description: request.description || '拼场申请',

            // 价格信息
            totalPrice: request.totalPrice || 0,
            pricePerTeam: request.paymentAmount || request.totalPrice || 0,
            paymentAmount: request.paymentAmount || 0,

            // 时间信息
            bookingDate: request.bookingDate,
            startTime: request.startTime,
            endTime: request.endTime,
            bookingTime: request.bookingTime,

            // 标记这是申请成功的订单
            isAppliedOrder: true,
            applicationId: request.id
          }
        })
        
        // 合并两种类型的成功订单
        this.successOrders = [...myCreatedSuccessOrders, ...myAppliedSuccessOrders]
      } catch (error) {
        console.error('加载成功订单失败:', error)
        this.successOrders = []
      }
    },
    
    switchTab(tab) {
      this.currentTab = tab
    },
    
    goBack() {
      uni.navigateBack()
    },
    
    goToDetail(sharingId) {
      if (!sharingId) {
        console.error('拼场订单ID为空，无法跳转')
        uni.showToast({
          title: '订单信息错误',
          icon: 'error'
        })
        return
      }
      uni.navigateTo({
        url: `/pages/sharing/detail?id=${sharingId}`
      })
    },

    goToRequestDetail(request) {
      // 对于申请记录，优先使用sharingOrderId，如果没有则使用orderId
      const targetId = request.sharingOrderId || request.orderId
      if (targetId) {
        uni.navigateTo({
          url: `/pages/sharing/detail?id=${targetId}`
        })
      } else {
        console.error('申请记录缺少sharingOrderId和orderId字段')
        uni.showToast({
          title: '申请信息错误',
          icon: 'error'
        })
      }
    },
    
    goToManage(sharingId) {

      uni.navigateTo({
        url: `/pages/sharing/manage?id=${sharingId}`
      })
    },
    
    goToVenueList() {
      uni.switchTab({
        url: '/pages/venue/list'
      })
    },
    
    goToBrowse() {
      uni.switchTab({
        url: '/pages/sharing/list'
      })
    },
    
    async cancelOrder(orderId) {
      try {
        await uni.showModal({
          title: '确认取消',
          content: '确定要取消这个拼场订单吗？'
        })
        
        uni.showLoading({ title: '取消中...' })
        await this.sharingStore.cancelSharingOrder(orderId)
        uni.hideLoading()
        
        this.addNotification('info', '已取消拼场订单');
        
        this.addNotification('info', '已取消拼场申请');
        
        uni.showToast({
          title: '取消成功',
          icon: 'success'
        })
        
        // 取消后立即刷新我的拼场订单列表，确保状态同步
        try {
          await this.sharingStore.refreshMySharingOrders()
        } catch (e) {}
        this.loadData()
      } catch (error) {
        uni.hideLoading()
        if (error.errMsg !== 'showModal:fail cancel') {
          this.addNotification('error', '取消申请失败');
          uni.showToast({
            title: error.message || '取消失败',
            icon: 'error'
          })
        }
      }
    },
    
    async cancelRequest(requestId) {
      try {
        await uni.showModal({
          title: '确认取消',
          content: '确定要取消这个申请吗？'
        })
        
        uni.showLoading({ title: '取消中...' })
        await this.sharingStore.cancelSharingRequest(requestId)
        uni.hideLoading()
        
        uni.showToast({
          title: '取消成功',
          icon: 'success'
        })
        
        this.loadData()
      } catch (error) {
        uni.hideLoading()
        if (error.errMsg !== 'showModal:fail cancel') {
          uni.showToast({
            title: error.message || '取消失败',
            icon: 'error'
          })
        }
      }
    },
    

    
    getStatusClass(status) {
      const statusMap = {
        'OPEN': 'open',
        'FULL': 'full',
        'CONFIRMED': 'confirmed',
        'CANCELLED': 'cancelled',
        'EXPIRED': 'expired'
      }
      return statusMap[status] || 'unknown'
    },
    
    getStatusText(status) {
      const statusMap = {
        'OPEN': '开放中',
        'FULL': '已满员',
        'CONFIRMED': '已确认',
        'CANCELLED': '已取消',
        'EXPIRED': '已过期',
        'SHARING_SUCCESS': '拼场成功'
      }
      return statusMap[status] || '未知状态'
    },
    
    getRequestStatusClass(status) {
      const statusMap = {
        'PENDING': 'pending',
        'APPROVED': 'approved',
        'REJECTED': 'rejected',
        'CANCELLED': 'cancelled'
      }
      return statusMap[status] || 'unknown'
    },
    
    getRequestStatusText(status) {
      const statusMap = {
        'PENDING': '待审核',
        'APPROVED': '已通过',
        'APPROVED_PENDING_PAYMENT': '已批准待支付',
        'PAID': '拼场成功',
        'REJECTED': '已拒绝',
        'CANCELLED': '已取消',
        'TIMEOUT_CANCELLED': '超时取消'
      }
      return statusMap[status] || '未知状态'
    },
    
    // 格式化日期显示
    formatDate(dateStr) {
      if (!dateStr) return '日期未知';
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '日期未知';
        return `${date.getMonth() + 1}月${date.getDate()}日`;
      } catch (error) {
        console.error('日期格式化错误:', error);
        return '日期未知';
      }
    },
    
    // 格式化时间段显示
    formatTimeSlot(startTime, endTime) {
      if (!startTime || !endTime) return '时间未知';
      
      // 格式化时间显示（去掉秒数）
      const formatTime = (timeStr) => {
        if (!timeStr) return '';
        // 如果是完整的时间格式（HH:mm:ss），只取前5位
        if (timeStr.length > 5 && timeStr.includes(':')) {
          return timeStr.substring(0, 5);
        }
        return timeStr;
      };
      
      const formattedStart = formatTime(startTime);
      const formattedEnd = formatTime(endTime);
      
      return `${formattedStart}-${formattedEnd}`;
    },
    
    // 格式化时间范围显示（与预约订单保持一致）
    formatTimeRange(sharing) {
      if (!sharing) return '时间未知';


      // 优先使用 startTime 和 endTime 字段（这些是纯时间字符串）
      if (sharing.startTime && sharing.endTime) {
        return `${sharing.startTime} - ${sharing.endTime}`;
      }

      // 检查是否是虚拟订单（有bookingTime字段）
      if (sharing.bookingTime) {
        try {
          // 处理iOS兼容性：确保时间格式正确
          let bookingTimeStr = sharing.bookingTime
          if (typeof bookingTimeStr === 'string' && bookingTimeStr.includes(' ') && !bookingTimeStr.includes('T')) {
            bookingTimeStr = bookingTimeStr.replace(' ', 'T')
          }
          const bookingTime = new Date(bookingTimeStr);


          const startTimeStr = bookingTime.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });

          // 如果有 endTime 字段且是时间字符串格式，直接使用
          if (sharing.endTime && typeof sharing.endTime === 'string' && sharing.endTime.match(/^\d{2}:\d{2}$/)) {
            return `${startTimeStr} - ${sharing.endTime}`;
          }

          return startTimeStr;
        } catch (error) {
          console.error('虚拟订单时间格式化错误:', error);
          return '时间格式错误';
        }
      }

      // 与预约订单保持一致的字段获取逻辑
      const startTime = sharing.startTime || sharing.bookingStartTime || sharing.start_time;
      const endTime = sharing.endTime || sharing.bookingEndTime || sharing.end_time;

      if (!startTime || !endTime) {
        return '时间待定';
      }

      // 格式化时间显示（去掉秒数）- 与预约订单保持一致
      const formatTime = (timeStr) => {
        if (!timeStr) return '';
        // 如果是完整的时间格式（HH:mm:ss），只取前5位
        if (timeStr.length > 5 && timeStr.includes(':')) {
          return timeStr.substring(0, 5);
        }
        return timeStr;
      };

      const formattedStart = formatTime(startTime);
      const formattedEnd = formatTime(endTime);

      // 如果有多个时间段，显示时间段数量
      if (timeSlotCount > 1) {
        return `${formattedStart} - ${formattedEnd} (${timeSlotCount}个时段)`;
      }

      return `${formattedStart} - ${formattedEnd}`;
    },
      
      formatCreateTime(dateTime) {
        if (!dateTime) return '';

        // 处理iOS兼容性：将 "2025-07-12 19:14:58" 转换为 "2025/07/12 19:14:58"
        let formattedDateTime = dateTime;
        if (typeof dateTime === 'string' && dateTime.includes(' ') && dateTime.includes('-')) {
          // 将 "YYYY-MM-DD HH:mm:ss" 转换为 "YYYY/MM/DD HH:mm:ss"
          formattedDateTime = dateTime.replace(/-/g, '/');
        }

        const date = new Date(formattedDateTime);

        // 检查日期是否有效
        if (isNaN(date.getTime())) {
          return dateTime; // 返回原始字符串
        }

        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${month}-${day} ${hours}:${minutes}`;
      },
      
      // 格式化价格显示
      formatPrice(price) {
        if (!price && price !== 0) return '0';
        const numPrice = Number(price);
        if (isNaN(numPrice)) return '0';
        return numPrice.toFixed(2);
      },
      
      // 计算每队费用
      getPerTeamPrice(order) {
        if (!order) return '0';

        // 检查是否是虚拟订单（拼场申请）
        const isVirtualOrder = order.id && order.id < 0;

        if (isVirtualOrder) {
          // 虚拟订单使用 paymentAmount
          const amount = order.paymentAmount || 0;
          return this.formatPrice(amount);
        }

        // 如果有pricePerPerson字段，直接使用（现在表示每队费用）
        if (order.pricePerPerson) {
          return this.formatPrice(order.pricePerPerson);
        }

        // 如果有paymentAmount字段（拼场申请），直接使用
        if (order.paymentAmount) {
          return this.formatPrice(order.paymentAmount);
        }

        // 否则计算总价的一半（每队费用）
        const totalPrice = order.totalPrice || order.price || 0;
        const perTeamPrice = totalPrice / 2; // 费用是总金额的一半

        return this.formatPrice(perTeamPrice);
      },
      
      // 添加通知
      addNotification(type, message) {
        const notification = {
          type: type, // 'success', 'info', 'warning', 'error'
          message: message,
          timestamp: Date.now()
        };
        this.notifications.unshift(notification);
        
        // 自动移除通知（5秒后）
        setTimeout(() => {
          this.dismissNotification(0);
        }, 5000);
      },
      
      // 移除通知
      dismissNotification(index) {
        this.notifications.splice(index, 1);
      },
      
      // 获取通知图标
       getNotificationIcon(type) {
         const icons = {
           success: '✅',
           info: 'ℹ️',
           warning: '⚠️',
           error: '❌'
         };
         return icons[type] || 'ℹ️';
       },
       
       // 检查新通知
       async checkForNewNotifications() {
         try {
           // 获取最新的申请状态
           const appliedRequests = await this.sharingStore.getSentRequestsList();
           const requests = appliedRequests.data || appliedRequests.list || appliedRequests || [];
           
           // 检查本地存储的上次状态
           const lastStatusKey = 'sharing_request_status';
           const lastStatus = uni.getStorageSync(lastStatusKey) || {};
           
           requests.forEach(request => {
             const requestId = request.id;
             const currentStatus = request.status;
             const lastRequestStatus = lastStatus[requestId];
             
             // 如果状态发生变化，显示通知
             if (lastRequestStatus && lastRequestStatus !== currentStatus) {
               if (currentStatus === 'APPROVED') {
                 this.addNotification('success', `您的拼场申请已被批准！队伍：${request.teamName}`);
               } else if (currentStatus === 'REJECTED') {
                 this.addNotification('warning', `您的拼场申请已被拒绝。队伍：${request.teamName}`);
               }
             }
             
             // 更新状态记录
             lastStatus[requestId] = currentStatus;
           });
           
           // 保存最新状态到本地存储
           uni.setStorageSync(lastStatusKey, lastStatus);
           
           // 检查是否有新的申请（针对我创建的拼场）
           const createdOrders = await this.sharingStore.getMyOrders();
           const orders = createdOrders.data || createdOrders.list || createdOrders || [];
           
           const lastApplicationsKey = 'sharing_applications';
           const lastApplications = uni.getStorageSync(lastApplicationsKey) || {};
           
           for (const order of orders) {
             if (order.status === 'OPEN') {
               // 获取该拼场的申请列表
               try {
                 const applicationsResponse = await this.sharingStore.getReceivedRequestsList({ orderId: order.id });
                 const applications = applicationsResponse.data || applicationsResponse.list || applicationsResponse || [];
                 
                 const currentApplicationCount = applications.filter(app => app.status === 'PENDING').length;
                 const lastApplicationCount = lastApplications[order.id] || 0;
                 
                 if (currentApplicationCount > lastApplicationCount) {
                   const newApplications = currentApplicationCount - lastApplicationCount;
                   this.addNotification('info', `您的拼场「${order.teamName}」收到了 ${newApplications} 个新申请`);
                 }
                 
                 lastApplications[order.id] = currentApplicationCount;
               } catch (error) {
               }
             }
           }
           
           // 保存申请数量记录
           uni.setStorageSync(lastApplicationsKey, lastApplications);
           
         } catch (error) {
         }
       },
    
    formatDateTime(dateTimeStr) {
      if (!dateTimeStr) return ''
      
      try {
        // 处理iOS兼容性问题：将"YYYY-MM-DD HH:mm:ss"格式转换为"YYYY-MM-DDTHH:mm:ss"
        let dateString = dateTimeStr
        if (typeof dateTimeStr === 'string') {
          // 如果是"2025-06-28 14:54:59"格式，转换为"2025-06-28T14:54:59"
          dateString = dateTimeStr.replace(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2}:\d{2})$/, '$1T$2')
          // 如果是"2025-06-28 14:54"格式，转换为"2025-06-28T14:54"
          dateString = dateString.replace(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2})$/, '$1T$2')
        }
        
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return '--'
        
        return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
      } catch (error) {
        console.error('日期格式化错误:', error)
        return '--'
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

/* 通知区域样式 */
.notification-area {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  padding: 20rpx;
}

.notification-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  margin-bottom: 16rpx;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  animation: slideDown 0.3s ease-out;
  
  &.success {
    background-color: #f0f9ff;
    border-left: 8rpx solid #10b981;
  }
  
  &.info {
    background-color: #eff6ff;
    border-left: 8rpx solid #3b82f6;
  }
  
  &.warning {
    background-color: #fffbeb;
    border-left: 8rpx solid #f59e0b;
  }
  
  &.error {
    background-color: #fef2f2;
    border-left: 8rpx solid #ef4444;
  }
}

.notification-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.notification-text {
  flex: 1;
  font-size: 28rpx;
  color: #374151;
  line-height: 1.4;
}

.notification-close {
  font-size: 36rpx;
  color: #9ca3af;
  margin-left: 16rpx;
  cursor: pointer;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #eee;
  
  .nav-left {
    width: 80rpx;
    
    .nav-icon {
      font-size: 48rpx;
      color: #333;
    }
  }
  
  .nav-title {
    font-size: 36rpx;
    font-weight: 600;
    color: #333;
  }
  
  .nav-right {
    width: 80rpx;
  }
}

.tabs-container {
  display: flex;
  background-color: #ffffff;
  border-bottom: 1rpx solid #eee;
  
  .tab-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32rpx 16rpx;
    position: relative;
    
    .tab-text {
      font-size: 28rpx;
      color: #666;
      margin-right: 8rpx;
    }
    
    .tab-count {
      background-color: #ff6b35;
      color: #ffffff;
      font-size: 20rpx;
      padding: 4rpx 8rpx;
      border-radius: 10rpx;
      min-width: 32rpx;
      text-align: center;
    }
    
    &.active {
      .tab-text {
        color: #ff6b35;
        font-weight: 600;
      }
      
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 60rpx;
        height: 4rpx;
        background-color: #ff6b35;
        border-radius: 2rpx;
      }
    }
  }
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 32rpx;
  
  text {
    font-size: 28rpx;
    color: #999;
  }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 32rpx;
  
  .error-icon {
    font-size: 80rpx;
    margin-bottom: 24rpx;
  }
  
  .error-text {
    font-size: 28rpx;
    color: #999;
    margin-bottom: 32rpx;
  }
  
  .retry-btn {
    padding: 16rpx 32rpx;
    background-color: #ff6b35;
    color: #ffffff;
    border: none;
    border-radius: 8rpx;
    font-size: 28rpx;
  }
}

.content {
  padding: 24rpx;
}

.orders-list {
  .order-item {
    background-color: #ffffff;
    border-radius: 16rpx;
    padding: 32rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
    
    &.success-item {
      border: 2rpx solid #4caf50;
    }
    
    .order-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24rpx;
      
      .venue-name {
        font-size: 32rpx;
        font-weight: 600;
        color: #333;
      }
      
      .status-badge {
        padding: 8rpx 16rpx;
        border-radius: 20rpx;
        
        .status-text {
          font-size: 24rpx;
          font-weight: 500;
        }
        
        &.open {
          background-color: #e3f2fd;
          color: #1976d2;
        }
        
        &.full {
          background-color: #fff3e0;
          color: #f57c00;
        }
        
        &.confirmed {
          background-color: #e8f5e8;
          color: #4caf50;
        }
        
        &.success {
          background-color: #e8f5e8;
          color: #4caf50;
        }
        
        &.cancelled {
          background-color: #ffebee;
          color: #f44336;
        }
        
        &.pending {
          background-color: #fff3e0;
          color: #f57c00;
        }
        
        &.approved {
          background-color: #e8f5e8;
          color: #4caf50;
        }
        
        &.rejected {
          background-color: #ffebee;
          color: #f44336;
        }
      }
    }
    
    .order-info {
      margin-bottom: 24rpx;
      
      .info-row {
        display: flex;
        margin-bottom: 8rpx;
        align-items: center;
      }
      
      .time-icon,
      .location-icon,
      .team-icon,
      .participants-icon,
      .price-icon,
      .create-icon,
      .message-icon {
        font-size: 28rpx;
        margin-right: 12rpx;
        width: 32rpx;
        text-align: center;
        flex-shrink: 0;
      }
      
      .info-value {
        font-size: 28rpx;
        color: #333;
        flex: 1;
        line-height: 1.4;
      }
    }
    
    .order-actions {
      display: flex;
      gap: 16rpx;
      
      .action-btn {
        padding: 16rpx 24rpx;
        border-radius: 8rpx;
        font-size: 26rpx;
        border: none;
        
        &.manage-btn {
          background-color: #ff6b35;
          color: #ffffff;
        }
        
        &.cancel-btn {
          background-color: #f5f5f5;
          color: #666;
        }
        
        &.contact-btn {
          background-color: #4caf50;
          color: #ffffff;
        }
      }
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 32rpx;
  
  .empty-icon {
    font-size: 80rpx;
    margin-bottom: 24rpx;
  }
  
  .empty-text {
    font-size: 28rpx;
    color: #999;
    margin-bottom: 32rpx;
  }
  
  .create-btn,
  .browse-btn {
    padding: 20rpx 40rpx;
    background-color: #ff6b35;
    color: #ffffff;
    border: none;
    border-radius: 8rpx;
    font-size: 28rpx;
  }
}
</style>