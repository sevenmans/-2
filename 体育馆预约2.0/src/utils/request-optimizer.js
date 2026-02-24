/**
 * 请求优化器模块
 * 提供请求去重、并发控制、智能缓存和网络监控功能
 * 兼容 uni-app 环境
 */

// 请求去重器
class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map()
  }

  // 生成请求唯一标识
  generateKey(url, method = 'GET', data = {}) {
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data)
    return `${method.toUpperCase()}_${url}_${dataStr}`
  }

  // 执行去重请求
  request(key, requestFn) {
    // 如果已有相同请求在进行中，返回该请求的Promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)
    }

    // 执行新请求
    const promise = requestFn().finally(() => {
      // 请求完成后清除记录
      this.pendingRequests.delete(key)
    })

    // 记录进行中的请求
    this.pendingRequests.set(key, promise)
    return promise
  }

  // 清除所有待处理请求
  clear() {
    this.pendingRequests.clear()
  }
}

// 并发控制器
class ConcurrencyController {
  constructor(maxConcurrent = 6) {
    this.maxConcurrent = maxConcurrent
    this.running = 0
    this.queue = []
  }

  // 执行请求
  execute(requestFn) {
    return new Promise((resolve, reject) => {
      const task = {
        fn: requestFn,
        resolve,
        reject
      }

      if (this.running < this.maxConcurrent) {
        this._runTask(task)
      } else {
        this.queue.push(task)
      }
    })
  }

  // 执行任务
  _runTask(task) {
    this.running++
    
    task.fn()
      .then(result => {
        task.resolve(result)
      })
      .catch(error => {
        task.reject(error)
      })
      .finally(() => {
        this.running--
        this._processQueue()
      })
  }

  // 处理队列
  _processQueue() {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const nextTask = this.queue.shift()
      this._runTask(nextTask)
    }
  }

  // 获取状态
  getStatus() {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent
    }
  }
}

// 智能缓存管理器
class SmartCache {
  constructor() {
    this.cache = new Map()
    this.defaultTTL = 5 * 60 * 1000 // 5分钟
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      clears: 0
    }
  }

  // 生成缓存键
  generateKey(options) {
    const { url, method = 'GET', data = {} } = options
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data)
    return `${method.toUpperCase()}_${url}_${dataStr}`
  }

  // 获取缓存
  get(options) {
    const key = this.generateKey(options)
    const cached = this.cache.get(key)
    
    if (!cached) {
      this.stats.misses++
      return null
    }

    // 检查是否过期
    if (Date.now() > cached.expiry) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return cached.data
  }

  // 设置缓存
  set(options, data, ttl = this.defaultTTL) {
    const key = this.generateKey(options)
    const expiry = Date.now() + ttl
    
    this.cache.set(key, {
      data,
      expiry,
      timestamp: Date.now()
    })
    
    this.stats.sets++
  }

  // 清除所有缓存
  clear() {
    this.cache.clear()
    this.stats.clears++
  }

  // 清除指定URL的缓存
  clearUrl(url) {
    const keysToDelete = []
    for (const key of this.cache.keys()) {
      if (key.includes(url)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  // 获取缓存统计信息
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    }
  }

  // 清理过期缓存
  cleanup() {
    const now = Date.now()
    const keysToDelete = []
    
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiry) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

// 网络监控器
class NetworkMonitor {
  constructor() {
    this.isOnline = true
    this.networkType = 'unknown'
    this.listeners = []
    this._init()
  }

  // 初始化网络监控
  _init() {
    // uni-app 网络状态监听
    if (typeof uni !== 'undefined') {
      // 获取初始网络状态
      uni.getNetworkType({
        success: (res) => {
          this.networkType = res.networkType
          this.isOnline = res.networkType !== 'none'
        }
      })

      // 监听网络状态变化
      uni.onNetworkStatusChange((res) => {
        this.isOnline = res.isConnected
        this.networkType = res.networkType
        this._notifyListeners({
          isOnline: this.isOnline,
          networkType: this.networkType
        })
      })
    }
  }

  // 添加网络状态监听器
  addListener(callback) {
    this.listeners.push(callback)
  }

  // 移除网络状态监听器
  removeListener(callback) {
    const index = this.listeners.indexOf(callback)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  // 通知所有监听器
  _notifyListeners(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status)
      } catch (error) {
        console.error('网络状态监听器执行错误:', error)
      }
    })
  }

  // 获取当前网络状态
  getStatus() {
    return {
      isOnline: this.isOnline,
      networkType: this.networkType
    }
  }

  // 检查网络连接
  async checkConnection() {
    if (typeof uni !== 'undefined') {
      return new Promise((resolve) => {
        uni.getNetworkType({
          success: (res) => {
            this.networkType = res.networkType
            this.isOnline = res.networkType !== 'none'
            resolve({
              isOnline: this.isOnline,
              networkType: this.networkType
            })
          },
          fail: () => {
            resolve({
              isOnline: false,
              networkType: 'none'
            })
          }
        })
      })
    }
    
    return {
      isOnline: this.isOnline,
      networkType: this.networkType
    }
  }

  // 检查是否为弱网络环境
  isWeakNetwork() {
    // 如果网络不在线，认为是弱网络
    if (!this.isOnline) {
      return true
    }

    // 根据网络类型判断是否为弱网络
    const weakNetworkTypes = ['2g', '3g', 'slow-2g']
    return weakNetworkTypes.includes(this.networkType.toLowerCase())
  }
}

// 创建单例实例
const requestDeduplicator = new RequestDeduplicator()
const concurrencyController = new ConcurrencyController()
const smartCache = new SmartCache()
const networkMonitor = new NetworkMonitor()

// 定期清理过期缓存
setInterval(() => {
  smartCache.cleanup()
}, 60000) // 每分钟清理一次

// 导出模块
export {
  requestDeduplicator,
  concurrencyController,
  smartCache,
  networkMonitor
}

// 默认导出（兼容性）
export default {
  requestDeduplicator,
  concurrencyController,
  smartCache,
  networkMonitor
}