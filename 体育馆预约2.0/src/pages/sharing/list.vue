<template>
  <view class="container">
    <!-- 显示模式切换 -->
    <view class="mode-switch">
      <view 
        class="mode-item"
        :class="{ active: showMode === 'joinable' }"
        @click="switchMode('joinable')"
      >
        可参与
      </view>
      <view 
        class="mode-item"
        :class="{ active: showMode === 'all' }"
        @click="switchMode('all')"
      >
        全部
      </view>
    </view>
    

    
    <!-- 拼场列表 -->
    <view class="sharing-list">
      <view 
        v-for="sharing in filteredSharingOrders" 
        :key="sharing.id" 
        class="sharing-card"
        :class="{ 'full-card': sharing.status === 'FULL' || sharing.currentParticipants >= sharing.maxParticipants }"
        @click="navigateToDetail(sharing.id)"
      >
        <view class="card-header">
          <view class="venue-info">
            <text class="venue-name">{{ sharing.venueName || '未知场馆' }}</text>
            <text class="venue-location">📍 {{ sharing.venueLocation || '位置未知' }}</text>
          </view>
          <!-- 自己的拼场标识 -->
          <view v-if="isMySharing(sharing)" class="my-sharing-badge">
            <text class="badge-text">我的</text>
          </view>
          <!-- 已满标签 -->
          <view v-if="sharing.status === 'FULL' || sharing.currentParticipants >= sharing.maxParticipants" class="full-badge">
            <text class="badge-text">已满</text>
          </view>
          <view class="sharing-status" :class="getStatusClass(sharing.status)">
            {{ getStatusText(sharing.status) }}
          </view>
        </view>
        
        <view class="card-content">
          <view class="time-info">
            <text class="time-icon">🕐</text>
            <text class="time-text">{{ formatTimeRange(sharing) }}</text>
          </view>
          

          
          <view class="team-info">
            <text class="team-icon">👥</text>
            <text class="team-name">{{ sharing.teamName || '未命名队伍' }}</text>
          </view>
          
          <view class="participants-info">
            <text class="participants-text">参与球队：{{ sharing.currentParticipants || 0 }}/{{ sharing.maxParticipants || 2 }}支</text>
            <view class="progress-bar">
              <view
                class="progress-fill"
                :style="{ width: getProgressWidth(sharing) + '%' }"
              ></view>
            </view>
          </view>

          <!-- 倒计时显示 -->
          <CountdownTimer
            v-if="shouldShowCountdown(sharing)"
            :order="sharing"
            label="自动取消"
            :short="true"
            class="simple"
            @expired="onCountdownExpired"
          />
          
          <view class="price-info">
            <text class="price-label">费用：</text>
            <text class="price-value">¥{{ formatPrice(sharing.pricePerTeam || sharing.perTeamPrice || sharing.pricePerPerson || 0) }}</text>
            <text class="price-note">（每队费用）</text>
          </view>
          
          <view class="creator-info">
            <text class="creator-label">发起人：</text>
            <text class="creator-value">{{ sharing.creatorUsername || '未知' }}</text>
          </view>
          
          <view class="create-info">
            <text class="create-label">创建时间：</text>
            <text class="create-value">{{ formatCreateTime(sharing.createdAt) }}</text>
          </view>
          
          <view v-if="sharing.description" class="description">
            <text>{{ sharing.description }}</text>
          </view>
        </view>
        
        <view class="card-actions">
          <view class="organizer-info">
            <text class="organizer-name">{{ sharing.creatorUsername || '未知用户' }}</text>
          </view>
          
          <button 
            v-if="canJoinSharing(sharing)"
            class="join-btn"
            @click.stop="joinSharing(sharing.id)"
          >
            申请拼场
          </button>
          <view 
            v-else 
            class="join-disabled"
            :class="{ 
              'applied': hasAppliedToSharing(sharing),
              'my-sharing': isMySharing(sharing)
            }"
          >
            {{ getJoinButtonText(sharing) }}
          </view>
        </view>
      </view>
    </view>
    
    <!-- 空状态 -->
    <view v-if="filteredSharingOrders.length === 0 && !loading" class="empty-state">
      <text class="empty-icon">🏀</text>
      <text class="empty-text">暂无拼场订单</text>
    </view>
    
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>
    
    <!-- 加载更多 -->
    <view v-if="hasMore && filteredSharingOrders.length > 0" class="load-more" @click="loadMore">
      <text>{{ loading ? '加载中...' : '加载更多' }}</text>
    </view>
    
    <!-- 悬浮按钮 -->
    <view class="floating-btn" @click="goToMyOrders">
      <text class="floating-btn-text">我的拼场</text>
    </view>
  </view>
  
  <!-- 加入拼场弹窗 -->
  <uni-popup ref="joinPopup" type="bottom" v-show="internalJoinPopupOpened" :style="{ zIndex: 1000000 }">
    <view class="apply-modal">
      <view class="modal-header">
        <text class="modal-title">申请加入拼场</text>
        <text class="close-btn" @click="closeJoinModal">✕</text>
      </view>
      
      <view class="modal-content">
        <view class="form-item">
          <text class="form-label">队伍名称</text>
          <input 
            v-model="applyForm.teamName"
            class="form-input"
            placeholder="请输入队伍名称（可选）"
            maxlength="20"
          />
        </view>
        
        <view class="form-item">
          <text class="form-label">联系方式 <text class="required">*</text></text>
          <input 
            v-model="applyForm.contactInfo"
            class="form-input"
            placeholder="请输入手机号或微信号"
            maxlength="50"
          />
        </view>
        
        <view class="form-item">
          <text class="form-label">申请说明</text>
          <text class="form-hint">您将代表一支球队申请加入此拼场</text>
        </view>
        
        <view class="form-item">
          <text class="form-label">申请留言</text>
          <textarea 
            v-model="applyForm.message"
            class="form-textarea"
            placeholder="请输入申请留言（可选）"
            maxlength="200"
          ></textarea>
          <text class="char-count">{{ applyForm.message.length }}/200</text>
        </view>
      </view>
      
      <view class="modal-actions">
        <button class="modal-btn cancel-btn" @click="closeJoinModal">
          取消
        </button>
        <button 
          class="modal-btn confirm-btn" 
          :disabled="!canSubmitApplication"
          @click="submitApplication"
        >
          提交申请
        </button>
      </view>
    </view>
  </uni-popup>
</template>

<script>
import { useSharingStore } from '@/stores/sharing.js'
import { useUserStore } from '@/stores/user.js'

import CountdownTimer from '@/components/CountdownTimer.vue'
import { shouldShowCountdown } from '@/utils/countdown.js'
import { formatDate, formatDateTime } from '@/utils/helpers.js'

export default {
  name: 'SharingList',

  components: {
    CountdownTimer
  },
  
  data() {
    return {
      sharingStore: null,
      userStore: null,
      currentSharing: null,
      showMode: 'joinable', // 'joinable' 可参与的, 'all' 全部
      userApplications: [], // 用户的申请记录
      
      // 缓存和防重复请求
      lastRefreshTime: 0,
      cacheTimeout: 30000, // 30秒缓存
      isRefreshing: false,
      refreshTimer: null, // 定时刷新计时器
      
      // 弹窗状态控制
      internalJoinPopupOpened: false,
      _joinPopupRef: null,
      
      // 申请表单数据
      applyForm: {
        teamName: '',
        contactInfo: '',
        message: ''
      }
    }
  },
  
  computed: {
    sharingOrders() {
      return this.sharingStore?.sharingOrdersGetter || []
    },

    loading() {
      return this.sharingStore?.isLoading || false
    },

    pagination() {
      return this.sharingStore?.getPagination || { current: 0, totalPages: 0 }
    },

    userInfo() {
      return this.userStore?.userInfoGetter || {}
    },

    filteredSharingOrders() {
      let orders = this.sharingOrders || []
      
      // 首先过滤掉已过期、已取消等无效状态的订单
      orders = orders.filter(order => {
        // 排除已过期、已取消、支付超时等无效状态
        const invalidStatuses = ['EXPIRED', 'CANCELLED', 'TIMEOUT_CANCELLED']
        return !invalidStatuses.includes(order.status)
      })
      
      // 根据显示模式筛选
      if (this.showMode === 'joinable') {
        orders = orders.filter(order => {
          // 显示开放状态的拼场，包括：
          // 1. 还有空位且不是自己创建的拼场（可以申请）
          // 2. 自己已经申请过的拼场（显示状态，不能重复申请）
          const isOpenAndAvailable = order.status === 'OPEN' && 
                                   order.currentParticipants < order.maxParticipants &&
                                   !this.isMySharing(order)
          
          // 显示所有开放状态的拼场，让用户看到申请后的状态变化
          return order.status === 'OPEN' || order.status === 'FULL'
        })
      }
      // 'all' 模式显示所有有效状态的拼场订单，包括已满员、已确认等
      
      return orders
    },
    
    hasMore() {
      return this.pagination.current < Math.ceil(this.pagination.total / this.pagination.pageSize)
    },
    
    // 是否可以提交申请
    canSubmitApplication() {
      return this.applyForm.contactInfo.trim().length > 0
    }
  },
  
  onLoad() {
    console.log('🔍 [DEBUG] sharing/list.vue onLoad被调用')
    // 已移除popup-protection相关调用

    // 初始化Pinia stores
    this.sharingStore = useSharingStore()
    this.userStore = useUserStore()

    // 监听拼场数据变化
    uni.$on('sharingDataChanged', this.onSharingDataChanged)
    // 监听订单取消事件
    uni.$on('orderCancelled', this.onOrderCancelled)

    // 🔥 修复: 移除initData()调用，统一在onShow中加载数据，避免双重调用
    // this.initData()

    // 缓存弹窗实例
    this.$nextTick(() => {
      try {
        if (this.$refs.filterPopup) {
          this._filterPopupRef = this.$refs.filterPopup
        }
        if (this.$refs.joinPopup) {
          this._joinPopupRef = this.$refs.joinPopup
        }
      } catch (e) {
        console.warn('缓存弹窗实例失败:', e)
      }

      // 延迟重试缓存
      setTimeout(() => {
        try {
          if (!this._joinPopupRef && this.$refs.joinPopup) {
            this._joinPopupRef = this.$refs.joinPopup
          }
        } catch (e) {
          console.warn('延迟缓存弹窗实例失败:', e)
        }
      }, 100)
    })
  },

  onUnload() {
    // 已移除popup-protection相关调用
    
    // 移除监听器
    uni.$off('sharingDataChanged', this.onSharingDataChanged)
    uni.$off('orderCancelled', this.onOrderCancelled)
    // 清除定时器
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
    // 清理缓存引用
    this._joinPopupRef = null
  },

  mounted() {
    // 已移除popup-protection相关调用
  },

  async onShow() {
    console.log('🔍 [DEBUG] sharing/list.vue onShow被调用')
    // 已移除popup-protection相关调用

    // 🔥 性能优化：拼场列表和用户申请记录并行加载
    const refreshPromise = this.lastRefreshTime === 0
      ? this.refreshData()
      : this.refreshDataWithCache()
    
    await Promise.all([
      refreshPromise,
      this.loadUserApplications().catch(err => console.warn('加载申请记录失败:', err.message))
    ])
    
    // 启动定时刷新
    this.startAutoRefresh()
  },
  
  onHide() {
    // 页面隐藏时停止定时刷新，节省资源
    this.stopAutoRefresh()
  },
  
  onPullDownRefresh() {
    this.refreshData()
  },
  
  onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.loadMore()
    }
  },
  
  methods: {
    
    // 初始化数据
    async initData() {
      try {
        console.log('拼场列表页面：开始初始化数据')
        console.log('拼场列表页面：Store状态:', this.sharingStore)
        console.log('拼场列表页面：当前显示模式:', this.showMode)
        
        // 根据显示模式选择不同的API
        const apiMethod = this.showMode === 'all' ? this.sharingStore.getAllSharingOrders : this.sharingStore.getJoinableSharingOrders
        const result = await apiMethod({ page: 1, pageSize: 10 })
        console.log('拼场列表页面：API返回结果:', result)
        // 强制更新视图
        this.$forceUpdate()
      } catch (error) {
        console.error('拼场列表页面：初始化数据失败:', error)
        uni.showToast({
          title: '获取拼场数据失败',
          icon: 'none'
        })
      }
    },
    
    // 带缓存的刷新数据
    async refreshDataWithCache() {
      const now = Date.now()

      console.log('拼场列表页面：refreshDataWithCache 被调用', {
        isRefreshing: this.isRefreshing,
        hasOrders: this.sharingOrders?.length > 0,
        timeSinceLastRefresh: now - this.lastRefreshTime,
        cacheTimeout: this.cacheTimeout
      })

      // 🔥 修复问题3: 如果正在刷新，直接返回，不等待
      if (this.isRefreshing) {
        console.log('拼场列表页面：正在刷新中，跳过本次请求')
        return
      }

      // 如果有数据且在缓存时间内，跳过刷新
      if (this.sharingOrders?.length > 0 && (now - this.lastRefreshTime) < this.cacheTimeout) {
        console.log('拼场列表页面：使用缓存数据，跳过刷新')
        return
      }

      // 执行真正的刷新
      console.log('拼场列表页面：缓存已过期或无数据，执行刷新')
      await this.refreshData()
    },
    
    // 刷新数据
    async refreshData() {
      if (this.isRefreshing) {
        return
      }

      this.isRefreshing = true

      try {
        // 根据显示模式选择不同的API
        const apiMethod = this.showMode === 'all'
          ? this.sharingStore.getAllSharingOrders.bind(this.sharingStore)
          : this.sharingStore.getJoinableSharingOrders.bind(this.sharingStore)

        const result = await apiMethod({
          page: 1,
          pageSize: 10,
          refresh: true,
          _t: Date.now()
        })

        console.log('[SharingList] 刷新完成，订单数量:', this.sharingOrders?.length || 0)

        // 更新缓存时间
        this.lastRefreshTime = Date.now()

        // 强制更新视图
        this.$forceUpdate()
        uni.stopPullDownRefresh()
      } catch (error) {
        uni.stopPullDownRefresh()
        console.error('[SharingList] 刷新失败:', error.message)

        uni.showToast({
          title: '刷新数据失败',
          icon: 'none',
          duration: 2000
        })
      } finally {
        this.isRefreshing = false
      }
    },
    
    // 加载更多
    async loadMore() {
      if (this.loading || !this.hasMore) return
      
      try {
        console.log('拼场列表页面：开始加载更多，当前页码:', this.pagination.current, '显示模式:', this.showMode)
        const nextPage = this.pagination.current + 1
        // 根据显示模式选择不同的API
        const apiMethod = this.showMode === 'all' ? this.sharingStore.getAllSharingOrders : this.sharingStore.getJoinableSharingOrders
        await apiMethod({ 
          page: nextPage, 
          pageSize: 10,
          status: this.selectedStatus
        })
        console.log('拼场列表页面：加载更多完成，订单数量:', this.sharingOrders?.length || 0)
      } catch (error) {
        console.error('拼场列表页面：加载更多失败:', error)
        uni.showToast({
          title: '加载更多失败',
          icon: 'none'
        })
      }
    },
    
    // 选择状态
    async selectStatus(status) {
      this.selectedStatus = status
      try {
        // 根据显示模式选择不同的API
        const apiMethod = this.showMode === 'all' ? this.sharingStore.getAllSharingOrders : this.sharingStore.getJoinableSharingOrders
        await apiMethod({ 
          page: 1, 
          pageSize: 10, 
          status: status,
          refresh: true
        })
      } catch (error) {
        console.error('筛选失败:', error)
      }
    },
    
    // 切换显示模式
    async switchMode(mode) {
      if (this.showMode === mode) {
        console.log('拼场列表页面：模式未改变，跳过切换')
        return
      }

      console.log('拼场列表页面：🔄 切换显示模式从', this.showMode, '到', mode)
      console.log('拼场列表页面：当前状态:', {
        isRefreshing: this.isRefreshing,
        storeLoading: this.sharingStore?.loading,
        ordersCount: this.sharingOrders?.length
      })

      // 🔥 修复问题3: 先重置标志，再切换模式
      this.isRefreshing = false
      this.showMode = mode
      this.selectedStatus = '' // 重置状态筛选

      try {
        console.log('拼场列表页面：准备刷新数据...')

        // 🔥 修复问题3: 清除缓存时间，强制刷新
        this.lastRefreshTime = 0

        // 切换模式时重新加载数据
        await this.refreshData()
        console.log('拼场列表页面：✅ 模式切换成功')
      } catch (error) {
        console.error('拼场列表页面：❌ 切换模式失败:', error)
        uni.showToast({
          title: '切换模式失败，请重试',
          icon: 'none'
        })
        // 🔥 修复问题3: 恢复之前的模式
        this.showMode = mode === 'all' ? 'joinable' : 'all'
      } finally {
        // 🔥 修复问题3: 确保重置标志
        this.isRefreshing = false
        console.log('拼场列表页面：🔓 switchMode finally: isRefreshing = false')
      }
    },
    
    // 跳转到详情页
    navigateToDetail(sharingId) {
      uni.navigateTo({
        url: `/pages/sharing/detail?id=${sharingId}`
      })
    },
    
    // 判断是否可以加入拼场
    canJoinSharing(sharing) {
      // 如果是自己创建的拼场，不能申请
      if (this.userInfo && sharing.creatorUsername === this.userInfo.username) {
        return false
      }
      
      // 如果已经申请过，不能重复申请
      if (this.hasAppliedToSharing(sharing.id)) {
        return false
      }
      
      return sharing.status === 'OPEN' && 
             (sharing.currentParticipants || 0) < (sharing.maxParticipants || 0)
    },
    
    // 判断是否属于自己的拼场
    isMySharing(sharing) {
      return this.userInfo && sharing.creatorUsername === this.userInfo.username
    },
    
    // 判断是否已申请过该拼场
    hasAppliedToSharing(sharingId) {
      return this.userApplications.some(app => 
        app.sharingOrder && app.sharingOrder.id === sharingId
      )
    },
    
    // 加载用户申请记录
    async loadUserApplications() {
      try {
        const response = await this.sharingStore.getSentRequestsList()
        // 从响应中提取数组数据
        const applications = response?.data || response?.list || response || []
        this.userApplications = Array.isArray(applications) ? applications : []
      } catch (error) {
        console.error('加载用户申请记录失败:', error)
        this.userApplications = []
      }
    },
    
    // 加入拼场
    joinSharing(sharingId) {
      console.log('🔍 [DEBUG] joinSharing被调用，sharingId:', sharingId, '调用栈:', new Error().stack)
      const sharing = this.sharingOrders.find(s => s.id === sharingId)
      
      // 检查是否属于自己的拼场订单
      if (this.isMySharing(sharing)) {
        uni.showToast({
          title: '不能申请自己的拼场',
          icon: 'none',
          duration: 2000
        })
        return
      }
      
      this.currentSharing = sharing
      // 重置表单
      this.resetApplyForm()
      
      // 调试开关
      const debugEnabled = false
      
      try {
        // 获取环境信息
        const windowInfo = uni.getWindowInfo()
        const deviceInfo = uni.getDeviceInfo()
        const appBaseInfo = uni.getAppBaseInfo()
        const isWeChat = appBaseInfo.appPlatform === 'mp-weixin' || deviceInfo.platform === 'devtools'
        
        if (debugEnabled) {
          console.log('joinSharing - 环境信息:', { windowInfo, deviceInfo, appBaseInfo, isWeChat })
        }
        
        const getInstance = () => {
          // 1. 优先使用 $refs
          let inst = this.$refs.joinPopup
          if (Array.isArray(inst)) inst = inst[0]
          
          if (debugEnabled) {
            console.log('joinSharing - $refs.joinPopup:', inst)
          }
          
          // 2. 使用缓存引用
          if (!inst && this._joinPopupRef) {
            inst = this._joinPopupRef
            if (debugEnabled) {
              console.log('joinSharing - 使用缓存引用:', inst)
            }
          }
          
          // 3. 微信小程序环境下使用 $scope.selectComponent
          if (!inst && isWeChat && this.$scope && typeof this.$scope.selectComponent === 'function') {
            try {
              inst = this.$scope.selectComponent('#joinPopup')
              if (debugEnabled) {
                console.log('joinSharing - $scope.selectComponent结果:', inst)
              }
              
              // 从组件实例中查找 uni-popup 子组件
              if (!inst || typeof inst.open !== 'function') {
                const componentInstance = this.$scope.selectComponent('.join-popup')
                if (componentInstance) {
                  inst = componentInstance
                  if (debugEnabled) {
                    console.log('joinSharing - 通过class选择器找到组件:', inst)
                  }
                }
              }
              
              if (inst && debugEnabled) {
                console.log('joinSharing - 实例方法检查:', {
                  hasOpen: typeof inst.open === 'function',
                  hasClose: typeof inst.close === 'function',
                  methods: Object.getOwnPropertyNames(inst).filter(name => typeof inst[name] === 'function')
                })
              }
            } catch (e) {
              if (debugEnabled) {
                console.error('joinSharing - $scope.selectComponent异常:', e)
              }
            }
          }
          
          return inst
        }
        
        const tryOpen = (attempt = 0) => {
          const inst = getInstance()
          if (inst && typeof inst.open === 'function') {
            try {
              // 缓存有效引用
              if (!this._joinPopupRef) {
                this._joinPopupRef = inst
              }
              
              // 移除transform定位逻辑，使用uni-popup默认定位
              
              inst.open()
              this.internalJoinPopupOpened = true
              
              if (debugEnabled) {
                console.log('joinSharing - 弹窗打开成功')
              }
              return
            } catch (e) {
              console.error('joinSharing - open调用异常', e)
              if (attempt === 0) {
                // 重试一次
                const self = this
                setTimeout(() => { tryOpen(1) }, 100)
                return
              }
            }
          }
          
          if (attempt >= 1) {
            // 备选方案：强制显示
            try {
              this.internalJoinPopupOpened = true
              this.$forceUpdate()
              if (debugEnabled) {
                console.log('joinSharing - 使用备选方案强制显示')
              }
            } catch (fallbackError) {
              console.error('joinSharing - 备选方案失败:', fallbackError)
              uni.showToast({ title: '弹窗打开失败', icon: 'none' })
            }
            return
          }
          
          if (debugEnabled) {
            console.log(`joinSharing - 第${attempt + 1}次尝试失败，100ms后重试`)
          }
          
          setTimeout(() => { tryOpen(attempt + 1) }, 100)
        }
        
        tryOpen(0)
        
      } catch (error) {
        console.error('joinSharing - 执行失败:', error)
        uni.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        })
      }
    },
    
    // 重置申请表单
    resetApplyForm() {
      this.applyForm = {
        teamName: '', // 队名默认为空，让用户自己填写
        contactInfo: this.userInfo?.phone || this.userInfo?.mobile || '', // 联系方式默认为手机号
        message: ''
      }
    },
    
    // 关闭加入弹窗
    closeJoinModal() {
      console.log('🔍 [DEBUG] closeJoinModal被调用')
      
      // 调试开关
      const debugEnabled = false
      
      try {
        // 获取环境信息
        const windowInfo = uni.getWindowInfo()
        const deviceInfo = uni.getDeviceInfo()
        const appBaseInfo = uni.getAppBaseInfo()
        const isWeChat = appBaseInfo.appPlatform === 'mp-weixin' || deviceInfo.platform === 'devtools'
        
        if (debugEnabled) {
          console.log('closeJoinModal - 环境信息:', { windowInfo, deviceInfo, appBaseInfo, isWeChat })
        }
        
        const getInstance = () => {
          // 1. 优先使用 $refs
          let inst = this.$refs.joinPopup
          if (Array.isArray(inst)) inst = inst[0]
          
          if (debugEnabled) {
            console.log('closeJoinModal - $refs.joinPopup:', inst)
          }
          
          // 2. 使用缓存引用
          if (!inst && this._joinPopupRef) {
            inst = this._joinPopupRef
            if (debugEnabled) {
              console.log('closeJoinModal - 使用缓存引用:', inst)
            }
          }
          
          // 3. 微信小程序环境下使用 $scope.selectComponent
          if (!inst && isWeChat && this.$scope && typeof this.$scope.selectComponent === 'function') {
            try {
              inst = this.$scope.selectComponent('#joinPopup')
              if (debugEnabled) {
                console.log('closeJoinModal - $scope.selectComponent结果:', inst)
              }
              
              // 从组件实例中查找 uni-popup 子组件
              if (!inst || typeof inst.close !== 'function') {
                const componentInstance = this.$scope.selectComponent('.join-popup')
                if (componentInstance) {
                  inst = componentInstance
                  if (debugEnabled) {
                    console.log('closeJoinModal - 通过class选择器找到组件:', inst)
                  }
                }
              }
              
              if (inst && debugEnabled) {
                console.log('closeJoinModal - 实例方法检查:', {
                  hasOpen: typeof inst.open === 'function',
                  hasClose: typeof inst.close === 'function',
                  methods: Object.getOwnPropertyNames(inst).filter(name => typeof inst[name] === 'function')
                })
              }
            } catch (e) {
              if (debugEnabled) {
                console.error('closeJoinModal - $scope.selectComponent异常:', e)
              }
            }
          }
          
          return inst
        }
        
        const tryClose = (attempt = 0) => {
          const inst = getInstance()
          if (inst && typeof inst.close === 'function') {
            try {
              // 缓存有效引用
              if (!this._joinPopupRef) {
                this._joinPopupRef = inst
              }
              
              // 移除transform定位逻辑，使用uni-popup默认定位
              
              inst.close()
              this.internalJoinPopupOpened = false
              
              if (debugEnabled) {
                console.log('closeJoinModal - 弹窗关闭成功')
              }
              return
            } catch (e) {
              console.error('closeJoinModal - close调用异常', e)
              if (attempt === 0) {
                // 重试一次
                setTimeout(() => tryClose(1), 100)
                return
              }
            }
          }
          
          if (attempt >= 1) {
            // 备选方案：强制隐藏
            try {
              this.internalJoinPopupOpened = false
              this.$forceUpdate()
              if (debugEnabled) {
                console.log('closeJoinModal - 使用备选方案强制隐藏')
              }
            } catch (fallbackError) {
              console.error('closeJoinModal - 备选方案失败:', fallbackError)
              uni.showToast({ title: '弹窗关闭失败', icon: 'none' })
            }
            return
          }
          
          if (debugEnabled) {
            console.log(`closeJoinModal - 第${attempt + 1}次尝试失败，100ms后重试`)
          }
          
          setTimeout(() => tryClose(attempt + 1), 100)
        }
        
        tryClose(0)
        
      } catch (error) {
        console.error('closeJoinModal - 执行失败:', error)
        // 确保状态重置
        this.internalJoinPopupOpened = false
      } finally {
        // 清理数据
        this.currentSharing = null
        this.resetApplyForm()
      }
    },
    
    // 提交申请
    async submitApplication() {
      if (!this.canSubmitApplication) {
        uni.showToast({
          title: '请填写联系方式',
          icon: 'none'
        })
        return
      }
      
      try {
        uni.showLoading({ title: '提交中...' })
        
        const applicationData = {
          teamName: this.applyForm.teamName.trim(),
          contactInfo: this.applyForm.contactInfo.trim(),
          message: this.applyForm.message.trim()
        }
        
        const response = await this.sharingStore.applySharingOrder({
          orderId: this.currentSharing.id,
          data: applicationData
        })

        uni.hideLoading()
        this.closeJoinModal()

        // 检查申请是否被自动通过（需要支付）
        if (response && response.data && response.data.status === 'APPROVED_PENDING_PAYMENT') {
          // 自动通过，提示用户并引导支付
          uni.showModal({
            title: '申请已通过',
            content: '您的拼场申请已自动通过！请在30分钟内完成支付以确认参与。',
            showCancel: false,
            confirmText: '去支付',
            success: () => {
              // 跳转到支付页面，使用虚拟订单ID
              uni.navigateTo({
                url: `/pages/payment/index?orderId=${-response.data.id}&type=sharing&from=sharing-list`
              })
            }
          })
        } else if (response && response.data && response.data.status === 'APPROVED') {
          // 旧的自动通过逻辑（兼容性）
          uni.showModal({
            title: '申请已通过',
            content: '您的拼场申请已自动通过！请完成支付以确认参与。',
            showCancel: false,
            confirmText: '去支付',
            success: () => {
              // 跳转到支付页面，使用虚拟订单ID
              uni.navigateTo({
                url: `/pages/payment/index?orderId=${-response.data.id}&type=sharing&from=sharing-list`
              })
            }
          })
        } else {
          // 普通提交，显示等待审核提示
          uni.showToast({
            title: response?.message || '申请提交成功，等待审核',
            icon: 'success',
            duration: 2000
          })
        }

        // 刷新列表和用户申请记录
        await this.refreshData()
        await this.loadUserApplications()
        
      } catch (error) {
        uni.hideLoading()
        console.error('加入拼场失败:', error)
        uni.showToast({
          title: error.message || '加入失败',
          icon: 'error'
        })
      }
    },
    
    // 显示筛选弹窗
    showFilterModal() {
      console.log('🔍 [DEBUG] showFilterModal被调用')
      
      // 调试开关
      const debugEnabled = false
      
      try {
        // 获取环境信息
        const windowInfo = uni.getWindowInfo()
        const deviceInfo = uni.getDeviceInfo()
        const appBaseInfo = uni.getAppBaseInfo()
        const isWeChat = appBaseInfo.appPlatform === 'mp-weixin' || deviceInfo.platform === 'devtools'
        
        if (debugEnabled) {
          console.log('showFilterModal - 环境信息:', { windowInfo, deviceInfo, appBaseInfo, isWeChat })
        }
        
        const getInstance = () => {
          // 1. 优先使用 $refs
          let inst = this.$refs.filterPopup
          if (Array.isArray(inst)) inst = inst[0]
          
          if (debugEnabled) {
            console.log('showFilterModal - $refs.filterPopup:', inst)
          }
          
          // 2. 使用缓存引用
          if (!inst && this._filterPopupRef) {
            inst = this._filterPopupRef
            if (debugEnabled) {
              console.log('showFilterModal - 使用缓存引用:', inst)
            }
          }
          
          // 3. 微信小程序环境下使用 $scope.selectComponent
          if (!inst && isWeChat && this.$scope && typeof this.$scope.selectComponent === 'function') {
            try {
              inst = this.$scope.selectComponent('#filterPopup')
              if (debugEnabled) {
                console.log('showFilterModal - $scope.selectComponent结果:', inst)
              }
              
              // 从组件实例中查找 uni-popup 子组件
              if (!inst || typeof inst.open !== 'function') {
                const componentInstance = this.$scope.selectComponent('.filter-popup')
                if (componentInstance) {
                  inst = componentInstance
                  if (debugEnabled) {
                    console.log('showFilterModal - 通过class选择器找到组件:', inst)
                  }
                }
              }
              
              if (inst && debugEnabled) {
                console.log('showFilterModal - 实例方法检查:', {
                  hasOpen: typeof inst.open === 'function',
                  hasClose: typeof inst.close === 'function',
                  methods: Object.getOwnPropertyNames(inst).filter(name => typeof inst[name] === 'function')
                })
              }
            } catch (e) {
              if (debugEnabled) {
                console.error('showFilterModal - $scope.selectComponent异常:', e)
              }
            }
          }
          
          return inst
        }
        
        const tryOpen = (attempt = 0) => {
          const inst = getInstance()
          if (inst && typeof inst.open === 'function') {
            try {
              // 缓存有效引用
              if (!this._filterPopupRef) {
                this._filterPopupRef = inst
              }
              
              // 应用样式
              if (this.filterPopupPosition.x || this.filterPopupPosition.y) {
                try {
                  const popupEl = inst.$el || inst
                  if (popupEl && popupEl.style) {
                    popupEl.style.transform = `translate(${this.filterPopupPosition.x}px, ${this.filterPopupPosition.y}px)`
                  }
                } catch (styleError) {
                  if (debugEnabled) console.warn('showFilterModal - 应用样式失败:', styleError)
                }
              }
              
              inst.open('bottom')
              this.internalFilterPopupOpened = true
              
              if (debugEnabled) {
                console.log('showFilterModal - 弹窗打开成功')
              }
              return
            } catch (e) {
              console.error('showFilterModal - open调用异常', e)
              if (attempt === 0) {
                // 重试一次
                setTimeout(() => tryOpen(1), 100)
                return
              }
            }
          }
          
          if (attempt >= 1) {
            // 备选方案：强制显示
            try {
              this.internalFilterPopupOpened = true
              this.$forceUpdate()
              if (debugEnabled) {
                console.log('showFilterModal - 使用备选方案强制显示')
              }
            } catch (fallbackError) {
              console.error('showFilterModal - 备选方案失败:', fallbackError)
              uni.showToast({ title: '弹窗打开失败', icon: 'none' })
            }
            return
          }
          
          if (debugEnabled) {
            console.log(`showFilterModal - 第${attempt + 1}次尝试失败，100ms后重试`)
          }
          
          setTimeout(() => tryOpen(attempt + 1), 100)
        }
        
        tryOpen(0)
        
      } catch (error) {
        console.error('showFilterModal - 执行失败:', error)
        // 确保状态设置
        this.internalFilterPopupOpened = true
      }
    },
    

    
    // 格式化日期
    formatDate(date) {
      if (!date) return '--'
      return formatDate(date, 'MM-DD')
    },
    
    // 格式化时间
    formatDateTime(datetime) {
      if (!datetime) return '--'
      return formatDateTime(datetime)
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
    
    // 格式化时间范围显示（参考booking/list）
    formatTimeRange(sharing) {
      const startTime = sharing.startTime || sharing.bookingStartTime
      const endTime = sharing.endTime || sharing.bookingEndTime
      const timeSlotCount = sharing.timeSlotCount || 1
      
      if (!startTime || !endTime) {
        return '时间待定'
      }
      
      // 格式化时间显示（去掉秒数）
      const formatTime = (timeStr) => {
        if (!timeStr) return ''
        // 如果是完整的时间格式（HH:mm:ss），只取前5位
        if (timeStr.length > 5 && timeStr.includes(':')) {
          return timeStr.substring(0, 5)
        }
        return timeStr
      }
      
      const formattedStart = formatTime(startTime)
      const formattedEnd = formatTime(endTime)
      
      // 添加日期信息
      const dateStr = this.formatDate(sharing.bookingDate)
      
      // 如果有多个时间段，显示时间段数量
      if (timeSlotCount > 1) {
        return `${dateStr} ${formattedStart} - ${formattedEnd} (${timeSlotCount}个时段)`
      }
      
      return `${dateStr} ${formattedStart} - ${formattedEnd}`
    },
    
    // 格式化创建时间（参考booking/list）
    formatCreateTime(datetime) {
      if (!datetime) return '--'
      try {
        // 处理iOS兼容性问题：将空格分隔的日期时间格式转换为T分隔的ISO格式
        let dateStr = datetime
        if (typeof dateStr === 'string' && dateStr.includes(' ') && !dateStr.includes('T')) {
          dateStr = dateStr.replace(' ', 'T')
        }
        
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return '--'
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hour = String(date.getHours()).padStart(2, '0')
        const minute = String(date.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day} ${hour}:${minute}`
      } catch (error) {
        console.error('时间格式化错误:', error)
        return '--'
      }
    },
    
    // 格式化加入时间
    formatJoinTime() {
      if (!this.currentSharing) return ''
      return `${this.formatDate(this.currentSharing.bookingDate)} ${this.formatTimeSlot(this.currentSharing.startTime, this.currentSharing.endTime)}`
    },
    
    // 格式化价格显示
    formatPrice(price) {
      if (!price && price !== 0) return '0'
      const numPrice = Number(price)
      if (isNaN(numPrice)) return '0'
      return numPrice.toFixed(2)
    },
    
    // 获取进度条宽度
    getProgressWidth(sharing) {
      const current = sharing.currentParticipants || 0
      const max = sharing.maxParticipants || 2
      return Math.min((current / max) * 100, 100)
    },

    // 判断是否显示倒计时
    shouldShowCountdown(order) {
      return shouldShowCountdown(order)
    },

    // 倒计时过期处理
    onCountdownExpired(order) {
      console.log('拼场订单倒计时过期:', order.orderNo)
      // 刷新数据，更新订单状态
      this.refreshData()
    },
    
    // 获取状态样式类
    getStatusClass(status) {
      const statusMap = {
        'OPEN': 'status-open',
        'FULL': 'status-full',
        'CONFIRMED': 'status-confirmed',
        'CANCELLED': 'status-cancelled',
        'EXPIRED': 'status-expired'
      }
      return statusMap[status] || 'status-open'
    },
    
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        'OPEN': '开放中(1/2)',
        'APPROVED_PENDING_PAYMENT': '等待对方支付',
        'SHARING_SUCCESS': '拼场成功(2人)',
        'CONFIRMED': '已确认',
        'CANCELLED': '已取消',
        'REJECTED': '已拒绝',
        'TIMEOUT_CANCELLED': '超时取消',
        'EXPIRED': '已过期'
      }
      return statusMap[status] || '开放中'
    },

    // 处理拼场数据变化
    onSharingDataChanged(data) {
      console.log('拼场列表页面：收到数据变化通知:', data)

      // 查找对应的订单并更新
      if (this.sharingOrders && data.orderId) {
        const order = this.sharingOrders.find(o => o.id == data.orderId)
        if (order) {
          // 更新参与人数
          if (data.currentParticipants !== undefined) {
            order.currentParticipants = data.currentParticipants
          }

          // 如果是批准申请，可能需要更新状态
          if (data.action === 'APPROVED' && order.currentParticipants >= 2) {
            order.status = 'SHARING_SUCCESS'
          }

          console.log('拼场列表页面：已更新订单数据:', order)
        }
      }

      // 强制刷新数据以确保一致性
      setTimeout(() => {
        this.refreshData()
      }, 1000)
    },

    // 处理订单取消事件
    onOrderCancelled(data) {
      console.log('拼场列表页面：收到订单取消通知:', data)

      // 🔥 修复问题3: 处理拼场订单取消和预约订单取消
      if (data.orderId) {
        if (data.type === 'sharing') {
          console.log('检测到拼场订单取消，刷新拼场大厅数据')
          // 拼场订单取消，立即刷新
          setTimeout(() => {
            console.log('开始刷新拼场大厅数据...')
            this.refreshData()
          }, 500)
        } else if (data.type === 'booking') {
          console.log('检测到预约订单取消，刷新拼场大厅数据')
          // 预约订单取消，延迟刷新确保后端状态已同步
          setTimeout(() => {
            console.log('开始刷新拼场大厅数据...')
            this.refreshData()
          }, 1500)
        }
      }
    },

    // 获取加入按钮文本
    getJoinButtonText(sharing) {
      // 如果是自己的拼场
      if (this.isMySharing(sharing)) {
        return '我的拼场'
      }
      // 如果已申请过该拼场
      if (this.hasAppliedToSharing(sharing)) {
        return '已申请'
      }
      if (sharing.status === 'FULL') {
        return '已满员'
      }
      if (sharing.status === 'CONFIRMED') {
        return '已确认'
      }
      if (sharing.status === 'CANCELLED') {
        return '已取消'
      }
      if (sharing.status === 'EXPIRED') {
        return '已过期'
      }
      return '申请拼场'
    },
    
    // 导航到我的拼场页面
    goToMyOrders() {
      uni.navigateTo({
        url: '/pages/sharing/my-orders'
      })
    },
    
    // 启动自动刷新
    startAutoRefresh() {
      // 清除之前的定时器
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
      }
      
      // 每60秒自动刷新一次数据，检查订单状态变化
      this.refreshTimer = setInterval(async () => {
        try {
          console.log('定时刷新拼场数据...')
          await this.refreshData()
        } catch (error) {
          console.error('定时刷新失败:', error)
        }
      }, 60000) // 60秒间隔
    },
    
    // 停止自动刷新
    stopAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
}

// 显示模式切换
.mode-switch {
  display: flex;
  background-color: #ffffff;
  margin: 20rpx 30rpx;
  border-radius: 12rpx;
  padding: 8rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  
  .mode-item {
    flex: 1;
    text-align: center;
    padding: 16rpx 0;
    border-radius: 8rpx;
    font-size: 28rpx;
    color: #666666;
    transition: all 0.3s ease;
    
    &.active {
      background-color: #007aff;
      color: #333333;
      font-weight: bold;
    }
  }
 }

.container {
  padding-bottom: 120rpx;
}

// 悬浮按钮
.floating-btn {
  position: fixed;
  bottom: 120rpx;
  right: 30rpx;
  width: 120rpx;
  height: 120rpx;
  background-color: #ff6b35;
  border-radius: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(255, 107, 53, 0.3);
  z-index: 999;
  
  .floating-btn-text {
    font-size: 24rpx;
    color: #ffffff;
    font-weight: 500;
    text-align: center;
    line-height: 1.2;
  }
}

// 筛选栏
.filter-section {
  display: flex;
  background-color: #ffffff;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  
  .filter-scroll {
    flex: 1;
    white-space: nowrap;
    
    .filter-item {
      display: inline-block;
      padding: 12rpx 24rpx;
      margin-right: 20rpx;
      background-color: #f5f5f5;
      border-radius: 30rpx;
      font-size: 24rpx;
      color: #666666;
      
      &.active {
        background-color: #ff6b35;
        color: #666666;
      }
    }
  }
  
  .filter-more {
    padding: 12rpx 24rpx;
    background-color: #f5f5f5;
    border-radius: 30rpx;
    font-size: 24rpx;
    color: #666666;
  }
}

// 拼场列表
.sharing-list {
  padding: 20rpx 30rpx;
  
  .sharing-card {
    background-color: #ffffff;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
    
    &.full-card {
      background-color: #f8f8f8;
      opacity: 0.7;
      
      .venue-name {
        color: #999999 !important;
      }
      
      .time-text, .team-name {
        color: #999999 !important;
      }
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20rpx;
      
      .venue-info {
        flex: 1;
        
        .venue-name {
          font-size: 32rpx;
          font-weight: bold;
          color: #333333;
          display: block;
          margin-bottom: 8rpx;
        }
        
        .venue-location {
          font-size: 24rpx;
          color: #999999;
        }
      }
      
      .my-sharing-badge {
        padding: 6rpx 12rpx;
        background-color: #ff6b35;
        border-radius: 16rpx;
        margin-right: 12rpx;
        
        .badge-text {
          font-size: 20rpx;
          color: #666666;
          font-weight: bold;
        }
      }
      
      .full-badge {
        padding: 6rpx 12rpx;
        background-color: #999999;
        border-radius: 16rpx;
        margin-right: 12rpx;
        
        .badge-text {
          font-size: 20rpx;
          color: #ffffff;
          font-weight: bold;
        }
      }
      
      .sharing-status {
        padding: 8rpx 16rpx;
        border-radius: 20rpx;
        font-size: 22rpx;
        
        &.status-open {
          background-color: #e8f5e8;
          color: #52c41a;
        }
        
        &.status-full {
          background-color: #fff2e8;
          color: #fa8c16;
        }
        
        &.status-confirmed {
          background-color: #e6f7ff;
          color: #1890ff;
        }
        
        &.status-cancelled {
          background-color: #fff1f0;
          color: #ff4d4f;
        }
        
        &.status-expired {
          background-color: #f6f6f6;
          color: #999999;
        }
      }
    }
    
    .card-content {
      .time-info, .team-info {
        display: flex;
        align-items: center;
        margin-bottom: 16rpx;
        
        .time-icon, .team-icon {
          font-size: 28rpx;
          margin-right: 12rpx;
        }
        
        .time-text, .team-name {
          font-size: 28rpx;
          color: #333333;
        }
      }
      
      .participants-info {
        margin-bottom: 16rpx;
        
        .participants-text {
          font-size: 26rpx;
          color: #666666;
          margin-bottom: 8rpx;
        }
        
        .progress-bar {
          height: 8rpx;
          background-color: #f0f0f0;
          border-radius: 4rpx;
          overflow: hidden;
          
          .progress-fill {
            height: 100%;
            background-color: #ff6b35;
            transition: width 0.3s ease;
          }
        }
      }
      
      .price-info, .creator-info, .create-info {
        display: flex;
        align-items: center;
        margin-bottom: 12rpx;
        
        .price-label, .creator-label, .create-label {
          font-size: 24rpx;
          color: #999999;
          margin-right: 8rpx;
        }
        
        .price-value {
          font-size: 28rpx;
          font-weight: bold;
          color: #ff6b35;
        }
        
        .price-note {
          font-size: 20rpx;
          color: #999999;
          margin-left: 8rpx;
        }
        
        .creator-value, .create-value {
          font-size: 24rpx;
          color: #666666;
        }
      }
      
      .description {
        margin-top: 16rpx;
        padding: 16rpx;
        background-color: #f8f8f8;
        border-radius: 8rpx;
        
        text {
          font-size: 24rpx;
          color: #666666;
          line-height: 1.5;
        }
      }
    }
    
    .card-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20rpx;
      padding-top: 20rpx;
      border-top: 1rpx solid #f0f0f0;
      
      .organizer-info {
        display: flex;
        align-items: center;
        
        .organizer-name {
          font-size: 24rpx;
          color: #666666;
        }
      }
      
      .join-btn {
        padding: 12rpx 24rpx;
        background-color: #ff6b35;
        color: #ffffff;
        border-radius: 24rpx;
        font-size: 24rpx;
        border: none;
      }
      
      .join-disabled {
        padding: 12rpx 24rpx;
        background-color: #f0f0f0;
        color: #999999;
        border-radius: 24rpx;
        font-size: 24rpx;
        
        &.applied {
          background-color: #e8f4fd;
          color: #1890ff;
          border: 1rpx solid #91d5ff;
        }
        
        &.my-sharing {
          background-color: #fff2e8;
          color: #ff6b35;
          border: 1rpx solid #ffb366;
          font-weight: bold;
        }
      }
    }

    // 倒计时样式
    .countdown-container.simple {
      margin-top: 12rpx;
      padding: 6rpx 10rpx;
      font-size: 20rpx;

      .countdown-icon {
        font-size: 22rpx;
      }

      .countdown-content {
        .countdown-time {
          font-size: 20rpx;
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
  justify-content: center;
  padding: 120rpx 60rpx;
  
  .empty-icon {
    font-size: 120rpx;
    margin-bottom: 30rpx;
  }
  
  .empty-text {
    font-size: 28rpx;
    color: #999999;
  }
}

// 加载状态
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60rpx;
  
  text {
    font-size: 28rpx;
    color: #999999;
  }
}

// 加载更多
.load-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40rpx;
  
  text {
    font-size: 28rpx;
    color: #999999;
  }
}

// 筛选弹窗
.filter-modal {
  background-color: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 40rpx 30rpx;
  max-height: 80vh;
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40rpx;
    
    .modal-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333333;
    }
    
    .modal-close {
      font-size: 40rpx;
      color: #999999;
    }
  }
  
  .filter-content {
    .filter-group {
      margin-bottom: 40rpx;
      
      .group-title {
        font-size: 28rpx;
        font-weight: bold;
        color: #333333;
        margin-bottom: 20rpx;
      }
      
      .date-options, .participants-options {
        display: flex;
        flex-wrap: wrap;
        gap: 16rpx;
        
        .date-item, .participants-item {
          padding: 16rpx 24rpx;
          background-color: #f5f5f5;
          border-radius: 24rpx;
          font-size: 24rpx;
          color: #666666;
          
          &.active {
            background-color: #ff6b35;
            color: #ffffff;
          }
        }
      }
      
      .price-range {
        display: flex;
        align-items: center;
        gap: 16rpx;
        
        .price-input {
          flex: 1;
          padding: 16rpx;
          border: 1rpx solid #e0e0e0;
          border-radius: 8rpx;
          font-size: 24rpx;
        }
        
        .price-separator {
          font-size: 24rpx;
          color: #999999;
        }
      }
    }
  }
  
  .modal-footer {
    display: flex;
    gap: 20rpx;
    margin-top: 40rpx;
    
    .reset-btn, .confirm-btn {
      flex: 1;
      padding: 24rpx;
      border-radius: 12rpx;
      font-size: 28rpx;
      border: none;
    }
    
    .reset-btn {
      background-color: #f5f5f5;
      color: #666666;
    }
    
    .confirm-btn {
      background-color: #ff6b35;
      color: #ffffff;
    }
  }
}

/* 申请拼场弹窗 */
.apply-modal {
  background-color: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 0;
  width: 100%;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000002;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 40rpx 40rpx 20rpx;
    border-bottom: 1rpx solid #f0f0f0;
    
    .modal-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333333;
    }
    
    .close-btn {
      font-size: 36rpx;
      color: #999999;
      padding: 10rpx;
    }
  }
  
  .modal-content {
    padding: 40rpx;
    max-height: calc(80vh - 180rpx);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    
    .form-item {
      margin-bottom: 40rpx;
      
      .form-label {
        display: block;
        font-size: 28rpx;
        color: #333333;
        margin-bottom: 16rpx;
        
        .required {
          color: #ff4d4f;
        }
      }
      
      .form-hint {
        font-size: 24rpx;
        color: #999999;
        line-height: 1.5;
      }
      
      .form-input {
        width: 100%;
        padding: 24rpx;
        border: 1rpx solid #e0e0e0;
        border-radius: 12rpx;
        font-size: 28rpx;
        background-color: #ffffff;
        
        &:focus {
          border-color: #ff6b35;
        }
      }
      
      .form-textarea {
        width: 100%;
        padding: 24rpx;
        border: 1rpx solid #e0e0e0;
        border-radius: 12rpx;
        font-size: 28rpx;
        background-color: #ffffff;
        min-height: 120rpx;
        resize: none;
        
        &:focus {
          border-color: #ff6b35;
        }
      }
      
      .char-count {
        display: block;
        text-align: right;
        font-size: 24rpx;
        color: #999999;
        margin-top: 8rpx;
      }
    }
  }
  
  .modal-actions {
    display: flex;
    gap: 20rpx;
    padding: 20rpx 40rpx 40rpx;
    
    .modal-btn {
      flex: 1;
      padding: 28rpx;
      border-radius: 12rpx;
      font-size: 28rpx;
      border: none;
    }
    
    .cancel-btn {
      background-color: #f5f5f5;
      color: #666666;
    }
    
    .confirm-btn {
      background-color: #ff6b35;
      color: #ffffff;
      
      &:disabled {
        background-color: #ffcab3;
        color: #ffffff;
      }
    }
  }
}


/* uni-popup 弹窗容器样式 */
:deep(.uni-popup) {
  z-index: 1000000 !important;
  position: fixed !important;
}

:deep(.uni-popup__wrapper) {
  z-index: 1000002 !important;
  position: fixed !important;
}

:deep(.uni-popup__mask) {
  z-index: 1000001 !important;
  background-color: rgba(0, 0, 0, 0.7) !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
}

</style>