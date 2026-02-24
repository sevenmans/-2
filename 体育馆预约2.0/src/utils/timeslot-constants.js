// 时间段常量定义文件
// 统一管理所有时间段相关的常量，确保前端各模块使用一致的状态值和配置

// 时间段状态常量
export const SLOT_STATUS = {
  AVAILABLE: 'AVAILABLE',     // 可预约
  OCCUPIED: 'OCCUPIED',       // 已占用
  MAINTENANCE: 'MAINTENANCE', // 维护中
  EXPIRED: 'EXPIRED',         // 已过期
  BOOKED: 'BOOKED',          // 已预订
  SHARING: 'SHARING'          // 拼场中
}

// 刷新间隔常量（毫秒）
export const REFRESH_INTERVALS = {
  CURRENT_DATE: 30000,    // 当前日期30秒
  ADJACENT_DATE: 60000,   // 相邻日期1分钟
  FUTURE_DATE: 300000     // 未来日期5分钟
}

// 缓存TTL常量（毫秒）
export const CACHE_TTL = {
  TODAY: 30000,           // 当天30秒（优化：减少缓存时间确保预约后状态及时更新）
  FUTURE: 180000,         // 未来3分钟（优化：减少缓存时间）
  HISTORY: 3600000        // 历史1小时
}

// 缓存配置常量（为了兼容性）
export const CACHE_CONFIG = {
  DEFAULT_TTL: CACHE_TTL.TODAY,
  TODAY_TTL: CACHE_TTL.TODAY,
  FUTURE_TTL: CACHE_TTL.FUTURE,
  HISTORY_TTL: CACHE_TTL.HISTORY
}

// UI状态映射
export const STATUS_UI_MAP = {
  [SLOT_STATUS.AVAILABLE]: {
    disabled: false,
    buttonText: '预约',
    buttonClass: 'available',
    color: '#52C41A',
    backgroundColor: '#F6FFED',
    borderColor: '#B7EB8F'
  },
  [SLOT_STATUS.OCCUPIED]: {
    disabled: true,
    buttonText: '已占用',
    buttonClass: 'occupied',
    color: '#F5222D',
    backgroundColor: '#FFF2F0',
    borderColor: '#FFCCC7'
  },
  [SLOT_STATUS.MAINTENANCE]: {
    disabled: true,
    buttonText: '维护中',
    buttonClass: 'maintenance',
    color: '#FAAD14',
    backgroundColor: '#FFFBE6',
    borderColor: '#FFE58F'
  },
  [SLOT_STATUS.EXPIRED]: {
    disabled: true,
    buttonText: '已过期',
    buttonClass: 'expired',
    color: '#8C8C8C',
    backgroundColor: '#F5F5F5',
    borderColor: '#D9D9D9'
  },
  [SLOT_STATUS.BOOKED]: {
    disabled: true,
    buttonText: '已预订',
    buttonClass: 'booked',
    color: '#1890FF',
    backgroundColor: '#F0F5FF',
    borderColor: '#ADC6FF'
  },
  [SLOT_STATUS.SHARING]: {
    disabled: false,
    buttonText: '拼场',
    buttonClass: 'sharing',
    color: '#722ED1',
    backgroundColor: '#F9F0FF',
    borderColor: '#D3ADF7'
  }
}

// 时间段操作类型
export const SLOT_OPERATION = {
  BOOK: 'BOOK',           // 预约
  CANCEL: 'CANCEL',       // 取消
  JOIN_SHARING: 'JOIN_SHARING', // 加入拼场
  CREATE_SHARING: 'CREATE_SHARING', // 创建拼场
  REFRESH: 'REFRESH'      // 刷新
}

// 错误类型常量
export const ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
}

// 缓存键前缀
export const CACHE_KEYS = {
  TIMESLOT: 'timeslot_',
  VENUE: 'venue_',
  USER: 'user_',
  BOOKING: 'booking_'
}

// 请求配置常量
export const REQUEST_CONFIG = {
  TIMEOUT: 10000,         // 请求超时时间10秒
  MAX_RETRIES: 3,         // 最大重试次数
  RETRY_DELAY: 1000,      // 重试延迟1秒
  DEBOUNCE_DELAY: 300,    // 防抖延迟300ms
  THROTTLE_INTERVAL: 1000 // 节流间隔1秒
}

// 时间格式常量
export const TIME_FORMATS = {
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  DISPLAY_DATE: 'MM月DD日',
  DISPLAY_TIME: 'HH:mm',
  DISPLAY_DATETIME: 'MM月DD日 HH:mm'
}

// 性能监控阈值
export const PERFORMANCE_THRESHOLDS = {
  API_RESPONSE_TIME: 2000,    // API响应时间阈值2秒
  RENDER_TIME: 100,           // 渲染时间阈值100ms
  MEMORY_USAGE: 50 * 1024 * 1024, // 内存使用阈值50MB
  CACHE_SIZE: 100             // 缓存条目数阈值
}

// 默认配置
export const DEFAULT_CONFIG = {
  PAGE_SIZE: 20,              // 默认分页大小
  AUTO_REFRESH: true,         // 默认开启自动刷新
  CACHE_ENABLED: true,        // 默认开启缓存
  LOADING_DELAY: 200,         // 加载延迟200ms
  ERROR_RETRY_ENABLED: true   // 默认开启错误重试
}

// 状态转换映射（用于兼容后端不同的状态字段）
export const STATUS_MAPPING = {
  // 后端可能返回的状态值映射到标准状态
  'available': SLOT_STATUS.AVAILABLE,
  'occupied': SLOT_STATUS.OCCUPIED,
  'maintenance': SLOT_STATUS.MAINTENANCE,
  'expired': SLOT_STATUS.EXPIRED,
  'booked': SLOT_STATUS.BOOKED,
  'sharing': SLOT_STATUS.SHARING,
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
}

// 导出所有常量的集合（便于批量导入）
export const TIMESLOT_CONSTANTS = {
  SLOT_STATUS,
  REFRESH_INTERVALS,
  CACHE_TTL,
  STATUS_UI_MAP,
  SLOT_OPERATION,
  ERROR_TYPES,
  CACHE_KEYS,
  REQUEST_CONFIG,
  TIME_FORMATS,
  PERFORMANCE_THRESHOLDS,
  DEFAULT_CONFIG,
  STATUS_MAPPING
}

// 默认导出主要常量
export default {
  SLOT_STATUS,
  REFRESH_INTERVALS,
  CACHE_TTL,
  STATUS_UI_MAP,
  ERROR_TYPES
}