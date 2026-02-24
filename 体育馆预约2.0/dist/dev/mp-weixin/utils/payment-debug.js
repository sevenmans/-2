"use strict";
const common_vendor = require("../common/vendor.js");
function debugOrderAmount(orderData) {
  const { venueId, timeSlot, duration = 1, price = 0 } = orderData || {};
  const totalAmount = price * duration;
  const debugInfo = {
    venueId,
    timeSlot,
    duration,
    unitPrice: price,
    totalAmount,
    calculation: `${price} × ${duration} = ${totalAmount}`,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleString()
  };
  return debugInfo;
}
async function debugTimeSlotRefresh(venueId, date) {
  var _a;
  const startTime = Date.now();
  try {
    const response = await new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: [
            { id: 1, time: "09:00-10:00", status: "available", price: 100 },
            { id: 2, time: "10:00-11:00", status: "occupied", price: 100 },
            { id: 3, time: "11:00-12:00", status: "maintenance", price: 100 }
          ]
        });
      }, 500);
    });
    const endTime = Date.now();
    const duration = endTime - startTime;
    const debugInfo = {
      venueId,
      date,
      success: true,
      responseTime: `${duration}ms`,
      dataCount: ((_a = response.data) == null ? void 0 : _a.length) || 0,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleString(),
      response
    };
    return debugInfo;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const debugInfo = {
      venueId,
      date,
      success: false,
      responseTime: `${duration}ms`,
      error: error.message,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleString()
    };
    common_vendor.index.__f__("error", "at utils/payment-debug.js:90", "刷新失败:", debugInfo);
    return debugInfo;
  }
}
async function forceRefreshTimeSlots(venueId, date, clearCache = true) {
  var _a;
  const startTime = Date.now();
  try {
    if (clearCache) {
      common_vendor.index.removeStorageSync(`timeslots_${venueId}_${date}`);
    }
    const response = await new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: [
            { id: 1, time: "09:00-10:00", status: "available", price: 100 },
            { id: 2, time: "10:00-11:00", status: "available", price: 100 },
            { id: 3, time: "11:00-12:00", status: "occupied", price: 100 },
            { id: 4, time: "14:00-15:00", status: "maintenance", price: 100 }
          ],
          fromCache: false,
          refreshTime: (/* @__PURE__ */ new Date()).toISOString()
        });
      }, 800);
    });
    const endTime = Date.now();
    const duration = endTime - startTime;
    const debugInfo = {
      venueId,
      date,
      clearCache,
      success: true,
      responseTime: `${duration}ms`,
      dataCount: ((_a = response.data) == null ? void 0 : _a.length) || 0,
      fromCache: response.fromCache,
      refreshTime: response.refreshTime,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleString(),
      response
    };
    return debugInfo;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const debugInfo = {
      venueId,
      date,
      clearCache,
      success: false,
      responseTime: `${duration}ms`,
      error: error.message,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleString()
    };
    common_vendor.index.__f__("error", "at utils/payment-debug.js:164", "强制刷新失败:", debugInfo);
    return debugInfo;
  }
}
exports.debugOrderAmount = debugOrderAmount;
exports.debugTimeSlotRefresh = debugTimeSlotRefresh;
exports.forceRefreshTimeSlots = forceRefreshTimeSlots;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/payment-debug.js.map
