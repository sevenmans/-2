import { get, put } from '@/utils/request.js'

export function getAdminDashboardStats(params) {
  return get('/admin/dashboard/stats', params)
}

export function getAdminBookings(params, options = {}) {
  return get('/admin/bookings', params, options)
}

export function adminCancelBooking(id) {
  return put(`/bookings/${id}/cancel`)
}
