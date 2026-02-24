"use strict";
const common_vendor = require("../common/vendor.js");
function debugTimeSlotExpired(selectedDate, timeSlots, currentTime = /* @__PURE__ */ new Date()) {
  const currentDateStr = currentTime.toISOString().split("T")[0];
  const currentTimeStr = currentTime.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  common_vendor.index.__f__("log", "at utils/debug-timeslot-expired.js:12", "📅 [DEBUG] 基础信息:", {
    selectedDate,
    currentDate: currentDateStr,
    currentTime: currentTimeStr,
    currentTimeISO: currentTime.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: currentTime.getTimezoneOffset()
  });
  const isToday = selectedDate === currentDateStr;
  const isFutureDate = selectedDate > currentDateStr;
  const isPastDate = selectedDate < currentDateStr;
  common_vendor.index.__f__("log", "at utils/debug-timeslot-expired.js:26", "📊 [DEBUG] 日期比较:", {
    isToday,
    isFutureDate,
    isPastDate,
    dateComparison: selectedDate === currentDateStr ? "same" : selectedDate > currentDateStr ? "future" : "past"
  });
  const analysis = {
    totalSlots: timeSlots.length,
    availableSlots: 0,
    expiredSlots: 0,
    bookedSlots: 0,
    otherSlots: 0,
    problemSlots: []
  };
  timeSlots.forEach((slot, index) => {
    common_vendor.index.__f__("log", "at utils/debug-timeslot-expired.js:45", `🔍 [DEBUG] 检查时间段 ${index + 1}:`, {
      id: slot.id,
      date: slot.date,
      timeRange: `${slot.startTime}-${slot.endTime}`,
      status: slot.status,
      originalData: slot
    });
    switch (slot.status) {
      case "AVAILABLE":
        analysis.availableSlots++;
        break;
      case "EXPIRED":
        analysis.expiredSlots++;
        if (isFutureDate) {
          common_vendor.index.__f__("error", "at utils/debug-timeslot-expired.js:63", "🚨 [DEBUG] 发现问题：未来日期的时间段被标记为EXPIRED!", {
            slotId: slot.id,
            slotDate: slot.date,
            selectedDate,
            timeRange: `${slot.startTime}-${slot.endTime}`,
            status: slot.status
          });
          analysis.problemSlots.push({
            ...slot,
            problem: "未来日期被标记为过期",
            shouldBeStatus: "AVAILABLE"
          });
        } else if (isToday) {
          try {
            const slotEndDateTime = /* @__PURE__ */ new Date();
            const [endHour, endMinute] = slot.endTime.split(":").map(Number);
            slotEndDateTime.setFullYear(parseInt(selectedDate.split("-")[0]));
            slotEndDateTime.setMonth(parseInt(selectedDate.split("-")[1]) - 1);
            slotEndDateTime.setDate(parseInt(selectedDate.split("-")[2]));
            slotEndDateTime.setHours(endHour, endMinute, 0, 0);
            const shouldBeExpired = currentTime > slotEndDateTime;
            common_vendor.index.__f__("log", "at utils/debug-timeslot-expired.js:88", "⏰ [DEBUG] 今日时间段过期检查:", {
              slotId: slot.id,
              timeRange: `${slot.startTime}-${slot.endTime}`,
              slotEndDateTime: slotEndDateTime.toISOString(),
              currentTime: currentTime.toISOString(),
              shouldBeExpired,
              actualStatus: slot.status,
              timeDiffMinutes: Math.round((slotEndDateTime - currentTime) / (1e3 * 60))
            });
            if (!shouldBeExpired) {
              common_vendor.index.__f__("error", "at utils/debug-timeslot-expired.js:99", "🚨 [DEBUG] 发现问题：今日时间段被错误标记为EXPIRED!", {
                slotId: slot.id,
                timeRange: `${slot.startTime}-${slot.endTime}`,
                slotEndTime: slotEndDateTime.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
                currentTime: currentTimeStr,
                shouldBeExpired
              });
              analysis.problemSlots.push({
                ...slot,
                problem: "今日时间段被错误标记为过期",
                shouldBeStatus: "AVAILABLE",
                slotEndTime: slotEndDateTime.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
                timeDiffMinutes: Math.round((slotEndDateTime - currentTime) / (1e3 * 60))
              });
            }
          } catch (error) {
            common_vendor.index.__f__("error", "at utils/debug-timeslot-expired.js:116", "🚨 [DEBUG] 时间段过期检查出错:", error);
          }
        }
        break;
      case "BOOKED":
      case "RESERVED":
        analysis.bookedSlots++;
        break;
      default:
        analysis.otherSlots++;
    }
  });
  common_vendor.index.__f__("log", "at utils/debug-timeslot-expired.js:130", "📈 [DEBUG] 分析结果:", analysis);
  if (analysis.problemSlots.length > 0) {
    common_vendor.index.__f__("error", "at utils/debug-timeslot-expired.js:133", "🚨 [DEBUG] 发现问题时间段:", analysis.problemSlots);
    const suggestions = [];
    if (isFutureDate && analysis.expiredSlots > 0) {
      suggestions.push("未来日期的时间段不应该被标记为EXPIRED，请检查后端定时任务逻辑");
    }
    if (isToday && analysis.problemSlots.some((slot) => slot.problem.includes("错误标记"))) {
      suggestions.push("今日时间段的过期判断逻辑有问题，请检查时间计算逻辑");
    }
    common_vendor.index.__f__("warn", "at utils/debug-timeslot-expired.js:146", "💡 [DEBUG] 修复建议:", suggestions);
  } else {
    common_vendor.index.__f__("log", "at utils/debug-timeslot-expired.js:148", "✅ [DEBUG] 未发现问题时间段");
  }
  return {
    analysis,
    hasProblems: analysis.problemSlots.length > 0,
    problemSlots: analysis.problemSlots,
    debugInfo: {
      selectedDate,
      currentDate: currentDateStr,
      currentTime: currentTimeStr,
      isToday,
      isFutureDate,
      isPastDate
    }
  };
}
function quickDebugCurrentPage() {
  common_vendor.index.__f__("log", "at utils/debug-timeslot-expired.js:170", "🔧 [DEBUG] 开始快速调试当前页面...");
  const currentInstance = getCurrentInstance();
  if (currentInstance) {
    const { selectedDate, timeSlots } = currentInstance.ctx;
    if (selectedDate && timeSlots) {
      return debugTimeSlotExpired(selectedDate, timeSlots);
    }
  }
  return null;
}
if (typeof window !== "undefined") {
  window.debugTimeSlotExpired = debugTimeSlotExpired;
  window.quickDebugCurrentPage = quickDebugCurrentPage;
}
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/debug-timeslot-expired.js.map
