"use strict";
const stores_venue = require("../../stores/venue.js");
const api_timeslot = require("../../api/timeslot.js");
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  name: "TimeslotStatusDebug",
  data() {
    return {
      venueId: 34,
      testDate: this.getTodayDate(),
      logs: [],
      frontendSlots: [],
      backendSlots: [],
      idAnalysis: [],
      venueStore: null
    };
  },
  onLoad() {
    this.venueStore = stores_venue.useVenueStore();
    this.addLog("info", "深度调试工具初始化完成");
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
      if (this.logs.length > 30) {
        this.logs = this.logs.slice(0, 30);
      }
    },
    clearLogs() {
      this.logs = [];
      this.idAnalysis = [];
      this.addLog("info", "日志和分析结果已清除");
    },
    formatData(data) {
      if (typeof data === "object") {
        return JSON.stringify(data, null, 2);
      }
      return String(data);
    },
    // 加载时间段
    async loadTimeSlots() {
      var _a, _b, _c;
      try {
        this.addLog("info", "开始加载时间段数据...");
        await this.venueStore.getVenueDetail(this.venueId);
        this.addLog("success", "场馆详情加载成功", {
          name: (_a = this.venueStore.venueDetail) == null ? void 0 : _a.name,
          openTime: (_b = this.venueStore.venueDetail) == null ? void 0 : _b.openTime,
          closeTime: (_c = this.venueStore.venueDetail) == null ? void 0 : _c.closeTime
        });
        await this.venueStore.getTimeSlots(this.venueId, this.testDate, true);
        this.frontendSlots = [...this.venueStore.timeSlots];
        this.addLog("success", `前端时间段加载完成: ${this.frontendSlots.length}个`, {
          sampleSlot: this.frontendSlots[0],
          idTypes: this.frontendSlots.map((slot) => ({ id: slot.id, type: typeof slot.id }))
        });
        const backendResponse = await api_timeslot.getVenueTimeSlots(this.venueId, this.testDate, true);
        this.backendSlots = (backendResponse == null ? void 0 : backendResponse.data) || [];
        this.addLog("success", `后端时间段加载完成: ${this.backendSlots.length}个`, {
          sampleSlot: this.backendSlots[0],
          idTypes: this.backendSlots.map((slot) => ({ id: slot.id, type: typeof slot.id }))
        });
        this.analyzeIdMatching();
      } catch (error) {
        this.addLog("error", `加载时间段失败: ${error.message}`);
      }
    },
    // 分析ID匹配情况
    analyzeIdMatching() {
      var _a, _b, _c, _d;
      this.idAnalysis = [];
      const frontendIdFormats = this.frontendSlots.map((slot) => ({
        id: slot.id,
        type: typeof slot.id,
        isString: typeof slot.id === "string",
        isNumber: typeof slot.id === "number",
        format: this.analyzeIdFormat(slot.id)
      }));
      const backendIdFormats = this.backendSlots.map((slot) => ({
        id: slot.id,
        type: typeof slot.id,
        isString: typeof slot.id === "string",
        isNumber: typeof slot.id === "number",
        format: this.analyzeIdFormat(slot.id)
      }));
      this.idAnalysis.push({
        title: "ID格式分析",
        result: `前端: ${((_a = frontendIdFormats[0]) == null ? void 0 : _a.format) || "无"}, 后端: ${((_b = backendIdFormats[0]) == null ? void 0 : _b.format) || "无"}`,
        details: `前端ID示例: ${(_c = frontendIdFormats[0]) == null ? void 0 : _c.id}, 后端ID示例: ${(_d = backendIdFormats[0]) == null ? void 0 : _d.id}`
      });
      const frontendIds = this.frontendSlots.map((slot) => slot.id);
      const backendIds = this.backendSlots.map((slot) => slot.id);
      const matchingIds = frontendIds.filter((id) => backendIds.includes(id));
      this.idAnalysis.push({
        title: "ID匹配度分析",
        result: `匹配: ${matchingIds.length}/${frontendIds.length}`,
        details: `匹配的ID: ${matchingIds.slice(0, 5).join(", ")}${matchingIds.length > 5 ? "..." : ""}`
      });
      const timeMatches = this.frontendSlots.filter((frontSlot) => {
        return this.backendSlots.some(
          (backSlot) => frontSlot.startTime === backSlot.startTime && frontSlot.endTime === backSlot.endTime
        );
      });
      this.idAnalysis.push({
        title: "时间段对应关系",
        result: `时间匹配: ${timeMatches.length}/${this.frontendSlots.length}`,
        details: `相同时间段但ID不同的情况可能导致状态刷新失败`
      });
      this.addLog("success", "ID匹配分析完成", this.idAnalysis);
    },
    // 分析ID格式
    analyzeIdFormat(id) {
      if (typeof id === "string") {
        if (id.startsWith("frontend_") || id.startsWith("default_")) {
          return "前端生成格式";
        } else if (/^\d+$/.test(id)) {
          return "字符串数字";
        } else {
          return "其他字符串格式";
        }
      } else if (typeof id === "number") {
        return "数字格式";
      } else {
        return "未知格式";
      }
    },
    // 模拟预约
    async simulateBooking() {
      try {
        if (this.frontendSlots.length === 0) {
          this.addLog("warning", "请先加载时间段数据");
          return;
        }
        const availableSlots = this.frontendSlots.filter((slot) => slot.status === "AVAILABLE");
        if (availableSlots.length === 0) {
          this.addLog("warning", "没有可用的时间段进行模拟");
          return;
        }
        const testSlot = availableSlots[0];
        this.addLog("info", "开始模拟预约状态刷新...", {
          testSlot,
          slotId: testSlot.id,
          slotIdType: typeof testSlot.id
        });
        await this.venueStore.onBookingSuccess(this.venueId, this.testDate, [testSlot.id]);
        const updatedSlot = this.venueStore.timeSlots.find((slot) => slot.id === testSlot.id);
        if (updatedSlot && updatedSlot.status === "RESERVED") {
          this.addLog("success", "乐观更新成功", {
            slotId: testSlot.id,
            oldStatus: testSlot.status,
            newStatus: updatedSlot.status
          });
        } else {
          this.addLog("error", "乐观更新失败", {
            slotId: testSlot.id,
            expectedStatus: "RESERVED",
            actualStatus: (updatedSlot == null ? void 0 : updatedSlot.status) || "未找到"
          });
        }
        setTimeout(() => {
          this.checkBackendUpdate(testSlot.id);
        }, 2e3);
      } catch (error) {
        this.addLog("error", `模拟预约失败: ${error.message}`);
      }
    },
    // 检查后端更新
    async checkBackendUpdate(slotId) {
      try {
        this.addLog("info", "检查后端状态更新...");
        const backendResponse = await api_timeslot.getVenueTimeSlots(this.venueId, this.testDate, true);
        const newBackendSlots = (backendResponse == null ? void 0 : backendResponse.data) || [];
        const updatedBackendSlot = newBackendSlots.find((slot) => slot.id === slotId);
        if (updatedBackendSlot) {
          this.addLog("success", "找到后端对应时间段", {
            slotId,
            backendStatus: updatedBackendSlot.status
          });
        } else {
          this.addLog("warning", "后端未找到对应时间段", {
            searchId: slotId,
            backendIds: newBackendSlots.map((slot) => slot.id).slice(0, 5)
          });
        }
      } catch (error) {
        this.addLog("error", `检查后端更新失败: ${error.message}`);
      }
    },
    // 检查时间段ID
    checkSlotIds() {
      if (this.frontendSlots.length === 0 || this.backendSlots.length === 0) {
        this.addLog("warning", "请先加载时间段数据");
        return;
      }
      this.addLog("info", "开始详细检查时间段ID...");
      for (let i = 0; i < Math.min(5, this.frontendSlots.length); i++) {
        const frontSlot = this.frontendSlots[i];
        const backSlot = this.backendSlots[i];
        this.addLog("info", `时间段${i + 1}对比`, {
          frontend: {
            id: frontSlot == null ? void 0 : frontSlot.id,
            time: `${frontSlot == null ? void 0 : frontSlot.startTime}-${frontSlot == null ? void 0 : frontSlot.endTime}`,
            status: frontSlot == null ? void 0 : frontSlot.status
          },
          backend: {
            id: backSlot == null ? void 0 : backSlot.id,
            time: `${backSlot == null ? void 0 : backSlot.startTime}-${backSlot == null ? void 0 : backSlot.endTime}`,
            status: backSlot == null ? void 0 : backSlot.status
          },
          idMatch: (frontSlot == null ? void 0 : frontSlot.id) === (backSlot == null ? void 0 : backSlot.id),
          timeMatch: (frontSlot == null ? void 0 : frontSlot.startTime) === (backSlot == null ? void 0 : backSlot.startTime) && (frontSlot == null ? void 0 : frontSlot.endTime) === (backSlot == null ? void 0 : backSlot.endTime)
        });
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.venueId,
    b: common_vendor.o(($event) => $data.venueId = $event.detail.value),
    c: $data.testDate,
    d: common_vendor.o(($event) => $data.testDate = $event.detail.value),
    e: common_vendor.o((...args) => $options.loadTimeSlots && $options.loadTimeSlots(...args)),
    f: common_vendor.o((...args) => $options.simulateBooking && $options.simulateBooking(...args)),
    g: common_vendor.o((...args) => $options.checkSlotIds && $options.checkSlotIds(...args)),
    h: common_vendor.o((...args) => $options.clearLogs && $options.clearLogs(...args)),
    i: common_vendor.t($data.frontendSlots.length),
    j: common_vendor.f($data.frontendSlots, (slot, k0, i0) => {
      return {
        a: common_vendor.t(slot.id),
        b: common_vendor.t(slot.startTime),
        c: common_vendor.t(slot.endTime),
        d: common_vendor.t(slot.status),
        e: common_vendor.t(slot.isGenerated ? "前端生成" : "后端数据"),
        f: slot.id
      };
    }),
    k: common_vendor.t($data.backendSlots.length),
    l: common_vendor.f($data.backendSlots, (slot, k0, i0) => {
      return {
        a: common_vendor.t(slot.id),
        b: common_vendor.t(slot.startTime),
        c: common_vendor.t(slot.endTime),
        d: common_vendor.t(slot.status),
        e: slot.id
      };
    }),
    m: common_vendor.f($data.logs, (log, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(log.time),
        b: common_vendor.t(log.message),
        c: log.data
      }, log.data ? {
        d: common_vendor.t($options.formatData(log.data))
      } : {}, {
        e: index,
        f: common_vendor.n(log.type)
      });
    }),
    n: $data.idAnalysis.length > 0
  }, $data.idAnalysis.length > 0 ? {
    o: common_vendor.f($data.idAnalysis, (analysis, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(analysis.title),
        b: common_vendor.t(analysis.result),
        c: analysis.details
      }, analysis.details ? {
        d: common_vendor.t(analysis.details)
      } : {}, {
        e: index
      });
    })
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-f2e0a606"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/timeslot-status-debug.js.map
