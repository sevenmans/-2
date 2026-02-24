// 统一时间段管理器
// 整合所有时间段相关的功能，提供统一的管理接口

import { 
  SLOT_STATUS, 
  REFRESH_INTERVALS, 
  ERROR_TYPES, 
  REQUEST_CONFIG,
  SLOT_OPERATION,
  STATUS_UI_MAP
} from './timeslot-constants.js';
import cacheManager from './cache-manager.js';
import TimeSlotValidator, { 
  normalizeSlotStatus, 
  isSlotExpired, 
  formatTimeSlot,
  validateTimeSlotArray 
} from './timeslot-validator.js';
import { getVenueTimeSlots, refreshTimeSlotStatus } from '../api/timeslot.js';

class UnifiedTimeSlotManager {
  constructor() {
    // 请求队列，防止重复请求
    this.refreshQueue = new Map();
    
    // 最后刷新时间记录
    this.lastRefreshTimes = new Map();
    
    // 错误重试计数
    this.retryCounters = new Map();
    
    // 性能监控
    this.performanceStats = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      averageResponseTime: 0
    };
    
    // 事件监听器
    this.eventListeners = new Map();
    
    // 自动刷新定时器
    this.refreshTimers = new Map();
  }
  
  /**
   * 统一的获取时间段方法
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期 (YYYY-MM-DD)
   * @param {object} options - 选项
   * @returns {Promise<array>} 时间段数组
   */
  async getTimeSlots(venueId, date, options = {}) {
    const {
      forceRefresh = false,
      loading = true,
      useCache = true,
      validateData = true,
      processStatus = true
    } = options;
    
    const cacheKey = cacheManager.generateTimeSlotKey(venueId, date);
    const startTime = Date.now();
    
    try {
      // 检查缓存
      if (!forceRefresh && useCache) {
        const cachedData = cacheManager.get(cacheKey);
        if (cachedData) {
          this.performanceStats.cacheHits++;
          this.emit('cache-hit', { venueId, date, data: cachedData });
          
          if (processStatus) {
            return this.processTimeSlotStatus(cachedData, date);
          }
          return cachedData;
        }
        this.performanceStats.cacheMisses++;
      }
      
      // 防重复请求
      if (this.refreshQueue.has(cacheKey)) {
        this.emit('request-queued', { venueId, date });
        return await this.refreshQueue.get(cacheKey);
      }
      
      // 发起请求
      const promise = this.fetchTimeSlots(venueId, date, { loading, forceRefresh });
      this.refreshQueue.set(cacheKey, promise);
      
      try {
        const result = await promise;
        
        // 数据验证
        if (validateData) {
          const validation = validateTimeSlotArray(result);
          if (!validation.isValid) {
            this.emit('validation-error', { venueId, date, errors: validation.errors });
          }
        }
        
        // 更新缓存
        if (useCache) {
          const ttl = cacheManager.getCacheTTL(date);
          cacheManager.set(cacheKey, result, ttl);
        }
        
        // 更新最后刷新时间
        this.lastRefreshTimes.set(cacheKey, Date.now());
        
        // 重置错误计数
        this.retryCounters.delete(cacheKey);
        
        // 更新性能统计
        this.updatePerformanceStats(startTime);
        
        this.emit('data-loaded', { venueId, date, data: result });
        
        if (processStatus) {
          return this.processTimeSlotStatus(result, date);
        }
        return result;
        
      } finally {
        this.refreshQueue.delete(cacheKey);
      }
      
    } catch (error) {
      this.performanceStats.errors++;
      this.emit('error', { venueId, date, error });
      
      // 错误处理和降级
      return await this.handleError(error, { venueId, date, options });
    }
  }
  
  /**
   * 获取时间段数据（内部方法）
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期
   * @param {object} options - 选项
   * @returns {Promise<array>} 时间段数组
   */
  async fetchTimeSlots(venueId, date, options = {}) {
    const { loading = true, forceRefresh = false } = options;
    
    this.performanceStats.apiCalls++;
    
    try {
      
      const response = await getVenueTimeSlots(venueId, date, {
        forceRefresh,
        loading
      });
      
      
      // 处理不同的响应格式
      let timeSlots = [];
      if (response && response.data) {
        timeSlots = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        timeSlots = response;
      }
      
      
      // 检查原始数据中的状态
      if (timeSlots.length > 0) {
        const statusSummary = timeSlots.reduce((acc, slot) => {
          const status = slot.status || slot.available || slot.isAvailable || 'unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
      }
      
      return timeSlots;
      
    } catch (error) {
      console.error('获取时间段失败:', error);
      throw error;
    }
  }
  
  /**
   * 统一的状态处理方法
   * @param {array} timeSlots - 时间段数组
   * @param {string} date - 日期
   * @returns {array} 处理后的时间段数组
   */
  processTimeSlotStatus(timeSlots, date) {
    if (!timeSlots || !Array.isArray(timeSlots)) {
      return [];
    }
    
    // 修复时区问题：使用本地时间而不是UTC时间
    const now = new Date();
    const currentDate = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0');
    const isToday = date === currentDate;
    const isFutureDate = date > currentDate;
    
    // 只在有问题时输出关键信息
    if (isFutureDate) {
    }
    
    return timeSlots.map(slot => {
      const processedSlot = {
        ...slot,
        isExpired: false,
        isAvailable: true,
        canBook: true
      };
      
      // 状态验证：确保必要字段存在
      if (!processedSlot.id || !processedSlot.date || !processedSlot.startTime || !processedSlot.endTime) {
        console.error('[UnifiedTimeSlotManager] 时间段数据不完整:', processedSlot);
        processedSlot.hasError = true;
        processedSlot.isAvailable = false;
        processedSlot.canBook = false;
      }
      
      // 🔧 关键修复：对于非今日时间段，强制修正EXPIRED状态
      if (!isToday) {
        // 🚨 强制将非今日的EXPIRED状态改为AVAILABLE
        if (processedSlot.status === 'EXPIRED') {
          console.error(`[UnifiedTimeSlotManager] 🚨 强制修正未来日期的错误EXPIRED状态: ${processedSlot.date} ${processedSlot.startTime}-${processedSlot.endTime}`);
          processedSlot.status = 'AVAILABLE';
        }
        processedSlot.isExpired = false;
        processedSlot.isAvailable = true;
        processedSlot.canBook = true;
      }
      // 只对今日时间段进行过期检查
      else if (isToday && slot.startTime && slot.endTime) {
        try {
          // 🔥 修复：使用结束时间而不是开始时间来判断过期
          const [endHours, endMinutes] = slot.endTime.split(':').map(Number);

          // 🔧 关键修复：正确构造时间段的结束时间，使用选择的日期而不是今天
          const slotEndDateTime = new Date();
          const [year, month, day] = date.split('-').map(Number);
          slotEndDateTime.setFullYear(year, month - 1, day);
          slotEndDateTime.setHours(endHours, endMinutes, 0, 0);
          
          // 🔧 修复：不使用缓冲时间，严格按照结束时间判断过期
          // 只有当前时间超过结束时间才算过期
          const isExpired = now > slotEndDateTime;

          // 🔧 修复：只有当前时间超过结束时间才算过期
          if (isExpired) {
            processedSlot.status = 'EXPIRED';
            processedSlot.isExpired = true;
            processedSlot.isAvailable = false;
            processedSlot.canBook = false;
          } else {
            // 🔧 重要：如果后端错误地标记为EXPIRED，但实际未过期，则修正状态
            if (processedSlot.status === 'EXPIRED') {
              processedSlot.status = 'AVAILABLE';
            }
            processedSlot.isExpired = false;
          }
        } catch (error) {
          console.error('解析时间失败:', error, slot);
          // 解析失败时，保持原状态，不强制设为过期
        }
      }
      
      // 状态一致性检查：验证状态是否合法
      const validStatuses = ['AVAILABLE', 'BOOKED', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'EXPIRED'];
      if (!validStatuses.includes(processedSlot.status)) {
        processedSlot.status = 'AVAILABLE';
      }
      
      // 根据状态设置UI属性
      if (processedSlot.status === 'BOOKED' || processedSlot.status === 'RESERVED' || processedSlot.status === 'OCCUPIED') {
        processedSlot.isAvailable = false;
        processedSlot.canBook = false;
        processedSlot.isBooked = true;  // 添加：标记为已预约
      } else if (processedSlot.status === 'MAINTENANCE') {
        processedSlot.isAvailable = false;
        processedSlot.canBook = false;
        processedSlot.isBooked = false;
      } else if (processedSlot.status === 'EXPIRED') {
        processedSlot.isExpired = true;
        processedSlot.isAvailable = false;
        processedSlot.canBook = false;
        processedSlot.isBooked = false;
      } else if (processedSlot.status === 'AVAILABLE') {
        processedSlot.isAvailable = true;
        processedSlot.canBook = true;
        processedSlot.isExpired = false;
        processedSlot.isBooked = false;
      } else {
        // 处理未知状态，默认设置为不可用
        processedSlot.isAvailable = false;
        processedSlot.canBook = false;
        processedSlot.isBooked = false;
      }
      
      // 添加状态验证时间戳
      processedSlot.lastValidated = Date.now();
      
      return processedSlot;
    });
  }
  
  /**
   * 设置时间段UI属性
   * @param {object} slot - 时间段对象
   */
  setSlotUIProperties(slot) {
    const uiConfig = STATUS_UI_MAP[slot.status] || STATUS_UI_MAP[SLOT_STATUS.OCCUPIED];
    
    slot.disabled = uiConfig.disabled;
    slot.buttonText = uiConfig.buttonText;
    slot.buttonClass = uiConfig.buttonClass;
    slot.color = uiConfig.color;
    slot.backgroundColor = uiConfig.backgroundColor;
    slot.borderColor = uiConfig.borderColor;
  }
  
  /**
   * 智能刷新调度
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期
   * @param {object} options - 选项
   */
  async scheduleRefresh(venueId, date, options = {}) {
    const { force = false } = options;
    const key = `${venueId}_${date}`;
    const interval = this.getRefreshInterval(date);
    const lastRefresh = this.lastRefreshTimes.get(key) || 0;
    const now = Date.now();
    
    if (force || now - lastRefresh >= interval) {
      try {
        await this.executeRefresh(venueId, date);
        this.emit('refresh-completed', { venueId, date });
      } catch (error) {
        this.emit('refresh-failed', { venueId, date, error });
      }
    }
  }
  
  /**
   * 执行刷新
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期
   */
  async executeRefresh(venueId, date) {
    return await this.getTimeSlots(venueId, date, { forceRefresh: true });
  }

  /**
   * 🎯 立即释放时间段（用于预约取消后的即时更新）
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期
   * @param {string} startTime - 开始时间
   * @param {string} endTime - 结束时间
   * @param {string} bookingType - 预约类型 (SHARED/EXCLUSIVE)
   */
  async immediateReleaseTimeSlots(venueId, date, startTime, endTime, bookingType = 'EXCLUSIVE') {
    try {
      console.log('[UnifiedTimeSlotManager] 立即释放时间段:', {
        venueId, date, startTime, endTime, bookingType
      });

      const cacheKey = cacheManager.generateTimeSlotKey(venueId, date);

      // 1. 乐观更新：立即更新缓存中的时间段状态
      const cachedData = cacheManager.get(cacheKey);

      if (cachedData && Array.isArray(cachedData.data)) {
        let releasedCount = 0;
        const updatedSlots = cachedData.data.map(slot => {
          // 🔧 关键修复：根据预约类型使用不同的匹配策略
          let shouldRelease = false;

          if (bookingType === 'SHARED') {
            // 拼场订单：更宽松的匹配条件
            shouldRelease =
              (slot.startTime === startTime && slot.endTime === endTime) ||
              (slot.startTime >= startTime && slot.startTime < endTime) ||
              (slot.endTime > startTime && slot.endTime <= endTime) ||
              (slot.startTime <= startTime && slot.endTime >= endTime) ||
              (slot.startTime >= startTime && slot.endTime <= endTime);
          } else {
            // 包场订单：精确匹配
            shouldRelease = (slot.startTime === startTime && slot.endTime === endTime);
          }

          // 🎯 关键修复：检查需要释放的状态
          const needsRelease = shouldRelease && (
            slot.status === SLOT_STATUS.BOOKED ||
            slot.status === SLOT_STATUS.SHARING ||
            slot.status === SLOT_STATUS.RESERVED ||
            slot.status === 'BOOKED' ||
            slot.status === 'SHARING' ||
            slot.status === 'RESERVED'
          );

          if (needsRelease) {
            releasedCount++;
            return {
              ...slot,
              status: SLOT_STATUS.AVAILABLE,
              isBooked: false,
              isAvailable: true,
              lastUpdated: new Date().toISOString()
            };
          }
          return slot;
        });

        // 更新缓存
        cacheManager.set(cacheKey, {
          ...cachedData,
          data: updatedSlots,
          timestamp: Date.now()
        });

        console.log(`[UnifiedTimeSlotManager] 释放了 ${releasedCount} 个时间段`);

        // 触发事件通知
        this.emit('timeslots-released', {
          venueId,
          date,
          startTime,
          endTime,
          bookingType,
          releasedCount,
          slots: updatedSlots
        });
      }

      // 2. 清除相关缓存，确保下次获取最新数据
      cacheManager.clearTimeSlotCache(venueId, date);

      // 3. 强制刷新获取最新数据
      setTimeout(() => {
        this.getTimeSlots(venueId, date, { forceRefresh: true, loading: false });
      }, 100);

      // 4. 再次刷新确保状态同步
      setTimeout(() => {
        this.getTimeSlots(venueId, date, { forceRefresh: true, loading: false });
      }, 500);

    } catch (error) {
      console.error('[UnifiedTimeSlotManager] 立即释放时间段失败:', error);
    }
  }
  
  /**
   * 获取刷新间隔
   * @param {string} date - 日期
   * @returns {number} 刷新间隔（毫秒）
   */
  getRefreshInterval(date) {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (date === today) {
      return REFRESH_INTERVALS.CURRENT_DATE;
    } else if (date === tomorrow || date === yesterday) {
      return REFRESH_INTERVALS.ADJACENT_DATE;
    } else {
      return REFRESH_INTERVALS.FUTURE_DATE;
    }
  }
  
  /**
   * 启动自动刷新
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期
   */
  startAutoRefresh(venueId, date) {
    const key = `${venueId}_${date}`;
    
    // 清除现有定时器
    this.stopAutoRefresh(venueId, date);
    
    const interval = this.getRefreshInterval(date);
    const timer = setInterval(() => {
      this.scheduleRefresh(venueId, date);
    }, interval);
    
    this.refreshTimers.set(key, timer);
    this.emit('auto-refresh-started', { venueId, date, interval });
  }
  
  /**
   * 停止自动刷新
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期
   */
  stopAutoRefresh(venueId, date) {
    const key = `${venueId}_${date}`;
    const timer = this.refreshTimers.get(key);
    
    if (timer) {
      clearInterval(timer);
      this.refreshTimers.delete(key);
      this.emit('auto-refresh-stopped', { venueId, date });
    }
  }
  
  /**
   * 停止所有自动刷新
   */
  stopAllAutoRefresh() {
    for (const [key, timer] of this.refreshTimers.entries()) {
      clearInterval(timer);
    }
    this.refreshTimers.clear();
    this.emit('all-auto-refresh-stopped');
  }
  
  /**
   * 错误处理
   * @param {Error} error - 错误对象
   * @param {object} context - 上下文信息
   * @returns {Promise<array>} 降级数据或空数组
   */
  async handleError(error, context) {
    const { venueId, date, options } = context;
    const cacheKey = cacheManager.generateTimeSlotKey(venueId, date);
    const retryCount = this.retryCounters.get(cacheKey) || 0;
    
    console.error('时间段操作失败:', error, context);
    
    // 分类处理错误
    const errorType = this.classifyError(error);
    
    if (errorType === ERROR_TYPES.NETWORK_ERROR && retryCount < REQUEST_CONFIG.MAX_RETRIES) {
      // 网络错误重试
      return await this.retryRequest(venueId, date, options, retryCount);
    } else {
      // 降级到缓存数据
      return await this.fallbackToCachedData(venueId, date);
    }
  }
  
  /**
   * 重试请求
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期
   * @param {object} options - 选项
   * @param {number} retryCount - 重试次数
   * @returns {Promise<array>} 时间段数组
   */
  async retryRequest(venueId, date, options, retryCount) {
    const cacheKey = cacheManager.generateTimeSlotKey(venueId, date);
    const delay = REQUEST_CONFIG.RETRY_DELAY * Math.pow(2, retryCount); // 指数退避
    
    this.retryCounters.set(cacheKey, retryCount + 1);
    
    await this.sleep(delay);
    
    this.emit('retry-attempt', { venueId, date, retryCount: retryCount + 1, delay });
    
    return await this.getTimeSlots(venueId, date, { ...options, forceRefresh: true });
  }
  
  /**
   * 降级到缓存数据
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期
   * @returns {Promise<array>} 缓存数据或空数组
   */
  async fallbackToCachedData(venueId, date) {
    const cacheKey = cacheManager.generateTimeSlotKey(venueId, date);
    const cachedData = cacheManager.get(cacheKey);
    
    if (cachedData) {
      this.emit('fallback-to-cache', { venueId, date, data: cachedData });
      
      // 显示提示信息
      uni.showToast({
        title: '网络异常，显示缓存数据',
        icon: 'none',
        duration: 2000
      });
      
      return this.processTimeSlotStatus(cachedData, date);
    }
    
    // 生成默认空数据
    this.emit('fallback-to-empty', { venueId, date });
    
    uni.showToast({
      title: '网络异常，请稍后重试',
      icon: 'none',
      duration: 2000
    });
    
    return [];
  }
  
  /**
   * 分类错误类型
   * @param {Error} error - 错误对象
   * @returns {string} 错误类型
   */
  classifyError(error) {
    if (!error) return ERROR_TYPES.UNKNOWN_ERROR;
    
    const message = error.message || '';
    const code = error.code || error.statusCode || 0;
    
    if (message.includes('timeout') || message.includes('网络') || code === 'NETWORK_ERROR') {
      return ERROR_TYPES.NETWORK_ERROR;
    } else if (code >= 500 && code < 600) {
      return ERROR_TYPES.SERVER_ERROR;
    } else if (code >= 400 && code < 500) {
      if (code === 401 || code === 403) {
        return ERROR_TYPES.PERMISSION_ERROR;
      } else {
        return ERROR_TYPES.VALIDATION_ERROR;
      }
    } else {
      return ERROR_TYPES.UNKNOWN_ERROR;
    }
  }
  
  /**
   * 更新性能统计
   * @param {number} startTime - 开始时间
   */
  updatePerformanceStats(startTime) {
    const responseTime = Date.now() - startTime;
    const totalCalls = this.performanceStats.apiCalls;
    
    this.performanceStats.averageResponseTime = 
      (this.performanceStats.averageResponseTime * (totalCalls - 1) + responseTime) / totalCalls;
  }
  
  /**
   * 清除缓存
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期
   */
  clearCache(venueId, date) {
    if (venueId && date) {
      const cacheKey = cacheManager.generateTimeSlotKey(venueId, date);
      cacheManager.delete(cacheKey);
    } else if (venueId) {
      cacheManager.clear(`${venueId}_`);
    } else {
      cacheManager.clear('timeslot_');
    }
    
    this.emit('cache-cleared', { venueId, date });
  }
  
  /**
   * 预加载时间段
   * @param {number} venueId - 场馆ID
   * @param {array} dates - 日期数组
   */
  async preloadTimeSlots(venueId, dates) {
    const promises = dates.map(date => 
      this.getTimeSlots(venueId, date, { 
        loading: false, 
        useCache: true,
        processStatus: false 
      })
    );

    await Promise.all(promises);
    this.emit('preload-completed', { venueId, dates });
  }
  
  /**
   * 获取性能统计
   * @returns {object} 性能统计数据
   */
  getPerformanceStats() {
    return {
      ...this.performanceStats,
      cacheStats: cacheManager.getStats(),
      activeRefreshTimers: this.refreshTimers.size,
      pendingRequests: this.refreshQueue.size
    };
  }
  
  /**
   * 重置性能统计
   */
  resetPerformanceStats() {
    this.performanceStats = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      averageResponseTime: 0
    };
    cacheManager.resetStats();
  }
  
  /**
   * 添加事件监听器
   * @param {string} event - 事件名称
   * @param {function} listener - 监听器函数
   */
  on(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(listener);
  }
  
  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {function} listener - 监听器函数
   */
  off(event, listener) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {any} data - 事件数据
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('事件监听器执行失败:', error);
        }
      });
    }
  }
  
  /**
   * 延迟执行
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise} Promise对象
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 销毁管理器
   */
  destroy() {
    this.stopAllAutoRefresh();
    this.refreshQueue.clear();
    this.lastRefreshTimes.clear();
    this.retryCounters.clear();
    this.eventListeners.clear();
    this.emit('destroyed');
  }
}

// 创建单例实例
const unifiedTimeSlotManager = new UnifiedTimeSlotManager();

// 导出单例实例
export default unifiedTimeSlotManager;

// 也导出类，以便在测试中创建新实例
export { UnifiedTimeSlotManager };