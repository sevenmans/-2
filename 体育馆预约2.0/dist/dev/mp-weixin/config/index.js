"use strict";
const config = {
  development: {
    baseURL: "http://localhost:8080/api",
    timeout: 1e4,
    // 启用缓存
    retryTimes: 1,
    // 减少重试次数，避免重复请求
    retryDelay: 500
  }
};
const config$1 = config["development"];
exports.config = config$1;
//# sourceMappingURL=../../.sourcemap/mp-weixin/config/index.js.map
