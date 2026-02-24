import { get, post } from '@/utils/request.js'

// 支付订单（模拟）
export function payOrder(orderId, paymentMethod = 'wechat') {
  return post(`/payments/orders/${orderId}/pay`, {
    paymentMethod
  })
}

// 获取订单支付状态
export function getPaymentStatus(orderId) {
  return get(`/payments/orders/${orderId}/status`)
}

// 获取订单详情（用于支付页面）
export function getOrderDetail(orderId) {
  return get(`/bookings/${orderId}`)
}

// 模拟支付回调
export function mockPaymentCallback(orderId, success = true) {
  return post(`/payments/orders/${orderId}/callback`, {
    success,
    timestamp: Date.now()
  })
}

// 获取支付记录
export function getPaymentRecords(params = {}) {
  return get('/payments/records', params)
}

// 申请退款
export function requestRefund(orderId, reason) {
  return post(`/payments/orders/${orderId}/refund`, {
    reason
  })
}

export default {
  payOrder,
  getPaymentStatus,
  getOrderDetail,
  mockPaymentCallback,
  getPaymentRecords,
  requestRefund
}