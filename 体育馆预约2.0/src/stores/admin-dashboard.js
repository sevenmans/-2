import { defineStore } from 'pinia'
import { getAdminDashboardStats } from '@/api/admin-dashboard.js'
import { adaptAdminStats } from '@/utils/admin-adapter.js'

export const useAdminDashboardStore = defineStore('adminDashboard', {
  state: () => ({
    stats: null,
    timeRange: 'today',
    startDate: '',
    endDate: '',
    loading: false
  }),

  actions: {
    setTimeRange(range) {
      this.timeRange = range
    },

    setCustomDates(start, end) {
      this.startDate = start
      this.endDate = end
    },

    async fetchStats() {
      this.loading = true
      try {
        const params = { timeRange: this.timeRange }
        if (this.timeRange === 'custom') {
          params.startDate = this.startDate
          params.endDate = this.endDate
        }
        const res = await getAdminDashboardStats(params)
        const raw = res.data || res
        this.stats = adaptAdminStats(raw)
      } catch (e) {
        console.error('[AdminDashboard] fetchStats error:', e)
        throw e
      } finally {
        this.loading = false
      }
    },

    async refreshStats() {
      await this.fetchStats()
    }
  }
})
