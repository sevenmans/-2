"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_adminDashboard = require("../../stores/admin-dashboard.js");
const NavBar = () => "../../components/NavBar.js";
const AdminTabBar = () => "../../components/admin/AdminTabBar.js";
const _sfc_main = {
  components: { NavBar, AdminTabBar },
  data() {
    return {
      dashboardStore: null,
      navBarHeight: 0,
      timeRange: "today",
      customStart: "",
      customEnd: "",
      timeOptions: [
        { label: "今日", value: "today" },
        { label: "本周", value: "week" },
        { label: "本月", value: "month" },
        { label: "自定义", value: "custom" }
      ]
    };
  },
  computed: {
    stats() {
      var _a;
      return (_a = this.dashboardStore) == null ? void 0 : _a.stats;
    },
    loading() {
      var _a;
      return (_a = this.dashboardStore) == null ? void 0 : _a.loading;
    },
    canQueryCustom() {
      return this.customStart && this.customEnd;
    },
    dateRangeText() {
      if (this.timeRange === "custom" && this.customStart && this.customEnd) {
        return `${this.customStart} ~ ${this.customEnd}`;
      }
      const now = /* @__PURE__ */ new Date();
      const today = this.formatDate(now);
      if (this.timeRange === "today")
        return today;
      if (this.timeRange === "week") {
        const day = now.getDay() || 7;
        const start = new Date(now);
        start.setDate(start.getDate() - day + 1);
        return `${this.formatDate(start)} ~ ${today}`;
      }
      if (this.timeRange === "month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return `${this.formatDate(start)} ~ ${today}`;
      }
      return today;
    }
  },
  onLoad() {
    this.dashboardStore = stores_adminDashboard.useAdminDashboardStore();
    this.calcNavBarHeight();
    this.fetchData();
  },
  onShow() {
    if (this.dashboardStore)
      this.fetchData();
  },
  methods: {
    calcNavBarHeight() {
      const sys = common_vendor.index.getSystemInfoSync();
      this.navBarHeight = (sys.statusBarHeight || 0) + 44;
    },
    formatDate(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    },
    switchTime(val) {
      this.timeRange = val;
      if (val !== "custom") {
        this.dashboardStore.setTimeRange(val);
        this.fetchData();
      }
    },
    onStartDateChange(e) {
      this.customStart = e.detail.value;
    },
    onEndDateChange(e) {
      this.customEnd = e.detail.value;
    },
    queryCustom() {
      if (!this.canQueryCustom)
        return;
      this.dashboardStore.setTimeRange("custom");
      this.dashboardStore.setCustomDates(this.customStart, this.customEnd);
      this.fetchData();
    },
    async fetchData() {
      try {
        await this.dashboardStore.fetchStats();
      } catch (e) {
        common_vendor.index.showToast({ title: e.message || "获取统计失败", icon: "none" });
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
      title: "工作台",
      showBack: false,
      backgroundColor: "#ff6b35",
      titleColor: "#ffffff",
      showBorder: false
    }),
    b: common_vendor.t($options.dateRangeText),
    c: common_vendor.f($data.timeOptions, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.label),
        b: item.value,
        c: $data.timeRange === item.value ? 1 : "",
        d: common_vendor.o(($event) => $options.switchTime(item.value), item.value)
      };
    }),
    d: $data.timeRange === "custom"
  }, $data.timeRange === "custom" ? {
    e: common_vendor.t($data.customStart || "开始日期"),
    f: $data.customStart,
    g: common_vendor.o((...args) => $options.onStartDateChange && $options.onStartDateChange(...args)),
    h: common_vendor.t($data.customEnd || "结束日期"),
    i: $data.customEnd,
    j: common_vendor.o((...args) => $options.onEndDateChange && $options.onEndDateChange(...args)),
    k: !$options.canQueryCustom ? 1 : "",
    l: common_vendor.o((...args) => $options.queryCustom && $options.queryCustom(...args))
  } : {}, {
    m: $options.stats
  }, $options.stats ? {
    n: common_vendor.t($options.stats.income),
    o: common_vendor.t($options.stats.totalOrders),
    p: common_vendor.t($options.stats.pendingVerification),
    q: common_vendor.t($options.stats.verified),
    r: common_vendor.t($options.stats.refundOrCancel),
    s: common_vendor.t($options.stats.avgPrice)
  } : {}, {
    t: $options.loading
  }, $options.loading ? {} : {}, {
    v: $data.navBarHeight + "px",
    w: common_vendor.p({
      current: "dashboard"
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-bbd2c8f6"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/admin/dashboard.js.map
