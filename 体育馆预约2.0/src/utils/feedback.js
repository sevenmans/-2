/**
 * @file feedback.js
 * @description 全局用户反馈模块，提供统一的 Toast 和 Modal 提示功能。
 */

/**
 * 显示用户反馈信息。
 * 根据消息的长度和选项，自动选择使用 Toast 或 Modal。
 *
 * @param {string} message - 要显示的消息内容。
 * @param {Object} [options={}] - 配置选项。
 * @param {string} [options.type='info'] - 消息类型 ('success', 'error', 'info', 'loading')。
 * @param {number} [options.duration=2000] - Toast 显示的持续时间（毫秒）。
 * @param {boolean} [options.useModal=false] - 是否强制使用 Modal 显示。
 * @param {string} [options.title='提示'] - Modal 的标题。
 * @param {boolean} [options.showCancel=false] - Modal 是否显示取消按钮。
 * @param {string} [options.confirmText='确定'] - Modal 确认按钮的文字。
 */
function showUserFeedback(message, options = {}) {
  const {
    type = 'info',
    duration = 2000,
    useModal = false,
    title = '提示',
    showCancel = false,
    confirmText = '确定'
  } = options;

  // 默认情况下，短消息（小于等于20个字符）使用 Toast，长消息使用 Modal
  const messageLengthThreshold = 7;
  const shouldUseModal = useModal || (message && message.length > messageLengthThreshold);

  if (shouldUseModal) {
    // 使用 Modal 显示长消息或需要用户确认的操作
    uni.showModal({
      title: title,
      content: message,
      showCancel: showCancel,
      confirmText: confirmText,
      success: (res) => {
        if (res.confirm) {
          // 用户点击了确定
          if (options.onConfirm) {
            options.onConfirm();
          }
        } else if (res.cancel) {
          // 用户点击了取消
          if (options.onCancel) {
            options.onCancel();
          }
        }
      }
    });
  } else {
    // 使用 Toast 显示简短的反馈信息
    let iconType = 'none';
    if (type === 'success') {
      iconType = 'success';
    } else if (type === 'error') {
      // Toast 的 'error' icon 在某些平台不支持，统一使用 'none' 或自定义图片
      // 这里我们为了统一，暂时都用 none，通过文字来区分
      iconType = 'none'; 
    } else if (type === 'loading') {
      iconType = 'loading';
    }

    uni.showToast({
      title: message,
      icon: iconType,
      duration: duration,
      // 防止用户在 Toast 显示期间进行其他操作
      mask: true 
    });
  }
}

export default {
  install(app) {
    // 将 showUserFeedback 挂载到 Vue 实例上
    // 在组件中可以通过 this.$showUserFeedback 调用
    app.config.globalProperties.$showUserFeedback = showUserFeedback;
  }
};