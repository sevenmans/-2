"use strict";
const common_vendor = require("../../../common/vendor.js");
const utils_request = require("../../../utils/request.js");
const api_verification = require("../../../api/verification.js");
const api_adminDashboard = require("../../../api/admin-dashboard.js");
const utils_adminAdapter = require("../../../utils/admin-adapter.js");
const stores_adminDashboard = require("../../../stores/admin-dashboard.js");
const stores_adminOrders = require("../../../stores/admin-orders.js");
const NavBar = () => "../../../components/NavBar.js";
const _sfc_main = {
  components: { NavBar },
  data() {
    return {
      navBarHeight: 0,
      orderId: null,
      order: null,
      loading: false
    };
  },
  computed: {
    canVerify() {
      var _a;
      return ["PAID", "SHARING_SUCCESS"].includes((_a = this.order) == null ? void 0 : _a.status);
    },
    canComplete() {
      var _a;
      return ((_a = this.order) == null ? void 0 : _a.status) === "VERIFIED";
    },
    canCancel() {
      var _a;
      return ["PAID", "SHARING_SUCCESS"].includes((_a = this.order) == null ? void 0 : _a.status);
    },
    hasActions() {
      return this.canVerify || this.canComplete || this.canCancel;
    }
  },
  onLoad(options) {
    this.orderId = options.id;
    this.calcNavBarHeight();
    this.fetchDetail();
  },
  methods: {
    calcNavBarHeight() {
      const sys = common_vendor.index.getSystemInfoSync();
      this.navBarHeight = (sys.statusBarHeight || 0) + 44;
    },
    goBack() {
      common_vendor.index.navigateBack();
    },
    async fetchDetail(forceRefresh = false) {
      if (!this.orderId)
        return;
      this.loading = true;
      try {
        const options = forceRefresh ? { cache: false } : {};
        const res = await utils_request.get(`/bookings/${this.orderId}`, {}, options);
        const raw = res.data || res;
        this.order = utils_adminAdapter.adaptAdminOrder(raw);
      } catch (e) {
        common_vendor.index.showToast({ title: e.message || "加载失败", icon: "none" });
      } finally {
        this.loading = false;
      }
    },
    handleVerify() {
      common_vendor.index.showModal({
        title: "确认核销",
        content: `确定要核销此订单吗？`,
        success: async (res) => {
          if (!res.confirm)
            return;
          try {
            await api_verification.verifyOrder(this.orderId);
            common_vendor.index.showToast({ title: "核销成功", icon: "success" });
            utils_request.clearCache("/admin/bookings");
            utils_request.clearCache(`/bookings/${this.orderId}`);
            stores_adminOrders.useAdminOrdersStore().needRefresh = true;
            this.fetchDetail(true);
            try {
              stores_adminDashboard.useAdminDashboardStore().refreshStats();
            } catch {
            }
          } catch (e) {
            common_vendor.index.showToast({ title: e.message || "核销失败", icon: "none" });
          }
        }
      });
    },
    handleComplete() {
      common_vendor.index.showModal({
        title: "完成订单",
        content: "确定要将此订单标记为已完成吗？",
        success: async (res) => {
          if (!res.confirm)
            return;
          try {
            await api_verification.completeOrder(this.orderId);
            common_vendor.index.showToast({ title: "订单已完成", icon: "success" });
            utils_request.clearCache("/admin/bookings");
            utils_request.clearCache(`/bookings/${this.orderId}`);
            stores_adminOrders.useAdminOrdersStore().needRefresh = true;
            this.fetchDetail(true);
            try {
              stores_adminDashboard.useAdminDashboardStore().refreshStats();
            } catch {
            }
          } catch (e) {
            common_vendor.index.showToast({ title: e.message || "操作失败", icon: "none" });
          }
        }
      });
    },
    handleCancel() {
      common_vendor.index.showModal({
        title: "确认取消",
        content: "确定要取消此订单并退款吗？",
        success: async (res) => {
          if (!res.confirm)
            return;
          try {
            await api_adminDashboard.adminCancelBooking(this.orderId);
            common_vendor.index.showToast({ title: "已取消并退款", icon: "success" });
            utils_request.clearCache("/admin/bookings");
            utils_request.clearCache(`/bookings/${this.orderId}`);
            stores_adminOrders.useAdminOrdersStore().needRefresh = true;
            this.fetchDetail(true);
            try {
              stores_adminDashboard.useAdminDashboardStore().refreshStats();
            } catch {
            }
          } catch (e) {
            common_vendor.index.showToast({ title: e.message || "取消失败", icon: "none" });
          }
        }
      });
    },
    getParticipantStatusClass(status) {
      if (status === "VERIFIED" || status === "COMPLETED")
        return "p-status-success";
      if (status === "PAID")
        return "p-status-warning";
      return "p-status-default";
    },
    getParticipantStatusText(status) {
      const map = { VERIFIED: "已核销", PAID: "待核销", COMPLETED: "已完成", CANCELLED: "已取消" };
      return map[status] || status;
    }
  }
};
if (!Array) {
  const _component_NavBar = common_vendor.resolveComponent("NavBar");
  _component_NavBar();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o($options.goBack),
    b: common_vendor.p({
      title: "订单详情",
      showBack: true,
      backgroundColor: "#ff6b35",
      titleColor: "#ffffff",
      showBorder: false
    }),
    c: $data.loading
  }, $data.loading ? {} : {}, {
    d: $data.order
  }, $data.order ? common_vendor.e({
    e: common_vendor.t($data.order.statusText),
    f: $data.order.statusColor,
    g: common_vendor.t($data.order.orderNo),
    h: common_vendor.t($data.order.userName),
    i: common_vendor.t($data.order.userPhone),
    j: common_vendor.t($data.order.venueName),
    k: common_vendor.t($data.order.date),
    l: common_vendor.t($data.order.startTime),
    m: common_vendor.t($data.order.endTime),
    n: common_vendor.t($data.order.price),
    o: common_vendor.t($data.order.typeText),
    p: common_vendor.n($data.order.type === "SHARED" ? "tag-shared" : "tag-exclusive"),
    q: common_vendor.t($data.order.createTime),
    r: $data.order.type === "SHARED"
  }, $data.order.type === "SHARED" ? {
    s: common_vendor.t($data.order.teamName || "-"),
    t: common_vendor.t($data.order.sharingDescription || "-"),
    v: common_vendor.t($data.order.currentPeople),
    w: common_vendor.t($data.order.totalPeople),
    x: common_vendor.t($data.order.pricePerPerson)
  } : {}, {
    y: $data.order.type === "SHARED" && $data.order.participants.length > 0
  }, $data.order.type === "SHARED" && $data.order.participants.length > 0 ? {
    z: common_vendor.f($data.order.participants, (p, idx, i0) => {
      return {
        a: common_vendor.t(p.name),
        b: common_vendor.t(p.phone),
        c: common_vendor.t($options.getParticipantStatusText(p.status)),
        d: common_vendor.n($options.getParticipantStatusClass(p.status)),
        e: idx
      };
    })
  } : {}) : {}, {
    A: $data.order && $options.hasActions
  }, $data.order && $options.hasActions ? common_vendor.e({
    B: $options.canVerify
  }, $options.canVerify ? {
    C: common_vendor.o((...args) => $options.handleVerify && $options.handleVerify(...args))
  } : {}, {
    D: $options.canComplete
  }, $options.canComplete ? {
    E: common_vendor.o((...args) => $options.handleComplete && $options.handleComplete(...args))
  } : {}, {
    F: $options.canCancel
  }, $options.canCancel ? {
    G: common_vendor.o((...args) => $options.handleCancel && $options.handleCancel(...args))
  } : {}) : $data.order ? {} : {}, {
    H: $data.order,
    I: $data.navBarHeight + "px"
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-b21fdfc6"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/admin/orders/detail.js.map
