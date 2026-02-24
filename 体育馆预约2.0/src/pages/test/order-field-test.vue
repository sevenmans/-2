<template>
  <view class="container">
    <view class="header">
      <text class="title">Order字段传递测试</text>
    </view>
    
    <!-- 测试参数 -->
    <view class="test-section">
      <view class="section-title">测试参数</view>
      
      <view class="test-item">
        <text class="test-label">场馆ID:</text>
        <input v-model="testVenueId" placeholder="输入场馆ID" class="test-input" />
      </view>
      
      <view class="test-item">
        <text class="test-label">测试日期:</text>
        <input v-model="testDate" placeholder="YYYY-MM-DD" class="test-input" />
      </view>
      
      <view class="test-item">
        <text class="test-label">开始时间:</text>
        <input v-model="testStartTime" placeholder="HH:MM" class="test-input" />
      </view>
      
      <view class="test-item">
        <text class="test-label">结束时间:</text>
        <input v-model="testEndTime" placeholder="HH:MM" class="test-input" />
      </view>
      
      <view class="test-item">
        <text class="test-label">每队价格:</text>
        <input v-model="testPrice" placeholder="输入价格" class="test-input" type="number" />
      </view>
    </view>
    
    <!-- 测试1: 拼场数据构建测试 -->
    <view class="test-section">
      <view class="section-title">测试1: 拼场数据构建</view>
      
      <button @click="testSharingDataBuild" class="test-button">构建拼场数据</button>
      
      <view v-if="buildResult" class="test-result">
        <text class="result-title">构建结果:</text>
        <view class="result-item">
          <text>开始时间: {{ buildResult.startTime }}</text>
        </view>
        <view class="result-item">
          <text>结束时间: {{ buildResult.endTime }}</text>
        </view>
        <view class="result-item">
          <text>每队价格: ¥{{ buildResult.price }}</text>
        </view>
        <view class="result-item">
          <text>队伍名称: {{ buildResult.teamName }}</text>
        </view>
        <view class="result-item">
          <text>联系方式: {{ buildResult.contactInfo }}</text>
        </view>
      </view>
    </view>
    
    <!-- 测试2: 模拟拼场创建 -->
    <view class="test-section">
      <view class="section-title">测试2: 模拟拼场创建</view>
      
      <button @click="testSharingCreation" class="test-button">创建拼场订单</button>
      
      <view v-if="creationResult" class="test-result">
        <text class="result-title">创建结果:</text>
        <view class="result-item">
          <text>成功: {{ creationResult.success ? '✅' : '❌' }}</text>
        </view>
        <view v-if="creationResult.orderId" class="result-item">
          <text>订单ID: {{ creationResult.orderId }}</text>
        </view>
        <view v-if="creationResult.orderNo" class="result-item">
          <text>订单号: {{ creationResult.orderNo }}</text>
        </view>
        <view v-if="creationResult.error" class="result-item">
          <text>错误: {{ creationResult.error }}</text>
        </view>
      </view>
    </view>
    
    <!-- 测试3: 数据传递验证 -->
    <view class="test-section">
      <view class="section-title">测试3: 数据传递验证</view>
      
      <button @click="testDataTransmission" class="test-button">验证数据传递</button>
      
      <view v-if="transmissionResult" class="test-result">
        <text class="result-title">传递验证:</text>
        <view class="result-item">
          <text>时间传递: {{ transmissionResult.timeMatch ? '✅' : '❌' }}</text>
        </view>
        <view class="result-item">
          <text>价格传递: {{ transmissionResult.priceMatch ? '✅' : '❌' }}</text>
        </view>
        <view class="result-item">
          <text>字段传递: {{ transmissionResult.fieldMatch ? '✅' : '❌' }}</text>
        </view>
        <view v-if="transmissionResult.issues.length > 0" class="result-item">
          <text>问题: {{ transmissionResult.issues.join(', ') }}</text>
        </view>
      </view>
    </view>
    
    <!-- 测试4: Order字段分析 -->
    <view class="test-section">
      <view class="section-title">测试4: Order字段分析</view>
      
      <button @click="testOrderFieldAnalysis" class="test-button">分析Order字段</button>
      
      <view v-if="analysisResult" class="test-result">
        <text class="result-title">字段分析:</text>
        <view class="result-item">
          <text>字段使用率: {{ analysisResult.usageRate }}%</text>
        </view>
        <view class="result-item">
          <text>已使用字段: {{ analysisResult.usedFields }}</text>
        </view>
        <view class="result-item">
          <text>未使用字段: {{ analysisResult.unusedFields }}</text>
        </view>
        <view class="result-item">
          <text>时间字段: {{ analysisResult.timeConsistency ? '✅' : '❌' }}</text>
        </view>
        <view class="result-item">
          <text>价格字段: {{ analysisResult.priceValid ? '✅' : '❌' }}</text>
        </view>
      </view>
    </view>
    
    <!-- 测试日志 -->
    <view class="test-section">
      <view class="section-title">测试日志</view>
      
      <button @click="clearLogs" class="test-button secondary">清除日志</button>
      
      <view class="test-logs">
        <view v-for="(log, index) in testLogs" :key="index" class="log-item">
          <text>{{ log }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useBookingStore } from '@/stores/booking.js'

export default {
  name: 'OrderFieldTest',
  
  data() {
    return {
      testVenueId: '29',
      testDate: '2025-07-20',
      testStartTime: '12:00',
      testEndTime: '13:00',
      testPrice: '100',
      buildResult: null,
      creationResult: null,
      transmissionResult: null,
      analysisResult: null,
      testLogs: [],
      lastCreatedData: null,
      lastResponseData: null
    }
  },
  
  setup() {
    const bookingStore = useBookingStore()
    return {
      bookingStore
    }
  },
  
  methods: {
    addLog(message) {
      const timestamp = new Date().toLocaleTimeString()
      this.testLogs.push(`[${timestamp}] ${message}`)
      console.log(`[Order字段测试] ${message}`)
    },
    
    clearLogs() {
      this.testLogs = []
    },
    
    testSharingDataBuild() {
      this.addLog('开始构建拼场数据...')
      
      try {
        this.buildResult = {
          venueId: parseInt(this.testVenueId),
          date: this.testDate,
          startTime: this.testStartTime,
          endTime: this.testEndTime,
          teamName: '测试队伍',
          contactInfo: '13800138000',
          maxParticipants: 2,
          description: '测试拼场订单',
          price: parseFloat(this.testPrice),
          slotIds: [`default_${this.testVenueId}_${this.testDate}_${this.testStartTime.replace(':', '_')}`]
        }
        
        this.lastCreatedData = this.buildResult
        this.addLog('拼场数据构建成功')
        
      } catch (error) {
        this.addLog(`拼场数据构建失败: ${error.message}`)
        console.error('拼场数据构建失败:', error)
      }
    },
    
    async testSharingCreation() {
      if (!this.buildResult) {
        this.addLog('请先构建拼场数据')
        return
      }
      
      this.addLog('开始创建拼场订单...')
      
      try {
        const response = await this.bookingStore.createSharedBooking(this.buildResult)
        
        this.creationResult = {
          success: true,
          orderId: response.data?.id || response.id,
          orderNo: response.data?.orderNo || response.orderNo,
          response: response
        }
        
        this.lastResponseData = response
        this.addLog(`拼场订单创建成功: ID ${this.creationResult.orderId}`)
        
      } catch (error) {
        this.creationResult = {
          success: false,
          error: error.message
        }
        this.addLog(`拼场订单创建失败: ${error.message}`)
        console.error('拼场订单创建失败:', error)
      }
    },
    
    async testDataTransmission() {
      if (!this.lastCreatedData || !this.lastResponseData) {
        this.addLog('请先创建拼场订单')
        return
      }
      
      this.addLog('开始验证数据传递...')
      
      try {
        const sentData = this.lastCreatedData
        const receivedData = this.lastResponseData
        
        // 验证时间传递
        const sentStartTime = sentData.startTime
        const receivedBookingTime = receivedData.data?.bookingTime || receivedData.bookingTime
        let receivedStartTime = null
        
        if (receivedBookingTime) {
          if (receivedBookingTime.includes('T')) {
            receivedStartTime = receivedBookingTime.split('T')[1].substring(0, 5)
          } else if (receivedBookingTime.includes(' ')) {
            receivedStartTime = receivedBookingTime.split(' ')[1]?.substring(0, 5)
          }
        }
        
        const timeMatch = sentStartTime === receivedStartTime
        
        // 验证价格传递
        const sentPrice = parseFloat(sentData.price)
        const receivedPrice = parseFloat(receivedData.data?.totalPrice || receivedData.totalPrice || 0)
        const priceMatch = Math.abs(sentPrice - receivedPrice) < 0.01
        
        // 验证字段传递
        const sentTeamName = sentData.teamName
        const receivedTeamName = receivedData.data?.teamName || receivedData.teamName
        const fieldMatch = sentTeamName === receivedTeamName
        
        const issues = []
        if (!timeMatch) {
          issues.push(`时间不匹配: 发送${sentStartTime}, 接收${receivedStartTime}`)
        }
        if (!priceMatch) {
          issues.push(`价格不匹配: 发送${sentPrice}, 接收${receivedPrice}`)
        }
        if (!fieldMatch) {
          issues.push(`字段不匹配: 队伍名称`)
        }
        
        this.transmissionResult = {
          timeMatch: timeMatch,
          priceMatch: priceMatch,
          fieldMatch: fieldMatch,
          issues: issues,
          details: {
            sentStartTime: sentStartTime,
            receivedStartTime: receivedStartTime,
            sentPrice: sentPrice,
            receivedPrice: receivedPrice
          }
        }
        
        this.addLog(`数据传递验证完成: ${issues.length === 0 ? '全部正确' : `${issues.length}个问题`}`)
        
      } catch (error) {
        this.addLog(`数据传递验证失败: ${error.message}`)
        console.error('数据传递验证失败:', error)
      }
    },
    
    async testOrderFieldAnalysis() {
      if (!this.lastResponseData) {
        this.addLog('请先创建拼场订单')
        return
      }
      
      this.addLog('开始分析Order字段...')
      
      try {
        const orderData = this.lastResponseData.data || this.lastResponseData
        
        // 模拟字段分析
        const totalFields = 20 // 假设总共20个字段
        let usedFields = 0
        
        const fieldChecks = [
          'id', 'orderNo', 'venueId', 'venueName', 'bookingTime', 'endTime',
          'totalPrice', 'status', 'bookingType', 'teamName', 'contactInfo',
          'maxParticipants', 'createdAt', 'updatedAt'
        ]
        
        fieldChecks.forEach(field => {
          if (orderData[field] !== undefined && orderData[field] !== null) {
            usedFields++
          }
        })
        
        const usageRate = Math.round((usedFields / totalFields) * 100)
        const timeConsistency = !!(orderData.bookingTime && orderData.endTime)
        const priceValid = orderData.totalPrice > 0
        
        this.analysisResult = {
          usageRate: usageRate,
          usedFields: usedFields,
          unusedFields: totalFields - usedFields,
          timeConsistency: timeConsistency,
          priceValid: priceValid,
          details: {
            hasBookingTime: !!orderData.bookingTime,
            hasEndTime: !!orderData.endTime,
            hasTotalPrice: !!orderData.totalPrice,
            hasTeamName: !!orderData.teamName,
            hasContactInfo: !!orderData.contactInfo
          }
        }
        
        this.addLog(`Order字段分析完成: 使用率${usageRate}%`)
        
      } catch (error) {
        this.addLog(`Order字段分析失败: ${error.message}`)
        console.error('Order字段分析失败:', error)
      }
    }
  }
}
</script>

<style scoped>
.container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.test-section {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
  border-bottom: 2px solid #007AFF;
  padding-bottom: 5px;
}

.test-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.test-label {
  width: 80px;
  font-size: 14px;
  color: #666;
}

.test-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.test-button {
  background-color: #007AFF;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px 24px;
  font-size: 16px;
  margin-bottom: 15px;
}

.test-button.secondary {
  background-color: #666;
}

.test-result {
  background-color: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
  border-left: 4px solid #007AFF;
}

.result-title {
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
  display: block;
}

.result-item {
  margin-bottom: 8px;
}

.result-item text {
  font-size: 14px;
  color: #555;
}

.test-logs {
  max-height: 300px;
  overflow-y: auto;
  background-color: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
}

.log-item {
  margin-bottom: 5px;
  font-size: 12px;
  color: #666;
  font-family: monospace;
}
</style>
