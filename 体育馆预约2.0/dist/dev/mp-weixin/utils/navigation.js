"use strict";
const common_vendor = require("../common/vendor.js");
const TABBAR_PAGES = [
  "/pages/index/index",
  "/pages/venue/list",
  "/pages/sharing/list",
  "/pages/booking/list",
  "/pages/user/profile"
];
function navigateTo(url, options = {}) {
  const pagePath = url.split("?")[0];
  const isTabbarPage = TABBAR_PAGES.includes(pagePath);
  if (isTabbarPage) {
    common_vendor.index.switchTab({
      url,
      ...options
    });
  } else {
    common_vendor.index.navigateTo({
      url,
      ...options
    });
  }
}
function smartNavigate(url, options = {}) {
  return navigateTo(url, options);
}
exports.smartNavigate = smartNavigate;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/navigation.js.map
