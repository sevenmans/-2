import { get, post, put, patch, del } from '@/utils/request.js'
import { upload } from '@/utils/request.js'

// 获取当前管理员管理的场馆
export function getMyManagedVenues() {
  return get('/venues/manager/me')
}

// 创建场馆
export function createVenue(data) {
  return post('/venues', data)
}

// 更新场馆信息
export function updateVenue(id, data) {
  return put(`/venues/${id}`, data)
}

// 更新场馆状态（OPEN / CLOSED / MAINTENANCE）
export function updateVenueStatus(id, data) {
  return patch(`/venues/${id}/status`, data)
}

// 删除场馆
export function deleteVenue(id) {
  return del(`/venues/${id}`)
}

// 获取场馆详情（禁用缓存，确保每次都获取最新数据）
export function getVenueDetail(id) {
  return get(`/venues/${id}`, {}, { cache: false })
}

// 获取场馆时段
export function getVenueTimeslots(venueId, date) {
  return get(`/timeslots/venue/${venueId}/date/${date}`)
}

// 更新时段状态（MAINTENANCE / AVAILABLE）
export function updateTimeslotStatus(id, data) {
  return patch(`/timeslots/${id}/status`, data)
}

// 获取场馆已生成时间段的日期列表（用于排期管理日期选择限制）
export function getGeneratedDates(venueId) {
  return get(`/timeslots/venue/${venueId}/generated-dates`)
}

// 上传场馆图片（管理员）
export function uploadVenueImage(filePath) {
  return upload('/venues/upload-image', filePath)
}
