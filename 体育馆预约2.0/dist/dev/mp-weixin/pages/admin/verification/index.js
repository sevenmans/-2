"use strict";
const common_vendor = require("../../../common/vendor.js");
const stores_adminVerification = require("../../../stores/admin-verification.js");
const stores_adminDashboard = require("../../../stores/admin-dashboard.js");
const stores_adminOrders = require("../../../stores/admin-orders.js");
const utils_request = require("../../../utils/request.js");
const NavBar = () => "../../../components/NavBar.js";
const AdminTabBar = () => "../../../components/admin/AdminTabBar.js";
const _sfc_main = {
  components: { NavBar, AdminTabBar },
  data() {
    return {
      verifyStore: null,
      navBarHeight: 0,
      code: ""
    };
  },
  computed: {
    verifying() {
      var _a;
      return (_a = this.verifyStore) == null ? void 0 : _a.verifying;
    },
    verifyResult() {
      var _a;
      return (_a = this.verifyStore) == null ? void 0 : _a.verifyResult;
    },
    history() {
      var _a;
      return ((_a = this.verifyStore) == null ? void 0 : _a.history) || [];
    }
  },
  onLoad() {
    this.verifyStore = stores_adminVerification.useAdminVerificationStore();
    this.calcNavBarHeight();
  },
  methods: {
    calcNavBarHeight() {
      const sys = common_vendor.index.getSystemInfoSync();
      this.navBarHeight = (sys.statusBarHeight || 0) + 44;
    },
    async handleVerify() {
      const trimmed = this.code.trim();
      if (!trimmed)
        return;
      try {
        await this.verifyStore.queryByCode(trimmed);
        const order = this.verifyStore.verifyResult;
        if (!order) {
          common_vendor.index.showToast({ title: "核销码无效或不存在", icon: "none" });
          return;
        }
        if (!["PAID", "SHARING_SUCCESS"].includes(order.status)) {
          common_vendor.index.showToast({ title: `当前状态不可核销: ${order.statusText}`, icon: "none" });
          return;
        }
        common_vendor.index.showModal({
          title: "确认核销",
          content: `订单号: ${order.orderNo}
场馆: ${order.venueName}
时间: ${order.date} ${order.startTime}-${order.endTime}
用户: ${order.userName}`,
          success: async (res) => {
            if (!res.confirm)
              return;
            try {
              await this.verifyStore.executeVerify(trimmed);
              common_vendor.index.showToast({ title: "核销成功", icon: "success" });
              utils_request.clearCache("/admin/bookings");
              if (order.id) {
                utils_request.clearCache(`/bookings/${order.id}`);
              }
              stores_adminOrders.useAdminOrdersStore().needRefresh = true;
              this.code = "";
              this.verifyStore.clearResult();
              try {
                stores_adminDashboard.useAdminDashboardStore().refreshStats();
              } catch {
              }
            } catch (e) {
              common_vendor.index.showToast({ title: e.message || "核销失败", icon: "none" });
            }
          }
        });
      } catch (e) {
        common_vendor.index.showToast({ title: e.message || "查询失败", icon: "none" });
      }
    }
  }
};
if (!Array) {
  const _component_NavBar = common_vendor.resolveComponent("NavBar");
  const _component_AdminTabBar = common_vendor.resolveComponent("AdminTabBar");
  (_component_NavBar + _component_AdminTabBar)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.p({
      title: "核销中心",
      showBack: false,
      backgroundColor: "#ff6b35",
      titleColor: "#ffffff",
      showBorder: false
    }),
    b: common_vendor.o((...args) => $options.handleVerify && $options.handleVerify(...args)),
    c: $data.code,
    d: common_vendor.o(($event) => $data.code = $event.detail.value),
    e: common_vendor.t($options.verifying ? "核销中..." : "查询并核销"),
    f: !$data.code.trim() || $options.verifying ? 1 : "",
    g: common_vendor.o((...args) => $options.handleVerify && $options.handleVerify(...args)),
    h: $options.verifyResult
  }, $options.verifyResult ? {
    i: common_vendor.t($options.verifyResult.statusText),
    j: $options.verifyResult.statusColor,
    k: common_vendor.t($options.verifyResult.orderNo),
    l: common_vendor.t($options.verifyResult.venueName),
    m: common_vendor.t($options.verifyResult.date),
    n: common_vendor.t($options.verifyResult.startTime),
    o: common_vendor.t($options.verifyResult.endTime),
    p: common_vendor.t($options.verifyResult.userName)
  } : {}, {
    q: $options.history.length === 0
  }, $options.history.length === 0 ? {} : {}, {
    r: common_vendor.f($options.history, (h, idx, i0) => {
      return {
        a: common_vendor.t(h.code),
        b: common_vendor.t(h.venueName),
        c: common_vendor.t(h.userName),
        d: common_vendor.t(h.time),
        e: idx
      };
    }),
    s: $data.navBarHeight + "px",
    t: common_vendor.p({
      current: "verification"
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-0ffa561d"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/admin/verification/index.js.map
