/**
 * 支付调试工具模块
 * 用于测试订单金额计算、时间段刷新等功能
 */

/**
 * 调试订单金额计算
 * @param {Object} orderData 订单数据
 * @param {number} orderData.venueId 场馆ID
 * @param {string} orderData.timeSlot 时间段
 * @param {number} orderData.duration 时长(小时)
 * @param {number} orderData.price 单价
 * @returns {Object} 调试信息
 */
export function debugOrderAmount(orderData) {
  
  const { venueId, timeSlot, duration = 1, price = 0 } = orderData || {};
  
  // 计算总金额
  const totalAmount = price * duration;
  
  const debugInfo = {
    venueId,
    timeSlot,
    duration,
    unitPrice: price,
    totalAmount,
    calculation: `${price} × ${duration} = ${totalAmount}`,
    timestamp: new Date().toLocaleString()
  };
  
  
  return debugInfo;
}

/**
 * 调试时间段刷新功能
 * @param {string} venueId 场馆ID
 * @param {string} date 日期
 * @returns {Promise<Object>} 刷新结果
 */
export async function debugTimeSlotRefresh(venueId, date) {
  
  const startTime = Date.now();
  
  try {
    // 模拟API调用
    const response = await new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          data: [
            { id: 1, time: '09:00-10:00', status: 'available', price: 100 },
            { id: 2, time: '10:00-11:00', status: 'occupied', price: 100 },
            { id: 3, time: '11:00-12:00', status: 'maintenance', price: 100 }
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
      dataCount: response.data?.length || 0,
      timestamp: new Date().toLocaleString(),
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
      timestamp: new Date().toLocaleString()
    };
    
    console.error('刷新失败:', debugInfo);
    
    return debugInfo;
  }
}

/**
 * 强制刷新时间段数据
 * @param {string} venueId 场馆ID
 * @param {string} date 日期
 * @param {boolean} clearCache 是否清除缓存
 * @returns {Promise<Object>} 刷新结果
 */
export async function forceRefreshTimeSlots(venueId, date, clearCache = true) {
  
  const startTime = Date.now();
  
  try {
    // 如果需要清除缓存
    if (clearCache) {
      // 这里可以调用实际的缓存清除逻辑
      uni.removeStorageSync(`timeslots_${venueId}_${date}`);
    }
    
    // 强制重新获取数据
    const response = await new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          data: [
            { id: 1, time: '09:00-10:00', status: 'available', price: 100 },
            { id: 2, time: '10:00-11:00', status: 'available', price: 100 },
            { id: 3, time: '11:00-12:00', status: 'occupied', price: 100 },
            { id: 4, time: '14:00-15:00', status: 'maintenance', price: 100 }
          ],
          fromCache: false,
          refreshTime: new Date().toISOString()
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
      dataCount: response.data?.length || 0,
      fromCache: response.fromCache,
      refreshTime: response.refreshTime,
      timestamp: new Date().toLocaleString(),
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
      timestamp: new Date().toLocaleString()
    };
    
    console.error('强制刷新失败:', debugInfo);
    
    return debugInfo;
  }
}

/**
 * 调试价格传递功能
 * @param {Object} priceData 价格数据
 * @returns {Object} 调试信息
 */
export function debugPriceTransfer(priceData) {
  
  const debugInfo = {
    originalData: priceData,
    validation: {
      hasPrice: priceData && typeof priceData.price === 'number',
      hasVenueId: priceData && priceData.venueId,
      hasTimeSlot: priceData && priceData.timeSlot,
      isValidPrice: priceData && priceData.price > 0
    },
    timestamp: new Date().toLocaleString()
  };
  
  
  return debugInfo;
}

/**
 * 综合测试函数
 * @param {Object} testData 测试数据
 * @returns {Promise<Object>} 测试结果
 */
export async function runComprehensiveTest(testData) {
  
  const results = {
    orderAmountTest: null,
    timeSlotRefreshTest: null,
    forceRefreshTest: null,
    priceTransferTest: null,
    overallSuccess: false,
    timestamp: new Date().toLocaleString()
  };
  
  try {
    // 测试订单金额计算
    results.orderAmountTest = debugOrderAmount(testData.orderData);
    
    // 测试时间段刷新
    results.timeSlotRefreshTest = await debugTimeSlotRefresh(
      testData.venueId, 
      testData.date
    );
    
    // 测试强制刷新
    results.forceRefreshTest = await forceRefreshTimeSlots(
      testData.venueId, 
      testData.date, 
      true
    );
    
    // 测试价格传递
    results.priceTransferTest = debugPriceTransfer(testData.priceData);
    
    // 判断整体测试是否成功
    results.overallSuccess = 
      results.timeSlotRefreshTest.success && 
      results.forceRefreshTest.success;
    
    
    return results;
    
  } catch (error) {
    console.error('综合测试失败:', error);
    results.error = error.message;
    return results;
  }
}

// 默认导出
export default {
  debugOrderAmount,
  debugTimeSlotRefresh,
  forceRefreshTimeSlots,
  debugPriceTransfer,
  runComprehensiveTest
};