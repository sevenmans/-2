import { showToast } from './ui.js'
import { getToken, getUserInfo } from './auth.js'

let isRedirectingToLogin = false

const ADMIN_ROLE = 'ROLE_VENUE_ADMIN'
const ADMIN_PATH_PREFIX = '/pages/admin/'

// 游客页面（未登录可访问）
export const guestPages = [
  '/pages/user/login',
  '/pages/index/index'
]

// 所有页面都需要登录，除了登录页面
const authPages = [
  '/pages/index/index',
  '/pages/venue/list',
  '/pages/venue/detail',
  '/pages/user/profile',
  '/pages/booking/create',
  '/pages/booking/list',
  '/pages/booking/detail',
  '/pages/sharing/create',
  '/pages/sharing/list',
  '/pages/sharing/detail'
]

// 判断用户是否拥有管理员角色
export function isAdmin(userInfo) {
  if (!userInfo || !userInfo.roles) return false
  return Array.isArray(userInfo.roles)
    ? userInfo.roles.includes(ADMIN_ROLE)
    : userInfo.roles === ADMIN_ROLE
}

// 路由守卫
export function setupRouterGuard() {
  uni.addInterceptor('navigateTo', {
    invoke(params) {
      return checkPermission(params.url)
    }
  })
  
  uni.addInterceptor('redirectTo', {
    invoke(params) {
      return checkPermission(params.url)
    }
  })
  
  uni.addInterceptor('reLaunch', {
    invoke(params) {
      return checkPermission(params.url)
    }
  })
  
  uni.addInterceptor('switchTab', {
    invoke(params) {
      return checkPermission(params.url)
    }
  })
}

// 检查页面访问权限
function checkPermission(url) {
  const pagePath = url.split('?')[0]
  
  const isGuestPage = guestPages.some(page => pagePath.includes(page))
  if (isGuestPage) {
    return true
  }
  
  const token = getToken()
  const userInfo = getUserInfo()
  
  if (!token || !userInfo) {
    const pages = getCurrentPages()
    const isFromLoginPage = pages.length > 0 && pages[pages.length - 1].route.includes('/pages/user/login')
    
    if (!isFromLoginPage) {
      showToast('请先登录')
    }

    if (isRedirectingToLogin) {
      return false
    }
    isRedirectingToLogin = true
    
    const redirectUrl = encodeURIComponent(url)
    uni.reLaunch({
      url: `/pages/user/login?redirect=${redirectUrl}`
    })
    setTimeout(() => {
      isRedirectingToLogin = false
    }, 800)
    return false
  }
  
  // 管理员页面权限校验
  if (pagePath.includes(ADMIN_PATH_PREFIX)) {
    if (!isAdmin(userInfo)) {
      showToast('无管理员权限')
      uni.reLaunch({ url: '/pages/index/index' })
      return false
    }
  }
  
  return true
}

// 检查当前页面是否需要登录
export function checkCurrentPageAuth() {
  const pages = getCurrentPages()
  if (pages.length === 0) return true // 默认需要登录
  
  const currentPage = pages[pages.length - 1]
  const pagePath = `/${currentPage.route}`
  
  // 检查是否是游客页面（登录页面）
  const isGuestPage = guestPages.some(page => pagePath.includes(page))
  
  // 如果是游客页面，则不需要登录；否则需要登录
  return !isGuestPage
}

// 获取登录后的重定向页面
export function getRedirectPage() {
  const pages = getCurrentPages()
  if (pages.length <= 1) return '/pages/index/index'
  
  const previousPage = pages[pages.length - 2]
  return previousPage ? `/${previousPage.route}` : '/pages/index/index'
}
