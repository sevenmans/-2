"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("../common/vendor.js");
const utils_timeslotConstants = require("./timeslot-constants.js");
const utils_cacheManager = require("./cache-manager.js");
const utils_timeslotValidator = require("./timeslot-validator.js");
const api_timeslot = require("../api/timeslot.js");
class UnifiedTimeSlotManager {
  constructor() {
    this.refreshQueue = /* @__PURE__ */ new Map();
    this.lastRefreshTimes = /* @__PURE__ */ new Map();
    this.retryCounters = /* @__PURE__ */ new Map();
    this.performanceStats = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      averageResponseTime: 0
    };
    this.eventListeners = /* @__PURE__ */ new Map();
    this.refreshTimers = /* @__PURE__ */ new Map();
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
    const cacheKey = utils_cacheManager.default.generateTimeSlotKey(venueId, date);
    const startTime = Date.now();
    try {
      if (!forceRefresh && useCache) {
        const cachedData = utils_cacheManager.default.get(cacheKey);
        if (cachedData) {
          this.performanceStats.cacheHits++;
          this.emit("cache-hit", { venueId, date, data: cachedData });
          if (processStatus) {
            return this.processTimeSlotStatus(cachedData, date);
          }
          return cachedData;
        }
        this.performanceStats.cacheMisses++;
      }
      if (this.refreshQueue.has(cacheKey)) {
        this.emit("request-queued", { venueId, date });
        return await this.refreshQueue.get(cacheKey);
      }
      const promise = this.fetchTimeSlots(venueId, date, { loading, forceRefresh });
      this.refreshQueue.set(cacheKey, promise);
      try {
        const result = await promise;
        if (validateData) {
          const validation = utils_timeslotValidator.validateTimeSlotArray(result);
          if (!validation.isValid) {
            this.emit("validation-error", { venueId, date, errors: validation.errors });
          }
        }
        if (useCache) {
          const ttl = utils_cacheManager.default.getCacheTTL(date);
          utils_cacheManager.default.set(cacheKey, result, ttl);
        }
        this.lastRefreshTimes.set(cacheKey, Date.now());
        this.retryCounters.delete(cacheKey);
        this.updatePerformanceStats(startTime);
        this.emit("data-loaded", { venueId, date, data: result });
        if (processStatus) {
          return this.processTimeSlotStatus(result, date);
        }
        return result;
      } finally {
        this.refreshQueue.delete(cacheKey);
      }
    } catch (error) {
      this.performanceStats.errors++;
      this.emit("error", { venueId, date, error });
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
      const response = await api_timeslot.getVenueTimeSlots(venueId, date, {
        forceRefresh,
        loading
      });
      let timeSlots = [];
      if (response && response.data) {
        timeSlots = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        timeSlots = response;
      }
      if (timeSlots.length > 0) {
        const statusSummary = timeSlots.reduce((acc, slot) => {
          const status = slot.status || slot.available || slot.isAvailable || "unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
      }
      return timeSlots;
    } catch (error) {
      common_vendor.index.__f__("error", "at utils/unified-timeslot-manager.js:180", "获取时间段失败:", error);
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
    const now = /* @__PURE__ */ new Date();
    const currentDate = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
    const isToday = date === currentDate;
    return timeSlots.map((slot) => {
      const processedSlot = {
        ...slot,
        isExpired: false,
        isAvailable: true,
        canBook: true
      };
      if (!processedSlot.id || !processedSlot.date || !processedSlot.startTime || !processedSlot.endTime) {
        common_vendor.index.__f__("error", "at utils/unified-timeslot-manager.js:218", "[UnifiedTimeSlotManager] 时间段数据不完整:", processedSlot);
        processedSlot.hasError = true;
        processedSlot.isAvailable = false;
        processedSlot.canBook = false;
      }
      if (!isToday) {
        if (processedSlot.status === "EXPIRED") {
          common_vendor.index.__f__("error", "at utils/unified-timeslot-manager.js:228", `[UnifiedTimeSlotManager] 🚨 强制修正未来日期的错误EXPIRED状态: ${processedSlot.date} ${processedSlot.startTime}-${processedSlot.endTime}`);
          processedSlot.status = "AVAILABLE";
        }
        processedSlot.isExpired = false;
        processedSlot.isAvailable = true;
        processedSlot.canBook = true;
      } else if (isToday && slot.startTime && slot.endTime) {
        try {
          const [endHours, endMinutes] = slot.endTime.split(":").map(Number);
          const slotEndDateTime = /* @__PURE__ */ new Date();
          const [year, month, day] = date.split("-").map(Number);
          slotEndDateTime.setFullYear(year, month - 1, day);
          slotEndDateTime.setHours(endHours, endMinutes, 0, 0);
          const isExpired = now > slotEndDateTime;
          if (isExpired) {
            processedSlot.status = "EXPIRED";
            processedSlot.isExpired = true;
            processedSlot.isAvailable = false;
            processedSlot.canBook = false;
          } else {
            if (processedSlot.status === "EXPIRED") {
              processedSlot.status = "AVAILABLE";
            }
            processedSlot.isExpired = false;
          }
        } catch (error) {
          common_vendor.index.__f__("error", "at utils/unified-timeslot-manager.js:265", "解析时间失败:", error, slot);
        }
      }
      const validStatuses = ["AVAILABLE", "BOOKED", "RESERVED", "OCCUPIED", "MAINTENANCE", "EXPIRED"];
      if (!validStatuses.includes(processedSlot.status)) {
        processedSlot.status = "AVAILABLE";
      }
      if (processedSlot.status === "BOOKED" || processedSlot.status === "RESERVED" || processedSlot.status === "OCCUPIED") {
        processedSlot.isAvailable = false;
        processedSlot.canBook = false;
        processedSlot.isBooked = true;
      } else if (processedSlot.status === "MAINTENANCE") {
        processedSlot.isAvailable = false;
        processedSlot.canBook = false;
        processedSlot.isBooked = false;
      } else if (processedSlot.status === "EXPIRED") {
        processedSlot.isExpired = true;
        processedSlot.isAvailable = false;
        processedSlot.canBook = false;
        processedSlot.isBooked = false;
      } else if (processedSlot.status === "AVAILABLE") {
        processedSlot.isAvailable = true;
        processedSlot.canBook = true;
        processedSlot.isExpired = false;
        processedSlot.isBooked = false;
      } else {
        processedSlot.isAvailable = false;
        processedSlot.canBook = false;
        processedSlot.isBooked = false;
      }
      processedSlot.lastValidated = Date.now();
      return processedSlot;
    });
  }
  /**
   * 设置时间段UI属性
   * @param {object} slot - 时间段对象
   */
  setSlotUIProperties(slot) {
    const uiConfig = utils_timeslotConstants.STATUS_UI_MAP[slot.status] || utils_timeslotConstants.STATUS_UI_MAP[utils_timeslotConstants.SLOT_STATUS.OCCUPIED];
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
        this.emit("refresh-completed", { venueId, date });
      } catch (error) {
        this.emit("refresh-failed", { venueId, date, error });
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
  async immediateReleaseTimeSlots(venueId, date, startTime, endTime, bookingType = "EXCLUSIVE") {
    try {
      common_vendor.index.__f__("log", "at utils/unified-timeslot-manager.js:366", "[UnifiedTimeSlotManager] 立即释放时间段:", {
        venueId,
        date,
        startTime,
        endTime,
        bookingType
      });
      const cacheKey = utils_cacheManager.default.generateTimeSlotKey(venueId, date);
      const cachedData = utils_cacheManager.default.get(cacheKey);
      if (cachedData && Array.isArray(cachedData.data)) {
        let releasedCount = 0;
        const updatedSlots = cachedData.data.map((slot) => {
          let shouldRelease = false;
          if (bookingType === "SHARED") {
            shouldRelease = slot.startTime === startTime && slot.endTime === endTime || slot.startTime >= startTime && slot.startTime < endTime || slot.endTime > startTime && slot.endTime <= endTime || slot.startTime <= startTime && slot.endTime >= endTime || slot.startTime >= startTime && slot.endTime <= endTime;
          } else {
            shouldRelease = slot.startTime === startTime && slot.endTime === endTime;
          }
          const needsRelease = shouldRelease && (slot.status === utils_timeslotConstants.SLOT_STATUS.BOOKED || slot.status === utils_timeslotConstants.SLOT_STATUS.SHARING || slot.status === utils_timeslotConstants.SLOT_STATUS.RESERVED || slot.status === "BOOKED" || slot.status === "SHARING" || slot.status === "RESERVED");
          if (needsRelease) {
            releasedCount++;
            return {
              ...slot,
              status: utils_timeslotConstants.SLOT_STATUS.AVAILABLE,
              isBooked: false,
              isAvailable: true,
              lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
            };
          }
          return slot;
        });
        utils_cacheManager.default.set(cacheKey, {
          ...cachedData,
          data: updatedSlots,
          timestamp: Date.now()
        });
        common_vendor.index.__f__("log", "at utils/unified-timeslot-manager.js:424", `[UnifiedTimeSlotManager] 释放了 ${releasedCount} 个时间段`);
        this.emit("timeslots-released", {
          venueId,
          date,
          startTime,
          endTime,
          bookingType,
          releasedCount,
          slots: updatedSlots
        });
      }
      utils_cacheManager.default.clearTimeSlotCache(venueId, date);
      setTimeout(() => {
        this.getTimeSlots(venueId, date, { forceRefresh: true, loading: false });
      }, 100);
      setTimeout(() => {
        this.getTimeSlots(venueId, date, { forceRefresh: true, loading: false });
      }, 500);
    } catch (error) {
      common_vendor.index.__f__("error", "at utils/unified-timeslot-manager.js:452", "[UnifiedTimeSlotManager] 立即释放时间段失败:", error);
    }
  }
  /**
   * 获取刷新间隔
   * @param {string} date - 日期
   * @returns {number} 刷新间隔（毫秒）
   */
  getRefreshInterval(date) {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
    if (date === today) {
      return utils_timeslotConstants.REFRESH_INTERVALS.CURRENT_DATE;
    } else if (date === tomorrow || date === yesterday) {
      return utils_timeslotConstants.REFRESH_INTERVALS.ADJACENT_DATE;
    } else {
      return utils_timeslotConstants.REFRESH_INTERVALS.FUTURE_DATE;
    }
  }
  /**
   * 启动自动刷新
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期
   */
  startAutoRefresh(venueId, date) {
    const key = `${venueId}_${date}`;
    this.stopAutoRefresh(venueId, date);
    const interval = this.getRefreshInterval(date);
    const timer = setInterval(() => {
      this.scheduleRefresh(venueId, date);
    }, interval);
    this.refreshTimers.set(key, timer);
    this.emit("auto-refresh-started", { venueId, date, interval });
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
      this.emit("auto-refresh-stopped", { venueId, date });
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
    this.emit("all-auto-refresh-stopped");
  }
  /**
   * 错误处理
   * @param {Error} error - 错误对象
   * @param {object} context - 上下文信息
   * @returns {Promise<array>} 降级数据或空数组
   */
  async handleError(error, context) {
    const { venueId, date, options } = context;
    const cacheKey = utils_cacheManager.default.generateTimeSlotKey(venueId, date);
    const retryCount = this.retryCounters.get(cacheKey) || 0;
    common_vendor.index.__f__("error", "at utils/unified-timeslot-manager.js:533", "时间段操作失败:", error, context);
    const errorType = this.classifyError(error);
    if (errorType === utils_timeslotConstants.ERROR_TYPES.NETWORK_ERROR && retryCount < utils_timeslotConstants.REQUEST_CONFIG.MAX_RETRIES) {
      return await this.retryRequest(venueId, date, options, retryCount);
    } else {
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
    const cacheKey = utils_cacheManager.default.generateTimeSlotKey(venueId, date);
    const delay = utils_timeslotConstants.REQUEST_CONFIG.RETRY_DELAY * Math.pow(2, retryCount);
    this.retryCounters.set(cacheKey, retryCount + 1);
    await this.sleep(delay);
    this.emit("retry-attempt", { venueId, date, retryCount: retryCount + 1, delay });
    return await this.getTimeSlots(venueId, date, { ...options, forceRefresh: true });
  }
  /**
   * 降级到缓存数据
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期
   * @returns {Promise<array>} 缓存数据或空数组
   */
  async fallbackToCachedData(venueId, date) {
    const cacheKey = utils_cacheManager.default.generateTimeSlotKey(venueId, date);
    const cachedData = utils_cacheManager.default.get(cacheKey);
    if (cachedData) {
      this.emit("fallback-to-cache", { venueId, date, data: cachedData });
      common_vendor.index.showToast({
        title: "网络异常，显示缓存数据",
        icon: "none",
        duration: 2e3
      });
      return this.processTimeSlotStatus(cachedData, date);
    }
    this.emit("fallback-to-empty", { venueId, date });
    common_vendor.index.showToast({
      title: "网络异常，请稍后重试",
      icon: "none",
      duration: 2e3
    });
    return [];
  }
  /**
   * 分类错误类型
   * @param {Error} error - 错误对象
   * @returns {string} 错误类型
   */
  classifyError(error) {
    if (!error)
      return utils_timeslotConstants.ERROR_TYPES.UNKNOWN_ERROR;
    const message = error.message || "";
    const code = error.code || error.statusCode || 0;
    if (message.includes("timeout") || message.includes("网络") || code === "NETWORK_ERROR") {
      return utils_timeslotConstants.ERROR_TYPES.NETWORK_ERROR;
    } else if (code >= 500 && code < 600) {
      return utils_timeslotConstants.ERROR_TYPES.SERVER_ERROR;
    } else if (code >= 400 && code < 500) {
      if (code === 401 || code === 403) {
        return utils_timeslotConstants.ERROR_TYPES.PERMISSION_ERROR;
      } else {
        return utils_timeslotConstants.ERROR_TYPES.VALIDATION_ERROR;
      }
    } else {
      return utils_timeslotConstants.ERROR_TYPES.UNKNOWN_ERROR;
    }
  }
  /**
   * 更新性能统计
   * @param {number} startTime - 开始时间
   */
  updatePerformanceStats(startTime) {
    const responseTime = Date.now() - startTime;
    const totalCalls = this.performanceStats.apiCalls;
    this.performanceStats.averageResponseTime = (this.performanceStats.averageResponseTime * (totalCalls - 1) + responseTime) / totalCalls;
  }
  /**
   * 清除缓存
   * @param {number} venueId - 场馆ID
   * @param {string} date - 日期
   */
  clearCache(venueId, date) {
    if (venueId && date) {
      const cacheKey = utils_cacheManager.default.generateTimeSlotKey(venueId, date);
      utils_cacheManager.default.delete(cacheKey);
    } else if (venueId) {
      utils_cacheManager.default.clear(`${venueId}_`);
    } else {
      utils_cacheManager.default.clear("timeslot_");
    }
    this.emit("cache-cleared", { venueId, date });
  }
  /**
   * 预加载时间段
   * @param {number} venueId - 场馆ID
   * @param {array} dates - 日期数组
   */
  async preloadTimeSlots(venueId, dates) {
    const promises = dates.map(
      (date) => this.getTimeSlots(venueId, date, {
        loading: false,
        useCache: true,
        processStatus: false
      })
    );
    await Promise.all(promises);
    this.emit("preload-completed", { venueId, dates });
  }
  /**
   * 获取性能统计
   * @returns {object} 性能统计数据
   */
  getPerformanceStats() {
    return {
      ...this.performanceStats,
      cacheStats: utils_cacheManager.default.getStats(),
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
    utils_cacheManager.default.resetStats();
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
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          common_vendor.index.__f__("error", "at utils/unified-timeslot-manager.js:743", "事件监听器执行失败:", error);
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
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    this.emit("destroyed");
  }
}
const unifiedTimeSlotManager = new UnifiedTimeSlotManager();
exports.UnifiedTimeSlotManager = UnifiedTimeSlotManager;
exports.default = unifiedTimeSlotManager;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/unified-timeslot-manager.js.map
