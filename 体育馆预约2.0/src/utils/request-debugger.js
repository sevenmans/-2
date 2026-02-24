/**
 * 请求调试工具
 * 用于测试API请求和响应的调试功能
 */

import { request } from './request.js'

/**
 * 快速价格测试
 * @param {Object} params 测试参数
 * @param {string} params.venueId 场馆ID
 * @param {string} params.timeSlotId 时间段ID
 * @param {number} params.duration 预约时长（小时）
 * @returns {Promise<Object>} 测试结果
 */
export async function quickPriceTest(params = {}) {
  const {
    venueId = 'test-venue-001',
    timeSlotId = 'test-slot-001',
    duration = 2
  } = params

  
  try {
    const startTime = Date.now()
    
    // 模拟价格计算请求
    const response = await request({
      url: '/api/booking/calculate-price',
      method: 'POST',
      data: {
        venueId,
        timeSlotId,
        duration,
        timestamp: Date.now()
      }
    })
    
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    const result = {
      success: true,
      responseTime: `${responseTime}ms`,
      data: response.data,
      timestamp: new Date().toLocaleString(),
      testParams: { venueId, timeSlotId, duration }
    }
    
    return result
    
  } catch (error) {
    const result = {
      success: false,
      error: error.message,
      errorCode: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toLocaleString(),
      testParams: { venueId, timeSlotId, duration }
    }
    
    console.error('❌ 价格测试失败', result)
    return result
  }
}

/**
 * 调试完整请求响应
 * @param {Object} requestConfig 请求配置
 * @param {string} requestConfig.url 请求URL
 * @param {string} requestConfig.method 请求方法
 * @param {Object} requestConfig.data 请求数据
 * @param {Object} options 调试选项
 * @param {boolean} options.logHeaders 是否记录请求头
 * @param {boolean} options.logTiming 是否记录时间
 * @param {boolean} options.logResponse 是否记录响应
 * @returns {Promise<Object>} 调试结果
 */
export async function debugCompleteRequestResponse(requestConfig, options = {}) {
  const {
    logHeaders = true,
    logTiming = true,
    logResponse = true
  } = options
  
  const debugInfo = {
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: Date.now(),
    request: {
      url: requestConfig.url,
      method: requestConfig.method || 'GET',
      data: requestConfig.data,
      headers: logHeaders ? (requestConfig.headers || {}) : '[隐藏]'
    }
  }
  
  
  try {
    // 执行请求
    const response = await request(requestConfig)
    
    debugInfo.endTime = Date.now()
    debugInfo.responseTime = debugInfo.endTime - debugInfo.startTime
    debugInfo.success = true
    debugInfo.response = {
      status: response.status || 200,
      statusText: response.statusText || 'OK',
      data: logResponse ? response.data : '[隐藏]',
      headers: logHeaders ? (response.headers || {}) : '[隐藏]'
    }
    
    if (logTiming) {
    }
    
    if (logResponse) {
    }
    
    
    return {
      success: true,
      debugInfo,
      data: response.data
    }
    
  } catch (error) {
    debugInfo.endTime = Date.now()
    debugInfo.responseTime = debugInfo.endTime - debugInfo.startTime
    debugInfo.success = false
    debugInfo.error = {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      stack: error.stack
    }
    
    console.error('❌ 请求调试失败', debugInfo.requestId)
    console.error('💥 错误信息:', debugInfo.error)
    
    if (logTiming) {
    }
    
    return {
      success: false,
      debugInfo,
      error: debugInfo.error
    }
  }
}

/**
 * 批量请求测试
 * @param {Array} requests 请求配置数组
 * @param {Object} options 测试选项
 * @returns {Promise<Object>} 批量测试结果
 */
export async function batchRequestTest(requests = [], options = {}) {
  const {
    concurrent = false,
    maxConcurrency = 3,
    delayBetweenRequests = 100
  } = options
  
  console.debug('[BatchRequestTest]', {
    requestCount: requests.length,
    concurrent,
    maxConcurrency
  })
  
  const results = []
  const startTime = Date.now()
  
  if (concurrent) {
    // 并发执行
    const chunks = []
    for (let i = 0; i < requests.length; i += maxConcurrency) {
      chunks.push(requests.slice(i, i + maxConcurrency))
    }
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(req => debugCompleteRequestResponse(req, { logResponse: false }))
      )
      results.push(...chunkResults.map(r => r.value || r.reason))
    }
  } else {
    // 串行执行
    for (const requestConfig of requests) {
      const result = await debugCompleteRequestResponse(requestConfig, { logResponse: false })
      results.push(result)
      
      if (delayBetweenRequests > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests))
      }
    }
  }
  
  const endTime = Date.now()
  const totalTime = endTime - startTime
  
  const summary = {
    total: requests.length,
    success: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    totalTime: `${totalTime}ms`,
    averageTime: `${Math.round(totalTime / requests.length)}ms`
  }
  
  
  return {
    summary,
    results,
    timestamp: new Date().toLocaleString()
  }
}

/**
 * 网络状态模拟
 * @param {string} condition 网络条件 ('slow', 'unstable', 'offline')
 * @param {Function} testFunction 测试函数
 * @returns {Promise<Object>} 模拟测试结果
 */
export async function simulateNetworkCondition(condition, testFunction) {
  
  const conditions = {
    slow: { delay: 2000, errorRate: 0 },
    unstable: { delay: 500, errorRate: 0.3 },
    offline: { delay: 0, errorRate: 1 }
  }
  
  const config = conditions[condition] || conditions.slow
  
  // 模拟延迟
  if (config.delay > 0) {
    await new Promise(resolve => setTimeout(resolve, config.delay))
  }
  
  // 模拟错误
  if (Math.random() < config.errorRate) {
    throw new Error(`网络${condition}模拟错误`)
  }
  
  return await testFunction()
}

export default {
  quickPriceTest,
  debugCompleteRequestResponse,
  batchRequestTest,
  simulateNetworkCondition
}