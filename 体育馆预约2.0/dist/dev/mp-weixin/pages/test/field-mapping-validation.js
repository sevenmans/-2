"use strict";
const stores_venue = require("../../stores/venue.js");
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  name: "FieldMappingValidation",
  data() {
    return {
      venueId: 34,
      testDate: this.getTodayDate(),
      validationResults: [],
      validationStats: null,
      venueStore: null
    };
  },
  onLoad() {
    this.venueStore = stores_venue.useVenueStore();
    this.addResult("系统初始化", "success", "字段映射验证工具初始化完成");
  },
  methods: {
    getTodayDate() {
      const today = /* @__PURE__ */ new Date();
      return today.toISOString().split("T")[0];
    },
    addResult(title, status, message, mapping = null, validation = null) {
      const result = {
        title,
        status,
        // 'success', 'warning', 'error', 'info'
        message,
        mapping,
        validation,
        time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
      };
      this.validationResults.unshift(result);
      if (this.validationResults.length > 50) {
        this.validationResults = this.validationResults.slice(0, 50);
      }
      this.updateStats();
    },
    updateStats() {
      const stats = {
        total: this.validationResults.length,
        passed: this.validationResults.filter((r) => r.status === "success").length,
        warnings: this.validationResults.filter((r) => r.status === "warning").length,
        failed: this.validationResults.filter((r) => r.status === "error").length
      };
      this.validationStats = stats;
    },
    clearResults() {
      this.validationResults = [];
      this.validationStats = null;
      this.addResult("清除结果", "info", "验证结果已清除");
    },
    getStatusText(status) {
      const statusMap = {
        "success": "✅ 通过",
        "warning": "⚠️ 警告",
        "error": "❌ 失败",
        "info": "ℹ️ 信息"
      };
      return statusMap[status] || status;
    },
    // 验证包场订单字段映射
    async validateExclusiveBooking() {
      try {
        this.addResult("包场字段验证", "info", "开始验证包场订单字段映射...");
        await this.venueStore.getVenueDetail(this.venueId);
        const rawData = {
          venueId: this.venueId,
          date: this.testDate,
          startTime: "10:00",
          endTime: "12:00",
          price: 200,
          bookingType: "EXCLUSIVE",
          description: "测试包场预约",
          slotIds: [1, 2]
        };
        const fixedData = fixExclusiveBookingData(rawData);
        const validation = validateDataIntegrity(fixedData, "exclusive");
        const mapping = generateFieldMappingReport(rawData, fixedData, "exclusive");
        const status = validation.valid ? validation.warnings.length > 0 ? "warning" : "success" : "error";
        this.addResult(
          "包场字段映射验证",
          status,
          validation.valid ? "包场字段映射验证通过" : "包场字段映射验证失败",
          mapping,
          validation
        );
      } catch (error) {
        this.addResult("包场字段验证", "error", `验证失败: ${error.message}`);
      }
    },
    // 验证拼场订单字段映射
    async validateSharedBooking() {
      try {
        this.addResult("拼场字段验证", "info", "开始验证拼场订单字段映射...");
        await this.venueStore.getVenueDetail(this.venueId);
        const rawData = {
          venueId: this.venueId,
          date: this.testDate,
          startTime: "14:00",
          endTime: "16:00",
          price: 100,
          // 每队价格
          teamName: "测试球队",
          contactInfo: "13800138000",
          maxParticipants: 2,
          description: "测试拼场预约",
          slotIds: [3, 4]
        };
        const fixedData = fixSharedBookingData(rawData);
        const validation = validateDataIntegrity(fixedData, "shared");
        const mapping = generateFieldMappingReport(rawData, fixedData, "shared");
        const status = validation.valid ? validation.warnings.length > 0 ? "warning" : "success" : "error";
        this.addResult(
          "拼场字段映射验证",
          status,
          validation.valid ? "拼场字段映射验证通过" : "拼场字段映射验证失败",
          mapping,
          validation
        );
      } catch (error) {
        this.addResult("拼场字段验证", "error", `验证失败: ${error.message}`);
      }
    },
    // 验证时间段字段映射
    async validateTimeSlots() {
      try {
        this.addResult("时间段字段验证", "info", "开始验证时间段字段映射...");
        await this.venueStore.getTimeSlots(this.venueId, this.testDate, true);
        const timeSlots = this.venueStore.timeSlots;
        if (timeSlots.length === 0) {
          this.addResult("时间段字段验证", "warning", "没有时间段数据可供验证");
          return;
        }
        let validCount = 0;
        let errorCount = 0;
        for (let i = 0; i < Math.min(5, timeSlots.length); i++) {
          const slot = timeSlots[i];
          try {
            const fixedSlot = fixTimeSlotData(slot, this.venueId, this.testDate);
            const validation = validateDataIntegrity(fixedSlot, "timeslot");
            if (validation.valid) {
              validCount++;
            } else {
              errorCount++;
              this.addResult(
                `时间段${i + 1}验证`,
                "error",
                `时间段验证失败: ${validation.errors.join(", ")}`,
                null,
                validation
              );
            }
          } catch (error) {
            errorCount++;
            this.addResult(`时间段${i + 1}验证`, "error", `时间段处理失败: ${error.message}`);
          }
        }
        const status = errorCount === 0 ? "success" : validCount > 0 ? "warning" : "error";
        this.addResult(
          "时间段字段映射验证",
          status,
          `验证完成: ${validCount}个通过, ${errorCount}个失败`
        );
      } catch (error) {
        this.addResult("时间段字段验证", "error", `验证失败: ${error.message}`);
      }
    },
    // 运行全面验证
    async runFullValidation() {
      this.addResult("全面验证", "info", "开始运行全面字段映射验证...");
      try {
        await this.validateExclusiveBooking();
        await this.validateSharedBooking();
        await this.validateTimeSlots();
        this.addResult("全面验证", "success", "全面验证完成，请查看各项验证结果");
      } catch (error) {
        this.addResult("全面验证", "error", `全面验证失败: ${error.message}`);
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
    e: common_vendor.o((...args) => $options.validateExclusiveBooking && $options.validateExclusiveBooking(...args)),
    f: common_vendor.o((...args) => $options.validateSharedBooking && $options.validateSharedBooking(...args)),
    g: common_vendor.o((...args) => $options.validateTimeSlots && $options.validateTimeSlots(...args)),
    h: common_vendor.o((...args) => $options.runFullValidation && $options.runFullValidation(...args)),
    i: common_vendor.o((...args) => $options.clearResults && $options.clearResults(...args)),
    j: common_vendor.t($data.validationResults.length),
    k: common_vendor.f($data.validationResults, (result, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(result.title),
        b: common_vendor.t($options.getStatusText(result.status)),
        c: common_vendor.n(result.status),
        d: common_vendor.t(result.time),
        e: common_vendor.t(result.message),
        f: result.mapping
      }, result.mapping ? common_vendor.e({
        g: common_vendor.f(result.mapping.mappings, (map, mapIndex, i1) => {
          return {
            a: common_vendor.t(map.from),
            b: common_vendor.t(map.to),
            c: common_vendor.t(map.value),
            d: mapIndex
          };
        }),
        h: result.mapping.additions.length > 0
      }, result.mapping.additions.length > 0 ? {
        i: common_vendor.f(result.mapping.additions, (add, addIndex, i1) => {
          return {
            a: common_vendor.t(add.field),
            b: common_vendor.t(add.value),
            c: common_vendor.t(add.reason),
            d: addIndex
          };
        })
      } : {}) : {}, {
        j: result.validation && result.validation.errors.length > 0
      }, result.validation && result.validation.errors.length > 0 ? {
        k: common_vendor.f(result.validation.errors, (error, errorIndex, i1) => {
          return {
            a: common_vendor.t(error),
            b: errorIndex
          };
        })
      } : {}, {
        l: result.validation && result.validation.warnings.length > 0
      }, result.validation && result.validation.warnings.length > 0 ? {
        m: common_vendor.f(result.validation.warnings, (warning, warnIndex, i1) => {
          return {
            a: common_vendor.t(warning),
            b: warnIndex
          };
        })
      } : {}, {
        n: index,
        o: common_vendor.n(result.status)
      });
    }),
    l: $data.validationStats
  }, $data.validationStats ? {
    m: common_vendor.t($data.validationStats.passed),
    n: common_vendor.t($data.validationStats.warnings),
    o: common_vendor.t($data.validationStats.failed),
    p: common_vendor.t($data.validationStats.total)
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-8dbbe3e5"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/field-mapping-validation.js.map
