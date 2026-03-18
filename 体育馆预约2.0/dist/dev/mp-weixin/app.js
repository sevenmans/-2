"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
const utils_routerGuardNew = require("./utils/router-guard-new.js");
const stores_user = require("./stores/user.js");
const stores_app = require("./stores/app.js");
const stores_venue = require("./stores/venue.js");
const stores_sharing = require("./stores/sharing.js");
const stores_booking = require("./stores/booking.js");
const utils_auth = require("./utils/auth.js");
const stores_index = require("./stores/index.js");
const utils_feedback = require("./utils/feedback.js");
if (!Math) {
  "./pages/index/index.js";
  "./pages/venue/list.js";
  "./pages/venue/detail.js";
  "./pages/sharing/list.js";
  "./pages/test/index.js";
  "./pages/test/migration-validation.js";
  "./pages/test/api-diagnosis.js";
  "./pages/test/quick-fix-validation.js";
  "./pages/test/comprehensive-migration-check.js";
  "./pages/test/naming-conflict-fix.js";
  "./pages/booking/list.js";
  "./pages/user/profile.js";
  "./pages/booking/create.js";
  "./pages/booking/detail.js";
  "./pages/sharing/create.js";
  "./pages/sharing/detail.js";
  "./pages/sharing/manage.js";
  "./pages/sharing/participants.js";
  "./pages/sharing/my-orders.js";
  "./pages/user/login.js";
  "./pages/user/edit-profile.js";
  "./pages/test/auth-test.js";
  "./pages/sharing/requests.js";
  "./pages/sharing/received.js";
  "./pages/test/simple-test.js";
  "./pages/test/timeslot-sync.js";
  "./pages/test/sharing-test.js";
  "./pages/test/order-field-test.js";
  "./pages/test/payment-test.js";
  "./pages/test/order-status-test.js";
  "./pages/test/payment-fix.js";
  "./pages/test/pinia-migration-final-check.js";
  "./pages/test/timeslot-api-debug.js";
  "./pages/test/api-direct-test.js";
  "./pages/test/timeslot-status-fix.js";
  "./pages/test/timeslot-fix-test.js";
  "./pages/test/timeslot-sync-debug.js";
  "./pages/test/booking-data-fix-test.js";
  "./pages/test/timeslot-status-debug.js";
  "./pages/test/field-mapping-validation.js";
  "./pages/test/pinia-migration-final-validation.js";
  "./pages/test/timeslot-display-fix-test.js";
  "./pages/admin/dashboard.js";
  "./pages/admin/orders/list.js";
  "./pages/admin/orders/detail.js";
  "./pages/admin/verification/index.js";
  "./pages/admin/venues/list.js";
  "./pages/admin/venues/create.js";
  "./pages/admin/venues/edit.js";
  "./pages/admin/timeslots/index.js";
  "./pages/admin/security/password.js";
  "./pages/payment/index.js";
  "./pages/payment/success.js";
  "./pages/payment/failed.js";
}
const _sfc_main = {
  data() {
    return {
      userStore: null,
      appStore: null,
      venueStore: null,
      sharingStore: null,
      bookingStore: null
      // webSocketService已被移除
    };
  },
  onLaunch: function() {
    common_vendor.index.__f__("log", "at App.vue:24", "[App] 应用启动");
    common_vendor.index.__f__("log", "at App.vue:27", "🏪 初始化 Pinia stores");
    this.userStore = stores_user.useUserStore();
    this.appStore = stores_app.useAppStore();
    this.venueStore = stores_venue.useVenueStore();
    this.sharingStore = stores_sharing.useSharingStore();
    this.bookingStore = stores_booking.useBookingStore();
    utils_routerGuardNew.setupRouterGuard();
    this.userStore.initUserState();
    common_vendor.index.__f__("log", "at App.vue:41", "🎧 设置所有Store的事件监听器");
    this.venueStore.setupOrderExpiredListener();
    if (this.venueStore.setupAdditionalEventListeners) {
      this.venueStore.setupAdditionalEventListeners();
    }
    if (this.sharingStore.setupEventListeners) {
      this.sharingStore.setupEventListeners();
    }
    if (this.bookingStore.setupEventListeners) {
      this.bookingStore.setupEventListeners();
    }
    common_vendor.index.__f__("log", "at App.vue:59", "✅ 所有Store事件监听器设置完成");
    this.checkAndRedirectToLogin();
    this.$nextTick(() => {
      this.setupNetworkListener();
    });
  },
  onShow: function() {
    common_vendor.index.__f__("log", "at App.vue:72", "App Show");
  },
  onHide: function() {
    common_vendor.index.__f__("log", "at App.vue:75", "App Hide");
  },
  methods: {
    // WebSocket功能已被移除，initWebSocket方法已删除
    // 检查登录状态并跳转到登录页
    checkAndRedirectToLogin() {
      try {
        common_vendor.index.__f__("log", "at App.vue:85", "[App] 检查登录状态");
        const token = utils_auth.getToken();
        const userInfo = utils_auth.getUserInfo();
        if (!token || !userInfo) {
          common_vendor.index.__f__("log", "at App.vue:90", "[App] 未登录，跳转到登录页");
          common_vendor.index.reLaunch({
            url: "/pages/user/login"
          });
          return;
        }
        const pages = getCurrentPages();
        const currentPage = pages && pages.length ? `/${pages[pages.length - 1].route}` : "";
        if (utils_routerGuardNew.isAdmin(userInfo) && (!currentPage || !currentPage.startsWith("/pages/admin/"))) {
          common_vendor.index.reLaunch({ url: "/pages/admin/dashboard" });
          return;
        }
        common_vendor.index.__f__("log", "at App.vue:105", "[App] 已登录，继续正常流程");
      } catch (error) {
        common_vendor.index.__f__("warn", "at App.vue:107", "[App] 登录状态检查失败:", error.message);
        common_vendor.index.reLaunch({
          url: "/pages/user/login"
        });
      }
    },
    // 设置网络监听
    setupNetworkListener() {
      common_vendor.index.onNetworkStatusChange((res) => {
        this.appStore.setNetworkStatus(res.isConnected);
        if (!res.isConnected) {
          common_vendor.index.showToast({
            title: "网络连接已断开",
            icon: "none"
          });
        }
      });
    }
  }
};
function createApp() {
  const app = common_vendor.createSSRApp(_sfc_main);
  app.use(stores_index.pinia);
  app.use(utils_feedback.feedback);
  return {
    app
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
//# sourceMappingURL=../.sourcemap/mp-weixin/app.js.map
