import { get, post } from '@/utils/request.js'

// 核销订单（仅限管理员）
export function verifyOrder(orderId) {
  return post(`/verification/orders/${orderId}/verify`)
}

// 完成订单（仅限管理员）
export function completeOrder(orderId) {
  return post(`/verification/orders/${orderId}/complete`)
}

// 获取订单核销状态
export function getVerificationStatus(orderId) {
  return get(`/verification/orders/${orderId}/status`)
}