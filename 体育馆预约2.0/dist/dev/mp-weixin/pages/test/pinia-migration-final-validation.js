"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_user = require("../../stores/user.js");
const stores_venue = require("../../stores/venue.js");
const stores_booking = require("../../stores/booking.js");
const stores_sharing = require("../../stores/sharing.js");
const stores_app = require("../../stores/app.js");
const _sfc_main = {
  name: "PiniaMigrationFinalValidation",
  data() {
    return {
      testResults: []
    };
  },
  onLoad() {
    this.userStore = stores_user.useUserStore();
    this.venueStore = stores_venue.useVenueStore();
    this.bookingStore = stores_booking.useBookingStore();
    this.sharingStore = stores_sharing.useSharingStore();
    this.appStore = stores_app.useAppStore();
    common_vendor.index.__f__("log", "at pages/test/pinia-migration-final-validation.vue:118", "🎉 Pinia迁移最终验证页面加载完成");
    this.addResult(true, "Pinia stores初始化成功");
  },
  methods: {
    // 添加测试结果
    addResult(success, message) {
      this.testResults.push({
        success,
        message,
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
      });
    },
    // 测试用户认证
    async testUserAuth() {
      try {
        common_vendor.index.__f__("log", "at pages/test/pinia-migration-final-validation.vue:135", "🧪 开始测试用户认证...");
        if (typeof this.userStore.checkLoginStatus === "function") {
          await this.userStore.checkLoginStatus();
          this.addResult(true, "用户认证功能正常");
        } else {
          this.addResult(false, "用户认证方法不存在");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/test/pinia-migration-final-validation.vue:145", "用户认证测试失败:", error);
        this.addResult(false, `用户认证测试失败: ${error.message}`);
      }
    },
    // 测试场馆数据
    async testVenueData() {
      try {
        common_vendor.index.__f__("log", "at pages/test/pinia-migration-final-validation.vue:153", "🧪 开始测试场馆数据...");
        if (typeof this.venueStore.getVenueList === "function") {
          await this.venueStore.getVenueList({ page: 1, pageSize: 5 });
          this.addResult(true, "场馆数据获取成功");
        } else {
          this.addResult(false, "场馆数据方法不存在");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/test/pinia-migration-final-validation.vue:162", "场馆数据测试失败:", error);
        this.addResult(false, `场馆数据测试失败: ${error.message}`);
      }
    },
    // 测试预订数据
    async testBookingData() {
      try {
        common_vendor.index.__f__("log", "at pages/test/pinia-migration-final-validation.vue:170", "🧪 开始测试预订数据...");
        if (typeof this.bookingStore.getUserBookings === "function") {
          await this.bookingStore.getUserBookings({ page: 1, pageSize: 5 });
          this.addResult(true, "预订数据获取成功");
        } else {
          this.addResult(false, "预订数据方法不存在");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/test/pinia-migration-final-validation.vue:179", "预订数据测试失败:", error);
        this.addResult(false, `预订数据测试失败: ${error.message}`);
      }
    },
    // 测试拼场数据
    async testSharingData() {
      try {
        common_vendor.index.__f__("log", "at pages/test/pinia-migration-final-validation.vue:187", "🧪 开始测试拼场数据...");
        if (typeof this.sharingStore.getAllSharingOrders === "function") {
          await this.sharingStore.getAllSharingOrders({ page: 1, pageSize: 5 });
          this.addResult(true, "拼场数据获取成功");
        } else {
          this.addResult(false, "拼场数据方法不存在");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/test/pinia-migration-final-validation.vue:196", "拼场数据测试失败:", error);
        this.addResult(false, `拼场数据测试失败: ${error.message}`);
      }
    },
    // 运行完整测试
    async runFullTest() {
      common_vendor.index.__f__("log", "at pages/test/pinia-migration-final-validation.vue:203", "🚀 开始运行完整测试...");
      this.clearTestData();
      this.addResult(true, "开始完整功能测试");
      await this.testUserAuth();
      await this.testVenueData();
      await this.testBookingData();
      await this.testSharingData();
      const successCount = this.testResults.filter((r) => r.success).length;
      const totalCount = this.testResults.length;
      if (successCount === totalCount) {
        this.addResult(true, `🎉 所有测试通过! (${successCount}/${totalCount})`);
        common_vendor.index.showToast({
          title: "所有测试通过!",
          icon: "success"
        });
      } else {
        this.addResult(false, `⚠️ 部分测试失败 (${successCount}/${totalCount})`);
        common_vendor.index.showToast({
          title: "部分测试失败",
          icon: "none"
        });
      }
    },
    // 清除测试数据
    clearTestData() {
      this.testResults = [];
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t(_ctx.userStore.isLoggedIn ? "已登录" : "未登录"),
    b: common_vendor.n(_ctx.userStore.isLoggedIn ? "success" : "error"),
    c: _ctx.userStore.isLoggedIn
  }, _ctx.userStore.isLoggedIn ? {
    d: common_vendor.t(_ctx.userStore.nickname || "未设置")
  } : {}, {
    e: common_vendor.o((...args) => $options.testUserAuth && $options.testUserAuth(...args)),
    f: common_vendor.t(_ctx.venueStore.venueListGetter.length),
    g: common_vendor.t(_ctx.venueStore.isLoading ? "加载中" : "就绪"),
    h: common_vendor.n(_ctx.venueStore.isLoading ? "warning" : "success"),
    i: common_vendor.o((...args) => $options.testVenueData && $options.testVenueData(...args)),
    j: common_vendor.t(_ctx.bookingStore.bookingListGetter.length),
    k: common_vendor.t(_ctx.bookingStore.isLoading ? "加载中" : "就绪"),
    l: common_vendor.n(_ctx.bookingStore.isLoading ? "warning" : "success"),
    m: common_vendor.o((...args) => $options.testBookingData && $options.testBookingData(...args)),
    n: common_vendor.t(_ctx.sharingStore.sharingOrdersGetter.length),
    o: common_vendor.t(_ctx.sharingStore.isLoading ? "加载中" : "就绪"),
    p: common_vendor.n(_ctx.sharingStore.isLoading ? "warning" : "success"),
    q: common_vendor.o((...args) => $options.testSharingData && $options.testSharingData(...args)),
    r: common_vendor.o((...args) => $options.runFullTest && $options.runFullTest(...args)),
    s: common_vendor.o((...args) => $options.clearTestData && $options.clearTestData(...args)),
    t: $data.testResults.length > 0
  }, $data.testResults.length > 0 ? {
    v: common_vendor.f($data.testResults, (result, index, i0) => {
      return {
        a: common_vendor.t(result.success ? "✅" : "❌"),
        b: common_vendor.n(result.success ? "success" : "error"),
        c: common_vendor.t(result.message),
        d: index
      };
    })
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-ce5d596e"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/pinia-migration-final-validation.js.map
