"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("../common/vendor.js");
const utils_timeslotConstants = require("./timeslot-constants.js");
class CacheManager {
  constructor() {
    this.memoryCache = /* @__PURE__ */ new Map();
    this.cacheExpiry = /* @__PURE__ */ new Map();
    this.storagePrefix = "gym_booking_";
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    this.startCleanupTimer();
  }
  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} data - 缓存数据
   * @param {number} ttl - 生存时间（毫秒）
   * @param {boolean} persistent - 是否持久化到本地存储
   */
  set(key, data, ttl = utils_timeslotConstants.CACHE_TTL.FUTURE, persistent = true) {
    try {
      const expiry = Date.now() + ttl;
      this.memoryCache.set(key, data);
      this.cacheExpiry.set(key, expiry);
      if (persistent) {
        try {
          const cacheItem = {
            data,
            expiry,
            timestamp: Date.now()
          };
          common_vendor.index.setStorageSync(this.storagePrefix + key, cacheItem);
        } catch (storageError) {
        }
      }
      this.stats.sets++;
      this.checkCacheSize();
    } catch (error) {
      common_vendor.index.__f__("error", "at utils/cache-manager.js:62", "设置缓存失败:", error);
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
      const expiry = this.cacheExpiry.get(key);
      if (expiry && Date.now() < expiry) {
        const data = this.memoryCache.get(key);
        if (data !== void 0) {
          if (updateStats)
            this.stats.hits++;
          return data;
        }
      }
      try {
        const stored = common_vendor.index.getStorageSync(this.storagePrefix + key);
        if (stored && stored.expiry > Date.now()) {
          this.memoryCache.set(key, stored.data);
          this.cacheExpiry.set(key, stored.expiry);
          if (updateStats)
            this.stats.hits++;
          return stored.data;
        } else if (stored) {
          common_vendor.index.removeStorageSync(this.storagePrefix + key);
        }
      } catch (storageError) {
      }
      if (updateStats)
        this.stats.misses++;
      return null;
    } catch (error) {
      common_vendor.index.__f__("error", "at utils/cache-manager.js:105", "获取缓存失败:", error);
      if (updateStats)
        this.stats.misses++;
      return null;
    }
  }
  /**
   * 检查缓存是否存在且有效
   * @param {string} key - 缓存键
   * @returns {boolean} 是否存在有效缓存
   */
  has(key) {
    const data = this.get(key, false);
    return data !== null;
  }
  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    try {
      this.memoryCache.delete(key);
      this.cacheExpiry.delete(key);
      try {
        common_vendor.index.removeStorageSync(this.storagePrefix + key);
      } catch (storageError) {
      }
      this.stats.deletes++;
    } catch (error) {
      common_vendor.index.__f__("error", "at utils/cache-manager.js:140", "删除缓存失败:", error);
    }
  }
  /**
   * 清除缓存
   * @param {string|RegExp} pattern - 匹配模式，可以是字符串或正则表达式
   */
  clear(pattern) {
    try {
      if (pattern) {
        const keysToDelete = [];
        for (const key of this.memoryCache.keys()) {
          let shouldDelete = false;
          if (typeof pattern === "string") {
            shouldDelete = key.includes(pattern);
          } else if (pattern instanceof RegExp) {
            shouldDelete = pattern.test(key);
          }
          if (shouldDelete) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach((key) => this.delete(key));
      } else {
        this.memoryCache.clear();
        this.cacheExpiry.clear();
        try {
          const storageInfo = common_vendor.index.getStorageInfoSync();
          const keysToRemove = storageInfo.keys.filter(
            (key) => key.startsWith(this.storagePrefix)
          );
          keysToRemove.forEach((key) => {
            try {
              common_vendor.index.removeStorageSync(key);
            } catch (error) {
            }
          });
        } catch (error) {
        }
      }
    } catch (error) {
      common_vendor.index.__f__("error", "at utils/cache-manager.js:192", "清除缓存失败:", error);
    }
  }
  /**
   * 清除时间段相关缓存
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期
   */
  clearTimeSlotCache(venueId = null, date = null) {
    if (venueId && date) {
      const key = this.generateTimeSlotKey(venueId, date);
      this.delete(key);
    } else if (venueId) {
      const prefix = `${utils_timeslotConstants.CACHE_KEYS.TIMESLOT}${venueId}_`;
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          this.delete(key);
        }
      }
    } else {
      const prefix = utils_timeslotConstants.CACHE_KEYS.TIMESLOT;
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          this.delete(key);
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
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    if (date === today) {
      return utils_timeslotConstants.CACHE_TTL.TODAY;
    } else if (date < today) {
      return utils_timeslotConstants.CACHE_TTL.HISTORY;
    } else {
      return utils_timeslotConstants.CACHE_TTL.FUTURE;
    }
  }
  /**
   * 生成时间段缓存键
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期
   * @returns {string} 缓存键
   */
  generateTimeSlotKey(venueId, date) {
    return `${utils_timeslotConstants.CACHE_KEYS.TIMESLOT}${venueId}_${date}`;
  }
  /**
   * 生成场馆缓存键
   * @param {number} venueId - 场馆ID
   * @returns {string} 缓存键
   */
  generateVenueKey(venueId) {
    return `${utils_timeslotConstants.CACHE_KEYS.VENUE}${venueId}`;
  }
  /**
   * 检查缓存大小，防止内存泄漏
   */
  checkCacheSize() {
    if (this.memoryCache.size > utils_timeslotConstants.PERFORMANCE_THRESHOLDS.CACHE_SIZE) {
      this.cleanupExpiredCache();
    }
  }
  /**
   * 清理过期缓存
   */
  cleanupExpiredCache() {
    const now = Date.now();
    const expiredKeys = [];
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now >= expiry) {
        expiredKeys.push(key);
      }
    }
    expiredKeys.forEach((key) => {
      this.memoryCache.delete(key);
      this.cacheExpiry.delete(key);
    });
  }
  /**
   * 启动定期清理定时器
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 5 * 60 * 1e3);
  }
  /**
   * 获取缓存统计信息
   * @returns {object} 统计信息
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) : 0;
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.memoryCache.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  /**
   * 估算内存使用量
   * @returns {string} 内存使用量描述
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    for (const [key, value] of this.memoryCache.entries()) {
      totalSize += this.getObjectSize(key) + this.getObjectSize(value);
    }
    if (totalSize < 1024) {
      return `${totalSize} B`;
    } else if (totalSize < 1024 * 1024) {
      return `${(totalSize / 1024).toFixed(2)} KB`;
    } else {
      return `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
    }
  }
  /**
   * 估算对象大小
   * @param {any} obj - 要估算的对象
   * @returns {number} 估算的字节数
   */
  getObjectSize(obj) {
    try {
      return JSON.stringify(obj).length * 2;
    } catch (error) {
      return 0;
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
    };
  }
}
const cacheManager = new CacheManager();
exports.CacheManager = CacheManager;
exports.default = cacheManager;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/cache-manager.js.map
