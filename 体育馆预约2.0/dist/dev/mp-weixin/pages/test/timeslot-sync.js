"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_venue = require("../../stores/venue.js");
const _sfc_main = {
  name: "TimeSlotSyncTest",
  data() {
    return {
      testVenueId: "34",
      testDate: "2025-07-20",
      syncStatusResult: null,
      fixGenerationResult: null,
      forceRegenerateResult: null,
      autoFixResult: null,
      testLogs: []
    };
  },
  setup() {
    const venueStore = stores_venue.useVenueStore();
    return {
      venueStore
    };
  },
  methods: {
    addLog(message) {
      const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      this.testLogs.push(`[${timestamp}] ${message}`);
      common_vendor.index.__f__("log", "at pages/test/timeslot-sync.vue:158", `[时间段同步测试] ${message}`);
    },
    clearLogs() {
      this.testLogs = [];
    },
    async checkSyncStatus() {
      try {
        this.addLog("开始检查同步状态...");
        const timeSlots = await this.venueStore.getTimeSlots(this.testVenueId, this.testDate, true);
        this.syncStatusResult = {
          success: true,
          message: `获取到 ${(timeSlots == null ? void 0 : timeSlots.length) || 0} 个时间段`,
          data: timeSlots
        };
        this.addLog(`同步状态检查完成: 前端${this.syncStatusResult.frontendSlots}个, 后端${this.syncStatusResult.backendSlots}个`);
      } catch (error) {
        this.addLog(`检查同步状态失败: ${error.message}`);
        common_vendor.index.__f__("error", "at pages/test/timeslot-sync.vue:180", "检查同步状态失败:", error);
      }
    },
    async fixTimeSlotGeneration() {
      var _a;
      try {
        this.addLog("开始修复时间段生成...");
        await this.venueStore.getTimeSlots(this.testVenueId, this.testDate, true);
        this.fixGenerationResult = {
          success: true,
          message: "时间段生成修复完成",
          generatedSlots: []
        };
        this.addLog(`时间段生成修复完成: ${this.fixGenerationResult.success ? "成功" : "失败"}`);
        if (this.fixGenerationResult.success) {
          this.addLog(`生成了${((_a = this.fixGenerationResult.generatedSlots) == null ? void 0 : _a.length) || 0}个时间段`);
        }
      } catch (error) {
        this.addLog(`修复时间段生成失败: ${error.message}`);
        common_vendor.index.__f__("error", "at pages/test/timeslot-sync.vue:202", "修复时间段生成失败:", error);
      }
    },
    async forceRegenerate() {
      try {
        this.addLog("开始强制重新生成...");
        await this.venueStore.getTimeSlots(this.testVenueId, this.testDate, true);
        this.forceRegenerateResult = {
          success: true,
          message: "强制重新生成完成",
          regenerated: true
        };
        this.addLog(`强制重新生成完成: ${this.forceRegenerateResult.success ? "成功" : "失败"}`);
        if (this.forceRegenerateResult.success) {
          this.addLog(`使用${this.forceRegenerateResult.method}方式生成了${this.forceRegenerateResult.slotsCount}个时间段`);
        }
      } catch (error) {
        this.addLog(`强制重新生成失败: ${error.message}`);
        common_vendor.index.__f__("error", "at pages/test/timeslot-sync.vue:224", "强制重新生成失败:", error);
      }
    },
    async autoFix() {
      try {
        this.addLog("开始自动修复...");
        await this.venueStore.getTimeSlots(this.testVenueId, this.testDate, true);
        this.autoFixResult = {
          success: true,
          message: "自动修复完成",
          fixed: true
        };
        this.addLog(`自动修复完成: ${this.autoFixResult.success ? "成功" : "失败"}`);
        if (this.autoFixResult.success) {
          this.addLog(`最终有${this.autoFixResult.finalSlotsCount}个时间段`);
        }
      } catch (error) {
        this.addLog(`自动修复失败: ${error.message}`);
        common_vendor.index.__f__("error", "at pages/test/timeslot-sync.vue:246", "自动修复失败:", error);
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a;
  return common_vendor.e({
    a: $data.testVenueId,
    b: common_vendor.o(($event) => $data.testVenueId = $event.detail.value),
    c: $data.testDate,
    d: common_vendor.o(($event) => $data.testDate = $event.detail.value),
    e: common_vendor.o((...args) => $options.checkSyncStatus && $options.checkSyncStatus(...args)),
    f: $data.syncStatusResult
  }, $data.syncStatusResult ? common_vendor.e({
    g: common_vendor.t($data.syncStatusResult.frontendSlots),
    h: common_vendor.t($data.syncStatusResult.backendSlots),
    i: common_vendor.t($data.syncStatusResult.synced ? "✅" : "❌"),
    j: common_vendor.t($data.syncStatusResult.needsSync ? "是" : "否"),
    k: $data.syncStatusResult.issues.length > 0
  }, $data.syncStatusResult.issues.length > 0 ? {
    l: common_vendor.t($data.syncStatusResult.issues.join(", "))
  } : {}) : {}, {
    m: common_vendor.o((...args) => $options.fixTimeSlotGeneration && $options.fixTimeSlotGeneration(...args)),
    n: $data.fixGenerationResult
  }, $data.fixGenerationResult ? {
    o: common_vendor.t($data.fixGenerationResult.success ? "✅" : "❌"),
    p: common_vendor.t(((_a = $data.fixGenerationResult.generatedSlots) == null ? void 0 : _a.length) || 0),
    q: common_vendor.t($data.fixGenerationResult.syncedToBackend ? "✅" : "❌"),
    r: common_vendor.t($data.fixGenerationResult.steps.join(" → "))
  } : {}, {
    s: common_vendor.o((...args) => $options.forceRegenerate && $options.forceRegenerate(...args)),
    t: $data.forceRegenerateResult
  }, $data.forceRegenerateResult ? common_vendor.e({
    v: common_vendor.t($data.forceRegenerateResult.success ? "✅" : "❌"),
    w: common_vendor.t($data.forceRegenerateResult.method),
    x: common_vendor.t($data.forceRegenerateResult.slotsCount),
    y: $data.forceRegenerateResult.error
  }, $data.forceRegenerateResult.error ? {
    z: common_vendor.t($data.forceRegenerateResult.error)
  } : {}) : {}, {
    A: common_vendor.o((...args) => $options.autoFix && $options.autoFix(...args)),
    B: $data.autoFixResult
  }, $data.autoFixResult ? {
    C: common_vendor.t($data.autoFixResult.success ? "✅" : "❌"),
    D: common_vendor.t($data.autoFixResult.finalSlotsCount),
    E: common_vendor.t($data.autoFixResult.steps.join(" → "))
  } : {}, {
    F: common_vendor.o((...args) => $options.clearLogs && $options.clearLogs(...args)),
    G: common_vendor.f($data.testLogs, (log, index, i0) => {
      return {
        a: common_vendor.t(log),
        b: index
      };
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-2d2e88ca"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/timeslot-sync.js.map
