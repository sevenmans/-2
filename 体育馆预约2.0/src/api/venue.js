import { get } from '@/utils/request.js'

// 获取场馆列表
export function getVenueList(params) {
  return get('/venues', params, { cache: false })
}

// 获取场馆详情（禁用缓存，确保每次都获取最新数据）
export function getVenueDetail(id) {
  return get(`/venues/${id}`, {}, { cache: false })
}

// 获取场馆时间段
export function getVenueTimeSlots(venueId, date, params = {}) {
  return get(`/timeslots/venue/${venueId}/date/${date}`, params)
}

// 获取场馆类型列表
export function getVenueTypes() {
  return get('/venues/types')
}

// 获取热门场馆
export function getPopularVenues(limit = 5) {
  return get('/venues/popular', { limit }, { cache: false })
}

// 搜索场馆
export function searchVenues(params) {
  return get('/venues/search', params)
}

// 获取支持拼场的场馆
export function getSharingVenues(params) {
  return get('/venues/sharing', params)
}

// 场馆API对象导出
export const venueApi = {
  getVenueList,
  getVenueDetail,
  getVenueTimeSlots,
  getVenueTypes,
  getPopularVenues,
  searchVenues,
  getSharingVenues
}
