/**
 * 统一时间段管理工具
 * 简化时间段生成、获取、更新、同步的复杂逻辑
 */

import * as timeslotApi from '@/api/timeslot.js'
import timeSlotOptimizer from './timeslot-optimizer.js'

/**
 * 🚀 优化版时间段管理器类
 * 集成了预加载、增量更新、实时同步等优化功能
 */
export class TimeSlotManager {
  constructor(venueStore) {
    this.venueStore = venueStore
    this.cache = new Map() // 缓存时间段数据
    this.optimizer = timeSlotOptimizer // 🔥 集成优化器
    this.isOptimized = true // 🔥 启用优化模式
  }

  /**
   * 🚀 优化版获取时间段数据
   * 集成优化器，支持预加载、增量更新等高级功能
   * @param {number} venueId 场馆ID
   * @param {string} date 日期
   * @param {boolean} forceRefresh 是否强制刷新
   * @param {object} options 选项参数
   */
  async getTimeSlots(venueId, date, forceRefresh = false, options = {}) {
    try {

      // 🔥 优化模式：使用优化器加载
      if (this.isOptimized && this.optimizer) {
        try {
          const optimizedData = await this.optimizer.loadTimeSlots(venueId, date, { forceRefresh, ...options })
          if (optimizedData && optimizedData.timeSlots) {
            
            // 触发预加载相关时间段
            this.optimizer.preloadRelatedTimeSlots(venueId, date).catch(err => {
            })
            
            this.venueStore.setTimeSlots(optimizedData.timeSlots)
            return { data: optimizedData.timeSlots }
          }
        } catch (optimizerError) {
        }
      }

      // 🔄 传统模式：原有逻辑作为降级方案
      const cacheKey = `${venueId}_${date}`

      // 如果不是强制刷新，先检查缓存
      if (!forceRefresh && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)
        this.venueStore.setTimeSlots(cached)
        return { data: cached }
      }

      // 从后端获取真实数据
      const backendData = await this.getFromBackend(venueId, date, forceRefresh, options)

      // 增强的数据验证 - 确保backendData是数组
      if (backendData && Array.isArray(backendData)) {
        
        // 即使是空数组，也认为后端有数据，只是当前没有时间段
        if (backendData.length === 0) {
          
          // 🔥 修复：检查日期是否为未来日期，如果是则提示可能的原因
          
          // 使用更准确的日期比较方法
          const selectedDateStr = date // 格式: 2025-08-07
          const todayStr = new Date().toISOString().split('T')[0] // 格式: 2025-08-07
          
          
          if (selectedDateStr > todayStr) {
          } else if (selectedDateStr === todayStr) {
          } else {
          }
          // 缓存并返回空数组
          this.cache.set(cacheKey, backendData)
          this.venueStore.setTimeSlots(backendData)
          return { 
            data: backendData,
            message: '该日期暂无可预约时间段，请选择其他日期或联系场馆咨询'
          }
        }
        
        // 验证数据状态分布
        const statusCounts = this.analyzeSlotStatus(backendData)
        
        // 增强的数据质量验证 - 确保每个时间段都有必要的字段
        const validSlots = backendData.filter(slot => {
          // 必须有时间段对象且包含开始和结束时间
          return slot && (
            // 标准格式
            (slot.startTime && slot.endTime) ||
            // 下划线格式
            (slot.start_time && slot.end_time) ||
            // 简化格式
            (slot.start && slot.end)
          )
        })
        
        // 输出数据质量验证结果
        if (validSlots.length === backendData.length) {
        } else {
          // 输出无效数据示例
          if (validSlots.length < backendData.length) {
            const invalidExample = backendData.find(slot => !(
              (slot && slot.startTime && slot.endTime) ||
              (slot && slot.start_time && slot.end_time) ||
              (slot && slot.start && slot.end)
            ))
          }
        }
        
        // 即使有部分无效数据，只要有有效数据就使用
        if (validSlots.length > 0) {
          // 缓存并返回有效的后端数据
          this.cache.set(cacheKey, validSlots)
          this.venueStore.setTimeSlots(validSlots)
          return { data: validSlots }
        } else {
        }
      } else if (backendData === null) {
      } else {
      }

      // 🔥 修复：不自动生成时间段，避免覆盖已预约状态
      
      // 返回空数组和友好提示信息
      this.venueStore.setTimeSlots([])
      return { 
        data: [], 
        message: '该日期暂无可预约时间段，请选择其他日期或联系场馆咨询',
        suggestion: '您可以尝试刷新页面或选择其他日期'
      }

    } catch (error) {
      console.error('[TimeSlotManager] ❌ 获取时间段失败:', error)
      // 错误时也不生成默认时间段
      this.venueStore.setTimeSlots([])
      return { 
        data: [], 
        error: error.message,
        message: '获取时间段失败，请尝试刷新页面或联系客服',
        suggestion: '您可以点击刷新按钮重新获取数据'
      }
    }
  }

  /**
   * 从后端获取时间段 - 增强版本
   * 能够处理多种后端响应格式，更宽松的数据验证
   */
  async getFromBackend(venueId, date, forceRefresh, options = {}) {
    try {
      
      // 使用强制刷新模式获取最新数据，传递loading参数
      // 🔥 修复：确保loading参数正确传递，避免与页面级loading冲突
      const apiOptions = {
        loading: false, // 默认禁用API层loading以避免与页面级loading冲突
        ...options
      }
      const response = await timeslotApi.getVenueTimeSlots(venueId, date, forceRefresh, apiOptions)
      
      if (response !== null && typeof response === 'object') {
          Array.isArray(response) 
            ? `数组[${response.length}]` 
            : `对象{${Object.keys(response).join(', ')}}`
        )
      } else {
      }
      
      // 递归查找数组数据的函数 - 能处理各种嵌套格式
      function findArrayData(obj, depth = 0, path = 'response') {
        // 防止无限递归
        if (depth > 5) return null
        
        // 直接是数组
        if (Array.isArray(obj)) {
          return obj
        }
        
        // 空值检查
        if (!obj || typeof obj !== 'object') {
          return null
        }
        
        // 标准格式: {data: Array}
        if (obj.data && Array.isArray(obj.data)) {
          return obj.data
        }
        
        // 嵌套格式: {data: {data: Array}}
        if (obj.data && typeof obj.data === 'object' && obj.data.data && Array.isArray(obj.data.data)) {
          return obj.data.data
        }
        
        // API成功格式: {success: true, data: Array}
        if (obj.success === true && obj.data && Array.isArray(obj.data)) {
          return obj.data
        }
        
        // 递归查找所有对象属性
        for (const key in obj) {
          if (obj[key] && typeof obj[key] === 'object') {
            const result = findArrayData(obj[key], depth + 1, `${path}.${key}`)
            if (result) return result
          }
        }
        
        return null
      }
      
      // 处理空响应的情况
      if (response === null || response === undefined) {
        return []
      }
      
      // 处理空数组的情况 - 这是有效的响应，表示没有时间段
      if (Array.isArray(response) && response.length === 0) {
        return []
      }
      
      // 处理标准空数据响应
      if (response && response.data === null) {
        return []
      }
      
      if (response && Array.isArray(response.data) && response.data.length === 0) {
        return []
      }
      
      // 尝试从响应中提取时间段数组
      const timeSlots = findArrayData(response)
      
      // 找到数组数据
      if (timeSlots && Array.isArray(timeSlots)) {
        // 即使是空数组也返回，表示后端确实没有数据
        if (timeSlots.length === 0) {
          return timeSlots
        }
        
        
        // 验证数据结构 - 检查第一个时间段
        const firstSlot = timeSlots[0]
        
        // 更宽松的数据验证 - 只要有基本的时间字段就认为是有效数据
        const hasTimeFields = firstSlot && (
          firstSlot.startTime || 
          firstSlot.start_time || 
          firstSlot.start || 
          (firstSlot.time && typeof firstSlot.time === 'string')
        )
        
        if (hasTimeFields) {
          return timeSlots
        } else {
          return timeSlots
        }
      }
      
      // 如果无法提取数组，但响应不为空，返回空数组而不是null
      // 这表示后端有响应，只是格式不符合预期
      return []
      
    } catch (error) {
      console.error('[TimeSlotManager] ❌ 后端获取失败:', error)
      // 发生错误时返回null，表示需要生成数据
      return null
    }
  }

  /**
   * 重试从后端获取时间段（处理事务延迟）
   */
  async retryGetFromBackend(venueId, date, maxRetries = 3, delayMs = 500) {
    for (let i = 0; i < maxRetries; i++) {

      // 等待一段时间
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }

      const slots = await this.getFromBackend(venueId, date, true)
      if (slots && slots.length > 0) {
        return slots
      }
    }

    return null
  }

  /**
   * 🔧 新方法：生成、同步到数据库、然后重新获取真实数据
   * 按照用户要求的逻辑：生成 -> 同步到数据库 -> 从后端获取最新状态
   */
  async generateSyncAndRefetch(venueId, date) {
    try {

      // 获取场馆信息
      const venue = this.venueStore.venueDetail
      if (!venue) {
        console.error('[TimeSlotManager] ❌ 场馆信息不存在')
        return null
      }

      // 第一步：同步到后端数据库（使用生成API）
      await this.syncToBackend(venueId, date, [])

      // 第二步：等待一小段时间确保数据库事务完成
      await new Promise(resolve => setTimeout(resolve, 1500))

      // 第三步：从后端重新获取真实数据
      const realData = await this.getFromBackend(venueId, date, true)

      if (realData && realData.length > 0) {
        
        // 验证数据状态
        const statusCounts = this.analyzeSlotStatus(realData)
        
        return realData
      }

      // 第四步：如果还是没有数据，重试获取
      const retryData = await this.retryGetFromBackend(venueId, date, 3, 1000)
      
      if (retryData && retryData.length > 0) {
        return retryData
      }

      return null

    } catch (error) {
      console.error('[TimeSlotManager] ❌ 生成-同步-重新获取流程失败:', error)
      return null
    }
  }

  /**
   * 生成时间段并同步到后端（保留原有方法，用于其他场景）
   */
  async generateAndSync(venueId, date) {
    try {

      // 获取场馆信息
      const venue = this.venueStore.venueDetail
      if (!venue) {
        console.error('[TimeSlotManager] 场馆信息不存在')
        return null
      }

      // 生成前端时间段
      const frontendSlots = this.generateFrontendSlots(venueId, date, venue)
      if (!frontendSlots || frontendSlots.length === 0) {
        console.error('[TimeSlotManager] 前端生成失败')
        return null
      }

      // 🚀 优化策略：立即返回前端数据，后台异步同步

      // 后台异步同步到后端（不阻塞用户体验）
      this.asyncSyncToBackend(venueId, date, frontendSlots)

      // 立即返回前端生成的数据
      return frontendSlots

    } catch (error) {
      console.error('[TimeSlotManager] 生成并同步失败:', error)
      return null
    }
  }

  /**
   * 异步同步到后端（不阻塞用户体验）
   */
  async asyncSyncToBackend(venueId, date, frontendSlots) {
    try {

      // 延迟一小段时间，避免与前端操作冲突
      setTimeout(async () => {
        try {
          await this.syncToBackend(venueId, date, frontendSlots)

          // 同步成功后，更新缓存标记
          const cacheKey = `${venueId}_${date}`
          this.cache.set(`${cacheKey}_synced`, true)

        } catch (syncError) {
        }
      }, 1000) // 延迟1秒执行

    } catch (error) {
    }
  }

  /**
   * 🔧 分析时间段状态分布
   */
  analyzeSlotStatus(slots) {
    const statusCounts = {
      AVAILABLE: 0,
      RESERVED: 0,
      MAINTENANCE: 0,
      total: slots.length
    }

    slots.forEach(slot => {
      if (slot.status) {
        statusCounts[slot.status] = (statusCounts[slot.status] || 0) + 1
      }
    })

    return statusCounts
   }

   /**
    * 🔧 重试从后端获取数据
    */
   async retryGetFromBackend(venueId, date, maxRetries = 3, delayMs = 1000) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         
         // 等待指定时间
         if (i > 0) {
           await new Promise(resolve => setTimeout(resolve, delayMs))
         }
         
         const data = await this.getFromBackend(venueId, date, true)
         if (data && data.length > 0) {
           return data
         }
         
       } catch (error) {
         console.error(`[TimeSlotManager] ❌ 重试第${i + 1}次失败:`, error)
       }
     }
     
     return null
   }

   /**
    * 生成前端时间段
    */
  generateFrontendSlots(venueId, date, venue) {
    
    // 解析营业时间
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

      slots.push({
        id: `frontend_${venueId}_${date}_${currentHour}_${currentMinute}`,
        venueId: parseInt(venueId),
        date: date,
        startTime: startTime,
        endTime: endTime,
        price: venueHalfHourPrice,
        status: 'AVAILABLE',
        isGenerated: true
      })

      currentMinute = nextMinute
      currentHour = nextHour
    }

    return slots
  }

  /**
   * 同步到后端
   */
  async syncToBackend(venueId, date, slots) {
    // 直接使用生成API，因为批量同步API暂未实现
    // 这样可以避免404错误和不必要的重试
    try {
      await timeslotApi.generateTimeSlots(venueId, date)
    } catch (generateError) {
      throw generateError
    }

    // 如果将来实现了批量同步API，可以使用以下代码：
    /*
    try {
      // 优先尝试批量同步API
      await timeslotApi.syncFrontendTimeSlots(venueId, date, slots)
    } catch (batchError) {

      // 如果批量同步失败，尝试生成API
      await timeslotApi.generateTimeSlots(venueId, date)
    }
    */
  }

  /**
   * 刷新时间段状态 - 增强版
   */
  async refreshStatus(venueId, date) {
    const cacheKey = `${venueId}_${date}`
    
    try {
      
      // 🧹 第一步：全面清除缓存
      this.clearCache(venueId, date)
      
      // 🔄 第二步：多重刷新策略
      let finalResult = null
      
      // 策略1: 调用专用刷新API
      try {
        const refreshResult = await timeslotApi.refreshTimeSlotStatus(venueId, date)
        
        
        if (refreshResult && refreshResult.success && refreshResult.data) {
          finalResult = refreshResult.data
        } else {
        }
      } catch (refreshError) {
      }
      
      // 策略2: 强制从后端重新获取
      if (!finalResult || finalResult.length === 0) {
        finalResult = await this.getFromBackend(venueId, date, true)
      }
      
      // 策略3: 重试机制（处理事务延迟）
      if (!finalResult || finalResult.length === 0) {
        finalResult = await this.retryGetFromBackend(venueId, date, 3, 1000)
      }
      
      // 🔄 第三步：验证和缓存更新
      if (finalResult && finalResult.length > 0) {
        this.cache.set(cacheKey, finalResult)
        
        // 验证状态更新
        const reservedCount = finalResult.filter(slot => slot.status === 'RESERVED').length
        
        return { data: finalResult }
      } else {
        return { data: [] }
      }
      
    } catch (error) {
      console.error('[TimeSlotManager] ❌ 刷新状态失败:', error)
      
      // 🔄 错误恢复：尝试基础获取
      try {
        const recoveryResult = await this.getFromBackend(venueId, date, true)
        if (recoveryResult) {
          return { data: recoveryResult }
        }
      } catch (recoveryError) {
        console.error('[TimeSlotManager] ❌ 错误恢复也失败:', recoveryError)
      }
      
      throw error
    }
  }

  /**
   * 清除缓存 - 增强版
   */
  clearCache(venueId = null, date = null) {
    if (venueId && date) {
      const cacheKey = `${venueId}_${date}`
      this.cache.delete(cacheKey)
    } else {
      this.cache.clear()
    }
  }

  /**
   * 🚀 刷新时间段状态（优化版）
   * @param {string} venueId 场馆ID
   * @param {string} date 日期
   * @param {string} timeSlotId 时间段ID（可选）
   */
  async refreshTimeSlotStatus(venueId, date, timeSlotId = null) {
    try {
      
      if (this.isOptimized && this.optimizer) {
        // 使用优化器刷新
        const result = await this.optimizer.refreshTimeSlotStatus(venueId, date, timeSlotId)
        if (result && result.timeSlots) {
          this.venueStore.setTimeSlots(result.timeSlots)
          return result.timeSlots
        }
      }
      
      // 降级到传统刷新
      return this.getTimeSlots(venueId, date, true)
    } catch (error) {
      console.error('[TimeSlotManager] 刷新时间段状态失败:', error)
      throw error
    }
  }

  /**
   * 🚀 注册实时同步回调
   * @param {string} venueId 场馆ID
   * @param {Function} callback 回调函数
   */
  onTimeSlotSync(venueId, callback) {
    if (this.isOptimized && this.optimizer) {
      this.optimizer.onTimeSlotSync(venueId, callback)
    }
  }

  /**
   * 🚀 取消实时同步回调
   * @param {string} venueId 场馆ID
   * @param {Function} callback 回调函数
   */
  offTimeSlotSync(venueId, callback) {
    if (this.isOptimized && this.optimizer) {
      this.optimizer.offTimeSlotSync(venueId, callback)
    }
  }

  /**
   * 🚀 预加载相关时间段
   * @param {string} venueId 场馆ID
   * @param {string} currentDate 当前日期
   */
  async preloadRelatedTimeSlots(venueId, currentDate) {
    if (this.isOptimized && this.optimizer) {
      return this.optimizer.preloadRelatedTimeSlots(venueId, currentDate)
    }
  }

  /**
   * 🚀 获取优化器统计信息
   */
  getOptimizerStats() {
    if (this.isOptimized && this.optimizer) {
      return this.optimizer.getStats()
    }
    return null
  }

  /**
   * 🚀 切换优化模式
   * @param {boolean} enabled 是否启用优化
   */
  setOptimizationEnabled(enabled) {
    this.isOptimized = enabled
  }

  /**
   * 重试获取后端数据
   */
  async retryGetFromBackend(venueId, date, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        
        // 等待一段时间再重试（处理数据库事务延迟）
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
        
        const result = await this.getFromBackend(venueId, date, true)
        if (result && result.length > 0) {
          return result
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error
        }
      }
    }
    
    return null
  }
  
  /**
   * 检查指定场馆和日期是否有后端数据
   * @param {number} venueId 场馆ID
   * @param {string} date 日期
   * @returns {boolean} 是否有后端数据
   */
  hasBackendData(venueId, date) {
    try {
      
      const cacheKey = `${venueId}_${date}`
      
      // 检查缓存中的数据
      if (this.cache.has(cacheKey)) {
        const cachedData = this.cache.get(cacheKey)
        
        // 检查数据是否来自后端（不是前端生成的）
        if (Array.isArray(cachedData) && cachedData.length > 0) {
          // 如果第一个时间段没有isGenerated标记或为false，则认为是后端数据
          const isBackendData = !cachedData[0].isGenerated
          return isBackendData
        } else if (Array.isArray(cachedData) && cachedData.length === 0) {
          // 空数组也视为有后端数据（表示后端明确返回了空数组）
          return true
        }
      }
      
      // 如果没有缓存或无法判断，返回false
      return false
    } catch (error) {
      console.error('[TimeSlotManager] 检查后端数据失败:', error)
      return false
    }
  }

  /**
   * 解析时间字符串
   */
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

/**
 * 创建时间段管理器实例
 */
export function createTimeSlotManager(venueStore) {
  return new TimeSlotManager(venueStore)
}
