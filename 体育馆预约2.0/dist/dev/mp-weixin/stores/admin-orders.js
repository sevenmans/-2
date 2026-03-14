"use strict";
const common_vendor = require("../common/vendor.js");
const api_adminDashboard = require("../api/admin-dashboard.js");
const utils_adminAdapter = require("../utils/admin-adapter.js");
const useAdminOrdersStore = common_vendor.defineStore("adminOrders", {
  state: () => ({
    list: [],
    filters: {
      status: "",
      keyword: "",
      venueId: "",
      type: "",
      startDate: "",
      endDate: ""
    },
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      hasMore: true
    },
    loading: false,
    selectedOrder: null,
    needRefresh: false
    // 标记是否需要刷新列表（核销/完成/取消后设为true）
  }),
  actions: {
    setFilter(key, value) {
      this.filters[key] = value;
      this.pagination.page = 1;
      this.list = [];
      this.pagination.hasMore = true;
    },
    resetFilters() {
      this.filters = { status: "", keyword: "", venueId: "", type: "", startDate: "", endDate: "" };
      this.pagination.page = 1;
      this.list = [];
      this.pagination.hasMore = true;
    },
    async fetchOrders(append = false, forceRefresh = false) {
      if (this.loading)
        return;
      this.loading = true;
      try {
        const params = {
          page: this.pagination.page,
          pageSize: this.pagination.pageSize,
          ...this.filters
        };
        Object.keys(params).forEach((k) => {
          if (!params[k])
            delete params[k];
        });
        const options = forceRefresh || this.needRefresh ? { cache: false } : {};
        if (this.needRefresh) {
          this.needRefresh = false;
        }
        const res = await api_adminDashboard.getAdminBookings(params, options);
        let sourceList = [];
        let total = 0;
        if (res && res.success && Array.isArray(res.data)) {
          sourceList = res.data;
          total = res.total || res.data.length;
        } else if (Array.isArray(res)) {
          sourceList = res;
          total = res.length;
        } else if (res && res.data) {
          const raw = res.data;
          if (Array.isArray(raw)) {
            sourceList = raw;
            total = raw.length;
          } else {
            sourceList = raw.data || raw.content || raw.list || raw.records || [];
            total = raw.totalElements || raw.total || sourceList.length;
          }
        }
        const items = sourceList.map(utils_adminAdapter.adaptAdminOrder).filter(Boolean);
        if (append) {
          this.list = [...this.list, ...items];
        } else {
          this.list = items;
        }
        this.pagination.total = total;
        this.pagination.hasMore = this.list.length < total;
      } catch (e) {
        common_vendor.index.__f__("error", "at stores/admin-orders.js:95", "[AdminOrders] fetchOrders error:", e);
        throw e;
      } finally {
        this.loading = false;
      }
    },
    async loadMore() {
      if (!this.pagination.hasMore || this.loading)
        return;
      this.pagination.page++;
      await this.fetchOrders(true);
    },
    async cancelOrder(id) {
      const res = await api_adminDashboard.adminCancelBooking(id);
      const idx = this.list.findIndex((o) => o.id === id);
      if (idx > -1) {
        this.list[idx].status = "CANCELLED";
        this.list[idx].statusText = "已退款";
      }
      return res;
    }
  }
});
exports.useAdminOrdersStore = useAdminOrdersStore;
//# sourceMappingURL=../../.sourcemap/mp-weixin/stores/admin-orders.js.map
