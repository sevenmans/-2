"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
const common_vendor = require("../common/vendor.js");
class CacheManager {
  /**
   * 设置缓存
   * @param {string} key 缓存键
   * @param {any} data 缓存数据
   * @param {number} expireTime 过期时间（毫秒）
   */
  static set(key, data, expireTime = 5 * 60 * 1e3) {
    const cacheData = {
      data,
      timestamp: Date.now(),
      expireTime
    };
    common_vendor.index.setStorageSync(key, cacheData);
  }
  /**
   * 获取缓存
   * @param {string} key 缓存键
   * @returns {any|null} 缓存数据或null
   */
  static get(key) {
    try {
      const cached = common_vendor.index.getStorageSync(key);
      if (!cached)
        return null;
      const { data, timestamp, expireTime } = cached;
      if (Date.now() - timestamp > expireTime) {
        this.remove(key);
        return null;
      }
      return data;
    } catch (error) {
      common_vendor.index.__f__("error", "at utils/performance.js:58", "获取缓存失败:", error);
      return null;
    }
  }
  /**
   * 删除缓存
   * @param {string} key 缓存键
   */
  static remove(key) {
    common_vendor.index.removeStorageSync(key);
  }
  /**
   * 清空所有缓存
   */
  static clear() {
    common_vendor.index.clearStorageSync();
  }
  /**
   * 获取缓存大小
   * @returns {Object} 缓存信息
   */
  static getInfo() {
    return common_vendor.index.getStorageInfoSync();
  }
}
class SimplePerformanceMonitor {
  /**
   * 开始计时
   * @param {string} name 计时名称
   */
  static mark(name) {
    this.marks.set(name, Date.now());
  }
  /**
   * 结束计时并输出结果
   * @param {string} name 计时名称
   * @returns {number} 耗时（毫秒）
   */
  static measure(name) {
    const startTime = this.marks.get(name);
    if (!startTime) {
      return 0;
    }
    const duration = Date.now() - startTime;
    this.marks.delete(name);
    return duration;
  }
  /**
   * 监控页面加载性能
   */
  static monitorPageLoad() {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    currentPage.route;
  }
}
__publicField(SimplePerformanceMonitor, "marks", /* @__PURE__ */ new Map());
exports.CacheManager = CacheManager;
exports.SimplePerformanceMonitor = SimplePerformanceMonitor;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/performance.js.map
