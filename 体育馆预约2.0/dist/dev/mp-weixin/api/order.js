"use strict";
const utils_request = require("../utils/request.js");
function getOrderDetail(id) {
  return utils_request.get(`/order/${id}`);
}
exports.getOrderDetail = getOrderDetail;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/order.js.map
