<template>
  <view class="container">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="nav-left" @click="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">收到的申请</text>
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
              <text class="team-name">{{ request.teamName }}</text>
              <text class="activity-time">{{ formatActivityTime(request) }}</text>
              <text class="price">人均 ¥{{ request.pricePerPerson }}</text>
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
          
          <!-- 申请人信息 -->
          <view class="applicant-info">
            <view class="applicant-header">
              <view class="applicant-avatar">
                <image 
                  v-if="request.applicantAvatar" 
                  :src="request.applicantAvatar" 
                  class="avatar-img"
                />
                <text v-else class="avatar-placeholder">{{ getAvatarText(request.applicantName) }}</text>
              </view>
              <view class="applicant-details">
                <text class="applicant-name">{{ request.applicantName }}</text>
                <text class="apply-time">申请时间：{{ formatDateTime(request.createdAt) }}</text>
              </view>
            </view>
            
            <!-- 申请留言 -->
            <view v-if="request.message" class="apply-message">
              <text class="message-label">申请留言：</text>
              <text class="message-content">{{ request.message }}</text>
            </view>
          </view>
          
          <!-- 申请操作 -->
          <view class="request-actions">
            <view v-if="request.status === 'PENDING'" class="pending-actions">
              <button 
                class="action-btn reject-btn"
                @click="showRejectDialog(request)"
              >
                拒绝
              </button>
              <button 
                class="action-btn approve-btn"
                @click="showApproveConfirm(request)"
              >
                同意
              </button>
            </view>
            
            <view v-else-if="request.status === 'APPROVED'" class="processed-actions">
              <text class="processed-text">已同意</text>
              <text class="process-time">{{ formatDateTime(request.processedAt) }}</text>
            </view>
            
            <view v-else-if="request.status === 'REJECTED'" class="processed-actions">
              <text class="processed-text rejected">已拒绝</text>
              <text class="process-time">{{ formatDateTime(request.processedAt) }}</text>
              <text v-if="request.rejectReason" class="reject-reason">
                拒绝原因：{{ request.rejectReason }}
              </text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view v-else class="empty-state">
        <text class="empty-icon">📬</text>
        <text class="empty-title">{{ getEmptyTitle() }}</text>
        <text class="empty-desc">{{ getEmptyDesc() }}</text>
        <button class="create-btn" @click="goToCreateSharing">
          创建拼场
        </button>
      </view>
    </view>
    
    <!-- 同意申请确认弹窗 -->
    <uni-popup ref="approvePopup" id="approvePopup" type="dialog" :mask-click="false" v-show="internalApprovePopupOpened" :class="approvePopupPosition">
      <uni-popup-dialog 
        type="info"
        title="同意申请"
        :content="`确定同意 ${approveTarget?.applicantName} 的申请吗？`"
        @confirm="confirmApprove"
        @close="() => { approveTarget = null }"
      ></uni-popup-dialog>
    </uni-popup>
    
    <!-- 拒绝申请弹窗 -->
    <uni-popup ref="rejectPopup" id="rejectPopup" type="bottom" :mask-click="false" v-show="internalRejectPopupOpened" :class="rejectPopupPosition">
      <view class="reject-dialog">
        <view class="dialog-header">
          <text class="dialog-title">拒绝申请</text>
          <text class="close-btn" @click="closeRejectDialog">✕</text>
        </view>
        
        <view class="dialog-content">
          <view class="applicant-info">
            <text class="applicant-name">申请人：{{ rejectTarget?.applicantName }}</text>
          </view>
          
          <view class="reason-section">
            <text class="reason-label">拒绝原因（可选）</text>
            <textarea 
              v-model="rejectReason"
              class="reason-input"
              placeholder="请输入拒绝原因..."
              maxlength="100"
            ></textarea>
            <text class="char-count">{{ rejectReason.length }}/100</text>
          </view>
        </view>
        
        <view class="dialog-actions">
          <button class="cancel-btn" @click="closeRejectDialog">
            取消
          </button>
          <button class="confirm-btn" @click="confirmReject">
            确定拒绝
          </button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { useSharingStore } from '@/stores/sharing.js'
import { useUserStore } from '@/stores/user.js'
import { formatDate, formatDateTime } from '@/utils/helpers.js'
// 已移除popup-protection相关导入

export default {
  name: 'ReceivedRequests',
  
  data() {
    return {
      sharingStore: null,
      userStore: null,
      currentFilter: 'all',
      error: '',
      approveTarget: null,
      rejectTarget: null,
      rejectReason: '',
      requests: [],
      filterTabs: [
        { label: '全部', value: 'all', count: 0 },
        { label: '待处理', value: 'pending', count: 0 },
        { label: '已同意', value: 'approved', count: 0 },
        { label: '已拒绝', value: 'rejected', count: 0 }
      ],
      // 缓存优化相关字段
      lastRefreshTime: 0,
      cacheTimeout: 30000, // 30秒缓存
      isRefreshing: false,
      // 弹窗状态控制
      internalApprovePopupOpened: false,
      internalRejectPopupOpened: false,
      approvePopupPosition: '',
      rejectPopupPosition: '',
      _approvePopupRef: null,
      _rejectPopupRef: null
    }
  },
  
  computed: {
    loading() {
      return this.sharingStore?.isLoading || false
    },

    userInfo() {
      return this.userStore?.userInfoGetter || {}
    },
    
    // 过滤后的申请列表
    filteredRequests() {
      if (this.currentFilter === 'all') {
        return this.requests
      }
      
      const statusMap = {
        'pending': 'PENDING',
        'approved': 'APPROVED',
        'rejected': 'REJECTED'
      }
      
      return this.requests.filter(request => 
        request.status === statusMap[this.currentFilter]
      )
    }
  },
  
  onLoad() {
    // 已移除popup-protection相关调用
    
    // 初始化Pinia stores
    this.sharingStore = useSharingStore()
    this.userStore = useUserStore()

    // 初始化弹窗状态
    this.internalApprovePopupOpened = false
    this.internalRejectPopupOpened = false
    this.approvePopupPosition = ''
    this.rejectPopupPosition = ''
    this._approvePopupRef = null
    this._rejectPopupRef = null
    
    // 缓存弹窗实例
    this.$nextTick(() => {
      if (this.$refs.approvePopup) {
        this._approvePopupRef = this.$refs.approvePopup
      }
      if (this.$refs.rejectPopup) {
        this._rejectPopupRef = this.$refs.rejectPopup
      }
    })

    this.loadRequests()
  },
  
  onShow() {
    // 使用缓存优化，避免频繁刷新
    this.loadRequestsWithCache()
  },
  
  onPullDownRefresh() {
    this.loadRequests().finally(() => {
      uni.stopPullDownRefresh()
    })
  },
  
  onUnload() {
    // 已移除popup-protection相关调用
    
    // 清理弹窗缓存引用
    this._approvePopupRef = null
    this._rejectPopupRef = null
  },
  
  mounted() {
    // 已移除popup-protection相关调用
  },
  
  methods: {
    
    // 返回上一页
    goBack() {
      uni.navigateBack()
    },
    
    // 🚀 缓存优化的申请列表加载
    async loadRequestsWithCache() {
      // 防重复请求
      if (this.isRefreshing) {
        return
      }

      // 检查缓存有效性
      const now = Date.now()
      if (this.requests.length > 0 && 
          this.lastRefreshTime && 
          (now - this.lastRefreshTime) < this.cacheTimeout) {
        return
      }

      await this.loadRequests()
    },

    // 加载申请列表
    async loadRequests() {
      this.isRefreshing = true
      
      try {
        this.error = ''
        
        // 调用真实API
        const response = await this.sharingStore.getReceivedRequestsList()
        // 从响应中提取数组数据
        const requests = response?.data || response?.list || response || []
        this.requests = Array.isArray(requests) ? requests : []
        
        // 更新筛选标签计数
        this.updateFilterCounts()
        
        // 更新缓存时间
        this.lastRefreshTime = Date.now()
        
        
      } catch (error) {
        console.error('收到申请页面：加载申请列表失败:', error)
        this.error = error.message || '加载失败，请重试'
        this.requests = []
      } finally {
        this.isRefreshing = false
      }
    },
    

    
    // 更新筛选标签计数
    updateFilterCounts() {
      const counts = {
        all: this.requests.length,
        pending: this.requests.filter(r => r.status === 'PENDING').length,
        approved: this.requests.filter(r => r.status === 'APPROVED').length,
        rejected: this.requests.filter(r => r.status === 'REJECTED').length
      }
      
      this.filterTabs.forEach(tab => {
        tab.count = counts[tab.value] || 0
      })
    },
    
    // 切换筛选
    switchFilter(filter) {
      this.currentFilter = filter
    },
    
    // 显示同意确认弹窗
    showApproveConfirm(request) {
      this.approveTarget = request
      uni.showModal({
        title: '同意申请',
        content: `确定同意 ${request?.applicantName || ''} 的申请吗？`,
        confirmText: '同意',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.confirmApprove()
          } else {
            this.approveTarget = null
          }
        }
      })
    },
    
    // 显示同意确认弹窗（兼容微信小程序）
    showApprovePopup() {
      // 强制使用备选方案：通过 v-show 控制弹窗显示，绕过 uni-popup 的 open 方法
      this.internalApprovePopupOpened = true
      
      // 尝试调用 open 方法以确保动画效果（如果组件引用存在）
      this.$nextTick(() => {
        const attemptOpen = () => {
          if (this.$refs.approvePopup && typeof this.$refs.approvePopup.open === 'function') {
            this.$refs.approvePopup.open()
            return true
          }
          if (Array.isArray(this.$refs.approvePopup) && this.$refs.approvePopup.length > 0) {
            this.$refs.approvePopup[0].open()
            return true
          }
          return false
        }
        
        attemptOpen()
      })
    },

    // 显示拒绝对话框（兼容微信小程序）
    showRejectDialog(request) {
      this.rejectTarget = request
      this.rejectReason = ''
      uni.showModal({
        title: '拒绝申请',
        content: `确定拒绝 ${request?.applicantName || ''} 的申请吗？`,
        confirmText: '拒绝',
        confirmColor: '#ff4d4f',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.confirmReject()
          } else {
            this.closeRejectDialog()
          }
        }
      })
    },
    
    // 显示拒绝对话框（兼容微信小程序）
    showRejectPopup() {
      // 强制使用备选方案：通过 v-show 控制弹窗显示
      this.internalRejectPopupOpened = true
      
      
      // 尝试调用 open 方法以确保动画效果
      this.$nextTick(() => {
        const attemptOpen = () => {
          if (this.$refs.rejectPopup && typeof this.$refs.rejectPopup.open === 'function') {
            this.$refs.rejectPopup.open()
            return true
          }
          if (Array.isArray(this.$refs.rejectPopup) && this.$refs.rejectPopup.length > 0) {
            this.$refs.rejectPopup[0].open()
            return true
          }
          return false
        }
        
        attemptOpen()
      })
    },
    
    // 关闭拒绝对话框
    closeRejectDialog() {
      this.internalRejectPopupOpened = false
      this.rejectTarget = null
      this.rejectReason = ''
    },
    
    // 关闭拒绝对话框（兼容微信小程序）
    closeRejectPopup() {
      const debugEnabled = false // 调试开关
      
      // 获取环境信息
      let windowInfo, deviceInfo, appBaseInfo
      try {
        windowInfo = uni.getWindowInfo ? uni.getWindowInfo() : {}
        deviceInfo = uni.getDeviceInfo ? uni.getDeviceInfo() : {}
        appBaseInfo = uni.getAppBaseInfo ? uni.getAppBaseInfo() : {}
      } catch (e) {
        if (debugEnabled) console.error('closeRejectPopup - 获取环境信息失败:', e)
        windowInfo = deviceInfo = appBaseInfo = {}
      }
      
      const attemptClose = (retryCount = 0) => {
        try {
          // 方法1: 优先使用 $refs
          if (this.$refs.rejectPopup && typeof this.$refs.rejectPopup.close === 'function') {
            this.$refs.rejectPopup.close()
            this.internalRejectPopupOpened = false
            return true
          }
          
          // 方法2: 处理$refs可能是数组的情况
          if (Array.isArray(this.$refs.rejectPopup) && this.$refs.rejectPopup.length > 0) {
            const popup = this.$refs.rejectPopup[0]
            if (popup && typeof popup.close === 'function') {
              popup.close()
              this.internalRejectPopupOpened = false
              return true
            }
          }
          
          // 方法3: 使用缓存的引用
          if (this._rejectPopupRef && typeof this._rejectPopupRef.close === 'function') {
            this._rejectPopupRef.close()
            this.internalRejectPopupOpened = false
            return true
          }
          
          // 方法4: 微信小程序环境下使用$scope.selectComponent
          if (appBaseInfo.uniPlatform === 'mp-weixin' || deviceInfo.platform === 'devtools') {
            if (this.$scope && typeof this.$scope.selectComponent === 'function') {
              const popup = this.$scope.selectComponent('#rejectPopup')
              if (popup && typeof popup.close === 'function') {
                popup.close()
                this.internalRejectPopupOpened = false
                return true
              }
            }
          }
          
          // 方法5: 从组件实例中查找uni-popup子组件
          if (this.$children && this.$children.length > 0) {
            for (let child of this.$children) {
              if (child.$options && child.$options.name === 'UniPopup' && child.$refs && child.$refs.rejectPopup) {
                const popup = child.$refs.rejectPopup
                if (popup && typeof popup.close === 'function') {
                  popup.close()
                  this.internalRejectPopupOpened = false
                  return true
                }
              }
            }
          }
          
          return false
        } catch (error) {
          if (debugEnabled) console.error(`closeRejectPopup - 尝试${retryCount + 1}失败:`, error)
          return false
        }
      }
      
      // 首次尝试
      if (attemptClose()) {
        return
      }
      
      // 重试机制
      setTimeout(() => {
        if (attemptClose(1)) {
          return
        }
        
        // 备选方案：DOM操作或强制更新状态
        try {
          // 强制隐藏弹窗
          this.rejectPopupPosition = 'popup-force-hide'
          this.internalRejectPopupOpened = false
          this.$forceUpdate()
          
        } catch (error) {
          if (debugEnabled) console.error('closeRejectPopup - 备选方案失败:', error)
        }
      }, 100)
    },
    
    // 关闭同意确认弹窗（兼容微信小程序）
    closeApprovePopup() {
      const debugEnabled = false // 调试开关
      
      // 获取环境信息
      let windowInfo, deviceInfo, appBaseInfo
      try {
        windowInfo = uni.getWindowInfo ? uni.getWindowInfo() : {}
        deviceInfo = uni.getDeviceInfo ? uni.getDeviceInfo() : {}
        appBaseInfo = uni.getAppBaseInfo ? uni.getAppBaseInfo() : {}
      } catch (e) {
        if (debugEnabled) console.error('closeApprovePopup - 获取环境信息失败:', e)
        windowInfo = deviceInfo = appBaseInfo = {}
      }
      
      const attemptClose = (retryCount = 0) => {
        try {
          // 方法1: 优先使用 $refs
          if (this.$refs.approvePopup && typeof this.$refs.approvePopup.close === 'function') {
            this.$refs.approvePopup.close()
            this.internalApprovePopupOpened = false
            return true
          }
          
          // 方法2: 处理$refs可能是数组的情况
          if (Array.isArray(this.$refs.approvePopup) && this.$refs.approvePopup.length > 0) {
            const popup = this.$refs.approvePopup[0]
            if (popup && typeof popup.close === 'function') {
              popup.close()
              this.internalApprovePopupOpened = false
              return true
            }
          }
          
          // 方法3: 使用缓存的引用
          if (this._approvePopupRef && typeof this._approvePopupRef.close === 'function') {
            this._approvePopupRef.close()
            this.internalApprovePopupOpened = false
            return true
          }
          
          // 方法4: 微信小程序环境下使用$scope.selectComponent
          if (appBaseInfo.uniPlatform === 'mp-weixin' || deviceInfo.platform === 'devtools') {
            if (this.$scope && typeof this.$scope.selectComponent === 'function') {
              const popup = this.$scope.selectComponent('#approvePopup')
              if (popup && typeof popup.close === 'function') {
                popup.close()
                this.internalApprovePopupOpened = false
                return true
              }
            }
          }
          
          // 方法5: 从组件实例中查找uni-popup子组件
          if (this.$children && this.$children.length > 0) {
            for (let child of this.$children) {
              if (child.$options && child.$options.name === 'UniPopup' && child.$refs && child.$refs.approvePopup) {
                const popup = child.$refs.approvePopup
                if (popup && typeof popup.close === 'function') {
                  popup.close()
                  this.internalApprovePopupOpened = false
                  return true
                }
              }
            }
          }
          
          return false
        } catch (error) {
          if (debugEnabled) console.error(`closeApprovePopup - 尝试${retryCount + 1}失败:`, error)
          return false
        }
      }
      
      // 首次尝试
      if (attemptClose()) {
        return
      }
      
      // 重试机制
      setTimeout(() => {
        if (attemptClose(1)) {
          return
        }
        
        // 备选方案：DOM操作或强制更新状态
        try {
          // 强制隐藏弹窗
          this.approvePopupPosition = 'popup-force-hide'
          this.internalApprovePopupOpened = false
          this.$forceUpdate()
          
        } catch (error) {
          if (debugEnabled) console.error('closeApprovePopup - 备选方案失败:', error)
        }
      }, 100)
    },
    
    // 确认同意申请
    async confirmApprove() {
      if (!this.approveTarget) return
      
      try {
        uni.showLoading({ title: '处理中...' })
        
        await this.sharingStore.processSharingRequest({
          requestId: this.approveTarget.id,
          action: 'approve'
        })
        
        // 更新本地状态
        const request = this.requests.find(r => r.id === this.approveTarget.id)
        if (request) {
          request.status = 'APPROVED'
          request.processedAt = new Date().toISOString()
        }
        
        // 更新计数
        this.updateFilterCounts()
        
        uni.hideLoading()
        
        uni.showToast({
          title: '已同意申请',
          icon: 'success'
        })
        
        this.approveTarget = null
        
      } catch (error) {
        uni.hideLoading()
        console.error('收到申请页面：同意申请失败:', error)
        uni.showToast({
          title: error.message || '操作失败',
          icon: 'error'
        })
      }
    },
    
    // 确认拒绝申请
    async confirmReject() {
      if (!this.rejectTarget) return
      
      try {
        uni.showLoading({ title: '处理中...' })
        
        await this.sharingStore.processSharingRequest({
          requestId: this.rejectTarget.id,
          action: 'reject',
          reason: this.rejectReason
        })
        
        // 更新本地状态
        const request = this.requests.find(r => r.id === this.rejectTarget.id)
        if (request) {
          request.status = 'REJECTED'
          request.processedAt = new Date().toISOString()
          request.rejectReason = this.rejectReason
        }
        
        // 更新计数
        this.updateFilterCounts()
        
        uni.hideLoading()
        
        uni.showToast({
          title: '已拒绝申请',
          icon: 'success'
        })
        
        this.closeRejectDialog()
        
      } catch (error) {
        uni.hideLoading()
        console.error('收到申请页面：拒绝申请失败:', error)
        uni.showToast({
          title: error.message || '操作失败',
          icon: 'error'
        })
      }
    },
    
    // 跳转到创建拼场
    goToCreateSharing() {
      uni.navigateTo({
        url: '/pages/sharing/create'
      })
    },
    
    // 获取头像文字
    getAvatarText(name) {
      if (!name) return '?'
      return name.charAt(name.length - 1)
    },
    
    // 获取进度百分比
    getProgressPercent(current, max) {
      if (!max || max === 0) return 0
      return Math.round((current / max) * 100)
    },
    
    // 格式化活动时间
    formatActivityTime(request) {
      if (!request) return '--'
      
      const date = this.formatDate(request.bookingDate)
      const timeSlot = this.formatTimeSlot(request.startTime, request.endTime)
      
      return `${date} ${timeSlot}`
    },
    
    // 格式化日期
    formatDate(date) {
      if (!date) return '--'
      return formatDate(date, 'MM-DD')
    },
    
    // 格式化日期时间
    formatDateTime(datetime) {
      if (!datetime) return '--'
      return formatDateTime(datetime, 'MM-DD HH:mm')
    },
    
    // 格式化时间段
    formatTimeSlot(startTime, endTime) {
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
    },
    
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        'PENDING': '待处理',
        'APPROVED': '已同意',
        'APPROVED_PENDING_PAYMENT': '已批准待支付',
        'PAID': '拼场成功',
        'REJECTED': '已拒绝',
        'TIMEOUT_CANCELLED': '超时取消'
      }
      return statusMap[status] || '未知状态'
    },
    
    // 获取状态样式类
    getStatusClass(status) {
      const classMap = {
        'PENDING': 'status-pending',
        'APPROVED': 'status-approved',
        'REJECTED': 'status-rejected'
      }
      return classMap[status] || 'status-unknown'
    },
    
    // 获取空状态标题
    getEmptyTitle() {
      const titleMap = {
        'all': '暂无申请记录',
        'pending': '暂无待处理申请',
        'approved': '暂无已同意申请',
        'rejected': '暂无已拒绝申请'
      }
      return titleMap[this.currentFilter] || '暂无申请记录'
    },
    
    // 获取空状态描述
    getEmptyDesc() {
      const descMap = {
        'all': '还没有人申请您的拼场',
        'pending': '暂时没有需要处理的申请',
        'approved': '暂时没有同意的申请',
        'rejected': '暂时没有拒绝的申请'
      }
      return descMap[this.currentFilter] || '还没有人申请您的拼场'
    }
  }
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
          
          &.status-rejected {
            background-color: #fff2f0;
            .status-text { color: #ff4d4f; }
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
    
    .applicant-info {
      margin-bottom: 24rpx;
      
      .applicant-header {
        display: flex;
        align-items: center;
        margin-bottom: 12rpx;
        
        .applicant-avatar {
          width: 80rpx;
          height: 80rpx;
          border-radius: 40rpx;
          margin-right: 20rpx;
          overflow: hidden;
          background-color: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          
          .avatar-img {
            width: 100%;
            height: 100%;
          }
          
          .avatar-placeholder {
            font-size: 28rpx;
            color: #999999;
            font-weight: bold;
          }
        }
        
        .applicant-details {
          flex: 1;
          
          .applicant-name {
            font-size: 28rpx;
            color: #333333;
            font-weight: bold;
            display: block;
            margin-bottom: 6rpx;
          }
          
          .apply-time {
            font-size: 22rpx;
            color: #999999;
          }
        }
      }
      
      .apply-message {
        background-color: #f8f9fa;
        padding: 16rpx;
        border-radius: 12rpx;
        
        .message-label {
          font-size: 22rpx;
          color: #666666;
          display: block;
          margin-bottom: 8rpx;
        }
        
        .message-content {
          font-size: 26rpx;
          color: #333333;
          line-height: 1.4;
        }
      }
    }
    
    .request-actions {
      .pending-actions {
        display: flex;
        justify-content: flex-end;
        gap: 20rpx;
        
        .action-btn {
          padding: 12rpx 24rpx;
          border: none;
          border-radius: 20rpx;
          font-size: 24rpx;
          
          &.reject-btn {
            background-color: #fff2f0;
            color: #ff4d4f;
          }
          
          &.approve-btn {
            background-color: #ff6b35;
            color: #ffffff;
          }
        }
      }
      
      .processed-actions {
        .processed-text {
          font-size: 24rpx;
          color: #52c41a;
          font-weight: bold;
          display: block;
          margin-bottom: 6rpx;
          
          &.rejected {
            color: #ff4d4f;
          }
        }
        
        .process-time {
          font-size: 22rpx;
          color: #999999;
          display: block;
          margin-bottom: 6rpx;
        }
        
        .reject-reason {
          font-size: 22rpx;
          color: #666666;
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
  
  .create-btn {
    width: 200rpx;
    height: 70rpx;
    background-color: #ff6b35;
    color: #ffffff;
    border: none;
    border-radius: 12rpx;
    font-size: 26rpx;
  }
}

// 拒绝对话框
.reject-dialog {
  background-color: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 40rpx 30rpx;
  
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 30rpx;
    
    .dialog-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333333;
    }
    
    .close-btn {
      font-size: 32rpx;
      color: #999999;
      padding: 10rpx;
    }
  }
  
  .dialog-content {
    margin-bottom: 40rpx;
    
    .applicant-info {
      margin-bottom: 30rpx;
      
      .applicant-name {
        font-size: 28rpx;
        color: #333333;
      }
    }
    
    .reason-section {
      .reason-label {
        font-size: 26rpx;
        color: #333333;
        display: block;
        margin-bottom: 16rpx;
      }
      
      .reason-input {
        width: 100%;
        min-height: 200rpx;
        padding: 20rpx;
        border: 1rpx solid #e0e0e0;
        border-radius: 12rpx;
        font-size: 26rpx;
        color: #333333;
        background-color: #ffffff;
        box-sizing: border-box;
        resize: none;
      }
      
      .char-count {
        font-size: 22rpx;
        color: #999999;
        text-align: right;
        display: block;
        margin-top: 8rpx;
      }
    }
  }
  
  .dialog-actions {
    display: flex;
    gap: 20rpx;
    
    .cancel-btn {
      flex: 1;
      height: 80rpx;
      background-color: #f5f5f5;
      color: #333333;
      border: none;
      border-radius: 12rpx;
      font-size: 28rpx;
    }
    
    .confirm-btn {
      flex: 1;
      height: 80rpx;
      background-color: #ff4d4f;
      color: #ffffff;
      border: none;
      border-radius: 12rpx;
      font-size: 28rpx;
    }
  }
}
</style>
