<template>
  <view class="container">
    <!-- 顶部卡片 -->
    <view class="header-card" v-if="sharingOrder">
      <view class="venue-info">
        <text class="venue-name">{{ sharingOrder.venueName || '拼场活动' }}</text>
        <text class="time-info">
          <text class="icon">🕒</text>
          {{ sharingOrder.startTime || '' }} - {{ sharingOrder.endTime || '' }}
        </text>
      </view>
      
      <view class="meta-row">
        <view class="meta-item">
          <text class="meta-label">发起方</text>
          <text class="meta-value">{{ sharingOrder.teamName || '-' }}</text>
        </view>
        <view class="meta-divider"></view>
        <view class="meta-item">
          <text class="meta-label">已拼人数</text>
          <view class="meta-value highlight">
            <text class="current">{{ sharingOrder.currentParticipants || 0 }}</text>
            <text class="max">/{{ sharingOrder.maxParticipants || 0 }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载与错误状态 -->
    <view v-if="loading" class="state-container">
      <view class="loading-spinner"></view>
      <text class="state-text">加载数据中...</text>
    </view>
    
    <view v-else-if="error" class="state-container">
      <text class="icon-error">⚠️</text>
      <text class="state-text error">{{ error }}</text>
      <button class="retry-btn" @click="load">重试</button>
    </view>
    
    <!-- 列表内容 -->
    <view v-else class="content-wrapper">
      <view class="section-header">
        <text class="section-title">参与成员</text>
        <text class="section-count">共 {{ participants.length }} 组</text>
      </view>

      <view v-if="participants.length === 0" class="empty-state">
        <text class="empty-icon">👥</text>
        <text class="empty-text">暂无参与者信息</text>
        <text class="empty-hint">仅发起方可查看完整的参与申请者列表</text>
      </view>
      
      <view v-else class="participant-list">
        <view 
          v-for="(p, index) in participants" 
          :key="p.key" 
          class="participant-card"
          :class="{ 'is-creator': p.badgeText === '发起方' }"
        >
          <!-- 头像区域 -->
          <view class="avatar-wrap">
            <view class="avatar" :class="getAvatarClass(index, p.badgeText)">
              {{ getInitial(p.teamName || p.username) }}
            </view>
            <view v-if="p.badgeText === '发起方'" class="creator-crown">👑</view>
          </view>
          
          <!-- 信息区域 -->
          <view class="info-wrap">
            <view class="name-row">
              <text class="name">{{ p.teamName || p.username || '神秘球友' }}</text>
              <text class="status-badge" :class="p.badgeClass">{{ p.badgeText }}</text>
            </view>
            
            <view class="detail-row">
              <view class="detail-item">
                <text class="icon">👤</text>
                <text>人数：{{ p.participantsCount || 0 }}人</text>
              </view>
              <view class="detail-item contact">
                <text class="icon">📞</text>
                <text>联系：{{ p.contact || '暂无' }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useSharingStore } from '@/stores/sharing.js'
import * as sharingApi from '@/api/sharing.js'

export default {
  name: 'SharingParticipants',
  setup() {
    const sharingStore = useSharingStore()
    return { sharingStore }
  },
  data() {
    return {
      orderId: '',
      sharingOrder: null,
      participants: [],
      loading: false,
      error: ''
    }
  },
  onLoad(options) {
    console.log('SharingParticipants onLoad:', options)
    this.orderId = options?.orderId || ''
    if (!this.orderId) {
      uni.showToast({ title: '订单ID缺失', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 300)
      return
    }
    this.load()
  },
  onPullDownRefresh() {
    this.load().finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    getInitial(name) {
      if (!name) return '友'
      return name.substring(0, 1).toUpperCase()
    },
    getAvatarClass(index, badgeText) {
      if (badgeText === '发起方') return 'avatar-creator'
      const colors = ['bg-c1', 'bg-c2', 'bg-c3', 'bg-c4', 'bg-c5']
      return colors[index % colors.length]
    },
    normalizeStatus(status) {
      return (status || '').toString().toUpperCase()
    },
    async load() {
      if (this.loading) return
      this.loading = true
      this.error = ''
      try {
        const [sharingOrderResp, receivedResp] = await Promise.all([
          sharingApi.getSharingOrderByMainOrderId(this.orderId),
          this.sharingStore.getReceivedRequestsList()
        ])

        const sharingOrder = sharingOrderResp?.data || sharingOrderResp || null
        this.sharingOrder = sharingOrder

        const receivedRequests = receivedResp?.data || receivedResp?.list || receivedResp || []
        const receivedList = Array.isArray(receivedRequests) ? receivedRequests : []

        const sharingOrderId = sharingOrder?.id
        const related = receivedList.filter((r) => {
          const rOrderId = r.orderId || r.mainOrderId
          const rSharingOrderId = r.sharingOrderId
          return (sharingOrderId && rSharingOrderId == sharingOrderId) || (rOrderId && rOrderId == this.orderId)
        })

        const creator = sharingOrder
          ? [{
              key: `creator_${sharingOrder.creatorUsername || 'creator'}`,
              username: sharingOrder.creatorUsername,
              teamName: sharingOrder.teamName,
              contact: sharingOrder.contactInfo,
              participantsCount: 1,
              badgeText: '发起方',
              badgeClass: 'badge-creator'
            }]
          : []

        const approvedStatuses = new Set(['APPROVED_PENDING_PAYMENT', 'PAID', 'APPROVED'])
        const members = related.map((r) => {
          const status = this.normalizeStatus(r.status)
          let badgeText = '申请中'
          let badgeClass = 'badge-pending'
          if (status === 'PENDING') {
            badgeText = '待处理'
            badgeClass = 'badge-pending'
          } else if (approvedStatuses.has(status)) {
            badgeText = status === 'APPROVED_PENDING_PAYMENT' ? '已同意(待支付)' : (status === 'PAID' ? '已支付' : '已完成')
            badgeClass = 'badge-approved'
          } else if (status === 'REJECTED') {
            badgeText = '已拒绝'
            badgeClass = 'badge-rejected'
          } else if (status === 'TIMEOUT_CANCELLED') {
            badgeText = '已超时'
            badgeClass = 'badge-muted'
          } else if (status === 'CANCELLED') {
            badgeText = '已取消'
            badgeClass = 'badge-muted'
          }
          return {
            key: `req_${r.id}`,
            username: r.applicantName || r.applicantUsername,
            teamName: r.applicantTeamName,
            contact: r.applicantContact,
            participantsCount: r.participantsCount,
            badgeText,
            badgeClass
          }
        })

        const visibleMembers = members.filter((m) => {
          const statusText = m.badgeText || ''
          return statusText.startsWith('已同意') || statusText === '已支付' || statusText === '已完成' || statusText === '发起方'
        })

        this.participants = [...creator, ...visibleMembers]
      } catch (e) {
        this.error = e?.message || '加载失败'
        this.participants = []
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 40rpx;
}

/* 顶部卡片 */
.header-card {
  background: linear-gradient(135deg, #ff8e53 0%, #ff6b35 100%);
  padding: 40rpx 40rpx 50rpx;
  border-radius: 0 0 40rpx 40rpx;
  color: #fff;
  box-shadow: 0 10rpx 30rpx rgba(255, 107, 53, 0.2);
  margin-bottom: 20rpx;

  .venue-info {
    margin-bottom: 30rpx;
    
    .venue-name {
      font-size: 40rpx;
      font-weight: bold;
      display: block;
      margin-bottom: 12rpx;
      text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.1);
    }
    
    .time-info {
      font-size: 26rpx;
      opacity: 0.9;
      display: flex;
      align-items: center;
      
      .icon {
        margin-right: 8rpx;
        font-size: 28rpx;
      }
    }
  }

  .meta-row {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 20rpx;
    padding: 24rpx 0;
    
    .meta-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      
      .meta-label {
        font-size: 22rpx;
        opacity: 0.8;
        margin-bottom: 8rpx;
      }
      
      .meta-value {
        font-size: 30rpx;
        font-weight: 600;
        
        &.highlight {
          display: flex;
          align-items: baseline;
          
          .current {
            font-size: 40rpx;
            color: #fff;
          }
          .max {
            font-size: 24rpx;
            opacity: 0.8;
            margin-left: 4rpx;
          }
        }
      }
    }
    
    .meta-divider {
      width: 2rpx;
      height: 40rpx;
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

/* 状态展示区 */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;

  .loading-spinner {
    width: 60rpx;
    height: 60rpx;
    border: 6rpx solid #ffe8e0;
    border-top-color: #ff6b35;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 30rpx;
  }
  
  .icon-error {
    font-size: 80rpx;
    margin-bottom: 20rpx;
  }

  .state-text {
    font-size: 28rpx;
    color: #999;
    
    &.error {
      color: #ff4d4f;
      margin-bottom: 30rpx;
    }
  }

  .retry-btn {
    background: #ff6b35;
    color: #fff;
    font-size: 28rpx;
    padding: 0 60rpx;
    height: 72rpx;
    line-height: 72rpx;
    border-radius: 36rpx;
    border: none;
    
    &::after {
      border: none;
    }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 列表区域 */
.content-wrapper {
  padding: 0 30rpx;
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin: 30rpx 0 24rpx;
    padding-left: 10rpx;
    
    .section-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #333;
      position: relative;
      
      &::before {
        content: '';
        position: absolute;
        left: -16rpx;
        top: 50%;
        transform: translateY(-50%);
        width: 8rpx;
        height: 32rpx;
        background: #ff6b35;
        border-radius: 4rpx;
      }
    }
    
    .section-count {
      font-size: 24rpx;
      color: #999;
    }
  }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.03);
  
  .empty-icon {
    font-size: 100rpx;
    margin-bottom: 24rpx;
    opacity: 0.8;
  }
  
  .empty-text {
    font-size: 30rpx;
    color: #333;
    font-weight: 500;
    margin-bottom: 12rpx;
  }
  
  .empty-hint {
    font-size: 24rpx;
    color: #999;
  }
}

/* 参与者卡片 */
.participant-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.participant-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.03);
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
  }
  
  &.is-creator {
    border: 2rpx solid rgba(255, 107, 53, 0.2);
    background: linear-gradient(to right, rgba(255, 107, 53, 0.02), #fff);
  }

  .avatar-wrap {
    position: relative;
    margin-right: 24rpx;
    
    .avatar {
      width: 96rpx;
      height: 96rpx;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36rpx;
      color: #fff;
      font-weight: 600;
      box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
      
      &.avatar-creator { background: linear-gradient(135deg, #ff8e53, #ff6b35); }
      &.bg-c1 { background: linear-gradient(135deg, #74ebd5, #9face6); }
      &.bg-c2 { background: linear-gradient(135deg, #a18cd1, #fbc2eb); }
      &.bg-c3 { background: linear-gradient(135deg, #84fab0, #8fd3f4); }
      &.bg-c4 { background: linear-gradient(135deg, #fa709a, #fee140); }
      &.bg-c5 { background: linear-gradient(135deg, #fccb90, #d57eeb); }
    }
    
    .creator-crown {
      position: absolute;
      top: -16rpx;
      right: -10rpx;
      font-size: 36rpx;
      transform: rotate(15deg);
    }
  }

  .info-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
    
    .name-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16rpx;
      
      .name {
        font-size: 32rpx;
        font-weight: 600;
        color: #333;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-right: 16rpx;
      }
      
      .status-badge {
        font-size: 22rpx;
        padding: 6rpx 16rpx;
        border-radius: 100rpx;
        font-weight: 500;
        flex-shrink: 0;
        
        &.badge-creator {
          background: rgba(255, 107, 53, 0.1);
          color: #ff6b35;
        }
        &.badge-approved {
          background: rgba(46, 204, 113, 0.1);
          color: #2ecc71;
        }
        &.badge-rejected {
          background: rgba(255, 77, 79, 0.1);
          color: #ff4d4f;
        }
        &.badge-pending {
          background: rgba(24, 144, 255, 0.1);
          color: #1890ff;
        }
        &.badge-muted {
          background: #f5f5f5;
          color: #999;
        }
      }
    }
    
    .detail-row {
      display: flex;
      align-items: center;
      
      .detail-item {
        display: flex;
        align-items: center;
        font-size: 24rpx;
        color: #666;
        margin-right: 24rpx;
        
        .icon {
          font-size: 24rpx;
          margin-right: 6rpx;
          opacity: 0.8;
        }
        
        &.contact {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }
  }
}
</style>

