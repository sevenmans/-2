"use strict";
const SLOT_STATUS = {
  AVAILABLE: "AVAILABLE",
  // 可预约
  OCCUPIED: "OCCUPIED",
  // 已占用
  MAINTENANCE: "MAINTENANCE",
  // 维护中
  EXPIRED: "EXPIRED",
  // 已过期
  BOOKED: "BOOKED",
  // 已预订
  SHARING: "SHARING"
  // 拼场中
};
const REFRESH_INTERVALS = {
  CURRENT_DATE: 3e4,
  // 当前日期30秒
  ADJACENT_DATE: 6e4,
  // 相邻日期1分钟
  FUTURE_DATE: 3e5
  // 未来日期5分钟
};
const CACHE_TTL = {
  TODAY: 3e4,
  // 当天30秒（优化：减少缓存时间确保预约后状态及时更新）
  FUTURE: 18e4,
  // 未来3分钟（优化：减少缓存时间）
  HISTORY: 36e5
  // 历史1小时
};
const CACHE_CONFIG = {
  DEFAULT_TTL: CACHE_TTL.TODAY
};
const STATUS_UI_MAP = {
  [SLOT_STATUS.AVAILABLE]: {
    disabled: false,
    buttonText: "预约",
    buttonClass: "available",
    color: "#52C41A",
    backgroundColor: "#F6FFED",
    borderColor: "#B7EB8F"
  },
  [SLOT_STATUS.OCCUPIED]: {
    disabled: true,
    buttonText: "已占用",
    buttonClass: "occupied",
    color: "#F5222D",
    backgroundColor: "#FFF2F0",
    borderColor: "#FFCCC7"
  },
  [SLOT_STATUS.MAINTENANCE]: {
    disabled: true,
    buttonText: "维护中",
    buttonClass: "maintenance",
    color: "#FAAD14",
    backgroundColor: "#FFFBE6",
    borderColor: "#FFE58F"
  },
  [SLOT_STATUS.EXPIRED]: {
    disabled: true,
    buttonText: "已过期",
    buttonClass: "expired",
    color: "#8C8C8C",
    backgroundColor: "#F5F5F5",
    borderColor: "#D9D9D9"
  },
  [SLOT_STATUS.BOOKED]: {
    disabled: true,
    buttonText: "已预订",
    buttonClass: "booked",
    color: "#1890FF",
    backgroundColor: "#F0F5FF",
    borderColor: "#ADC6FF"
  },
  [SLOT_STATUS.SHARING]: {
    disabled: false,
    buttonText: "拼场",
    buttonClass: "sharing",
    color: "#722ED1",
    backgroundColor: "#F9F0FF",
    borderColor: "#D3ADF7"
  }
};
const ERROR_TYPES = {
  NETWORK_ERROR: "NETWORK_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PERMISSION_ERROR: "PERMISSION_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR"
};
const CACHE_KEYS = {
  TIMESLOT: "timeslot_",
  VENUE: "venue_"
};
const REQUEST_CONFIG = {
  MAX_RETRIES: 3,
  // 最大重试次数
  RETRY_DELAY: 1e3
};
const PERFORMANCE_THRESHOLDS = {
  CACHE_SIZE: 100
  // 缓存条目数阈值
};
const STATUS_MAPPING = {
  // 后端可能返回的状态值映射到标准状态
  "available": SLOT_STATUS.AVAILABLE,
  "occupied": SLOT_STATUS.OCCUPIED,
  "maintenance": SLOT_STATUS.MAINTENANCE,
  "expired": SLOT_STATUS.EXPIRED,
  "booked": SLOT_STATUS.BOOKED,
  "sharing": SLOT_STATUS.SHARING,
  // 布尔值映射
  true: SLOT_STATUS.AVAILABLE,
  false: SLOT_STATUS.OCCUPIED,
  // 数字状态映射
  0: SLOT_STATUS.OCCUPIED,
  1: SLOT_STATUS.AVAILABLE,
  2: SLOT_STATUS.MAINTENANCE,
  3: SLOT_STATUS.EXPIRED,
  4: SLOT_STATUS.BOOKED,
  5: SLOT_STATUS.SHARING
};
exports.CACHE_CONFIG = CACHE_CONFIG;
exports.CACHE_KEYS = CACHE_KEYS;
exports.CACHE_TTL = CACHE_TTL;
exports.ERROR_TYPES = ERROR_TYPES;
exports.PERFORMANCE_THRESHOLDS = PERFORMANCE_THRESHOLDS;
exports.REFRESH_INTERVALS = REFRESH_INTERVALS;
exports.REQUEST_CONFIG = REQUEST_CONFIG;
exports.SLOT_STATUS = SLOT_STATUS;
exports.STATUS_MAPPING = STATUS_MAPPING;
exports.STATUS_UI_MAP = STATUS_UI_MAP;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/timeslot-constants.js.map
