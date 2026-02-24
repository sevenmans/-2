"use strict";
const api_timeslot = require("../../api/timeslot.js");
const stores_venue = require("../../stores/venue.js");
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  name: "TimeslotSyncDebug",
  data() {
    return {
      venueId: 34,
      testDate: this.getTodayDate(),
      logs: [],
      backendSlotsCount: 0,
      frontendSlotsCount: 0,
      lastOperation: "无",
      venueStore: null
    };
  },
  onLoad() {
    this.venueStore = stores_venue.useVenueStore();
    this.addLog("info", "调试工具初始化完成");
  },
  methods: {
    getTodayDate() {
      const today = /* @__PURE__ */ new Date();
      return today.toISOString().split("T")[0];
    },
    addLog(type, message, data = null) {
      const log = {
        type,
        message,
        data,
        time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
      };
      this.logs.unshift(log);
      if (this.logs.length > 50) {
        this.logs = this.logs.slice(0, 50);
      }
    },
    clearLogs() {
      this.logs = [];
      this.addLog("info", "日志已清除");
    },
    // 直接调用生成API
    async testDirectGenerate() {
      this.lastOperation = "直接生成API";
      this.addLog("info", `开始直接调用生成API - 场馆${this.venueId}, 日期${this.testDate}`);
      try {
        const response = await api_timeslot.generateTimeSlots(this.venueId, this.testDate);
        this.addLog("success", "生成API调用成功", response);
        setTimeout(async () => {
          await this.queryBackendSlots();
        }, 1e3);
      } catch (error) {
        this.addLog("error", `生成API调用失败: ${error.message}`, error);
      }
    },
    // 直接查询时间段
    async testDirectQuery() {
      this.lastOperation = "直接查询";
      await this.queryBackendSlots();
    },
    // 查询后端时间段
    async queryBackendSlots() {
      this.addLog("info", `查询后端时间段 - 场馆${this.venueId}, 日期${this.testDate}`);
      try {
        const response = await api_timeslot.getVenueTimeSlots(this.venueId, this.testDate, true);
        if (response && response.data) {
          this.backendSlotsCount = response.data.length;
          this.addLog("success", `后端查询成功，获取到${response.data.length}个时间段`, {
            count: response.data.length,
            firstSlot: response.data[0],
            lastSlot: response.data[response.data.length - 1]
          });
        } else {
          this.backendSlotsCount = 0;
          this.addLog("warning", "后端查询成功但无数据", response);
        }
      } catch (error) {
        this.backendSlotsCount = 0;
        this.addLog("error", `后端查询失败: ${error.message}`, error);
      }
    },
    // 测试完整流程
    async testFullFlow() {
      this.lastOperation = "完整流程测试";
      this.addLog("info", "开始完整流程测试");
      try {
        this.addLog("info", "步骤1: 查询当前后端状态");
        await this.queryBackendSlots();
        this.addLog("info", "步骤2: 调用生成API");
        const generateResponse = await api_timeslot.generateTimeSlots(this.venueId, this.testDate);
        this.addLog("success", "生成API调用成功", generateResponse);
        this.addLog("info", "步骤3: 等待500ms后查询");
        await new Promise((resolve) => setTimeout(resolve, 500));
        await this.queryBackendSlots();
        this.addLog("info", "步骤4: 再等待1000ms后查询");
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        await this.queryBackendSlots();
        this.addLog("info", "步骤5: 使用venue store获取");
        await this.venueStore.getVenueDetail(this.venueId);
        const storeResponse = await this.venueStore.getTimeSlots(this.venueId, this.testDate, true);
        this.frontendSlotsCount = this.venueStore.timeSlots.length;
        this.addLog("success", `Venue store获取完成，前端时间段数量: ${this.frontendSlotsCount}`, {
          storeSlots: this.venueStore.timeSlots.length,
          response: storeResponse
        });
      } catch (error) {
        this.addLog("error", `完整流程测试失败: ${error.message}`, error);
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: $data.venueId,
    b: common_vendor.o(($event) => $data.venueId = $event.detail.value),
    c: $data.testDate,
    d: common_vendor.o(($event) => $data.testDate = $event.detail.value),
    e: common_vendor.o((...args) => $options.testDirectGenerate && $options.testDirectGenerate(...args)),
    f: common_vendor.o((...args) => $options.testDirectQuery && $options.testDirectQuery(...args)),
    g: common_vendor.o((...args) => $options.testFullFlow && $options.testFullFlow(...args)),
    h: common_vendor.o((...args) => $options.clearLogs && $options.clearLogs(...args)),
    i: common_vendor.f($data.logs, (log, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(log.time),
        b: common_vendor.t(log.message),
        c: log.data
      }, log.data ? {
        d: common_vendor.t(JSON.stringify(log.data, null, 2))
      } : {}, {
        e: index,
        f: common_vendor.n(log.type)
      });
    }),
    j: common_vendor.t($data.backendSlotsCount),
    k: common_vendor.t($data.frontendSlotsCount),
    l: common_vendor.t($data.lastOperation)
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-3ac421fa"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/timeslot-sync-debug.js.map
