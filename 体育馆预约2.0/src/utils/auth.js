const TOKEN_KEY = 'access_token'
const USER_INFO_KEY = 'user_info'

// 获取token
export function getToken() {
  return uni.getStorageSync(TOKEN_KEY)
}

// 设置token
export function setToken(token) {
  return uni.setStorageSync(TOKEN_KEY, token)
}

// 移除token
export function removeToken() {
  return uni.removeStorageSync(TOKEN_KEY)
}

// 获取用户信息
export function getUserInfo() {
  const userInfo = uni.getStorageSync(USER_INFO_KEY)
  return userInfo ? JSON.parse(userInfo) : null
}

// 设置用户信息
export function setUserInfo(userInfo) {
  return uni.setStorageSync(USER_INFO_KEY, JSON.stringify(userInfo))
}

// 移除用户信息
export function removeUserInfo() {
  return uni.removeStorageSync(USER_INFO_KEY)
}

// 检查是否已登录
export function isLoggedIn() {
  return !!getToken()
}

// 清除所有认证信息
export function clearAuth() {
  removeToken()
  removeUserInfo()
}