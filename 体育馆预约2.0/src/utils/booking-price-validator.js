/**
 * 预约价格验证工具
 * 用于验证预约创建时的价格计算和数据传递
 */

// 验证时间段价格计算
export function validateSlotPricing(slots, venue) {
  
  const results = {
    totalSlots: slots.length,
    validSlots: 0,
    invalidSlots: 0,
    totalPrice: 0,
    details: [],
    issues: []
  }
  
  slots.forEach((slot, index) => {
    const slotResult = {
      index: index + 1,
      timeRange: `${slot.startTime}-${slot.endTime}`,
      slotPrice: slot.price,
      slotPricePerHour: slot.pricePerHour,
      venuePrice: venue?.price,
      calculatedPrice: 0,
      method: '',
      valid: false
    }
    
    // 计算价格逻辑（与前端保持一致）
    if (slot.price && slot.price > 0) {
      slotResult.calculatedPrice = parseFloat(slot.price)
      slotResult.method = 'slot.price'
      slotResult.valid = true
    } else if (slot.pricePerHour && slot.pricePerHour > 0) {
      slotResult.calculatedPrice = parseFloat(slot.pricePerHour)
      slotResult.method = 'slot.pricePerHour'
      slotResult.valid = true
    } else if (venue?.price && venue.price > 0) {
      slotResult.calculatedPrice = parseFloat(venue.price) / 2 // 半小时价格
      slotResult.method = 'venue.price/2'
      slotResult.valid = true
    } else {
      slotResult.calculatedPrice = 60 // 默认价格
      slotResult.method = 'default'
      slotResult.valid = false
      results.issues.push(`时间段${index + 1}使用默认价格`)
    }
    
    if (slotResult.valid) {
      results.validSlots++
    } else {
      results.invalidSlots++
    }
    
    results.totalPrice += slotResult.calculatedPrice
    results.details.push(slotResult)
    
  })
  
  
  return results
}

// 验证预约数据完整性
export function validateBookingData(bookingData) {
  
  const validation = {
    valid: true,
    errors: [],
    warnings: [],
    data: bookingData
  }
  
  // 必需字段检查
  const requiredFields = ['venueId', 'date', 'startTime', 'endTime', 'price']
  
  requiredFields.forEach(field => {
    if (!bookingData[field]) {
      validation.errors.push(`缺少必需字段: ${field}`)
      validation.valid = false
    }
  })
  
  // 价格检查
  if (bookingData.price !== undefined) {
    const price = parseFloat(bookingData.price)
    if (isNaN(price) || price <= 0) {
      validation.errors.push(`价格无效: ${bookingData.price}`)
      validation.valid = false
    } else if (price < 50) {
      validation.warnings.push(`价格可能过低: ¥${price}`)
    } else if (price > 1000) {
      validation.warnings.push(`价格可能过高: ¥${price}`)
    }
  }
  
  // 时间格式检查
  if (bookingData.startTime && bookingData.endTime) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    
    if (!timeRegex.test(bookingData.startTime)) {
      validation.errors.push(`开始时间格式错误: ${bookingData.startTime}`)
      validation.valid = false
    }
    
    if (!timeRegex.test(bookingData.endTime)) {
      validation.errors.push(`结束时间格式错误: ${bookingData.endTime}`)
      validation.valid = false
    }
    
    // 时间逻辑检查
    if (timeRegex.test(bookingData.startTime) && timeRegex.test(bookingData.endTime)) {
      const [startHour, startMin] = bookingData.startTime.split(':').map(Number)
      const [endHour, endMin] = bookingData.endTime.split(':').map(Number)
      
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin
      
      if (endMinutes <= startMinutes) {
        validation.errors.push('结束时间必须晚于开始时间')
        validation.valid = false
      }
    }
  }
  
  // 日期格式检查
  if (bookingData.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(bookingData.date)) {
      validation.errors.push(`日期格式错误: ${bookingData.date}`)
      validation.valid = false
    }
  }
  
  if (validation.errors.length > 0) {
  }
  if (validation.warnings.length > 0) {
  }
  
  return validation
}

// 模拟后端价格计算
export function simulateBackendPricing(bookingData, venue) {
  
  const frontendPrice = parseFloat(bookingData.price) || 0
  const venuePrice = parseFloat(venue?.price) || 120 // 默认120元/小时
  
  // 模拟后端逻辑
  const finalPrice = frontendPrice > 0 ? frontendPrice : venuePrice
  
  
  return {
    frontendPrice,
    venuePrice,
    finalPrice,
    usedFrontendPrice: frontendPrice > 0
  }
}

// 综合验证函数
export function validateCompleteBookingFlow(slots, venue, bookingForm) {
  
  const results = {
    slotPricing: null,
    bookingData: null,
    backendSimulation: null,
    overall: false
  }
  
  try {
    // 1. 验证时间段价格
    results.slotPricing = validateSlotPricing(slots, venue)
    
    // 2. 构建预约数据
    const firstSlot = slots[0]
    const lastSlot = slots[slots.length - 1]
    
    const mockBookingData = {
      venueId: venue?.id || 25,
      date: '2025-07-19',
      startTime: firstSlot?.startTime || '18:00',
      endTime: lastSlot?.endTime || '20:00',
      slotIds: slots.map(slot => slot.id),
      bookingType: bookingForm?.bookingType || 'EXCLUSIVE',
      description: bookingForm?.description || '',
      price: results.slotPricing.totalPrice
    }
    
    // 3. 验证预约数据
    results.bookingData = validateBookingData(mockBookingData)
    
    // 4. 模拟后端处理
    results.backendSimulation = simulateBackendPricing(mockBookingData, venue)
    
    // 5. 综合评估
    results.overall = results.slotPricing.invalidSlots === 0 && 
                     results.bookingData.valid && 
                     results.backendSimulation.finalPrice > 0
    
    
  } catch (error) {
    console.error('❌ 验证过程出错:', error)
    results.error = error.message
  }
  
  return results
}

// 快速价格检查
export function quickPriceCheck(price) {
  const numPrice = parseFloat(price)
  
  if (isNaN(numPrice)) {
    return { valid: false, message: '价格不是有效数字' }
  }
  
  if (numPrice <= 0) {
    return { valid: false, message: '价格必须大于0' }
  }
  
  if (numPrice < 30) {
    return { valid: true, message: '价格偏低，请确认', level: 'warning' }
  }
  
  if (numPrice > 500) {
    return { valid: true, message: '价格偏高，请确认', level: 'warning' }
  }
  
  return { valid: true, message: '价格正常', level: 'success' }
}
