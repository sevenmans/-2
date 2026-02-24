"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_booking = require("../../stores/booking.js");
const stores_sharing = require("../../stores/sharing.js");
const stores_user = require("../../stores/user.js");
const _sfc_main = {
  name: "ApiDiagnosis",
  data() {
    return {
      testing: false,
      logs: []
    };
  },
  setup() {
    const bookingStore = stores_booking.useBookingStore();
    const sharingStore = stores_sharing.useSharingStore();
    const userStore = stores_user.useUserStore();
    return {
      bookingStore,
      sharingStore,
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
      common_vendor.index.__f__("log", "at pages/test/api-diagnosis.vue:75", `[API诊断] ${type.toUpperCase()}: ${message}`);
    },
    clearLogs() {
      this.logs = [];
    },
    // 测试Booking APIs
    async testBookingApis() {
      this.testing = true;
      this.addLog("info", "🔍 开始测试Booking APIs...");
      try {
        const bookingApiMethods = [
          "createBooking",
          "getBookingDetail",
          "createSharedBooking",
          "cancelBooking",
          "getUserBookings",
          "getSharingOrdersList",
          "getVenueAvailableSlots",
          "applySharedBooking"
        ];
        for (const method of bookingApiMethods) {
          if (typeof this.bookingStore[method] === "function") {
            this.addLog("success", `✅ bookingStore.${method}: 方法存在`);
          } else {
            this.addLog("error", `❌ bookingStore.${method}: 方法不存在或类型错误`);
          }
        }
        try {
          this.addLog("info", "测试getUserBookings API调用...");
          await this.bookingStore.getUserBookings({ page: 1, pageSize: 1 });
          this.addLog("success", "✅ getUserBookings API调用成功");
        } catch (error) {
          this.addLog("error", `❌ getUserBookings API调用失败: ${error.message}`);
        }
        this.addLog("success", "🎉 Booking APIs测试完成");
      } catch (error) {
        this.addLog("error", `Booking APIs测试失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    },
    // 测试Sharing APIs
    async testSharingApis() {
      this.testing = true;
      this.addLog("info", "🔍 开始测试Sharing APIs...");
      try {
        const sharingApiMethods = [
          "getSharingOrdersList",
          "getOrderDetail",
          "createOrder",
          "handleRequest",
          "applyJoinSharingOrder",
          "confirmSharingOrder"
        ];
        for (const method of sharingApiMethods) {
          if (typeof this.sharingStore[method] === "function") {
            this.addLog("success", `✅ sharingStore.${method}: 方法存在`);
          } else {
            this.addLog("error", `❌ sharingStore.${method}: 方法不存在或类型错误`);
          }
        }
        try {
          this.addLog("info", "测试getSharingOrdersList API调用...");
          await this.sharingStore.getSharingOrdersList({ page: 1, pageSize: 1 });
          this.addLog("success", "✅ getSharingOrdersList API调用成功");
        } catch (error) {
          this.addLog("error", `❌ getSharingOrdersList API调用失败: ${error.message}`);
        }
        this.addLog("success", "🎉 Sharing APIs测试完成");
      } catch (error) {
        this.addLog("error", `Sharing APIs测试失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    },
    // 测试User APIs
    async testUserApis() {
      this.testing = true;
      this.addLog("info", "🔍 开始测试User APIs...");
      try {
        const userApiMethods = [
          "login",
          "logout",
          "getUserInfo",
          "updateUserInfo",
          "register"
        ];
        for (const method of userApiMethods) {
          if (typeof this.userStore[method] === "function") {
            this.addLog("success", `✅ userStore.${method}: 方法存在`);
          } else {
            this.addLog("error", `❌ userStore.${method}: 方法不存在或类型错误`);
          }
        }
        try {
          this.addLog("info", "测试getUserInfo API调用...");
          await this.userStore.getUserInfo();
          this.addLog("success", "✅ getUserInfo API调用成功");
        } catch (error) {
          this.addLog("error", `❌ getUserInfo API调用失败: ${error.message}`);
        }
        this.addLog("success", "🎉 User APIs测试完成");
      } catch (error) {
        this.addLog("error", `User APIs测试失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    },
    // 测试所有APIs
    async testAllApis() {
      this.testing = true;
      this.clearLogs();
      this.addLog("info", "🚀 开始全面API测试...");
      try {
        await this.testBookingApis();
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        await this.testSharingApis();
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        await this.testUserApis();
        this.addLog("success", "🎉 全面API测试完成！");
      } catch (error) {
        this.addLog("error", `全面API测试失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o((...args) => $options.testBookingApis && $options.testBookingApis(...args)),
    b: $data.testing,
    c: common_vendor.o((...args) => $options.testSharingApis && $options.testSharingApis(...args)),
    d: $data.testing,
    e: common_vendor.o((...args) => $options.testUserApis && $options.testUserApis(...args)),
    f: $data.testing,
    g: common_vendor.o((...args) => $options.testAllApis && $options.testAllApis(...args)),
    h: $data.testing,
    i: common_vendor.f($data.logs, (log, index, i0) => {
      return {
        a: common_vendor.t(log.message),
        b: common_vendor.t(log.time),
        c: index,
        d: common_vendor.n(log.type)
      };
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-15e82015"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/api-diagnosis.js.map
