// 性能优化工具类

/**
 * 图片预加载
 * @param {Array} imageUrls 图片URL数组
 * @returns {Promise} 预加载完成的Promise
 */
export function preloadImages(imageUrls) {
  return Promise.allSettled(
    imageUrls.map(url => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(url)
        img.onerror = () => reject(url)
        img.src = url
      })
    })
  )
}

/**
 * 缓存管理器
 */
export class CacheManager {
  /**
   * 设置缓存
   * @param {string} key 缓存键
   * @param {any} data 缓存数据
   * @param {number} expireTime 过期时间（毫秒）
   */
  static set(key, data, expireTime = 5 * 60 * 1000) {
    const cacheData = {
      data,
      timestamp: Date.now(),
      expireTime
    }
    uni.setStorageSync(key, cacheData)
  }

  /**
   * 获取缓存
   * @param {string} key 缓存键
   * @returns {any|null} 缓存数据或null
   */
  static get(key) {
    try {
      const cached = uni.getStorageSync(key)
      if (!cached) return null

      const { data, timestamp, expireTime } = cached
      if (Date.now() - timestamp > expireTime) {
        this.remove(key)
        return null
      }

      return data
    } catch (error) {
      console.error('获取缓存失败:', error)
      return null
    }
  }

  /**
   * 删除缓存
   * @param {string} key 缓存键
   */
  static remove(key) {
    uni.removeStorageSync(key)
  }

  /**
   * 清空所有缓存
   */
  static clear() {
    uni.clearStorageSync()
  }

  /**
   * 获取缓存大小
   * @returns {Object} 缓存信息
   */
  static getInfo() {
    return uni.getStorageInfoSync()
  }
}

/**
 * 防抖函数
 * @param {Function} func 要防抖的函数
 * @param {number} delay 延迟时间
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, delay = 300) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

/**
 * 节流函数
 * @param {Function} func 要节流的函数
 * @param {number} delay 延迟时间
 * @returns {Function} 节流后的函数
 */
export function throttle(func, delay = 300) {
  let lastTime = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastTime >= delay) {
      lastTime = now
      func.apply(this, args)
    }
  }
}

/**
 * 延迟执行
 * @param {number} ms 延迟毫秒数
 * @returns {Promise} Promise对象
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 批量请求管理器
 */
export class BatchRequestManager {
  constructor() {
    this.requestQueue = []
    this.isProcessing = false
    this.maxConcurrent = 3 // 最大并发数
  }

  /**
   * 添加请求到队列
   * @param {Function} requestFn 请求函数
   * @returns {Promise} 请求结果
   */
  add(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        requestFn,
        resolve,
        reject
      })
      this.process()
    })
  }

  /**
   * 处理请求队列
   */
  async process() {
    if (this.isProcessing) return
    this.isProcessing = true

    while (this.requestQueue.length > 0) {
      const batch = this.requestQueue.splice(0, this.maxConcurrent)
      const promises = batch.map(async ({ requestFn, resolve, reject }) => {
        try {
          const result = await requestFn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      await Promise.allSettled(promises)
    }

    this.isProcessing = false
  }
}

/**
 * 简单性能监控（避免与完整版PerformanceMonitor冲突）
 */
export class SimplePerformanceMonitor {
  static marks = new Map()

  /**
   * 开始计时
   * @param {string} name 计时名称
   */
  static mark(name) {
    this.marks.set(name, Date.now())
  }

  /**
   * 结束计时并输出结果
   * @param {string} name 计时名称
   * @returns {number} 耗时（毫秒）
   */
  static measure(name) {
    const startTime = this.marks.get(name)
    if (!startTime) {
      return 0
    }

    const duration = Date.now() - startTime
    this.marks.delete(name)
    return duration
  }

  /**
   * 监控页面加载性能
   */
  static monitorPageLoad() {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const route = currentPage.route
    
  }
}

/**
 * 内存优化
 */
export class MemoryOptimizer {
  /**
   * 清理页面栈
   * @param {number} maxPages 最大页面数
   */
  static cleanPageStack(maxPages = 5) {
    const pages = getCurrentPages()
    if (pages.length > maxPages) {
      // 可以考虑使用 uni.reLaunch 重新加载页面栈
    }
  }

  /**
   * 清理无用的缓存
   */
  static cleanCache() {
    const info = CacheManager.getInfo()
    
    // 如果缓存过大，清理部分缓存
    if (info.currentSize > 10 * 1024 * 1024) { // 10MB
      // 可以实现更精细的缓存清理策略
    }
  }
}