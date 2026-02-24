"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_venue = require("../../stores/venue.js");
const api_timeslot = require("../../api/timeslot.js");
const _sfc_main = {
  name: "TimeslotApiDebug",
  data() {
    return {
      venueId: "1",
      // 默认场馆ID
      selectedDate: "",
      loading: false,
      apiResponse: null,
      processedData: [],
      errorInfo: "",
      responseTime: 0,
      venueStore: null
    };
  },
  mounted() {
    this.venueStore = stores_venue.useVenueStore();
    const today = /* @__PURE__ */ new Date();
    this.selectedDate = today.toISOString().split("T")[0];
    this.testAPI();
  },
  methods: {
    async testAPI() {
      if (!this.venueId || !this.selectedDate) {
        common_vendor.index.showToast({
          title: "请输入场馆ID和日期",
          icon: "none"
        });
        return;
      }
      this.loading = true;
      this.errorInfo = "";
      this.apiResponse = null;
      this.processedData = [];
      const startTime = Date.now();
      try {
        common_vendor.index.__f__("log", "at pages/test/timeslot-api-debug.vue:134", "[TimeslotDebug] 开始测试API:", {
          venueId: this.venueId,
          date: this.selectedDate
        });
        common_vendor.index.__f__("log", "at pages/test/timeslot-api-debug.vue:140", "[TimeslotDebug] 方法1: 直接调用API函数");
        try {
          const directResponse = await api_timeslot.getVenueTimeSlots(this.venueId, this.selectedDate);
          common_vendor.index.__f__("log", "at pages/test/timeslot-api-debug.vue:143", "[TimeslotDebug] 直接API响应:", directResponse);
          this.apiResponse = directResponse.data || directResponse;
        } catch (directError) {
          common_vendor.index.__f__("error", "at pages/test/timeslot-api-debug.vue:146", "[TimeslotDebug] 直接API调用失败:", directError);
        }
        common_vendor.index.__f__("log", "at pages/test/timeslot-api-debug.vue:150", "[TimeslotDebug] 方法2: 通过venueStore调用");
        try {
          const storeResponse = await this.venueStore.getVenueTimeSlots({
            venueId: this.venueId,
            date: this.selectedDate,
            forceRefresh: true
          });
          common_vendor.index.__f__("log", "at pages/test/timeslot-api-debug.vue:157", "[TimeslotDebug] Store响应:", storeResponse);
          this.processedData = this.venueStore.timeSlots || [];
          common_vendor.index.__f__("log", "at pages/test/timeslot-api-debug.vue:161", "[TimeslotDebug] 处理后的数据:", this.processedData);
        } catch (storeError) {
          common_vendor.index.__f__("error", "at pages/test/timeslot-api-debug.vue:163", "[TimeslotDebug] Store调用失败:", storeError);
        }
        this.responseTime = Date.now() - startTime;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/test/timeslot-api-debug.vue:169", "[TimeslotDebug] 测试失败:", error);
        this.errorInfo = error.message || "未知错误";
      } finally {
        this.loading = false;
      }
    },
    refreshData() {
      this.testAPI();
    },
    getStatusClass(status) {
      const classMap = {
        "AVAILABLE": "status-available",
        "OCCUPIED": "status-occupied",
        "RESERVED": "status-reserved",
        "MAINTENANCE": "status-maintenance",
        "EXPIRED": "status-expired"
      };
      return classMap[status] || "status-unknown";
    },
    getStatusCount(status) {
      return this.processedData.filter((slot) => slot.status === status).length;
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.refreshData && $options.refreshData(...args)),
    b: $data.venueId,
    c: common_vendor.o(($event) => $data.venueId = $event.detail.value),
    d: $data.selectedDate,
    e: common_vendor.o(($event) => $data.selectedDate = $event.detail.value),
    f: common_vendor.o((...args) => $options.testAPI && $options.testAPI(...args)),
    g: $data.loading
  }, $data.loading ? {} : {}, {
    h: $data.apiResponse
  }, $data.apiResponse ? {
    i: common_vendor.t($data.responseTime),
    j: common_vendor.t($data.apiResponse.length),
    k: common_vendor.t(JSON.stringify($data.apiResponse, null, 2))
  } : {}, {
    l: $data.processedData.length > 0
  }, $data.processedData.length > 0 ? {
    m: common_vendor.f($data.processedData, (slot, index, i0) => {
      return {
        a: common_vendor.t(slot.startTime),
        b: common_vendor.t(slot.endTime),
        c: common_vendor.t(slot.status),
        d: common_vendor.t(slot.price),
        e: common_vendor.t(slot.id),
        f: common_vendor.n($options.getStatusClass(slot.status)),
        g: index
      };
    })
  } : {}, {
    n: $data.errorInfo
  }, $data.errorInfo ? {
    o: common_vendor.t($data.errorInfo)
  } : {}, {
    p: common_vendor.t($options.getStatusCount("AVAILABLE")),
    q: common_vendor.t($options.getStatusCount("OCCUPIED") + $options.getStatusCount("RESERVED")),
    r: common_vendor.t($options.getStatusCount("MAINTENANCE")),
    s: common_vendor.t($options.getStatusCount("EXPIRED"))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-8a027c19"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/timeslot-api-debug.js.map
