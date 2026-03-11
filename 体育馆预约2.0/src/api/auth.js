import { post } from '@/utils/request.js'

// 用户登录
export function login(data) {
  return post('/auth/signin', data)
}

// 短信验证码登录
export function smsLogin(data) {
  return post('/auth/sms-login', data)
}

// 用户注册
export function register(data) {
  return post('/auth/signup', data)
}

// 获取短信验证码
export function getSmsCode(phone) {
  return post('/auth/sms-code', { phone })
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
