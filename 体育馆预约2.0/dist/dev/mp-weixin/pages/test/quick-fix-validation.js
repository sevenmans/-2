"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_booking = require("../../stores/booking.js");
const stores_user = require("../../stores/user.js");
const _sfc_main = {
  name: "QuickFixValidation",
  data() {
    return {
      testing: false,
      logs: []
    };
  },
  setup() {
    const bookingStore = stores_booking.useBookingStore();
    const userStore = stores_user.useUserStore();
    return {
      bookingStore,
      userStore
    };
  },
  methods: {
    addLog(type, message) {
      this.logs.push({
        type,
        message,
        time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
      });
      common_vendor.index.__f__("log", "at pages/test/quick-fix-validation.vue:68", `[快速修复验证] ${type.toUpperCase()}: ${message}`);
    },
    clearLogs() {
      this.logs = [];
    },
    // 验证修复的方法
    async testFixedMethods() {
      this.testing = true;
      this.clearLogs();
      this.addLog("info", "🔧 开始验证修复的方法...");
      try {
        this.addLog("info", "验证Booking Store新增方法...");
        const fixedBookingMethods = [
          "getVenueAvailableSlots",
          "applySharedBooking"
        ];
        for (const method of fixedBookingMethods) {
          if (typeof this.bookingStore[method] === "function") {
            this.addLog("success", `✅ bookingStore.${method}: 方法已修复`);
          } else {
            this.addLog("error", `❌ bookingStore.${method}: 方法仍然缺失`);
          }
        }
        this.addLog("info", "验证User Store新增方法...");
        const fixedUserMethods = [
          "getUserInfo",
          "updateUserInfo"
        ];
        for (const method of fixedUserMethods) {
          if (typeof this.userStore[method] === "function") {
            this.addLog("success", `✅ userStore.${method}: 方法已修复`);
          } else {
            this.addLog("error", `❌ userStore.${method}: 方法仍然缺失 (类型: ${typeof this.userStore[method]})`);
          }
        }
        this.addLog("success", "🎉 修复验证完成！");
      } catch (error) {
        this.addLog("error", `修复验证失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    },
    // 测试Booking Store方法
    async testBookingStoreMethods() {
      this.testing = true;
      this.addLog("info", "🔍 测试Booking Store所有方法...");
      try {
        const allBookingMethods = [
          "createBooking",
          "getBookingDetail",
          "createSharedBooking",
          "cancelBooking",
          "getUserBookings",
          "getSharingOrdersList",
          "getVenueAvailableSlots",
          "applySharedBooking",
          "createSharingOrderNew"
        ];
        let successCount = 0;
        let totalCount = allBookingMethods.length;
        for (const method of allBookingMethods) {
          if (typeof this.bookingStore[method] === "function") {
            this.addLog("success", `✅ bookingStore.${method}: 存在`);
            successCount++;
          } else {
            this.addLog("error", `❌ bookingStore.${method}: 不存在`);
          }
        }
        this.addLog("info", `📊 Booking Store方法统计: ${successCount}/${totalCount} 个方法可用`);
        if (successCount === totalCount) {
          this.addLog("success", "🎉 所有Booking Store方法都可用！");
        } else {
          this.addLog("warning", `⚠️ 还有 ${totalCount - successCount} 个方法需要修复`);
        }
      } catch (error) {
        this.addLog("error", `Booking Store方法测试失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    },
    // 测试User Store方法
    async testUserStoreMethods() {
      this.testing = true;
      this.addLog("info", "🔍 测试User Store所有方法...");
      try {
        const allUserMethods = [
          "login",
          "logout",
          "register",
          "getUserInfo",
          "updateUserInfo",
          "checkLoginStatus"
        ];
        let successCount = 0;
        let totalCount = allUserMethods.length;
        for (const method of allUserMethods) {
          if (typeof this.userStore[method] === "function") {
            this.addLog("success", `✅ userStore.${method}: 存在`);
            successCount++;
          } else {
            this.addLog("error", `❌ userStore.${method}: 不存在`);
          }
        }
        this.addLog("info", `📊 User Store方法统计: ${successCount}/${totalCount} 个方法可用`);
        if (successCount === totalCount) {
          this.addLog("success", "🎉 所有User Store方法都可用！");
        } else {
          this.addLog("warning", `⚠️ 还有 ${totalCount - successCount} 个方法需要修复`);
        }
      } catch (error) {
        this.addLog("error", `User Store方法测试失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o((...args) => $options.testFixedMethods && $options.testFixedMethods(...args)),
    b: $data.testing,
    c: common_vendor.o((...args) => $options.testBookingStoreMethods && $options.testBookingStoreMethods(...args)),
    d: $data.testing,
    e: common_vendor.o((...args) => $options.testUserStoreMethods && $options.testUserStoreMethods(...args)),
    f: $data.testing,
    g: common_vendor.f($data.logs, (log, index, i0) => {
      return {
        a: common_vendor.t(log.message),
        b: common_vendor.t(log.time),
        c: index,
        d: common_vendor.n(log.type)
      };
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-d7df3e6d"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/quick-fix-validation.js.map
