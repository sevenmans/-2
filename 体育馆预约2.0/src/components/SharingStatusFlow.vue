<template>
  <view class="sharing-status-flow">
    <view class="flow-title">拼场流程</view>
    
    <!-- 流程步骤 -->
    <view class="flow-steps">
      <view 
        v-for="(step, index) in flowSteps" 
        :key="index"
        class="flow-step"
        :class="{ 
          'active': step.status === currentStatus,
          'completed': isStepCompleted(step.status),
          'pending': isStepPending(step.status)
        }"
      >
        <view class="step-icon">
          <text v-if="isStepCompleted(step.status)" class="icon-check">✓</text>
          <text v-else-if="step.status === currentStatus" class="icon-current">{{ index + 1 }}</text>
          <text v-else class="icon-pending">{{ index + 1 }}</text>
        </view>
        
        <view class="step-content">
          <view class="step-title">{{ step.title }}</view>
          <view class="step-desc">{{ step.description }}</view>
          
          <!-- 当前步骤的详细信息 -->
          <view v-if="step.status === currentStatus" class="step-detail">
            <view v-if="step.status === 'OPEN'" class="detail-info">
              <text class="detail-text">等待其他用户申请加入...</text>
            </view>
            
            <view v-if="step.status === 'APPROVED_PENDING_PAYMENT'" class="detail-info">
              <text class="detail-text">申请已批准，等待对方支付</text>
              <view v-if="paymentDeadline" class="countdown">
                <text class="countdown-text">支付剩余时间：</text>
                <countdown-timer 
                  :deadline="paymentDeadline"
                  @expired="onPaymentTimeout"
                  format="mm:ss"
                />
              </view>
            </view>
            
            <view v-if="step.status === 'SHARING_SUCCESS'" class="detail-info">
              <text class="detail-text">拼场成功！双方已支付</text>
            </view>
          </view>
        </view>
        
        <!-- 连接线 -->
        <view v-if="index < flowSteps.length - 1" class="step-connector"
              :class="{ 'completed': isStepCompleted(flowSteps[index + 1].status) }">
        </view>
      </view>
    </view>
    
    <!-- 参与者信息 -->
    <view class="participants-info">
      <view class="participants-title">参与者信息</view>
      <view class="participants-list">
        <view class="participant-item creator">
          <view class="participant-avatar">👤</view>
          <view class="participant-info">
            <text class="participant-name">{{ creatorName || '发起者' }}</text>
            <text class="participant-role">发起者</text>
            <text class="participant-status">{{ getCreatorStatus() }}</text>
          </view>
        </view>
        
        <view class="vs-divider">VS</view>
        
        <view class="participant-item applicant">
          <view class="participant-avatar">{{ applicantName ? '👤' : '❓' }}</view>
          <view class="participant-info">
            <text class="participant-name">{{ applicantName || '等待加入...' }}</text>
            <text class="participant-role">{{ applicantName ? '申请者' : '待加入' }}</text>
            <text class="participant-status">{{ getApplicantStatus() }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import CountdownTimer from './CountdownTimer.vue'

export default {
  name: 'SharingStatusFlow',
  components: {
    CountdownTimer
  },
  props: {
    // 当前状态
    currentStatus: {
      type: String,
      required: true
    },
    // 发起者信息
    creatorName: {
      type: String,
      default: ''
    },
    // 申请者信息
    applicantName: {
      type: String,
      default: ''
    },
    // 支付截止时间
    paymentDeadline: {
      type: String,
      default: ''
    },
    // 用户角色
    userRole: {
      type: String, // 'creator' | 'applicant' | 'viewer'
      default: 'viewer'
    }
  },
  
  data() {
    return {
      flowSteps: [
        {
          status: 'PENDING',
          title: '创建拼场',
          description: '发起者创建拼场订单'
        },
        {
          status: 'OPEN',
          title: '开放申请',
          description: '发起者已支付，等待申请者'
        },
        {
          status: 'APPROVED_PENDING_PAYMENT',
          title: '等待支付',
          description: '申请已批准，等待申请者支付'
        },
        {
          status: 'SHARING_SUCCESS',
          title: '拼场成功',
          description: '双方已支付，拼场成功'
        },
        {
          status: 'CONFIRMED',
          title: '确认完成',
          description: '系统确认，等待使用'
        }
      ]
    }
  },
  
  methods: {
    // 判断步骤是否已完成
    isStepCompleted(stepStatus) {
      const statusOrder = ['PENDING', 'OPEN', 'APPROVED_PENDING_PAYMENT', 'SHARING_SUCCESS', 'CONFIRMED']
      const currentIndex = statusOrder.indexOf(this.currentStatus)
      const stepIndex = statusOrder.indexOf(stepStatus)
      return stepIndex < currentIndex
    },
    
    // 判断步骤是否待处理
    isStepPending(stepStatus) {
      const statusOrder = ['PENDING', 'OPEN', 'APPROVED_PENDING_PAYMENT', 'SHARING_SUCCESS', 'CONFIRMED']
      const currentIndex = statusOrder.indexOf(this.currentStatus)
      const stepIndex = statusOrder.indexOf(stepStatus)
      return stepIndex > currentIndex
    },
    
    // 获取发起者状态
    getCreatorStatus() {
      switch (this.currentStatus) {
        case 'PENDING':
          return '待支付'
        case 'OPEN':
          return '已支付，等待申请者'
        case 'APPROVED_PENDING_PAYMENT':
          return '已批准申请，等待对方支付'
        case 'SHARING_SUCCESS':
          return '拼场成功'
        case 'CONFIRMED':
          return '已确认'
        case 'CANCELLED':
          return '已取消'
        case 'TIMEOUT_CANCELLED':
          return '超时已取消'
        default:
          return '未知状态'
      }
    },
    
    // 获取申请者状态
    getApplicantStatus() {
      if (!this.applicantName) {
        return '等待加入'
      }
      
      switch (this.currentStatus) {
        case 'PENDING':
        case 'OPEN':
          return '已申请，待批准'
        case 'APPROVED_PENDING_PAYMENT':
          return '需要支付'
        case 'SHARING_SUCCESS':
          return '拼场成功'
        case 'CONFIRMED':
          return '已确认'
        case 'CANCELLED':
          return '已取消'
        case 'TIMEOUT_CANCELLED':
          return '超时已取消'
        default:
          return '未知状态'
      }
    },
    
    // 支付超时处理
    onPaymentTimeout() {
      this.$emit('payment-timeout')
    }
  }
}
</script>

<style lang="scss" scoped>
.sharing-status-flow {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.flow-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  text-align: center;
  margin-bottom: 40rpx;
}

.flow-steps {
  position: relative;
}

.flow-step {
  display: flex;
  align-items: flex-start;
  margin-bottom: 40rpx;
  position: relative;
  
  &.active {
    .step-icon {
      background: #ff6b35;
      color: #ffffff;
    }
    
    .step-title {
      color: #ff6b35;
      font-weight: bold;
    }
  }
  
  &.completed {
    .step-icon {
      background: #52c41a;
      color: #ffffff;
    }
    
    .step-title {
      color: #52c41a;
    }
  }
  
  &.pending {
    .step-icon {
      background: #f5f5f5;
      color: #999999;
    }
    
    .step-title {
      color: #999999;
    }
  }
}

.step-icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: bold;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-title {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.step-desc {
  font-size: 24rpx;
  color: #666666;
  margin-bottom: 12rpx;
}

.step-detail {
  background: #f8f9fa;
  border-radius: 8rpx;
  padding: 16rpx;
  margin-top: 12rpx;
}

.detail-text {
  font-size: 24rpx;
  color: #333333;
}

.countdown {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
}

.countdown-text {
  font-size: 22rpx;
  color: #666666;
  margin-right: 8rpx;
}

.step-connector {
  position: absolute;
  left: 30rpx;
  top: 60rpx;
  width: 4rpx;
  height: 40rpx;
  background: #e8e8e8;
  
  &.completed {
    background: #52c41a;
  }
}

.participants-info {
  margin-top: 40rpx;
  padding-top: 30rpx;
  border-top: 2rpx solid #f0f0f0;
}

.participants-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 20rpx;
  text-align: center;
}

.participants-list {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.participant-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.participant-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  margin-bottom: 12rpx;
}

.participant-info {
  text-align: center;
}

.participant-name {
  font-size: 24rpx;
  font-weight: bold;
  color: #333333;
  display: block;
  margin-bottom: 4rpx;
}

.participant-role {
  font-size: 20rpx;
  color: #666666;
  display: block;
  margin-bottom: 4rpx;
}

.participant-status {
  font-size: 20rpx;
  color: #ff6b35;
  display: block;
}

.vs-divider {
  font-size: 24rpx;
  font-weight: bold;
  color: #999999;
  margin: 0 20rpx;
}
</style>
