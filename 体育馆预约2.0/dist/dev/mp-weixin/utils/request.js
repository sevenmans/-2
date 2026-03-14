"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("../common/vendor.js");
const utils_auth = require("./auth.js");
const utils_ui = require("./ui.js");
const config_index = require("../config/index.js");
const utils_routerGuard = require("./router-guard.js");
const utils_requestOptimizer = require("./request-optimizer.js");
const cacheManager = {
  // 生成缓存键
  generateKey(options) {
    return utils_requestOptimizer.smartCache.generateKey(options);
  },
  // 获取缓存
  get(options) {
    if (options.cache === false)
      return null;
    if (options.method && options.method !== "GET")
      return null;
    return utils_requestOptimizer.smartCache.get(options);
  },
  // 设置缓存
  set(options, data, ttl) {
    if (options.cache === false)
      return;
    if (options.method && options.method !== "GET")
      return;
    utils_requestOptimizer.smartCache.set(options, data);
  },
  // 清除缓存
  clear() {
    utils_requestOptimizer.smartCache.clear();
  },
  // 清除指定URL的缓存
  clearUrl(url) {
    utils_requestOptimizer.smartCache.clearUrl(url);
  },
  // 新增：获取缓存统计信息
  getStats() {
    return utils_requestOptimizer.smartCache.getStats();
  }
};
function requestInterceptor(options) {
  if (!options.url.startsWith("http")) {
    options.url = config_index.config.baseURL + options.url;
  }
  const token = utils_auth.getToken();
  if (token) {
    options.header = {
      ...options.header,
      "Authorization": `Bearer ${token}`
    };
  }
  options.header = {
    "Content-Type": "application/json",
    ...options.header
  };
  options.timeout = options.timeout || config_index.config.timeout;
  return options;
}
function shouldRetry(error) {
  if (!error.statusCode || error.statusCode === 0) {
    return true;
  }
  if (error.statusCode >= 500 && error.statusCode < 600) {
    return true;
  }
  if (error.statusCode === 429) {
    return true;
  }
  return false;
}
function responseInterceptor(response, options) {
  const { data, statusCode } = response;
  if (options.url && options.url.includes("/sharing-orders/")) {
    {
      common_vendor.index.__f__("debug", "at utils/request.js:111", "[SharingOrders Response]", {
        url: options.url,
        statusCode,
        data,
        hasCodeField: data && Object.prototype.hasOwnProperty.call(data, "code"),
        dataKeys: data ? Object.keys(data) : []
      });
    }
  }
  if (statusCode >= 200 && statusCode < 300) {
    if (data.code === 200 || data.success === true || !data.hasOwnProperty("code")) {
      return data;
    } else {
      const error = new Error(data.message || "请求失败");
      error.code = data.code;
      error.statusCode = statusCode;
      throw error;
    }
  } else if (statusCode === 401) {
    const errorMessage = data && data.message ? data.message : "认证失败";
    if (errorMessage.includes("用户名或密码错误") || errorMessage.includes("账号或密码错误") || errorMessage.includes("密码错误") || errorMessage.includes("用户不存在") || errorMessage.includes("Invalid credentials") || errorMessage.includes("Bad credentials")) {
      throw new Error(errorMessage);
    } else {
      utils_auth.removeToken();
      utils_auth.removeUserInfo();
      const pages = getCurrentPages();
      const currentPage = pages.length > 0 ? "/" + pages[pages.length - 1].route : "";
      utils_routerGuard.guestPages.some((page) => currentPage.includes(page));
      const error = new Error("登录已过期");
      error.code = "LOGIN_EXPIRED";
      throw error;
    }
  } else if (statusCode === 403) {
    throw new Error("权限不足");
  } else if (statusCode === 409) {
    const errorMessage = data && data.message ? data.message : "资源冲突";
    throw new Error(errorMessage);
  } else {
    const errorMessage = data && data.message ? data.message : `请求失败 (${statusCode})`;
    const error = new Error(errorMessage);
    if (data) {
      Object.keys(data).forEach((key) => {
        if (key !== "message") {
          error[key] = data[key];
        }
      });
    }
    throw error;
  }
}
function request(options, retryCount = 0) {
  const requestKey = utils_requestOptimizer.requestDeduplicator.generateKey(
    options.url,
    options.method || "GET",
    options.data || {}
  );
  return utils_requestOptimizer.requestDeduplicator.request(requestKey, () => {
    return utils_requestOptimizer.concurrencyController.execute(() => {
      return new Promise((resolve, reject) => {
        options = requestInterceptor(options);
        const cachedData = cacheManager.get(options);
        if (cachedData) {
          resolve(cachedData);
          return;
        }
        const networkStatus = utils_requestOptimizer.networkMonitor.getStatus();
        if (utils_requestOptimizer.networkMonitor.isWeakNetwork()) {
          options.timeout = Math.max(options.timeout || config_index.config.timeout, 15e3);
        }
        if (options.loading !== false) {
          utils_ui.showLoading(options.loadingText);
        }
        common_vendor.index.request({
          ...options,
          success: (response) => {
            try {
              const result = responseInterceptor(response, options);
              if (result && options.method !== "POST" && options.method !== "PUT" && options.method !== "DELETE" && options.method !== "PATCH") {
                cacheManager.set(options, result, options.cacheTTL);
              }
              resolve(result);
            } catch (error) {
              if (retryCount < config_index.config.retryTimes && shouldRetry(error)) {
                const retryDelay = utils_requestOptimizer.networkMonitor.isWeakNetwork() ? config_index.config.retryDelay * 2 : config_index.config.retryDelay;
                setTimeout(() => {
                  request(options, retryCount + 1).then(resolve).catch(reject);
                }, retryDelay);
                return;
              }
              if (options.showError !== false) {
                utils_ui.showToast(error.message || "请求失败");
              }
              reject(error);
            }
          },
          fail: (error) => {
            common_vendor.index.__f__("error", "at utils/request.js:262", "[Request] ❌ 请求失败:", error);
            let errorMsg = "网络请求失败，请检查网络连接";
            if (!networkStatus.isOnline) {
              errorMsg = "网络连接已断开，请检查网络设置";
            } else if (utils_requestOptimizer.networkMonitor.isWeakNetwork()) {
              errorMsg = "网络信号较弱，请稍后重试";
            }
            if (retryCount < config_index.config.retryTimes && shouldRetry(error)) {
              const retryDelay = utils_requestOptimizer.networkMonitor.isWeakNetwork() ? config_index.config.retryDelay * 3 : config_index.config.retryDelay;
              setTimeout(() => {
                request(options, retryCount + 1).then(resolve).catch(reject);
              }, retryDelay);
              return;
            }
            if (options.showError !== false) {
              utils_ui.showToast(errorMsg);
            }
            reject(new Error(errorMsg));
          },
          complete: () => {
            if (options.loading !== false) {
              utils_ui.hideLoading();
            }
          }
        });
      });
    });
  });
}
function get(url, params = {}, options = {}) {
  return request({
    url,
    method: "GET",
    data: params,
    ...options
  });
}
function post(url, data = {}, options = {}) {
  return request({
    url,
    method: "POST",
    data,
    ...options
  });
}
function put(url, data = {}, options = {}) {
  return request({
    url,
    method: "PUT",
    data,
    ...options
  });
}
function del(url, params = {}, options = {}) {
  return request({
    url,
    method: "DELETE",
    data: params,
    ...options
  });
}
function patch(url, data = {}, options = {}) {
  return request({
    url,
    method: "PATCH",
    data,
    ...options
  });
}
function clearCache(url) {
  if (url) {
    cacheManager.clearUrl(url);
  } else {
    cacheManager.clear();
  }
}
function upload(url, filePath, formData = {}, options = {}) {
  return new Promise((resolve, reject) => {
    const token = utils_auth.getToken();
    common_vendor.index.uploadFile({
      url: config_index.config.baseURL + url,
      filePath,
      name: "file",
      formData,
      header: {
        "Authorization": token ? `Bearer ${token}` : ""
      },
      success: (response) => {
        try {
          const data = JSON.parse(response.data);
          if (data.code === 200 || data.success === true) {
            resolve(data);
          } else {
            reject(new Error(data.message || "上传失败"));
          }
        } catch (error) {
          reject(new Error("上传响应解析失败"));
        }
      },
      fail: (error) => {
        common_vendor.index.__f__("error", "at utils/request.js:394", "上传失败:", error);
        reject(new Error("文件上传失败"));
      }
    });
  });
}
if (typeof window !== "undefined") {
  window.cacheManager = cacheManager;
  window.requestOptimizer = {
    getStats: () => ({
      cache: cacheManager.getStats(),
      deduplicator: utils_requestOptimizer.requestDeduplicator.getStats(),
      concurrency: utils_requestOptimizer.concurrencyController.getStats(),
      network: utils_requestOptimizer.networkMonitor.getStatus()
    }),
    clearCache: () => cacheManager.clear(),
    clearAll: () => {
      cacheManager.clear();
      utils_requestOptimizer.requestDeduplicator.clear();
    }
  };
}
if (typeof getApp === "function") {
  try {
    const app = getApp();
    if (app) {
      app.requestStats = () => ({
        cache: cacheManager.getStats(),
        deduplicator: utils_requestOptimizer.requestDeduplicator.getStats(),
        concurrency: utils_requestOptimizer.concurrencyController.getStats(),
        network: utils_requestOptimizer.networkMonitor.getStatus()
      });
    }
  } catch (error) {
  }
}
exports.concurrencyController = utils_requestOptimizer.concurrencyController;
exports.networkMonitor = utils_requestOptimizer.networkMonitor;
exports.requestDeduplicator = utils_requestOptimizer.requestDeduplicator;
exports.smartCache = utils_requestOptimizer.smartCache;
exports.cacheManager = cacheManager;
exports.clearCache = clearCache;
exports.default = request;
exports.del = del;
exports.get = get;
exports.patch = patch;
exports.post = post;
exports.put = put;
exports.request = request;
exports.upload = upload;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/request.js.map
