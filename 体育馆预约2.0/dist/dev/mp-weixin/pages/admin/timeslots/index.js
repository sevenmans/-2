"use strict";
const common_vendor = require("../../../common/vendor.js");
const stores_adminVenues = require("../../../stores/admin-venues.js");
const NavBar = () => "../../../components/NavBar.js";
const _sfc_main = {
  components: { NavBar },
  data() {
    return {
      venuesStore: null,
      navBarHeight: 0,
      selectedVenueId: "",
      selectedDate: "",
      venues: []
    };
  },
  computed: {
    timeslots() {
      var _a;
      return ((_a = this.venuesStore) == null ? void 0 : _a.timeslots) || [];
    },
    timeslotLoading() {
      var _a;
      return (_a = this.venuesStore) == null ? void 0 : _a.timeslotLoading;
    },
    venueIndex() {
      return this.venues.findIndex((v) => String(v.id) === String(this.selectedVenueId));
    },
    currentVenueName() {
      const v = this.venues.find((v2) => String(v2.id) === String(this.selectedVenueId));
      return v ? v.name : "";
    }
  },
  onLoad(options) {
    this.venuesStore = stores_adminVenues.useAdminVenuesStore();
    this.calcNavBarHeight();
    const today = /* @__PURE__ */ new Date();
    this.selectedDate = this.formatDate(today);
    if (options.venueId) {
      this.selectedVenueId = options.venueId;
    }
    this.loadVenues();
  },
  methods: {
    calcNavBarHeight() {
      const sys = common_vendor.index.getSystemInfoSync();
      this.navBarHeight = (sys.statusBarHeight || 0) + 44;
    },
    goBack() {
      common_vendor.index.navigateBack();
    },
    formatDate(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    },
    async loadVenues() {
      try {
        await this.venuesStore.fetchManagedVenues();
        this.venues = this.venuesStore.managerVenues || [];
        if (this.selectedVenueId && this.selectedDate) {
          this.loadTimeslots();
        }
      } catch (e) {
        common_vendor.index.showToast({ title: "加载场馆失败", icon: "none" });
      }
    },
    onVenueChange(e) {
      const venue = this.venues[e.detail.value];
      if (venue) {
        this.selectedVenueId = venue.id;
        this.loadTimeslots();
      }
    },
    onDateChange(e) {
      this.selectedDate = e.detail.value;
      if (this.selectedVenueId) {
        this.loadTimeslots();
      }
    },
    async loadTimeslots() {
      if (!this.selectedVenueId || !this.selectedDate)
        return;
      try {
        await this.venuesStore.fetchTimeslots(this.selectedVenueId, this.selectedDate);
      } catch (e) {
        common_vendor.index.showToast({ title: e.message || "加载时段失败", icon: "none" });
      }
    },
    formatSlotTime(slot) {
      const start = slot.startTime ? slot.startTime.substring(0, 5) : "";
      const end = slot.endTime ? slot.endTime.substring(0, 5) : "";
      return `${start}-${end}`;
    },
    getSlotClass(slot) {
      const s = (slot.status || "").toUpperCase();
      if (s === "AVAILABLE")
        return "slot-available";
      if (s === "MAINTENANCE")
        return "slot-maintenance";
      return "slot-booked";
    },
    getSlotStatusText(status) {
      const s = (status || "").toUpperCase();
      if (s === "AVAILABLE")
        return "可用";
      if (s === "MAINTENANCE")
        return "维护";
      return "已占";
    },
    handleSlotClick(slot) {
      const s = (slot.status || "").toUpperCase();
      if (["BOOKED", "OCCUPIED", "RESERVED", "LOCKED"].includes(s)) {
        common_vendor.index.showToast({ title: "该时段已有订单，不可操作", icon: "none" });
        return;
      }
      if (s === "AVAILABLE") {
        common_vendor.index.showModal({
          title: "确认锁场",
          content: "将该时段设为维护中？",
          success: async (res) => {
            if (!res.confirm)
              return;
            try {
              await this.venuesStore.changeTimeslotStatus(slot.id, "MAINTENANCE");
              common_vendor.index.showToast({ title: "已设为维护", icon: "success" });
            } catch (e) {
              const msg = e.message || "操作失败";
              common_vendor.index.showToast({ title: msg, icon: "none", duration: 3e3 });
            }
          }
        });
      } else if (s === "MAINTENANCE") {
        this.unlockSlot(slot);
      }
    },
    async unlockSlot(slot) {
      try {
        await this.venuesStore.changeTimeslotStatus(slot.id, "AVAILABLE");
        common_vendor.index.showToast({ title: "已解锁", icon: "success" });
      } catch (e) {
        common_vendor.index.showToast({ title: e.message || "解锁失败", icon: "none" });
      }
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
      title: "排期管理",
      showBack: true,
      backgroundColor: "#ff6b35",
      titleColor: "#ffffff",
      showBorder: false
    }),
    c: common_vendor.t($options.currentVenueName || "请选择场馆"),
    d: $data.venues,
    e: $options.venueIndex,
    f: common_vendor.o((...args) => $options.onVenueChange && $options.onVenueChange(...args)),
    g: common_vendor.t($data.selectedDate || "请选择日期"),
    h: $data.selectedDate,
    i: common_vendor.o((...args) => $options.onDateChange && $options.onDateChange(...args)),
    j: $options.timeslotLoading
  }, $options.timeslotLoading ? {} : $options.timeslots.length === 0 ? {
    l: common_vendor.t($data.selectedVenueId ? "暂无时段数据" : "请先选择场馆和日期")
  } : {
    m: common_vendor.f($options.timeslots, (slot, k0, i0) => {
      return {
        a: common_vendor.t($options.formatSlotTime(slot)),
        b: common_vendor.t($options.getSlotStatusText(slot.status)),
        c: slot.id,
        d: common_vendor.n($options.getSlotClass(slot)),
        e: common_vendor.o(($event) => $options.handleSlotClick(slot), slot.id)
      };
    })
  }, {
    k: $options.timeslots.length === 0,
    n: $data.navBarHeight + "px"
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-b07c5cf4"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/admin/timeslots/index.js.map
