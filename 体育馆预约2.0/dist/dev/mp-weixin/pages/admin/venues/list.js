"use strict";
const common_vendor = require("../../../common/vendor.js");
const stores_adminVenues = require("../../../stores/admin-venues.js");
const NavBar = () => "../../../components/NavBar.js";
const AdminTabBar = () => "../../../components/admin/AdminTabBar.js";
const _sfc_main = {
  components: { NavBar, AdminTabBar },
  data() {
    return {
      venuesStore: null,
      navBarHeight: 0
    };
  },
  computed: {
    venues() {
      var _a;
      return ((_a = this.venuesStore) == null ? void 0 : _a.managerVenues) || [];
    },
    loading() {
      var _a;
      return (_a = this.venuesStore) == null ? void 0 : _a.loading;
    }
  },
  onLoad() {
    this.venuesStore = stores_adminVenues.useAdminVenuesStore();
    this.calcNavBarHeight();
  },
  onShow() {
    this.fetchVenues();
  },
  methods: {
    calcNavBarHeight() {
      const sys = common_vendor.index.getSystemInfoSync();
      this.navBarHeight = (sys.statusBarHeight || 0) + 44;
    },
    async fetchVenues() {
      try {
        await this.venuesStore.fetchManagedVenues();
      } catch (e) {
        common_vendor.index.showToast({ title: e.message || "加载失败", icon: "none" });
      }
    },
    getStatusClass(status) {
      if (status === "OPEN")
        return "status-open";
      if (status === "CLOSED")
        return "status-closed";
      return "status-maintenance";
    },
    getStatusText(status) {
      const map = { OPEN: "营业中", CLOSED: "休息中", MAINTENANCE: "维护中" };
      return map[status] || status;
    },
    toggleStatus(venue) {
      const newStatus = venue.status === "OPEN" ? "CLOSED" : "OPEN";
      const action = newStatus === "OPEN" ? "上架" : "下架";
      common_vendor.index.showModal({
        title: `确认${action}`,
        content: `确定要将「${venue.name}」${action}吗？`,
        success: async (res) => {
          if (!res.confirm)
            return;
          try {
            await this.venuesStore.toggleVenueStatus(venue.id, newStatus);
            common_vendor.index.showToast({ title: `${action}成功`, icon: "success" });
          } catch (e) {
            common_vendor.index.showToast({ title: e.message || `${action}失败`, icon: "none" });
          }
        }
      });
    },
    goCreate() {
      common_vendor.index.navigateTo({ url: "/pages/admin/venues/create" });
    },
    goEdit(id) {
      common_vendor.index.navigateTo({ url: `/pages/admin/venues/edit?id=${id}` });
    },
    goTimeslots(venueId) {
      common_vendor.index.navigateTo({ url: `/pages/admin/timeslots/index?venueId=${venueId}` });
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
    a: common_vendor.o($options.goCreate),
    b: common_vendor.p({
      title: "场馆管理",
      showBack: false,
      backgroundColor: "#ff6b35",
      titleColor: "#ffffff",
      showBorder: false,
      rightText: "新增"
    }),
    c: $options.loading
  }, $options.loading ? {} : {}, {
    d: !$options.loading && $options.venues.length === 0
  }, !$options.loading && $options.venues.length === 0 ? {
    e: common_vendor.o((...args) => $options.goCreate && $options.goCreate(...args))
  } : {}, {
    f: common_vendor.f($options.venues, (venue, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(venue.name),
        b: common_vendor.t($options.getStatusText(venue.status)),
        c: common_vendor.n($options.getStatusClass(venue.status)),
        d: common_vendor.t(venue.type),
        e: common_vendor.t(venue.price),
        f: common_vendor.t(venue.openTime),
        g: common_vendor.t(venue.closeTime),
        h: venue.supportSharing
      }, venue.supportSharing ? {} : {}, {
        i: common_vendor.t(venue.status === "OPEN" ? "下架" : "上架"),
        j: common_vendor.n(venue.status === "OPEN" ? "btn-outline-danger" : "btn-outline-success"),
        k: common_vendor.o(($event) => $options.toggleStatus(venue), venue.id),
        l: common_vendor.o(($event) => $options.goEdit(venue.id), venue.id),
        m: common_vendor.o(($event) => $options.goTimeslots(venue.id), venue.id),
        n: venue.id
      });
    }),
    g: $data.navBarHeight + "px",
    h: common_vendor.p({
      current: "venues"
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-93f01705"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/admin/venues/list.js.map
