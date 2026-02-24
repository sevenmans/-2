"use strict";
const common_vendor = require("../common/vendor.js");
function showUserFeedback(message, options = {}) {
  const {
    type = "info",
    duration = 2e3,
    useModal = false,
    title = "提示",
    showCancel = false,
    confirmText = "确定"
  } = options;
  const messageLengthThreshold = 7;
  const shouldUseModal = useModal || message && message.length > messageLengthThreshold;
  if (shouldUseModal) {
    common_vendor.index.showModal({
      title,
      content: message,
      showCancel,
      confirmText,
      success: (res) => {
        if (res.confirm) {
          if (options.onConfirm) {
            options.onConfirm();
          }
        } else if (res.cancel) {
          if (options.onCancel) {
            options.onCancel();
          }
        }
      }
    });
  } else {
    let iconType = "none";
    if (type === "success") {
      iconType = "success";
    } else if (type === "error") {
      iconType = "none";
    } else if (type === "loading") {
      iconType = "loading";
    }
    common_vendor.index.showToast({
      title: message,
      icon: iconType,
      duration,
      // 防止用户在 Toast 显示期间进行其他操作
      mask: true
    });
  }
}
const feedback = {
  install(app) {
    app.config.globalProperties.$showUserFeedback = showUserFeedback;
  }
};
exports.feedback = feedback;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/feedback.js.map
