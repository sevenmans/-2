<template>
  <view class="container">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>
    
    <!-- 拼场详情 -->
    <view v-else-if="sharingOrderDetail" class="sharing-detail">
      <!-- 拼场状态 -->
      <view class="status-section">
        <view class="status-badge" :class="getStatusClass(sharingOrderDetail.status)">
          {{ getStatusText(sharingOrderDetail.status) }}
        </view>

        <!-- 倒计时显示 -->
        <CountdownTimer
          v-if="shouldShowCountdown(sharingOrderDetail)"
          :order="sharingOrderDetail"
          label="距离自动取消"
          @expired="onCountdownExpired"
        />
      </view>
      
      <!-- 队伍信息 -->
      <view class="team-section">
        <view class="section-title">队伍信息</view>
        <view class="team-card">
          <view class="team-header">
            <text class="team-name">{{ sharingOrderDetail.teamName || '未命名队伍' }}</text>
            <text class="team-creator">队长：{{ sharingOrderDetail.creatorUsername || '未知' }}</text>
          </view>
          
          <view class="participants-info">
            <view class="participants-count">
              <text class="count-text">参与球队：{{ sharingOrderDetail.currentParticipants || 0 }}/{{ sharingOrderDetail.maxParticipants || 2 }}支</text>
            </view>
            <view class="progress-bar">
              <view 
                class="progress-fill" 
                :style="{ width: getProgressWidth() + '%' }"
              ></view>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 场馆信息 -->
      <view class="venue-section">
        <view class="section-title">场馆信息</view>
        <view class="venue-card" @click="navigateToVenue">
          <view class="venue-header">
            <text class="venue-name">{{ sharingOrderDetail.venueName || '未知场馆' }}</text>
            <text class="venue-arrow">›</text>
          </view>
          <view class="venue-info">
            <text class="venue-location">📍 {{ sharingOrderDetail.venueLocation || '位置未知' }}</text>
          </view>
        </view>
      </view>
      
      <!-- 活动信息 -->
      <view class="activity-section">
        <view class="section-title">活动信息</view>
        <view class="activity-card">
          <view class="info-item">
            <text class="info-label">活动时间</text>
            <text class="info-value">{{ formatActivityTime() }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">每队费用</text>
            <text class="info-value price">¥{{ getPerTeamPrice() }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">总费用</text>
            <text class="info-value">¥{{ getTotalPrice() }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">订单号</text>
            <text class="info-value">{{ sharingOrderDetail.orderNo || '无' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">创建时间</text>
            <text class="info-value">{{ formatDateTime(sharingOrderDetail.createdAt) }}</text>
          </view>
          <view v-if="sharingOrderDetail.description" class="description-item">
            <text class="info-label">活动描述</text>
            <text class="description-text">{{ sharingOrderDetail.description }}</text>
          </view>
        </view>
      </view>
      
      <!-- 参与者列表 -->
      <view class="participants-section">
        <view class="section-title">参与队伍 ({{ participants.length }}支)</view>
        <view class="participants-list">
          <view 
            v-for="participant in participants" 
            :key="participant.id || participant.username" 
            class="participant-item"
          >
            <view class="participant-info">
              <image 
                :src="participant.avatar || '/static/images/default-avatar.svg'" 
                class="participant-avatar"
              />
              <view class="participant-details">
                <text class="participant-name">{{ participant.nickname || participant.username || '未知用户' }}</text>
                <text class="participant-role">{{ getParticipantRole(participant) }}</text>
              </view>
            </view>
            
            <!-- 队长可以移除队员 -->
            <view 
              v-if="isOrganizer && !isParticipantOrganizer(participant)" 
              class="remove-btn"
              @click="removeParticipant(participant)"
            >
              移除
            </view>
          </view>
        </view>
      </view>
      
      <!-- 联系信息（仅参与者可见） -->
      <view v-if="showContactInfo" class="contact-section">
        <view class="section-title">联系信息</view>
        <view class="contact-card">
          <view v-if="sharingOrderDetail.contactInfo?.phone" class="contact-item">
            <text class="contact-label">联系电话</text>
            <text class="contact-value" @click="makePhoneCall">{{ sharingOrderDetail.contactInfo.phone }}</text>
          </view>
          <view v-if="sharingOrderDetail.contactInfo?.wechat" class="contact-item">
            <text class="contact-label">微信号</text>
            <text class="contact-value">{{ sharingOrderDetail.contactInfo.wechat }}</text>
          </view>
        </view>
      </view>
      
      <!-- 活动规则 -->
      <view class="rules-section">
        <view class="section-title">活动规则</view>
        <view class="rules-card">
          <view class="rule-item">
            <text class="rule-label">自动通过申请</text>
            <text class="rule-value">{{ sharingOrderDetail.autoApprove ? '是' : '否' }}</text>
          </view>
          <view class="rule-item">
            <text class="rule-label">允许中途退出</text>
            <text class="rule-value">{{ sharingOrderDetail.allowExit ? '是' : '否' }}</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 错误状态 -->
    <view v-else class="error-state">
      <text class="error-icon">❌</text>
      <text class="error-text">拼场信息加载失败</text>
      <button class="retry-btn" @click="loadSharingDetail">重试</button>
    </view>
    
    <!-- 底部操作栏 -->
    <view v-if="sharingOrderDetail" class="bottom-actions">
      <!-- 非参与者 -->
      <view v-if="!isParticipant" class="action-group">
        <button 
          v-if="canJoin" 
          class="action-btn primary"
          @click="joinSharing"
        >
          立即加入
        </button>
        <button v-else class="action-btn disabled">
          {{ getJoinButtonText() }}
        </button>
      </view>
      
      <!-- 参与者（非队长） -->
      <view v-else-if="!isOrganizer" class="action-group">
        <button class="action-btn secondary" @click="contactOrganizer">
          联系队长
        </button>
        <button 
          v-if="canExit" 
          class="action-btn danger"
          @click="exitSharing"
        >
          退出拼场
        </button>
      </view>
      
      <!-- 队长 -->
      <view v-else class="action-group">
        <button class="action-btn secondary" @click="manageSharing">
          管理拼场
        </button>
        <button class="action-btn danger" @click="cancelSharing">
          取消拼场
        </button>
      </view>
    </view>
  </view>

  <!-- 申请拼场弹窗 -->
  <uni-popup ref="applyPopup" type="bottom" v-show="internalApplyPopupOpened" :class="applyPopupPosition" :style="{ zIndex: 1000000 }">
    <view class="apply-modal">
      <view class="modal-header">
        <text class="modal-title">申请加入拼场</text>
        <text class="close-btn" @click="closeApplyModal">✕</text>
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
        <button class="modal-btn cancel-btn" @click="closeApplyModal">
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
  
  <!-- 确认弹窗 -->
  <uni-popup ref="confirmPopup" type="bottom" v-show="internalConfirmPopupOpened" :class="confirmPopupPosition" :style="{ zIndex: 1000000 }">
    <view class="confirm-modal">
      <view class="modal-header">
        <text class="modal-title">{{ confirmData.title }}</text>
      </view>
      <view class="modal-content">
        <text class="modal-text">{{ confirmData.content }}</text>
      </view>
      <view class="modal-actions">
        <button class="modal-btn cancel-btn" @click="closeConfirmModal">
          取消
        </button>
        <button class="modal-btn confirm-btn" @click="confirmAction">
          确认
        </button>
      </view>
    </view>
  </uni-popup>
</template>

<script>
import { useSharingStore } from '@/stores/sharing.js'
import { useUserStore } from '@/stores/user.js'
import { formatDate, formatDateTime } from '@/utils/helpers.js'
import CountdownTimer from '@/components/CountdownTimer.vue'
import { shouldShowCountdown } from '@/utils/countdown.js'
// 已移除popup-protection相关导入

export default {
  name: 'SharingDetail',

  components: {
    CountdownTimer
  },

  data() {
    return {
      sharingStore: null,
      userStore: null,
      sharingId: null,
      confirmData: {
        title: '',
        content: '',
        action: null
      },
      applyForm: {
        teamName: '',
        contactInfo: '',
        message: ''
      },
      
      // 弹窗状态控制
      confirmPopupShown: false,
      applyPopupShown: false,
      internalConfirmPopupOpened: false,
      internalApplyPopupOpened: false,
      confirmPopupPosition: '',
      applyPopupPosition: '',
      _confirmPopupRef: null,
      _applyPopupRef: null,
      // 缓存和加载状态
      loadingFlags: {
        detail: false
      },
      lastLoadTime: 0,
      cacheTimeout: 30 * 1000 // 30秒缓存
    }
  },
  
  computed: {
    sharingOrderDetail() {
      return this.sharingStore?.sharingOrderDetailGetter || null
    },

    loading() {
      return this.sharingStore?.isLoading || false
    },

    userInfo() {
      return this.userStore?.userInfoGetter || {}
    },
    
    // 参与者列表（包含队长）
    participants() {
      if (!this.sharingOrderDetail) return []
      
      const participants = []
      
      // 添加队长
      participants.push({
        username: this.sharingOrderDetail.creatorUsername,
        nickname: this.sharingOrderDetail.creatorUsername,
        role: 'organizer',
        isOrganizer: true
      })
      
      // 添加其他参与者（如果有的话）
      if (this.sharingOrderDetail.participants && Array.isArray(this.sharingOrderDetail.participants)) {
        this.sharingOrderDetail.participants.forEach(participant => {
          if (participant.username !== this.sharingOrderDetail.creatorUsername) {
            participants.push({
              ...participant,
              role: 'member',
              isOrganizer: false
            })
          }
        })
      }
      
      return participants
    },
    
    // 是否为参与者
    isParticipant() {
      if (!this.userInfo || !this.sharingOrderDetail) return false
      return this.participants.some(p => p.username === this.userInfo.username)
    },
    
    // 是否为队长
    isOrganizer() {
      if (!this.userInfo || !this.sharingOrderDetail) return false
      return this.sharingOrderDetail.creatorUsername === this.userInfo.username
    },
    
    // 是否可以加入
    canJoin() {
      // 基础数据检查
      if (!this.sharingOrderDetail || !this.userInfo) {
        return false
      }
      
      // 确保用户信息完整
      if (!this.userInfo.username) {
        return false
      }
      
      // 不能申请自己创建的拼场 - 使用严格比较和去除空格
      const creatorUsername = (this.sharingOrderDetail.creatorUsername || '').trim()
      const currentUsername = (this.userInfo.username || '').trim()
      
      if (creatorUsername && currentUsername && creatorUsername === currentUsername) {
        return false
      }
      
      // 检查拼场状态
      if (this.sharingOrderDetail.status !== 'OPEN') {
        return false
      }
      
      // 检查是否有空位
      const currentParticipants = this.sharingOrderDetail.currentParticipants || 0
      const maxParticipants = this.sharingOrderDetail.maxParticipants || 0
      if (currentParticipants >= maxParticipants) {
        return false
      }
      
      // 检查是否已经是参与者
      if (this.isParticipant) {
        return false
      }
      
      return true
    },
    
    // 是否可以退出
    canExit() {
      if (!this.sharingOrderDetail) return false
      return this.sharingOrderDetail.allowExit && 
             this.sharingOrderDetail.status === 'OPEN' &&
             this.isParticipant && 
             !this.isOrganizer
    },
    
    // 是否显示联系信息
    showContactInfo() {
      return this.isParticipant && this.sharingOrderDetail?.contactInfo
    },
    
    // 剩余名额（两支球队模式）
    remainingSlots() {
      if (!this.sharingOrderDetail) return 0
      return 2 - (this.sharingOrderDetail.currentParticipants || 0)
    },
    
    // 是否可以提交申请
    canSubmitApplication() {
      return this.applyForm.contactInfo.trim().length > 0
    }
  },
  
  async onLoad(options) {
    // 已移除popup-protection相关调用
    
    // 初始化弹窗状态
    this.internalConfirmPopupOpened = false
    this.internalApplyPopupOpened = false
    this.confirmPopupPosition = ''
    this.applyPopupPosition = ''
    
    // 初始化Pinia stores
    this.sharingStore = useSharingStore()
    this.userStore = useUserStore()

    console.log('拼场详情页面：接收到的参数:', options)
    console.log('拼场详情页面：options.id:', options.id)
    
    // 缓存弹窗实例引用
    this.$nextTick(() => {
      if (this.$refs.confirmPopup) {
        this._confirmPopupRef = this.$refs.confirmPopup
      }
      if (this.$refs.applyPopup) {
        this._applyPopupRef = this.$refs.applyPopup
      }
    })

    // 确保用户信息已加载
    try {
      if (!this.userStore.userInfoGetter || !this.userStore.userInfoGetter.username) {
        console.log('拼场详情页面：用户信息未加载，尝试获取')
        await this.userStore.getUserInfo()
      }
    } catch (error) {
      console.error('拼场详情页面：获取用户信息失败:', error)
    }

    if (options.id) {
      this.sharingId = options.id
      console.log('拼场详情页面：设置sharingId为:', this.sharingId)
      await this.loadSharingDetail()
    } else {
      console.error('拼场详情页面：未接收到id参数')
      uni.showToast({
        title: '订单ID缺失',
        icon: 'error'
      })
    }
  },
  
  onShow() {
    if (this.sharingId && this.sharingStore && typeof this.sharingStore.getOrderDetail === 'function') {
      // 页面显示时强制刷新详情，避免缓存导致的延迟
      this.sharingStore.getOrderDetail(this.sharingId, true).catch(() => {})
    }
  },
  
  onPullDownRefresh() {
    this.loadSharingDetail()
  },
  
  onUnload() {
    // 已移除popup-protection相关调用
    
    // 清理弹窗缓存引用
    this._confirmPopupRef = null
    this._applyPopupRef = null
  },
  
  mounted() {
    // 已移除popup-protection相关调用
  },

  methods: {
    
    // 🚀 缓存优化的拼场详情加载
    async loadSharingDetailWithCache() {
      // 检查缓存有效性
      const now = Date.now()
      if (this.lastLoadTime && (now - this.lastLoadTime) < this.cacheTimeout) {
        console.log('拼场详情页面：使用缓存数据，跳过请求')
        return
      }

      // 防重复请求
      if (this.loadingFlags.detail) {
        console.log('拼场详情页面：正在加载中，跳过重复请求')
        return
      }

      try {
        this.loadingFlags.detail = true
        console.log('拼场详情页面：开始缓存优化的详情加载，ID:', this.sharingId)
        
        await this.sharingStore.getOrderDetail(this.sharingId)
        
        // 更新缓存时间
        this.lastLoadTime = now
        
        console.log('拼场详情页面：缓存优化加载完成:', this.sharingOrderDetail)
        // 强制更新视图，确保显示最新状态
        this.$forceUpdate()
        uni.stopPullDownRefresh()
      } catch (error) {
        uni.stopPullDownRefresh()
        console.error('拼场详情页面：缓存优化加载失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'error'
        })
      } finally {
        this.loadingFlags.detail = false
      }
    },
    
    // 加载拼场详情（原方法，用于强制刷新）
    async loadSharingDetail() {
      // 清除缓存，强制刷新
      this.lastLoadTime = 0
      await this.loadSharingDetailWithCache()
    },
    
    // 跳转到场馆详情
    navigateToVenue() {
      if (this.sharingOrderDetail?.venueId) {
        uni.navigateTo({
          url: `/pages/venue/detail?id=${this.sharingOrderDetail.venueId}`
        })
      }
    },
    
    // 加入拼场
    joinSharing() {
      try {
        // 防止重复显示
        if (this.applyPopupShown) {
          console.log('申请弹窗已显示，跳过重复显示')
          return
        }
        
        // 初始化申请表单
        this.initApplyForm()
        
        // 安全检查并打开申请弹窗
        this.showApplyPopupModal()
      } catch (error) {
        console.error('打开申请弹窗失败:', error)
        uni.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        })
      }
    },
    
    // 退出拼场
    async exitSharing() {
      try {
        // 防止重复显示
        if (this.confirmPopupShown) {
          console.log('确认弹窗已显示，跳过重复显示')
          return
        }
        
        this.confirmData = {
          title: '退出拼场',
          content: '确认退出此拼场活动吗？退出后需要重新申请才能加入。',
          action: 'exit'
        }
        
        // 安全检查并打开确认弹窗
        this.showConfirmPopupModal()
      } catch (error) {
        console.error('打开确认弹窗失败:', error)
        uni.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        })
      }
    },
    
    // 取消拼场
    async cancelSharing() {
      try {
        // 防止重复显示
        if (this.confirmPopupShown) {
          console.log('确认弹窗已显示，跳过重复显示')
          return
        }
        
        this.confirmData = {
          title: '取消拼场',
          content: '确认取消此拼场活动吗？取消后所有参与者将收到通知。',
          action: 'cancel'
        }
        
        // 安全检查并打开确认弹窗
        this.showConfirmPopupModal()
      } catch (error) {
        console.error('打开确认弹窗失败:', error)
        uni.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        })
      }
    },
    
    // 移除参与者
    async removeParticipant(participant) {
      try {
        // 防止重复显示
        if (this.confirmPopupShown) {
          console.log('确认弹窗已显示，跳过重复显示')
          return
        }
        
        this.confirmData = {
          title: '移除参与者',
          content: `确认移除「${participant.nickname || participant.username}」吗？`,
          action: 'remove',
          data: participant
        }
        
        // 安全检查并打开确认弹窗
        this.showConfirmPopup()
      } catch (error) {
        console.error('打开确认弹窗失败:', error)
        uni.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        })
      }
    },
    
    // 联系队长
    contactOrganizer() {
      if (this.sharingOrderDetail?.contactInfo?.phone) {
        this.makePhoneCall()
      } else {
        uni.showToast({
          title: '暂无联系方式',
          icon: 'none'
        })
      }
    },
    
    // 管理拼场
    manageSharing() {
      uni.navigateTo({
        url: `/pages/sharing/manage?id=${this.sharingId}`
      })
    },
    
    // 拨打电话
    makePhoneCall() {
      const phone = this.sharingOrderDetail?.contactInfo?.phone
      if (phone) {
        uni.makePhoneCall({
          phoneNumber: phone
        })
      }
    },
    
    // 关闭确认弹窗
    closeConfirmModal() {
      this.closeConfirmPopup()
    },
    
    // 关闭确认弹窗（兼容微信小程序）
    closeConfirmPopup() {
      const debugEnabled = false // 调试开关
      
      try {
        // 获取环境信息
        const windowInfo = uni.getWindowInfo()
        const deviceInfo = uni.getDeviceInfo()
        const appInfo = uni.getAppBaseInfo()
        
        if (debugEnabled) {
          console.log('关闭确认弹窗 - 环境信息:', {
            platform: appInfo.platform,
            windowInfo,
            deviceInfo
          })
        }
        
        let popup = null
        
        // 方法1: 优先使用 $refs
        if (this.$refs.confirmPopup) {
          popup = Array.isArray(this.$refs.confirmPopup) ? this.$refs.confirmPopup[0] : this.$refs.confirmPopup
          if (debugEnabled) console.log('通过$refs获取到确认弹窗实例:', popup)
        }
        
        // 方法2: 使用缓存的引用
        if (!popup && this._confirmPopupRef) {
          popup = this._confirmPopupRef
          if (debugEnabled) console.log('通过缓存引用获取到确认弹窗实例:', popup)
        }
        
        // 方法3: 微信小程序环境下使用 selectComponent
        if (!popup && this.$scope && this.$scope.selectComponent) {
          popup = this.$scope.selectComponent('#confirmPopup')
          if (debugEnabled) console.log('通过selectComponent获取到确认弹窗实例:', popup)
        }
        
        // 方法4: 从组件实例中查找 uni-popup 子组件
        if (!popup && this.$children) {
          for (let child of this.$children) {
            if (child.$options.name === 'UniPopup' || child.$options._componentTag === 'uni-popup') {
              if (child.$el && child.$el.getAttribute && child.$el.getAttribute('ref') === 'confirmPopup') {
                popup = child
                if (debugEnabled) console.log('通过$children查找到确认弹窗实例:', popup)
                break
              }
            }
          }
        }
        
        if (popup && typeof popup.close === 'function') {
          popup.close()
          this.confirmPopupShown = false
          this.internalConfirmPopupOpened = false
          
          if (debugEnabled) console.log('确认弹窗关闭成功')
          return
        }
        
        // 重试机制
        setTimeout(() => {
          if (debugEnabled) console.log('确认弹窗关闭重试')
          
          let retryPopup = null
          
          if (this.$refs.confirmPopup) {
            retryPopup = Array.isArray(this.$refs.confirmPopup) ? this.$refs.confirmPopup[0] : this.$refs.confirmPopup
          } else if (this.$scope && this.$scope.selectComponent) {
            retryPopup = this.$scope.selectComponent('#confirmPopup')
          }
          
          if (retryPopup && typeof retryPopup.close === 'function') {
            retryPopup.close()
            this.confirmPopupShown = false
            this.internalConfirmPopupOpened = false
            if (debugEnabled) console.log('确认弹窗重试关闭成功')
          } else {
            // 备选方案：强制隐藏
            if (debugEnabled) console.log('使用备选方案强制隐藏确认弹窗')
            this.confirmPopupShown = false
            this.internalConfirmPopupOpened = false
            this.confirmPopupPosition = 'popup-force-hide'
            this.$forceUpdate()
          }
        }, 100)
        
      } catch (error) {
        console.error('关闭确认弹窗失败:', error)
        // 备选方案
        this.confirmPopupShown = false
        this.internalConfirmPopupOpened = false
        this.$forceUpdate()
      }
    },
    
    // 安全显示确认弹窗
    showConfirmPopupModal() {
      this.showConfirmPopup()
    },
    
    // 显示确认弹窗（兼容微信小程序）
    showConfirmPopup() {
      const debugEnabled = false // 调试开关
      
      try {
        // 获取环境信息
        const windowInfo = uni.getWindowInfo()
        const deviceInfo = uni.getDeviceInfo()
        const appInfo = uni.getAppBaseInfo()
        
        if (debugEnabled) {
          console.log('显示确认弹窗 - 环境信息:', {
            platform: appInfo.platform,
            windowInfo,
            deviceInfo
          })
        }
        
        let popup = null
        
        // 方法1: 优先使用 $refs
        if (this.$refs.confirmPopup) {
          popup = Array.isArray(this.$refs.confirmPopup) ? this.$refs.confirmPopup[0] : this.$refs.confirmPopup
          if (debugEnabled) console.log('通过$refs获取到确认弹窗实例:', popup)
        }
        
        // 方法2: 使用缓存的引用
        if (!popup && this._confirmPopupRef) {
          popup = this._confirmPopupRef
          if (debugEnabled) console.log('通过缓存引用获取到确认弹窗实例:', popup)
        }
        
        // 方法3: 微信小程序环境下使用 selectComponent
        if (!popup && this.$scope && this.$scope.selectComponent) {
          popup = this.$scope.selectComponent('#confirmPopup')
          if (debugEnabled) console.log('通过selectComponent获取到确认弹窗实例:', popup)
        }
        
        // 方法4: 从组件实例中查找 uni-popup 子组件
        if (!popup && this.$children) {
          for (let child of this.$children) {
            if (child.$options.name === 'UniPopup' || child.$options._componentTag === 'uni-popup') {
              if (child.$el && child.$el.getAttribute && child.$el.getAttribute('ref') === 'confirmPopup') {
                popup = child
                if (debugEnabled) console.log('通过$children查找到确认弹窗实例:', popup)
                break
              }
            }
          }
        }
        
        if (popup && typeof popup.open === 'function') {
          popup.open()
          this.confirmPopupShown = true
          this.internalConfirmPopupOpened = true
          
          // 缓存弹窗引用
          if (!this._confirmPopupRef) {
            this._confirmPopupRef = popup
          }
          
          if (debugEnabled) console.log('确认弹窗打开成功')
          return
        }
        
        // 重试机制
        setTimeout(() => {
          if (debugEnabled) console.log('确认弹窗打开重试')
          
          let retryPopup = null
          
          if (this.$refs.confirmPopup) {
            retryPopup = Array.isArray(this.$refs.confirmPopup) ? this.$refs.confirmPopup[0] : this.$refs.confirmPopup
          } else if (this.$scope && this.$scope.selectComponent) {
            retryPopup = this.$scope.selectComponent('#confirmPopup')
          }
          
          if (retryPopup && typeof retryPopup.open === 'function') {
            retryPopup.open()
            this.confirmPopupShown = true
            this.internalConfirmPopupOpened = true
            
            // 缓存弹窗引用
            if (!this._confirmPopupRef) {
              this._confirmPopupRef = retryPopup
            }
            
            if (debugEnabled) console.log('确认弹窗重试打开成功')
          } else {
            // 备选方案：强制显示
            if (debugEnabled) console.log('使用备选方案强制显示确认弹窗')
            this.confirmPopupShown = true
            this.internalConfirmPopupOpened = true
            this.confirmPopupPosition = 'popup-force-show'
            this.$forceUpdate()
          }
        }, 100)
        
      } catch (error) {
        console.error('显示确认弹窗失败:', error)
        // 备选方案
        this.confirmPopupShown = true
        this.internalConfirmPopupOpened = true
        this.$forceUpdate()
      }
    },
    
    // 初始化申请表单
    initApplyForm() {
      this.applyForm = {
        teamName: '', // 队名默认为空，让用户自己填写
        contactInfo: this.userInfo?.phone || this.userInfo?.mobile || '', // 联系方式默认为手机号
        message: ''
      }
    },
    
    // 关闭申请弹窗
    closeApplyModal() {
      this.closeApplyPopup()
    },
    
    // 关闭申请弹窗（兼容微信小程序）
    closeApplyPopup() {
      const debugEnabled = false // 调试开关
      
      try {
        // 获取环境信息
        const windowInfo = uni.getWindowInfo()
        const deviceInfo = uni.getDeviceInfo()
        const appInfo = uni.getAppBaseInfo()
        
        if (debugEnabled) {
          console.log('关闭申请弹窗 - 环境信息:', {
            platform: appInfo.platform,
            windowInfo,
            deviceInfo
          })
        }
        
        let popup = null
        
        // 方法1: 优先使用 $refs
        if (this.$refs.applyPopup) {
          popup = Array.isArray(this.$refs.applyPopup) ? this.$refs.applyPopup[0] : this.$refs.applyPopup
          if (debugEnabled) console.log('通过$refs获取到申请弹窗实例:', popup)
        }
        
        // 方法2: 使用缓存的引用
        if (!popup && this._applyPopupRef) {
          popup = this._applyPopupRef
          if (debugEnabled) console.log('通过缓存引用获取到申请弹窗实例:', popup)
        }
        
        // 方法3: 微信小程序环境下使用 selectComponent
        if (!popup && this.$scope && this.$scope.selectComponent) {
          popup = this.$scope.selectComponent('#applyPopup')
          if (debugEnabled) console.log('通过selectComponent获取到申请弹窗实例:', popup)
        }
        
        // 方法4: 从组件实例中查找 uni-popup 子组件
        if (!popup && this.$children) {
          for (let child of this.$children) {
            if (child.$options.name === 'UniPopup' || child.$options._componentTag === 'uni-popup') {
              if (child.$el && child.$el.getAttribute && child.$el.getAttribute('ref') === 'applyPopup') {
                popup = child
                if (debugEnabled) console.log('通过$children查找到申请弹窗实例:', popup)
                break
              }
            }
          }
        }
        
        if (popup && typeof popup.close === 'function') {
          popup.close()
          this.applyPopupShown = false
          this.internalApplyPopupOpened = false
          
          if (debugEnabled) console.log('申请弹窗关闭成功')
          return
        }
        
        // 重试机制
        setTimeout(() => {
          if (debugEnabled) console.log('申请弹窗关闭重试')
          
          let retryPopup = null
          
          if (this.$refs.applyPopup) {
            retryPopup = Array.isArray(this.$refs.applyPopup) ? this.$refs.applyPopup[0] : this.$refs.applyPopup
          } else if (this.$scope && this.$scope.selectComponent) {
            retryPopup = this.$scope.selectComponent('#applyPopup')
          }
          
          if (retryPopup && typeof retryPopup.close === 'function') {
            retryPopup.close()
            this.applyPopupShown = false
            this.internalApplyPopupOpened = false
            if (debugEnabled) console.log('申请弹窗重试关闭成功')
          } else {
            // 备选方案：强制隐藏
            if (debugEnabled) console.log('使用备选方案强制隐藏申请弹窗')
            this.applyPopupShown = false
            this.internalApplyPopupOpened = false
            this.applyPopupPosition = 'popup-force-hide'
            this.$forceUpdate()
          }
        }, 100)
        
      } catch (error) {
        console.error('关闭申请弹窗失败:', error)
        // 备选方案
        this.applyPopupShown = false
        this.internalApplyPopupOpened = false
        this.$forceUpdate()
      }
    },
    
    // 安全显示申请弹窗
    showApplyPopupModal() {
      this.showApplyPopup()
    },
    
    // 显示申请弹窗（兼容微信小程序）
    showApplyPopup() {
      const debugEnabled = false // 调试开关
      
      try {
        // 获取环境信息
        const windowInfo = uni.getWindowInfo()
        const deviceInfo = uni.getDeviceInfo()
        const appInfo = uni.getAppBaseInfo()
        
        if (debugEnabled) {
          console.log('显示申请弹窗 - 环境信息:', {
            platform: appInfo.platform,
            windowInfo,
            deviceInfo
          })
        }
        
        let popup = null
        
        // 方法1: 优先使用 $refs
        if (this.$refs.applyPopup) {
          popup = Array.isArray(this.$refs.applyPopup) ? this.$refs.applyPopup[0] : this.$refs.applyPopup
          if (debugEnabled) console.log('通过$refs获取到申请弹窗实例:', popup)
        }
        
        // 方法2: 使用缓存的引用
        if (!popup && this._applyPopupRef) {
          popup = this._applyPopupRef
          if (debugEnabled) console.log('通过缓存引用获取到申请弹窗实例:', popup)
        }
        
        // 方法3: 微信小程序环境下使用 selectComponent
        if (!popup && this.$scope && this.$scope.selectComponent) {
          popup = this.$scope.selectComponent('#applyPopup')
          if (debugEnabled) console.log('通过selectComponent获取到申请弹窗实例:', popup)
        }
        
        // 方法4: 从组件实例中查找 uni-popup 子组件
        if (!popup && this.$children) {
          for (let child of this.$children) {
            if (child.$options.name === 'UniPopup' || child.$options._componentTag === 'uni-popup') {
              if (child.$el && child.$el.getAttribute && child.$el.getAttribute('ref') === 'applyPopup') {
                popup = child
                if (debugEnabled) console.log('通过$children查找到申请弹窗实例:', popup)
                break
              }
            }
          }
        }
        
        if (popup && typeof popup.open === 'function') {
          popup.open()
          this.applyPopupShown = true
          this.internalApplyPopupOpened = true
          
          // 缓存引用以备后用
          if (!this._applyPopupRef) {
            this._applyPopupRef = popup
          }
          
          if (debugEnabled) console.log('申请弹窗打开成功')
          return
        }
        
        // 重试机制
        setTimeout(() => {
          if (debugEnabled) console.log('申请弹窗打开重试')
          
          let retryPopup = null
          
          if (this.$refs.applyPopup) {
            retryPopup = Array.isArray(this.$refs.applyPopup) ? this.$refs.applyPopup[0] : this.$refs.applyPopup
          } else if (this.$scope && this.$scope.selectComponent) {
            retryPopup = this.$scope.selectComponent('#applyPopup')
          }
          
          if (retryPopup && typeof retryPopup.open === 'function') {
            retryPopup.open()
            this.applyPopupShown = true
            this.internalApplyPopupOpened = true
            this._applyPopupRef = retryPopup
            if (debugEnabled) console.log('申请弹窗重试打开成功')
          } else {
            // 备选方案：强制显示
            if (debugEnabled) console.log('使用备选方案强制显示申请弹窗')
            this.applyPopupShown = true
            this.internalApplyPopupOpened = true
            this.applyPopupPosition = 'popup-force-show'
            this.$forceUpdate()
          }
        }, 100)
        
      } catch (error) {
        console.error('显示申请弹窗失败:', error)
        // 备选方案
        this.applyPopupShown = true
        this.internalApplyPopupOpened = true
        this.$forceUpdate()
      }
    },
    
    // 注释：移除了增减参与人数的方法，因为现在是固定的两支球队模式
    
    // 提交申请
    async submitApplication() {
      if (!this.canSubmitApplication) {
        uni.showToast({
          title: '请填写完整信息',
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
        
        const response = await this.sharingStore.applySharingOrder({ orderId: this.sharingId, data: applicationData })

        uni.hideLoading()

        // 关闭申请弹窗并重置状态
        this.closeApplyModal()

        // 检查申请是否被自动通过
        if (response && response.data &&
            (response.data.status === 'APPROVED_PENDING_PAYMENT' || response.data.status === 'APPROVED')) {
          // 自动通过，提示用户并引导支付
          uni.showModal({
            title: '申请已通过',
            content: '您的拼场申请已自动通过！请在30分钟内完成支付以确认参与。',
            showCancel: false,
            confirmText: '去支付',
            success: () => {
              // 跳转到支付页面，使用虚拟订单ID
              uni.navigateTo({
                url: `/pages/payment/index?orderId=${-response.data.id}&type=sharing&from=sharing-detail`
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

        // 刷新详情
        await this.loadSharingDetail()
        
      } catch (error) {
        uni.hideLoading()
        console.error('提交申请失败:', error)
        uni.showToast({
          title: error.message || '提交失败',
          icon: 'error'
        })
      }
    },
    
    // 确认操作
    async confirmAction() {
      try {
        uni.showLoading({ title: '处理中...' })
        
        switch (this.confirmData.action) {
          case 'exit':
            await this.sharingStore.exitSharingOrder(this.sharingId)
            uni.showToast({ title: '退出成功', icon: 'success' })
            break
            
          case 'cancel':
            await this.sharingStore.cancelSharingOrder(this.sharingId)
            uni.showToast({ title: '取消成功', icon: 'success' })

            // 取消拼场后跳转回上一页，因为当前页面已无效
            setTimeout(() => {
              uni.navigateBack({
                delta: 1
              })
            }, 1500)
            return // 不需要刷新详情，直接返回
            
          case 'remove':
            await this.sharingStore.removeParticipantFromSharing({
              sharingId: this.sharingId,
              participantId: this.confirmData.data.id || this.confirmData.data.username
            })
            uni.showToast({ title: '移除成功', icon: 'success' })
            break
        }
        
        uni.hideLoading()
        // 关闭确认弹窗并重置状态
        this.closeConfirmModal()
        
        // 刷新详情
        await this.loadSharingDetail()
        
      } catch (error) {
        uni.hideLoading()
        console.error('操作失败:', error)
        uni.showToast({
          title: error.message || '操作失败',
          icon: 'error'
        })
      }
    },
    
    // 格式化活动时间（参考预约订单的实现）
    formatActivityTime() {
      if (!this.sharingOrderDetail) return '--'
      
      const bookingDate = this.sharingOrderDetail.bookingDate || this.sharingOrderDetail.date
      const startTime = this.sharingOrderDetail.startTime || this.sharingOrderDetail.bookingStartTime
      const endTime = this.sharingOrderDetail.endTime || this.sharingOrderDetail.bookingEndTime
      
      if (!bookingDate) {
        return '时间未知'
      }
      
      const date = this.formatDate(bookingDate)
      
      if (!startTime || !endTime) {
        return `${date} 时间待定`
      }
      
      // 格式化时间显示（去掉秒数）
      const formatTime = (timeStr) => {
        if (!timeStr) return ''
        // 确保时间格式正确，后端返回的格式可能是HH:mm
        if (typeof timeStr === 'string') {
          // 如果是HH:mm格式，直接返回
          if (timeStr.length === 5 && timeStr.includes(':')) {
            return timeStr
          }
          // 如果是更长的格式，截取前5个字符（HH:mm）
          if (timeStr.length > 5 && timeStr.includes(':')) {
            return timeStr.substring(0, 5)
          }
          return timeStr
        }
        return ''
      }
      
      const formattedStart = formatTime(startTime)
      const formattedEnd = formatTime(endTime)
      
      console.log('⏰ 开始时间:', formattedStart)
      console.log('⏰ 结束时间:', formattedEnd)
      
      // 直接显示完整时间段
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
    
    // 格式化时间
    formatDateTime(datetime) {
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
        // 确保时间格式正确，后端返回的格式可能是HH:mm
        if (typeof timeStr === 'string') {
          // 如果是HH:mm格式，直接返回
          if (timeStr.length === 5 && timeStr.includes(':')) {
            return timeStr
          }
          // 如果是更长的格式，截取前5个字符（HH:mm）
          if (timeStr.length > 5 && timeStr.includes(':')) {
            return timeStr.substring(0, 5)
          }
          return timeStr
        }
        return ''
      }
      
      const formattedStart = formatTime(startTime)
      const formattedEnd = formatTime(endTime)
      
      console.log('格式化时间段:', formattedStart, '-', formattedEnd)
      
      return `${formattedStart}-${formattedEnd}`
    },
    
    // 获取总费用
    getTotalPrice() {
      if (!this.sharingOrderDetail) return '0.00'
      
      // 优先使用后端返回的totalPrice
      if (this.sharingOrderDetail.totalPrice) {
        return this.formatPrice(this.sharingOrderDetail.totalPrice)
      }
      
      // 如果没有totalPrice，则根据每队价格计算（每队价格 * 2）
      if (this.sharingOrderDetail.pricePerPerson) {
        // pricePerPerson已经是每队的价格，总价 = 每队价格 * 2
        const perTeamPrice = Number(this.sharingOrderDetail.pricePerPerson)
        return this.formatPrice(perTeamPrice * 2)
      }
      
      // 兜底使用price字段
      const price = this.sharingOrderDetail.price || 0
      return this.formatPrice(price)
    },
    
    // 格式化价格显示
    formatPrice(price) {
      if (!price && price !== 0) return '0.00'
      const numPrice = Number(price)
      if (isNaN(numPrice)) return '0.00'
      return numPrice.toFixed(2)
    },
    
    // 获取进度条宽度
    getProgressWidth() {
      if (!this.sharingOrderDetail) return 0
      const current = this.sharingOrderDetail.currentParticipants || 0
      const max = this.sharingOrderDetail.maxParticipants || 2
      return Math.min((current / max) * 100, 100)
    },

    // 获取每队费用
    getPerTeamPrice() {
      if (!this.sharingOrderDetail) return '0.00'
      
      // 优先使用后端返回的perTeamPrice字段
      if (this.sharingOrderDetail.perTeamPrice) {
        return this.formatPrice(this.sharingOrderDetail.perTeamPrice)
      }
      
      // 其次使用后端返回的totalPrice除以2（因为拼场只有两队）
      if (this.sharingOrderDetail.totalPrice) {
        return this.formatPrice(this.sharingOrderDetail.totalPrice / 2)
      }
      
      // 如果有pricePerPerson，直接使用（pricePerPerson已经是每队费用）
      if (this.sharingOrderDetail.pricePerPerson) {
        return this.formatPrice(this.sharingOrderDetail.pricePerPerson)
      }
      
      // 如果没有必要的数据，则使用price字段除以2
      const price = this.sharingOrderDetail.price || 0
      return this.formatPrice(price / 2)
    },
    
    // 获取参与者角色
    getParticipantRole(participant) {
      if (participant.isOrganizer || participant.role === 'organizer') {
        return '队长'
      }
      return '队员'
    },
    
    // 判断参与者是否为队长
    isParticipantOrganizer(participant) {
      return participant.isOrganizer || participant.role === 'organizer' ||
             participant.username === this.sharingOrderDetail?.creatorUsername
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
        'OPEN': '开放中',
        'FULL': '已满员',
        'CONFIRMED': '已确认',
        'CANCELLED': '已取消',
        'EXPIRED': '已过期'
      }
      return statusMap[status] || '开放中'
    },
    
    // 获取加入按钮文本
    getJoinButtonText() {
      if (!this.sharingOrderDetail) return '加载中...'
      
      // 如果是创建者，显示特殊文本 - 使用严格比较
      if (this.userInfo && this.userInfo.username) {
        const creatorUsername = (this.sharingOrderDetail.creatorUsername || '').trim()
        const currentUsername = (this.userInfo.username || '').trim()
        
        if (creatorUsername && currentUsername && creatorUsername === currentUsername) {
          return '这是您的拼场'
        }
      }
      
      // 根据状态返回不同文本
      switch (this.sharingOrderDetail.status) {
        case 'FULL':
          return '已满员'
        case 'CONFIRMED':
          return '已确认'
        case 'CANCELLED':
          return '已取消'
        case 'EXPIRED':
          return '已过期'
        default:
          // 检查是否已经加入
          if (this.isParticipant) {
            return '已加入'
          }
          return '立即加入'
      }
    },

    // 判断是否显示倒计时
    shouldShowCountdown(order) {
      return shouldShowCountdown(order)
    },

    // 倒计时过期处理
    onCountdownExpired(order) {
      console.log('拼场订单倒计时过期:', order.orderNo)
      // 刷新详情数据，更新订单状态
      this.loadSharingDetail()
    }
  },
  
  mounted() {
    // 重置弹窗状态
    this.confirmPopupShown = false
    this.applyPopupShown = false
    
    // 初始化数据
    this.sharingStore = useSharingStore()
    this.userStore = useUserStore()
    
    // 获取拼场ID
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    this.sharingId = currentPage.options.id || currentPage.options.sharingId
    
    if (!this.sharingId) {
      console.error('未获取到拼场ID')
      uni.showToast({
        title: '参数错误',
        icon: 'error'
      })
      return
    }
    
    // 加载拼场详情
    this.loadSharingDetail()
  }
}
</script>

<style lang="scss" scoped>
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 120rpx;
}

// 加载状态
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 200rpx 60rpx;
  
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
  justify-content: center;
  padding: 200rpx 60rpx;
  
  .error-icon {
    font-size: 120rpx;
    margin-bottom: 30rpx;
  }
  
  .error-text {
    font-size: 28rpx;
    color: #999999;
    margin-bottom: 40rpx;
  }
  
  .retry-btn {
    padding: 16rpx 40rpx;
    background-color: #ff6b35;
    color: #ffffff;
    border: none;
    border-radius: 8rpx;
    font-size: 26rpx;
  }
}

// 拼场详情
.sharing-detail {
  padding: 20rpx;
}

// 状态区域
.status-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20rpx;
  gap: 16rpx;

  .status-badge {
    padding: 12rpx 32rpx;
    border-radius: 30rpx;
    font-size: 26rpx;
    font-weight: bold;
    
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

// 通用区域样式
.team-section,
.venue-section,
.activity-section,
.participants-section,
.contact-section,
.rules-section {
  margin-bottom: 20rpx;
  
  .section-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333333;
    margin-bottom: 16rpx;
    padding: 0 10rpx;
  }
}

// 队伍信息
.team-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  
  .team-header {
    margin-bottom: 20rpx;
    
    .team-name {
      font-size: 36rpx;
      font-weight: bold;
      color: #333333;
      display: block;
      margin-bottom: 8rpx;
    }
    
    .team-creator {
      font-size: 26rpx;
      color: #666666;
    }
  }
  
  .participants-info {
    .participants-count {
      margin-bottom: 12rpx;
      
      .count-text {
        font-size: 28rpx;
        color: #333333;
      }
    }
    
    .progress-bar {
      height: 12rpx;
      background-color: #f0f0f0;
      border-radius: 6rpx;
      overflow: hidden;
      
      .progress-fill {
        height: 100%;
        background-color: #ff6b35;
        transition: width 0.3s ease;
      }
    }
  }
}

// 场馆信息
.venue-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  
  .venue-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
    
    .venue-name {
      font-size: 32rpx;
      font-weight: bold;
      color: #333333;
    }
    
    .venue-arrow {
      font-size: 28rpx;
      color: #999999;
    }
  }
  
  .venue-info {
    .venue-location {
      font-size: 26rpx;
      color: #666666;
      display: block;
      margin-bottom: 8rpx;
    }
  }
}

// 活动信息
.activity-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  
  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .info-label {
      font-size: 28rpx;
      color: #666666;
    }
    
    .info-value {
      font-size: 28rpx;
      color: #333333;
      
      &.price {
        color: #ff6b35;
        font-weight: bold;
      }
    }
  }
  
  .description-item {
    padding: 16rpx 0;
    border-bottom: 1rpx solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .info-label {
      font-size: 28rpx;
      color: #666666;
      margin-bottom: 12rpx;
      display: block;
    }
    
    .description-text {
      font-size: 26rpx;
      color: #333333;
      line-height: 1.6;
    }
  }
}

// 参与者列表
.participants-list {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  
  .participant-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 10rpx;
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
          margin-bottom: 4rpx;
        }
        
        .participant-role {
          font-size: 24rpx;
          color: #999999;
        }
      }
    }
    
    .remove-btn {
      padding: 8rpx 16rpx;
      background-color: #ff4d4f;
      color: #333333;
      border-radius: 16rpx;
      font-size: 24rpx;
    }
  }
}

// 联系信息
.contact-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  
  .contact-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .contact-label {
      font-size: 28rpx;
      color: #666666;
    }
    
    .contact-value {
      font-size: 28rpx;
      color: #1890ff;
    }
  }
}

// 活动规则
.rules-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  
  .rule-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .rule-label {
      font-size: 28rpx;
      color: #666666;
    }
    
    .rule-value {
      font-size: 28rpx;
      color: #333333;
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
  
  .action-group {
    display: flex;
    gap: 20rpx;
    
    .action-btn {
      flex: 1;
      height: 80rpx;
      border-radius: 12rpx;
      font-size: 28rpx;
      border: none;
      
      &.primary {
        background-color: #ff6b35;
        color: #666666;
      }
      
      &.secondary {
        background-color: #f5f5f5;
        color: #333333;
      }
      
      &.danger {
        background-color: #ff4d4f;
        color: #666666;
      }
      
      &.disabled {
        background-color: #f0f0f0;
        color: #999999;
      }
    }
  }
}

// 申请拼场弹窗
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
  transform: translateZ(0); /* 创建新的层叠上下文 */

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
    max-height: calc(80vh - 180rpx); /* 80vh是弹窗最大高度，180rpx是预估的头部和操作区高度 */
    overflow-y: auto;
    -webkit-overflow-scrolling: touch; /* 改善iOS上的滚动体验 */
    
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
      
      .number-selector {
        display: flex;
        align-items: center;
        gap: 20rpx;
        margin-bottom: 16rpx;
        
        .number-btn {
          width: 60rpx;
          height: 60rpx;
          border: 1rpx solid #e0e0e0;
          border-radius: 8rpx;
          background-color: #ffffff;
          font-size: 32rpx;
          color: #333333;
          display: flex;
          align-items: center;
          justify-content: center;
          
          &:disabled {
            background-color: #f5f5f5;
            color: #cccccc;
            border-color: #f0f0f0;
          }
        }
        
        .number-text {
          font-size: 28rpx;
          color: #333333;
          min-width: 40rpx;
          text-align: center;
        }
      }
      
      .form-hint {
        font-size: 24rpx;
        color: #999999;
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



// 确认弹窗
.confirm-modal {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 40rpx;
  width: 600rpx;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000002;
  
  .modal-header {
    text-align: center;
    margin-bottom: 30rpx;
    
    .modal-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333333;
    }
  }
  
  .modal-content {
    margin-bottom: 40rpx;
    
    .modal-text {
      font-size: 28rpx;
      color: #666666;
      line-height: 1.5;
      text-align: center;
    }
  }
  
  .modal-actions {
    display: flex;
    gap: 20rpx;
    
    .modal-btn {
      flex: 1;
      padding: 24rpx;
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