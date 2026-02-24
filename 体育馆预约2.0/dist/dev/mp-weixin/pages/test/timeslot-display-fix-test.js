"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_timeslotValidator = require("../../utils/timeslot-validator.js");
const utils_unifiedTimeslotManager = require("../../utils/unified-timeslot-manager.js");
const _sfc_main = {
  __name: "timeslot-display-fix-test",
  setup(__props) {
    const currentDate = common_vendor.ref("");
    const testDate = common_vendor.ref("");
    const testLogs = common_vendor.ref([]);
    const addLog = (message, type = "info") => {
      const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      testLogs.value.push({
        message: `[${timestamp}] ${message}`,
        type
      });
      common_vendor.index.__f__("log", "at pages/test/timeslot-display-fix-test.vue:53", `[TimeslotDisplayFixTest] ${message}`);
    };
    const clearLogs = () => {
      testLogs.value = [];
      addLog("日志已清空", "info");
    };
    const testTimeSlotExpiry = () => {
      addLog("开始测试时间段过期检查逻辑", "info");
      const todaySlot = {
        id: 1,
        date: currentDate.value,
        startTime: "09:00",
        endTime: "09:30",
        status: "AVAILABLE"
      };
      const isTodayExpired = utils_timeslotValidator.TimeSlotValidator.isSlotExpired(todaySlot);
      addLog(`今日时间段过期检查: ${isTodayExpired ? "已过期" : "未过期"}`, isTodayExpired ? "warning" : "success");
      const futureSlot = {
        id: 2,
        date: testDate.value,
        startTime: "09:00",
        endTime: "09:30",
        status: "AVAILABLE"
      };
      const isFutureExpired = utils_timeslotValidator.TimeSlotValidator.isSlotExpired(futureSlot);
      addLog(`非今日时间段过期检查: ${isFutureExpired ? "已过期" : "未过期"}`, isFutureExpired ? "error" : "success");
      if (!isFutureExpired) {
        addLog("✅ 修复成功：非今日时间段不会被标记为过期", "success");
      } else {
        addLog("❌ 修复失败：非今日时间段仍被错误标记为过期", "error");
      }
    };
    const testNonTodaySlots = () => {
      addLog("开始测试非今日时间段状态处理", "info");
      const testSlots = [
        {
          id: 1,
          date: testDate.value,
          startTime: "09:00",
          endTime: "09:30",
          status: "AVAILABLE"
        },
        {
          id: 2,
          date: testDate.value,
          startTime: "10:00",
          endTime: "10:30",
          status: "AVAILABLE"
        },
        {
          id: 3,
          date: testDate.value,
          startTime: "11:00",
          endTime: "11:30",
          status: "OCCUPIED"
        }
      ];
      const manager = new utils_unifiedTimeslotManager.UnifiedTimeSlotManager();
      const processedSlots = manager.processTimeSlotStatus(testSlots, testDate.value);
      addLog(`处理了 ${processedSlots.length} 个时间段`, "info");
      processedSlots.forEach((slot, index) => {
        const statusText = slot.status === "AVAILABLE" ? "可用" : slot.status === "OCCUPIED" ? "已占用" : slot.status === "EXPIRED" ? "已过期" : slot.status;
        addLog(
          `时间段 ${index + 1}: ${slot.startTime}-${slot.endTime} 状态: ${statusText}`,
          slot.status === "EXPIRED" ? "error" : "info"
        );
      });
      const expiredCount = processedSlots.filter((slot) => slot.status === "EXPIRED").length;
      const availableCount = processedSlots.filter((slot) => slot.status === "AVAILABLE").length;
      if (expiredCount === 0 && availableCount > 0) {
        addLog("✅ 修复成功：非今日时间段状态正常", "success");
      } else if (expiredCount > 0) {
        addLog(`❌ 修复失败：发现 ${expiredCount} 个非今日时间段被错误标记为过期`, "error");
      }
    };
    common_vendor.onMounted(() => {
      const now = /* @__PURE__ */ new Date();
      currentDate.value = now.toISOString().split("T")[0];
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
      testDate.value = tomorrow.toISOString().split("T")[0];
      addLog("时间段显示修复测试页面已加载", "info");
      addLog("请点击测试按钮验证修复效果", "info");
    });
    return (_ctx, _cache) => {
      return {
        a: common_vendor.t(currentDate.value),
        b: common_vendor.t(testDate.value),
        c: common_vendor.o(testTimeSlotExpiry),
        d: common_vendor.o(testNonTodaySlots),
        e: common_vendor.o(clearLogs),
        f: common_vendor.f(testLogs.value, (log, index, i0) => {
          return {
            a: common_vendor.t(log.message),
            b: common_vendor.n(log.type),
            c: index
          };
        })
      };
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-50fe2e62"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/timeslot-display-fix-test.js.map
