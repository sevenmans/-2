import { defineStore } from 'pinia'
import { getAdminBookings, adminCancelBooking } from '@/api/admin-dashboard.js'
import { adaptAdminOrder } from '@/utils/admin-adapter.js'

export const useAdminOrdersStore = defineStore('adminOrders', {
  state: () => ({
    list: [],
    filters: {
      status: '',
      keyword: '',
      venueId: '',
      type: '',
      startDate: '',
      endDate: ''
    },
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      hasMore: true
    },
    loading: false,
    selectedOrder: null,
    needRefresh: false // 标记是否需要刷新列表（核销/完成/取消后设为true）
  }),

  actions: {
    setFilter(key, value) {
      this.filters[key] = value
      this.pagination.page = 1
      this.list = []
      this.pagination.hasMore = true
    },

    resetFilters() {
      this.filters = { status: '', keyword: '', venueId: '', type: '', startDate: '', endDate: '' }
      this.pagination.page = 1
      this.list = []
      this.pagination.hasMore = true
    },

    async fetchOrders(append = false, forceRefresh = false) {
      if (this.loading) return
      this.loading = true
      try {
        const params = {
          page: this.pagination.page,
          pageSize: this.pagination.pageSize,
          ...this.filters
        }
        // Remove empty params
        Object.keys(params).forEach(k => { if (!params[k]) delete params[k] })

        // 如果需要强制刷新或needRefresh标记为true，则禁用缓存
        const options = (forceRefresh || this.needRefresh) ? { cache: false } : {}
        if (this.needRefresh) {
          this.needRefresh = false
        }
        const res = await getAdminBookings(params, options)
        // 后端返回格式: {success: true, data: [...], total: 4, page: 1, pageSize: 10}
        // res 是整个响应对象，res.data 是订单数组
        let sourceList = []
        let total = 0

        if (res && res.success && Array.isArray(res.data)) {
          // 标准返回格式：{success: true, data: [...], total: N}
          sourceList = res.data
          total = res.total || res.data.length
        } else if (Array.isArray(res)) {
          // 直接返回数组
          sourceList = res
          total = res.length
        } else if (res && res.data) {
          // 嵌套格式：{data: {data: [...], total: N}} 或 {data: [...]}
          const raw = res.data
          if (Array.isArray(raw)) {
            sourceList = raw
            total = raw.length
          } else {
            sourceList = raw.data || raw.content || raw.list || raw.records || []
            total = raw.totalElements || raw.total || sourceList.length
          }
        }

        const items = sourceList.map(adaptAdminOrder).filter(Boolean)

        if (append) {
          this.list = [...this.list, ...items]
        } else {
          this.list = items
        }
        this.pagination.total = total
        this.pagination.hasMore = this.list.length < total
      } catch (e) {
        console.error('[AdminOrders] fetchOrders error:', e)
        throw e
      } finally {
        this.loading = false
      }
    },

    async loadMore() {
      if (!this.pagination.hasMore || this.loading) return
      this.pagination.page++
      await this.fetchOrders(true)
    },

    async cancelOrder(id) {
      const res = await adminCancelBooking(id)
      const idx = this.list.findIndex(o => o.id === id)
      if (idx > -1) {
        this.list[idx].status = 'CANCELLED'
        this.list[idx].statusText = '已退款'
      }
      return res
    }
  }
})
