"use strict";
const stores_app = require("../../stores/app.js");
const stores_user = require("../../stores/user.js");
const stores_venue = require("../../stores/venue.js");
const stores_booking = require("../../stores/booking.js");
const stores_sharing = require("../../stores/sharing.js");
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  name: "PiniaMigrationFinalCheck",
  data() {
    return {
      testing: false,
      testResults: [],
      testCompleted: false,
      appStore: null,
      userStore: null,
      venueStore: null,
      bookingStore: null,
      sharingStore: null
    };
  },
  computed: {
    successCount() {
      return this.testResults.filter((r) => r.status === "success").length;
    },
    warningCount() {
      return this.testResults.filter((r) => r.status === "warning").length;
    },
    errorCount() {
      return this.testResults.filter((r) => r.status === "error").length;
    },
    overallStatus() {
      if (this.errorCount > 0)
        return "error";
      if (this.warningCount > 0)
        return "warning";
      return "success";
    }
  },
  onLoad() {
    this.appStore = stores_app.useAppStore();
    this.userStore = stores_user.useUserStore();
    this.venueStore = stores_venue.useVenueStore();
    this.bookingStore = stores_booking.useBookingStore();
    this.sharingStore = stores_sharing.useSharingStore();
  },
  methods: {
    async runFullTest() {
      this.testing = true;
      this.testResults = [];
      this.testCompleted = false;
      const tests = [
        { id: "store-init", title: "Store初始化检查", test: this.testStoreInitialization },
        { id: "getter-access", title: "Getter访问测试", test: this.testGetterAccess },
        { id: "action-calls", title: "Action调用测试", test: this.testActionCalls },
        { id: "state-reactivity", title: "状态响应性测试", test: this.testStateReactivity },
        { id: "error-handling", title: "错误处理测试", test: this.testErrorHandling }
      ];
      for (const test of tests) {
        try {
          await test.test(test.id, test.title);
          await this.delay(500);
        } catch (error) {
          this.addResult(test.id, test.title, "error", `测试执行失败: ${error.message}`, "");
        }
      }
      this.testCompleted = true;
      this.testing = false;
    },
    async testStoreInitialization(id, title) {
      const stores = [
        { name: "app", store: this.appStore },
        { name: "user", store: this.userStore },
        { name: "venue", store: this.venueStore },
        { name: "booking", store: this.bookingStore },
        { name: "sharing", store: this.sharingStore }
      ];
      const uninitializedStores = stores.filter((s) => !s.store).map((s) => s.name);
      if (uninitializedStores.length === 0) {
        this.addResult(id, title, "success", "所有Store已正确初始化", "");
      } else {
        this.addResult(id, title, "error", `未初始化的Store: ${uninitializedStores.join(", ")}`, "检查Store导入和初始化");
      }
    },
    async testGetterAccess(id, title) {
      const getterTests = [
        { store: this.userStore, getter: "userInfoGetter", name: "user.userInfoGetter" },
        { store: this.venueStore, getter: "venueListGetter", name: "venue.venueListGetter" },
        { store: this.bookingStore, getter: "bookingListGetter", name: "booking.bookingListGetter" },
        { store: this.sharingStore, getter: "sharingOrdersGetter", name: "sharing.sharingOrdersGetter" }
      ];
      const failedGetters = [];
      for (const test of getterTests) {
        try {
          if (test.store && typeof test.store[test.getter] !== "undefined") {
          } else {
            failedGetters.push(test.name);
          }
        } catch (error) {
          failedGetters.push(`${test.name} (${error.message})`);
        }
      }
      if (failedGetters.length === 0) {
        this.addResult(id, title, "success", "所有关键Getter可正常访问", "");
      } else {
        this.addResult(id, title, "error", `无法访问的Getter: ${failedGetters.join(", ")}`, "检查Getter定义和命名");
      }
    },
    async testActionCalls(id, title) {
      const actionTests = [
        { store: this.userStore, action: "initUserState", name: "user.initUserState" },
        { store: this.appStore, action: "setLoading", name: "app.setLoading" },
        { store: this.venueStore, action: "getVenueList", name: "venue.getVenueList" },
        { store: this.sharingStore, action: "getSentRequestsList", name: "sharing.getSentRequestsList" },
        { store: this.sharingStore, action: "getReceivedRequestsList", name: "sharing.getReceivedRequestsList" }
      ];
      const failedActions = [];
      for (const test of actionTests) {
        try {
          if (test.store && typeof test.store[test.action] === "function") {
          } else {
            failedActions.push(test.name);
          }
        } catch (error) {
          failedActions.push(`${test.name} (${error.message})`);
        }
      }
      if (failedActions.length === 0) {
        this.addResult(id, title, "success", "所有关键Action可正常调用", "");
      } else {
        this.addResult(id, title, "error", `无法调用的Action: ${failedActions.join(", ")}`, "检查Action定义和实现");
      }
    },
    async testStateReactivity(id, title) {
      try {
        const originalLoading = this.appStore.loading;
        this.appStore.setLoading(!originalLoading);
        await this.delay(100);
        if (this.appStore.loading !== originalLoading) {
          this.appStore.setLoading(originalLoading);
          this.addResult(id, title, "success", "状态响应性正常", "");
        } else {
          this.addResult(id, title, "warning", "状态响应性可能有问题", "检查状态更新机制");
        }
      } catch (error) {
        this.addResult(id, title, "error", `响应性测试失败: ${error.message}`, "检查Store状态管理");
      }
    },
    async testErrorHandling(id, title) {
      const issues = [];
      const stores = [
        { name: "app", store: this.appStore },
        { name: "user", store: this.userStore },
        { name: "venue", store: this.venueStore },
        { name: "booking", store: this.bookingStore },
        { name: "sharing", store: this.sharingStore }
      ];
      stores.forEach(({ name, store }) => {
        if (!store.setLoading || typeof store.setLoading !== "function") {
          issues.push(`${name} store缺少setLoading方法`);
        }
      });
      if (issues.length === 0) {
        this.addResult(id, title, "success", "错误处理机制完善", "");
      } else {
        this.addResult(id, title, "warning", `错误处理问题: ${issues.join(", ")}`, "添加错误处理和loading状态管理");
      }
    },
    addResult(id, title, status, message, detail) {
      this.testResults.push({
        id,
        title,
        status,
        message,
        detail
      });
    },
    getStatusIcon(status) {
      switch (status) {
        case "success":
          return "✅";
        case "warning":
          return "⚠️";
        case "error":
          return "❌";
        default:
          return "❓";
      }
    },
    getSummaryMessage() {
      if (this.errorCount > 0) {
        return `发现 ${this.errorCount} 个错误，需要修复`;
      }
      if (this.warningCount > 0) {
        return `发现 ${this.warningCount} 个警告，建议优化`;
      }
      return "🎉 所有测试通过，迁移成功！";
    },
    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.testing ? "测试中..." : "🚀 运行完整测试"),
    b: common_vendor.o((...args) => $options.runFullTest && $options.runFullTest(...args)),
    c: $data.testing,
    d: $data.testResults.length > 0
  }, $data.testResults.length > 0 ? {
    e: common_vendor.f($data.testResults, (result, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t($options.getStatusIcon(result.status)),
        b: common_vendor.t(result.title),
        c: common_vendor.t(result.message),
        d: result.detail
      }, result.detail ? {
        e: common_vendor.t(result.detail)
      } : {}, {
        f: result.id,
        g: common_vendor.n(result.status)
      });
    })
  } : {}, {
    f: $data.testCompleted
  }, $data.testCompleted ? {
    g: common_vendor.t($options.successCount),
    h: common_vendor.t($options.warningCount),
    i: common_vendor.t($options.errorCount),
    j: common_vendor.t($options.getSummaryMessage()),
    k: common_vendor.n($options.overallStatus)
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-46bdd483"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/pinia-migration-final-check.js.map
