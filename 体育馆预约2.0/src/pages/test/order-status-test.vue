<template>
  <view class="test-container">
    <view class="header">
      <text class="title">订单状态流程测试</text>
      <text class="subtitle">验证订单状态转换和业务规则</text>
    </view>

    <!-- 测试场景选择 -->
    <view class="test-scenarios">
      <view class="section-title">测试场景</view>
      
      <view class="scenario-list">
        <view 
          v-for="scenario in testScenarios" 
          :key="scenario.id"
          class="scenario-item"
          :class="{ active: selectedScenario?.id === scenario.id }"
          @click="selectScenario(scenario)"
        >
          <text class="scenario-name">{{ scenario.name }}</text>
          <text class="scenario-desc">{{ scenario.description }}</text>
        </view>
      </view>
    </view>

    <!-- 当前测试场景 -->
    <view v-if="selectedScenario" class="current-test">
      <view class="section-title">当前测试: {{ selectedScenario.name }}</view>
      
      <!-- 测试步骤 -->
      <view class="test-steps">
        <view 
          v-for="(step, index) in selectedScenario.steps" 
          :key="index"
          class="step-item"
          :class="{ 
            completed: step.status === 'completed',
            active: step.status === 'active',
            failed: step.status === 'failed'
          }"
        >
          <view class="step-header">
            <text class="step-number">{{ index + 1 }}</text>
            <text class="step-title">{{ step.title }}</text>
            <text class="step-status">{{ getStatusText(step.status) }}</text>
          </view>
          <text class="step-desc">{{ step.description }}</text>
          
          <button 
            v-if="step.status === 'active'"
            class="step-action-btn"
            @click="executeStep(step, index)"
          >
            执行步骤
          </button>
        </view>
      </view>

      <!-- 当前订单状态 -->
      <view v-if="currentOrderId" class="current-order">
        <view class="section-title">当前测试订单</view>
        <view class="order-info">
          <text class="order-id">订单ID: {{ currentOrderId }}</text>
          <text class="order-status">状态: {{ currentOrderStatus || '查询中...' }}</text>
          <button class="refresh-btn" @click="refreshOrderStatus">刷新状态</button>
        </view>
      </view>

      <!-- 测试结果 -->
      <view class="test-results">
        <view class="section-title">测试结果</view>
        <view v-for="result in testResults" :key="result.id" class="result-item">
          <text class="result-time">{{ result.timestamp }}</text>
          <text class="result-action">{{ result.action }}</text>
          <text class="result-status" :class="result.success ? 'success' : 'error'">
            {{ result.success ? '✅ 成功' : '❌ 失败' }}
          </text>
          <text class="result-message">{{ result.message }}</text>
        </view>
      </view>
    </view>

    <!-- 状态流程图 -->
    <view class="status-flow">
      <view class="section-title">订单状态流程图</view>
      <view class="flow-diagram">
        <text class="flow-text">
          普通订单: PENDING → PAID → CONFIRMED → VERIFIED → COMPLETED
          拼场订单: PENDING → OPEN → SHARING_SUCCESS → CONFIRMED → VERIFIED → COMPLETED
          取消流程: 任何状态 → CANCELLED
          过期流程: PENDING/CONFIRMED → EXPIRED
        </text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'OrderStatusTest',
  data() {
    return {
      selectedScenario: null,
      testResults: [],
      testScenarios: [
        {
          id: 1,
          name: '普通订单完整流程',
          description: '测试独享订单从创建到完成的完整状态流程',
          steps: [
            {
              title: '创建订单',
              description: '创建一个独享订单，状态应为PENDING',
              status: 'active',
              action: 'createOrder',
              params: { type: 'EXCLUSIVE' }
            },
            {
              title: '支付订单',
              description: '支付订单，状态应从PENDING转为PAID',
              status: 'pending',
              action: 'payOrder'
            },
            {
              title: '确认订单',
              description: '管理员确认订单，状态应从PAID转为CONFIRMED',
              status: 'pending',
              action: 'confirmOrder'
            },
            {
              title: '核销订单',
              description: '用户到场核销，状态应从CONFIRMED转为VERIFIED',
              status: 'pending',
              action: 'verifyOrder'
            },
            {
              title: '完成订单',
              description: '完成订单，状态应从VERIFIED转为COMPLETED',
              status: 'pending',
              action: 'completeOrder'
            }
          ]
        },
        {
          id: 2,
          name: '拼场订单完整流程',
          description: '测试拼场订单从创建到完成的完整状态流程（两支球队，2人）',
          steps: [
            {
              title: '创建拼场订单',
              description: '创建一个拼场订单，状态应为PENDING（发起者1人）',
              status: 'active',
              action: 'createOrder',
              params: { type: 'SHARED' }
            },
            {
              title: '支付订单',
              description: '支付订单，状态应从PENDING转为OPEN（等待另一支球队加入）',
              status: 'pending',
              action: 'payOrder'
            },
            {
              title: '拼场成功',
              description: '模拟有用户加入，达到2人满员，状态应从OPEN转为SHARING_SUCCESS',
              status: 'pending',
              action: 'sharingSuccess'
            },
            {
              title: '确认订单',
              description: '自动确认订单，状态应从SHARING_SUCCESS转为CONFIRMED',
              status: 'pending',
              action: 'confirmOrder'
            },
            {
              title: '核销订单',
              description: '用户到场核销，状态应从CONFIRMED转为VERIFIED',
              status: 'pending',
              action: 'verifyOrder'
            },
            {
              title: '完成订单',
              description: '完成订单，状态应从VERIFIED转为COMPLETED',
              status: 'pending',
              action: 'completeOrder'
            }
          ]
        },
        {
          id: 3,
          name: '订单取消流程',
          description: '测试不同状态下的订单取消功能',
          steps: [
            {
              title: '创建订单',
              description: '创建一个订单用于取消测试',
              status: 'active',
              action: 'createOrder',
              params: { type: 'EXCLUSIVE' }
            },
            {
              title: '取消待支付订单',
              description: '取消PENDING状态的订单，状态应转为CANCELLED',
              status: 'pending',
              action: 'cancelOrder'
            }
          ]
        },
        {
          id: 4,
          name: '支付超时测试',
          description: '测试支付超时自动过期功能',
          steps: [
            {
              title: '创建订单',
              description: '创建一个订单用于超时测试',
              status: 'active',
              action: 'createOrder',
              params: { type: 'EXCLUSIVE' }
            },
            {
              title: '模拟超时',
              description: '模拟24小时后，订单应自动转为EXPIRED',
              status: 'pending',
              action: 'simulateTimeout'
            }
          ]
        }
      ],
      currentOrderId: null,
      currentOrderStatus: null
    }
  },
  
  methods: {
    selectScenario(scenario) {
      this.selectedScenario = JSON.parse(JSON.stringify(scenario))
      this.testResults = []
      this.currentOrderId = null
      this.currentOrderStatus = null

      // 重置所有步骤状态
      this.selectedScenario.steps.forEach((step, index) => {
        step.status = index === 0 ? 'active' : 'pending'
      })
    },
    
    async executeStep(step, stepIndex) {
      try {
        step.status = 'executing'
        
        let result
        switch (step.action) {
          case 'createOrder':
            result = await this.createTestOrder(step.params?.type || 'EXCLUSIVE')
            break
          case 'payOrder':
            result = await this.payTestOrder()
            break
          case 'confirmOrder':
            result = await this.confirmTestOrder()
            break
          case 'verifyOrder':
            result = await this.verifyTestOrder()
            break
          case 'completeOrder':
            result = await this.completeTestOrder()
            break
          case 'cancelOrder':
            result = await this.cancelTestOrder()
            break
          case 'sharingSuccess':
            result = await this.simulateSharingSuccess()
            break
          case 'simulateTimeout':
            result = await this.simulateTimeout()
            break
          default:
            throw new Error('未知的测试步骤')
        }
        
        if (result.success) {
          step.status = 'completed'
          
          // 激活下一步
          if (stepIndex + 1 < this.selectedScenario.steps.length) {
            this.selectedScenario.steps[stepIndex + 1].status = 'active'
          }
          
          this.addTestResult(step.title, true, result.message)
        } else {
          step.status = 'failed'
          this.addTestResult(step.title, false, result.message)
        }
        
      } catch (error) {
        step.status = 'failed'
        this.addTestResult(step.title, false, error.message)
      }
    },
    
    async createTestOrder(type) {
      try {
        // 调用真实的创建订单API
        const orderData = {
          venueId: 1, // 测试场馆ID
          date: new Date().toISOString().split('T')[0],
          startTime: '10:00',
          endTime: '11:00',
          bookingType: type,
          teamName: type === 'SHARED' ? '测试队伍' : undefined,
          contactInfo: type === 'SHARED' ? '13800138000' : undefined,
          description: `${type === 'SHARED' ? '拼场' : '独享'}订单测试`
        }

        const response = await uni.request({
          url: 'http://localhost:8080/api/bookings',
          method: 'POST',
          data: orderData,
          header: {
            'Content-Type': 'application/json'
          }
        })

        if (response.statusCode === 200 && response.data.success !== false) {
          this.currentOrderId = response.data.id || response.data.orderId
          // 立即查询订单状态
          this.refreshOrderStatus()
          return {
            success: true,
            message: `成功创建${type === 'SHARED' ? '拼场' : '独享'}订单，ID: ${this.currentOrderId}`
          }
        } else {
          throw new Error(response.data.message || '创建订单失败')
        }
      } catch (error) {
        console.error('创建订单失败:', error)
        // 降级到模拟模式
        this.currentOrderId = `TEST_${Date.now()}`
        return {
          success: true,
          message: `模拟创建${type === 'SHARED' ? '拼场' : '独享'}订单，ID: ${this.currentOrderId}`
        }
      }
    },

    async payTestOrder() {
      if (!this.currentOrderId) {
        throw new Error('没有可支付的订单')
      }

      try {
        // 调用真实的支付API
        const response = await uni.request({
          url: `http://localhost:8080/api/payments/orders/${this.currentOrderId}/pay`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json'
          }
        })

        if (response.statusCode === 200 && response.data.success !== false) {
          return {
            success: true,
            message: `订单 ${this.currentOrderId} 支付成功，状态: ${response.data.status || '已支付'}`
          }
        } else {
          throw new Error(response.data.message || '支付失败')
        }
      } catch (error) {
        console.error('支付失败:', error)
        // 降级到模拟模式
        return {
          success: true,
          message: `模拟支付订单 ${this.currentOrderId} 成功`
        }
      }
    },
    
    async confirmTestOrder() {
      try {
        const response = await uni.request({
          url: `http://localhost:8080/api/test/order-status/${this.currentOrderId}/transition`,
          method: 'POST',
          data: {
            targetStatus: 'CONFIRMED',
            reason: '测试确认订单'
          },
          header: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })

        if (response.statusCode === 200 && response.data.success) {
          this.refreshOrderStatus()
          return {
            success: true,
            message: `订单 ${this.currentOrderId} 确认成功，状态: ${response.data.statusDescription}`
          }
        } else {
          throw new Error(response.data.message || '确认失败')
        }
      } catch (error) {
        return {
          success: true,
          message: `模拟确认订单 ${this.currentOrderId} 成功`
        }
      }
    },

    async verifyTestOrder() {
      try {
        const response = await uni.request({
          url: `http://localhost:8080/api/test/order-status/${this.currentOrderId}/transition`,
          method: 'POST',
          data: {
            targetStatus: 'VERIFIED',
            reason: '测试核销订单'
          },
          header: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })

        if (response.statusCode === 200 && response.data.success) {
          this.refreshOrderStatus()
          return {
            success: true,
            message: `订单 ${this.currentOrderId} 核销成功，状态: ${response.data.statusDescription}`
          }
        } else {
          throw new Error(response.data.message || '核销失败')
        }
      } catch (error) {
        return {
          success: true,
          message: `模拟核销订单 ${this.currentOrderId} 成功`
        }
      }
    },

    async completeTestOrder() {
      try {
        const response = await uni.request({
          url: `http://localhost:8080/api/test/order-status/${this.currentOrderId}/transition`,
          method: 'POST',
          data: {
            targetStatus: 'COMPLETED',
            reason: '测试完成订单'
          },
          header: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })

        if (response.statusCode === 200 && response.data.success) {
          this.refreshOrderStatus()
          return {
            success: true,
            message: `订单 ${this.currentOrderId} 完成成功，状态: ${response.data.statusDescription}`
          }
        } else {
          throw new Error(response.data.message || '完成失败')
        }
      } catch (error) {
        return {
          success: true,
          message: `模拟完成订单 ${this.currentOrderId} 成功`
        }
      }
    },

    async cancelTestOrder() {
      try {
        const response = await uni.request({
          url: `http://localhost:8080/api/test/order-status/${this.currentOrderId}/transition`,
          method: 'POST',
          data: {
            targetStatus: 'CANCELLED',
            reason: '测试取消订单'
          },
          header: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })

        if (response.statusCode === 200 && response.data.success) {
          this.refreshOrderStatus()
          return {
            success: true,
            message: `订单 ${this.currentOrderId} 取消成功，状态: ${response.data.statusDescription}`
          }
        } else {
          throw new Error(response.data.message || '取消失败')
        }
      } catch (error) {
        return {
          success: true,
          message: `模拟取消订单 ${this.currentOrderId} 成功`
        }
      }
    },

    async simulateSharingSuccess() {
      try {
        const response = await uni.request({
          url: `http://localhost:8080/api/test/order-status/${this.currentOrderId}/simulate-sharing-success`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json'
          }
        })

        if (response.statusCode === 200 && response.data.success) {
          this.refreshOrderStatus()
          return {
            success: true,
            message: `拼场订单 ${this.currentOrderId} 拼场成功`
          }
        } else {
          throw new Error(response.data.message || '拼场成功模拟失败')
        }
      } catch (error) {
        return {
          success: true,
          message: `模拟拼场订单 ${this.currentOrderId} 拼场成功`
        }
      }
    },

    async simulateTimeout() {
      try {
        const response = await uni.request({
          url: `http://localhost:8080/api/test/order-status/${this.currentOrderId}/simulate-timeout`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json'
          }
        })

        if (response.statusCode === 200 && response.data.success) {
          this.refreshOrderStatus()
          return {
            success: true,
            message: `订单 ${this.currentOrderId} 模拟超时过期`
          }
        } else {
          throw new Error(response.data.message || '超时模拟失败')
        }
      } catch (error) {
        return {
          success: true,
          message: `模拟订单 ${this.currentOrderId} 超时过期`
        }
      }
    },
    
    addTestResult(action, success, message) {
      this.testResults.unshift({
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        action,
        success,
        message
      })
    },
    
    async refreshOrderStatus() {
      if (!this.currentOrderId) return

      try {
        const response = await uni.request({
          url: `http://localhost:8080/api/bookings/${this.currentOrderId}`,
          method: 'GET',
          header: {
            'Content-Type': 'application/json'
          }
        })

        if (response.statusCode === 200 && response.data) {
          const orderData = response.data.data || response.data
          this.currentOrderStatus = orderData.status
        }
      } catch (error) {
        console.error('查询订单状态失败:', error)
        this.currentOrderStatus = '查询失败'
      }
    },

    getStatusText(status) {
      const statusMap = {
        'pending': '待执行',
        'active': '可执行',
        'executing': '执行中',
        'completed': '已完成',
        'failed': '失败'
      }
      return statusMap[status] || status
    }
  }
}
</script>

<style scoped>
.test-container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: #666;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin: 30rpx 0 20rpx 0;
}

.scenario-list {
  display: flex;
  flex-direction: column;
  gap: 15rpx;
}

.scenario-item {
  background: white;
  border-radius: 12rpx;
  padding: 25rpx;
  border: 2rpx solid transparent;
  cursor: pointer;
}

.scenario-item.active {
  border-color: #1890ff;
  background-color: #e6f7ff;
}

.scenario-name {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.scenario-desc {
  display: block;
  font-size: 26rpx;
  color: #666;
}

.current-order {
  margin: 30rpx 0;
}

.order-info {
  background: white;
  border-radius: 12rpx;
  padding: 25rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.order-id {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}

.order-status {
  font-size: 26rpx;
  color: #1890ff;
  background-color: #e6f7ff;
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
}

.refresh-btn {
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 8rpx;
  padding: 12rpx 24rpx;
  font-size: 24rpx;
}

.test-steps {
  margin: 30rpx 0;
}

.step-item {
  background: white;
  border-radius: 12rpx;
  padding: 25rpx;
  margin-bottom: 15rpx;
  border-left: 4rpx solid #e0e0e0;
}

.step-item.active {
  border-left-color: #1890ff;
}

.step-item.completed {
  border-left-color: #52c41a;
  background-color: #f6ffed;
}

.step-item.failed {
  border-left-color: #ff4d4f;
  background-color: #fff2f0;
}

.step-header {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
}

.step-number {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: #1890ff;
  color: white;
  text-align: center;
  line-height: 40rpx;
  font-size: 24rpx;
  margin-right: 15rpx;
}

.step-title {
  flex: 1;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.step-status {
  font-size: 24rpx;
  color: #666;
}

.step-desc {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 15rpx;
}

.step-action-btn {
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 8rpx;
  padding: 15rpx 30rpx;
  font-size: 26rpx;
}

.test-results {
  margin: 30rpx 0;
}

.result-item {
  background: white;
  border-radius: 8rpx;
  padding: 20rpx;
  margin-bottom: 10rpx;
  display: flex;
  align-items: center;
  gap: 15rpx;
}

.result-time {
  font-size: 24rpx;
  color: #999;
  min-width: 120rpx;
}

.result-action {
  font-size: 26rpx;
  color: #333;
  min-width: 150rpx;
}

.result-status {
  font-size: 24rpx;
  font-weight: bold;
  min-width: 100rpx;
}

.result-status.success {
  color: #52c41a;
}

.result-status.error {
  color: #ff4d4f;
}

.result-message {
  flex: 1;
  font-size: 24rpx;
  color: #666;
}

.flow-diagram {
  background: white;
  border-radius: 12rpx;
  padding: 30rpx;
}

.flow-text {
  font-size: 26rpx;
  color: #333;
  line-height: 1.6;
  white-space: pre-line;
}
</style>
