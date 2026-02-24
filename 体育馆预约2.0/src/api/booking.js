import { get, post, put, del } from '@/utils/request.js'

// 创建预约
export function createBooking(data) {
  return post('/bookings', data)
}

// 获取预约列表
export function getBookingList(params) {
  return get('/bookings', params)
}

// 获取预约详情（支持传入 params 和 options 以控制缓存）
export function getBookingDetail(id, params = {}, options = {}) {
  return get(`/bookings/${id}`, params, options)
}

// 取消预约
export function cancelBooking(id) {
  return put(`/bookings/${id}/cancel`)
}

// 获取场馆可用时间段
export function getVenueAvailableSlots(venueId, date) {
  return get(`/bookings/venues/${venueId}/slots`, { date })
}

// 创建拼场预约
export function createSharedBooking(data) {
  return post('/bookings/shared', data)
}

// 申请拼场
export function applySharedBooking(orderId, data) {
  return post(`/bookings/shared/${orderId}/apply`, data)
}