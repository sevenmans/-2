"use strict";
const utils_request = require("../utils/request.js");
function verifyOrder(orderId) {
  return utils_request.post(`/verification/orders/${orderId}/verify`);
}
function completeOrder(orderId) {
  return utils_request.post(`/verification/orders/${orderId}/complete`);
}
function getOrderByVerifyCode(code) {
  return utils_request.get(`/verification/code/${encodeURIComponent(code)}`);
}
function verifyByCode(code) {
  return utils_request.post("/verification/code/verify", { code });
}
exports.completeOrder = completeOrder;
exports.getOrderByVerifyCode = getOrderByVerifyCode;
exports.verifyByCode = verifyByCode;
exports.verifyOrder = verifyOrder;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/verification.js.map
