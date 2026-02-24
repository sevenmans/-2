import { get, post, put, patch, del } from '@/utils/request.js'

// 用户管理相关接口（仅限超级管理员）

// 获取所有用户
export function getAllUsers(params) {
  return get('/admin/users', params)
}

// 获取用户详情
export function getUserDetail(userId) {
  return get(`/admin/users/${userId}`)
}

// 更新用户角色
export function updateUserRoles(userId, data) {
  return put(`/admin/users/${userId}/roles`, data)
}

// 停用用户
export function deactivateUser(userId) {
  return del(`/admin/users/${userId}`)
}

// 激活用户
export function activateUser(userId) {
  return put(`/admin/users/${userId}/activate`)
}

// 场馆管理相关接口

// 创建场馆（仅限超级管理员）
export function createVenue(data) {
  return post('/venues', data)
}

// 更新场馆信息（仅限管理员）
export function updateVenue(id, data) {
  return put(`/venues/${id}`, data)
}

// 更新场馆状态（仅限管理员）
export function updateVenueStatus(id, data) {
  return patch(`/venues/${id}/status`, data)
}

// 删除场馆（仅限超级管理员）
export function deleteVenue(id) {
  return del(`/venues/${id}`)
}

// 分配管理员到场馆（仅限超级管理员）
export function assignVenueManager(id, data) {
  return patch(`/venues/${id}/manager`, data)
}

// 获取管理员管理的场馆（仅限管理员）
export function getManagerVenues(managerId) {
  return get(`/venues/manager/${managerId}`)
}