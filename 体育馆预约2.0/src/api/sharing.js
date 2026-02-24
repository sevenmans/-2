import request, { get, post, put } from '../utils/request'
import config from '../config/index.js'

/**
 * 拼场功能 API 模块
 * 
 * 包含两个核心控制器的接口：
 * 1. SharingOrderController (/api/sharing-orders): 拼场订单管理（发布、查询、加入、取消）
 * 2. SharingController (/api/shared): 拼场申请管理（发送请求、处理申请、查询申请列表）
 */

// ==========================================
// 1. 拼场订单管理 (Sharing Orders)
// Base URL: /api/sharing-orders
// ==========================================

/**
 * 创建拼场订单
 * @url POST /api/sharing-orders
 * @param {Object} data - 拼场订单数据
 * @returns {Promise}
 */
export function createSharingOrder(data) {
  return post('/sharing-orders', data)
}

/**
 * 获取拼场订单详情
 * @url GET /api/sharing-orders/{id}
 * @param {Number|String} id - 拼场订单ID
 * @returns {Promise}
 */
export function getSharingOrderById(id) {
  if (config.debug) console.debug('[SharingAPI] 请求拼场订单详情，ID:', id)
  return get(`/sharing-orders/${id}`, {}, { cache: false })
}

/**
 * 通过主订单ID获取拼场订单详情
 * @url GET /api/sharing-orders/by-order/{orderId}
 * @param {Number|String} orderId - 主订单ID
 * @returns {Promise}
 */
export function getSharingOrderByMainOrderId(orderId) {
  if (config.debug) console.debug('[SharingAPI] 通过主订单ID请求拼场订单详情，主订单ID:', orderId)
  return get(`/sharing-orders/by-order/${orderId}`, {}, { cache: false })
}

/**
 * 根据订单号获取拼场订单
 * @url GET /api/sharing-orders/order-no/{orderNo}
 * @param {String} orderNo - 订单号
 * @returns {Promise}
 */
export function getSharingOrderByOrderNo(orderNo) {
  return get(`/sharing-orders/order-no/${orderNo}`)
}

/**
 * 获取可加入的拼场订单列表 (拼场大厅)
 * @url GET /api/sharing-orders/joinable
 * @param {Object} params - 分页参数 { page, pageSize }
 * @returns {Promise}
 */
export function getJoinableSharingOrders(params) {
  return get('/sharing-orders/joinable', params)
}

/**
 * 获取所有拼场订单列表 (包括所有状态)
 * @url GET /api/sharing-orders
 * @param {Object} params - 分页参数 { page, pageSize, all }
 * @returns {Promise}
 */
export function getAllSharingOrders(params) {
  if (config.debug) {
    console.debug('[SharingAPI] 请求所有拼场订单，参数:', params)
  }
  return get('/sharing-orders', params, {
    cache: false,
    timeout: 15000
  })
}

/**
 * 根据场馆ID获取可加入的拼场订单
 * @url GET /api/sharing-orders/joinable/venue/{venueId}
 * @param {Number|String} venueId - 场馆ID
 * @returns {Promise}
 */
export function getJoinableSharingOrdersByVenueId(venueId) {
  return get(`/sharing-orders/joinable/venue/${venueId}`)
}

/**
 * 根据日期获取可加入的拼场订单
 * @url GET /api/sharing-orders/joinable/date/{date}
 * @param {String} date - 日期 (YYYY-MM-DD)
 * @returns {Promise}
 */
export function getJoinableSharingOrdersByDate(date) {
  return get(`/sharing-orders/joinable/date/${date}`)
}

/**
 * 根据场馆ID和日期获取可加入的拼场订单
 * @url GET /api/sharing-orders/joinable/venue/{venueId}/date/{date}
 * @param {Number|String} venueId - 场馆ID
 * @param {String} date - 日期 (YYYY-MM-DD)
 * @returns {Promise}
 */
export function getJoinableSharingOrdersByVenueIdAndDate(venueId, date) {
  return get(`/sharing-orders/joinable/venue/${venueId}/date/${date}`)
}

/**
 * 获取我创建的拼场订单
 * @url GET /api/sharing-orders/my-created
 * @returns {Promise}
 */
export function getMyCreatedSharingOrders() {
  return get('/sharing-orders/my-created', {}, { cache: false })
}

/**
 * 加入拼场订单 (旧接口，直接加入)
 * @url POST /api/sharing-orders/{id}/join
 * @param {Number|String} id - 拼场订单ID
 * @param {Object} data - 加入参数
 * @returns {Promise}
 */
export function joinSharingOrder(id, data = {}) {
  // 注意：后端 Controller 此处不需要 body，但为了兼容性保留参数结构
  return post(`/sharing-orders/${id}/join`, data)
}

/**
 * 申请加入拼场订单 (需要支付流程)
 * @url POST /api/sharing-orders/{id}/apply-join
 * @param {Number|String} id - 拼场订单ID
 * @returns {Promise}
 */
export function applyJoinSharingOrder(id) {
  return post(`/sharing-orders/${id}/apply-join`)
}

/**
 * 取消加入拼场订单
 * @url POST /api/sharing-orders/{id}/cancel-join
 * @param {Number|String} id - 拼场订单ID
 * @returns {Promise}
 */
export function cancelJoinSharingOrder(id) {
  return post(`/sharing-orders/${id}/cancel-join`)
}

/**
 * 确认拼场订单 (仅创建者)
 * @url POST /api/sharing-orders/{id}/confirm
 * @param {Number|String} id - 拼场订单ID
 * @returns {Promise}
 */
export function confirmSharingOrder(id) {
  return post(`/sharing-orders/${id}/confirm`)
}

/**
 * 取消拼场订单 (仅创建者)
 * @url POST /api/sharing-orders/{id}/cancel
 * @param {Number|String} id - 拼场订单ID
 * @returns {Promise}
 */
export function cancelSharingOrder(id) {
  return post(`/sharing-orders/${id}/cancel`)
}

/**
 * 更新拼场设置
 * @url PUT /api/sharing-orders/{id}/settings
 * @param {Number|String} sharingId - 拼场订单ID
 * @param {Object} settings - 设置对象 { autoApprove, allowExit }
 * @returns {Promise}
 */
export function updateSharingSettings(sharingId, settings) {
  if (config.debug) {
    console.debug('[SharingAPI] updateSharingSettings', { sharingId, settings })
  }
  return request({
    url: `/sharing-orders/${sharingId}/settings`,
    method: 'put',
    data: settings
  })
}

// ==========================================
// 2. 拼场申请管理 (Sharing Requests)
// Base URL: /api/shared
// ==========================================

/**
 * 申请拼场 (普通订单转拼场或发起拼场请求)
 * @url POST /api/bookings/shared/{orderId}/apply (注: 此路径在旧代码中存在，需确认后端是否支持，暂保留)
 * 注意：如果是直接针对拼场订单申请加入，请使用 applyJoinSharingOrder
 * @param {Number|String} orderId 
 * @param {Object} data 
 */
export function applySharedBooking(orderId, data) {
  return post(`/bookings/shared/${orderId}/apply`, data)
}

/**
 * 处理拼场申请 (同意/拒绝)
 * @url PUT /api/shared/requests/{requestId}
 * @param {Number|String} requestId - 申请ID
 * @param {Object} data - { action: 'approve'|'reject', responseMessage: string }
 * @returns {Promise}
 */
export function handleSharedRequest(requestId, data) {
  return put(`/shared/requests/${requestId}`, data)
}

/**
 * 获取我发出的拼场申请
 * @url GET /api/shared/my-requests
 * @param {Object} params - { status, page, pageSize }
 * @returns {Promise}
 */
export function getMySharedRequests(params) {
  return get('/shared/my-requests', params, { cache: false })
}

/**
 * 获取我收到的拼场申请
 * @url GET /api/shared/received-requests
 * @param {Object} params - { status, page, pageSize }
 * @returns {Promise}
 */
export function getReceivedSharedRequests(params) {
  return get('/shared/received-requests', params)
}

/**
 * 取消拼场申请
 * @url DELETE /api/shared/requests/{requestId}/cancel
 * @param {Number|String} requestId - 申请ID
 * @returns {Promise}
 */
export function cancelSharingRequest(requestId) {
  return request({
    url: `/shared/requests/${requestId}/cancel`,
    method: 'delete'
  })
}


// ==========================================
// 3. 辅助/兼容方法 (Aliases)
// ==========================================

/**
 * 移除拼场参与者 (兼容旧接口，后端暂无直接对应接口，需确认是否在SharingOrderController中有遗漏或逻辑变更)
 * 暂保留以防报错，但在后端未找到对应 path
 */
export function removeSharingParticipant(sharingId, participantId) {
  console.warn('[SharingAPI] removeSharingParticipant 接口在后端未找到对应实现，可能已废弃')
  return request({
    url: `/sharing-orders/${sharingId}/participants/${participantId}/remove`,
    method: 'post'
  })
}

/**
 * 兼容旧调用：获取用户提交的拼场申请（别名）
 */
export function getUserSharingOrders(params) {
  return getMySharedRequests(params)
}

/**
 * 兼容旧调用：获取可用的拼场预订
 */
export function getAvailableSharedBookings(params) {
  return get('/bookings/shared/available', params)
}

// 默认导出
export default {
  createSharingOrder,
  getSharingOrderById,
  getSharingOrderByMainOrderId,
  getSharingOrderByOrderNo,
  getJoinableSharingOrders,
  getAllSharingOrders,
  getJoinableSharingOrdersByVenueId,
  getJoinableSharingOrdersByDate,
  getJoinableSharingOrdersByVenueIdAndDate,
  getMyCreatedSharingOrders,
  joinSharingOrder,
  applyJoinSharingOrder,
  cancelJoinSharingOrder,
  confirmSharingOrder,
  cancelSharingOrder,
  updateSharingSettings,
  
  applySharedBooking,
  handleSharedRequest,
  getMySharedRequests,
  getReceivedSharedRequests,
  cancelSharingRequest,
  
  // Aliases
  getUserSharingOrders,
  getAvailableSharedBookings,
  removeSharingParticipant
}
