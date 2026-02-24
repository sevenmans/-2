import { getToken, removeToken, removeUserInfo } from './auth.js'
import { showLoading, hideLoading, showToast } from './ui.js'
import config from '../config/index.js'
import { guestPages } from './router-guard.js'
import { 
  requestDeduplicator, 
  concurrencyController, 
  smartCache, 
  networkMonitor 
} from './request-optimizer.js'

// 🔥 优化：使用新的智能缓存管理器，保留旧接口兼容性
const cacheManager = {
  // 生成缓存键
  generateKey(options) {
    return smartCache.generateKey(options)
  },
  
  // 获取缓存
  get(options) {
    if (!config.cache || options.cache === false) return null
    
    // 只缓存GET请求
    if (options.method && options.method !== 'GET') return null
    
    return smartCache.get(options)
  },
  
  // 设置缓存
  set(options, data, ttl) {
    if (!config.cache || options.cache === false) return
    
    // 只缓存GET请求
    if (options.method && options.method !== 'GET') return
    
    smartCache.set(options, data)
  },
  
  // 清除缓存
  clear() {
    smartCache.clear()
  },
  
  // 清除指定URL的缓存
  clearUrl(url) {
    smartCache.clearUrl(url)
  },
  
  // 新增：获取缓存统计信息
  getStats() {
    return smartCache.getStats()
  }
}

// 请求拦截器
function requestInterceptor(options) {
  // 添加基础URL
  if (!options.url.startsWith('http')) {
    options.url = config.baseURL + options.url
  }
  
  // 添加认证头
  const token = getToken()
  if (token) {
    options.header = {
      ...options.header,
      'Authorization': `Bearer ${token}`
    }
  }
  
  // 设置默认请求头
  options.header = {
    'Content-Type': 'application/json',
    ...options.header
  }
  
  // 设置超时时间
  options.timeout = options.timeout || config.timeout
  
  return options
}

// 判断是否应该重试请求
function shouldRetry(error) {
  // 网络错误、超时错误应该重试
  if (!error.statusCode || error.statusCode === 0) {
    return true
  }
  
  // 服务器错误（5xx）应该重试
  if (error.statusCode >= 500 && error.statusCode < 600) {
    return true
  }
  
  // 429 Too Many Requests 应该重试
  if (error.statusCode === 429) {
    return true
  }
  
  // 其他错误不重试
  return false
}

// 响应拦截器
function responseInterceptor(response, options) {
  const { data, statusCode } = response

  // 添加调试日志（仅对拼场订单详情接口）
  if (options.url && options.url.includes('/sharing-orders/')) {
    if (config.debug) {
      console.debug('[SharingOrders Response]', {
        url: options.url,
        statusCode,
        data,
        hasCodeField: data && Object.prototype.hasOwnProperty.call(data, 'code'),
        dataKeys: data ? Object.keys(data) : []
      })
    }
  }

  // HTTP状态码检查
  if (statusCode >= 200 && statusCode < 300) {
    // 业务状态码检查
    if (data.code === 200 || data.success === true || !data.hasOwnProperty('code')) {
      // 成功响应：明确成功标识 或 没有code字段（如JWT响应）
      return data
    } else {
      // 业务错误
      const error = new Error(data.message || '请求失败')
      error.code = data.code
      error.statusCode = statusCode
      throw error
    }
  } else if (statusCode === 401) {
    // 未授权，根据具体错误信息区分是登录过期还是账号密码错误
    const errorMessage = data && data.message ? data.message : '认证失败'
    
    // 如果是账号密码错误，不清除token，不跳转
    if (errorMessage.includes('用户名或密码错误') || 
        errorMessage.includes('账号或密码错误') || 
        errorMessage.includes('密码错误') || 
        errorMessage.includes('用户不存在') ||
        errorMessage.includes('Invalid credentials') ||
        errorMessage.includes('Bad credentials')) {
      throw new Error(errorMessage)
    } else {
      // 其他401错误认为是登录过期
      removeToken()
      removeUserInfo() // 同时清除用户信息
      
      // 检查当前页面是否是游客页面
      const pages = getCurrentPages()
      const currentPage = pages.length > 0 ? '/' + pages[pages.length - 1].route : ''
      const isGuestPage = guestPages.some(page => currentPage.includes(page))
      
      // 创建一个特殊的错误对象，表示登录过期
      const error = new Error('登录已过期')
      error.code = 'LOGIN_EXPIRED'
      
      // 如果是游客页面，只返回错误，不处理跳转
      // 如果不是游客页面，由路由守卫处理跳转
      throw error
    }
  } else if (statusCode === 403) {
    throw new Error('权限不足')
  } else if (statusCode === 409) {
    // 冲突错误，显示后端返回的具体错误信息
    const errorMessage = data && data.message ? data.message : '资源冲突'
    throw new Error(errorMessage)
  } else {
    // 其他错误，尝试从响应中获取错误信息
    const errorMessage = data && data.message ? data.message : `请求失败 (${statusCode})`
    const error = new Error(errorMessage)

    // 保留后端返回的完整数据，特别是needPayment、orderId等字段
    if (data) {
      Object.keys(data).forEach(key => {
        if (key !== 'message') {
          error[key] = data[key]
        }
      })
    }

    throw error
  }
}

// 🔥 优化：基础请求方法，集成去重和并发控制
function request(options, retryCount = 0) {
  // 生成请求唯一标识
  const requestKey = requestDeduplicator.generateKey(
    options.url, 
    options.method || 'GET', 
    options.data || {}
  )
  
  // 🔥 优化：使用请求去重机制
  return requestDeduplicator.request(requestKey, () => {
    // 🔥 优化：使用并发控制机制
    return concurrencyController.execute(() => {
      return new Promise((resolve, reject) => {
        // 请求拦截
        options = requestInterceptor(options)
        
        // 检查缓存
        const cachedData = cacheManager.get(options)
        if (cachedData) {
          // 使用缓存数据，不显示加载状态
          resolve(cachedData)
          return
        }
        
        // 🔥 优化：根据网络状态调整超时时间
        const networkStatus = networkMonitor.getStatus()
        if (networkMonitor.isWeakNetwork()) {
          options.timeout = Math.max(options.timeout || config.timeout, 15000) // 弱网络下延长超时时间
        }
        
        // 显示加载状态
        if (options.loading !== false) {
          showLoading(options.loadingText)
        }
        
        uni.request({
          ...options,
          success: (response) => {
            try {
              const result = responseInterceptor(response, options)
              
              // 缓存成功的响应数据
              if (result && options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE' && options.method !== 'PATCH') {
                cacheManager.set(options, result, options.cacheTTL)
              }
              
              resolve(result)
            } catch (error) {
              // 检查是否需要重试
              if (retryCount < config.retryTimes && shouldRetry(error)) {
                // 隐藏当前加载状态
                if (options.loading !== false) {
                  hideLoading()
                }
                
                // 🔥 优化：根据网络状态调整重试延迟
                const retryDelay = networkMonitor.isWeakNetwork() 
                  ? config.retryDelay * 2 
                  : config.retryDelay
                
                
                // 延迟后重试
                setTimeout(() => {
                  request(options, retryCount + 1)
                    .then(resolve)
                    .catch(reject)
                }, retryDelay)
                return
              }
              
              // 显示错误提示
              if (options.showError !== false) {
                showToast(error.message || '请求失败')
              }
              reject(error)
            }
          },
          fail: (error) => {
            console.error('[Request] ❌ 请求失败:', error)
            
            // 🔥 优化：根据网络状态提供更友好的错误信息
            let errorMsg = '网络请求失败，请检查网络连接'
            if (!networkStatus.isOnline) {
              errorMsg = '网络连接已断开，请检查网络设置'
            } else if (networkMonitor.isWeakNetwork()) {
              errorMsg = '网络信号较弱，请稍后重试'
            }
            
            // 检查是否需要重试
            if (retryCount < config.retryTimes && shouldRetry(error)) {
              // 隐藏当前加载状态
              if (options.loading !== false) {
                hideLoading()
              }
              
              // 🔥 优化：根据网络状态调整重试延迟
              const retryDelay = networkMonitor.isWeakNetwork() 
                ? config.retryDelay * 3 
                : config.retryDelay
              
              
              // 延迟后重试
              setTimeout(() => {
                request(options, retryCount + 1)
                  .then(resolve)
                  .catch(reject)
              }, retryDelay)
              return
            }
            
            if (options.showError !== false) {
              showToast(errorMsg)
            }
            reject(new Error(errorMsg))
          },
          complete: () => {
            // 隐藏加载状态（仅在不重试的情况下）
            if (options.loading !== false) {
              hideLoading()
            }
          }
        })
      })
    })
  })
}

// GET请求
export function get(url, params = {}, options = {}) {
  // 缓存控制选项
  // options.cache: 是否使用缓存，默认跟随全局配置
  // options.cacheTTL: 缓存有效期（毫秒），默认60000（1分钟）
  return request({
    url,
    method: 'GET',
    data: params,
    ...options
  })
}

// POST请求
export function post(url, data = {}, options = {}) {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  })
}

// PUT请求
export function put(url, data = {}, options = {}) {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  })
}

// DELETE请求
export function del(url, params = {}, options = {}) {
  return request({
    url,
    method: 'DELETE',
    data: params,
    ...options
  })
}

// PATCH请求
export function patch(url, data = {}, options = {}) {
  return request({
    url,
    method: 'PATCH',
    data,
    ...options
  })
}

// 清除缓存
export function clearCache(url) {
  if (url) {
    cacheManager.clearUrl(url)
  } else {
    cacheManager.clear()
  }
}

// 文件上传
export function upload(url, filePath, formData = {}, options = {}) {
  return new Promise((resolve, reject) => {
    const token = getToken()
    
    uni.uploadFile({
      url: config.baseURL + url,
      filePath,
      name: 'file',
      formData,
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (response) => {
        try {
          const data = JSON.parse(response.data)
          if (data.code === 200 || data.success === true) {
            resolve(data)
          } else {
            reject(new Error(data.message || '上传失败'))
          }
        } catch (error) {
          reject(new Error('上传响应解析失败'))
        }
      },
      fail: (error) => {
        console.error('上传失败:', error)
        reject(new Error('文件上传失败'))
      }
    })
  })
}

// 🔥 优化：暴露优化器统计信息到全局，便于调试
if (typeof window !== 'undefined') {
  window.cacheManager = cacheManager
  window.requestOptimizer = {
    getStats: () => ({
      cache: cacheManager.getStats(),
      deduplicator: requestDeduplicator.getStats(),
      concurrency: concurrencyController.getStats(),
      network: networkMonitor.getStatus()
    }),
    clearCache: () => cacheManager.clear(),
    clearAll: () => {
      cacheManager.clear()
      requestDeduplicator.clear()
    }
  }
}

// 🔥 优化：在微信小程序环境下暴露调试信息
if (typeof getApp === 'function') {
  try {
    const app = getApp()
    if (app) {
      app.requestStats = () => ({
        cache: cacheManager.getStats(),
        deduplicator: requestDeduplicator.getStats(),
        concurrency: concurrencyController.getStats(),
        network: networkMonitor.getStatus()
      })
    }
  } catch (error) {
    // 忽略错误，可能是在应用初始化之前调用
  }
}

export default request

// 🔥 新增：导出优化器实例供其他模块使用
export { 
  request,
  cacheManager,
  requestDeduplicator,
  concurrencyController,
  smartCache,
  networkMonitor
}
