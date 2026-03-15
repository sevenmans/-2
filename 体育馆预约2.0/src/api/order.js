import { get, post, put } from '@/utils/request.js'

// 提交订单
export function createOrder(data) {
  return post('/order', data)
}

// 获取订单详情
export function getOrderDetail(id) {
  return get(`/order/${id}`)
}

// 获取用户订单列表
export function getUserOrders(params) {
  return get('/order', params)
}

// 取消订单
export function cancelOrder(id) {
  return put(`/order/${id}/cancel`)
}

// 获取所有订单列表（仅限管理员）
export function getAllOrders(params) {
  return get('/order/all', params)
}

// 用户完成订单（将已核销的订单标记为已完成）
export function completeUserOrder(id) {
  return post(`/order/${id}/complete`)
}