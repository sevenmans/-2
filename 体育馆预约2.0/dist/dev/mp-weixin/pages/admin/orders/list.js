"use strict";
const common_vendor = require("../../../common/vendor.js");
const stores_adminOrders = require("../../../stores/admin-orders.js");
const stores_adminDashboard = require("../../../stores/admin-dashboard.js");
const NavBar = () => "../../../components/NavBar.js";
const AdminTabBar = () => "../../../components/admin/AdminTabBar.js";
const LoadMore = () => "../../../components/LoadMore.js";
const _sfc_main = {
  components: { NavBar, AdminTabBar, LoadMore },
  data() {
    return {
      ordersStore: null,
      navBarHeight: 0,
      keyword: "",
      currentStatus: "",
      searchTimer: null,
      statusFilters: [
        { label: "全部", value: "" },
        { label: "待核销", value: "PAID" },
        { label: "已核销", value: "VERIFIED" },
        { label: "已完成", value: "COMPLETED" },
        { label: "已退款", value: "REFUNDED" },
        { label: "已取消", value: "CANCELLED" },
        { label: "已过期", value: "EXPIRED" }
      ]
    };
  },
  computed: {
    orders() {
      var _a;
      return ((_a = this.ordersStore) == null ? void 0 : _a.list) || [];
    },
    loading() {
      var _a;
      return (_a = this.ordersStore) == null ? void 0 : _a.loading;
    },
    loadMoreStatus() {
      var _a;
      if (this.loading)
        return "loading";
      if (!((_a = this.ordersStore) == null ? void 0 : _a.pagination.hasMore))
        return "nomore";
      return "more";
    }
  },
  onLoad() {
    this.ordersStore = stores_adminOrders.useAdminOrdersStore();
    this.calcNavBarHeight();
  },
  onShow() {
    var _a;
    if ((_a = this.ordersStore) == null ? void 0 : _a.needRefresh) {
      this.ordersStore.pagination.page = 1;
      this.ordersStore.list = [];
    }
    this.fetchOrders(true);
  },
  methods: {
    calcNavBarHeight() {
      const sys = common_vendor.index.getSystemInfoSync();
      this.navBarHeight = (sys.statusBarHeight || 0) + 44;
    },
    canCancel(order) {
      return ["PAID", "SHARING_SUCCESS"].includes(order.status);
    },
    onSearch() {
      this.ordersStore.setFilter("keyword", this.keyword);
      this.fetchOrders();
    },
    onSearchInput() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.ordersStore.setFilter("keyword", this.keyword);
        this.fetchOrders();
      }, 500);
    },
    clearSearch() {
      this.keyword = "";
      this.ordersStore.setFilter("keyword", "");
      this.fetchOrders();
    },
    onFilterStatus(val) {
      this.currentStatus = val;
      const backendStatus = val === "REFUNDED" ? "CANCELLED" : val;
      this.ordersStore.setFilter("status", backendStatus);
      this.fetchOrders();
    },
    async fetchOrders(forceRefresh = false) {
      try {
        await this.ordersStore.fetchOrders(false, forceRefresh);
      } catch (e) {
        common_vendor.index.showToast({ title: e.message || "加载失败", icon: "none" });
      }
    },
    async loadMore() {
      try {
        await this.ordersStore.loadMore();
      } catch (e) {
        common_vendor.index.showToast({ title: "加载更多失败", icon: "none" });
      }
    },
    goDetail(id) {
      common_vendor.index.navigateTo({ url: `/pages/admin/orders/detail?id=${id}` });
    },
    handleCancel(order) {
      common_vendor.index.showModal({
        title: "确认取消",
        content: `确定要取消订单并退款吗？
订单号: ${order.orderNo}`,
        success: async (res) => {
          if (!res.confirm)
            return;
          try {
            await this.ordersStore.cancelOrder(order.id);
            common_vendor.index.showToast({ title: "已取消并退款", icon: "success" });
            await this.fetchOrders(true);
            try {
              stores_adminDashboard.useAdminDashboardStore().refreshStats();
            } catch {
            }
          } catch (e) {
            common_vendor.index.showToast({ title: e.message || "取消失败", icon: "none" });
          }
        }
      });
    }
  }
};
if (!Array) {
  const _component_NavBar = common_vendor.resolveComponent("NavBar");
  const _component_LoadMore = common_vendor.resolveComponent("LoadMore");
  const _component_AdminTabBar = common_vendor.resolveComponent("AdminTabBar");
  (_component_NavBar + _component_LoadMore + _component_AdminTabBar)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.p({
      title: "订单管理",
      showBack: false,
      backgroundColor: "#ff6b35",
      titleColor: "#ffffff",
      showBorder: false
    }),
    b: common_vendor.o((...args) => $options.onSearch && $options.onSearch(...args)),
    c: common_vendor.o([($event) => $data.keyword = $event.detail.value, (...args) => $options.onSearchInput && $options.onSearchInput(...args)]),
    d: $data.keyword,
    e: $data.keyword
  }, $data.keyword ? {
    f: common_vendor.o((...args) => $options.clearSearch && $options.clearSearch(...args))
  } : {}, {
    g: common_vendor.f($data.statusFilters, (f, k0, i0) => {
      return {
        a: common_vendor.t(f.label),
        b: f.value,
        c: $data.currentStatus === f.value ? 1 : "",
        d: common_vendor.o(($event) => $options.onFilterStatus(f.value), f.value)
      };
    }),
    h: $options.orders.length === 0 && !$options.loading
  }, $options.orders.length === 0 && !$options.loading ? {} : {}, {
    i: common_vendor.f($options.orders, (order, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(order.venueName),
        b: common_vendor.t(order.statusText),
        c: order.statusColor,
        d: common_vendor.t(order.orderNo),
        e: common_vendor.t(order.date),
        f: common_vendor.t(order.startTime),
        g: common_vendor.t(order.endTime),
        h: common_vendor.t(order.typeText),
        i: common_vendor.n(order.type === "SHARED" ? "tag-shared" : "tag-exclusive"),
        j: common_vendor.t(order.userName),
        k: common_vendor.t(order.phoneTail),
        l: common_vendor.t(order.type === "SHARED" ? "合计" : "实付"),
        m: common_vendor.t(order.price),
        n: $options.canCancel(order)
      }, $options.canCancel(order) ? {
        o: common_vendor.o(($event) => $options.handleCancel(order), order.id)
      } : {}, {
        p: order.id,
        q: common_vendor.o(($event) => $options.goDetail(order.id), order.id)
      });
    }),
    j: $options.orders.length > 0
  }, $options.orders.length > 0 ? {
    k: common_vendor.o($options.loadMore),
    l: common_vendor.p({
      status: $options.loadMoreStatus
    })
  } : {}, {
    m: $options.loading && $options.orders.length === 0
  }, $options.loading && $options.orders.length === 0 ? {} : {}, {
    n: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args)),
    o: $data.navBarHeight + "px",
    p: common_vendor.p({
      current: "orders"
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-05c8f94c"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/admin/orders/list.js.map
