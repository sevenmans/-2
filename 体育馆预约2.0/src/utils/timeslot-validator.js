// 时间段数据验证工具
// 提供统一的数据验证和格式化功能，确保数据的一致性和有效性

import { SLOT_STATUS, STATUS_MAPPING, TIME_FORMATS } from './timeslot-constants.js'

export class TimeSlotValidator {
  /**
   * 验证时间段数据格式
   * @param {object} slot - 时间段对象
   * @returns {object} 验证结果 { isValid: boolean, errors: string[] }
   */
  static validateTimeSlot(slot) {
    const errors = []
    
    if (!slot) {
      errors.push('时间段数据不能为空')
      return { isValid: false, errors }
    }
    
    // 必需字段验证
    if (!slot.id && slot.id !== 0) errors.push('缺少时间段ID')
    if (!slot.startTime) errors.push('缺少开始时间')
    if (!slot.endTime) errors.push('缺少结束时间')
    if (!slot.venueId && slot.venueId !== 0) errors.push('缺少场馆ID')
    if (!slot.date) errors.push('缺少日期')
    
    // 状态值验证
    if (slot.status && !Object.values(SLOT_STATUS).includes(slot.status)) {
      errors.push(`无效的状态值: ${slot.status}`)
    }
    
    // 时间格式验证
    if (slot.startTime && !this.isValidTime(slot.startTime)) {
      errors.push(`无效的开始时间格式: ${slot.startTime}`)
    }
    
    if (slot.endTime && !this.isValidTime(slot.endTime)) {
      errors.push(`无效的结束时间格式: ${slot.endTime}`)
    }
    
    // 日期格式验证
    if (slot.date && !this.isValidDate(slot.date)) {
      errors.push(`无效的日期格式: ${slot.date}`)
    }
    
    // 时间逻辑验证
    if (slot.startTime && slot.endTime) {
      if (!this.isValidTimeRange(slot.startTime, slot.endTime)) {
        errors.push('结束时间必须晚于开始时间')
      }
    }
    
    // 价格验证
    if (slot.price !== undefined && slot.price !== null) {
      if (typeof slot.price !== 'number' || slot.price < 0) {
        errors.push('价格必须是非负数')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  /**
   * 验证时间段数组
   * @param {array} timeSlots - 时间段数组
   * @returns {object} 验证结果
   */
  static validateTimeSlotArray(timeSlots) {
    if (!Array.isArray(timeSlots)) {
      return {
        isValid: false,
        errors: ['时间段数据必须是数组'],
        validSlots: [],
        invalidSlots: []
      }
    }
    
    const validSlots = []
    const invalidSlots = []
    const allErrors = []
    
    timeSlots.forEach((slot, index) => {
      const validation = this.validateTimeSlot(slot)
      if (validation.isValid) {
        validSlots.push(slot)
      } else {
        invalidSlots.push({ index, slot, errors: validation.errors })
        allErrors.push(`时间段 ${index}: ${validation.errors.join(', ')}`)
      }
    })
    
    return {
      isValid: invalidSlots.length === 0,
      errors: allErrors,
      validSlots,
      invalidSlots,
      summary: {
        total: timeSlots.length,
        valid: validSlots.length,
        invalid: invalidSlots.length
      }
    }
  }
  
  /**
   * 标准化时间段状态
   * @param {object} slot - 时间段对象
   * @returns {object} 标准化后的时间段对象
   */
  static normalizeSlotStatus(slot) {
    if (!slot) return slot
    
    const normalizedSlot = { ...slot }
    const originalStatus = normalizedSlot.status
    
    console.debug('[TimeSlotValidator] normalizeSlotStatus input', {
      id: normalizedSlot.id,
      originalStatus,
      available: normalizedSlot.available,
      isAvailable: normalizedSlot.isAvailable
    })
    
    // 处理不同的状态字段名
    if (normalizedSlot.available !== undefined) {
      const newStatus = normalizedSlot.available ? SLOT_STATUS.AVAILABLE : SLOT_STATUS.OCCUPIED
      normalizedSlot.status = newStatus
      delete normalizedSlot.available
    }
    
    if (normalizedSlot.isAvailable !== undefined) {
      const newStatus = normalizedSlot.isAvailable ? SLOT_STATUS.AVAILABLE : SLOT_STATUS.OCCUPIED
      normalizedSlot.status = newStatus
      delete normalizedSlot.isAvailable
    }
    
    // 使用状态映射表标准化状态值
    if (normalizedSlot.status !== undefined && STATUS_MAPPING[normalizedSlot.status]) {
      const mappedStatus = STATUS_MAPPING[normalizedSlot.status]
      normalizedSlot.status = mappedStatus
    }
    
    // 如果没有状态字段，设置默认状态
    if (!normalizedSlot.status) {
      normalizedSlot.status = SLOT_STATUS.OCCUPIED
    }
    
    // 确保状态值有效
    if (!Object.values(SLOT_STATUS).includes(normalizedSlot.status)) {
      normalizedSlot.status = SLOT_STATUS.OCCUPIED
    }
    
    
    return normalizedSlot
  }
  
  /**
   * 检查时间段是否过期
   * @param {object} slot - 时间段对象
   * @param {Date} currentTime - 当前时间（可选，默认为当前时间）
   * @param {number} bufferMinutes - 缓冲时间（分钟，默认5分钟）
   * @returns {boolean} 是否过期
   */
  static isSlotExpired(slot, currentTime = new Date(), bufferMinutes = 5) {
    if (!slot.date || !slot.endTime) {
      return false
    }
    
    try {
      // 获取当前日期字符串（YYYY-MM-DD格式）
      const today = currentTime.toISOString().split('T')[0]
      
      // 只对当日的时间段进行过期检查
      if (slot.date !== today) {
        return false
      }
      
      // 🔥 修复：添加缓冲时间，避免过于严格的过期判断
      const bufferTime = bufferMinutes * 60 * 1000 // 转换为毫秒
      const currentTimeWithBuffer = new Date(currentTime.getTime() + bufferTime)
      
      // iOS兼容的日期格式：将 "YYYY-MM-DD HH:mm:ss" 转换为 "YYYY/MM/DD HH:mm:ss"
      const dateStr = slot.date.replace(/-/g, '/')
      const slotEndDateTime = new Date(`${dateStr} ${slot.endTime}:00`)
      
      // 🔥 修复：只有当前时间（含缓冲）超过结束时间才算过期
      const isExpired = currentTimeWithBuffer > slotEndDateTime
      
      return isExpired
    } catch (error) {
      return false
    }
  }
  
  /**
   * 验证时间格式 (HH:mm)
   * @param {string} time - 时间字符串
   * @returns {boolean} 是否有效
   */
  static isValidTime(time) {
    if (typeof time !== 'string') return false
    
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    return timeRegex.test(time)
  }
  
  /**
   * 验证日期格式 (YYYY-MM-DD)
   * @param {string} date - 日期字符串
   * @returns {boolean} 是否有效
   */
  static isValidDate(date) {
    if (typeof date !== 'string') return false
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) return false
    
    // 验证日期是否真实存在
    const dateObj = new Date(date)
    return dateObj.toISOString().split('T')[0] === date
  }
  
  /**
   * 验证时间范围是否有效
   * @param {string} startTime - 开始时间
   * @param {string} endTime - 结束时间
   * @returns {boolean} 是否有效
   */
  static isValidTimeRange(startTime, endTime) {
    if (!this.isValidTime(startTime) || !this.isValidTime(endTime)) {
      return false
    }
    
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute
    
    return endMinutes > startMinutes
  }
  
  /**
   * 格式化时间段数据
   * @param {object} slot - 时间段对象
   * @returns {object} 格式化后的时间段对象
   */
  static formatTimeSlot(slot) {
    if (!slot) return slot
    
    let formattedSlot = { ...slot }
    
    // 标准化状态
    formattedSlot = this.normalizeSlotStatus(formattedSlot)
    
    // 确保数字类型字段
    if (formattedSlot.id) {
      formattedSlot.id = Number(formattedSlot.id)
    }
    
    if (formattedSlot.venueId) {
      formattedSlot.venueId = Number(formattedSlot.venueId)
    }
    
    if (formattedSlot.price) {
      formattedSlot.price = Number(formattedSlot.price)
    }
    
    if (formattedSlot.orderId) {
      formattedSlot.orderId = Number(formattedSlot.orderId)
    }
    
    // 格式化时间字段
    if (formattedSlot.startTime) {
      formattedSlot.startTime = this.formatTime(formattedSlot.startTime)
    }
    
    if (formattedSlot.endTime) {
      formattedSlot.endTime = this.formatTime(formattedSlot.endTime)
    }
    
    // 格式化日期字段
    if (formattedSlot.date) {
      formattedSlot.date = this.formatDate(formattedSlot.date)
    }
    
    return formattedSlot
  }
  
  /**
   * 格式化时间字符串
   * @param {string} time - 时间字符串
   * @returns {string} 格式化后的时间字符串 (HH:mm)
   */
  static formatTime(time) {
    if (!time) return time
    
    // 如果已经是正确格式，直接返回
    if (this.isValidTime(time)) {
      return time
    }
    
    // 尝试解析其他格式
    try {
      const timeObj = new Date(`2000-01-01 ${time}`);
      if (!isNaN(timeObj.getTime())) {
        const hours = timeObj.getHours().toString().padStart(2, '0')
        const minutes = timeObj.getMinutes().toString().padStart(2, '0')
        return `${hours}:${minutes}`
      }
    } catch (error) {
    }
    
    return time
  }
  
  /**
   * 格式化日期字符串
   * @param {string} date - 日期字符串
   * @returns {string} 格式化后的日期字符串 (YYYY-MM-DD)
   */
  static formatDate(date) {
    if (!date) return date
    
    // 如果已经是正确格式，直接返回
    if (this.isValidDate(date)) {
      return date
    }
    
    // 尝试解析其他格式
    try {
      const dateObj = new Date(date)
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0]
      }
    } catch (error) {
    }
    
    return date
  }
  
  /**
   * 检查时间段冲突
   * @param {array} timeSlots - 时间段数组
   * @returns {array} 冲突的时间段对
   */
  static findConflicts(timeSlots) {
    const conflicts = []
    
    for (let i = 0; i < timeSlots.length; i++) {
      for (let j = i + 1; j < timeSlots.length; j++) {
        const slot1 = timeSlots[i]
        const slot2 = timeSlots[j]
        
        // 同一场馆同一日期的时间段才可能冲突
        if (slot1.venueId === slot2.venueId && slot1.date === slot2.date) {
          if (this.isTimeOverlap(slot1.startTime, slot1.endTime, slot2.startTime, slot2.endTime)) {
            conflicts.push([slot1, slot2])
          }
        }
      }
    }
    
    return conflicts
  }
  
  /**
   * 检查两个时间段是否重叠
   * @param {string} start1 - 第一个时间段开始时间
   * @param {string} end1 - 第一个时间段结束时间
   * @param {string} start2 - 第二个时间段开始时间
   * @param {string} end2 - 第二个时间段结束时间
   * @returns {boolean} 是否重叠
   */
  static isTimeOverlap(start1, end1, start2, end2) {
    const toMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }
    
    const start1Minutes = toMinutes(start1)
    const end1Minutes = toMinutes(end1)
    const start2Minutes = toMinutes(start2)
    const end2Minutes = toMinutes(end2)
    
    return start1Minutes < end2Minutes && start2Minutes < end1Minutes
  }
}

// 导出验证器实例方法（便于直接调用）
export const validateTimeSlot = TimeSlotValidator.validateTimeSlot.bind(TimeSlotValidator)
export const validateTimeSlotArray = TimeSlotValidator.validateTimeSlotArray.bind(TimeSlotValidator)
export const normalizeSlotStatus = TimeSlotValidator.normalizeSlotStatus.bind(TimeSlotValidator)
export const isSlotExpired = TimeSlotValidator.isSlotExpired.bind(TimeSlotValidator)
export const formatTimeSlot = TimeSlotValidator.formatTimeSlot.bind(TimeSlotValidator)
export const findConflicts = TimeSlotValidator.findConflicts.bind(TimeSlotValidator)

// 默认导出验证器类
export default TimeSlotValidator