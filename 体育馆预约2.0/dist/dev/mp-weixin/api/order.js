"use strict";
const utils_request = require("../utils/request.js");
function getOrderDetail(id) {
  return utils_request.get(`/order/${id}`);
}
function completeUserOrder(id) {
  return utils_request.post(`/order/${id}/complete`);
}
exports.completeUserOrder = completeUserOrder;
exports.getOrderDetail = getOrderDetail;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/order.js.map
