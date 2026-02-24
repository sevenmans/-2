"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_booking = require("../../stores/booking.js");
const stores_venue = require("../../stores/venue.js");
const utils_paymentDebug = require("../../utils/payment-debug.js");
const utils_bookingPriceValidator = require("../../utils/booking-price-validator.js");
require("../../utils/request.js");
const _sfc_main = {
  name: "PaymentFixTest",
  data() {
    return {
      testOrderId: "401",
      testVenueId: "25",
      testDate: "2025-07-19",
      testPrice: "240",
      orderTestResult: null,
      timeSlotTestResult: null,
      priceTestResult: null,
      deepValidationResult: null,
      fullFlowResult: null,
      testLogs: []
    };
  },
  setup() {
    const bookingStore = stores_booking.useBookingStore();
    const venueStore = stores_venue.useVenueStore();
    return {
      bookingStore,
      venueStore
    };
  },
  methods: {
    addLog(message) {
      const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      this.testLogs.unshift(`[${timestamp}] ${message}`);
      if (this.testLogs.length > 20) {
        this.testLogs = this.testLogs.slice(0, 20);
      }
    },
    async testOrderAmount() {
      try {
        this.addLog("开始测试订单金额计算...");
        const orderInfo = await this.bookingStore.getBookingDetail(this.testOrderId);
        this.addLog(`获取订单信息: ${orderInfo ? "成功" : "失败"}`);
        if (orderInfo) {
          this.orderTestResult = utils_paymentDebug.debugOrderAmount(orderInfo);
          this.addLog(`金额计算完成: ¥${this.orderTestResult.calculatedPrice}`);
        } else {
          this.addLog("无法获取订单信息");
        }
      } catch (error) {
        this.addLog(`测试失败: ${error.message}`);
        common_vendor.index.__f__("error", "at pages/test/payment-fix.vue:206", "订单金额测试失败:", error);
      }
    },
    async testTimeSlotRefresh() {
      try {
        this.addLog("开始测试时间段刷新...");
        const beforeResult = utils_paymentDebug.debugTimeSlotRefresh(this.testVenueId, this.testDate, this.venueStore);
        this.addLog(`刷新前时间段数量: ${beforeResult.currentSlotsCount}`);
        const refreshResult = await utils_paymentDebug.forceRefreshTimeSlots(this.testVenueId, this.testDate, this.venueStore);
        this.addLog(`刷新执行: ${refreshResult.success ? "成功" : "失败"}`);
        this.timeSlotTestResult = {
          before: beforeResult,
          after: refreshResult
        };
        this.addLog(`刷新后时间段数量: ${refreshResult.newSlotsCount || 0}`);
      } catch (error) {
        this.addLog(`测试失败: ${error.message}`);
        common_vendor.index.__f__("error", "at pages/test/payment-fix.vue:230", "时间段刷新测试失败:", error);
      }
    },
    testPriceCalculation() {
      try {
        this.addLog("开始测试价格计算...");
        this.priceTestResult = utils_bookingPriceValidator.quickPriceCheck(this.testPrice);
        this.addLog(`价格验证结果: ${this.priceTestResult.valid ? "通过" : "失败"} - ${this.priceTestResult.message}`);
      } catch (error) {
        this.addLog(`价格测试失败: ${error.message}`);
        common_vendor.index.__f__("error", "at pages/test/payment-fix.vue:242", "价格计算测试失败:", error);
      }
    },
    async testDeepValidation() {
      try {
        this.addLog("开始深度验证修复效果...");
        const testBookingData = {
          venueId: this.testVenueId,
          date: this.testDate,
          startTime: "18:00",
          endTime: "20:00",
          price: parseFloat(this.testPrice),
          bookingType: "EXCLUSIVE"
        };
        this.deepValidationResult = await runDeepValidation(
          testBookingData,
          this.testVenueId,
          this.testDate,
          this.venueStore
        );
        this.addLog(`深度验证完成: ${this.deepValidationResult.overallSuccess ? "全部通过" : "发现问题"}`);
        this.addLog(`验证总结: ${this.deepValidationResult.summary}`);
        if (this.deepValidationResult.priceValidation.issues.length > 0) {
          this.addLog(`价格问题: ${this.deepValidationResult.priceValidation.issues.join(", ")}`);
        }
        if (this.deepValidationResult.timeSlotValidation.issues.length > 0) {
          this.addLog(`时间段问题: ${this.deepValidationResult.timeSlotValidation.issues.join(", ")}`);
        }
      } catch (error) {
        this.addLog(`深度验证失败: ${error.message}`);
        common_vendor.index.__f__("error", "at pages/test/payment-fix.vue:280", "深度验证失败:", error);
      }
    },
    async testFullFlow() {
      try {
        this.addLog("开始测试完整预约流程...");
        const steps = [];
        try {
          await this.venueStore.getVenueDetail(this.testVenueId);
          steps.push({ name: "获取场馆信息", success: true, message: "成功" });
          this.addLog("✅ 场馆信息获取成功");
        } catch (error) {
          steps.push({ name: "获取场馆信息", success: false, message: error.message });
          this.addLog("❌ 场馆信息获取失败");
        }
        try {
          await this.venueStore.getTimeSlots(this.testVenueId, this.testDate);
          steps.push({ name: "获取时间段", success: true, message: "成功" });
          this.addLog("✅ 时间段获取成功");
        } catch (error) {
          steps.push({ name: "获取时间段", success: false, message: error.message });
          this.addLog("❌ 时间段获取失败");
        }
        try {
          const mockOrder = {
            startTime: "18:00",
            endTime: "20:00",
            bookingType: "EXCLUSIVE",
            venueName: "测试场馆"
          };
          const priceResult = utils_paymentDebug.debugOrderAmount(mockOrder);
          steps.push({
            name: "价格计算",
            success: priceResult.calculatedPrice > 0,
            message: `¥${priceResult.calculatedPrice}`
          });
          this.addLog(`✅ 价格计算: ¥${priceResult.calculatedPrice}`);
        } catch (error) {
          steps.push({ name: "价格计算", success: false, message: error.message });
          this.addLog("❌ 价格计算失败");
        }
        this.fullFlowResult = { steps };
        this.addLog("完整流程测试完成");
      } catch (error) {
        this.addLog(`流程测试失败: ${error.message}`);
        common_vendor.index.__f__("error", "at pages/test/payment-fix.vue:334", "完整流程测试失败:", error);
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b, _c;
  return common_vendor.e({
    a: $data.testOrderId,
    b: common_vendor.o(($event) => $data.testOrderId = $event.detail.value),
    c: common_vendor.o((...args) => $options.testOrderAmount && $options.testOrderAmount(...args)),
    d: $data.orderTestResult
  }, $data.orderTestResult ? {
    e: common_vendor.t($data.orderTestResult.originalPrice),
    f: common_vendor.t($data.orderTestResult.calculatedPrice),
    g: common_vendor.t($data.orderTestResult.calculationMethod),
    h: common_vendor.t($data.orderTestResult.recommendation)
  } : {}, {
    i: $data.testVenueId,
    j: common_vendor.o(($event) => $data.testVenueId = $event.detail.value),
    k: $data.testDate,
    l: common_vendor.o(($event) => $data.testDate = $event.detail.value),
    m: common_vendor.o((...args) => $options.testTimeSlotRefresh && $options.testTimeSlotRefresh(...args)),
    n: $data.timeSlotTestResult
  }, $data.timeSlotTestResult ? {
    o: common_vendor.t(((_a = $data.timeSlotTestResult.before) == null ? void 0 : _a.currentSlotsCount) || 0),
    p: common_vendor.t(((_b = $data.timeSlotTestResult.after) == null ? void 0 : _b.newSlotsCount) || 0),
    q: common_vendor.t(((_c = $data.timeSlotTestResult.after) == null ? void 0 : _c.success) ? "是" : "否")
  } : {}, {
    r: $data.testPrice,
    s: common_vendor.o(($event) => $data.testPrice = $event.detail.value),
    t: common_vendor.o((...args) => _ctx.testPriceTransmission && _ctx.testPriceTransmission(...args)),
    v: _ctx.priceTransmissionResult
  }, _ctx.priceTransmissionResult ? common_vendor.e({
    w: common_vendor.t(_ctx.priceTransmissionResult.success ? "✅" : "❌"),
    x: common_vendor.t(_ctx.priceTransmissionResult.originalPrice),
    y: common_vendor.t(_ctx.priceTransmissionResult.finalPrice),
    z: common_vendor.t(_ctx.priceTransmissionResult.pricePreserved ? "✅" : "❌"),
    A: _ctx.priceTransmissionResult.issues.length > 0
  }, _ctx.priceTransmissionResult.issues.length > 0 ? {
    B: common_vendor.t(_ctx.priceTransmissionResult.issues.join(", "))
  } : {}) : {}, {
    C: common_vendor.o((...args) => $options.testDeepValidation && $options.testDeepValidation(...args)),
    D: $data.deepValidationResult
  }, $data.deepValidationResult ? common_vendor.e({
    E: common_vendor.t($data.deepValidationResult.overallSuccess ? "✅" : "❌"),
    F: common_vendor.t($data.deepValidationResult.summary),
    G: $data.deepValidationResult.priceValidation
  }, $data.deepValidationResult.priceValidation ? {
    H: common_vendor.t($data.deepValidationResult.priceValidation.priceTransmitted ? "✅" : "❌")
  } : {}, {
    I: $data.deepValidationResult.timeSlotValidation
  }, $data.deepValidationResult.timeSlotValidation ? {
    J: common_vendor.t($data.deepValidationResult.timeSlotValidation.refreshSuccess ? "✅" : "❌")
  } : {}) : {}, {
    K: common_vendor.o((...args) => $options.testFullFlow && $options.testFullFlow(...args)),
    L: $data.fullFlowResult
  }, $data.fullFlowResult ? {
    M: common_vendor.f($data.fullFlowResult.steps, (step, index, i0) => {
      return {
        a: common_vendor.t(step.name),
        b: common_vendor.t(step.success ? "✅" : "❌"),
        c: common_vendor.t(step.message),
        d: index
      };
    })
  } : {}, {
    N: common_vendor.f($data.testLogs, (log, index, i0) => {
      return {
        a: common_vendor.t(log),
        b: index
      };
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-7e8424cb"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/payment-fix.js.map
