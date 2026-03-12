import { post } from '@/utils/request.js'

// 用户登录
export function login(data) {
  return post('/auth/signin', data)
}

// 用户登出
export function logout() {
  return post('/auth/logout')
}

export function wechatLogin(data) {
  return post('/auth/wechat/login', data)
}

// 刷新token
export function refreshToken() {
  return post('/auth/refresh')
}
