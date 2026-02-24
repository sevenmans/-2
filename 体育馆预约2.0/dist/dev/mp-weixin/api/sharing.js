"use strict";
const common_vendor = require("../common/vendor.js");
const utils_request = require("../utils/request.js");
function createSharingOrder(data) {
  return utils_request.post("/sharing-orders", data);
}
function getSharingOrderById(id) {
  common_vendor.index.__f__("debug", "at api/sharing.js:34", "[SharingAPI] 请求拼场订单详情，ID:", id);
  return utils_request.get(`/sharing-orders/${id}`, {}, { cache: false });
}
function getSharingOrderByMainOrderId(orderId) {
  common_vendor.index.__f__("debug", "at api/sharing.js:45", "[SharingAPI] 通过主订单ID请求拼场订单详情，主订单ID:", orderId);
  return utils_request.get(`/sharing-orders/by-order/${orderId}`, {}, { cache: false });
}
function getJoinableSharingOrders(params) {
  return utils_request.get("/sharing-orders/joinable", params);
}
function getAllSharingOrders(params) {
  {
    common_vendor.index.__f__("debug", "at api/sharing.js:77", "[SharingAPI] 请求所有拼场订单，参数:", params);
  }
  return utils_request.get("/sharing-orders", params, {
    cache: false,
    timeout: 15e3
  });
}
function getMyCreatedSharingOrders() {
  return utils_request.get("/sharing-orders/my-created", {}, { cache: false });
}
function joinSharingOrder(id, data = {}) {
  return utils_request.post(`/sharing-orders/${id}/join`, data);
}
function applyJoinSharingOrder(id) {
  return utils_request.post(`/sharing-orders/${id}/apply-join`);
}
function confirmSharingOrder(id) {
  return utils_request.post(`/sharing-orders/${id}/confirm`);
}
function cancelSharingOrder(id) {
  return utils_request.post(`/sharing-orders/${id}/cancel`);
}
function updateSharingSettings(sharingId, settings) {
  {
    common_vendor.index.__f__("debug", "at api/sharing.js:186", "[SharingAPI] updateSharingSettings", { sharingId, settings });
  }
  return utils_request.default({
    url: `/sharing-orders/${sharingId}/settings`,
    method: "put",
    data: settings
  });
}
function applySharedBooking(orderId, data) {
  return utils_request.post(`/bookings/shared/${orderId}/apply`, data);
}
function handleSharedRequest(requestId, data) {
  return utils_request.put(`/shared/requests/${requestId}`, data);
}
function getMySharedRequests(params) {
  return utils_request.get("/shared/my-requests", params, { cache: false });
}
function getReceivedSharedRequests(params) {
  return utils_request.get("/shared/received-requests", params);
}
function cancelSharingRequest(requestId) {
  return utils_request.default({
    url: `/shared/requests/${requestId}/cancel`,
    method: "delete"
  });
}
function removeSharingParticipant(sharingId, participantId) {
  common_vendor.index.__f__("warn", "at api/sharing.js:265", "[SharingAPI] removeSharingParticipant 接口在后端未找到对应实现，可能已废弃");
  return utils_request.default({
    url: `/sharing-orders/${sharingId}/participants/${participantId}/remove`,
    method: "post"
  });
}
function getUserSharingOrders(params) {
  return getMySharedRequests(params);
}
exports.applyJoinSharingOrder = applyJoinSharingOrder;
exports.applySharedBooking = applySharedBooking;
exports.cancelSharingOrder = cancelSharingOrder;
exports.cancelSharingRequest = cancelSharingRequest;
exports.confirmSharingOrder = confirmSharingOrder;
exports.createSharingOrder = createSharingOrder;
exports.getAllSharingOrders = getAllSharingOrders;
exports.getJoinableSharingOrders = getJoinableSharingOrders;
exports.getMyCreatedSharingOrders = getMyCreatedSharingOrders;
exports.getMySharedRequests = getMySharedRequests;
exports.getReceivedSharedRequests = getReceivedSharedRequests;
exports.getSharingOrderById = getSharingOrderById;
exports.getSharingOrderByMainOrderId = getSharingOrderByMainOrderId;
exports.getUserSharingOrders = getUserSharingOrders;
exports.handleSharedRequest = handleSharedRequest;
exports.joinSharingOrder = joinSharingOrder;
exports.removeSharingParticipant = removeSharingParticipant;
exports.updateSharingSettings = updateSharingSettings;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/sharing.js.map
