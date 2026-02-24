"use strict";
const common_vendor = require("../common/vendor.js");
const utils_request = require("../utils/request.js");
const utils_timeslotConstants = require("../utils/timeslot-constants.js");
const utils_cacheManager = require("../utils/cache-manager.js");
function standardizeResponse(response) {
  var _a, _b;
  common_vendor.index.__f__("debug", "at api/timeslot.js:8", "[TimeslotAPI] 标准化响应数据");
  let data = [];
  let success = false;
  let message = "请求失败";
  try {
    if ((response == null ? void 0 : response.success) && (response == null ? void 0 : response.data)) {
      data = Array.isArray(response.data) ? response.data : [];
      success = true;
      message = response.message || "请求成功";
    } else if (((_a = response == null ? void 0 : response.data) == null ? void 0 : _a.success) && ((_b = response == null ? void 0 : response.data) == null ? void 0 : _b.data)) {
      data = Array.isArray(response.data.data) ? response.data.data : [];
      success = true;
      message = response.data.message || "请求成功";
    } else if (Array.isArray(response)) {
      data = response;
      success = true;
      message = "请求成功";
    } else if ((response == null ? void 0 : response.data) && Array.isArray(response.data)) {
      data = response.data;
      success = true;
      message = response.message || "请求成功";
    } else if (response == null ? void 0 : response.data) {
      data = Array.isArray(response.data) ? response.data : [];
      success = !!response.data;
      message = response.message || (success ? "请求成功" : "数据格式错误");
    }
    if (success && data.length > 0) {
      data = validateTimeSlotData(data);
    }
  } catch (error) {
    common_vendor.index.__f__("error", "at api/timeslot.js:49", "[API] 响应标准化失败:", error);
    success = false;
    message = "数据处理失败";
    data = [];
  }
  const result = { data, success, message };
  common_vendor.index.__f__("debug", "at api/timeslot.js:56", "[TimeslotAPI] 标准化完成:", { success: result.success, count: result.data.length });
  return result;
}
function validateTimeSlotData(data) {
  common_vendor.index.__f__("debug", "at api/timeslot.js:62", "[TimeslotAPI] 验证时间段数据");
  if (!Array.isArray(data)) {
    common_vendor.index.__f__("warn", "at api/timeslot.js:65", "[API] 时间段数据不是数组格式");
    return [];
  }
  return data.map((slot) => {
    const standardSlot = {
      id: slot.id || slot.timeSlotId || slot.slotId,
      venueId: slot.venueId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      price: slot.price || 0,
      status: slot.status || utils_timeslotConstants.SLOT_STATUS.AVAILABLE,
      // 🎯 关键修复：正确处理拼场状态
      isBooked: slot.isBooked || slot.status === utils_timeslotConstants.SLOT_STATUS.BOOKED || slot.status === utils_timeslotConstants.SLOT_STATUS.SHARING || slot.status === utils_timeslotConstants.SLOT_STATUS.RESERVED || slot.status === "BOOKED" || slot.status === "SHARING" || slot.status === "RESERVED",
      isAvailable: slot.isAvailable !== false && slot.status === utils_timeslotConstants.SLOT_STATUS.AVAILABLE && slot.status !== utils_timeslotConstants.SLOT_STATUS.BOOKED && slot.status !== utils_timeslotConstants.SLOT_STATUS.SHARING && slot.status !== utils_timeslotConstants.SLOT_STATUS.RESERVED && slot.status !== "BOOKED" && slot.status !== "SHARING" && slot.status !== "RESERVED"
    };
    Object.keys(standardSlot).forEach((key) => {
      if (standardSlot[key] === void 0) {
        delete standardSlot[key];
      }
    });
    return standardSlot;
  }).filter((slot) => slot.id && slot.startTime && slot.endTime);
}
function getVenueTimeSlots(venueId, date, options = {}) {
  const {
    forceRefresh = false,
    useCache = true,
    loading = true,
    _t = null,
    // 🔥 接收时间戳参数
    ...otherOptions
  } = options;
  const cacheKey = utils_cacheManager.default.generateTimeSlotKey(venueId, date);
  if (!forceRefresh && useCache) {
    const cached = utils_cacheManager.default.get(cacheKey);
    if (cached) {
      common_vendor.index.__f__("debug", "at api/timeslot.js:124", "[TimeslotAPI] 命中缓存");
      return Promise.resolve(cached);
    }
  }
  const requestOptions = {
    cache: useCache && !forceRefresh,
    cacheTTL: forceRefresh ? 0 : utils_timeslotConstants.CACHE_CONFIG.DEFAULT_TTL,
    loading,
    ...utils_timeslotConstants.REQUEST_CONFIG.DEFAULT_OPTIONS,
    ...otherOptions
  };
  const params = forceRefresh ? {
    _t: _t || Date.now(),
    // 使用传入的时间戳或生成新的
    _nocache: 1
  } : {};
  if (forceRefresh) {
    requestOptions.headers = {
      ...requestOptions.headers,
      ...utils_timeslotConstants.REQUEST_CONFIG.NO_CACHE_HEADERS
    };
    utils_cacheManager.default.delete(cacheKey);
  }
  common_vendor.index.__f__("debug", "at api/timeslot.js:152", "[TimeslotAPI] 获取时间段", { venueId, date, forceRefresh });
  return utils_request.get(`/timeslots/venue/${venueId}/date/${date}`, params, requestOptions).then((response) => {
    const standardizedResponse = standardizeResponse(response);
    if (standardizedResponse.success && standardizedResponse.data.length > 0 && useCache) {
      utils_cacheManager.default.set(cacheKey, standardizedResponse, utils_timeslotConstants.CACHE_CONFIG.DEFAULT_TTL);
    }
    return standardizedResponse;
  }).catch((error) => {
    common_vendor.index.__f__("error", "at api/timeslot.js:167", "[API] 获取时间段失败:", error);
    return {
      data: [],
      success: false,
      message: error.message || "获取时间段失败"
    };
  });
}
function getAvailableTimeSlots(venueId, date, options = {}) {
  common_vendor.index.__f__("debug", "at api/timeslot.js:178", "[TimeslotAPI] 获取可用时间段", { venueId, date });
  const requestOptions = {
    ...utils_timeslotConstants.REQUEST_CONFIG.DEFAULT_OPTIONS,
    ...options
  };
  return utils_request.get(`/timeslots/venue/${venueId}/date/${date}/available`, {}, requestOptions).then((response) => {
    const standardizedResponse = standardizeResponse(response);
    return standardizedResponse;
  }).catch((error) => {
    common_vendor.index.__f__("error", "at api/timeslot.js:192", "[API] 获取可用时间段失败:", error);
    return {
      data: [],
      success: false,
      message: error.message || "获取可用时间段失败"
    };
  });
}
function checkTimeSlotAvailability(venueId, date, startTime, endTime) {
  common_vendor.index.__f__("debug", "at api/timeslot.js:203", "[TimeslotAPI] 检查时间段可用性", { venueId, date, startTime, endTime });
  const params = {
    venueId,
    date,
    startTime,
    endTime
  };
  return utils_request.get("/timeslots/check-availability", params).then((response) => {
    var _a, _b, _c;
    const result = {
      available: false,
      success: false,
      message: "检查失败"
    };
    try {
      if (response == null ? void 0 : response.success) {
        result.available = !!((_a = response.data) == null ? void 0 : _a.available);
        result.success = true;
        result.message = response.message || "检查完成";
      } else if ((_b = response == null ? void 0 : response.data) == null ? void 0 : _b.success) {
        result.available = !!((_c = response.data.data) == null ? void 0 : _c.available);
        result.success = true;
        result.message = response.data.message || "检查完成";
      } else if ((response == null ? void 0 : response.available) !== void 0) {
        result.available = !!response.available;
        result.success = true;
        result.message = "检查完成";
      }
    } catch (error) {
      common_vendor.index.__f__("error", "at api/timeslot.js:236", "[API] 可用性检查响应处理失败:", error);
    }
    return result;
  }).catch((error) => {
    common_vendor.index.__f__("error", "at api/timeslot.js:242", "[API] 检查时间段可用性失败:", error);
    return {
      available: false,
      success: false,
      message: error.message || "检查时间段可用性失败"
    };
  });
}
function generateTimeSlots(venueId, date, config = {}) {
  if (config.debug)
    common_vendor.index.__f__("debug", "at api/timeslot.js:253", "[TimeslotAPI] 生成时间段", { venueId, date });
  const data = {
    venueId,
    date,
    ...config
  };
  return utils_request.post("/timeslots/generate", data).then((response) => {
    const standardizedResponse = standardizeResponse(response);
    return standardizedResponse;
  }).catch((error) => {
    common_vendor.index.__f__("error", "at api/timeslot.js:268", "[API] 生成时间段失败:", error);
    return {
      data: [],
      success: false,
      message: error.message || "生成时间段失败"
    };
  });
}
function batchCreateTimeSlots(venueId, date, timeSlots) {
  common_vendor.index.__f__("debug", "at api/timeslot.js:279", "[TimeslotAPI] 批量创建时间段", { venueId, date, count: timeSlots.length });
  return utils_request.post(`/timeslots/venue/${venueId}/date/${date}/batch-create`, {
    timeSlots
  }).then((response) => {
    const standardizedResponse = standardizeResponse(response);
    return standardizedResponse;
  }).catch((error) => {
    common_vendor.index.__f__("error", "at api/timeslot.js:290", "[API] 批量创建时间段失败:", error);
    return {
      data: [],
      success: false,
      message: error.message || "批量创建时间段失败"
    };
  });
}
function syncFrontendTimeSlots(venueId, date, timeSlots) {
  common_vendor.index.__f__("log", "at api/timeslot.js:301", "[API] 同步前端时间段到后端:", { venueId, date, slotsCount: timeSlots.length });
  const backendSlots = timeSlots.map((slot) => ({
    venueId: parseInt(venueId),
    date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    price: slot.price,
    status: utils_timeslotConstants.SLOT_STATUS.AVAILABLE
  }));
  return batchCreateTimeSlots(venueId, date, backendSlots).then((response) => {
    return response;
  }).catch((error) => {
    common_vendor.index.__f__("error", "at api/timeslot.js:319", "[API] 同步前端时间段失败:", error);
    return {
      data: [],
      success: false,
      message: error.message || "同步前端时间段失败"
    };
  });
}
function generateWeekTimeSlots(venueId) {
  common_vendor.index.__f__("debug", "at api/timeslot.js:330", "[TimeslotAPI] 生成未来一周时间段", { venueId });
  return utils_request.post(`/timeslots/venue/${venueId}/generate-week`).then((response) => {
    const standardizedResponse = standardizeResponse(response);
    return standardizedResponse;
  }).catch((error) => {
    common_vendor.index.__f__("error", "at api/timeslot.js:339", "[API] 生成未来一周时间段失败:", error);
    return {
      data: [],
      success: false,
      message: error.message || "生成未来一周时间段失败"
    };
  });
}
function updateTimeSlotStatus(timeSlotId, status, options = {}) {
  common_vendor.index.__f__("debug", "at api/timeslot.js:350", "[TimeslotAPI] 更新时间段状态", { timeSlotId, status });
  const data = {
    status,
    ...options
  };
  return utils_request.patch(`/timeslots/${timeSlotId}/status`, data).then((response) => {
    var _a;
    const result = {
      success: false,
      message: "更新失败",
      data: null
    };
    try {
      if (response == null ? void 0 : response.success) {
        result.success = true;
        result.message = response.message || "更新成功";
        result.data = response.data;
      } else if ((_a = response == null ? void 0 : response.data) == null ? void 0 : _a.success) {
        result.success = true;
        result.message = response.data.message || "更新成功";
        result.data = response.data.data;
      } else if ((response == null ? void 0 : response.status) === "success" || (response == null ? void 0 : response.code) === 200) {
        result.success = true;
        result.message = response.message || "更新成功";
        result.data = response.data || response;
      }
    } catch (error) {
      common_vendor.index.__f__("error", "at api/timeslot.js:381", "[API] 状态更新响应处理失败:", error);
    }
    return result;
  }).catch((error) => {
    common_vendor.index.__f__("error", "at api/timeslot.js:387", "[API] 更新时间段状态失败:", error);
    return {
      success: false,
      message: error.message || "更新时间段状态失败",
      data: null
    };
  });
}
function refreshTimeSlotStatus(venueId, date, options = {}) {
  common_vendor.index.__f__("debug", "at api/timeslot.js:398", "[TimeslotAPI] 刷新时间段状态", { venueId, date });
  const {
    clearCache = true,
    forceRefresh = true,
    ...otherOptions
  } = options;
  if (clearCache) {
    const cacheKey = utils_cacheManager.default.generateTimeSlotKey(venueId, date);
    utils_cacheManager.default.delete(cacheKey);
    common_vendor.index.__f__("log", "at api/timeslot.js:410", "[API] 已清除时间段缓存");
  }
  return utils_request.get(`/timeslots/venue/${venueId}/date/${date}/refresh`).then((response) => {
    var _a, _b, _c;
    {
      common_vendor.index.__f__("debug", "at api/timeslot.js:417", "[TimeslotAPI] 刷新API响应检查");
    }
    let result = {
      data: [],
      success: false,
      message: "刷新失败"
    };
    try {
      if ((response == null ? void 0 : response.success) && Array.isArray(response == null ? void 0 : response.data)) {
        result = {
          data: response.data,
          success: true,
          message: response.message || "刷新成功"
        };
      } else if (((_a = response == null ? void 0 : response.data) == null ? void 0 : _a.success) && Array.isArray((_b = response == null ? void 0 : response.data) == null ? void 0 : _b.data)) {
        result = {
          data: response.data.data,
          success: true,
          message: response.data.message || "刷新成功"
        };
      } else if (Array.isArray(response == null ? void 0 : response.data)) {
        result = {
          data: response.data,
          success: true,
          message: "刷新成功"
        };
      } else if (Array.isArray(response)) {
        result = {
          data: response,
          success: true,
          message: "刷新成功"
        };
      } else {
        common_vendor.index.__f__("warn", "at api/timeslot.js:460", "[TimeslotAPI] 未匹配任何已知格式，响应结构:", {
          responseType: typeof response,
          hasSuccess: "success" in response,
          successValue: response == null ? void 0 : response.success,
          hasData: "data" in response,
          dataType: typeof (response == null ? void 0 : response.data),
          isDataArray: Array.isArray(response == null ? void 0 : response.data)
        });
      }
    } catch (error) {
      common_vendor.index.__f__("error", "at api/timeslot.js:470", "[TimeslotAPI] 处理刷新响应失败:", error);
    }
    common_vendor.index.__f__("debug", "at api/timeslot.js:473", "[TimeslotAPI] 刷新完成", { success: result.success, count: ((_c = result.data) == null ? void 0 : _c.length) || 0 });
    return result;
  }).catch((error) => {
    common_vendor.index.__f__("error", "at api/timeslot.js:477", "[API] 刷新时间段状态失败:", error);
    common_vendor.index.__f__("log", "at api/timeslot.js:480", "[API] 回退到getVenueTimeSlots方法");
    return getVenueTimeSlots(venueId, date, {
      forceRefresh: true,
      useCache: false,
      ...otherOptions
    }).then((response) => {
      common_vendor.index.__f__("log", "at api/timeslot.js:486", "[API] 回退方法成功");
      return response;
    }).catch((fallbackError) => {
      common_vendor.index.__f__("error", "at api/timeslot.js:489", "[API] 回退方法也失败:", fallbackError);
      return {
        data: [],
        success: false,
        message: fallbackError.message || error.message || "刷新失败"
      };
    });
  });
}
const timeslotApi = {
  getVenueTimeSlots,
  getAvailableTimeSlots,
  checkTimeSlotAvailability,
  generateTimeSlots,
  batchCreateTimeSlots,
  syncFrontendTimeSlots,
  generateWeekTimeSlots,
  updateTimeSlotStatus,
  refreshTimeSlotStatus
};
exports.generateTimeSlots = generateTimeSlots;
exports.getVenueTimeSlots = getVenueTimeSlots;
exports.timeslotApi = timeslotApi;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/timeslot.js.map
