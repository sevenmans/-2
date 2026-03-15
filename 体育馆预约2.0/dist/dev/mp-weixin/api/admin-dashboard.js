"use strict";
const utils_request = require("../utils/request.js");
function getAdminDashboardStats(params) {
  return utils_request.get("/admin/dashboard/stats", params);
}
function getAdminBookings(params, options = {}) {
  return utils_request.get("/admin/bookings", params, options);
}
function adminCancelBooking(id) {
  return utils_request.put(`/bookings/${id}/cancel`);
}
exports.adminCancelBooking = adminCancelBooking;
exports.getAdminBookings = getAdminBookings;
exports.getAdminDashboardStats = getAdminDashboardStats;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/admin-dashboard.js.map
