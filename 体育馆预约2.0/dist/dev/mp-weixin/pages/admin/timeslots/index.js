"use strict";
const common_vendor = require("../../../common/vendor.js");
const stores_adminVenues = require("../../../stores/admin-venues.js");
const api_admin = require("../../../api/admin.js");
const NavBar = () => "../../../components/NavBar.js";
const _sfc_main = {
  components: { NavBar },
  data() {
    return {
      venuesStore: null,
      navBarHeight: 0,
      selectedVenueId: "",
      selectedDate: "",
      venues: [],
      generatedDates: [],
      // 已生成时间段的日期列表
      datesLoading: false
      // 日期加载状态
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
    },
    dateIndex() {
      return this.generatedDates.findIndex((d) => d === this.selectedDate);
    }
  },
  onLoad(options) {
    this.venuesStore = stores_adminVenues.useAdminVenuesStore();
    this.calcNavBarHeight();
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
        if (this.selectedVenueId) {
          await this.loadGeneratedDates();
        }
      } catch (e) {
        common_vendor.index.showToast({ title: "加载场馆失败", icon: "none" });
      }
    },
    async onVenueChange(e) {
      const venue = this.venues[e.detail.value];
      if (venue) {
        this.selectedVenueId = venue.id;
        this.selectedDate = "";
        this.generatedDates = [];
        await this.loadGeneratedDates();
      }
    },
    // 加载场馆已生成时间段的日期列表
    async loadGeneratedDates() {
      if (!this.selectedVenueId)
        return;
      this.datesLoading = true;
      try {
        const res = await api_admin.getGeneratedDates(this.selectedVenueId);
        const rawData = res.data || res;
        const dates = rawData.data || rawData || [];
        this.generatedDates = Array.isArray(dates) ? dates : [];
        common_vendor.index.__f__("log", "at pages/admin/timeslots/index.vue:177", "[排期管理] 加载到可选日期:", this.generatedDates.length, "个");
        if (this.generatedDates.length > 0) {
          const today = this.formatDate(/* @__PURE__ */ new Date());
          if (this.generatedDates.includes(today)) {
            this.selectedDate = today;
          } else {
            this.selectedDate = this.generatedDates[0];
          }
          this.loadTimeslots();
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/admin/timeslots/index.vue:191", "[排期管理] 加载可选日期失败:", e);
        common_vendor.index.showToast({ title: "加载可选日期失败", icon: "none" });
      } finally {
        this.datesLoading = false;
      }
    },
    onDatePickerChange(e) {
      const dateStr = this.generatedDates[e.detail.value];
      if (dateStr) {
        this.selectedDate = dateStr;
        this.loadTimeslots();
      }
    },
    handleNoDateClick() {
      if (!this.selectedVenueId) {
        common_vendor.index.showToast({ title: "请先选择场馆", icon: "none" });
      } else if (!this.datesLoading) {
        common_vendor.index.showToast({ title: "该场馆暂无已生成的时间段", icon: "none" });
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
    g: $data.generatedDates.length > 0
  }, $data.generatedDates.length > 0 ? {
    h: common_vendor.t($data.selectedDate || "请选择日期"),
    i: $data.generatedDates,
    j: $options.dateIndex,
    k: common_vendor.o((...args) => $options.onDatePickerChange && $options.onDatePickerChange(...args))
  } : {
    l: common_vendor.t($data.selectedVenueId ? $data.datesLoading ? "加载中..." : "暂无可选日期" : "请先选择场馆"),
    m: common_vendor.o((...args) => $options.handleNoDateClick && $options.handleNoDateClick(...args))
  }, {
    n: $options.timeslotLoading
  }, $options.timeslotLoading ? {} : $options.timeslots.length === 0 ? {
    p: common_vendor.t($data.selectedVenueId ? "暂无时段数据" : "请先选择场馆和日期")
  } : {
    q: common_vendor.f($options.timeslots, (slot, k0, i0) => {
      return {
        a: common_vendor.t($options.formatSlotTime(slot)),
        b: common_vendor.t($options.getSlotStatusText(slot.status)),
        c: slot.id,
        d: common_vendor.n($options.getSlotClass(slot)),
        e: common_vendor.o(($event) => $options.handleSlotClick(slot), slot.id)
      };
    })
  }, {
    o: $options.timeslots.length === 0,
    r: $data.navBarHeight + "px"
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-b07c5cf4"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/admin/timeslots/index.js.map
