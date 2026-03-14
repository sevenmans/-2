"use strict";
const common_vendor = require("../common/vendor.js");
const stores_user = require("./user.js");
const useAdminSecurityStore = common_vendor.defineStore("adminSecurity", {
  state: () => ({
    submitting: false
  }),
  actions: {
    async changePassword(oldPassword, newPassword) {
      this.submitting = true;
      try {
        const userStore = stores_user.useUserStore();
        await userStore.changePassword({ oldPassword, newPassword });
        return true;
      } catch (e) {
        common_vendor.index.__f__("error", "at stores/admin-security.js:17", "[AdminSecurity] changePassword error:", e);
        throw e;
      } finally {
        this.submitting = false;
      }
    }
  }
});
exports.useAdminSecurityStore = useAdminSecurityStore;
//# sourceMappingURL=../../.sourcemap/mp-weixin/stores/admin-security.js.map
