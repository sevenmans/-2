/**
 * Toast 提示工具模块
 * 用于在uni-app中显示各种类型的提示信息
 */

/**
 * 显示成功提示
 * @param {string} title - 提示标题
 * @param {number} duration - 显示时长，默认2000ms
 * @param {boolean} mask - 是否显示透明蒙层，默认false
 */
export function showSuccess(title, duration = 2000, mask = false) {
  if (!title) {
    return
  }
  
  try {
    uni.showToast({
      title: String(title),
      icon: 'success',
      duration,
      mask
    })
  } catch (error) {
    console.error('[Toast] showSuccess失败:', error)
    // 降级处理
  }
}

/**
 * 显示错误提示
 * @param {string} title - 提示标题
 * @param {number} duration - 显示时长，默认3000ms
 * @param {boolean} mask - 是否显示透明蒙层，默认false
 */
export function showError(title, duration = 3000, mask = false) {
  if (!title) {
    return
  }
  
  try {
    uni.showToast({
      title: String(title),
      icon: 'error',
      duration,
      mask
    })
  } catch (error) {
    console.error('[Toast] showError失败:', error)
    // 降级处理
  }
}

/**
 * 显示警告提示
 * @param {string} title - 提示标题
 * @param {number} duration - 显示时长，默认2500ms
 * @param {boolean} mask - 是否显示透明蒙层，默认false
 */
export function showWarning(title, duration = 2500, mask = false) {
  if (!title) {
    return
  }
  
  try {
    uni.showToast({
      title: String(title),
      icon: 'none',
      duration,
      mask
    })
  } catch (error) {
    console.error('[Toast] showWarning失败:', error)
    // 降级处理
  }
}

/**
 * 显示普通提示（无图标）
 * @param {string} title - 提示标题
 * @param {number} duration - 显示时长，默认2000ms
 * @param {boolean} mask - 是否显示透明蒙层，默认false
 */
export function showInfo(title, duration = 2000, mask = false) {
  if (!title) {
    return
  }
  
  try {
    uni.showToast({
      title: String(title),
      icon: 'none',
      duration,
      mask
    })
  } catch (error) {
    console.error('[Toast] showInfo失败:', error)
    // 降级处理
  }
}

/**
 * 显示加载提示
 * @param {string} title - 提示标题，默认'加载中...'
 * @param {boolean} mask - 是否显示透明蒙层，默认true
 */
export function showLoading(title = '加载中...', mask = true) {
  try {
    uni.showLoading({
      title: String(title),
      mask
    })
  } catch (error) {
    console.error('[Toast] showLoading失败:', error)
    // 降级处理
  }
}

/**
 * 隐藏加载提示
 */
export function hideLoading() {
  try {
    uni.hideLoading()
  } catch (error) {
    console.error('[Toast] hideLoading失败:', error)
  }
}

/**
 * 隐藏所有提示
 */
export function hideToast() {
  try {
    uni.hideToast()
  } catch (error) {
    console.error('[Toast] hideToast失败:', error)
  }
}

// 默认导出
export default {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showLoading,
  hideLoading,
  hideToast
}