import { getToken, getUserInfo } from './auth.js'
import { useUserStore } from '@/stores/user.js'

const ADMIN_ROLE = 'ROLE_VENUE_ADMIN'
const ADMIN_PATH_PREFIX = '/pages/admin/'

// 用户端 TabBar 页面（微信开发者工具热重载/自动编译时常会落到第一个 Tab）
const USER_TAB_PAGES = [
  '/pages/index/index',
  '/pages/venue/list',
  '/pages/sharing/list',
  '/pages/booking/list',
  '/pages/user/profile'
]

// 无需登录即可访问的页面
const PUBLIC_PAGES = [
  '/pages/user/login'
]

// 需要登录但不强制检查的页面（支付相关页面）
const PAYMENT_PAGES = [
  '/pages/payment/index',
  '/pages/payment/success',
  '/pages/payment/failed'
]

// 除了登录页面，所有页面都需要登录

// 当前是否正在检查登录状态
let isCheckingAuth = false
// 登录状态检查结果缓存
let authCheckCache = null
let authCheckTime = 0
const AUTH_CACHE_DURATION = 30000 // 30秒缓存

let isRedirectingAdmin = false

// 判断用户是否拥有管理员角色
export function isAdmin(userInfo) {
  if (!userInfo || !userInfo.roles) return false
  return Array.isArray(userInfo.roles)
    ? userInfo.roles.includes(ADMIN_ROLE)
    : userInfo.roles === ADMIN_ROLE
}

/**
 * 设置新的路由守卫
 */
export function setupRouterGuard() {
  
  // 拦截所有页面跳转
  const interceptMethods = ['navigateTo', 'redirectTo', 'reLaunch', 'switchTab']
  
  interceptMethods.forEach(method => {
    uni.addInterceptor(method, {
      invoke(params) {
        return checkPagePermission(params.url, method)
      }
    })
  })
}

/**
 * 检查页面访问权限
 * @param {string} url 目标页面URL
 * @param {string} method 跳转方法
 * @returns {boolean} 是否允许跳转
 */
function checkPagePermission(url, method) {
  const pagePath = extractPagePath(url)

  // 1. 公开页面（登录页面），无需检查
  if (isPublicPage(pagePath)) {
    return true
  }

  // 2. 支付相关页面，使用宽松的登录检查
  if (isPaymentPage(pagePath)) {
    const hasBasicAuth = !!(getToken() && getUserInfo())
    if (!hasBasicAuth) {
      handleLoginRequired(url)
      return false
    }
    return true
  }

  // 3. 检查登录状态
  const isLoggedIn = checkLoginStatus()

  // 4. 其他所有页面都需要登录
  if (!isLoggedIn) {
    handleLoginRequired(url)
    return false
  }

  // 5. 登录后做角色分流/权限控制
  const userInfo = getUserInfo()
  const admin = isAdmin(userInfo)

  // 5.1 非管理员禁止进入管理员页面
  if (pagePath.startsWith(ADMIN_PATH_PREFIX) && !admin) {
    uni.showToast({ title: '无管理员权限', icon: 'none', duration: 1500 })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index/index' })
    }, 50)
    return false
  }

  // 5.2 管理员避免误入用户端 TabBar（常见于自动编译/热重载后默认落地）
  if (admin && USER_TAB_PAGES.includes(pagePath)) {
    if (isRedirectingAdmin) return false
    isRedirectingAdmin = true
    setTimeout(() => {
      uni.reLaunch({
        url: '/pages/admin/dashboard',
        complete: () => {
          setTimeout(() => { isRedirectingAdmin = false }, 300)
        }
      })
    }, 50)
    return false
  }

  return true
}

/**
 * 提取页面路径（去除查询参数）
 * @param {string} url 完整URL
 * @returns {string} 页面路径
 */
function extractPagePath(url) {
  return url.split('?')[0]
}

/**
 * 检查是否为公开页面
 * @param {string} pagePath 页面路径
 * @returns {boolean}
 */
function isPublicPage(pagePath) {
  return PUBLIC_PAGES.some(page => pagePath === page)
}

/**
 * 检查是否为支付页面
 * @param {string} pagePath 页面路径
 * @returns {boolean}
 */
function isPaymentPage(pagePath) {
  return PAYMENT_PAGES.some(page => pagePath === page)
}

// 移除了不再使用的访客页面和认证页面检查函数

/**
 * 检查登录状态（带缓存）
 * @returns {boolean} 是否已登录
 */
function checkLoginStatus() {
  const now = Date.now()
  
  // 使用缓存结果（30秒内）
  if (authCheckCache !== null && (now - authCheckTime) < AUTH_CACHE_DURATION) {
    return authCheckCache
  }
  
  // 检查本地存储
  const token = getToken()
  const userInfo = getUserInfo()

  // 获取Pinia store状态
  const userStore = useUserStore()
  const storeLoginStatus = userStore.getIsLoggedIn


  // 综合判断登录状态
  const isLoggedIn = !!(token && userInfo && storeLoginStatus)
  
  // 更新缓存
  authCheckCache = isLoggedIn
  authCheckTime = now
  
  return isLoggedIn
}

/**
 * 处理需要登录的情况
 * @param {string} originalUrl 原始目标URL
 */
function handleLoginRequired(originalUrl) {
  // 避免重复跳转到登录页
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  
  if (currentPage && currentPage.route.includes('pages/user/login')) {
    return
  }
  
  // 显示提示
  uni.showToast({
    title: '请先登录',
    icon: 'none',
    duration: 1500
  })
  
  // 保存重定向URL
  const redirectUrl = encodeURIComponent(originalUrl)
  
  // 跳转到登录页
  setTimeout(() => {
    uni.reLaunch({
      url: `/pages/user/login?redirect=${redirectUrl}`,
      fail: (err) => {
        console.error('[RouterGuard] 跳转登录页失败:', err)
      }
    })
  }, 100)
}

/**
 * 清除登录状态缓存
 */
export function clearAuthCache() {
  authCheckCache = null
  authCheckTime = 0
}

/**
 * 更新登录状态缓存
 * @param {boolean} isLoggedIn 登录状态
 */
export function updateAuthCache(isLoggedIn) {
  authCheckCache = isLoggedIn
  authCheckTime = Date.now()
}

/**
 * 检查当前页面是否需要登录
 * @returns {boolean}
 */
export function checkCurrentPageAuth() {
  const pages = getCurrentPages()
  if (pages.length === 0) return false
  
  const currentPage = pages[pages.length - 1]
  const pagePath = `/${currentPage.route}`

  // 登录页不需要登录，其余默认都需要
  return !isPublicPage(pagePath)
}

export default {
  setupRouterGuard,
  clearAuthCache,
  updateAuthCache,
  checkCurrentPageAuth
}
