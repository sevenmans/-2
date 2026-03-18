"use strict";
const common_vendor = require("../common/vendor.js");
const utils_auth = require("./auth.js");
const stores_user = require("../stores/user.js");
const ADMIN_ROLE = "ROLE_VENUE_ADMIN";
const ADMIN_PATH_PREFIX = "/pages/admin/";
const USER_TAB_PAGES = [
  "/pages/index/index",
  "/pages/venue/list",
  "/pages/sharing/list",
  "/pages/booking/list",
  "/pages/user/profile"
];
const PUBLIC_PAGES = [
  "/pages/user/login"
];
const PAYMENT_PAGES = [
  "/pages/payment/index",
  "/pages/payment/success",
  "/pages/payment/failed"
];
let authCheckCache = null;
let authCheckTime = 0;
const AUTH_CACHE_DURATION = 3e4;
let isRedirectingAdmin = false;
function isAdmin(userInfo) {
  if (!userInfo || !userInfo.roles)
    return false;
  return Array.isArray(userInfo.roles) ? userInfo.roles.includes(ADMIN_ROLE) : userInfo.roles === ADMIN_ROLE;
}
function setupRouterGuard() {
  const interceptMethods = ["navigateTo", "redirectTo", "reLaunch", "switchTab"];
  interceptMethods.forEach((method) => {
    common_vendor.index.addInterceptor(method, {
      invoke(params) {
        return checkPagePermission(params.url);
      }
    });
  });
}
function checkPagePermission(url, method) {
  const pagePath = extractPagePath(url);
  if (isPublicPage(pagePath)) {
    return true;
  }
  if (isPaymentPage(pagePath)) {
    const hasBasicAuth = !!(utils_auth.getToken() && utils_auth.getUserInfo());
    if (!hasBasicAuth) {
      handleLoginRequired(url);
      return false;
    }
    return true;
  }
  const isLoggedIn = checkLoginStatus();
  if (!isLoggedIn) {
    handleLoginRequired(url);
    return false;
  }
  const userInfo = utils_auth.getUserInfo();
  const admin = isAdmin(userInfo);
  if (pagePath.startsWith(ADMIN_PATH_PREFIX) && !admin) {
    common_vendor.index.showToast({ title: "无管理员权限", icon: "none", duration: 1500 });
    setTimeout(() => {
      common_vendor.index.reLaunch({ url: "/pages/index/index" });
    }, 50);
    return false;
  }
  if (admin && USER_TAB_PAGES.includes(pagePath)) {
    if (isRedirectingAdmin)
      return false;
    isRedirectingAdmin = true;
    setTimeout(() => {
      common_vendor.index.reLaunch({
        url: "/pages/admin/dashboard",
        complete: () => {
          setTimeout(() => {
            isRedirectingAdmin = false;
          }, 300);
        }
      });
    }, 50);
    return false;
  }
  return true;
}
function extractPagePath(url) {
  return url.split("?")[0];
}
function isPublicPage(pagePath) {
  return PUBLIC_PAGES.some((page) => pagePath === page);
}
function isPaymentPage(pagePath) {
  return PAYMENT_PAGES.some((page) => pagePath === page);
}
function checkLoginStatus() {
  const now = Date.now();
  if (authCheckCache !== null && now - authCheckTime < AUTH_CACHE_DURATION) {
    return authCheckCache;
  }
  const token = utils_auth.getToken();
  const userInfo = utils_auth.getUserInfo();
  const userStore = stores_user.useUserStore();
  const storeLoginStatus = userStore.getIsLoggedIn;
  const isLoggedIn = !!(token && userInfo && storeLoginStatus);
  authCheckCache = isLoggedIn;
  authCheckTime = now;
  return isLoggedIn;
}
function handleLoginRequired(originalUrl) {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  if (currentPage && currentPage.route.includes("pages/user/login")) {
    return;
  }
  common_vendor.index.showToast({
    title: "请先登录",
    icon: "none",
    duration: 1500
  });
  const redirectUrl = encodeURIComponent(originalUrl);
  setTimeout(() => {
    common_vendor.index.reLaunch({
      url: `/pages/user/login?redirect=${redirectUrl}`,
      fail: (err) => {
        common_vendor.index.__f__("error", "at utils/router-guard-new.js:216", "[RouterGuard] 跳转登录页失败:", err);
      }
    });
  }, 100);
}
function clearAuthCache() {
  authCheckCache = null;
  authCheckTime = 0;
}
function updateAuthCache(isLoggedIn) {
  authCheckCache = isLoggedIn;
  authCheckTime = Date.now();
}
exports.clearAuthCache = clearAuthCache;
exports.isAdmin = isAdmin;
exports.setupRouterGuard = setupRouterGuard;
exports.updateAuthCache = updateAuthCache;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/router-guard-new.js.map
