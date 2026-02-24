// 缓存管理器
// 提供统一的多层缓存管理，包括内存缓存和本地存储缓存

import { CACHE_KEYS, CACHE_TTL, PERFORMANCE_THRESHOLDS } from './timeslot-constants.js'

class CacheManager {
  constructor() {
    // 内存缓存
    this.memoryCache = new Map()
    this.cacheExpiry = new Map()
    
    // 本地存储前缀
    this.storagePrefix = 'gym_booking_'
    
    // 缓存统计
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    }
    
    // 定期清理过期缓存
    this.startCleanupTimer()
  }
  
  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} data - 缓存数据
   * @param {number} ttl - 生存时间（毫秒）
   * @param {boolean} persistent - 是否持久化到本地存储
   */
  set(key, data, ttl = CACHE_TTL.FUTURE, persistent = true) {
    try {
      const expiry = Date.now() + ttl
      
      // 内存缓存
      this.memoryCache.set(key, data)
      this.cacheExpiry.set(key, expiry)
      
      // 本地存储缓存（持久化）
      if (persistent) {
        try {
          const cacheItem = {
            data,
            expiry,
            timestamp: Date.now()
          }
          uni.setStorageSync(this.storagePrefix + key, cacheItem)
        } catch (storageError) {
          // 本地存储失败不影响内存缓存
        }
      }
      
      this.stats.sets++
      
      // 检查缓存大小，防止内存泄漏
      this.checkCacheSize()
      
    } catch (error) {
      console.error('设置缓存失败:', error)
    }
  }
  
  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @param {boolean} updateStats - 是否更新统计信息
   * @returns {any|null} 缓存数据或null
   */
  get(key, updateStats = true) {
    try {
      // 先检查内存缓存
      const expiry = this.cacheExpiry.get(key)
      if (expiry && Date.now() < expiry) {
        const data = this.memoryCache.get(key)
        if (data !== undefined) {
          if (updateStats) this.stats.hits++
          return data
        }
      }
      
      // 检查本地存储
      try {
        const stored = uni.getStorageSync(this.storagePrefix + key)
        if (stored && stored.expiry > Date.now()) {
          // 恢复到内存缓存
          this.memoryCache.set(key, stored.data)
          this.cacheExpiry.set(key, stored.expiry)
          
          if (updateStats) this.stats.hits++
          return stored.data
        } else if (stored) {
          // 清理过期的本地存储
          uni.removeStorageSync(this.storagePrefix + key)
        }
      } catch (storageError) {
      }
      
      if (updateStats) this.stats.misses++
      return null
      
    } catch (error) {
      console.error('获取缓存失败:', error)
      if (updateStats) this.stats.misses++
      return null
    }
  }
  
  /**
   * 检查缓存是否存在且有效
   * @param {string} key - 缓存键
   * @returns {boolean} 是否存在有效缓存
   */
  has(key) {
    const data = this.get(key, false)
    return data !== null
  }
  
  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    try {
      // 删除内存缓存
      this.memoryCache.delete(key)
      this.cacheExpiry.delete(key)
      
      // 删除本地存储
      try {
        uni.removeStorageSync(this.storagePrefix + key)
      } catch (storageError) {
      }
      
      this.stats.deletes++
      
    } catch (error) {
      console.error('删除缓存失败:', error)
    }
  }
  
  /**
   * 清除缓存
   * @param {string|RegExp} pattern - 匹配模式，可以是字符串或正则表达式
   */
  clear(pattern) {
    try {
      if (pattern) {
        // 模式匹配清除
        const keysToDelete = []
        
        for (const key of this.memoryCache.keys()) {
          let shouldDelete = false
          
          if (typeof pattern === 'string') {
            shouldDelete = key.includes(pattern)
          } else if (pattern instanceof RegExp) {
            shouldDelete = pattern.test(key)
          }
          
          if (shouldDelete) {
            keysToDelete.push(key)
          }
        }
        
        keysToDelete.forEach(key => this.delete(key))
        
      } else {
        // 清除所有缓存
        this.memoryCache.clear()
        this.cacheExpiry.clear()
        
        // 清除本地存储中的缓存
        try {
          const storageInfo = uni.getStorageInfoSync()
          const keysToRemove = storageInfo.keys.filter(key => 
            key.startsWith(this.storagePrefix)
          )
          keysToRemove.forEach(key => {
            try {
              uni.removeStorageSync(key)
            } catch (error) {
            }
          })
        } catch (error) {
        }
      }
      
    } catch (error) {
      console.error('清除缓存失败:', error)
    }
  }
  
  /**
   * 清除时间段相关缓存
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期
   */
  clearTimeSlotCache(venueId = null, date = null) {
    if (venueId && date) {
      // 清除特定场馆和日期的缓存
      const key = this.generateTimeSlotKey(venueId, date)
      this.delete(key)
    } else if (venueId) {
      // 清除特定场馆的所有缓存
      const prefix = `${CACHE_KEYS.TIMESLOT}${venueId}_`
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          this.delete(key)
        }
      }
    } else {
      // 清除所有时间段缓存
      const prefix = CACHE_KEYS.TIMESLOT
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          this.delete(key)
        }
      }
    }
  }
  
  /**
   * 根据日期获取缓存TTL
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {number} TTL毫秒数
   */
  getCacheTTL(date) {
    const today = new Date().toISOString().split('T')[0]
    
    if (date === today) {
      return CACHE_TTL.TODAY
    } else if (date < today) {
      return CACHE_TTL.HISTORY
    } else {
      return CACHE_TTL.FUTURE
    }
  }
  
  /**
   * 生成时间段缓存键
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期
   * @returns {string} 缓存键
   */
  generateTimeSlotKey(venueId, date) {
    return `${CACHE_KEYS.TIMESLOT}${venueId}_${date}`
  }
  
  /**
   * 生成场馆缓存键
   * @param {number} venueId - 场馆ID
   * @returns {string} 缓存键
   */
  generateVenueKey(venueId) {
    return `${CACHE_KEYS.VENUE}${venueId}`
  }
  
  /**
   * 检查缓存大小，防止内存泄漏
   */
  checkCacheSize() {
    if (this.memoryCache.size > PERFORMANCE_THRESHOLDS.CACHE_SIZE) {
      this.cleanupExpiredCache()
    }
  }
  
  /**
   * 清理过期缓存
   */
  cleanupExpiredCache() {
    const now = Date.now()
    const expiredKeys = []
    
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now >= expiry) {
        expiredKeys.push(key)
      }
    }
    
    expiredKeys.forEach(key => {
      this.memoryCache.delete(key)
      this.cacheExpiry.delete(key)
    })
    
    if (expiredKeys.length > 0) {
    }
  }
  
  /**
   * 启动定期清理定时器
   */
  startCleanupTimer() {
    // 每5分钟清理一次过期缓存
    setInterval(() => {
      this.cleanupExpiredCache()
    }, 5 * 60 * 1000)
  }
  
  /**
   * 获取缓存统计信息
   * @returns {object} 统计信息
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.memoryCache.size,
      memoryUsage: this.estimateMemoryUsage()
    }
  }
  
  /**
   * 估算内存使用量
   * @returns {string} 内存使用量描述
   */
  estimateMemoryUsage() {
    let totalSize = 0
    
    for (const [key, value] of this.memoryCache.entries()) {
      totalSize += this.getObjectSize(key) + this.getObjectSize(value)
    }
    
    if (totalSize < 1024) {
      return `${totalSize} B`
    } else if (totalSize < 1024 * 1024) {
      return `${(totalSize / 1024).toFixed(2)} KB`
    } else {
      return `${(totalSize / (1024 * 1024)).toFixed(2)} MB`
    }
  }
  
  /**
   * 估算对象大小
   * @param {any} obj - 要估算的对象
   * @returns {number} 估算的字节数
   */
  getObjectSize(obj) {
    try {
      return JSON.stringify(obj).length * 2 // 粗略估算，每个字符2字节
    } catch (error) {
      return 0
    }
  }
  
  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    }
  }
}

// 创建单例实例
const cacheManager = new CacheManager()

// 导出单例实例
export default cacheManager

// 也导出类，以便在测试中创建新实例
export { CacheManager }