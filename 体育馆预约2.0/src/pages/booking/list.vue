<template>
  <view class="container">
    <!-- 状态筛选 -->
    <view class="status-filter">
      <view 
        v-for="status in statusOptions" 
        :key="status.value" 
        class="filter-item"
        :class="{ active: selectedStatus === status.value }"
        @click="selectStatus(status.value)"
      >
        {{ status.label }}
      </view>
    </view>
    
    <!-- 简单加载提示 -->
    <view v-if="loading" class="simple-loading">
      <text class="loading-text">加载中...</text>
    </view>
    
    <!-- 预约列表 -->
    <view v-if="!loading" class="booking-list">
      <view
        v-for="booking in filteredBookings"
        :key="`booking-${booking.id}`"
        class="booking-card"
        @click="navigateToDetail(booking.id)"
      >
        <view class="card-header">
          <view class="venue-info">
            <!-- 场馆名和类型标识在同一行 -->
            <view class="venue-name-row">
              <text class="venue-name">{{ booking.venueName || '未知场馆' }}</text>
              <!-- 订单类型标识显示在场馆名右边 -->
              <view class="booking-type-tag" v-if="booking.bookingType || booking.type || booking.orderType">
                <text class="tag-text" :class="getBookingTypeClass(booking.bookingType || booking.type || booking.orderType)">
                  {{ getBookingTypeText(booking.bookingType || booking.type || booking.orderType) }}
                </text>
              </view>
              <!-- 虚拟订单标识 -->
              <view class="virtual-order-tag" v-if="isVirtualOrder(booking)">
                <text class="virtual-tag-text">拼场申请</text>
              </view>
            </view>
            <text class="booking-date">{{ formatBookingDate(booking) }}</text>
          </view>
          <view class="booking-status" :class="getStatusClass(booking.status)">
            {{ getStatusText(booking.status) }}
          </view>
        </view>
        
        <view class="card-content">
          <view class="time-info">
            <text class="time-icon">🕐</text>
            <text class="time-text">{{ formatTimeRange(booking) }}</text>
          </view>
          
          <view class="location-info">
            <text class="location-icon">📍</text>
            <text class="location-text">{{ booking.venueLocation || '未知地点' }}</text>
          </view>
          

          
          <view class="order-info">
            <text class="order-icon">📋</text>
            <text class="order-text">订单号：{{ booking.orderNo || (booking.id ? booking.id : '') }}</text>
          </view>
          
          <view class="create-time-info">
            <text class="time-icon">📅</text>
            <text class="create-time-text">创建时间：{{ formatCreateTime(booking && (booking.createdAt || booking.createTime)) }}</text>
          </view>
          
          <view class="price-info">
            <text class="price-label">费用：</text>
            <text class="price-value">¥{{ getBookingPrice(booking) }}</text>
          </view>

          <!-- 倒计时显示（仅拼场订单） -->
          <CountdownTimer
            v-if="shouldShowCountdown(booking)"
            :order="booking"
            label="自动取消"
            :short="true"
            class="simple"
            @expired="onCountdownExpired"
          />
        </view>
        
        <view class="card-actions">
          <!-- 待支付状态 -->
          <template v-if="booking.status === 'PENDING' && !booking.isExpired">
            <button class="action-btn pay-btn" @click.stop="payOrder(booking)">立即支付</button>
            <button class="action-btn cancel-btn" @click.stop="showCancelModal(booking.id)">取消预约</button>
          </template>

          <!-- 已过期状态（优先展示） -->
          <template v-else-if="booking.status === 'EXPIRED' || booking.isExpired">
            <button class="action-btn rebook-btn" @click.stop="rebookVenue(booking)">再次预约</button>
          </template>

          <!-- 已支付状态 -->
          <template v-else-if="booking.status === 'PAID'">
            <button class="action-btn info-btn" @click.stop="viewOrderDetail(booking)">查看详情</button>
            <button class="action-btn cancel-btn" @click.stop="showCancelModal(booking.id)">取消预约</button>
          </template>

          <!-- 拼场相关状态 -->
          <template v-else-if="booking.status === 'OPEN' || booking.status === 'SHARING' || booking.status === 'PENDING_FULL'">
            <button class="action-btn info-btn" @click.stop="viewOrderDetail(booking)">查看详情</button>
            <button class="action-btn participants-btn" @click.stop="viewParticipants(booking)">查看参与者</button>
            <button class="action-btn cancel-btn" @click.stop="showCancelModal(booking.id)">取消预约</button>
          </template>

          <!-- 拼场成功/已满员状态 -->
          <template v-else-if="booking.status === 'SHARING_SUCCESS' || booking.status === 'FULL'">
            <button class="action-btn info-btn" @click.stop="viewOrderDetail(booking)">查看详情</button>
            <button class="action-btn participants-btn" @click.stop="viewParticipants(booking)">查看参与者</button>
          </template>

          <!-- 已确认状态 -->
          <template v-else-if="booking.status === 'CONFIRMED'">
            <button class="action-btn checkin-btn" @click.stop="checkinOrder(booking)">签到</button>
            <button class="action-btn cancel-btn" @click.stop="showCancelModal(booking.id)">取消预约</button>
          </template>

          <!-- 已核销状态 -->
          <template v-else-if="booking.status === 'VERIFIED'">
            <button class="action-btn complete-btn" @click.stop="completeOrder(booking)">完成订单</button>
          </template>

          <!-- 已完成状态 -->
          <template v-else-if="booking.status === 'COMPLETED'">
            <button class="action-btn review-btn" @click.stop="reviewVenue(booking)">评价场馆</button>
            <button class="action-btn rebook-btn" @click.stop="rebookVenue(booking)">再次预约</button>
          </template>

          <!-- 已取消/已过期状态 -->
          <template v-else-if="booking.status === 'CANCELLED' || booking.status === 'EXPIRED'">
            <button class="action-btn rebook-btn" @click.stop="rebookVenue(booking)">再次预约</button>
          </template>
        </view>
      </view>
    </view>
    
    <!-- 空状态 -->
    <view v-if="!loading && filteredBookings.length === 0" class="empty-state">
      <text class="empty-icon">📅</text>
      <text class="empty-text">{{ emptyStateText }}</text>
      <button class="empty-btn" @click="navigateToVenueList">去预约场馆</button>
    </view>
    
    <!-- 加载更多 -->
    <view v-if="!loading && hasMore && filteredBookings.length > 0" class="load-more" @click="loadMore">
      <text v-if="loadingMore">加载中...</text>
      <text v-else>加载更多</text>
    </view>
    
    <!-- 取消预约确认弹窗 -->
    <uni-popup v-if="showCancelPopup" ref="cancelPopup" type="center" :mask-click="false">
      <view class="cancel-modal">
        <view class="modal-header">
          <text class="modal-title">取消预约</text>
        </view>
        
        <view class="modal-content">
          <text class="modal-text">确定要取消这个预约吗？</text>
          <text class="modal-note">取消后可能产生手续费，具体以场馆规定为准</text>
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
import { ref, computed, onMounted, onUnmounted, nextTick, getCurrentInstance } from 'vue'
import { useBookingStore } from '@/stores/booking.js'
import { useUserStore } from '@/stores/user.js'
import { formatDate, formatTime } from '@/utils/helpers.js'
import CountdownTimer from '@/components/CountdownTimer.vue'
import { shouldShowCountdown } from '@/utils/countdown.js'
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
// 使用uni-app自动导入机制

// 使用Pinia stores
const bookingStore = useBookingStore()
const userStore = useUserStore()

// 响应式数据
const selectedStatus = ref('all')

// 优化后的 5 个筛选 Tab（从用户视角归类）
const statusOptions = ref([
  { label: '全部', value: 'all' },
  { label: '待支付', value: 'pending' },
  { label: '进行中', value: 'ongoing' },
  { label: '已完成', value: 'done' },
  { label: '已取消', value: 'closed' }
])

// 每个 Tab 对应的后端状态集合
const statusGroupMap = {
  'all': null, // 全部，不过滤
  'pending': ['PENDING'], // 待支付
  'ongoing': ['PAID', 'CONFIRMED', 'OPEN', 'APPROVED_PENDING_PAYMENT', 'SHARING_SUCCESS', 'FULL', 'PENDING_FULL'], // 进行中
  'done': ['VERIFIED', 'COMPLETED'], // 已完成
  'closed': ['CANCELLED', 'EXPIRED'] // 已取消
}
const currentBookingId = ref(null)
const cancelPopup = ref(null)
const showCancelPopup = ref(false)

// 🔥 修复问题2: 使用computed从store获取loadingMore状态
const loadingMore = computed(() => bookingStore.loadingMore)

// 显示取消弹窗
const showCancelModal = (bookingId) => {
  currentBookingId.value = bookingId
  uni.showModal({
    title: '取消预约',
    content: '确定要取消这个预约吗？取消后可能产生手续费，具体以场馆规定为准',
    confirmText: '确认取消',
    confirmColor: '#ff4d4f',
    cancelText: '暂不取消',
    success: (res) => {
      if (res.confirm) {
        confirmCancel()
      } else {
        currentBookingId.value = null
      }
    }
  })
}

// 计算属性（修复：使用新的getter名称）
const bookingList = computed(() => bookingStore.bookingListGetter)
const loading = computed(() => bookingStore.isLoading)

// 其他响应式数据（简化后保留必要的）
const pagination = computed(() => {
  return bookingStore.getPagination
})

const hasMore = computed(() => {
  return pagination.value.current < pagination.value.totalPages
})

const filteredBookings = computed(() => {
  const bookings = bookingList.value || []
  const currentTab = selectedStatus.value

  // "全部"直接返回
  if (currentTab === 'all') {
    return bookings
  }

  // 根据 Tab 对应的状态集合进行筛选
  const allowedStatuses = statusGroupMap[currentTab]
  if (!allowedStatuses) {
    return bookings
  }

  return bookings.filter(booking => allowedStatuses.includes(booking.status))
})

// 空状态文本
const emptyStateText = computed(() => {
  if (selectedStatus.value === 'all') {
    return '暂无预约记录'
  }
  const statusText = statusOptions.value.find(s => s.value === selectedStatus.value)?.label || ''
  return `暂无${statusText}记录`
})

// 其他计算属性（如果模板中需要使用，可以取消注释）
// const token = computed(() => userStore.getToken)
// const userInfo = computed(() => userStore.userInfoGetter)
// const isLoggedIn = computed(() => userStore.isLoggedIn)

    // 初始化数据
    const initData = async () => {
      // 防止重复调用
      if (loading.value) {
        return;
      }

      try {
        // 优先使用缓存，先秒开，再在后台静默刷新
        const resp = await bookingStore.getUserBookings({
          page: 1,
          pageSize: 10,
          refresh: false // 允许使用缓存，提升首屏速度
        });
        // 后台静默刷新最新数据（不阻塞首屏）
        setTimeout(() => {
          bookingStore.getUserBookings({ page: 1, pageSize: 10, refresh: true, _t: Date.now() }).catch(() => {})
        }, 0)
      } catch (error) {
        console.error('[BookingList] 数据初始化失败:', error)
        uni.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        })
      }
    };

    // 刷新数据（使用缓存机制）
    const refreshDataWithCache = async () => {
      // 防止重复调用
      if (loading.value) {
        return;
      }
      
      try {
        // 使用store的缓存机制
        await bookingStore.getUserBookings({
          page: 1,
          pageSize: 10,
          refresh: false // 允许使用缓存
        });
      } catch (error) {
        console.error('刷新数据失败:', error);
        uni.showToast({
          title: error.message || '刷新数据失败',
          icon: 'none'
        });
      }
    };

    // 刷新数据（强制刷新，清除缓存）
    const refreshData = async () => {
      // 防止重复调用
      if (loading.value) {
        return;
      }
      
      try {
        // 使用store的刷新方法，会清除缓存
        await bookingStore.refreshBookingList();
        uni.stopPullDownRefresh();
      } catch (error) {
        uni.stopPullDownRefresh();
        console.error('刷新数据失败:', error);
        uni.showToast({
          title: error.message || '刷新数据失败',
          icon: 'none'
        });
      }
    };

    // 🔥 修复问题2: 加载更多（优化版）
    const loadMore = async () => {
      if (loading.value || !hasMore.value || loadingMore.value) {
        return
      }

      try {
        const nextPage = pagination.value.current + 1;
        await bookingStore.getUserBookings({ page: nextPage, pageSize: 10 });
      } catch (error) {
        console.error('[BookingList] ❌ 加载更多失败:', error);
        uni.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        })
      }
    };

    // 重试加载（优化版）
    const handleRetry = () => {
      initData()
    }

    // 处理加载超时（优化版）
    const handleTimeout = () => {
      uni.showToast({
        title: '加载超时，请重试',
        icon: 'none'
      })
    }

    // 选择状态（优化版）
    const selectStatus = (status) => {
      selectedStatus.value = status
    };

    // 跳转到详情页
    const navigateToDetail = (bookingId) => {
      uni.navigateTo({
        url: `/pages/booking/detail?id=${bookingId}`
      });
    };

    // 关闭取消弹窗（优化版）
    const closeCancelModal = () => {
      // 先调用uni-popup的close方法
      if (cancelPopup.value) {
        cancelPopup.value.close()
      }
      
      // 然后设置showCancelPopup为false，移除DOM元素
      showCancelPopup.value = false
      currentBookingId.value = null
    };

    // 确认取消
    const confirmCancel = async () => {
      if (!currentBookingId.value) {
        console.error('No booking ID selected for cancellation');
        return;
      }
      
      try {
        uni.showLoading({ title: '取消中...' });

        await bookingStore.cancelBooking(currentBookingId.value);

        uni.hideLoading();
        closeCancelModal();

        uni.showToast({
          title: '取消成功',
          icon: 'success'
        });

        // 刷新数据
        await initData();
      } catch (error) {
        uni.hideLoading();
        console.error('取消预约失败:', error);
        uni.showToast({
          title: error.message || '取消失败',
          icon: 'error'
        });
      }
    };

    // 评价场馆
    const reviewVenue = (booking) => {
      uni.navigateTo({
        url: `/pages/venue/review?venueId=${booking.venueId}&bookingId=${booking.id}`
      });
    };

    // 再次预约
    const rebookVenue = (booking) => {
      uni.navigateTo({
        url: `/pages/venue/detail?id=${booking.venueId}`
      });
    };

    // 跳转到场馆列表
    const navigateToVenueList = () => {
      uni.switchTab({
        url: '/pages/venue/list'
      });
    };

    // 格式化日期
    const formatDateFunc = (date) => {
      if (!date) return '';
      return formatDate(date, 'MM-DD dddd');
    };

    // 格式化创建时间
    const formatCreateTime = (datetime) => {
      return formatTime(datetime, 'YYYY-MM-DD HH:mm');
    };

    // 获取状态样式类
    const getStatusClass = (status) => {
      const statusMap = {
        // 基础状态样式
        'PENDING': 'status-pending',
        'PAID': 'status-paid',
        'CONFIRMED': 'status-confirmed',
        'VERIFIED': 'status-verified',
        'COMPLETED': 'status-completed',
        'CANCELLED': 'status-cancelled',
        'EXPIRED': 'status-expired',

        // 拼场状态样式
        'OPEN': 'status-open',
        'APPROVED_PENDING_PAYMENT': 'status-approved-pending-payment',
        'SHARING_SUCCESS': 'status-sharing-success',
        'PENDING_FULL': 'status-pending-full',
        'FULL': 'status-full'
      };
      return statusMap[status] || 'status-pending';
    };

    // 获取状态文本（卡片上的标签文字，贴近用户语言）
    const getStatusText = (status) => {
      const statusMap = {
        // 基础状态
        'PENDING': '待支付',
        'PAID': '已支付，待确认',
        'CONFIRMED': '待使用',
        'VERIFIED': '已核销',
        'COMPLETED': '已完成',
        'CANCELLED': '已取消',
        'EXPIRED': '已过期',

        // 拼场订单特有状态（在「进行中」Tab 内通过标签区分）
        'OPEN': '拼场中',
        'APPROVED_PENDING_PAYMENT': '等待对方付款',
        'SHARING_SUCCESS': '拼场成功',
        'PENDING_FULL': '待满员',
        'FULL': '已满员'
      };
      return statusMap[status] || '待支付';
    };

    // 格式化时间范围显示
    const formatTimeRange = (booking) => {
      // 检查是否是虚拟订单
      const bookingId = typeof booking.id === 'string' ? parseInt(booking.id) : booking.id;
      const isVirtual = bookingId < 0;

      if (isVirtual) {
        // 虚拟订单使用预约列表API返回的 startTime 和 endTime 字段 (格式: "HH:mm")
        const startTime = booking.startTime;
        const endTime = booking.endTime;


        if (!startTime) return '时间待定';

        try {
          // 预约列表API返回的时间格式是 "HH:mm"，可以直接使用
          const startTimeStr = startTime;
          const endTimeStr = endTime;

          if (endTimeStr) {
            return `${startTimeStr} - ${endTimeStr}`;
          } else {
            return startTimeStr;
          }
        } catch (error) {
          console.error('虚拟订单时间格式化错误:', error);
          return '时间待定';
        }
      } else {
        // 🔧 修复：普通订单（包场/拼场）使用正确的API字段
        // 优先使用预约列表API返回的字段，然后是详情API字段
        const startTime = booking.startTime || booking.bookingStartTime || booking.timeSlotStartTime;
        const endTime = booking.endTime || booking.bookingEndTime || booking.timeSlotEndTime;
        const timeSlotCount = booking.timeSlotCount || booking.slotCount || 1;

        if (!startTime || !endTime) {
          return '时间待定';
        }

        const formatTime = (timeStr) => {
          if (!timeStr) return '';
          // 处理完整时间戳格式 (如: "2024-01-01T09:00:00")
          if (timeStr.includes('T')) {
            return timeStr.split('T')[1].substring(0, 5);
          }
          // 处理时间格式 (如: "09:00:00" 或 "09:00")
          if (timeStr.length > 5 && timeStr.includes(':')) {
            return timeStr.substring(0, 5);
          }
          return timeStr;
        };

        const formattedStart = formatTime(startTime);
        const formattedEnd = formatTime(endTime);

        if (timeSlotCount > 1) {
          return `${formattedStart} - ${formattedEnd} (${timeSlotCount}个时段)`;
        }

        return `${formattedStart} - ${formattedEnd}`;
      }
    }

    // 获取预约类型文本
    const getBookingTypeText = (bookingType) => {
      const typeMap = {
        'EXCLUSIVE': '包场',
        'SHARED': '拼场'
      };
      return bookingType ? (typeMap[bookingType] || '普通') : '普通';
    };

    // 获取预约类型样式类
    const getBookingTypeClass = (bookingType) => {
      const classMap = {
        'EXCLUSIVE': 'tag-exclusive',
        'SHARED': 'tag-shared'
      };
      return bookingType ? (classMap[bookingType] || 'tag-default') : 'tag-default';
    };

    // 检查是否是虚拟订单
    const isVirtualOrder = (booking) => {
      if (!booking) return false;
      const bookingId = typeof booking.id === 'string' ? parseInt(booking.id) : booking.id;
      return bookingId < 0;
    };

    // 获取订单价格（兼容虚拟订单和普通订单）
    const getBookingPrice = (booking) => {
      if (!booking) return '0.00';

      // 检查是否是虚拟订单（负数ID）
      const virtualOrder = isVirtualOrder(booking);

      let price;
      if (virtualOrder) {
        // 虚拟订单使用 paymentAmount
        price = booking.paymentAmount || 0;
      } else {
        // 普通订单使用 totalPrice
        price = booking.totalPrice || 0;
      }

      return price.toFixed(2);
    };

    // 格式化预约日期（兼容虚拟订单和普通订单）
    const formatBookingDate = (booking) => {
      if (!booking) return '';

      // 检查是否是虚拟订单
      const virtualOrder = isVirtualOrder(booking);

      if (virtualOrder) {
        // 虚拟订单从 bookingTime 中提取日期
        const bookingTime = booking.bookingTime;
        if (!bookingTime) return '';

        try {
          let dateTime;
          if (typeof bookingTime === 'string') {
            let isoTime = bookingTime;
            if (bookingTime.includes(' ') && !bookingTime.includes('T')) {
              isoTime = bookingTime.replace(' ', 'T');
            }
            dateTime = new Date(isoTime);
          } else {
            dateTime = new Date(bookingTime);
          }

          if (isNaN(dateTime.getTime())) {
            console.error('虚拟订单日期格式化错误 - 无效的时间:', bookingTime);
            return '';
          }

          return dateTime.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/\//g, '-');
        } catch (error) {
          console.error('虚拟订单日期格式化错误:', error);
          return '';
        }
      } else {
        // 普通订单使用 bookingDate 字段
        if (booking.bookingDate) {
          return formatDate(booking.bookingDate);
        }
        return '';
      }
    };

    // 🔥 修复问题1: 先定义变量，避免作用域问题
    let needForceRefresh = false;
    let lastShowTime = 0; // 记录上次显示时间
    const REFRESH_INTERVAL = 3000; // 3秒内不重复刷新

    // 处理预约创建事件
    const handleBookingCreated = (eventData) => {

      // 🔥 修复: 标记需要强制刷新,绕过节流机制
      needForceRefresh = true;

      // 🔥 修复问题2: 重置上次显示时间，确保下次onShow时会刷新
      lastShowTime = 0;

      // 🔥 关键修复：直接调用刷新，不使用setTimeout
      bookingStore.clearCache('bookingList');

      bookingStore.getUserBookings({
        page: 1,
        refresh: true,
        force: true,
        _t: Date.now() // 🔥 添加时间戳，确保每次请求都有唯一的key，避免被去重机制阻塞
      })
        .then(result => {
        })
        .catch(error => {
          console.error('[BookingList] ❌ 处理预约创建事件失败:', error);
          console.error('[BookingList] 错误堆栈:', error.stack);
        });
    };

    // 处理订单取消事件
    const handleOrderCancelled = (eventData) => {
      
      // 标记需要强制刷新,绕过节流机制
      needForceRefresh = true;

      // 🔥 修复问题1: 重置上次显示时间，确保下次onShow时会刷新
      lastShowTime = 0;

      // 🔥 关键修复：直接调用刷新，不使用setTimeout
      bookingStore.clearCache('bookingList');

      // 更新本地列表状态
      try {
        if (eventData && eventData.orderId) {
          const idx = bookingStore.bookingList.findIndex(b => b.id === eventData.orderId || b.orderNo === eventData.orderId)
          if (idx > -1) {
            bookingStore.bookingList[idx] = { ...bookingStore.bookingList[idx], status: 'CANCELLED' }
          }
        }
      } catch (e) {}
    };

    // 处理订单过期事件
    const handleOrderExpired = (eventData) => {
      // 标记需要强制刷新
      needForceRefresh = true;
      lastShowTime = 0;
      
      // 更新本地列表状态
      try {
        if (eventData && eventData.orderId) {
          const idx = bookingStore.bookingList.findIndex(b => b.id === eventData.orderId || b.orderNo === eventData.orderNo)
          if (idx > -1) {
            // 设置过期标记，触发模板重新渲染
            const updatedBooking = { ...bookingStore.bookingList[idx], status: 'EXPIRED', isExpired: true };
            bookingStore.bookingList.splice(idx, 1, updatedBooking);
          }
        }
      } catch (e) {
        console.error('处理订单过期事件失败:', e);
      }
    };

    onMounted(() => {
      // 初始化数据
      initData();

      // 监听预约创建事件
      uni.$on('bookingCreated', handleBookingCreated);

      // 🔥 修复问题1&3: 监听订单取消事件
      uni.$on('orderCancelled', handleOrderCancelled);
      
      // 监听订单过期事件
      uni.$on('order-expired', handleOrderExpired);
    });

    onUnmounted(() => {
      // 清理引用
      currentBookingId.value = null
      cancelPopup.value = null

      // 移除事件监听
      uni.$off('bookingCreated', handleBookingCreated);

      // 🔥 修复问题1&3: 移除订单取消事件监听
      uni.$off('orderCancelled', handleOrderCancelled);
      
      // 移除订单过期事件监听
      uni.$off('order-expired', handleOrderExpired);
    });

    onShow(async () => {
      const now = Date.now();
      const timeSinceLastShow = now - lastShowTime;

      // 🔥 修复问题1: 如果有强制刷新标记,立即刷新
      if (needForceRefresh) {
        needForceRefresh = false; // 重置标记
        lastShowTime = now;
        try {
          await bookingStore.refreshBookingList();
        } catch (error) {
          console.error('[BookingList] ❌ 强制刷新失败:', error);
        }
        return;
      }

      // 🔥 优化: 如果距离上次显示不到3秒，使用缓存数据
      if (timeSinceLastShow < REFRESH_INTERVAL && bookingStore.bookingList.length > 0) {
        lastShowTime = now;
        return;
      }

      // 🔥 优化: 超过3秒或首次显示，才刷新数据
      try {
        await bookingStore.refreshBookingList();
        lastShowTime = now;
      } catch (error) {
        console.error('[BookingList] ❌ 刷新预约列表失败:', error);
      }
    })

    onPullDownRefresh(async () => {
       await refreshData();
     });

    onReachBottom(() => {
      loadMore();
    });

    // 倒计时相关方法
    const shouldShowCountdownFunc = (order) => {
      return shouldShowCountdown(order);
    };

    const onCountdownExpired = (_order) => {
      // 刷新数据，更新订单状态
      initData();
    };

    // 支付订单
    const payOrder = (booking) => {
      uni.navigateTo({
        url: `/pages/payment/index?orderId=${booking.id}&type=booking`
      });
    };

    // 查看订单详情
    const viewOrderDetail = (booking) => {
      uni.navigateTo({
        url: `/pages/booking/detail?id=${booking.id}`
      });
    };

    // 查看参与者
    const viewParticipants = (booking) => {
      uni.navigateTo({
        url: `/pages/sharing/participants?orderId=${booking.id}`
      });
    };

    // 签到
    const checkinOrder = (_booking) => {
      uni.showModal({
        title: '确认签到',
        content: '确认已到达场馆并开始使用？',
        success: (res) => {
          if (res.confirm) {
            // TODO: 调用签到API
            uni.showToast({
              title: '签到成功',
              icon: 'success'
            });
            initData(); // 刷新数据
          }
        }
      });
    };

    // 完成订单
    const completeOrder = (_booking) => {
      uni.showModal({
        title: '完成订单',
        content: '确认完成此次预约？',
        success: (res) => {
          if (res.confirm) {
            // TODO: 调用完成订单API
            uni.showToast({
              title: '订单已完成',
              icon: 'success'
            });
            initData(); // 刷新数据
          }
        }
      });
    };


</script>


<style lang="scss" scoped>
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
}

// 状态筛选（优化为 5 个 Tab，均匀分布）
.status-filter {
  display: flex;
  background-color: #ffffff;
  padding: 20rpx 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
  
  .filter-item {
    flex: 1;
    text-align: center;
    padding: 16rpx 0;
    font-size: 28rpx;
    color: #666666;
    position: relative;
    white-space: nowrap;
    
    &.active {
      color: #ff6b35;
      font-weight: 600;
      
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 48rpx;
        height: 4rpx;
        background-color: #ff6b35;
        border-radius: 2rpx;
      }
    }
  }
}

// 预约列表
.booking-list {
  padding: 20rpx 30rpx;
  
  .booking-card {
    background-color: #ffffff;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24rpx;
      
      .venue-info {
        flex: 1;

        .venue-name-row {
          display: flex;
          align-items: center;
          margin-bottom: 8rpx;

          .venue-name {
            font-size: 32rpx;
            font-weight: 600;
            color: #333333;
            margin-right: 12rpx;
          }

          .booking-type-tag {
            display: inline-block;

            .tag-text {
              font-size: 20rpx;
              padding: 4rpx 12rpx;
              border-radius: 12rpx;
              border: 1rpx solid;

              // 拼场样式
              &.tag-shared {
                color: #ff6b35;
                background-color: #fff7e6;
                border-color: #ff6b35;
              }

              // 包场样式
              &.tag-exclusive {
                color: #1890ff;
                background-color: #e6f7ff;
                border-color: #1890ff;
              }

              // 默认样式
              &.tag-default {
                color: #666666;
                background-color: #f5f5f5;
                border-color: #d9d9d9;
              }
            }
          }

          // 虚拟订单标识
          .virtual-order-tag {
            display: inline-block;
            margin-left: 8rpx;

            .virtual-tag-text {
              font-size: 20rpx;
              padding: 4rpx 12rpx;
              border-radius: 12rpx;
              color: #722ed1;
              background-color: #f9f0ff;
              border: 1rpx solid #722ed1;
            }
          }
        }

        .booking-date {
          font-size: 24rpx;
          color: #666666;
          margin-bottom: 8rpx;
        }
      }
      
      .booking-status {
        font-size: 22rpx;
        padding: 8rpx 16rpx;
        border-radius: 16rpx;
        
        // 基础状态样式
        &.status-pending {
          background-color: #fff7e6;
          color: #fa8c16;
        }

        &.status-paid {
          background-color: #e6f7ff;
          color: #1890ff;
        }

        &.status-confirmed {
          background-color: #e6f7ff;
          color: #1890ff;
        }

        &.status-verified {
          background-color: #f6ffed;
          color: #52c41a;
        }

        &.status-completed {
          background-color: #f6ffed;
          color: #52c41a;
        }

        &.status-cancelled {
          background-color: #fff2f0;
          color: #ff4d4f;
        }

        &.status-expired {
          background-color: #f5f5f5;
          color: #8c8c8c;
        }

        // 拼场状态样式
        &.status-sharing {
          background-color: #fff0f6;
          color: #eb2f96;
        }

        &.status-sharing-success {
          background-color: #f6ffed;
          color: #52c41a;
        }

        &.status-open {
          background-color: #fff0f6;
          color: #eb2f96;
        }

        &.status-pending-full {
          background-color: #fff7e6;
          color: #fa8c16;
        }

        &.status-full {
          background-color: #f6ffed;
          color: #52c41a;
        }
      }
    }
    
    .card-content {
      margin-bottom: 24rpx;
      
      .time-info,
      .location-info,
      .order-info,
      .create-time-info,
      .price-info {
        display: flex;
        align-items: center;
        margin-bottom: 16rpx;
        
        &:last-child {
          margin-bottom: 0;
        }
      }
      
      .time-icon,
      .location-icon,
      .order-icon {
        font-size: 24rpx;
        margin-right: 12rpx;
      }
      
      .time-text,
      .location-text,
      .order-text,
      .create-time-text {
        font-size: 26rpx;
        color: #666666;
      }
      
      .price-info {
        .price-label {
          font-size: 26rpx;
          color: #666666;
        }

        .price-value {
          font-size: 28rpx;
          color: #ff6b35;
          font-weight: 600;
          margin-left: 8rpx;
        }
      }

      // 倒计时样式
      .countdown-container {
        margin-top: 12rpx;
        display: flex;
        align-items: center;

        &.simple {
          padding: 8rpx 12rpx;
          font-size: 22rpx;
          border-radius: 8rpx;

          .countdown-icon {
            font-size: 24rpx;
            margin-right: 6rpx;
          }

          .countdown-content {
            display: flex;
            align-items: center;

            .countdown-label {
              font-size: 20rpx;
              margin-right: 6rpx;
            }

            .countdown-time {
              font-size: 22rpx;
              font-weight: bold;
            }
          }
        }
      }
    }
    
    .card-actions {
      display: flex;
      justify-content: flex-end;
      
      .action-btn {
        padding: 12rpx 24rpx;
        border-radius: 8rpx;
        font-size: 24rpx;
        margin-left: 16rpx;
        border: 1rpx solid;
        
        &.cancel-btn {
          background-color: transparent;
          color: #ff4d4f;
          border-color: #ff4d4f;
        }

        &.pay-btn {
          background-color: #ff6b35;
          color: #ffffff;
          border-color: #ff6b35;
        }

        &.info-btn {
          background-color: transparent;
          color: #1890ff;
          border-color: #1890ff;
        }
        
        &.share-btn {
          background-color: #ff6b35;
          color: #ffffff;
          border-color: #ff6b35;
        }
        
        &.review-btn {
          background-color: transparent;
          color: #1890ff;
          border-color: #1890ff;
        }
        
        &.rebook-btn {
          background-color: #ff6b35;
          color: #ffffff;
          border-color: #ff6b35;
        }

        &.participants-btn {
          background-color: transparent;
          color: #722ed1;
          border-color: #722ed1;
        }

        &.checkin-btn {
          background-color: #52c41a;
          color: #ffffff;
          border-color: #52c41a;
        }

        &.complete-btn {
          background-color: #1890ff;
          color: #ffffff;
          border-color: #1890ff;
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
  padding: 120rpx 60rpx;
  
  .empty-icon {
    font-size: 120rpx;
    margin-bottom: 30rpx;
    opacity: 0.3;
  }
  
  .empty-text {
    font-size: 28rpx;
    color: #999999;
    margin-bottom: 40rpx;
  }
  
  .empty-btn {
    padding: 16rpx 40rpx;
    background-color: #ff6b35;
    color: #ffffff;
    border: none;
    border-radius: 8rpx;
    font-size: 26rpx;
  }
}

// 加载更多
.load-more {
  text-align: center;
  padding: 40rpx;
  font-size: 28rpx;
  color: #666666;
}

// 弹窗通用样式
.cancel-modal,
.share-modal {
  width: 600rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  
  .modal-header {
    padding: 30rpx;
    text-align: center;
    border-bottom: 1rpx solid #f0f0f0;
    
    .modal-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
    }
  }
  
  .modal-actions {
    display: flex;
    border-top: 1rpx solid #f0f0f0;
    
    .modal-btn {
      flex: 1;
      height: 100rpx;
      border: none;
      font-size: 28rpx;
      
      &.cancel-btn {
        background-color: #f5f5f5;
        color: #666666;
      }
      
      &.confirm-btn {
        background-color: #ff6b35;
        color: #ffffff;
      }
    }
  }
}

// 取消弹窗
.cancel-modal {
  .modal-content {
    padding: 40rpx 30rpx;
    text-align: center;
    
    .modal-text {
      display: block;
      font-size: 28rpx;
      color: #333333;
      margin-bottom: 16rpx;
    }
    
    .modal-note {
      font-size: 24rpx;
      color: #999999;
    }
  }
}

// 拼场弹窗
.share-modal {
  .share-form {
    padding: 30rpx;
    
    .form-item {
      margin-bottom: 30rpx;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .form-label {
        display: block;
        font-size: 28rpx;
        color: #333333;
        margin-bottom: 16rpx;
      }
      
      .form-input,
      .picker-text {
        width: 100%;
        height: 80rpx;
        border: 1rpx solid #e0e0e0;
        border-radius: 8rpx;
        padding: 0 20rpx;
        font-size: 28rpx;
        background-color: #ffffff;
      }
      
      .picker-text {
        display: flex;
        align-items: center;
        color: #333333;
      }
      
      .form-textarea {
        width: 100%;
        min-height: 120rpx;
        border: 1rpx solid #e0e0e0;
        border-radius: 8rpx;
        padding: 20rpx;
        font-size: 28rpx;
        background-color: #ffffff;
      }
    }
  }
}
/* 骨架屏样式 */
.skeleton-line {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-load-more {
  height: 20px;
  border-radius: 10px;
  margin: 10px auto;
  width: 80px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 加载更多骨架屏 */
.loading-more-skeleton {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

/* 优化加载状态的过渡效果 */
.booking-list {
  transition: opacity 0.3s ease-in-out;
}

.empty-state {
  transition: opacity 0.3s ease-in-out;
}

.load-more {
  transition: all 0.3s ease-in-out;
}

/* 错误状态样式 */
.error-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.error-text {
  font-size: 16px;
  margin-bottom: 20px;
  color: #666;
}

.retry-btn {
  background: #ff6b35;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 10px 24px;
  font-size: 14px;
}

</style>
