"use strict";
const utils_request = require("../utils/request.js");
function getUserInfo() {
  return utils_request.get("/users/me");
}
function updateUserInfo(data) {
  return utils_request.put("/users/me", data);
}
function changePassword(data) {
  return utils_request.put("/users/me/password", data);
}
function uploadAvatar(filePath) {
  return utils_request.upload("/users/me/avatar", filePath);
}
function getUserBookings(params) {
  return utils_request.get("/users/me/bookings", params);
}
function getUserOrders(params) {
  return utils_request.get("/users/me/orders", params);
}
function getUserStats() {
  return utils_request.get("/users/me/stats");
}
function getCurrentUser() {
  return utils_request.get("/users/me");
}
function updateProfile(data) {
  return utils_request.put("/users/me/profile", data);
}
const userApi = {
  getUserInfo,
  updateUserInfo,
  changePassword,
  uploadAvatar,
  getUserBookings,
  getUserOrders,
  getUserStats,
  getCurrentUser,
  updateProfile
};
exports.getUserBookings = getUserBookings;
exports.userApi = userApi;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/user.js.map
