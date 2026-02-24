"use strict";
const common_vendor = require("../common/vendor.js");
const useAppStore = common_vendor.defineStore("app", {
  state: () => ({
    loading: false,
    networkStatus: true
  }),
  actions: {
    setLoading(loading) {
      this.loading = loading;
    },
    setNetworkStatus(status) {
      this.networkStatus = status;
    }
  },
  getters: {
    isLoading: (state) => state.loading,
    isOnline: (state) => state.networkStatus
  }
});
exports.useAppStore = useAppStore;
//# sourceMappingURL=../../.sourcemap/mp-weixin/stores/app.js.map
