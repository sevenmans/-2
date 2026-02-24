"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      venueId: "1",
      testDate: this.getTodayDate(),
      loading: false,
      apiResponse: null,
      processedData: [],
      statusStats: null,
      errorMessage: ""
    };
  },
  methods: {
    getTodayDate() {
      const today = /* @__PURE__ */ new Date();
      return today.toISOString().split("T")[0];
    },
    async testDirectAPI() {
      if (!this.venueId || !this.testDate) {
        common_vendor.index.showToast({
          title: "请输入场馆ID和日期",
          icon: "none"
        });
        return;
      }
      this.loading = true;
      this.errorMessage = "";
      this.apiResponse = null;
      this.processedData = [];
      this.statusStats = null;
      try {
        common_vendor.index.__f__("log", "at pages/test/api-direct-test.vue:109", "🚀 开始直接API测试:", { venueId: this.venueId, date: this.testDate });
        const response = await this.makeDirectRequest();
        common_vendor.index.__f__("log", "at pages/test/api-direct-test.vue:114", "📋 API原始响应:", response);
        this.apiResponse = response;
        this.processResponseData(response);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/test/api-direct-test.vue:121", "❌ API测试失败:", error);
        this.errorMessage = error.message || "请求失败";
        common_vendor.index.showToast({
          title: "测试失败: " + this.errorMessage,
          icon: "none",
          duration: 3e3
        });
      } finally {
        this.loading = false;
      }
    },
    makeDirectRequest() {
      return new Promise((resolve, reject) => {
        const url = `http://localhost:8080/api/timeslots/venue/${this.venueId}/date/${this.testDate}`;
        common_vendor.index.__f__("log", "at pages/test/api-direct-test.vue:138", "🌐 请求URL:", url);
        common_vendor.index.request({
          url,
          method: "GET",
          header: {
            "Content-Type": "application/json"
          },
          timeout: 15e3,
          success: (res) => {
            var _a;
            common_vendor.index.__f__("log", "at pages/test/api-direct-test.vue:148", "✅ 请求成功:", res);
            if (res.statusCode === 200) {
              resolve(res.data);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${((_a = res.data) == null ? void 0 : _a.message) || "请求失败"}`));
            }
          },
          fail: (err) => {
            common_vendor.index.__f__("error", "at pages/test/api-direct-test.vue:156", "❌ 请求失败:", err);
            reject(new Error(err.errMsg || "网络请求失败"));
          }
        });
      });
    },
    processResponseData(response) {
      let timeSlots = [];
      if (response && response.success && response.data) {
        timeSlots = response.data;
      } else if (response && Array.isArray(response)) {
        timeSlots = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        timeSlots = response.data;
      } else {
        common_vendor.index.__f__("warn", "at pages/test/api-direct-test.vue:174", "⚠️ 无法识别的响应格式:", response);
        return;
      }
      common_vendor.index.__f__("log", "at pages/test/api-direct-test.vue:178", "📊 处理时间段数据:", timeSlots);
      this.processedData = timeSlots;
      this.calculateStatusStats(timeSlots);
    },
    calculateStatusStats(timeSlots) {
      const stats = {
        total: timeSlots.length
      };
      timeSlots.forEach((slot) => {
        const status = slot.status || "UNKNOWN";
        stats[status] = (stats[status] || 0) + 1;
      });
      this.statusStats = stats;
      common_vendor.index.__f__("log", "at pages/test/api-direct-test.vue:196", "📈 状态统计:", stats);
    },
    getStatusClass(status) {
      const classMap = {
        "AVAILABLE": "available",
        "RESERVED": "reserved",
        "OCCUPIED": "occupied",
        "MAINTENANCE": "maintenance"
      };
      return classMap[status] || "unknown";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.venueId,
    b: common_vendor.o(($event) => $data.venueId = $event.detail.value),
    c: $data.testDate,
    d: common_vendor.o(($event) => $data.testDate = $event.detail.value),
    e: common_vendor.t($data.loading ? "测试中..." : "🚀 直接测试API"),
    f: common_vendor.o((...args) => $options.testDirectAPI && $options.testDirectAPI(...args)),
    g: $data.loading,
    h: $data.apiResponse
  }, $data.apiResponse ? {
    i: common_vendor.t(JSON.stringify($data.apiResponse, null, 2))
  } : {}, {
    j: $data.processedData.length > 0
  }, $data.processedData.length > 0 ? {
    k: common_vendor.f($data.processedData, (slot, index, i0) => {
      return {
        a: common_vendor.t(slot.startTime),
        b: common_vendor.t(slot.endTime),
        c: common_vendor.t(slot.status),
        d: common_vendor.n($options.getStatusClass(slot.status)),
        e: common_vendor.t(slot.price),
        f: index
      };
    })
  } : {}, {
    l: $data.statusStats
  }, $data.statusStats ? {
    m: common_vendor.t($data.statusStats.total),
    n: common_vendor.t($data.statusStats.AVAILABLE || 0),
    o: common_vendor.t($data.statusStats.RESERVED || 0),
    p: common_vendor.t($data.statusStats.OCCUPIED || 0),
    q: common_vendor.t($data.statusStats.MAINTENANCE || 0)
  } : {}, {
    r: $data.errorMessage
  }, $data.errorMessage ? {
    s: common_vendor.t($data.errorMessage)
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-18d18da6"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/api-direct-test.js.map
