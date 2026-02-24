"use strict";
require("../common/vendor.js");
function quickPriceCheck(price) {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) {
    return { valid: false, message: "价格不是有效数字" };
  }
  if (numPrice <= 0) {
    return { valid: false, message: "价格必须大于0" };
  }
  if (numPrice < 30) {
    return { valid: true, message: "价格偏低，请确认", level: "warning" };
  }
  if (numPrice > 500) {
    return { valid: true, message: "价格偏高，请确认", level: "warning" };
  }
  return { valid: true, message: "价格正常", level: "success" };
}
exports.quickPriceCheck = quickPriceCheck;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/booking-price-validator.js.map
