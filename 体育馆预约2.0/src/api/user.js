import { get, post, put, upload } from '@/utils/request.js'

// 获取当前用户信息
export function getUserInfo() {
  return get('/users/me')
}

// 更新用户信息
export function updateUserInfo(data) {
  return put('/users/me', data)
}

// 修改密码
export function changePassword(data) {
  return put('/users/me/password', data)
}

// 上传头像
export function uploadAvatar(filePath) {
  return upload('/users/me/avatar', filePath)
}

// 获取用户预约记录
export function getUserBookings(params) {
  return get('/users/me/bookings', params)
}

// 获取用户订单记录
export function getUserOrders(params) {
  return get('/users/me/orders', params)
}

// 获取用户统计信息
export function getUserStats() {
  return get('/users/me/stats')
}

// 获取当前用户信息（用于验证token）
export function getCurrentUser() {
  return get('/users/me')
}

// 更新用户资料
export function updateProfile(data) {
  return put('/users/me/profile', data)
}

// 用户API对象导出
export const userApi = {
  getUserInfo,
  updateUserInfo,
  changePassword,
  uploadAvatar,
  getUserBookings,
  getUserOrders,
  getUserStats,
  getCurrentUser,
  updateProfile
}