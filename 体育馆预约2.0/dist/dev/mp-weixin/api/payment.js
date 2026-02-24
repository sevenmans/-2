"use strict";
const utils_request = require("../utils/request.js");
function payOrder(orderId, paymentMethod = "wechat") {
  return utils_request.post(`/payments/orders/${orderId}/pay`, {
    paymentMethod
  });
}
function getOrderDetail(orderId) {
  return utils_request.get(`/bookings/${orderId}`);
}
exports.getOrderDetail = getOrderDetail;
exports.payOrder = payOrder;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/payment.js.map
