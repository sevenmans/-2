"use strict";
const common_vendor = require("../common/vendor.js");
const TOKEN_KEY = "access_token";
const USER_INFO_KEY = "user_info";
function getToken() {
  return common_vendor.index.getStorageSync(TOKEN_KEY);
}
function setToken(token) {
  return common_vendor.index.setStorageSync(TOKEN_KEY, token);
}
function removeToken() {
  return common_vendor.index.removeStorageSync(TOKEN_KEY);
}
function getUserInfo() {
  const userInfo = common_vendor.index.getStorageSync(USER_INFO_KEY);
  return userInfo ? JSON.parse(userInfo) : null;
}
function setUserInfo(userInfo) {
  return common_vendor.index.setStorageSync(USER_INFO_KEY, JSON.stringify(userInfo));
}
function removeUserInfo() {
  return common_vendor.index.removeStorageSync(USER_INFO_KEY);
}
function isLoggedIn() {
  return !!getToken();
}
function clearAuth() {
  removeToken();
  removeUserInfo();
}
exports.clearAuth = clearAuth;
exports.getToken = getToken;
exports.getUserInfo = getUserInfo;
exports.isLoggedIn = isLoggedIn;
exports.removeToken = removeToken;
exports.removeUserInfo = removeUserInfo;
exports.setToken = setToken;
exports.setUserInfo = setUserInfo;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/auth.js.map
