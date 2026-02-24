/**
 * 🔧 时间段过期问题调试工具
 * 用于诊断时间段被错误标记为过期的问题
 */

export function debugTimeSlotExpired(selectedDate, timeSlots, currentTime = new Date()) {
  
  // 1. 基础信息
  const currentDateStr = currentTime.toISOString().split('T')[0];
  const currentTimeStr = currentTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  
  console.log('📅 [DEBUG] 基础信息:', {
    selectedDate: selectedDate,
    currentDate: currentDateStr,
    currentTime: currentTimeStr,
    currentTimeISO: currentTime.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: currentTime.getTimezoneOffset()
  });
  
  // 2. 日期比较
  const isToday = selectedDate === currentDateStr;
  const isFutureDate = selectedDate > currentDateStr;
  const isPastDate = selectedDate < currentDateStr;
  
  console.log('📊 [DEBUG] 日期比较:', {
    isToday: isToday,
    isFutureDate: isFutureDate,
    isPastDate: isPastDate,
    dateComparison: selectedDate === currentDateStr ? 'same' : 
                   selectedDate > currentDateStr ? 'future' : 'past'
  });
  
  // 3. 时间段分析
  const analysis = {
    totalSlots: timeSlots.length,
    availableSlots: 0,
    expiredSlots: 0,
    bookedSlots: 0,
    otherSlots: 0,
    problemSlots: []
  };
  
  timeSlots.forEach((slot, index) => {
    console.log(`🔍 [DEBUG] 检查时间段 ${index + 1}:`, {
      id: slot.id,
      date: slot.date,
      timeRange: `${slot.startTime}-${slot.endTime}`,
      status: slot.status,
      originalData: slot
    });
    
    // 统计状态
    switch (slot.status) {
      case 'AVAILABLE':
        analysis.availableSlots++;
        break;
      case 'EXPIRED':
        analysis.expiredSlots++;
        
        // 检查是否为问题时间段
        if (isFutureDate) {
          console.error('🚨 [DEBUG] 发现问题：未来日期的时间段被标记为EXPIRED!', {
            slotId: slot.id,
            slotDate: slot.date,
            selectedDate: selectedDate,
            timeRange: `${slot.startTime}-${slot.endTime}`,
            status: slot.status
          });
          
          analysis.problemSlots.push({
            ...slot,
            problem: '未来日期被标记为过期',
            shouldBeStatus: 'AVAILABLE'
          });
        } else if (isToday) {
          // 检查今日时间段是否真的过期
          try {
            // 🔧 修复：正确处理时区，使用本地时间而不是UTC时间
            const slotEndDateTime = new Date();
            const [endHour, endMinute] = slot.endTime.split(':').map(Number);
            slotEndDateTime.setFullYear(parseInt(selectedDate.split('-')[0]));
            slotEndDateTime.setMonth(parseInt(selectedDate.split('-')[1]) - 1);
            slotEndDateTime.setDate(parseInt(selectedDate.split('-')[2]));
            slotEndDateTime.setHours(endHour, endMinute, 0, 0);
            const shouldBeExpired = currentTime > slotEndDateTime;
            
            console.log('⏰ [DEBUG] 今日时间段过期检查:', {
              slotId: slot.id,
              timeRange: `${slot.startTime}-${slot.endTime}`,
              slotEndDateTime: slotEndDateTime.toISOString(),
              currentTime: currentTime.toISOString(),
              shouldBeExpired: shouldBeExpired,
              actualStatus: slot.status,
              timeDiffMinutes: Math.round((slotEndDateTime - currentTime) / (1000 * 60))
            });
            
            if (!shouldBeExpired) {
              console.error('🚨 [DEBUG] 发现问题：今日时间段被错误标记为EXPIRED!', {
                slotId: slot.id,
                timeRange: `${slot.startTime}-${slot.endTime}`,
                slotEndTime: slotEndDateTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
                currentTime: currentTimeStr,
                shouldBeExpired: shouldBeExpired
              });
              
              analysis.problemSlots.push({
                ...slot,
                problem: '今日时间段被错误标记为过期',
                shouldBeStatus: 'AVAILABLE',
                slotEndTime: slotEndDateTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
                timeDiffMinutes: Math.round((slotEndDateTime - currentTime) / (1000 * 60))
              });
            }
          } catch (error) {
            console.error('🚨 [DEBUG] 时间段过期检查出错:', error);
          }
        }
        break;
      case 'BOOKED':
      case 'RESERVED':
        analysis.bookedSlots++;
        break;
      default:
        analysis.otherSlots++;
    }
  });
  
  // 4. 输出分析结果
  console.log('📈 [DEBUG] 分析结果:', analysis);
  
  if (analysis.problemSlots.length > 0) {
    console.error('🚨 [DEBUG] 发现问题时间段:', analysis.problemSlots);
    
    // 生成修复建议
    const suggestions = [];
    
    if (isFutureDate && analysis.expiredSlots > 0) {
      suggestions.push('未来日期的时间段不应该被标记为EXPIRED，请检查后端定时任务逻辑');
    }
    
    if (isToday && analysis.problemSlots.some(slot => slot.problem.includes('错误标记'))) {
      suggestions.push('今日时间段的过期判断逻辑有问题，请检查时间计算逻辑');
    }
    
    console.warn('💡 [DEBUG] 修复建议:', suggestions);
  } else {
    console.log('✅ [DEBUG] 未发现问题时间段');
  }
  
  return {
    analysis,
    hasProblems: analysis.problemSlots.length > 0,
    problemSlots: analysis.problemSlots,
    debugInfo: {
      selectedDate,
      currentDate: currentDateStr,
      currentTime: currentTimeStr,
      isToday,
      isFutureDate,
      isPastDate
    }
  };
}

/**
 * 快速调试当前页面的时间段问题
 */
export function quickDebugCurrentPage() {
  console.log('🔧 [DEBUG] 开始快速调试当前页面...');
  
  // 尝试从当前页面获取数据
  const currentInstance = getCurrentInstance();
  if (currentInstance) {
    const { selectedDate, timeSlots } = currentInstance.ctx;
    if (selectedDate && timeSlots) {
      return debugTimeSlotExpired(selectedDate, timeSlots);
    }
  }
  
  return null;
}

/**
 * 在控制台中暴露调试函数
 */
if (typeof window !== 'undefined') {
  window.debugTimeSlotExpired = debugTimeSlotExpired;
  window.quickDebugCurrentPage = quickDebugCurrentPage;
}
