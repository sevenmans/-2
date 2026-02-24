<template>
  <view class="container">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="nav-left" @click="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">管理拼场</text>
      <view class="nav-right"></view>
    </view>
    
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>
    
    <!-- 错误状态 -->
    <view v-else-if="error" class="error-state">
      <text class="error-icon">⚠️</text>
      <text class="error-text">{{ error }}</text>
      <button class="retry-btn" @click="loadSharingDetail">
        重新加载
      </button>
    </view>
    
    <!-- 拼场详情 -->
    <view v-else-if="sharingDetail" class="content">
      <!-- 拼场基本信息 -->
      <view class="info-section">
        <view class="venue-header">
          <text class="venue-name">{{ sharingDetail.venueName }}</text>
          <view class="status-badge" :class="getStatusClass(sharingDetail.status)">
            <text class="status-text">{{ getStatusText(sharingDetail.status) }}</text>
          </view>
        </view>
        
        <!-- 队伍信息 -->
        <view class="team-info">
          <view class="team-header">
            <text class="team-name">{{ sharingDetail.teamName }}</text>
            <text class="creator-label">队长</text>
          </view>
          
          <!-- 参与人数进度 -->
          <view class="participants-progress">
            <view class="progress-info">
              <text class="progress-text">
                参与人数：{{ sharingDetail.currentParticipants }}/{{ sharingDetail.maxParticipants }}人
              </text>
              <text class="progress-percent">
                {{ getProgressPercent(sharingDetail.currentParticipants, sharingDetail.maxParticipants) }}%
              </text>
            </view>
            <view class="progress-bar">
              <view 
                class="progress-fill"
                :style="{ width: getProgressPercent(sharingDetail.currentParticipants, sharingDetail.maxParticipants) + '%' }"
              ></view>
            </view>
          </view>
        </view>
        
        <!-- 活动信息 -->
        <view class="activity-info">
          <view class="info-row">
            <text class="info-label">活动时间</text>
            <text class="info-value">{{ formatActivityTime(sharingDetail) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">每队费用</text>
            <text class="info-value price">¥{{ getPerTeamPrice() }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">订单号</text>
            <text class="info-value order-no">{{ sharingDetail.orderNo }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">创建时间</text>
            <text class="info-value">{{ formatDateTime(sharingDetail.createdAt) }}</text>
          </view>
        </view>
        
        <!-- 活动描述 -->
        <view v-if="sharingDetail.description" class="description">
          <text class="description-label">活动描述</text>
          <text class="description-text">{{ sharingDetail.description }}</text>
        </view>
      </view>
      
      <!-- 参与者管理 -->
      <view class="participants-section">
        <view class="section-title">
          <text class="title-text">队伍管理</text>
          <text class="count-text">({{ participants.length }}支)</text>
        </view>
        
        <view class="participants-list">
          <view 
            v-for="participant in participants" 
            :key="participant.id"
            class="participant-item"
          >
            <view class="participant-info">
              <image 
                class="participant-avatar" 
                :src="participant.avatar || '/static/images/default-avatar.png'"
                mode="aspectFill"
              />
              <view class="participant-details">
                <text class="participant-name">{{ participant.nickname || participant.username }}</text>
                <text class="participant-role">{{ participant.isCreator ? '队长' : '队员' }}</text>
              </view>
            </view>
            
            <!-- 移除按钮（仅对队员显示） -->
            <view 
              v-if="!participant.isCreator && canManage"
              class="remove-btn"
              @click="showRemoveConfirm(participant)"
            >
              <text class="remove-text">移除</text>
            </view>
          </view>
        </view>
        
        <view v-if="participants.length === 0" class="empty-participants">
          <text class="empty-icon">👥</text>
          <text class="empty-text">暂无参与者</text>
        </view>
      </view>
      
      <!-- 拼场设置 -->
      <view class="settings-section">
        <view class="section-title">
          <text class="title-text">拼场设置</text>
        </view>
        


        <view class="settings-list">
          <!-- 自动通过申请 -->
          <view class="setting-item">
            <view class="setting-info">
              <text class="setting-label">自动通过申请</text>
              <text class="setting-desc">
                {{ canManage ? '开启后，其他用户申请加入时将自动通过' : '请先完成支付后才能设置自动通过' }}
              </text>
            </view>
            <switch
              :checked="settings.autoApprove"
              @change="onAutoApproveChange"
              :disabled="!canManage"
              color="#ff6b35"
            />
          </view>
          
          <!-- 允许中途退出 -->
          <view class="setting-item">
            <view class="setting-info">
              <text class="setting-label">允许中途退出</text>
              <text class="setting-desc">开启后，参与者可以在活动开始前退出</text>
            </view>
            <switch
              :checked="settings.allowExit"
              @change="onAllowExitChange"
              :disabled="!canManage"
              color="#ff6b35"
            />
          </view>
        </view>
      </view>
      
      <!-- 拼场申请 -->
      <view v-if="requests.length > 0" class="requests-section">
        <view class="section-title">
          <text class="title-text">拼场申请</text>
          <text class="count-text">({{ pendingRequests.length }}条待处理)</text>
        </view>
        
        <view class="requests-list">
          <view 
            v-for="request in requests" 
            :key="request.id"
            class="request-item"
          >
            <view class="request-info">
              <image 
                class="request-avatar" 
                :src="request.userAvatar || '/static/images/default-avatar.png'"
                mode="aspectFill"
              />
              <view class="request-details">
                <text class="request-name">{{ request.userNickname || request.username }}</text>
                <text class="request-time">{{ formatDateTime(request.createdAt) }}</text>
              </view>
            </view>
            
            <view class="request-actions">
              <view v-if="request.status === 'PENDING'" class="action-buttons">
                <button 
                  class="action-btn reject-btn"
                  @click="handleRequest(request.id, 'REJECTED')"
                >
                  拒绝
                </button>
                <button 
                  class="action-btn approve-btn"
                  @click="handleRequest(request.id, 'APPROVED')"
                >
                  同意
                </button>
              </view>
              
              <view v-else class="request-status">
                <text class="status-text" :class="getRequestStatusClass(request.status)">
                  {{ getRequestStatusText(request.status) }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 底部操作栏 -->
    <view v-if="sharingDetail && canManage" class="bottom-actions">
      <button
        v-if="canConfirm"
        class="action-btn confirm-btn"
        @click="handleConfirmSharing"
      >
        确认拼场
      </button>

      <button
        v-if="canCancel"
        class="action-btn cancel-btn"
        @click="handleCancelSharing"
      >
        取消拼场
      </button>
    </view>
    
    <!-- 移除参与者确认弹窗 -->
    <uni-popup ref="removePopup" type="dialog" :mask-click="false">
      <uni-popup-dialog
        title="确认移除"
        :content="`确定要移除 ${removeTarget?.nickname || removeTarget?.username || '该参与者'} 吗？`"
        @confirm="confirmRemove"
        @close="cancelRemove"
      ></uni-popup-dialog>
    </uni-popup>

    <!-- 取消拼场确认弹窗 -->
    <uni-popup ref="cancelPopup" type="dialog" :mask-click="false">
      <uni-popup-dialog
        title="确认取消"
        content="确定要取消这个拼场吗？取消后将无法恢复。"
        @confirm="confirmCancel"
        @close="cancelCancelSharing"
      ></uni-popup-dialog>
    </uni-popup>
  </view>
</template>

<script>
import { useSharingStore } from '@/stores/sharing.js'
import { useUserStore } from '@/stores/user.js'
import { formatDate, formatDateTime } from '@/utils/helpers.js'
// 已移除popup-protection相关导入

export default {
  name: 'SharingManage',

  setup() {
    const sharingStore = useSharingStore()
    const userStore = useUserStore()
    return {
      sharingStore,
      userStore
    }
  },

  data() {
    return {
      sharingId: '',
      error: '',
      removeTarget: null,
      pendingSettings: {}, // 暂存未支付用户的设置
      settings: {
        autoApprove: true,
        allowExit: true
      },
      participants: [],
      requests: [],
      
      // 缓存和防重复请求
      lastRefreshTime: 0,
      cacheTimeout: 30000, // 30秒缓存
      isRefreshing: false,
      
      // 弹窗状态控制

      
      // 支付成功处理标志，防止数据刷新时自动显示弹窗
      isProcessingPaymentSuccess: false,
    }
  },
  
  computed: {
    // 使用Pinia store的getters（修复：使用新的getter名称）
    sharingOrderDetail() {
      return this.sharingStore.sharingOrderDetailGetter
    },
    loading() {
      return this.sharingStore.isLoading
    },
    userInfo() {
      return this.userStore.userInfoGetter
    },
    
    // 拼场详情
    sharingDetail() {
      return this.sharingOrderDetail
    },
    
    // 检查发起者是否已支付
    isCreatorPaid() {
      if (!this.sharingDetail) return false

      // 需要检查主订单(Order)的状态，而不是拼场订单(SharingOrder)的状态
      // sharingDetail.status 是 SharingOrder 的状态
      // sharingDetail.orderStatus 是主订单状态

      // 如果有主订单状态字段，优先使用
      const mainOrderStatus = this.sharingDetail.orderStatus
      if (mainOrderStatus) {
        // 已支付的状态包括：PAID, OPEN, APPROVED_PENDING_PAYMENT, SHARING_SUCCESS, CONFIRMED, VERIFIED, COMPLETED
        const paidStatuses = [
          'PAID',                    // 已支付（普通订单）
          'OPEN',                    // 开放中（拼场订单发起者已支付）
          'APPROVED_PENDING_PAYMENT', // 已批准待支付（发起者已支付，等待申请者支付）
          'SHARING_SUCCESS',         // 拼场成功（双方都已支付）
          'CONFIRMED',               // 已确认
          'VERIFIED',                // 已核销
          'COMPLETED'                // 已完成
        ]
        const isPaid = paidStatuses.includes(mainOrderStatus)


        return isPaid
      }

      // 如果没有主订单状态，通过拼场订单状态推断
      // SharingOrder.OPEN 状态通常表示发起者已支付
      const fallbackPaid = this.sharingDetail.status === 'OPEN'

      return fallbackPaid
    },

    // 是否可以管理（基础权限检查，不包括支付状态）
    canManage() {
      const hasSharingDetail = !!this.sharingDetail
      const hasUserInfo = !!this.userInfo
      const creatorMatch = this.sharingDetail?.creatorUsername === this.userInfo?.username
      const statusCheck = this.sharingDetail?.status === 'ACTIVE' || this.sharingDetail?.status === 'RECRUITING' || this.sharingDetail?.status === 'OPEN'

      // 基础权限检查（不包括支付状态）
      const result = hasSharingDetail && hasUserInfo && creatorMatch && statusCheck

      // 添加调试信息

      return result
    },
    
    // 是否可以确认
    canConfirm() {
      return this.sharingDetail?.status === 'OPEN' && 
             this.sharingDetail?.currentParticipants >= 2
    },
    
    // 是否可以取消
    canCancel() {
      return ['OPEN', 'FULL'].includes(this.sharingDetail?.status)
    },
    
    // 待处理申请
    pendingRequests() {
      return this.requests.filter(request => request.status === 'PENDING')
    }
  },
  
  onLoad(options) {

    if (options.id) {
      this.sharingId = options.id
      this.loadSharingDetail()
    } else {
      console.error('缺少拼场ID参数')
      this.error = '缺少拼场ID参数'
    }

    // 监听支付成功事件
    uni.$on('paymentSuccess', this.onPaymentSuccess)
  },
  
  onShow() {
    // 使用缓存优化，避免频繁刷新
    if (this.sharingId) {
      // 先加载暂存设置
      this.loadPendingSettings()

      // 使用缓存优化的刷新
      this.refreshDataWithCache().then(() => {
        // 检查是否有暂存的设置需要应用
        this.applyPendingSettings()
      })
    }
  },
  
  onPullDownRefresh() {
    this.loadSharingDetail().finally(() => {
      uni.stopPullDownRefresh()
    })
  },

  onUnload() {
    // 移除事件监听
    uni.$off('paymentSuccess', this.onPaymentSuccess)
  },
  
  methods: {
    // 使用Pinia store的actions
    async getSharingOrderDetail(orderId, forceRefresh = false) {
      return await this.sharingStore.getOrderDetail(orderId, forceRefresh)
    },
    async updateSharingSettings(data) {
      try {
        const result = await this.sharingStore.updateSharingSettings(data)
        return result
      } catch (error) {
        console.error('[ManagePage] updateSharingSettings 失败:', error)
        throw error
      }
    },
    async removeSharingParticipant(data) {
      // 这个方法需要在Pinia store中实现
    },
    async confirmSharingOrder(orderId) {
      return await this.sharingStore.confirmSharingOrder(orderId)
    },
    async cancelSharingOrder(orderId) {
      return await this.sharingStore.cancelSharingOrder(orderId)
    },
    async processSharingRequest(data) {
      return await this.sharingStore.processSharingRequest(data)
    },
    async getSharingRequests(params) {
      return await this.sharingStore.getReceivedRequestsList(params)
    },
    
    // 返回上一页
    goBack() {
      uni.navigateBack()
    },
    
    // 带缓存的刷新数据
    async refreshDataWithCache() {
      const now = Date.now()
      
      // 检查缓存有效性和防重复请求
      if (this.isRefreshing) {
        return
      }
      
      // 如果有数据且在缓存时间内，跳过刷新
      if (this.sharingDetail && (now - this.lastRefreshTime) < this.cacheTimeout) {
        return
      }
      
      // 执行真正的刷新
      await this.loadSharingDetail()
    },
    
    // 加载拼场详情
    async loadSharingDetail() {
      if (!this.sharingId) return
      
      // 防止重复调用
      if (this.isRefreshing) {
        return
      }
      
      this.isRefreshing = true
      
      try {
        this.error = ''
        
        // 加载拼场详情
        await this.getSharingOrderDetail(this.sharingId)

        if (this.sharingDetail) {

          // 初始化设置
          this.settings = {
            autoApprove: this.sharingDetail.autoApprove || false,
            allowExit: this.sharingDetail.allowExit || false
          }
          
          // 模拟参与者数据（实际应该从API获取）
          this.participants = [
            {
              id: 'creator',
              username: this.sharingDetail.creatorUsername,
              nickname: this.sharingDetail.creatorUsername,
              avatar: '',
              isCreator: true
            }
          ]
          
          // 添加其他参与者（模拟数据）
          for (let i = 1; i < this.sharingDetail.currentParticipants; i++) {
            this.participants.push({
              id: `participant_${i}`,
              username: `user_${i}`,
              nickname: `用户${i}`,
              avatar: '',
              isCreator: false
            })
          }
          
          // 加载拼场申请
          await this.loadSharingRequests()
          
          // 更新缓存时间
          this.lastRefreshTime = Date.now()
          
        } else {
          this.error = '拼场不存在或已被删除'
        }
        
      } catch (error) {
        console.error('拼场管理页面：加载拼场详情失败:', error)
        this.error = error.message || '加载失败，请重试'
      } finally {
        this.isRefreshing = false
      }
    },
    
    // 加载拼场申请
    async loadSharingRequests() {
      try {
        const requests = await this.getSharingRequests(this.sharingId)
        this.requests = requests || []
      } catch (error) {
        console.error('拼场管理页面：加载拼场申请失败:', error)
        this.requests = []
      }
    },

    // 自动通过申请开关变化
    async onAutoApproveChange(e) {
      const newValue = e.detail.value
      const oldValue = this.settings.autoApprove


      // 如果要开启自动通过，检查发起者是否已支付
      if (newValue && !this.isCreatorPaid) {
        
        // 暂存设置，等待支付后应用
        this.pendingSettings = {
          ...this.pendingSettings,
          autoApprove: newValue
        }

        // 保存暂存设置到本地存储
        uni.setStorageSync(`pendingSettings_${this.sharingId}`, this.pendingSettings)

        uni.showModal({
          title: '需要先支付',
          content: '支付完成后，自动通过申请功能将自动开启。',
          showCancel: true,
          cancelText: '取消',
          confirmText: '去支付',
          success: (res) => {
            if (res.confirm) {
              // 跳转到支付页面，带上来源标识
              uni.navigateTo({
                url: `/pages/payment/index?orderId=${this.sharingDetail.orderId}&type=sharing&from=sharing-manage`
              })
            } else {
              // 用户取消，清除暂存设置并恢复开关状态
              this.pendingSettings = {}
              uni.removeStorageSync(`pendingSettings_${this.sharingId}`)
              // 强制刷新页面数据以恢复开关状态
              this.$forceUpdate()
            }
          }
        })
        return
      }

      try {
        
        // 先更新本地状态，提供即时反馈
        this.settings.autoApprove = newValue

        // 调用API更新设置
        const result = await this.updateSharingSettings({
          sharingId: this.sharingId,
          settings: {
            autoApprove: newValue,
            allowExit: this.settings.allowExit
          }
        })


        uni.showToast({
          title: newValue ? '已开启自动通过' : '已关闭自动通过',
          icon: 'success'
        })

      } catch (error) {
        console.error('[ManagePage] 更新自动通过设置失败:', error)
        
        // 失败时回滚状态
        this.settings.autoApprove = oldValue
        this.$forceUpdate() // 强制更新界面
        
        uni.showToast({
          title: error.message || '设置失败',
          icon: 'error'
        })
      }
    },
    
    // 允许中途退出开关变化
    async onAllowExitChange(e) {
      const newValue = e.detail.value
      const oldValue = this.settings.allowExit


      try {
        
        // 先更新本地状态，提供即时反馈
        this.settings.allowExit = newValue

        // 调用API更新设置
        const result = await this.updateSharingSettings({
          sharingId: this.sharingId,
          settings: {
            autoApprove: this.settings.autoApprove,
            allowExit: newValue
          }
        })
        
        
        uni.showToast({
          title: newValue ? '已允许中途退出' : '已禁止中途退出',
          icon: 'success'
        })
        
      } catch (error) {
        console.error('[ManagePage] 更新退出设置失败:', error)
        
        // 失败时回滚状态
        this.settings.allowExit = oldValue
        this.$forceUpdate() // 强制更新界面
        
        uni.showToast({
          title: error.message || '设置失败',
          icon: 'error'
        })
      }
    },
    
    // 显示移除确认弹窗
    showRemoveConfirm(participant) {
      // 创建用户操作上下文
      const actionContext = createUserActionContext('user', {
        action: 'showRemoveConfirm',
        component: 'sharing/manage',
        eventType: 'click',
        target: participant?.id
      })
      
      // 使用新的用户操作验证机制
      if (!validateUserAction(actionContext)) {
        return
      }
      
      // 弹窗防护：检查是否在处理支付成功事件
      if (this.isProcessingPaymentSuccess) {
        return
      }
      
      this.removeTarget = participant
      this.showRemovePopup()
    },

    // 确认移除参与者
    async confirmRemove() {
      if (!this.removeTarget) return
      
      try {
        // 关闭弹窗
        this.closeRemovePopup()
        
        // 已移除popup-protection相关调用
        
        await this.removeSharingParticipant({
          sharingId: this.sharingId,
          participantId: this.removeTarget.id
        })
        
        // 从本地列表中移除
        const index = this.participants.findIndex(p => p.id === this.removeTarget.id)
        if (index > -1) {
          this.participants.splice(index, 1)
        }
        
        // 更新拼场详情中的参与人数
        if (this.sharingDetail) {
          this.sharingDetail.currentParticipants--
        }
        
        uni.showToast({
          title: '移除成功',
          icon: 'success'
        })
        
        // 清理状态
        this.removeTarget = null
        
      } catch (error) {
        console.error('拼场管理页面：移除参与者失败:', error)
        uni.showToast({
          title: error.message || '移除失败',
          icon: 'error'
        })
        // 出错时也要关闭弹窗
        this.closeRemovePopup()
        
        // 已移除popup-protection相关调用
      }
    },
    
    // 显示移除确认弹窗
    showRemovePopup() {
      const debugEnabled = false // 调试开关
      
      try {
        // 优先使用 $refs
        if (this.$refs.removePopup) {
          this.$refs.removePopup.open()
          return
        }
        
        // 微信小程序环境下的备选方案
        if (typeof uni !== 'undefined' && uni.getSystemInfoSync && this.$scope) {
          const systemInfo = uni.getSystemInfoSync()
          if (systemInfo.platform === 'devtools' || systemInfo.uniPlatform === 'mp-weixin') {
            const popup = this.$scope.selectComponent('#removePopup')
            if (popup) {
              popup.open()
              return
            }
          }
        }
        
      } catch (error) {
        if (debugEnabled) console.error('打开移除确认弹窗失败:', error)
      }
    },
    
    // 关闭移除确认弹窗
    closeRemovePopup() {
      const debugEnabled = false // 调试开关
      
      try {
        // 优先使用 $refs
        if (this.$refs.removePopup) {
          this.$refs.removePopup.close()
          return
        }
        
        // 微信小程序环境下的备选方案
        if (typeof uni !== 'undefined' && uni.getSystemInfoSync && this.$scope) {
          const systemInfo = uni.getSystemInfoSync()
          if (systemInfo.platform === 'devtools' || systemInfo.uniPlatform === 'mp-weixin') {
            const popup = this.$scope.selectComponent('#removePopup')
            if (popup) {
              popup.close()
              return
            }
          }
        }
        
      } catch (error) {
        if (debugEnabled) console.error('关闭移除确认弹窗失败:', error)
      }
    },
    
    // 取消移除
    cancelRemove() {
      this.closeRemovePopup()
      this.removeTarget = null
    },
    
    // 处理拼场申请
    async handleRequest(requestId, action) {
      try {
        await this.processSharingRequest({
          requestId,
          action: action === 'APPROVED' ? 'approve' : 'reject'
        })
        
        // 更新本地申请状态
        const request = this.requests.find(r => r.id === requestId)
        if (request) {
          request.status = action
        }
        
        // 如果是同意申请，更新参与者列表和人数
        if (action === 'APPROVED') {
          if (request) {
            this.participants.push({
              id: request.userId,
              username: request.username,
              nickname: request.userNickname,
              avatar: request.userAvatar,
              isCreator: false
            })
          }
          
          if (this.sharingDetail) {
            this.sharingDetail.currentParticipants++
          }
        }
        
        uni.showToast({
          title: action === 'APPROVED' ? '已同意申请' : '已拒绝申请',
          icon: 'success'
        })

        // 通知其他页面刷新数据
        uni.$emit('sharingDataChanged', {
          orderId: this.sharingId,
          action: action,
          currentParticipants: this.sharingDetail?.currentParticipants || 0
        })

      } catch (error) {
        console.error('拼场管理页面：处理申请失败:', error)

        // 检查是否需要跳转到支付页面
        if (error.needPayment && error.orderId) {

          // 显示提示信息
          uni.showModal({
            title: '需要先支付',
            content: error.message || '发起者尚未支付，无法批准申请。请先完成支付后再处理申请。',
            showCancel: true,
            cancelText: '取消',
            confirmText: '去支付',
            success: (res) => {
              if (res.confirm) {
                // 跳转到支付页面
                uni.navigateTo({
                  url: `/pages/payment/index?orderId=${error.orderId}&from=sharing-manage`
                })
              }
            }
          })
        } else {
          // 普通错误提示
          uni.showToast({
            title: error.message || '操作失败',
            icon: 'error'
          })
        }
      }
    },
    
    // 处理确认拼场点击
    handleConfirmSharing() {
      if (!this.isCreatorPaid) {
        this.showPaymentPrompt()
        return
      }
      this.confirmSharing()
    },

    // 处理取消拼场点击
    handleCancelSharing() {
      if (!this.isCreatorPaid) {
        this.showPaymentPrompt()
        return
      }
      this.showCancelConfirm()
    },

    // 显示支付提示
    showPaymentPrompt() {
      uni.showModal({
        title: '需要先支付',
        content: '请先完成订单支付后再管理拼场',
        confirmText: '去支付',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            // 跳转到支付页面
            uni.navigateTo({
              url: `/pages/payment/index?orderId=${this.sharingDetail.orderId}&type=sharing`
            })
          }
        }
      })
    },

    // 强制刷新数据（不使用缓存）
    async forceRefreshData() {
      try {

        // 清除错误状态
        this.error = ''

        // 清除store中的缓存数据
        this.sharingStore.setSharingOrderDetail(null)

        // 强制重新加载数据
        await this.getSharingOrderDetail(this.sharingId, true)

        // 检查数据获取结果
        if (this.sharingDetail) {
          // 重新初始化设置
          this.settings = {
            autoApprove: this.sharingDetail.autoApprove || false,
            allowExit: this.sharingDetail.allowExit || false
          }

          // 重新加载拼场申请
          await this.loadSharingRequests()

        } else {
          this.error = '拼场不存在或已被删除'
        }

      } catch (error) {
        console.error('强制刷新数据失败:', error)
        uni.showToast({
          title: '数据刷新失败',
          icon: 'error'
        })
      }
    },

    // 处理支付成功事件
    async onPaymentSuccess(eventData) {
      
      // 已移除logPopupAction调用
      
      // 检查是否需要防止自动弹窗
      if (eventData.preventAutoPopup) {
        // 已移除logPopupAction调用
      }
      
      // 确保所有弹窗都关闭
      this.closeRemovePopup()
      this.closeCancelPopup()

      if (eventData.type === 'sharing' && eventData.fromPage === 'sharing-manage') {
        
        // 支付成功处理开始

        try {
          // 支付的是主订单ID，需要通过主订单ID找到对应的拼场订单
          const mainOrderId = eventData.orderId

          // 延迟一下再查找，确保后端数据已经更新
          setTimeout(async () => {
            try {
              // 通过主订单ID查找拼场订单
              await this.findSharingOrderByMainOrderId(mainOrderId)
              
              // 处理成功
            } catch (error) {
              console.error('通过主订单ID查找拼场订单失败:', error)
              
              // 如果查找失败，尝试刷新当前拼场订单
              this.forceRefreshData()
            }
          }, 1000)

        } catch (error) {
          console.error('处理支付成功事件失败:', error)
          
          // 降级处理：直接刷新当前数据
          setTimeout(() => {
            this.forceRefreshData()
          }, 1000)
        }
      } else {
        // 非相关事件，忽略
      }
    },

    // 通过主订单ID查找拼场订单
    async findSharingOrderByMainOrderId(mainOrderId) {
      try {

        // 调用store方法
        const newSharingOrderId = await this.sharingStore.getOrderDetailByMainOrderId(mainOrderId)

        if (newSharingOrderId) {
          // 更新当前页面的拼场订单ID
          this.sharingId = newSharingOrderId.toString()

          // 清除错误状态
          this.error = ''

          // 重新初始化设置
          if (this.sharingDetail) {
            this.settings = {
              autoApprove: this.sharingDetail.autoApprove || false,
              allowExit: this.sharingDetail.allowExit || false
            }

            // 重新加载拼场申请
            await this.loadSharingRequests()
          }

        } else {
          throw new Error('未找到对应的拼场订单')
        }

      } catch (error) {
        console.error('通过主订单ID查找拼场订单失败:', error)
        throw error
      }
    },

    // 加载暂存设置
    loadPendingSettings() {
      try {
        const savedSettings = uni.getStorageSync(`pendingSettings_${this.sharingId}`)
        if (savedSettings && typeof savedSettings === 'object') {
          this.pendingSettings = savedSettings
        }
      } catch (error) {
        console.error('加载暂存设置失败:', error)
        this.pendingSettings = {}
      }
    },

    // 应用暂存的设置
    async applyPendingSettings() {
      if (Object.keys(this.pendingSettings).length === 0) {
        return // 没有暂存设置
      }

      if (!this.isCreatorPaid) {
        return // 仍未支付，不应用设置
      }

      try {

        // 合并当前设置和暂存设置
        const newSettings = {
          autoApprove: this.pendingSettings.autoApprove !== undefined ? this.pendingSettings.autoApprove : this.settings.autoApprove,
          allowExit: this.pendingSettings.allowExit !== undefined ? this.pendingSettings.allowExit : this.settings.allowExit
        }

        await this.updateSharingSettings({
          sharingId: this.sharingId,
          settings: newSettings
        })

        // 更新本地设置
        this.settings = { ...newSettings }

        // 清空暂存设置
        this.pendingSettings = {}
        uni.removeStorageSync(`pendingSettings_${this.sharingId}`)

        uni.showToast({
          title: '设置已自动应用',
          icon: 'success'
        })

      } catch (error) {
        console.error('应用暂存设置失败:', error)
        // 保留暂存设置，下次再试
      }
    },

    // 确认拼场
    async confirmSharing() {
      if (!this.sharingId) {
        uni.showToast({
          title: '拼场ID缺失',
          icon: 'error'
        })
        return
      }

      try {
        uni.showLoading({ title: '确认中...' })

        const result = await this.confirmSharingOrder(this.sharingId)

        uni.hideLoading()

        uni.showToast({
          title: '确认成功',
          icon: 'success'
        })

        // 刷新页面数据
        setTimeout(() => {
          this.loadSharingDetail()
        }, 1500)

      } catch (error) {
        uni.hideLoading()
        console.error('拼场管理页面：确认拼场失败:', error)
        uni.showToast({
          title: error.message || '确认失败',
          icon: 'error'
        })
      }
    },
    
    // 显示取消确认弹窗
    showCancelConfirm() {
      const debugEnabled = false // 调试开关
      
      try {
        // 优先使用 $refs
        if (this.$refs.cancelPopup) {
          this.$refs.cancelPopup.open()
          return
        }
        
        // 微信小程序环境下的备选方案
        if (typeof uni !== 'undefined' && uni.getSystemInfoSync && this.$scope) {
          const systemInfo = uni.getSystemInfoSync()
          if (systemInfo.platform === 'devtools' || systemInfo.uniPlatform === 'mp-weixin') {
            const popup = this.$scope.selectComponent('#cancelPopup')
            if (popup) {
              popup.open()
              return
            }
          }
        }
        
      } catch (error) {
        if (debugEnabled) console.error('显示取消确认弹窗失败:', error)
      }
    },
    
    // 确认取消拼场
    async confirmCancel() {
      if (!this.sharingId) {
        uni.showToast({
          title: '拼场ID缺失',
          icon: 'error'
        })
        this.showCancelPopup = false
        
        // 拼场ID缺失
        return
      }

      try {
        uni.showLoading({ title: '取消中...' })
        
        // 确认取消拼场
        
        const result = await this.cancelSharingOrder(this.sharingId)
        
        uni.hideLoading()
        
        uni.showToast({
          title: '取消成功',
          icon: 'success'
        })
        
        // 关闭弹窗
        this.closeCancelPopup()
        
        // 返回上一页
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
        
      } catch (error) {
        uni.hideLoading()
        console.error('拼场管理页面：取消拼场失败:', error)
        uni.showToast({
          title: error.message || '取消失败',
          icon: 'error'
        })
        // 出错时也要关闭弹窗
        this.closeCancelPopup()
        
        // 取消拼场失败
      }
    },
    
    // 关闭取消确认弹窗
    closeCancelPopup() {
      const debugEnabled = false // 调试开关
      
      try {
        // 优先使用 $refs
        if (this.$refs.cancelPopup) {
          this.$refs.cancelPopup.close()
          return
        }
        
        // 微信小程序环境下的备选方案
        if (typeof uni !== 'undefined' && uni.getSystemInfoSync && this.$scope) {
          const systemInfo = uni.getSystemInfoSync()
          if (systemInfo.platform === 'devtools' || systemInfo.uniPlatform === 'mp-weixin') {
            const popup = this.$scope.selectComponent('#cancelPopup')
            if (popup) {
              popup.close()
              return
            }
          }
        }
        
      } catch (error) {
        if (debugEnabled) console.error('关闭取消确认弹窗失败:', error)
      }
    },
    
    // 取消取消拼场操作
    cancelCancelSharing() {
      const debugEnabled = false // 调试开关
      this.showCancelPopup = false
      this.closeCancelPopup()
    },
    
    // 获取进度百分比
    getProgressPercent(current, max) {
      if (!max || max === 0) return 0
      return Math.round((current / max) * 100)
    },
    
    // 格式化活动时间（参考预约订单的实现）
    formatActivityTime(sharing) {
      if (!sharing) return '--'
      
      const bookingDate = sharing.bookingDate || sharing.date
      const startTime = sharing.startTime || sharing.bookingStartTime
      const endTime = sharing.endTime || sharing.bookingEndTime
      const timeSlotCount = sharing.timeSlotCount || 1
      
      if (!bookingDate) {
        return '时间未知'
      }
      
      const date = this.formatDate(bookingDate)
      
      if (!startTime || !endTime) {
        if (timeSlotCount && timeSlotCount > 0) {
          return `${date} (${timeSlotCount}个时段)`
        }
        return `${date} 时间待定`
      }
      
      // 格式化时间显示（去掉秒数）
      const formatTime = (timeStr) => {
        if (!timeStr) return ''
        if (timeStr.length > 5 && timeStr.includes(':')) {
          return timeStr.substring(0, 5)
        }
        return timeStr
      }
      
      const formattedStart = formatTime(startTime)
      const formattedEnd = formatTime(endTime)
      
      // 如果有多个时间段，显示时间段数量
      if (timeSlotCount > 1) {
        return `${date} ${formattedStart}-${formattedEnd} (${timeSlotCount}个时段)`
      }
      
      return `${date} ${formattedStart}-${formattedEnd}`
    },
    
    // 格式化日期
    formatDate(date) {
      if (!date) return '--'
      try {
        const dateObj = new Date(date)
        if (isNaN(dateObj.getTime())) return '--'
        const year = dateObj.getFullYear()
        const month = String(dateObj.getMonth() + 1).padStart(2, '0')
        const day = String(dateObj.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      } catch (error) {
        console.error('日期格式化错误:', error)
        return '--'
      }
    },
    
    // 格式化日期时间
    formatDateTime(datetime) {
      if (!datetime) return '--'
      try {
        // 处理 iOS 兼容性问题：将 "2025-07-13 23:34:22" 格式转换为 "2025/07/13 23:34:22"
        let dateStr = datetime
        if (typeof datetime === 'string' && datetime.includes(' ') && datetime.includes('-')) {
          dateStr = datetime.replace(/-/g, '/')
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
      
      // 格式化时间显示（去掉秒数）
      const formatTime = (timeStr) => {
        if (!timeStr) return ''
        if (timeStr.length > 5 && timeStr.includes(':')) {
          return timeStr.substring(0, 5)
        }
        return timeStr
      }
      
      const formattedStart = formatTime(startTime)
      const formattedEnd = formatTime(endTime)
      
      return `${formattedStart}-${formattedEnd}`
    },
    
    // 格式化价格显示
    formatPrice(price) {
      if (!price && price !== 0) return '0.00'
      const numPrice = Number(price)
      if (isNaN(numPrice)) return '0.00'
      return numPrice.toFixed(2)
    },

    // 获取每队费用
    getPerTeamPrice() {
      if (!this.sharingDetail) return '0.00'
      
      // 如果有明确的每队费用，直接使用
      if (this.sharingDetail.pricePerPerson) {
        return this.formatPrice(this.sharingDetail.pricePerPerson)
      }
      
      // 否则根据总费用和队伍数量计算
      const totalPrice = this.sharingDetail.totalPrice || this.sharingDetail.price || 0
      const maxParticipants = this.sharingDetail.maxParticipants || 2
      const perTeamPrice = totalPrice / maxParticipants
      
      return this.formatPrice(perTeamPrice)
    },
    
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        'OPEN': '招募中',
        'FULL': '已满员',
        'CONFIRMED': '已确认',
        'CANCELLED': '已取消',
        'EXPIRED': '已过期'
      }
      return statusMap[status] || '未知状态'
    },
    
    // 获取状态样式类
    getStatusClass(status) {
      const classMap = {
        'OPEN': 'status-open',
        'FULL': 'status-full',
        'CONFIRMED': 'status-confirmed',
        'CANCELLED': 'status-cancelled',
        'EXPIRED': 'status-expired'
      }
      return classMap[status] || 'status-unknown'
    },
    
    // 获取申请状态文本
    getRequestStatusText(status) {
      const statusMap = {
        'PENDING': '待处理',
        'APPROVED': '已同意',
        'REJECTED': '已拒绝'
      }
      return statusMap[status] || '未知状态'
    },
    
    // 获取申请状态样式类
    getRequestStatusClass(status) {
      const classMap = {
        'PENDING': 'request-pending',
        'APPROVED': 'request-approved',
        'REJECTED': 'request-rejected'
      }
      return classMap[status] || 'request-unknown'
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 120rpx;
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

// 信息区块
.info-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  
  .venue-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24rpx;
    
    .venue-name {
      font-size: 36rpx;
      font-weight: bold;
      color: #333333;
    }
    
    .status-badge {
      padding: 8rpx 16rpx;
      border-radius: 20rpx;
      
      .status-text {
        font-size: 24rpx;
        font-weight: bold;
      }
      
      &.status-open {
        background-color: #e6f7ff;
        .status-text { color: #1890ff; }
      }
      
      &.status-full {
        background-color: #fff7e6;
        .status-text { color: #fa8c16; }
      }
      
      &.status-confirmed {
        background-color: #f6ffed;
        .status-text { color: #52c41a; }
      }
      
      &.status-cancelled {
        background-color: #fff2f0;
        .status-text { color: #ff4d4f; }
      }
      
      &.status-expired {
        background-color: #f5f5f5;
        .status-text { color: #999999; }
      }
    }
  }
  
  .team-info {
    margin-bottom: 24rpx;
    
    .team-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16rpx;
      
      .team-name {
        font-size: 28rpx;
        font-weight: bold;
        color: #333333;
      }
      
      .creator-label {
        font-size: 22rpx;
        color: #ff6b35;
        background-color: #fff7f0;
        padding: 4rpx 12rpx;
        border-radius: 12rpx;
      }
    }
    
    .participants-progress {
      .progress-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12rpx;
        
        .progress-text {
          font-size: 26rpx;
          color: #666666;
        }
        
        .progress-percent {
          font-size: 24rpx;
          color: #ff6b35;
          font-weight: bold;
        }
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
  }
  
  .activity-info {
    margin-bottom: 24rpx;
    
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12rpx 0;
      border-bottom: 1rpx solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      .info-label {
        font-size: 26rpx;
        color: #666666;
      }
      
      .info-value {
        font-size: 26rpx;
        color: #333333;
        
        &.price {
          color: #ff6b35;
          font-weight: bold;
        }
        
        &.order-no {
          font-family: monospace;
          font-size: 22rpx;
        }
      }
    }
  }
  
  .description {
    .description-label {
      font-size: 26rpx;
      color: #666666;
      display: block;
      margin-bottom: 12rpx;
    }
    
    .description-text {
      font-size: 26rpx;
      color: #333333;
      line-height: 1.5;
    }
  }
}

// 区块标题
.section-title {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  
  .title-text {
    font-size: 32rpx;
    font-weight: bold;
    color: #333333;
  }
  
  .count-text {
    font-size: 24rpx;
    color: #999999;
    margin-left: 12rpx;
  }
}

// 参与者区块
.participants-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  
  .participants-list {
    .participant-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20rpx 0;
      border-bottom: 1rpx solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      .participant-info {
        display: flex;
        align-items: center;
        flex: 1;
        
        .participant-avatar {
          width: 80rpx;
          height: 80rpx;
          border-radius: 50%;
          margin-right: 20rpx;
        }
        
        .participant-details {
          .participant-name {
            font-size: 28rpx;
            color: #333333;
            display: block;
            margin-bottom: 6rpx;
          }
          
          .participant-role {
            font-size: 22rpx;
            color: #999999;
          }
        }
      }
      
      .remove-btn {
        padding: 12rpx 24rpx;
        background-color: #fff2f0;
        border-radius: 20rpx;
        
        .remove-text {
          font-size: 24rpx;
          color: #ff4d4f;
        }
      }
    }
  }
  
  .empty-participants {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80rpx 0;
    
    .empty-icon {
      font-size: 120rpx;
      margin-bottom: 20rpx;
    }
    
    .empty-text {
      font-size: 26rpx;
      color: #999999;
    }
  }
}

// 设置区块
.settings-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  
  .settings-list {
    .setting-item {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 24rpx 0;
      border-bottom: 1rpx solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      .setting-info {
        flex: 1;
        margin-right: 20rpx;
        
        .setting-label {
          font-size: 28rpx;
          color: #333333;
          display: block;
          margin-bottom: 8rpx;
        }
        
        .setting-desc {
          font-size: 24rpx;
          color: #999999;
          line-height: 1.4;
        }
      }
    }
  }
}

// 申请区块
.requests-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  
  .requests-list {
    .request-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20rpx 0;
      border-bottom: 1rpx solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      .request-info {
        display: flex;
        align-items: center;
        flex: 1;
        
        .request-avatar {
          width: 80rpx;
          height: 80rpx;
          border-radius: 50%;
          margin-right: 20rpx;
        }
        
        .request-details {
          .request-name {
            font-size: 28rpx;
            color: #333333;
            display: block;
            margin-bottom: 6rpx;
          }
          
          .request-time {
            font-size: 22rpx;
            color: #999999;
          }
        }
      }
      
      .request-actions {
        .action-buttons {
          display: flex;
          gap: 12rpx;
          
          .action-btn {
            padding: 12rpx 20rpx;
            border: none;
            border-radius: 20rpx;
            font-size: 24rpx;
            
            &.reject-btn {
              background-color: #f5f5f5;
              color: #666666;
            }
            
            &.approve-btn {
              background-color: #ff6b35;
              color: #ffffff;
            }
          }
        }
        
        .request-status {
          .status-text {
            font-size: 24rpx;
            padding: 8rpx 16rpx;
            border-radius: 12rpx;
            
            &.request-pending {
              background-color: #fff7e6;
              color: #fa8c16;
            }
            
            &.request-approved {
              background-color: #f6ffed;
              color: #52c41a;
            }
            
            &.request-rejected {
              background-color: #fff2f0;
              color: #ff4d4f;
            }
          }
        }
      }
    }
  }
}

// 底部操作栏
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  padding: 20rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
  display: flex;
  gap: 20rpx;
  
  .action-btn {
    flex: 1;
    height: 80rpx;
    border: none;
    border-radius: 12rpx;
    font-size: 28rpx;
    font-weight: bold;
    
    &.confirm-btn {
      background-color: #ff6b35;
      color: #ffffff;
    }
    
    &.cancel-btn {
      background-color: #f5f5f5;
      color: #666666;
    }
  }
}
</style>