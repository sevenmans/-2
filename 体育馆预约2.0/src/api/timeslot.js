import { get, post, patch } from '../utils/request.js'
import { SLOT_STATUS, CACHE_CONFIG, REQUEST_CONFIG } from '../utils/timeslot-constants.js'
import cacheManager from '../utils/cache-manager.js'
import config from '../config/index.js'

// 标准化API响应格式
function standardizeResponse(response) {
  if (config.debug) console.debug('[TimeslotAPI] 标准化响应数据')
  
  let data = []
  let success = false
  let message = '请求失败'
  
  try {
    // 处理各种可能的响应格式
    if (response?.success && response?.data) {
      // 格式1: { success: true, data: [...], message: '...' }
      data = Array.isArray(response.data) ? response.data : []
      success = true
      message = response.message || '请求成功'
    } else if (response?.data?.success && response?.data?.data) {
      // 格式2: { data: { success: true, data: [...], message: '...' } }
      data = Array.isArray(response.data.data) ? response.data.data : []
      success = true
      message = response.data.message || '请求成功'
    } else if (Array.isArray(response)) {
      // 格式3: 直接返回数组
      data = response
      success = true
      message = '请求成功'
    } else if (response?.data && Array.isArray(response.data)) {
      // 格式4: { data: [...] }
      data = response.data
      success = true
      message = response.message || '请求成功'
    } else if (response?.data) {
      // 格式5: 其他包含data的格式
      data = Array.isArray(response.data) ? response.data : []
      success = !!response.data
      message = response.message || (success ? '请求成功' : '数据格式错误')
    }
    
    // 验证数据格式
    if (success && data.length > 0) {
      data = validateTimeSlotData(data)
    }
    
  } catch (error) {
    console.error('[API] 响应标准化失败:', error)
    success = false
    message = '数据处理失败'
    data = []
  }
  
  const result = { data, success, message }
  if (config.debug) console.debug('[TimeslotAPI] 标准化完成:', { success: result.success, count: result.data.length })
  return result
}

// 验证和标准化时间段数据
function validateTimeSlotData(data) {
  if (config.debug) console.debug('[TimeslotAPI] 验证时间段数据')
  
  if (!Array.isArray(data)) {
    console.warn('[API] 时间段数据不是数组格式')
    return []
  }
  
  return data.map(slot => {
    // 确保每个时间段都有必要的字段
    const standardSlot = {
      id: slot.id || slot.timeSlotId || slot.slotId,
      venueId: slot.venueId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      price: slot.price || 0,
      status: slot.status || SLOT_STATUS.AVAILABLE,
      // 🎯 关键修复：正确处理拼场状态
      isBooked: slot.isBooked ||
                slot.status === SLOT_STATUS.BOOKED ||
                slot.status === SLOT_STATUS.SHARING ||
                slot.status === SLOT_STATUS.RESERVED ||
                slot.status === 'BOOKED' ||
                slot.status === 'SHARING' ||
                slot.status === 'RESERVED',
      isAvailable: slot.isAvailable !== false &&
                   slot.status === SLOT_STATUS.AVAILABLE &&
                   slot.status !== SLOT_STATUS.BOOKED &&
                   slot.status !== SLOT_STATUS.SHARING &&
                   slot.status !== SLOT_STATUS.RESERVED &&
                   slot.status !== 'BOOKED' &&
                   slot.status !== 'SHARING' &&
                   slot.status !== 'RESERVED'
    }
    
    // 移除undefined字段
    Object.keys(standardSlot).forEach(key => {
      if (standardSlot[key] === undefined) {
        delete standardSlot[key]
      }
    })
    
    return standardSlot
  }).filter(slot => slot.id && slot.startTime && slot.endTime) // 过滤无效数据
}

// 获取场馆指定日期的时间段
export function getVenueTimeSlots(venueId, date, options = {}) {
  const {
    forceRefresh = false,
    useCache = true,
    loading = true,
    _t = null, // 🔥 接收时间戳参数
    ...otherOptions
  } = options

  const cacheKey = cacheManager.generateTimeSlotKey(venueId, date)

  // 如果不强制刷新且允许使用缓存，先尝试从缓存获取
  if (!forceRefresh && useCache) {
    const cached = cacheManager.get(cacheKey)
    if (cached) {
      if (config.debug) console.debug('[TimeslotAPI] 命中缓存')
      return Promise.resolve(cached)
    }
  }

  const requestOptions = {
    cache: useCache && !forceRefresh,
    cacheTTL: forceRefresh ? 0 : CACHE_CONFIG.DEFAULT_TTL,
    loading,
    ...REQUEST_CONFIG.DEFAULT_OPTIONS,
    ...otherOptions
  }

  // 🔥 修复：确保时间戳参数被正确传递
  const params = forceRefresh ? {
    _t: _t || Date.now(), // 使用传入的时间戳或生成新的
    _nocache: 1
  } : {}

  if (forceRefresh) {
    requestOptions.headers = {
      ...requestOptions.headers,
      ...REQUEST_CONFIG.NO_CACHE_HEADERS
    }
    // 清除相关缓存
    cacheManager.delete(cacheKey)
  }

  if (config.debug) console.debug('[TimeslotAPI] 获取时间段', { venueId, date, forceRefresh })

  return get(`/timeslots/venue/${venueId}/date/${date}`, params, requestOptions)
    .then(response => {
      // 标准化响应格式
      const standardizedResponse = standardizeResponse(response)
      
      // 缓存成功的响应
      if (standardizedResponse.success && standardizedResponse.data.length > 0 && useCache) {
        cacheManager.set(cacheKey, standardizedResponse, CACHE_CONFIG.DEFAULT_TTL)
      }
      
      return standardizedResponse
    })
    .catch(error => {
      console.error('[API] 获取时间段失败:', error)
      return {
        data: [],
        success: false,
        message: error.message || '获取时间段失败'
      }
    })
}

// 获取场馆指定日期的可用时间段
export function getAvailableTimeSlots(venueId, date, options = {}) {
  if (config.debug) console.debug('[TimeslotAPI] 获取可用时间段', { venueId, date })
  
  const requestOptions = {
    ...REQUEST_CONFIG.DEFAULT_OPTIONS,
    ...options
  }
  
  return get(`/timeslots/venue/${venueId}/date/${date}/available`, {}, requestOptions)
    .then(response => {
      // 标准化响应格式
      const standardizedResponse = standardizeResponse(response)
      return standardizedResponse
    })
    .catch(error => {
      console.error('[API] 获取可用时间段失败:', error)
      return {
        data: [],
        success: false,
        message: error.message || '获取可用时间段失败'
      }
    })
}

// 检查时间段是否可预约
export function checkTimeSlotAvailability(venueId, date, startTime, endTime) {
  if (config.debug) console.debug('[TimeslotAPI] 检查时间段可用性', { venueId, date, startTime, endTime })
  
  const params = {
    venueId,
    date,
    startTime,
    endTime
  }
  
  return get('/timeslots/check-availability', params)
    .then(response => {
      // 对于可用性检查，返回简化的标准格式
      const result = {
        available: false,
        success: false,
        message: '检查失败'
      }
      
      try {
        if (response?.success) {
          result.available = !!response.data?.available
          result.success = true
          result.message = response.message || '检查完成'
        } else if (response?.data?.success) {
          result.available = !!response.data.data?.available
          result.success = true
          result.message = response.data.message || '检查完成'
        } else if (response?.available !== undefined) {
          result.available = !!response.available
          result.success = true
          result.message = '检查完成'
        }
      } catch (error) {
        console.error('[API] 可用性检查响应处理失败:', error)
      }
      
      return result
    })
    .catch(error => {
      console.error('[API] 检查时间段可用性失败:', error)
      return {
        available: false,
        success: false,
        message: error.message || '检查时间段可用性失败'
      }
    })
}

// 为场馆生成指定日期的时间段（仅限管理员）
export function generateTimeSlots(venueId, date, config = {}) {
  if (config.debug) console.debug('[TimeslotAPI] 生成时间段', { venueId, date })
  
  const data = {
    venueId,
    date,
    ...config
  }
  
  return post('/timeslots/generate', data)
    .then(response => {
      // 标准化响应格式
      const standardizedResponse = standardizeResponse(response)
      return standardizedResponse
    })
    .catch(error => {
      console.error('[API] 生成时间段失败:', error)
      return {
        data: [],
        success: false,
        message: error.message || '生成时间段失败'
      }
    })
}

// 批量创建时间段（前端生成后同步到后端）
export function batchCreateTimeSlots(venueId, date, timeSlots) {
  if (config.debug) console.debug('[TimeslotAPI] 批量创建时间段', { venueId, date, count: timeSlots.length })
  
  return post(`/timeslots/venue/${venueId}/date/${date}/batch-create`, {
    timeSlots: timeSlots
  })
    .then(response => {
      // 标准化响应格式
      const standardizedResponse = standardizeResponse(response)
      return standardizedResponse
    })
    .catch(error => {
      console.error('[API] 批量创建时间段失败:', error)
      return {
        data: [],
        success: false,
        message: error.message || '批量创建时间段失败'
      }
    })
}

// 同步前端生成的时间段到后端
export function syncFrontendTimeSlots(venueId, date, timeSlots) {
  console.log('[API] 同步前端时间段到后端:', { venueId, date, slotsCount: timeSlots.length })

  // 转换前端时间段格式为后端需要的格式
  const backendSlots = timeSlots.map(slot => ({
    venueId: parseInt(venueId),
    date: date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    price: slot.price,
    status: SLOT_STATUS.AVAILABLE
  }))

  return batchCreateTimeSlots(venueId, date, backendSlots)
    .then(response => {
      // batchCreateTimeSlots已经返回标准化格式，直接返回
      return response
    })
    .catch(error => {
      console.error('[API] 同步前端时间段失败:', error)
      return {
        data: [],
        success: false,
        message: error.message || '同步前端时间段失败'
      }
    })
}

// 批量生成未来一周的时间段（仅限管理员）
export function generateWeekTimeSlots(venueId) {
  if (config.debug) console.debug('[TimeslotAPI] 生成未来一周时间段', { venueId })
  
  return post(`/timeslots/venue/${venueId}/generate-week`)
    .then(response => {
      // 标准化响应格式
      const standardizedResponse = standardizeResponse(response)
      return standardizedResponse
    })
    .catch(error => {
      console.error('[API] 生成未来一周时间段失败:', error)
      return {
        data: [],
        success: false,
        message: error.message || '生成未来一周时间段失败'
      }
    })
}

// 更新时间段状态
export function updateTimeSlotStatus(timeSlotId, status, options = {}) {
  if (config.debug) console.debug('[TimeslotAPI] 更新时间段状态', { timeSlotId, status })
  
  const data = {
    status,
    ...options
  }
  
  return patch(`/timeslots/${timeSlotId}/status`, data)
    .then(response => {
      // 对于状态更新，返回简化的标准格式
      const result = {
        success: false,
        message: '更新失败',
        data: null
      }
      
      try {
        if (response?.success) {
          result.success = true
          result.message = response.message || '更新成功'
          result.data = response.data
        } else if (response?.data?.success) {
          result.success = true
          result.message = response.data.message || '更新成功'
          result.data = response.data.data
        } else if (response?.status === 'success' || response?.code === 200) {
          result.success = true
          result.message = response.message || '更新成功'
          result.data = response.data || response
        }
      } catch (error) {
        console.error('[API] 状态更新响应处理失败:', error)
      }
      
      return result
    })
    .catch(error => {
      console.error('[API] 更新时间段状态失败:', error)
      return {
        success: false,
        message: error.message || '更新时间段状态失败',
        data: null
      }
    })
}

// 刷新时间段状态
export function refreshTimeSlotStatus(venueId, date, options = {}) {
  if (config.debug) console.debug('[TimeslotAPI] 刷新时间段状态', { venueId, date })
  
  const {
    clearCache = true,
    forceRefresh = true,
    ...otherOptions
  } = options
  
  // 清除缓存
  if (clearCache) {
    const cacheKey = cacheManager.generateTimeSlotKey(venueId, date)
    cacheManager.delete(cacheKey)
    console.log('[API] 已清除时间段缓存')
  }
  
  // 调用后端专门的refresh API
  return get(`/timeslots/venue/${venueId}/date/${date}/refresh`)
    .then(response => {
      if (config.debug) {
        console.debug('[TimeslotAPI] 刷新API响应检查')
      }
      
      // 处理后端refresh API的响应格式
      let result = {
        data: [],
        success: false,
        message: '刷新失败'
      }
      
      try {
        // 后端refresh API返回格式: { success: true, data: [...], message: '...', ... }
        if (response?.success && Array.isArray(response?.data)) {
          
          result = {
            data: response.data,
            success: true,
            message: response.message || '刷新成功'
          }
        } else if (response?.data?.success && Array.isArray(response?.data?.data)) {
          
          result = {
            data: response.data.data,
            success: true,
            message: response.data.message || '刷新成功'
          }
        } else if (Array.isArray(response?.data)) {
          
          // 兼容直接返回数组的情况
          result = {
            data: response.data,
            success: true,
            message: '刷新成功'
          }
        } else if (Array.isArray(response)) {
          
          // 兼容直接返回数组的情况
          result = {
            data: response,
            success: true,
            message: '刷新成功'
          }
        } else {
          console.warn('[TimeslotAPI] 未匹配任何已知格式，响应结构:', {
            responseType: typeof response,
            hasSuccess: 'success' in response,
            successValue: response?.success,
            hasData: 'data' in response,
            dataType: typeof response?.data,
            isDataArray: Array.isArray(response?.data)
          })
        }
      } catch (error) {
        console.error('[TimeslotAPI] 处理刷新响应失败:', error)
      }
      
      if (config.debug) console.debug('[TimeslotAPI] 刷新完成', { success: result.success, count: result.data?.length || 0 })
      return result
    })
    .catch(error => {
      console.error('[API] 刷新时间段状态失败:', error)
      
      // 如果refresh API失败，回退到getVenueTimeSlots
      console.log('[API] 回退到getVenueTimeSlots方法')
      return getVenueTimeSlots(venueId, date, {
        forceRefresh: true,
        useCache: false,
        ...otherOptions
      }).then(response => {
        console.log('[API] 回退方法成功')
        return response
      }).catch(fallbackError => {
        console.error('[API] 回退方法也失败:', fallbackError)
        return {
          data: [],
          success: false,
          message: fallbackError.message || error.message || '刷新失败'
        }
      })
    })
}

// 导出时间段API对象
export const timeslotApi = {
  getVenueTimeSlots,
  getAvailableTimeSlots,
  checkTimeSlotAvailability,
  generateTimeSlots,
  batchCreateTimeSlots,
  syncFrontendTimeSlots,
  generateWeekTimeSlots,
  updateTimeSlotStatus,
  refreshTimeSlotStatus
}