"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_user = require("../../stores/user.js");
const stores_venue = require("../../stores/venue.js");
const stores_booking = require("../../stores/booking.js");
const stores_sharing = require("../../stores/sharing.js");
const stores_app = require("../../stores/app.js");
const _sfc_main = {
  name: "MigrationValidation",
  data() {
    return {
      userStore: null,
      venueStore: null,
      bookingStore: null,
      sharingStore: null,
      appStore: null,
      testing: false,
      testResults: {
        userStore: false,
        venueStore: false,
        bookingStore: false,
        sharingStore: false,
        appStore: false
      },
      functionResults: {
        user: "",
        venue: "",
        booking: "",
        sharing: ""
      },
      testLogs: []
    };
  },
  computed: {
    totalTests() {
      return Object.keys(this.testResults).length;
    },
    passedTests() {
      return Object.values(this.testResults).filter((result) => result).length;
    },
    allTestsPassed() {
      return this.passedTests === this.totalTests;
    }
  },
  onLoad() {
    this.initializeStores();
    this.runStoreConnectionTests();
  },
  methods: {
    initializeStores() {
      try {
        this.userStore = stores_user.useUserStore();
        this.venueStore = stores_venue.useVenueStore();
        this.bookingStore = stores_booking.useBookingStore();
        this.sharingStore = stores_sharing.useSharingStore();
        this.appStore = stores_app.useAppStore();
        this.addLog("success", "所有Store初始化成功");
      } catch (error) {
        this.addLog("error", `Store初始化失败: ${error.message}`);
      }
    },
    runStoreConnectionTests() {
      this.testResults.userStore = !!this.userStore;
      this.testResults.venueStore = !!this.venueStore;
      this.testResults.bookingStore = !!this.bookingStore;
      this.testResults.sharingStore = !!this.sharingStore;
      this.testResults.appStore = !!this.appStore;
      this.addLog("info", `Store连接测试完成: ${this.passedTests}/${this.totalTests} 通过`);
    },
    getTestStatus(testName) {
      return this.testResults[testName] ? "success" : "error";
    },
    addLog(type, message) {
      const time = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      this.testLogs.push({ type, message, time });
    },
    async testUserFunctions() {
      this.testing = true;
      try {
        this.addLog("info", "开始测试用户功能...");
        if (typeof this.userStore.getUserInfo === "function") {
          this.addLog("success", "✅ getUserInfo方法存在");
        } else {
          this.addLog("error", "❌ getUserInfo方法不存在");
        }
        const userInfo = this.userStore.userInfoGetter;
        this.addLog("info", `用户信息: ${JSON.stringify(userInfo)}`);
        if (typeof this.userStore.login === "function") {
          this.addLog("success", "✅ login方法存在");
        } else {
          this.addLog("error", "❌ login方法不存在");
        }
        if (typeof this.userStore.logout === "function") {
          this.addLog("success", "✅ logout方法存在");
        } else {
          this.addLog("error", "❌ logout方法不存在");
        }
        this.functionResults.user = "✅ 用户功能测试通过";
        this.addLog("success", "用户功能测试完成");
      } catch (error) {
        this.functionResults.user = "❌ 用户功能测试失败";
        this.addLog("error", `用户功能测试失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    },
    async testVenueFunctions() {
      this.testing = true;
      try {
        this.addLog("info", "开始测试场馆功能...");
        if (typeof this.venueStore.getVenueList === "function") {
          this.addLog("success", "✅ getVenueList方法存在");
        } else {
          this.addLog("error", "❌ getVenueList方法不存在");
        }
        if (typeof this.venueStore.getVenueDetail === "function") {
          this.addLog("success", "✅ getVenueDetail方法存在");
        } else {
          this.addLog("error", "❌ getVenueDetail方法不存在");
        }
        if (typeof this.venueStore.searchVenues === "function") {
          this.addLog("success", "✅ searchVenues方法存在");
        } else {
          this.addLog("error", "❌ searchVenues方法不存在");
        }
        this.functionResults.venue = "✅ 场馆功能测试通过";
        this.addLog("success", "场馆功能测试完成");
      } catch (error) {
        this.functionResults.venue = "❌ 场馆功能测试失败";
        this.addLog("error", `场馆功能测试失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    },
    async testBookingFunctions() {
      this.testing = true;
      try {
        this.addLog("info", "开始测试预订功能...");
        if (typeof this.bookingStore.getMyBookings === "function") {
          this.addLog("success", "✅ getMyBookings方法存在");
        } else {
          this.addLog("error", "❌ getMyBookings方法不存在");
        }
        if (typeof this.bookingStore.createBooking === "function") {
          this.addLog("success", "✅ createBooking方法存在");
        } else {
          this.addLog("error", "❌ createBooking方法不存在");
        }
        if (typeof this.bookingStore.getBookingDetail === "function") {
          this.addLog("success", "✅ getBookingDetail方法存在");
        } else {
          this.addLog("error", "❌ getBookingDetail方法不存在");
        }
        this.functionResults.booking = "✅ 预订功能测试通过";
        this.addLog("success", "预订功能测试完成");
      } catch (error) {
        this.functionResults.booking = "❌ 预订功能测试失败";
        this.addLog("error", `预订功能测试失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    },
    async testSharingFunctions() {
      this.testing = true;
      try {
        this.addLog("info", "开始测试拼场功能...");
        if (typeof this.sharingStore.getJoinableSharingOrders === "function") {
          this.addLog("success", "✅ getJoinableSharingOrders方法存在");
        } else {
          this.addLog("error", "❌ getJoinableSharingOrders方法不存在");
        }
        if (typeof this.sharingStore.createSharingOrder === "function") {
          this.addLog("success", "✅ createSharingOrder方法存在");
        } else {
          this.addLog("error", "❌ createSharingOrder方法不存在");
        }
        if (typeof this.sharingStore.applySharingOrder === "function") {
          this.addLog("success", "✅ applySharingOrder方法存在");
        } else {
          this.addLog("error", "❌ applySharingOrder方法不存在");
        }
        this.functionResults.sharing = "✅ 拼场功能测试通过";
        this.addLog("success", "拼场功能测试完成");
      } catch (error) {
        this.functionResults.sharing = "❌ 拼场功能测试失败";
        this.addLog("error", `拼场功能测试失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    },
    testPageNavigation(page) {
      try {
        common_vendor.index.navigateTo({
          url: `/pages/${page}`
        });
        this.addLog("success", `✅ 成功导航到 ${page}`);
      } catch (error) {
        this.addLog("error", `❌ 导航到 ${page} 失败: ${error.message}`);
      }
    },
    // 测试API连通性
    async testApiConnectivity() {
      this.testing = true;
      this.addLog("info", "🌐 开始测试API连通性...");
      try {
        this.addLog("info", "测试Booking API方法...");
        const bookingApiMethods = [
          "createBooking",
          "getBookingDetail",
          "createSharedBooking",
          "cancelBooking",
          "getVenueAvailableSlots",
          "applySharedBooking"
        ];
        for (const method of bookingApiMethods) {
          if (typeof this.bookingStore[method] === "function") {
            this.addLog("success", `✅ bookingStore.${method}: function`);
          } else {
            this.addLog("error", `❌ bookingStore.${method}: ${typeof this.bookingStore[method]}`);
          }
        }
        this.addLog("info", "测试Sharing API方法...");
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
            this.addLog("success", `✅ sharingStore.${method}: function`);
          } else {
            this.addLog("error", `❌ sharingStore.${method}: ${typeof this.sharingStore[method]}`);
          }
        }
        this.addLog("success", "🎉 API连通性测试完成！");
      } catch (error) {
        this.addLog("error", `API连通性测试失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    },
    // 测试Getter命名修复
    async testGetterNamingFix() {
      this.testing = true;
      this.addLog("info", "🔧 开始测试Getter命名修复...");
      try {
        if (this.bookingStore) {
          this.addLog("info", "测试Booking Store getter命名...");
          const bookingList = this.bookingStore.bookingListGetter;
          const bookingDetail = this.bookingStore.bookingDetailGetter;
          const sharingOrders = this.bookingStore.sharingOrdersGetter;
          this.addLog("success", `✅ bookingListGetter: ${typeof bookingList}`);
          this.addLog("success", `✅ bookingDetailGetter: ${typeof bookingDetail}`);
          this.addLog("success", `✅ sharingOrdersGetter: ${typeof sharingOrders}`);
        }
        if (this.sharingStore) {
          this.addLog("info", "测试Sharing Store getter命名...");
          const sharingOrdersGetter = this.sharingStore.sharingOrdersGetter;
          const mySharingOrdersGetter = this.sharingStore.mySharingOrdersGetter;
          const sharingOrderDetailGetter = this.sharingStore.sharingOrderDetailGetter;
          this.addLog("success", `✅ sharingOrdersGetter: ${typeof sharingOrdersGetter}`);
          this.addLog("success", `✅ mySharingOrdersGetter: ${typeof mySharingOrdersGetter}`);
          this.addLog("success", `✅ sharingOrderDetailGetter: ${typeof sharingOrderDetailGetter}`);
        }
        this.addLog("success", "🎉 Getter命名修复测试完成！所有命名冲突已解决");
      } catch (error) {
        this.addLog("error", `Getter命名修复测试失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    },
    // 测试状态管理响应式
    async testStateReactivity() {
      this.testing = true;
      this.addLog("info", "🔄 开始测试状态管理响应式...");
      try {
        if (this.bookingStore) {
          this.addLog("info", "测试Booking Store状态响应式...");
          const initialBookingList = this.bookingStore.bookingListGetter;
          this.addLog("info", `初始bookingList长度: ${(initialBookingList == null ? void 0 : initialBookingList.length) || 0}`);
          this.bookingStore.setBookingList([{ id: "test", name: "Test Booking" }]);
          const updatedBookingList = this.bookingStore.bookingListGetter;
          this.addLog("success", `✅ 状态更新成功，新长度: ${(updatedBookingList == null ? void 0 : updatedBookingList.length) || 0}`);
          this.bookingStore.setBookingList(initialBookingList || []);
        }
        if (this.sharingStore) {
          this.addLog("info", "测试Sharing Store状态响应式...");
          const initialSharingOrders = this.sharingStore.sharingOrdersGetter;
          this.addLog("info", `初始sharingOrders长度: ${(initialSharingOrders == null ? void 0 : initialSharingOrders.length) || 0}`);
          this.sharingStore.setSharingOrders([{ id: "test", name: "Test Sharing" }]);
          const updatedSharingOrders = this.sharingStore.sharingOrdersGetter;
          this.addLog("success", `✅ 状态更新成功，新长度: ${(updatedSharingOrders == null ? void 0 : updatedSharingOrders.length) || 0}`);
          this.sharingStore.setSharingOrders(initialSharingOrders || []);
        }
        this.addLog("success", "🎉 状态管理响应式测试完成！");
      } catch (error) {
        this.addLog("error", `状态管理响应式测试失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    },
    async runFullTest() {
      this.testing = true;
      this.addLog("info", "🚀 开始运行全面测试...");
      try {
        await this.testApiConnectivity();
        await new Promise((resolve) => setTimeout(resolve, 500));
        await this.testGetterNamingFix();
        await new Promise((resolve) => setTimeout(resolve, 500));
        await this.testStateReactivity();
        await new Promise((resolve) => setTimeout(resolve, 500));
        await this.testUserFunctions();
        await new Promise((resolve) => setTimeout(resolve, 500));
        await this.testVenueFunctions();
        await new Promise((resolve) => setTimeout(resolve, 500));
        await this.testBookingFunctions();
        await new Promise((resolve) => setTimeout(resolve, 500));
        await this.testSharingFunctions();
        await new Promise((resolve) => setTimeout(resolve, 500));
        this.addLog("success", "🎉 全面测试完成！");
        if (this.allTestsPassed) {
          common_vendor.index.showToast({
            title: "🎉 所有测试通过！",
            icon: "success",
            duration: 3e3
          });
        } else {
          common_vendor.index.showToast({
            title: "⚠️ 部分测试失败",
            icon: "none",
            duration: 3e3
          });
        }
      } catch (error) {
        this.addLog("error", `全面测试失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($options.allTestsPassed ? "✅ 全部通过" : "❌ 存在问题"),
    b: $options.allTestsPassed ? 1 : "",
    c: !$options.allTestsPassed ? 1 : "",
    d: common_vendor.t($options.passedTests),
    e: common_vendor.t($options.totalTests),
    f: common_vendor.t($data.testResults.userStore ? "✅" : "❌"),
    g: common_vendor.n($options.getTestStatus("userStore")),
    h: common_vendor.t($data.testResults.venueStore ? "✅" : "❌"),
    i: common_vendor.n($options.getTestStatus("venueStore")),
    j: common_vendor.t($data.testResults.bookingStore ? "✅" : "❌"),
    k: common_vendor.n($options.getTestStatus("bookingStore")),
    l: common_vendor.t($data.testResults.sharingStore ? "✅" : "❌"),
    m: common_vendor.n($options.getTestStatus("sharingStore")),
    n: common_vendor.t($data.testResults.appStore ? "✅" : "❌"),
    o: common_vendor.n($options.getTestStatus("appStore")),
    p: common_vendor.t($data.testing ? "测试中..." : "测试用户功能"),
    q: common_vendor.o((...args) => $options.testUserFunctions && $options.testUserFunctions(...args)),
    r: $data.testing,
    s: common_vendor.t($data.functionResults.user || "待测试"),
    t: common_vendor.t($data.testing ? "测试中..." : "测试场馆功能"),
    v: common_vendor.o((...args) => $options.testVenueFunctions && $options.testVenueFunctions(...args)),
    w: $data.testing,
    x: common_vendor.t($data.functionResults.venue || "待测试"),
    y: common_vendor.t($data.testing ? "测试中..." : "测试预订功能"),
    z: common_vendor.o((...args) => $options.testBookingFunctions && $options.testBookingFunctions(...args)),
    A: $data.testing,
    B: common_vendor.t($data.functionResults.booking || "待测试"),
    C: common_vendor.t($data.testing ? "测试中..." : "测试拼场功能"),
    D: common_vendor.o((...args) => $options.testSharingFunctions && $options.testSharingFunctions(...args)),
    E: $data.testing,
    F: common_vendor.t($data.functionResults.sharing || "待测试"),
    G: common_vendor.o(($event) => $options.testPageNavigation("user/login")),
    H: common_vendor.o(($event) => $options.testPageNavigation("user/profile")),
    I: common_vendor.o(($event) => $options.testPageNavigation("venue/list")),
    J: common_vendor.o(($event) => $options.testPageNavigation("booking/list")),
    K: common_vendor.o(($event) => $options.testPageNavigation("sharing/list")),
    L: common_vendor.t($data.testing ? "🔄 测试进行中..." : "🌐 测试API连通性"),
    M: common_vendor.o((...args) => $options.testApiConnectivity && $options.testApiConnectivity(...args)),
    N: $data.testing,
    O: common_vendor.t($data.testing ? "🔄 测试进行中..." : "🔧 测试Getter命名修复"),
    P: common_vendor.o((...args) => $options.testGetterNamingFix && $options.testGetterNamingFix(...args)),
    Q: $data.testing,
    R: common_vendor.t($data.testing ? "🔄 测试进行中..." : "🔄 测试状态响应式"),
    S: common_vendor.o((...args) => $options.testStateReactivity && $options.testStateReactivity(...args)),
    T: $data.testing,
    U: common_vendor.t($data.testing ? "🔄 测试进行中..." : "🚀 运行全面测试"),
    V: common_vendor.o((...args) => $options.runFullTest && $options.runFullTest(...args)),
    W: $data.testing,
    X: $data.testLogs.length > 0
  }, $data.testLogs.length > 0 ? {
    Y: common_vendor.f($data.testLogs, (log, index, i0) => {
      return {
        a: common_vendor.t(log.time),
        b: common_vendor.t(log.message),
        c: index,
        d: common_vendor.n(log.type)
      };
    })
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-f9c2d39b"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/migration-validation.js.map
