<template>
  <view class="container">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="nav-left" @click="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">我的申请</text>
      <view class="nav-right"></view>
    </view>
    
    <!-- 筛选标签 -->
    <view class="filter-tabs">
      <view 
        v-for="tab in filterTabs" 
        :key="tab.value"
        class="filter-tab"
        :class="{ active: currentFilter === tab.value }"
        @click="switchFilter(tab.value)"
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
      <button class="retry-btn" @click="loadRequests">
        重新加载
      </button>
    </view>
    
    <!-- 申请列表 -->
    <view v-else class="content">
      <view v-if="filteredRequests.length > 0" class="requests-list">
        <view 
          v-for="request in filteredRequests" 
          :key="request.id"
          class="request-item"
          @click="goToSharingDetail(request.sharingOrderId || request.sharingId || request.orderId)"
        >
          <!-- 拼场信息 -->
          <view class="sharing-info">
            <view class="sharing-header">
              <text class="venue-name">{{ request.venueName }}</text>
              <view class="status-badge" :class="getStatusClass(request.status)">
                <text class="status-text">{{ getStatusText(request.status) }}</text>
              </view>
            </view>
            
            <view class="sharing-details">
              <text class="team-name">{{ request.teamName || request.applicantTeamName }}</text>
              <text class="activity-time">{{ request.formattedActivityTime }}</text>
              <text class="price">支付金额 ¥{{ getRequestPrice(request) }}</text>
            </view>
            
            <!-- 参与人数进度 -->
            <view class="participants-progress">
              <view class="progress-info">
                <text class="progress-text">
                  {{ request.currentParticipants }}/{{ request.maxParticipants }}人
                </text>
                <text class="progress-percent">
                  {{ getProgressPercent(request.currentParticipants, request.maxParticipants) }}%
                </text>
              </view>
              <view class="progress-bar">
                <view 
                  class="progress-fill"
                  :style="{ width: getProgressPercent(request.currentParticipants, request.maxParticipants) + '%' }"
                ></view>
              </view>
            </view>
          </view>
          
          <!-- 申请信息 -->
          <view class="request-info">
            <view class="request-meta">
              <text class="request-time">申请时间：{{ formatDateTime(request.createdAt) }}</text>
              <text v-if="request.processedAt" class="process-time">
                处理时间：{{ formatDateTime(request.processedAt) }}
              </text>
            </view>
            
            <!-- 申请操作 -->
            <view class="request-actions">
              <view v-if="request.status === 'PENDING'" class="pending-actions">
                <button 
                  class="action-btn cancel-btn"
                  @click.stop="showCancelConfirm(request)"
                >
                  取消申请
                </button>
              </view>
              
              <view v-else-if="request.status === 'APPROVED_PENDING_PAYMENT'" class="approved-actions">
                <text class="approved-text">已同意，待支付</text>
                <button 
                  class="action-btn join-btn"
                  @click.stop="goToSharingDetail(request.sharingOrderId || request.sharingId || request.orderId)"
                >
                  查看详情
                </button>
              </view>

              <view v-else-if="request.status === 'PAID'" class="approved-actions">
                <text class="approved-text">已支付</text>
                <button 
                  class="action-btn join-btn"
                  @click.stop="goToSharingDetail(request.sharingOrderId || request.sharingId || request.orderId)"
                >
                  查看详情
                </button>
              </view>

              <view v-else-if="request.status === 'APPROVED'" class="approved-actions">
                <text class="approved-text">已完成</text>
                <button 
                  class="action-btn join-btn"
                  @click.stop="goToSharingDetail(request.sharingOrderId || request.sharingId || request.orderId)"
                >
                  查看详情
                </button>
              </view>
              
              <view v-else-if="request.status === 'REJECTED'" class="rejected-actions">
                <text class="rejected-text">申请被拒绝</text>
                <text v-if="request.rejectReason" class="reject-reason">
                  原因：{{ request.rejectReason }}
                </text>
              </view>

              <view v-else-if="request.status === 'TIMEOUT_CANCELLED'" class="rejected-actions">
                <text class="rejected-text">申请已超时</text>
              </view>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view v-else class="empty-state">
        <text class="empty-icon">📝</text>
        <text class="empty-title">{{ getEmptyTitle() }}</text>
        <text class="empty-desc">{{ getEmptyDesc() }}</text>
        <button class="browse-btn" @click="goToSharingList">
          去看看拼场
        </button>
      </view>
    </view>
    
    <!-- 取消申请确认弹窗 -->
    <uni-popup v-if="showCancelPopup" ref="cancelPopup" type="center" :mask-click="false">
      <view class="cancel-modal">
        <view class="modal-header">
          <text class="modal-title">取消申请</text>
        </view>
        <view class="modal-content">
          <text class="modal-text">确定要取消对 {{ cancelTarget ? (cancelTarget.teamName || cancelTarget.applicantTeamName) : '' }} 的申请吗？</text>
          <text class="modal-note">此操作不可撤销</text>
        </view>
        <view class="modal-actions">
          <button class="modal-btn cancel-btn" @click="closeCancelModal">暂不取消</button>
          <button class="modal-btn confirm-btn" @click="confirmCancel">确认取消</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useSharingStore } from '@/stores/sharing.js'
import { useUserStore } from '@/stores/user.js'
import * as sharingApi from '@/api/sharing.js'
import { formatDate, formatDateTime } from '@/utils/helpers.js'
import { onShow, onPullDownRefresh, onLoad } from '@dcloudio/uni-app'

const sharingStore = useSharingStore()
const userStore = useUserStore()

const currentFilter = ref('all')
const error = ref('')
const cancelTarget = ref(null)
const showCancelPopup = ref(false)
const requests = ref([])
const filterTabs = ref([
  { label: '全部', value: 'all', count: 0 },
  { label: '待处理', value: 'pending', count: 0 },
  { label: '待支付', value: 'approved_pending_payment', count: 0 },
  { label: '已完成', value: 'approved', count: 0 },
  { label: '已拒绝', value: 'rejected', count: 0 },
  { label: '已超时', value: 'timeout_cancelled', count: 0 }
])
const lastRefreshTime = ref(0)
const cacheTimeout = 30000 // 30秒缓存
const isRefreshing = ref(false)

const cancelPopup = ref(null) // 用于关联 uni-popup 的 ref

const loading = computed(() => sharingStore.isLoading || false)

const userInfo = computed(() => userStore.userInfoGetter || {})

const filteredRequests = computed(() => {
  if (currentFilter.value === 'all') {
    return requests.value
  }
  
  const statusSets = {
    pending: new Set(['PENDING']),
    approved_pending_payment: new Set(['APPROVED_PENDING_PAYMENT']),
    approved: new Set(['PAID', 'APPROVED']),
    rejected: new Set(['REJECTED']),
    timeout_cancelled: new Set(['TIMEOUT_CANCELLED'])
  }

  const set = statusSets[currentFilter.value]
  if (!set) return requests.value

  return requests.value.filter(request => set.has((request.status || '').toString().toUpperCase()))
})

onLoad(() => {
  loadRequests()
})

onShow(() => {
  loadRequestsWithCache()
})

onPullDownRefresh(() => {
  loadRequests(true).finally(() => {
    uni.stopPullDownRefresh()
  })
})

const showCancelConfirm = (request) => {
  cancelTarget.value = request
  uni.showModal({
    title: '取消申请',
    content: `确定要取消对 ${request ? (request.teamName || request.applicantTeamName || '') : ''} 的申请吗？`,
    confirmText: '确认取消',
    confirmColor: '#ff4d4f',
    cancelText: '暂不取消',
    success: async (res) => {
      if (!res.confirm) {
        cancelTarget.value = null
        return
      }
      await confirmCancel()
    }
  })
    }

    const closeCancelModal = () => {
  showCancelPopup.value = false
  cancelTarget.value = null
    }

const confirmCancel = async () => {
  if (!cancelTarget.value) return

  const requestId = cancelTarget.value.id

  uni.showLoading({
    title: '正在取消...',
    mask: true
  })

  try {
    const success = await sharingStore.cancelSharingRequest(requestId)
    
    if (success) {
      uni.showToast({
        title: '取消成功',
        icon: 'success'
      })
      await loadRequests(true)
    } else {
      throw new Error('取消申请失败，请稍后再试')
    }
  } catch (err) {
    console.error('An error occurred during cancellation:', err)
    const errorMessage = err.message || '取消操作失败，请检查网络或联系客服'
    uni.showToast({
      title: errorMessage,
      icon: 'none',
      duration: 3000
    })
  } finally {
    uni.hideLoading()
    closeCancelModal()
  }
}

const goToSharingDetail = async (sharingIdOrOrderId) => {
  if (!sharingIdOrOrderId) {
    uni.showToast({ title: '订单ID不存在', icon: 'none' })
    return
  }

  let targetSharingId = sharingIdOrOrderId
  try {
    const resp = await sharingApi.getSharingOrderByMainOrderId(sharingIdOrOrderId)
    const data = resp?.data || resp
    if (data?.id) {
      targetSharingId = data.id
    }
  } catch (_e) {}

  uni.navigateTo({ url: `/pages/sharing/detail?id=${targetSharingId}` })
}

const goToSharingList = () => {
  uni.navigateTo({
    url: '/pages/sharing/list'
  })
}

const getProgressPercent = (current, max) => {
  if (!max || max === 0) return 0
  return Math.round((current / max) * 100)
}

const formatRequestsForDisplay = (requestsData) => {
  if (!Array.isArray(requestsData)) {
    return [];
  }
  return requestsData.map(req => {
    let formattedActivityTime = '--';
    if (req.bookingTime) {
      try {
        let bookingTimeStr = req.bookingTime;
        if (typeof bookingTimeStr === 'string' && bookingTimeStr.includes(' ') && !bookingTimeStr.includes('T')) {
          bookingTimeStr = bookingTimeStr.replace(' ', 'T');
        }
        const bookingTime = new Date(bookingTimeStr);

        if (isNaN(bookingTime.getTime())) {
          throw new Error('Invalid Date object');
        }

        const dateStr = bookingTime.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace('/', '-');

        const startTimeStr = bookingTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

        let timeSlot = startTimeStr;
        if (req.startTime && req.endTime) {
          timeSlot = `${req.startTime}-${req.endTime}`;
        } else if (req.endTime) {
          timeSlot = `${startTimeStr}-${req.endTime}`;
        }
        formattedActivityTime = `${dateStr} ${timeSlot}`;
      } catch (error) {
        console.error('时间格式化错误:', error, 'for request:', req);
        formattedActivityTime = '时间格式错误';
      }
    } else {
      const date = formatDate(req.bookingDate, 'MM-DD');
      const timeSlot = formatTimeSlot(req.startTime, req.endTime);
      formattedActivityTime = `${date} ${timeSlot}`;
    }

    return {
      ...req,
      formattedActivityTime: formattedActivityTime
    };
  });
}

const formatTimeSlot = (startTime, endTime) => {
  if (!startTime && !endTime) {
    return '时间未指定'
  }
  if (startTime && !endTime) {
    return startTime
  }
  if (!startTime && endTime) {
    return endTime
  }
  return `${startTime}-${endTime}`
}

const getStatusText = (status) => {
  const statusMap = {
    'PENDING': '待处理',
    'APPROVED_PENDING_PAYMENT': '已批准待支付',
    'APPROVED': '已完成',
    'PAID': '拼场成功',
    'REJECTED': '已拒绝',
    'CANCELLED': '已取消',
    'TIMEOUT_CANCELLED': '超时取消'
  }
  return statusMap[status] || '未知状态'
}

const getStatusClass = (status) => {
  const classMap = {
    'PENDING': 'status-pending',
    'APPROVED_PENDING_PAYMENT': 'status-pending',
    'APPROVED': 'status-approved',
    'PAID': 'status-success',
    'REJECTED': 'status-rejected',
    'CANCELLED': 'status-cancelled',
    'TIMEOUT_CANCELLED': 'status-cancelled'
  }
  return classMap[status] || 'status-unknown'
}

const getEmptyTitle = () => {
  const titleMap = {
    'all': '暂无申请记录',
    'pending': '暂无待处理申请',
    'approved': '暂无已通过申请',
    'rejected': '暂无被拒绝申请'
  }
  return titleMap[currentFilter.value] || '暂无申请记录'
}

const getEmptyDesc = () => {
  const descMap = {
    'all': '快去申请加入感兴趣的拼场吧',
    'pending': '您的申请都已被处理',
    'approved': '暂时没有通过的申请',
    'rejected': '暂时没有被拒绝的申请'
  }
  return descMap[currentFilter.value] || '快去申请加入感兴趣的拼场吧'
}

const getRequestPrice = (request) => {
  if (!request) return '0.00'

  const price = request.paymentAmount || request.pricePerPerson || request.totalPrice || 0
  return typeof price === 'number' ? price.toFixed(2) : '0.00'
}

const switchFilter = (filter) => {
  currentFilter.value = filter
}

const goBack = () => {
  uni.navigateBack()
}

const loadRequests = async (forceRefresh = false) => {
  if (isRefreshing.value) return
  isRefreshing.value = true
  error.value = ''
  
  try {
    // 增加 pageSize 以获取更多数据，确保前端过滤准确
    const response = await sharingStore.getSentRequestsList({ forceRefresh, pageSize: 100 })
    const data = response.data
    requests.value = formatRequestsForDisplay(data || [])
    updateFilterCounts()
    lastRefreshTime.value = Date.now()
  } catch (err) {
    console.error('拼场申请页面：加载申请列表失败:', err)
    error.value = err.message || '加载失败，请稍后重试'
  } finally {
    isRefreshing.value = false
  }
}

const loadRequestsWithCache = () => {
  const now = Date.now()
  if (now - lastRefreshTime.value > cacheTimeout) {
    loadRequests(true)
  } else if (!requests.value || requests.value.length === 0) {
    loadRequests()
  }
}

const updateFilterCounts = () => {
  const counts = {
    all: requests.value.length,
    pending: 0,
    approved_pending_payment: 0,
    approved: 0,
    rejected: 0,
    timeout_cancelled: 0
  }

  const statusMap = {
    'PENDING': 'pending',
    'APPROVED_PENDING_PAYMENT': 'approved_pending_payment',
    'PAID': 'approved',
    'APPROVED': 'approved',
    'REJECTED': 'rejected',
    'TIMEOUT_CANCELLED': 'timeout_cancelled'
  }

  for (const req of requests.value) {
    const filterKey = statusMap[req.status]
    if (filterKey) {
      counts[filterKey]++
    }
  }

  filterTabs.value = filterTabs.value.map(tab => ({
    ...tab,
    count: counts[tab.value] || 0
  }))
}

</script>

<style lang="scss" scoped>
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
}

// 导航栏
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
  
  .nav-left {
    width: 60rpx;
    
    .nav-icon {
      font-size: 40rpx;
      color: #333333;
    }
  }
  
  .nav-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333333;
  }
  
  .nav-right {
    width: 60rpx;
  }
}

// 筛选标签
.filter-tabs {
  display: flex;
  background-color: #ffffff;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  
  .filter-tab {
    display: flex;
    align-items: center;
    padding: 12rpx 20rpx;
    margin-right: 20rpx;
    border-radius: 20rpx;
    background-color: #f5f5f5;
    transition: all 0.3s ease;
    
    &:last-child {
      margin-right: 0;
    }
    
    &.active {
      background-color: #ff6b35;
      
      .tab-text {
        color: #ffffff;
      }
      
      .tab-count {
        background-color: rgba(255, 255, 255, 0.3);
        color: #ffffff;
      }
    }
    
    .tab-text {
      font-size: 26rpx;
      color: #666666;
      transition: color 0.3s ease;
    }
    
    .tab-count {
      font-size: 20rpx;
      color: #ff6b35;
      background-color: #fff7f0;
      padding: 2rpx 8rpx;
      border-radius: 10rpx;
      margin-left: 8rpx;
      min-width: 32rpx;
      text-align: center;
      transition: all 0.3s ease;
    }
  }
}

// 加载状态
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
  
  text {
    font-size: 28rpx;
    color: #999999;
  }
}

// 错误状态
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 200rpx 60rpx;
  
  .error-icon {
    font-size: 120rpx;
    margin-bottom: 30rpx;
  }
  
  .error-text {
    font-size: 28rpx;
    color: #333333;
    text-align: center;
    margin-bottom: 40rpx;
    line-height: 1.4;
  }
  
  .retry-btn {
    width: 200rpx;
    height: 70rpx;
    background-color: #ff6b35;
    color: #ffffff;
    border: none;
    border-radius: 12rpx;
    font-size: 26rpx;
  }
}

// 内容区域
.content {
  padding: 20rpx;
}

// 申请列表
.requests-list {
  .request-item {
    background-color: #ffffff;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
    
    .sharing-info {
      margin-bottom: 24rpx;
      
      .sharing-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16rpx;
        
        .venue-name {
          font-size: 32rpx;
          font-weight: bold;
          color: #333333;
        }
        
        .status-badge {
          padding: 6rpx 12rpx;
          border-radius: 12rpx;
          
          .status-text {
            font-size: 22rpx;
            font-weight: bold;
          }
          
          &.status-pending {
            background-color: #fff7e6;
            .status-text { color: #fa8c16; }
          }
          
          &.status-approved {
            background-color: #f6ffed;
            .status-text { color: #52c41a; }
          }

          &.status-success {
            background-color: #f6ffed;
            .status-text { color: #52c41a; }
          }

          &.status-rejected {
            background-color: #fff2f0;
            .status-text { color: #ff4d4f; }
          }

          &.status-cancelled {
            background-color: #f5f5f5;
            .status-text { color: #999999; }
          }

          &.status-unknown {
            background-color: #f5f5f5;
            .status-text { color: #999999; }
          }
        }
      }
      
      .sharing-details {
        margin-bottom: 16rpx;
        
        .team-name {
          font-size: 28rpx;
          color: #333333;
          font-weight: bold;
          display: block;
          margin-bottom: 8rpx;
        }
        
        .activity-time {
          font-size: 24rpx;
          color: #666666;
          display: block;
          margin-bottom: 6rpx;
        }
        
        .price {
          font-size: 24rpx;
          color: #ff6b35;
          font-weight: bold;
        }
      }
      
      .participants-progress {
        .progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8rpx;
          
          .progress-text {
            font-size: 22rpx;
            color: #666666;
          }
          
          .progress-percent {
            font-size: 20rpx;
            color: #ff6b35;
            font-weight: bold;
          }
        }
        
        .progress-bar {
          height: 6rpx;
          background-color: #f0f0f0;
          border-radius: 3rpx;
          overflow: hidden;
          
          .progress-fill {
            height: 100%;
            background-color: #ff6b35;
            transition: width 0.3s ease;
          }
        }
      }
    }
    
    .request-info {
      .request-meta {
        margin-bottom: 16rpx;
        
        .request-time {
          font-size: 22rpx;
          color: #999999;
          display: block;
          margin-bottom: 4rpx;
        }
        
        .process-time {
          font-size: 22rpx;
          color: #999999;
        }
      }
      
      .request-actions {
        .pending-actions {
          display: flex;
          justify-content: flex-end;
          
          .action-btn {
            padding: 12rpx 24rpx;
            border: none;
            border-radius: 20rpx;
            font-size: 24rpx;
            
            &.cancel-btn {
              background-color: #fff2f0;
              color: #ff4d4f;
            }
          }
        }
        
        .approved-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          
          .approved-text {
            font-size: 24rpx;
            color: #52c41a;
            font-weight: bold;
          }
          
          .action-btn {
            padding: 12rpx 24rpx;
            border: none;
            border-radius: 20rpx;
            font-size: 24rpx;
            
            &.join-btn {
              background-color: #ff6b35;
              color: #ffffff;
            }
          }
        }
        
        .rejected-actions {
          .rejected-text {
            font-size: 24rpx;
            color: #ff4d4f;
            font-weight: bold;
            display: block;
            margin-bottom: 6rpx;
          }
          
          .reject-reason {
            font-size: 22rpx;
            color: #999999;
          }
        }
      }
    }
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 200rpx 60rpx;
  
  .empty-icon {
    font-size: 120rpx;
    margin-bottom: 30rpx;
  }
  
  .empty-title {
    font-size: 32rpx;
    color: #333333;
    font-weight: bold;
    margin-bottom: 16rpx;
  }
  
  .empty-desc {
    font-size: 26rpx;
    color: #999999;
    text-align: center;
    line-height: 1.4;
    margin-bottom: 40rpx;
  }
  
  .browse-btn {
    width: 200rpx;
    height: 70rpx;
    background-color: #ff6b35;
    color: #ffffff;
    border: none;
    border-radius: 12rpx;
    font-size: 26rpx;
  }
}

.cancel-modal {
  width: 600rpx;
  background-color: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
  box-sizing: border-box;

  .modal-header {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 30rpx;

    .modal-title {
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
    }
  }

  .modal-content {
    text-align: center;
    margin-bottom: 40rpx;

    .modal-text {
      font-size: 30rpx;
      color: #666;
      display: block;
      margin-bottom: 10rpx;
    }

    .modal-note {
      font-size: 26rpx;
      color: #999;
    }
  }

  .modal-actions {
    display: flex;
    justify-content: space-between;

    .modal-btn {
      width: 240rpx;
      height: 80rpx;
      line-height: 80rpx;
      text-align: center;
      border-radius: 40rpx;
      font-size: 30rpx;
      border: none;
      outline: none;

      &.cancel-btn {
        background-color: #f0f0f0;
        color: #666;
      }

      &.confirm-btn {
        background-color: #fe3333;
        color: #fff;
      }
    }
  }
}
</style>
