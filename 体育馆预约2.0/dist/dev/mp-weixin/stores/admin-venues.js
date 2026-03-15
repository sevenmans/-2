"use strict";
const common_vendor = require("../common/vendor.js");
const api_admin = require("../api/admin.js");
const utils_request = require("../utils/request.js");
const useAdminVenuesStore = common_vendor.defineStore("adminVenues", {
  state: () => ({
    managerVenues: [],
    editingVenue: null,
    timeslots: [],
    loading: false,
    timeslotLoading: false
  }),
  actions: {
    async fetchManagedVenues() {
      this.loading = true;
      try {
        const res = await api_admin.getMyManagedVenues();
        this.managerVenues = res.data || res || [];
      } catch (e) {
        common_vendor.index.__f__("error", "at stores/admin-venues.js:30", "[AdminVenues] fetchManagedVenues error:", e);
        throw e;
      } finally {
        this.loading = false;
      }
    },
    async fetchVenueDetail(id) {
      const res = await api_admin.getVenueDetail(id);
      this.editingVenue = res.data || res;
      return this.editingVenue;
    },
    async saveVenue(data) {
      if (data.id) {
        const res = await api_admin.updateVenue(data.id, data);
        const updatedVenue = (res == null ? void 0 : res.data) || res;
        if (updatedVenue && updatedVenue.id) {
          const index = this.managerVenues.findIndex((v) => v.id === updatedVenue.id);
          if (index !== -1)
            this.managerVenues.splice(index, 1, updatedVenue);
        }
        return res;
      } else {
        const res = await api_admin.createVenue(data);
        const createdVenue = (res == null ? void 0 : res.data) || res;
        if (createdVenue && createdVenue.id) {
          const exists = this.managerVenues.some((v) => v.id === createdVenue.id);
          if (!exists)
            this.managerVenues.unshift(createdVenue);
        }
        return res;
      }
    },
    async removeVenue(id) {
      await api_admin.deleteVenue(id);
      utils_request.clearCache("/venues/manager/me");
      const numId = Number(id);
      this.managerVenues = this.managerVenues.filter((v) => Number(v.id) !== numId);
    },
    async toggleVenueStatus(id, status) {
      await api_admin.updateVenueStatus(id, { status });
      const venue = this.managerVenues.find((v) => v.id === id);
      if (venue)
        venue.status = status;
    },
    async fetchTimeslots(venueId, date) {
      this.timeslotLoading = true;
      try {
        const res = await api_admin.getVenueTimeslots(venueId, date);
        this.timeslots = res.data || res || [];
      } catch (e) {
        common_vendor.index.__f__("error", "at stores/admin-venues.js:84", "[AdminVenues] fetchTimeslots error:", e);
        throw e;
      } finally {
        this.timeslotLoading = false;
      }
    },
    async changeTimeslotStatus(id, status) {
      const res = await api_admin.updateTimeslotStatus(id, { status });
      const slot = this.timeslots.find((s) => s.id === id);
      if (slot)
        slot.status = status;
      return res;
    }
  }
});
exports.useAdminVenuesStore = useAdminVenuesStore;
//# sourceMappingURL=../../.sourcemap/mp-weixin/stores/admin-venues.js.map
