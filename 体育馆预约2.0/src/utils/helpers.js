// 日期格式化
export function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return '--'

  try {
    // 处理iOS兼容性问题：将"YYYY-MM-DD HH:mm:ss"格式转换为"YYYY-MM-DDTHH:mm:ss"
    let dateString = date
    if (typeof date === 'string') {
      // 如果是"2025-06-28 14:54:59"格式，转换为"2025-06-28T14:54:59"
      dateString = date.replace(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2}:\d{2})$/, '$1T$2')
      // 如果是"2025-06-28 14:54"格式，转换为"2025-06-28T14:54"
      dateString = dateString.replace(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2})$/, '$1T$2')
    }

    const d = new Date(dateString)
    if (isNaN(d.getTime())) return '--'

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')
    const second = String(d.getSeconds()).padStart(2, '0')
    const dayOfWeek = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][d.getDay()]

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute)
      .replace('ss', second)
      .replace('dddd', dayOfWeek)
  } catch (error) {
    console.error('日期格式化错误:', error)
    return '--'
  }
}

// 格式化日期时间
export function formatDateTime(datetime, format = 'YYYY-MM-DD HH:mm') {
  if (!datetime) return '--'
  
  try {
    // 处理iOS兼容性问题：将"YYYY-MM-DD HH:mm:ss"格式转换为"YYYY-MM-DDTHH:mm:ss"
    let dateString = datetime
    if (typeof datetime === 'string') {
      // 如果是"2025-06-28 14:54:59"格式，转换为"2025-06-28T14:54:59"
      dateString = datetime.replace(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2}:\d{2})$/, '$1T$2')
      // 如果是"2025-06-28 14:54"格式，转换为"2025-06-28T14:54"
      dateString = dateString.replace(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2})$/, '$1T$2')
    }
    
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '--'
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    const second = String(date.getSeconds()).padStart(2, '0')
    
    // 如果没有指定格式，默认返回 YYYY-MM-DD HH:mm 格式
    if (format === 'YYYY-MM-DD HH:mm') {
      return `${year}-${month}-${day} ${hour}:${minute}`
    }
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute)
      .replace('ss', second)
  } catch (error) {
    console.error('时间格式化错误:', error)
    return '--'
  }
}

// 价格格式化
export function formatPrice(price) {
  return `¥${Number(price).toFixed(2)}`
}

// 手机号脱敏
export function maskPhone(phone) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 防抖函数
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// 节流函数
export function throttle(func, limit) {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 安全的日期解析函数，处理iOS兼容性问题
 * @param {string|Date} dateInput - 日期输入
 * @returns {Date|null} - 解析后的Date对象，失败返回null
 */
export function safeDateParse(dateInput) {
  if (!dateInput) return null

  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput
  }

  try {
    // 处理iOS兼容性问题：将"YYYY-MM-DD HH:mm:ss"格式转换为"YYYY-MM-DDTHH:mm:ss"
    let dateString = dateInput
    if (typeof dateInput === 'string') {
      // 如果是"2025-06-28 14:54:59"格式，转换为"2025-06-28T14:54:59"
      dateString = dateInput.replace(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2}:\d{2})$/, '$1T$2')
      // 如果是"2025-06-28 14:54"格式，转换为"2025-06-28T14:54"
      dateString = dateString.replace(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2})$/, '$1T$2')
    }

    const date = new Date(dateString)
    return isNaN(date.getTime()) ? null : date
  } catch (error) {
    console.error('日期解析错误:', error, '输入:', dateInput)
    return null
  }
}

/**
 * 通用的时间格式化函数
 * @param {string|Date} dateInput - 日期输入
 * @param {string} format - 格式字符串，默认'YYYY-MM-DD HH:mm'
 * @returns {string} - 格式化后的时间字符串
 */
export function formatTime(dateInput, format = 'YYYY-MM-DD HH:mm') {
  const date = safeDateParse(dateInput)
  if (!date) return '--'

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  const dayOfWeek = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()]

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second)
    .replace('dddd', dayOfWeek)
}

// 生成唯一ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 深拷贝
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item))
  }
  
  if (typeof obj === 'object') {
    const clonedObj = {}
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
}

// 验证手机号
export function validatePhone(phone) {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

// 验证邮箱
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 获取文件扩展名
export function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

// 格式化文件大小
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}