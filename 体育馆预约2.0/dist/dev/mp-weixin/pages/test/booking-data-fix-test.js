"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_venue = require("../../stores/venue.js");
const stores_booking = require("../../stores/booking.js");
const _sfc_main = {
  name: "BookingDataFixTest",
  data() {
    return {
      testVenueId: 34,
      testDate: this.getTodayDate(),
      testResults: [],
      currentTimeSlots: [],
      venueStore: null,
      bookingStore: null
    };
  },
  onLoad() {
    this.venueStore = stores_venue.useVenueStore();
    this.bookingStore = stores_booking.useBookingStore();
    this.addResult("系统初始化", true, "测试工具初始化完成");
    this.loadInitialData();
  },
  methods: {
    getTodayDate() {
      const today = /* @__PURE__ */ new Date();
      return today.toISOString().split("T")[0];
    },
    addResult(title, success, message, data = null) {
      const result = {
        title,
        success,
        message,
        data,
        time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
      };
      this.testResults.unshift(result);
      if (this.testResults.length > 20) {
        this.testResults = this.testResults.slice(0, 20);
      }
    },
    clearResults() {
      this.testResults = [];
      this.addResult("清除结果", true, "测试结果已清除");
    },
    formatData(data) {
      if (typeof data === "object") {
        return JSON.stringify(data, null, 2);
      }
      return String(data);
    },
    // 加载初始数据
    async loadInitialData() {
      var _a, _b;
      try {
        await this.venueStore.getVenueDetail(this.testVenueId);
        this.addResult("场馆详情加载", true, "场馆信息加载成功", {
          name: (_a = this.venueStore.venueDetail) == null ? void 0 : _a.name,
          price: (_b = this.venueStore.venueDetail) == null ? void 0 : _b.price
        });
        await this.checkTimeSlotStatus();
      } catch (error) {
        this.addResult("初始数据加载", false, `加载失败: ${error.message}`);
      }
    },
    // 检查时间段状态
    async checkTimeSlotStatus() {
      try {
        this.addResult("时间段状态检查", null, "开始检查时间段状态...");
        const response = await this.venueStore.getTimeSlots(this.testVenueId, this.testDate, true);
        this.currentTimeSlots = this.venueStore.timeSlots;
        const availableCount = this.currentTimeSlots.filter((slot) => slot.status === "AVAILABLE").length;
        const reservedCount = this.currentTimeSlots.filter((slot) => slot.status === "RESERVED").length;
        this.addResult(
          "时间段状态检查",
          true,
          `检查完成! 总计${this.currentTimeSlots.length}个时间段，可用${availableCount}个，已预约${reservedCount}个`,
          {
            total: this.currentTimeSlots.length,
            available: availableCount,
            reserved: reservedCount
          }
        );
      } catch (error) {
        this.addResult("时间段状态检查", false, `检查失败: ${error.message}`);
      }
    },
    // 测试包场预约
    async testExclusiveBooking() {
      var _a, _b, _c, _d;
      try {
        this.addResult("包场预约测试", null, "开始测试包场预约数据传递...");
        const availableSlots = this.currentTimeSlots.filter((slot) => slot.status === "AVAILABLE");
        if (availableSlots.length === 0) {
          this.addResult("包场预约测试", false, "没有可用的时间段进行测试");
          return;
        }
        const testSlot = availableSlots[0];
        const bookingData = {
          venueId: parseInt(this.testVenueId),
          date: this.testDate,
          startTime: testSlot.startTime,
          endTime: testSlot.endTime,
          slotIds: [testSlot.id],
          bookingType: "EXCLUSIVE",
          description: "测试包场预约",
          price: parseFloat(testSlot.price),
          fieldId: ((_a = this.venueStore.venueDetail) == null ? void 0 : _a.fieldId) || ((_b = this.venueStore.venueDetail) == null ? void 0 : _b.id) || parseInt(this.testVenueId),
          fieldName: ((_c = this.venueStore.venueDetail) == null ? void 0 : _c.fieldName) || ((_d = this.venueStore.venueDetail) == null ? void 0 : _d.name) || "主场地"
        };
        this.addResult("包场数据构造", true, "包场预约数据构造完成", bookingData);
        common_vendor.index.__f__("log", "at pages/test/booking-data-fix-test.vue:204", "📤 模拟发送包场预约数据:", bookingData);
        const requiredFields = ["venueId", "date", "startTime", "endTime", "slotIds", "price", "fieldId", "fieldName"];
        const missingFields = requiredFields.filter((field) => !bookingData[field]);
        if (missingFields.length > 0) {
          this.addResult("包场预约测试", false, `缺少必要字段: ${missingFields.join(", ")}`);
        } else {
          this.addResult("包场预约测试", true, "包场预约数据验证通过，所有必要字段完整", {
            验证字段: requiredFields,
            数据类型检查: {
              venueId: typeof bookingData.venueId,
              price: typeof bookingData.price,
              slotIds: Array.isArray(bookingData.slotIds)
            }
          });
        }
      } catch (error) {
        this.addResult("包场预约测试", false, `测试失败: ${error.message}`);
      }
    },
    // 测试拼场预约
    async testSharedBooking() {
      var _a, _b, _c, _d;
      try {
        this.addResult("拼场预约测试", null, "开始测试拼场预约数据传递...");
        const availableSlots = this.currentTimeSlots.filter((slot) => slot.status === "AVAILABLE");
        if (availableSlots.length === 0) {
          this.addResult("拼场预约测试", false, "没有可用的时间段进行测试");
          return;
        }
        const testSlot = availableSlots[0];
        const totalPrice = parseFloat(testSlot.price);
        const pricePerTeam = Math.round(totalPrice / 2 * 100) / 100;
        const sharedBookingData = {
          venueId: parseInt(this.testVenueId),
          date: this.testDate,
          startTime: testSlot.startTime,
          endTime: testSlot.endTime,
          teamName: "测试球队",
          contactInfo: "13800138000",
          maxParticipants: 2,
          description: "测试拼场预约",
          price: pricePerTeam,
          fieldId: ((_a = this.venueStore.venueDetail) == null ? void 0 : _a.fieldId) || ((_b = this.venueStore.venueDetail) == null ? void 0 : _b.id) || parseInt(this.testVenueId),
          fieldName: ((_c = this.venueStore.venueDetail) == null ? void 0 : _c.fieldName) || ((_d = this.venueStore.venueDetail) == null ? void 0 : _d.name) || "主场地",
          slotIds: [testSlot.id]
        };
        this.addResult("拼场数据构造", true, "拼场预约数据构造完成", sharedBookingData);
        common_vendor.index.__f__("log", "at pages/test/booking-data-fix-test.vue:263", "📤 模拟发送拼场预约数据:", sharedBookingData);
        const requiredFields = ["venueId", "date", "startTime", "endTime", "teamName", "contactInfo", "maxParticipants", "price", "fieldId", "fieldName", "slotIds"];
        const missingFields = requiredFields.filter((field) => !sharedBookingData[field]);
        if (missingFields.length > 0) {
          this.addResult("拼场预约测试", false, `缺少必要字段: ${missingFields.join(", ")}`);
        } else {
          this.addResult("拼场预约测试", true, "拼场预约数据验证通过，所有必要字段完整", {
            验证字段: requiredFields,
            价格计算: {
              总价: totalPrice,
              每队价格: pricePerTeam,
              计算正确: pricePerTeam === totalPrice / 2
            },
            数据类型检查: {
              venueId: typeof sharedBookingData.venueId,
              price: typeof sharedBookingData.price,
              maxParticipants: typeof sharedBookingData.maxParticipants,
              slotIds: Array.isArray(sharedBookingData.slotIds)
            }
          });
        }
      } catch (error) {
        this.addResult("拼场预约测试", false, `测试失败: ${error.message}`);
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
    e: common_vendor.o((...args) => $options.testExclusiveBooking && $options.testExclusiveBooking(...args)),
    f: common_vendor.o((...args) => $options.testSharedBooking && $options.testSharedBooking(...args)),
    g: common_vendor.o((...args) => $options.checkTimeSlotStatus && $options.checkTimeSlotStatus(...args)),
    h: common_vendor.o((...args) => $options.clearResults && $options.clearResults(...args)),
    i: common_vendor.f($data.testResults, (result, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(result.title),
        b: common_vendor.t(result.success ? "✅ 成功" : "❌ 失败"),
        c: common_vendor.n(result.success ? "success" : "error"),
        d: common_vendor.t(result.time),
        e: common_vendor.t(result.message),
        f: result.data
      }, result.data ? {
        g: common_vendor.t($options.formatData(result.data))
      } : {}, {
        h: index
      });
    }),
    j: $data.currentTimeSlots.length > 0
  }, $data.currentTimeSlots.length > 0 ? {
    k: common_vendor.t($data.currentTimeSlots.length),
    l: common_vendor.f($data.currentTimeSlots, (slot, k0, i0) => {
      return {
        a: common_vendor.t(slot.startTime),
        b: common_vendor.t(slot.endTime),
        c: common_vendor.t(slot.price),
        d: common_vendor.t(slot.status),
        e: slot.id,
        f: common_vendor.n(`status-${slot.status.toLowerCase()}`)
      };
    })
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-a3608043"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/booking-data-fix-test.js.map
