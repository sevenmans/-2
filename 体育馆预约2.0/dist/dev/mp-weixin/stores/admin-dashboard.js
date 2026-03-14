"use strict";
const common_vendor = require("../common/vendor.js");
const api_adminDashboard = require("../api/admin-dashboard.js");
const utils_adminAdapter = require("../utils/admin-adapter.js");
const useAdminDashboardStore = common_vendor.defineStore("adminDashboard", {
  state: () => ({
    stats: null,
    timeRange: "today",
    startDate: "",
    endDate: "",
    loading: false
  }),
  actions: {
    setTimeRange(range) {
      this.timeRange = range;
    },
    setCustomDates(start, end) {
      this.startDate = start;
      this.endDate = end;
    },
    async fetchStats() {
      this.loading = true;
      try {
        const params = { timeRange: this.timeRange };
        if (this.timeRange === "custom") {
          params.startDate = this.startDate;
          params.endDate = this.endDate;
        }
        const res = await api_adminDashboard.getAdminDashboardStats(params);
        const raw = res.data || res;
        this.stats = utils_adminAdapter.adaptAdminStats(raw);
      } catch (e) {
        common_vendor.index.__f__("error", "at stores/admin-dashboard.js:36", "[AdminDashboard] fetchStats error:", e);
        throw e;
      } finally {
        this.loading = false;
      }
    },
    async refreshStats() {
      await this.fetchStats();
    }
  }
});
exports.useAdminDashboardStore = useAdminDashboardStore;
//# sourceMappingURL=../../.sourcemap/mp-weixin/stores/admin-dashboard.js.map
