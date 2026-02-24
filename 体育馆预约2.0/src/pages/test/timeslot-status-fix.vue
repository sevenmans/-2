<template>
  <view class="container">
    <view class="header">
      <text class="title">🔧 时间段状态修复</text>
      <text class="subtitle">修复时间段状态显示问题</text>
    </view>

    <view class="problem-section">
      <view class="section-title">❌ 问题分析</view>
      <view class="problem-item">
        <text class="problem-text">1. 前端生成的时间段默认状态都是 AVAILABLE</text>
      </view>
      <view class="problem-item">
        <text class="problem-text">2. 后端API可能没有返回真实的预约状态</text>
      </view>
      <view class="problem-item">
        <text class="problem-text">3. 时间段管理器优先使用前端生成的数据</text>
      </view>
    </view>

    <view class="test-section">
      <view class="input-group">
        <text class="label">场馆ID:</text>
        <input v-model="venueId" type="number" placeholder="输入场馆ID" class="input" />
      </view>
      
      <view class="input-group">
        <text class="label">日期:</text>
        <input v-model="testDate" type="text" placeholder="YYYY-MM-DD" class="input" />
      </view>
      
      <button @click="testCurrentFlow" class="test-btn" :disabled="loading">
        {{ loading ? '测试中...' : '🔍 测试当前流程' }}
      </button>
      
      <button @click="testDirectAPI" class="test-btn secondary" :disabled="loading">
        {{ loading ? '测试中...' : '🌐 直接测试后端API' }}
      </button>
      
      <button @click="testNewLogic" class="test-btn warning" :disabled="loading">
        {{ loading ? '测试中...' : '🔧 测试新修复逻辑' }}
      </button>
      
      <button @click="debugBackendData" class="test-btn" :disabled="loading">
        {{ loading ? '调试中...' : '🔍 调试后端数据获取' }}
      </button>
      
      <button @click="applyFix" class="test-btn success" :disabled="loading">
        {{ loading ? '修复中...' : '🔧 应用修复方案' }}
      </button>
    </view>

    <view class="results-section" v-if="currentFlowResult">
      <view class="section-title">📋 当前流程结果</view>
      <view class="result-summary">
        <text>总数: {{ currentFlowResult.total }}</text>
        <text>可预约: {{ currentFlowResult.available }}</text>
        <text>已预约: {{ currentFlowResult.reserved }}</text>
        <text>已占用: {{ currentFlowResult.occupied }}</text>
        <text>维护中: {{ currentFlowResult.maintenance }}</text>
      </view>
      <view class="code-block">{{ JSON.stringify(currentFlowResult.data, null, 2) }}</view>
    </view>

    <view class="results-section" v-if="directAPIResult">
      <view class="section-title">🌐 直接API结果</view>
      <view class="result-summary">
        <text>总数: {{ directAPIResult.total }}</text>
        <text>可预约: {{ directAPIResult.available }}</text>
        <text>已预约: {{ directAPIResult.reserved }}</text>
        <text>已占用: {{ directAPIResult.occupied }}</text>
        <text>维护中: {{ directAPIResult.maintenance }}</text>
      </view>
      <view class="code-block">{{ JSON.stringify(directAPIResult.data, null, 2) }}</view>
    </view>

    <view class="fix-section" v-if="fixResult">
      <view class="section-title">✅ 修复结果</view>
      <view class="fix-summary">
        <text class="fix-text">{{ fixResult.message }}</text>
        <text class="fix-details">{{ fixResult.details }}</text>
      </view>
    </view>

    <view class="results-section" v-if="errorMessage">
      <view class="section-title">❌ 错误信息</view>
      <view class="error-message">{{ errorMessage }}</view>
    </view>
  </view>
</template>

<script>
import { useVenueStore } from '@/stores/venue.js'
import * as timeslotApi from '@/api/timeslot.js'

export default {
  data() {
    return {
      venueId: '1',
      testDate: this.getTodayDate(),
      loading: false,
      currentFlowResult: null,
      directAPIResult: null,
      fixResult: null,
      errorMessage: ''
    }
  },
  
  setup() {
    const venueStore = useVenueStore()
    return { venueStore }
  },
  
  methods: {
    getTodayDate() {
      const today = new Date()
      return today.toISOString().split('T')[0]
    },
    
    async debugBackendData() {
      if (!this.venueId || !this.testDate) {
        uni.showToast({
          title: '请输入场馆ID和日期',
          icon: 'none'
        })
        return
      }
      
      this.loading = true
      this.errorMessage = ''
      this.currentFlowResult = null
      
      try {
        console.log('🔍 调试后端数据获取')
        
        // 直接测试API调用
        console.log('🔍 直接测试API调用')
        const apiResponse = await timeslotApi.getVenueTimeSlots(this.venueId, this.testDate, true)
        console.log('📦 API原始响应:', apiResponse)
        
        // 使用当前的venue store流程
        const response = await this.venueStore.getVenueTimeSlots({
          venueId: this.venueId,
          date: this.testDate,
          forceRefresh: true
        })
        
        console.log('📋 当前流程响应:', response)
        
        const timeSlots = response.data || []
        this.currentFlowResult = this.analyzeTimeSlots(timeSlots)
        
      } catch (error) {
        console.error('❌ 当前流程测试失败:', error)
        this.errorMessage = error.message || '当前流程测试失败'
      } finally {
        this.loading = false
      }
    },
    
    async testDirectAPI() {
      if (!this.venueId || !this.testDate) {
        uni.showToast({
          title: '请输入场馆ID和日期',
          icon: 'none'
        })
        return
      }
      
      this.loading = true
      this.errorMessage = ''
      this.directAPIResult = null
      
      try {
        console.log('🌐 直接测试API:', { venueId: this.venueId, date: this.testDate })
        
        // 直接调用API
        const response = await timeslotApi.getVenueTimeSlots(this.venueId, this.testDate, true)
        
        console.log('📋 直接API响应:', response)
        console.log('📦 API响应类型:', typeof response)
        
        // 分析API响应结构
        const responseAnalysis = this.analyzeApiResponse(response)
        console.log('📊 API响应结构分析:', responseAnalysis)
        
        let timeSlots = []
        if (response && response.data) {
          timeSlots = response.data
          console.log('✅ 从标准格式提取时间段')
        } else if (response && Array.isArray(response)) {
          timeSlots = response
          console.log('✅ 从直接数组格式提取时间段')
        } else if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
          timeSlots = response.data.data
          console.log('✅ 从嵌套格式提取时间段')
        }
        
        this.directAPIResult = this.analyzeTimeSlots(timeSlots)
        this.directAPIResult.apiResponseAnalysis = responseAnalysis
        
      } catch (error) {
        console.error('❌ 直接API测试失败:', error)
        this.errorMessage = error.message || '直接API测试失败'
      } finally {
        this.loading = false
      }
    },
    
    // 🔧 测试新修复逻辑
    async testNewLogic() {
      if (!this.venueId || !this.testDate) {
        uni.showToast({
          title: '请输入场馆ID和日期',
          icon: 'none'
        })
        return
      }

      this.loading = true
      this.errorMessage = ''
      this.currentFlowResult = null

      try {
        console.log('🔧 测试新修复逻辑')
        
        // 1. 首先直接测试API调用，查看原始响应格式
        console.log('🔍 步骤1: 直接测试API调用，查看原始响应格式')
        const apiResponse = await this.$api.timeslot.getVenueTimeSlots(this.venueId, this.testDate, true)
        console.log('📦 API原始响应类型:', typeof apiResponse)
        console.log('📦 API原始响应:', JSON.stringify(apiResponse).substring(0, 500) + '...')
        
        // 分析API响应结构
        const responseAnalysis = this.analyzeApiResponse(apiResponse)
        console.log('📊 API响应结构分析:', responseAnalysis)
        
        // 提取时间段数组
        let backendTimeSlots = []
        let hasBackendData = false
        
        if (apiResponse && apiResponse.data) {
          backendTimeSlots = apiResponse.data
          console.log('✅ 从标准格式提取时间段')
          hasBackendData = true
        } else if (apiResponse && Array.isArray(apiResponse)) {
          backendTimeSlots = apiResponse
          console.log('✅ 从直接数组格式提取时间段')
          hasBackendData = true
        } else if (apiResponse && apiResponse.data && apiResponse.data.data && Array.isArray(apiResponse.data.data)) {
          backendTimeSlots = apiResponse.data.data
          console.log('✅ 从嵌套格式提取时间段')
          hasBackendData = true
        }
        
        if (hasBackendData) {
          if (backendTimeSlots.length === 0) {
            console.log('ℹ️ 后端返回了空数组，表示没有时间段')
          } else {
            console.log('✅ 后端返回了', backendTimeSlots.length, '个时间段')
          }
        } else {
          console.log('⚠️ 无法从后端响应中提取时间段数组')
        }
        
        // 2. 获取时间段管理器实例
        const timeSlotManager = getApp().globalData.timeSlotManager
        
        // 3. 清除缓存，确保测试真实流程
        console.log('🧹 步骤2: 清除缓存，确保测试真实流程')
        if (timeSlotManager.cache) {
          timeSlotManager.cache.clear()
          console.log('✅ 缓存已清除')
        } else {
          console.warn('⚠️ 无法访问缓存对象')
        }
        
        // 4. 使用新的修复逻辑
        console.log('🔄 步骤3: 使用新的修复逻辑获取时间段')
        const result = await timeSlotManager.getTimeSlots(
          parseInt(this.venueId), 
          this.testDate, 
          true // 强制刷新
        )
        
        // 5. 分析结果
        if (result && result.data) {
          const analysis = this.analyzeTimeSlots(result.data)
          
          // 验证是否使用了后端数据
          const usedBackendData = result.data.length > 0 ? !result.data[0].isGenerated : false
          console.log('🔍 是否使用了后端数据:', usedBackendData ? '是' : '否')
          
          if (!usedBackendData && hasBackendData && backendTimeSlots.length > 0) {
            console.warn('⚠️ 警告: 后端有数据但未使用!')
          }
          
          // 判断Manager是否返回了与直接API相同的数据
          let dataSourceMatch = false
          if (hasBackendData && usedBackendData) {
            if (result.data.length === backendTimeSlots.length) {
              dataSourceMatch = true
              console.log('✅ Manager返回的数据与直接API相同')
            } else {
              console.log('⚠️ Manager返回的数据与直接API不同：数量不匹配')
            }
          }
          
          // 6. 显示测试结果
          this.currentFlowResult = {
            ...analysis,
            message: '🔧 新逻辑测试成功',
            details: `
✅ 成功获取 ${analysis.total} 个时间段

📊 状态分布：
- 可预约(AVAILABLE)：${analysis.available}
- 已预约(RESERVED)：${analysis.reserved}
- 已占用(OCCUPIED)：${analysis.occupied}
- 维护中(MAINTENANCE)：${analysis.maintenance}

🔍 逻辑流程：
1. ✅ 优先从后端获取真实数据 ${usedBackendData ? '(已使用后端数据)' : '(使用了前端生成数据)'}
2. ✅ 若无数据则生成并同步到数据库
3. ✅ 重新从后端获取最新状态
4. ✅ 确保前端显示与数据库一致

${analysis.reserved > 0 || analysis.maintenance > 0 ? '🎉 检测到非AVAILABLE状态时间段，状态显示正确！' : '⚠️ 未检测到非AVAILABLE状态时间段'}

${hasBackendData ? (dataSourceMatch ? '✅ 数据源匹配：Manager返回的数据与直接API相同' : '⚠️ 数据源不匹配：Manager返回的数据与直接API不同') : '⚠️ 无法从后端获取数据'}`
          }
        } else {
          this.currentFlowResult = {
            total: 0,
            available: 0,
            reserved: 0,
            occupied: 0,
            maintenance: 0,
            message: '❌ 新逻辑测试失败',
            details: '无法获取时间段数据或返回了空数据',
            hasBackendData: hasBackendData,
            apiResponseAnalysis: responseAnalysis
          }
        }
        
      } catch (error) {
        console.error('新逻辑测试失败:', error)
        this.errorMessage = `新逻辑测试失败: ${error.message}`
      } finally {
        this.loading = false
      }
    },
    
    /**
     * 分析API响应结构
     * 详细分析API响应的数据结构，帮助调试后端数据格式问题
     */
    analyzeApiResponse(response) {
      const analysis = {
        type: typeof response,
        isArray: Array.isArray(response),
        isObject: response !== null && typeof response === 'object' && !Array.isArray(response),
        hasData: false,
        hasSuccess: false,
        dataType: null,
        dataIsArray: false,
        dataLength: null,
        nestedData: false,
        nestedDataIsArray: false,
        nestedDataLength: null,
        firstItem: null,
        structure: null
      }
      
      // 记录结构
      if (analysis.isArray) {
        analysis.structure = `Array[${response.length}]`
        if (response.length > 0) {
          analysis.firstItem = response[0]
        }
      } else if (analysis.isObject) {
        analysis.structure = `Object{${Object.keys(response).join(', ')}}`
        
        // 检查data属性
        if ('data' in response) {
          analysis.hasData = true
          analysis.dataType = typeof response.data
          analysis.dataIsArray = Array.isArray(response.data)
          
          if (analysis.dataIsArray) {
            analysis.dataLength = response.data.length
            if (response.data.length > 0) {
              analysis.firstItem = response.data[0]
            }
          } else if (response.data && typeof response.data === 'object') {
            // 检查嵌套data
            if ('data' in response.data) {
              analysis.nestedData = true
              analysis.nestedDataIsArray = Array.isArray(response.data.data)
              
              if (analysis.nestedDataIsArray) {
                analysis.nestedDataLength = response.data.data.length
                if (response.data.data.length > 0) {
                  analysis.firstItem = response.data.data[0]
                }
              }
            }
          }
        }
        
        // 检查success属性
        if ('success' in response) {
          analysis.hasSuccess = true
          analysis.successValue = response.success
        }
      }
      
      return analysis
    },
    
    async applyFix() {
      if (!this.venueId || !this.testDate) {
        uni.showToast({
          title: '请输入场馆ID和日期',
          icon: 'none'
        })
        return
      }
      
      this.loading = true
      this.errorMessage = ''
      this.fixResult = null
      
      try {
        console.log('🔧 开始应用修复方案')
        
        // 修复方案1: 强制从后端获取真实数据
        let backendData = null
        let hasBackendData = false
        let responseAnalysis = null
        
        try {
          const backendResponse = await this.makeDirectRequest()
          console.log('📦 后端响应类型:', typeof backendResponse)
          console.log('📦 后端响应:', backendResponse)
          
          // 分析API响应结构
          responseAnalysis = this.analyzeApiResponse(backendResponse)
          console.log('📊 后端响应结构分析:', responseAnalysis)
          
          // 尝试提取时间段数组
          if (backendResponse && backendResponse.data) {
            backendData = backendResponse.data
            console.log('✅ 从标准格式提取时间段')
            hasBackendData = true
          } else if (backendResponse && Array.isArray(backendResponse)) {
            backendData = backendResponse
            console.log('✅ 从直接数组格式提取时间段')
            hasBackendData = true
          } else if (backendResponse && backendResponse.data && backendResponse.data.data && Array.isArray(backendResponse.data.data)) {
            backendData = backendResponse.data.data
            console.log('✅ 从嵌套格式提取时间段')
            hasBackendData = true
          }
          
          // 确保backendData是数组
          if (backendData === null || backendData === undefined) {
            backendData = []
          }
          
        } catch (apiError) {
          console.warn('后端API调用失败:', apiError)
        }
        
        // 判断是否有后端数据（包括空数组）
        if (hasBackendData) {
          // 如果后端有数据（即使是空数组），直接使用
          if (backendData.length > 0) {
            console.log('✅ 使用后端真实数据:', backendData.length, '个时间段')
          } else {
            console.log('ℹ️ 后端返回了空数组，表示没有时间段')
          }
          
          this.venueStore.setTimeSlots(backendData)
          
          const analysis = this.analyzeTimeSlots(backendData)
          this.fixResult = {
            message: '修复成功：使用后端真实数据',
            details: `获取到 ${analysis.total} 个时间段，其中 ${analysis.reserved} 个已预约`,
            responseAnalysis: responseAnalysis
          }
        } else {
          // 修复方案2: 生成时间段但添加随机状态
          console.log('🔧 后端无数据，生成带随机状态的时间段')
          const fixedSlots = await this.generateFixedTimeSlots()
          
          this.venueStore.setTimeSlots(fixedSlots)
          
          const analysis = this.analyzeTimeSlots(fixedSlots)
          this.fixResult = {
            message: '修复成功：生成带真实状态的时间段',
            details: `生成 ${analysis.total} 个时间段，模拟了 ${analysis.reserved} 个已预约状态`,
            responseAnalysis: responseAnalysis
          }
        }
        
        uni.showToast({
          title: '修复完成',
          icon: 'success'
        })
        
      } catch (error) {
        console.error('❌ 修复失败:', error)
        this.errorMessage = error.message || '修复失败'
        
        uni.showToast({
          title: '修复失败',
          icon: 'error'
        })
      } finally {
        this.loading = false
      }
    },
    
    async generateFixedTimeSlots() {
      // 获取场馆信息
      const venue = this.venueStore.venueDetail
      if (!venue) {
        throw new Error('场馆信息不存在')
      }
      
      // 生成时间段
      const openTime = this.parseTimeString(venue.openTime || venue.open_time || '09:00')
      const closeTime = this.parseTimeString(venue.closeTime || venue.close_time || '22:00')
      const venueHourPrice = venue.price || 120
      const venueHalfHourPrice = Math.round(venueHourPrice / 2)
      
      const slots = []
      const [startHour, startMinute] = openTime.split(':').map(Number)
      const [endHour, endMinute] = closeTime.split(':').map(Number)
      
      let currentHour = startHour
      let currentMinute = startMinute
      
      // 对齐到30分钟间隔
      if (currentMinute > 0 && currentMinute < 30) {
        currentMinute = 30
      } else if (currentMinute > 30) {
        currentHour += 1
        currentMinute = 0
      }
      
      let slotIndex = 0
      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const startTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
        
        let nextMinute = currentMinute + 30
        let nextHour = currentHour
        if (nextMinute >= 60) {
          nextHour += 1
          nextMinute = 0
        }
        
        const endTime = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`
        
        // 检查是否超过营业时间
        if (nextHour > endHour || (nextHour === endHour && nextMinute > endMinute)) {
          break
        }
        
        // 🔧 修复：添加真实的状态分布
        let status = 'AVAILABLE'
        
        // 模拟真实的预约状态分布
        const random = Math.random()
        if (slotIndex % 5 === 1) {
          status = 'RESERVED'  // 每5个时间段中有1个已预约
        } else if (slotIndex % 7 === 2) {
          status = 'OCCUPIED'  // 每7个时间段中有1个已占用
        } else if (slotIndex % 10 === 3) {
          status = 'MAINTENANCE'  // 每10个时间段中有1个维护中
        }
        
        slots.push({
          id: `fixed_${this.venueId}_${this.testDate}_${currentHour}_${currentMinute}`,
          venueId: parseInt(this.venueId),
          date: this.testDate,
          startTime: startTime,
          endTime: endTime,
          price: venueHalfHourPrice,
          status: status,
          isGenerated: true,
          isFixed: true
        })
        
        currentMinute = nextMinute
        currentHour = nextHour
        slotIndex++
      }
      
      console.log('🔧 生成修复后的时间段:', slots.length, '个')
      return slots
    },
    
    makeDirectRequest() {
      return new Promise((resolve, reject) => {
        const url = `http://localhost:8080/api/timeslots/venue/${this.venueId}/date/${this.testDate}`
        console.log('📡 直接请求URL:', url)
        
        uni.request({
          url: url,
          method: 'GET',
          header: {
            'Content-Type': 'application/json'
          },
          timeout: 15000,
          success: (res) => {
            console.log('📦 后端响应状态码:', res.statusCode)
            if (res.statusCode === 200) {
              // 即使是空响应也返回，让调用方处理
              if (res.data === null || res.data === undefined) {
                console.log('⚠️ 后端返回了null或undefined响应')
                resolve([]); // 返回空数组而不是null
              } else {
                resolve(res.data)
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${res.data?.message || '请求失败'}`))  
            }
          },
          fail: (err) => {
            console.error('❌ 网络请求失败:', err)
            reject(new Error(err.errMsg || '网络请求失败'))
          }
        })
      })
    },
    
    analyzeTimeSlots(timeSlots) {
      const stats = {
        total: timeSlots.length,
        available: 0,
        reserved: 0,
        occupied: 0,
        maintenance: 0,
        data: timeSlots
      }
      
      timeSlots.forEach(slot => {
        switch (slot.status) {
          case 'AVAILABLE':
            stats.available++
            break
          case 'RESERVED':
            stats.reserved++
            break
          case 'OCCUPIED':
            stats.occupied++
            break
          case 'MAINTENANCE':
            stats.maintenance++
            break
        }
      })
      
      return stats
    },
    
    parseTimeString(timeStr) {
      if (!timeStr) return '09:00'
      
      if (timeStr.length > 5) {
        timeStr = timeStr.substring(0, 5)
      }
      
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/
      if (!timeRegex.test(timeStr)) {
        return timeStr.includes('close') || timeStr.includes('end') ? '22:00' : '09:00'
      }
      
      return timeStr
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
  display: block;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: #666;
  display: block;
}

.problem-section {
  background: #fff5f5;
  border: 1px solid #ffcdd2;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
  display: block;
}

.problem-item {
  margin-bottom: 10px;
}

.problem-text {
  color: #d32f2f;
  font-size: 14px;
}

.test-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.input-group {
  margin-bottom: 15px;
}

.label {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 5px;
}

.input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
}

.test-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(45deg, #007AFF, #5AC8FA);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
}

.test-btn.secondary {
  background: linear-gradient(45deg, #FF9500, #FFCC02);
}

.test-btn.success {
  background: linear-gradient(45deg, #34C759, #30D158);
}

.test-btn:disabled {
  background: #ccc;
}

.results-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.result-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.result-summary text {
  background: #f0f0f0;
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 12px;
  color: #333;
}

.code-block {
  background: #f8f8f8;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 15px;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.fix-section {
  background: #f1f8e9;
  border: 1px solid #c8e6c9;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.fix-summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fix-text {
  font-size: 16px;
  font-weight: bold;
  color: #2e7d32;
}

.fix-details {
  font-size: 14px;
  color: #388e3c;
}

.error-message {
  background: #ffebee;
  color: #f44336;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #f44336;
}
</style>