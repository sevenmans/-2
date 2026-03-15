import { defineStore } from 'pinia'
import {
  getMyManagedVenues,
  createVenue,
  updateVenue,
  deleteVenue,
  updateVenueStatus,
  getVenueDetail,
  getVenueTimeslots,
  updateTimeslotStatus
} from '@/api/admin.js'
import { clearCache } from '@/utils/request.js'

export const useAdminVenuesStore = defineStore('adminVenues', {
  state: () => ({
    managerVenues: [],
    editingVenue: null,
    timeslots: [],
    loading: false,
    timeslotLoading: false
  }),

  actions: {
    async fetchManagedVenues() {
      this.loading = true
      try {
        const res = await getMyManagedVenues()
        this.managerVenues = res.data || res || []
      } catch (e) {
        console.error('[AdminVenues] fetchManagedVenues error:', e)
        throw e
      } finally {
        this.loading = false
      }
    },

    async fetchVenueDetail(id) {
      const res = await getVenueDetail(id)
      this.editingVenue = res.data || res
      return this.editingVenue
    },

    async saveVenue(data) {
      if (data.id) {
        const res = await updateVenue(data.id, data)
        const updatedVenue = res?.data || res
        if (updatedVenue && updatedVenue.id) {
          const index = this.managerVenues.findIndex(v => v.id === updatedVenue.id)
          if (index !== -1) this.managerVenues.splice(index, 1, updatedVenue)
        }
        return res
      } else {
        const res = await createVenue(data)
        const createdVenue = res?.data || res
        if (createdVenue && createdVenue.id) {
          const exists = this.managerVenues.some(v => v.id === createdVenue.id)
          if (!exists) this.managerVenues.unshift(createdVenue)
        }
        return res
      }
    },

    async removeVenue(id) {
      await deleteVenue(id)
      // 清除缓存，确保下次获取最新数据
      clearCache('/venues/manager/me')
      // 确保 ID 类型一致再过滤
      const numId = Number(id)
      this.managerVenues = this.managerVenues.filter(v => Number(v.id) !== numId)
    },

    async toggleVenueStatus(id, status) {
      await updateVenueStatus(id, { status })
      const venue = this.managerVenues.find(v => v.id === id)
      if (venue) venue.status = status
    },

    async fetchTimeslots(venueId, date) {
      this.timeslotLoading = true
      try {
        const res = await getVenueTimeslots(venueId, date)
        this.timeslots = res.data || res || []
      } catch (e) {
        console.error('[AdminVenues] fetchTimeslots error:', e)
        throw e
      } finally {
        this.timeslotLoading = false
      }
    },

    async changeTimeslotStatus(id, status) {
      const res = await updateTimeslotStatus(id, { status })
      const slot = this.timeslots.find(s => s.id === id)
      if (slot) slot.status = status
      return res
    }
  }
})
