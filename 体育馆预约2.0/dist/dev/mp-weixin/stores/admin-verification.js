"use strict";
const common_vendor = require("../common/vendor.js");
const api_verification = require("../api/verification.js");
const utils_adminAdapter = require("../utils/admin-adapter.js");
const HISTORY_KEY = "admin_verify_history";
const MAX_HISTORY = 5;
function loadHistory() {
  try {
    return JSON.parse(common_vendor.index.getStorageSync(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveHistory(list) {
  common_vendor.index.setStorageSync(HISTORY_KEY, JSON.stringify(list));
}
const useAdminVerificationStore = common_vendor.defineStore("adminVerification", {
  state: () => ({
    currentCode: "",
    verifyResult: null,
    verifying: false,
    querying: false,
    history: loadHistory()
  }),
  actions: {
    setCode(code) {
      this.currentCode = code.trim();
    },
    async queryByCode(code) {
      this.querying = true;
      this.verifyResult = null;
      try {
        const res = await api_verification.getOrderByVerifyCode(code);
        const raw = res.data || res;
        this.verifyResult = utils_adminAdapter.adaptAdminOrder(raw);
        return this.verifyResult;
      } catch (e) {
        common_vendor.index.__f__("error", "at stores/admin-verification.js:41", "[AdminVerify] queryByCode error:", e);
        throw e;
      } finally {
        this.querying = false;
      }
    },
    async executeVerify(code) {
      this.verifying = true;
      try {
        const res = await api_verification.verifyByCode(code);
        this.addToHistory(code, this.verifyResult);
        return res;
      } catch (e) {
        common_vendor.index.__f__("error", "at stores/admin-verification.js:55", "[AdminVerify] executeVerify error:", e);
        throw e;
      } finally {
        this.verifying = false;
      }
    },
    addToHistory(code, order) {
      const record = {
        code,
        time: (/* @__PURE__ */ new Date()).toLocaleString(),
        venueName: (order == null ? void 0 : order.venueName) || "",
        userName: (order == null ? void 0 : order.userName) || ""
      };
      this.history.unshift(record);
      if (this.history.length > MAX_HISTORY)
        this.history.pop();
      saveHistory(this.history);
    },
    clearResult() {
      this.verifyResult = null;
      this.currentCode = "";
    }
  }
});
exports.useAdminVerificationStore = useAdminVerificationStore;
//# sourceMappingURL=../../.sourcemap/mp-weixin/stores/admin-verification.js.map
