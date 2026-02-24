"use strict";
const common_vendor = require("../common/vendor.js");
function showError(title, duration = 3e3, mask = false) {
  if (!title) {
    return;
  }
  try {
    common_vendor.index.showToast({
      title: String(title),
      icon: "error",
      duration,
      mask
    });
  } catch (error) {
    common_vendor.index.__f__("error", "at utils/toast.js:49", "[Toast] showError失败:", error);
  }
}
exports.showError = showError;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/toast.js.map
