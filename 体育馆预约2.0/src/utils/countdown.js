/**
 * 拼场订单倒计时工具函数
 * 计算距离自动取消还有多长时间
 */

/**
 * 计算拼场订单的自动取消时间
 * @param {string} bookingDate - 预约日期 (YYYY-MM-DD)
 * @param {string} startTime - 开始时间 (HH:mm:ss)
 * @returns {Date} 自动取消的时间点
 */
export function getAutoCancelTime(bookingDate, startTime) {
  if (!bookingDate || !startTime) {
    return null
  }

  try {
    // 处理不同的时间格式
    let timeStr = startTime
    if (startTime.length === 5) {
      timeStr = startTime + ':00' // HH:mm -> HH:mm:ss
    }

    // iOS兼容性处理：将 "YYYY-MM-DD HH:mm:ss" 转换为 "YYYY/MM/DD HH:mm:ss"
    let dateTimeStr = `${bookingDate} ${timeStr}`
    if (dateTimeStr.includes('-') && dateTimeStr.includes(' ')) {
      // 将日期部分的 - 替换为 /，保持时间部分不变
      const [datePart, timePart] = dateTimeStr.split(' ')
      const formattedDate = datePart.replace(/-/g, '/')
      dateTimeStr = `${formattedDate} ${timePart}`
    }

    // 创建预约时间
    const bookingDateTime = new Date(dateTimeStr)

    // 检查日期是否有效
    if (isNaN(bookingDateTime.getTime())) {
      return null
    }

    // 减去2小时得到自动取消时间
    const cancelTime = new Date(bookingDateTime.getTime() - 2 * 60 * 60 * 1000)

    return cancelTime
  } catch (error) {
    console.error('计算自动取消时间失败:', error)
    return null
  }
}

/**
 * 计算倒计时剩余时间
 * @param {Date} targetTime - 目标时间
 * @returns {Object} 倒计时对象
 */
export function calculateCountdown(targetTime) {
  if (!targetTime || isNaN(targetTime.getTime())) {
    return {
      isExpired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      formatted: '已过期'
    }
  }
  
  const now = new Date()
  const diff = targetTime.getTime() - now.getTime()
  
  // 如果已经过期
  if (diff <= 0) {
    return {
      isExpired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      formatted: '已过期'
    }
  }
  
  // 计算各个时间单位
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / (24 * 60 * 60))
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60
  
  // 格式化显示
  let formatted = ''
  if (days > 0) {
    formatted = `${days}天${hours}小时${minutes}分钟`
  } else if (hours > 0) {
    formatted = `${hours}小时${minutes}分钟`
  } else if (minutes > 0) {
    formatted = `${minutes}分钟${seconds}秒`
  } else {
    formatted = `${seconds}秒`
  }
  
  return {
    isExpired: false,
    days,
    hours,
    minutes,
    seconds,
    totalSeconds,
    formatted
  }
}

/**
 * 获取拼场订单的倒计时信息
 * @param {Object} sharingOrder - 拼场订单对象
 * @returns {Object} 倒计时信息
 */
export function getSharingOrderCountdown(sharingOrder) {
  // 检查订单状态 - 支持多种拼场订单状态
  const validStatuses = ['OPEN', 'SHARING', 'PENDING', 'CONFIRMED']
  if (!sharingOrder || !validStatuses.includes(sharingOrder.status)) {
    return {
      showCountdown: false,
      isExpired: true,
      formatted: '不显示倒计时'
    }
  }

  const cancelTime = getAutoCancelTime(sharingOrder.bookingDate, sharingOrder.startTime)

  if (!cancelTime) {
    return {
      showCountdown: false,
      isExpired: true,
      formatted: '时间格式错误'
    }
  }

  const countdown = calculateCountdown(cancelTime)

  return {
    showCountdown: true,
    cancelTime,
    ...countdown
  }
}

/**
 * 判断是否应该显示倒计时
 * @param {Object} order - 订单对象
 * @returns {boolean} 是否显示倒计时
 */
export function shouldShowCountdown(order) {
  // 只有拼场订单且状态为开放中才显示倒计时
  if (!order) {
    return false
  }

  // 检查是否为拼场订单
  const isSharingOrder = order.bookingType === 'SHARED' ||
                        order.status === 'OPEN' ||
                        order.status === 'SHARING' ||
                        order.maxParticipants > 0

  if (!isSharingOrder) {
    return false
  }

  // 检查状态是否为开放中（放宽条件）
  const validStatuses = ['OPEN', 'SHARING', 'PENDING', 'CONFIRMED']

  if (!validStatuses.includes(order.status)) {
    return false
  }

  // 检查是否有必要的时间字段
  const hasTimeFields = !!(order.bookingDate && order.startTime)

  if (!hasTimeFields) {
    return false
  }

  return true
}

/**
 * 格式化倒计时显示（简短版本）
 * @param {Object} countdown - 倒计时对象
 * @returns {string} 格式化的倒计时文本
 */
export function formatCountdownShort(countdown) {
  if (!countdown || countdown.isExpired) {
    return '已过期'
  }
  
  const { days, hours, minutes } = countdown
  
  if (days > 0) {
    return `${days}天${hours}时`
  } else if (hours > 0) {
    return `${hours}时${minutes}分`
  } else {
    return `${minutes}分`
  }
}

/**
 * 获取倒计时的样式类名
 * @param {Object} countdown - 倒计时对象
 * @returns {string} CSS类名
 */
export function getCountdownClass(countdown) {
  if (!countdown || countdown.isExpired) {
    return 'countdown-expired'
  }
  
  const { totalSeconds } = countdown
  
  // 小于30分钟：紧急状态（红色）
  if (totalSeconds < 30 * 60) {
    return 'countdown-urgent'
  }
  // 小于2小时：警告状态（橙色）
  else if (totalSeconds < 2 * 60 * 60) {
    return 'countdown-warning'
  }
  // 其他：正常状态（绿色）
  else {
    return 'countdown-normal'
  }
}

/**
 * 创建倒计时定时器
 * @param {Function} callback - 回调函数
 * @param {number} interval - 更新间隔（毫秒），默认1000ms
 * @returns {number} 定时器ID
 */
export function createCountdownTimer(callback, interval = 1000) {
  return setInterval(callback, interval)
}

/**
 * 清除倒计时定时器
 * @param {number} timerId - 定时器ID
 */
export function clearCountdownTimer(timerId) {
  if (timerId) {
    clearInterval(timerId)
  }
}
