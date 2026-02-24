// 导航工具函数

// tabbar页面列表
const TABBAR_PAGES = [
  '/pages/index/index',
  '/pages/venue/list',
  '/pages/sharing/list', 
  '/pages/booking/list',
  '/pages/user/profile'
]

/**
 * 智能页面跳转
 * 自动判断是否为tabbar页面，使用正确的跳转方式
 * @param {string} url - 目标页面路径
 * @param {object} options - 跳转选项
 */
export function navigateTo(url, options = {}) {
  // 提取页面路径（去除查询参数）
  const pagePath = url.split('?')[0]
  
  // 检查是否为tabbar页面
  const isTabbarPage = TABBAR_PAGES.includes(pagePath)
  
  if (isTabbarPage) {
    // tabbar页面使用switchTab
    uni.switchTab({
      url,
      ...options
    })
  } else {
    // 普通页面使用navigateTo
    uni.navigateTo({
      url,
      ...options
    })
  }
}

/**
 * 智能导航函数（别名）
 * @param {string} url - 目标页面路径
 * @param {object} options - 跳转选项
 */
export function smartNavigate(url, options = {}) {
  return navigateTo(url, options)
}

/**
 * 返回上一页
 * @param {number} delta - 返回层数，默认为1
 */
export function navigateBack(delta = 1) {
  uni.navigateBack({
    delta
  })
}

/**
 * 重定向到指定页面
 * @param {string} url - 目标页面路径
 * @param {object} options - 跳转选项
 */
export function redirectTo(url, options = {}) {
  uni.redirectTo({
    url,
    ...options
  })
}

/**
 * 重新启动到指定页面
 * @param {string} url - 目标页面路径
 * @param {object} options - 跳转选项
 */
export function reLaunch(url, options = {}) {
  uni.reLaunch({
    url,
    ...options
  })
}

/**
 * 切换到tabbar页面
 * @param {string} url - tabbar页面路径
 * @param {object} options - 跳转选项
 */
export function switchTab(url, options = {}) {
  uni.switchTab({
    url,
    ...options
  })
}

/**
 * 检查是否为tabbar页面
 * @param {string} url - 页面路径
 * @returns {boolean}
 */
export function isTabbarPage(url) {
  const pagePath = url.split('?')[0]
  return TABBAR_PAGES.includes(pagePath)
}

export default {
  navigateTo,
  smartNavigate,
  navigateBack,
  redirectTo,
  reLaunch,
  switchTab,
  isTabbarPage
}