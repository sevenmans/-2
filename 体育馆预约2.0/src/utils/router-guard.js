import { showToast } from './ui.js'
import { getToken, getUserInfo } from './auth.js'

// 游客页面（未登录可访问）
export const guestPages = [
  '/pages/user/login',
  '/pages/user/register',
  '/pages/index/index' // 允许未登录访问首页
]

// 所有页面都需要登录，除了登录和注册页面
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

// 路由守卫
export function setupRouterGuard() {
  // 页面跳转前拦截
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
  // 提取页面路径
  const pagePath = url.split('?')[0]
  
  // 检查是否是游客页面（登录、注册页面和首页）
  const isGuestPage = guestPages.some(page => pagePath.includes(page))
  
  // 如果是游客页面，直接允许访问
  if (isGuestPage) {
    return true
  }
  
  // 如果不是游客页面，则需要检查登录状态
  // 检查登录状态（需要同时有token和userInfo）
  const token = getToken()
  const userInfo = getUserInfo()
  
  if (!token || !userInfo) {
    // 需要登录但未登录，跳转到登录页
    
    // 避免重复提示
    const pages = getCurrentPages()
    const isFromLoginPage = pages.length > 0 && pages[pages.length - 1].route.includes('/pages/user/login')
    
    if (!isFromLoginPage) {
      showToast('请先登录')
    }
    
    // 保存当前页面路径作为重定向URL
    const redirectUrl = encodeURIComponent(url)
    
    // 使用 reLaunch 而不是 navigateTo，确保用户不能通过返回按钮绕过登录
    uni.reLaunch({
      url: `/pages/user/login?redirect=${redirectUrl}`
    })
    return false
  }
  
  return true
}

// 检查当前页面是否需要登录
export function checkCurrentPageAuth() {
  const pages = getCurrentPages()
  if (pages.length === 0) return true // 默认需要登录
  
  const currentPage = pages[pages.length - 1]
  const pagePath = `/${currentPage.route}`
  
  // 检查是否是游客页面（登录和注册页面）
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