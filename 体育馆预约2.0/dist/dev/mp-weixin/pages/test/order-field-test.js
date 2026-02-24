"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_booking = require("../../stores/booking.js");
const _sfc_main = {
  name: "OrderFieldTest",
  data() {
    return {
      testVenueId: "29",
      testDate: "2025-07-20",
      testStartTime: "12:00",
      testEndTime: "13:00",
      testPrice: "100",
      buildResult: null,
      creationResult: null,
      transmissionResult: null,
      analysisResult: null,
      testLogs: [],
      lastCreatedData: null,
      lastResponseData: null
    };
  },
  setup() {
    const bookingStore = stores_booking.useBookingStore();
    return {
      bookingStore
    };
  },
  methods: {
    addLog(message) {
      const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      this.testLogs.push(`[${timestamp}] ${message}`);
      common_vendor.index.__f__("log", "at pages/test/order-field-test.vue:184", `[Order字段测试] ${message}`);
    },
    clearLogs() {
      this.testLogs = [];
    },
    testSharingDataBuild() {
      this.addLog("开始构建拼场数据...");
      try {
        this.buildResult = {
          venueId: parseInt(this.testVenueId),
          date: this.testDate,
          startTime: this.testStartTime,
          endTime: this.testEndTime,
          teamName: "测试队伍",
          contactInfo: "13800138000",
          maxParticipants: 2,
          description: "测试拼场订单",
          price: parseFloat(this.testPrice),
          slotIds: [`default_${this.testVenueId}_${this.testDate}_${this.testStartTime.replace(":", "_")}`]
        };
        this.lastCreatedData = this.buildResult;
        this.addLog("拼场数据构建成功");
      } catch (error) {
        this.addLog(`拼场数据构建失败: ${error.message}`);
        common_vendor.index.__f__("error", "at pages/test/order-field-test.vue:213", "拼场数据构建失败:", error);
      }
    },
    async testSharingCreation() {
      var _a, _b;
      if (!this.buildResult) {
        this.addLog("请先构建拼场数据");
        return;
      }
      this.addLog("开始创建拼场订单...");
      try {
        const response = await this.bookingStore.createSharedBooking(this.buildResult);
        this.creationResult = {
          success: true,
          orderId: ((_a = response.data) == null ? void 0 : _a.id) || response.id,
          orderNo: ((_b = response.data) == null ? void 0 : _b.orderNo) || response.orderNo,
          response
        };
        this.lastResponseData = response;
        this.addLog(`拼场订单创建成功: ID ${this.creationResult.orderId}`);
      } catch (error) {
        this.creationResult = {
          success: false,
          error: error.message
        };
        this.addLog(`拼场订单创建失败: ${error.message}`);
        common_vendor.index.__f__("error", "at pages/test/order-field-test.vue:244", "拼场订单创建失败:", error);
      }
    },
    async testDataTransmission() {
      var _a, _b, _c, _d;
      if (!this.lastCreatedData || !this.lastResponseData) {
        this.addLog("请先创建拼场订单");
        return;
      }
      this.addLog("开始验证数据传递...");
      try {
        const sentData = this.lastCreatedData;
        const receivedData = this.lastResponseData;
        const sentStartTime = sentData.startTime;
        const receivedBookingTime = ((_a = receivedData.data) == null ? void 0 : _a.bookingTime) || receivedData.bookingTime;
        let receivedStartTime = null;
        if (receivedBookingTime) {
          if (receivedBookingTime.includes("T")) {
            receivedStartTime = receivedBookingTime.split("T")[1].substring(0, 5);
          } else if (receivedBookingTime.includes(" ")) {
            receivedStartTime = (_b = receivedBookingTime.split(" ")[1]) == null ? void 0 : _b.substring(0, 5);
          }
        }
        const timeMatch = sentStartTime === receivedStartTime;
        const sentPrice = parseFloat(sentData.price);
        const receivedPrice = parseFloat(((_c = receivedData.data) == null ? void 0 : _c.totalPrice) || receivedData.totalPrice || 0);
        const priceMatch = Math.abs(sentPrice - receivedPrice) < 0.01;
        const sentTeamName = sentData.teamName;
        const receivedTeamName = ((_d = receivedData.data) == null ? void 0 : _d.teamName) || receivedData.teamName;
        const fieldMatch = sentTeamName === receivedTeamName;
        const issues = [];
        if (!timeMatch) {
          issues.push(`时间不匹配: 发送${sentStartTime}, 接收${receivedStartTime}`);
        }
        if (!priceMatch) {
          issues.push(`价格不匹配: 发送${sentPrice}, 接收${receivedPrice}`);
        }
        if (!fieldMatch) {
          issues.push(`字段不匹配: 队伍名称`);
        }
        this.transmissionResult = {
          timeMatch,
          priceMatch,
          fieldMatch,
          issues,
          details: {
            sentStartTime,
            receivedStartTime,
            sentPrice,
            receivedPrice
          }
        };
        this.addLog(`数据传递验证完成: ${issues.length === 0 ? "全部正确" : `${issues.length}个问题`}`);
      } catch (error) {
        this.addLog(`数据传递验证失败: ${error.message}`);
        common_vendor.index.__f__("error", "at pages/test/order-field-test.vue:313", "数据传递验证失败:", error);
      }
    },
    async testOrderFieldAnalysis() {
      if (!this.lastResponseData) {
        this.addLog("请先创建拼场订单");
        return;
      }
      this.addLog("开始分析Order字段...");
      try {
        const orderData = this.lastResponseData.data || this.lastResponseData;
        const totalFields = 20;
        let usedFields = 0;
        const fieldChecks = [
          "id",
          "orderNo",
          "venueId",
          "venueName",
          "bookingTime",
          "endTime",
          "totalPrice",
          "status",
          "bookingType",
          "teamName",
          "contactInfo",
          "maxParticipants",
          "createdAt",
          "updatedAt"
        ];
        fieldChecks.forEach((field) => {
          if (orderData[field] !== void 0 && orderData[field] !== null) {
            usedFields++;
          }
        });
        const usageRate = Math.round(usedFields / totalFields * 100);
        const timeConsistency = !!(orderData.bookingTime && orderData.endTime);
        const priceValid = orderData.totalPrice > 0;
        this.analysisResult = {
          usageRate,
          usedFields,
          unusedFields: totalFields - usedFields,
          timeConsistency,
          priceValid,
          details: {
            hasBookingTime: !!orderData.bookingTime,
            hasEndTime: !!orderData.endTime,
            hasTotalPrice: !!orderData.totalPrice,
            hasTeamName: !!orderData.teamName,
            hasContactInfo: !!orderData.contactInfo
          }
        };
        this.addLog(`Order字段分析完成: 使用率${usageRate}%`);
      } catch (error) {
        this.addLog(`Order字段分析失败: ${error.message}`);
        common_vendor.index.__f__("error", "at pages/test/order-field-test.vue:367", "Order字段分析失败:", error);
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.testVenueId,
    b: common_vendor.o(($event) => $data.testVenueId = $event.detail.value),
    c: $data.testDate,
    d: common_vendor.o(($event) => $data.testDate = $event.detail.value),
    e: $data.testStartTime,
    f: common_vendor.o(($event) => $data.testStartTime = $event.detail.value),
    g: $data.testEndTime,
    h: common_vendor.o(($event) => $data.testEndTime = $event.detail.value),
    i: $data.testPrice,
    j: common_vendor.o(($event) => $data.testPrice = $event.detail.value),
    k: common_vendor.o((...args) => $options.testSharingDataBuild && $options.testSharingDataBuild(...args)),
    l: $data.buildResult
  }, $data.buildResult ? {
    m: common_vendor.t($data.buildResult.startTime),
    n: common_vendor.t($data.buildResult.endTime),
    o: common_vendor.t($data.buildResult.price),
    p: common_vendor.t($data.buildResult.teamName),
    q: common_vendor.t($data.buildResult.contactInfo)
  } : {}, {
    r: common_vendor.o((...args) => $options.testSharingCreation && $options.testSharingCreation(...args)),
    s: $data.creationResult
  }, $data.creationResult ? common_vendor.e({
    t: common_vendor.t($data.creationResult.success ? "✅" : "❌"),
    v: $data.creationResult.orderId
  }, $data.creationResult.orderId ? {
    w: common_vendor.t($data.creationResult.orderId)
  } : {}, {
    x: $data.creationResult.orderNo
  }, $data.creationResult.orderNo ? {
    y: common_vendor.t($data.creationResult.orderNo)
  } : {}, {
    z: $data.creationResult.error
  }, $data.creationResult.error ? {
    A: common_vendor.t($data.creationResult.error)
  } : {}) : {}, {
    B: common_vendor.o((...args) => $options.testDataTransmission && $options.testDataTransmission(...args)),
    C: $data.transmissionResult
  }, $data.transmissionResult ? common_vendor.e({
    D: common_vendor.t($data.transmissionResult.timeMatch ? "✅" : "❌"),
    E: common_vendor.t($data.transmissionResult.priceMatch ? "✅" : "❌"),
    F: common_vendor.t($data.transmissionResult.fieldMatch ? "✅" : "❌"),
    G: $data.transmissionResult.issues.length > 0
  }, $data.transmissionResult.issues.length > 0 ? {
    H: common_vendor.t($data.transmissionResult.issues.join(", "))
  } : {}) : {}, {
    I: common_vendor.o((...args) => $options.testOrderFieldAnalysis && $options.testOrderFieldAnalysis(...args)),
    J: $data.analysisResult
  }, $data.analysisResult ? {
    K: common_vendor.t($data.analysisResult.usageRate),
    L: common_vendor.t($data.analysisResult.usedFields),
    M: common_vendor.t($data.analysisResult.unusedFields),
    N: common_vendor.t($data.analysisResult.timeConsistency ? "✅" : "❌"),
    O: common_vendor.t($data.analysisResult.priceValid ? "✅" : "❌")
  } : {}, {
    P: common_vendor.o((...args) => $options.clearLogs && $options.clearLogs(...args)),
    Q: common_vendor.f($data.testLogs, (log, index, i0) => {
      return {
        a: common_vendor.t(log),
        b: index
      };
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-b0f57c8f"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/order-field-test.js.map
