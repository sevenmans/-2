<template>
  <view class="container">
    <view class="header">
      <view class="title-row">
        <text class="title">参与者</text>
        <text v-if="sharingOrder" class="sub">
          {{ sharingOrder.venueName || '' }} {{ sharingOrder.startTime || '' }}-{{ sharingOrder.endTime || '' }}
        </text>
      </view>
      <view v-if="sharingOrder" class="meta">
        <text class="meta-text">发起方：{{ sharingOrder.teamName || '-' }}</text>
        <text class="meta-text">人数：{{ sharingOrder.currentParticipants || 0 }}/{{ sharingOrder.maxParticipants || 0 }}</text>
      </view>
    </view>

    <view v-if="loading" class="state">
      <text>加载中...</text>
    </view>
    <view v-else-if="error" class="state">
      <text class="error">{{ error }}</text>
      <button class="btn" @click="load">重试</button>
    </view>
    <view v-else class="content">
      <view v-if="participants.length === 0" class="state">
        <text>暂无参与者信息</text>
        <text class="hint">仅发起方可查看完整参与者列表</text>
      </view>
      <view v-else class="list">
        <view v-for="p in participants" :key="p.key" class="item">
          <view class="row">
            <text class="name">{{ p.teamName || p.username || '-' }}</text>
            <text class="badge" :class="p.badgeClass">{{ p.badgeText }}</text>
          </view>
          <view class="row subrow">
            <text class="subtext">人数：{{ p.participantsCount || 0 }}</text>
            <text class="subtext">联系方式：{{ p.contact || '-' }}</text>
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
  background: #f5f5f5;
}

.header {
  background: #ffffff;
  padding: 24rpx 30rpx 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.title-row {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 34rpx;
  font-weight: 600;
  color: #111;
}

.sub {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #666;
}

.meta {
  margin-top: 14rpx;
  display: flex;
  justify-content: space-between;
}

.meta-text {
  font-size: 24rpx;
  color: #333;
}

.content {
  padding: 20rpx 24rpx;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.item {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 22rpx;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.subrow {
  margin-top: 10rpx;
}

.name {
  font-size: 28rpx;
  color: #111;
  font-weight: 500;
}

.subtext {
  font-size: 24rpx;
  color: #666;
}

.badge {
  font-size: 22rpx;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
}

.badge-creator {
  background: rgba(255, 107, 53, 0.12);
  color: #ff6b35;
}

.badge-approved {
  background: rgba(46, 204, 113, 0.12);
  color: #2ecc71;
}

.badge-rejected {
  background: rgba(255, 77, 79, 0.12);
  color: #ff4d4f;
}

.badge-pending {
  background: rgba(24, 144, 255, 0.12);
  color: #1890ff;
}

.badge-muted {
  background: rgba(0, 0, 0, 0.06);
  color: #666;
}

.state {
  padding: 60rpx 24rpx;
  text-align: center;
  color: #666;
}

.error {
  color: #ff4d4f;
}

.hint {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #999;
}

.btn {
  margin-top: 20rpx;
  background: #ff6b35;
  color: #fff;
}
</style>

