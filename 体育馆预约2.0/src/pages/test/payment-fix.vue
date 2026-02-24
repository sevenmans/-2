<template>
  <view class="test-container">
    <view class="test-header">
      <text class="test-title">支付问题修复测试</text>
    </view>

    <!-- 测试1: 订单金额显示 -->
    <view class="test-section">
      <view class="section-title">测试1: 订单金额显示修复</view>
      
      <view class="test-item">
        <text class="test-label">测试订单ID:</text>
        <input v-model="testOrderId" placeholder="输入订单ID" class="test-input" />
      </view>
      
      <button @click="testOrderAmount" class="test-button">测试订单金额计算</button>
      
      <view v-if="orderTestResult" class="test-result">
        <text class="result-title">测试结果:</text>
        <view class="result-item">
          <text>原始价格: ¥{{ orderTestResult.originalPrice }}</text>
        </view>
        <view class="result-item">
          <text>计算价格: ¥{{ orderTestResult.calculatedPrice }}</text>
        </view>
        <view class="result-item">
          <text>计算方法: {{ orderTestResult.calculationMethod }}</text>
        </view>
        <view class="result-item">
          <text>建议: {{ orderTestResult.recommendation }}</text>
        </view>
      </view>
    </view>

    <!-- 测试2: 时间段刷新 -->
    <view class="test-section">
      <view class="section-title">测试2: 时间段刷新修复</view>
      
      <view class="test-item">
        <text class="test-label">场馆ID:</text>
        <input v-model="testVenueId" placeholder="输入场馆ID" class="test-input" />
      </view>
      
      <view class="test-item">
        <text class="test-label">日期:</text>
        <input v-model="testDate" placeholder="YYYY-MM-DD" class="test-input" />
      </view>
      
      <button @click="testTimeSlotRefresh" class="test-button">测试时间段刷新</button>
      
      <view v-if="timeSlotTestResult" class="test-result">
        <text class="result-title">刷新前状态:</text>
        <view class="result-item">
          <text>时间段数量: {{ timeSlotTestResult.before?.currentSlotsCount || 0 }}</text>
        </view>
        
        <text class="result-title">刷新后状态:</text>
        <view class="result-item">
          <text>时间段数量: {{ timeSlotTestResult.after?.newSlotsCount || 0 }}</text>
        </view>
        <view class="result-item">
          <text>刷新成功: {{ timeSlotTestResult.after?.success ? '是' : '否' }}</text>
        </view>
      </view>
    </view>

    <!-- 测试3: 价格传递调试 -->
    <view class="test-section">
      <view class="section-title">测试3: 价格传递调试</view>

      <view class="test-item">
        <text class="test-label">测试价格:</text>
        <input v-model="testPrice" placeholder="输入价格" class="test-input" />
      </view>

      <button @click="testPriceTransmission" class="test-button">测试价格传递</button>

      <view v-if="priceTransmissionResult" class="test-result">
        <text class="result-title">价格传递测试结果:</text>
        <view class="result-item">
          <text>成功: {{ priceTransmissionResult.success ? '✅' : '❌' }}</text>
        </view>
        <view class="result-item">
          <text>原始价格: {{ priceTransmissionResult.originalPrice }}</text>
        </view>
        <view class="result-item">
          <text>最终价格: {{ priceTransmissionResult.finalPrice }}</text>
        </view>
        <view class="result-item">
          <text>价格保持: {{ priceTransmissionResult.pricePreserved ? '✅' : '❌' }}</text>
        </view>
        <view v-if="priceTransmissionResult.issues.length > 0" class="result-item">
          <text>问题: {{ priceTransmissionResult.issues.join(', ') }}</text>
        </view>
      </view>
    </view>

    <!-- 测试4: 深度验证 -->
    <view class="test-section">
      <view class="section-title">测试4: 深度问题验证</view>

      <button @click="testDeepValidation" class="test-button">深度验证修复效果</button>

      <view v-if="deepValidationResult" class="test-result">
        <text class="result-title">深度验证结果:</text>
        <view class="result-item">
          <text>总体成功: {{ deepValidationResult.overallSuccess ? '✅' : '❌' }}</text>
        </view>
        <view class="result-item">
          <text>总结: {{ deepValidationResult.summary }}</text>
        </view>
        <view v-if="deepValidationResult.priceValidation" class="result-item">
          <text>价格传递: {{ deepValidationResult.priceValidation.priceTransmitted ? '✅' : '❌' }}</text>
        </view>
        <view v-if="deepValidationResult.timeSlotValidation" class="result-item">
          <text>时间段刷新: {{ deepValidationResult.timeSlotValidation.refreshSuccess ? '✅' : '❌' }}</text>
        </view>
      </view>
    </view>

    <!-- 测试5: 综合测试 -->
    <view class="test-section">
      <view class="section-title">测试5: 创建预约流程测试</view>

      <button @click="testFullFlow" class="test-button">测试完整预约流程</button>

      <view v-if="fullFlowResult" class="test-result">
        <text class="result-title">流程测试结果:</text>
        <view v-for="(step, index) in fullFlowResult.steps" :key="index" class="result-item">
          <text>{{ step.name }}: {{ step.success ? '✅' : '❌' }} {{ step.message }}</text>
        </view>
      </view>
    </view>

    <!-- 日志显示 -->
    <view class="test-section">
      <view class="section-title">测试日志</view>
      <view class="log-container">
        <text v-for="(log, index) in testLogs" :key="index" class="log-item">{{ log }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { useBookingStore } from '@/stores/booking.js'
import { useVenueStore } from '@/stores/venue.js'
import { debugOrderAmount, debugTimeSlotRefresh, forceRefreshTimeSlots } from '@/utils/payment-debug.js'
import { validateCompleteBookingFlow, quickPriceCheck } from '@/utils/booking-price-validator.js'

import { quickPriceTest, debugCompleteRequestResponse } from '@/utils/request-debugger.js'

export default {
  name: 'PaymentFixTest',
  data() {
    return {
      testOrderId: '401',
      testVenueId: '25',
      testDate: '2025-07-19',
      testPrice: '240',
      orderTestResult: null,
      timeSlotTestResult: null,
      priceTestResult: null,
      deepValidationResult: null,
      fullFlowResult: null,
      testLogs: []
    }
  },
  
  setup() {
    const bookingStore = useBookingStore()
    const venueStore = useVenueStore()
    
    return {
      bookingStore,
      venueStore
    }
  },
  
  methods: {
    addLog(message) {
      const timestamp = new Date().toLocaleTimeString()
      this.testLogs.unshift(`[${timestamp}] ${message}`)
      if (this.testLogs.length > 20) {
        this.testLogs = this.testLogs.slice(0, 20)
      }
    },
    
    async testOrderAmount() {
      try {
        this.addLog('开始测试订单金额计算...')
        
        // 获取订单信息
        const orderInfo = await this.bookingStore.getBookingDetail(this.testOrderId)
        this.addLog(`获取订单信息: ${orderInfo ? '成功' : '失败'}`)
        
        if (orderInfo) {
          // 使用调试工具分析
          this.orderTestResult = debugOrderAmount(orderInfo)
          this.addLog(`金额计算完成: ¥${this.orderTestResult.calculatedPrice}`)
        } else {
          this.addLog('无法获取订单信息')
        }
      } catch (error) {
        this.addLog(`测试失败: ${error.message}`)
        console.error('订单金额测试失败:', error)
      }
    },
    
    async testTimeSlotRefresh() {
      try {
        this.addLog('开始测试时间段刷新...')
        
        // 刷新前状态
        const beforeResult = debugTimeSlotRefresh(this.testVenueId, this.testDate, this.venueStore)
        this.addLog(`刷新前时间段数量: ${beforeResult.currentSlotsCount}`)
        
        // 执行刷新
        const refreshResult = await forceRefreshTimeSlots(this.testVenueId, this.testDate, this.venueStore)
        this.addLog(`刷新执行: ${refreshResult.success ? '成功' : '失败'}`)
        
        this.timeSlotTestResult = {
          before: beforeResult,
          after: refreshResult
        }
        
        this.addLog(`刷新后时间段数量: ${refreshResult.newSlotsCount || 0}`)
      } catch (error) {
        this.addLog(`测试失败: ${error.message}`)
        console.error('时间段刷新测试失败:', error)
      }
    },

    testPriceCalculation() {
      try {
        this.addLog('开始测试价格计算...')

        this.priceTestResult = quickPriceCheck(this.testPrice)
        this.addLog(`价格验证结果: ${this.priceTestResult.valid ? '通过' : '失败'} - ${this.priceTestResult.message}`)
      } catch (error) {
        this.addLog(`价格测试失败: ${error.message}`)
        console.error('价格计算测试失败:', error)
      }
    },

    async testDeepValidation() {
      try {
        this.addLog('开始深度验证修复效果...')

        // 构造测试预约数据
        const testBookingData = {
          venueId: this.testVenueId,
          date: this.testDate,
          startTime: '18:00',
          endTime: '20:00',
          price: parseFloat(this.testPrice),
          bookingType: 'EXCLUSIVE'
        }

        this.deepValidationResult = await runDeepValidation(
          testBookingData,
          this.testVenueId,
          this.testDate,
          this.venueStore
        )

        this.addLog(`深度验证完成: ${this.deepValidationResult.overallSuccess ? '全部通过' : '发现问题'}`)
        this.addLog(`验证总结: ${this.deepValidationResult.summary}`)

        if (this.deepValidationResult.priceValidation.issues.length > 0) {
          this.addLog(`价格问题: ${this.deepValidationResult.priceValidation.issues.join(', ')}`)
        }

        if (this.deepValidationResult.timeSlotValidation.issues.length > 0) {
          this.addLog(`时间段问题: ${this.deepValidationResult.timeSlotValidation.issues.join(', ')}`)
        }

      } catch (error) {
        this.addLog(`深度验证失败: ${error.message}`)
        console.error('深度验证失败:', error)
      }
    },

    async testFullFlow() {
      try {
        this.addLog('开始测试完整预约流程...')
        
        const steps = []
        
        // 步骤1: 获取场馆信息
        try {
          await this.venueStore.getVenueDetail(this.testVenueId)
          steps.push({ name: '获取场馆信息', success: true, message: '成功' })
          this.addLog('✅ 场馆信息获取成功')
        } catch (error) {
          steps.push({ name: '获取场馆信息', success: false, message: error.message })
          this.addLog('❌ 场馆信息获取失败')
        }
        
        // 步骤2: 获取时间段
        try {
          await this.venueStore.getTimeSlots(this.testVenueId, this.testDate)
          steps.push({ name: '获取时间段', success: true, message: '成功' })
          this.addLog('✅ 时间段获取成功')
        } catch (error) {
          steps.push({ name: '获取时间段', success: false, message: error.message })
          this.addLog('❌ 时间段获取失败')
        }
        
        // 步骤3: 测试价格计算
        try {
          const mockOrder = {
            startTime: '18:00',
            endTime: '20:00',
            bookingType: 'EXCLUSIVE',
            venueName: '测试场馆'
          }
          const priceResult = debugOrderAmount(mockOrder)
          steps.push({ 
            name: '价格计算', 
            success: priceResult.calculatedPrice > 0, 
            message: `¥${priceResult.calculatedPrice}` 
          })
          this.addLog(`✅ 价格计算: ¥${priceResult.calculatedPrice}`)
        } catch (error) {
          steps.push({ name: '价格计算', success: false, message: error.message })
          this.addLog('❌ 价格计算失败')
        }
        
        this.fullFlowResult = { steps }
        this.addLog('完整流程测试完成')
      } catch (error) {
        this.addLog(`流程测试失败: ${error.message}`)
        console.error('完整流程测试失败:', error)
      }
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

.test-header {
  text-align: center;
  margin-bottom: 40rpx;
}

.test-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.test-section {
  background-color: white;
  margin-bottom: 30rpx;
  padding: 30rpx;
  border-radius: 10rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.test-item {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.test-label {
  width: 200rpx;
  font-size: 28rpx;
  color: #666;
}

.test-input {
  flex: 1;
  padding: 20rpx;
  border: 1px solid #ddd;
  border-radius: 5rpx;
  font-size: 28rpx;
}

.test-button {
  background-color: #007aff;
  color: white;
  padding: 20rpx 40rpx;
  border-radius: 5rpx;
  font-size: 28rpx;
  margin: 20rpx 0;
}

.test-result {
  margin-top: 20rpx;
  padding: 20rpx;
  background-color: #f8f8f8;
  border-radius: 5rpx;
}

.result-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.result-item {
  margin-bottom: 10rpx;
}

.result-item text {
  font-size: 26rpx;
  color: #666;
}

.log-container {
  max-height: 400rpx;
  overflow-y: auto;
  background-color: #f8f8f8;
  padding: 20rpx;
  border-radius: 5rpx;
}

.log-item {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 10rpx;
  font-family: monospace;
}
</style>
