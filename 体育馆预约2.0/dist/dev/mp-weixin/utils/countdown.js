"use strict";
const common_vendor = require("../common/vendor.js");
function getAutoCancelTime(bookingDate, startTime) {
  if (!bookingDate || !startTime) {
    return null;
  }
  try {
    let timeStr = startTime;
    if (startTime.length === 5) {
      timeStr = startTime + ":00";
    }
    let dateTimeStr = `${bookingDate} ${timeStr}`;
    if (dateTimeStr.includes("-") && dateTimeStr.includes(" ")) {
      const [datePart, timePart] = dateTimeStr.split(" ");
      const formattedDate = datePart.replace(/-/g, "/");
      dateTimeStr = `${formattedDate} ${timePart}`;
    }
    const bookingDateTime = new Date(dateTimeStr);
    if (isNaN(bookingDateTime.getTime())) {
      return null;
    }
    const cancelTime = new Date(bookingDateTime.getTime() - 2 * 60 * 60 * 1e3);
    return cancelTime;
  } catch (error) {
    common_vendor.index.__f__("error", "at utils/countdown.js:46", "计算自动取消时间失败:", error);
    return null;
  }
}
function calculateCountdown(targetTime) {
  if (!targetTime || isNaN(targetTime.getTime())) {
    return {
      isExpired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      formatted: "已过期"
    };
  }
  const now = /* @__PURE__ */ new Date();
  const diff = targetTime.getTime() - now.getTime();
  if (diff <= 0) {
    return {
      isExpired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      formatted: "已过期"
    };
  }
  const totalSeconds = Math.floor(diff / 1e3);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor(totalSeconds % (24 * 60 * 60) / (60 * 60));
  const minutes = Math.floor(totalSeconds % (60 * 60) / 60);
  const seconds = totalSeconds % 60;
  let formatted = "";
  if (days > 0) {
    formatted = `${days}天${hours}小时${minutes}分钟`;
  } else if (hours > 0) {
    formatted = `${hours}小时${minutes}分钟`;
  } else if (minutes > 0) {
    formatted = `${minutes}分钟${seconds}秒`;
  } else {
    formatted = `${seconds}秒`;
  }
  return {
    isExpired: false,
    days,
    hours,
    minutes,
    seconds,
    totalSeconds,
    formatted
  };
}
function getSharingOrderCountdown(sharingOrder) {
  const validStatuses = ["OPEN", "SHARING", "PENDING", "CONFIRMED"];
  if (!sharingOrder || !validStatuses.includes(sharingOrder.status)) {
    return {
      showCountdown: false,
      isExpired: true,
      formatted: "不显示倒计时"
    };
  }
  const cancelTime = getAutoCancelTime(sharingOrder.bookingDate, sharingOrder.startTime);
  if (!cancelTime) {
    return {
      showCountdown: false,
      isExpired: true,
      formatted: "时间格式错误"
    };
  }
  const countdown = calculateCountdown(cancelTime);
  return {
    showCountdown: true,
    cancelTime,
    ...countdown
  };
}
function shouldShowCountdown(order) {
  if (!order) {
    return false;
  }
  const isSharingOrder = order.bookingType === "SHARED" || order.status === "OPEN" || order.status === "SHARING" || order.maxParticipants > 0;
  if (!isSharingOrder) {
    return false;
  }
  const validStatuses = ["OPEN", "SHARING", "PENDING", "CONFIRMED"];
  if (!validStatuses.includes(order.status)) {
    return false;
  }
  const hasTimeFields = !!(order.bookingDate && order.startTime);
  if (!hasTimeFields) {
    return false;
  }
  return true;
}
function formatCountdownShort(countdown) {
  if (!countdown || countdown.isExpired) {
    return "已过期";
  }
  const { days, hours, minutes } = countdown;
  if (days > 0) {
    return `${days}天${hours}时`;
  } else if (hours > 0) {
    return `${hours}时${minutes}分`;
  } else {
    return `${minutes}分`;
  }
}
function getCountdownClass(countdown) {
  if (!countdown || countdown.isExpired) {
    return "countdown-expired";
  }
  const { totalSeconds } = countdown;
  if (totalSeconds < 30 * 60) {
    return "countdown-urgent";
  } else if (totalSeconds < 2 * 60 * 60) {
    return "countdown-warning";
  } else {
    return "countdown-normal";
  }
}
function createCountdownTimer(callback, interval = 1e3) {
  return setInterval(callback, interval);
}
function clearCountdownTimer(timerId) {
  if (timerId) {
    clearInterval(timerId);
  }
}
exports.clearCountdownTimer = clearCountdownTimer;
exports.createCountdownTimer = createCountdownTimer;
exports.formatCountdownShort = formatCountdownShort;
exports.getCountdownClass = getCountdownClass;
exports.getSharingOrderCountdown = getSharingOrderCountdown;
exports.shouldShowCountdown = shouldShowCountdown;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/countdown.js.map
