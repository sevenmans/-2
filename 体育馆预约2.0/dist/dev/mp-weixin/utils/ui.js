"use strict";
const common_vendor = require("../common/vendor.js");
let loadingCount = 0;
function showLoading(title = "加载中...") {
  loadingCount += 1;
  if (loadingCount === 1) {
    common_vendor.index.showLoading({
      title,
      mask: true
    });
  }
}
function hideLoading() {
  if (loadingCount <= 0)
    return;
  loadingCount -= 1;
  if (loadingCount === 0) {
    common_vendor.index.hideLoading();
  }
}
function showToast(options) {
  if (typeof options === "string") {
    options = { title: options };
  }
  const defaultOptions = {
    title: "",
    icon: "none",
    duration: 2e3,
    mask: false
  };
  common_vendor.index.showToast({
    ...defaultOptions,
    ...options
  });
}
function showSuccess(title) {
  showToast({
    title,
    icon: "success"
  });
}
function showError(title) {
  showToast({
    title,
    icon: "error"
  });
}
exports.hideLoading = hideLoading;
exports.showError = showError;
exports.showLoading = showLoading;
exports.showSuccess = showSuccess;
exports.showToast = showToast;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/ui.js.map
