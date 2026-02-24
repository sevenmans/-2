"use strict";
const stores_venue = require("../../stores/venue.js");
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  name: "TimeSlotFixTest",
  data() {
    return {
      testVenueId: 1,
      testDate: this.getTodayDate(),
      testResults: [],
      currentTimeSlots: [],
      venueInfo: null,
      venueStore: null
    };
  },
  onLoad() {
    this.venueStore = stores_venue.useVenueStore();
    this.loadVenueInfo();
  },
  methods: {
    // 获取今天日期
    getTodayDate() {
      const today = /* @__PURE__ */ new Date();
      return today.toISOString().split("T")[0];
    },
    // 加载场馆信息
    async loadVenueInfo() {
      try {
        await this.venueStore.getVenueDetail(this.testVenueId);
        this.venueInfo = this.venueStore.venueDetail;
        this.addResult("场馆信息加载", true, "场馆信息加载成功", this.venueInfo);
      } catch (error) {
        this.addResult("场馆信息加载", false, `加载失败: ${error.message}`);
      }
    },
    // 测试时间段生成
    async testTimeSlotGeneration() {
      this.addResult("时间段生成测试", null, "开始测试时间段生成...");
      try {
        this.venueStore.setTimeSlots([]);
        const response = await this.venueStore.getTimeSlots(this.testVenueId, this.testDate, true);
        this.currentTimeSlots = this.venueStore.timeSlots;
        if (this.currentTimeSlots.length > 0) {
          const firstSlot = this.currentTimeSlots[0];
          const lastSlot = this.currentTimeSlots[this.currentTimeSlots.length - 1];
          this.addResult(
            "时间段生成测试",
            true,
            `生成成功! 共${this.currentTimeSlots.length}个时间段，时间范围: ${firstSlot.startTime}-${lastSlot.endTime}`,
            {
              count: this.currentTimeSlots.length,
              timeRange: `${firstSlot.startTime}-${lastSlot.endTime}`,
              sampleSlot: firstSlot
            }
          );
        } else {
          this.addResult("时间段生成测试", false, "生成失败，没有时间段数据");
        }
      } catch (error) {
        this.addResult("时间段生成测试", false, `生成失败: ${error.message}`);
      }
    },
    // 测试状态刷新
    async testStatusRefresh() {
      this.addResult("状态刷新测试", null, "开始测试状态刷新...");
      try {
        const response = await this.venueStore.refreshTimeSlotStatus(this.testVenueId, this.testDate);
        this.currentTimeSlots = this.venueStore.timeSlots;
        this.addResult(
          "状态刷新测试",
          true,
          `刷新成功! 当前时间段数量: ${this.currentTimeSlots.length}`,
          {
            count: this.currentTimeSlots.length,
            refreshTime: (/* @__PURE__ */ new Date()).toLocaleTimeString()
          }
        );
      } catch (error) {
        this.addResult("状态刷新测试", false, `刷新失败: ${error.message}`);
      }
    },
    // 清除缓存
    clearCache() {
      try {
        if (this.venueStore.timeSlotManager) {
          this.venueStore.timeSlotManager.clearCache();
          this.addResult("清除缓存", true, "缓存清除成功");
        } else {
          this.addResult("清除缓存", false, "时间段管理器未初始化");
        }
      } catch (error) {
        this.addResult("清除缓存", false, `清除失败: ${error.message}`);
      }
    },
    // 添加测试结果
    addResult(title, success, message, data = null) {
      this.testResults.unshift({
        title,
        success,
        message,
        data,
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
      });
      if (this.testResults.length > 10) {
        this.testResults = this.testResults.slice(0, 10);
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
    e: common_vendor.o((...args) => $options.testTimeSlotGeneration && $options.testTimeSlotGeneration(...args)),
    f: common_vendor.o((...args) => $options.testStatusRefresh && $options.testStatusRefresh(...args)),
    g: common_vendor.o((...args) => $options.clearCache && $options.clearCache(...args)),
    h: common_vendor.f($data.testResults, (result, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(result.title),
        b: common_vendor.t(result.success ? "✅ 成功" : "❌ 失败"),
        c: common_vendor.n(result.success ? "success" : "error"),
        d: common_vendor.t(result.message),
        e: result.data
      }, result.data ? {
        f: common_vendor.t(JSON.stringify(result.data, null, 2))
      } : {}, {
        g: index
      });
    }),
    i: $data.currentTimeSlots.length > 0
  }, $data.currentTimeSlots.length > 0 ? {
    j: common_vendor.t($data.currentTimeSlots.length),
    k: common_vendor.f($data.currentTimeSlots, (slot, k0, i0) => {
      return {
        a: common_vendor.t(slot.startTime),
        b: common_vendor.t(slot.endTime),
        c: common_vendor.t(slot.price),
        d: common_vendor.t(slot.status),
        e: slot.id,
        f: common_vendor.n(`status-${slot.status.toLowerCase()}`)
      };
    })
  } : {}, {
    l: $data.venueInfo
  }, $data.venueInfo ? {
    m: common_vendor.t($data.venueInfo.name),
    n: common_vendor.t($data.venueInfo.openTime || $data.venueInfo.open_time),
    o: common_vendor.t($data.venueInfo.closeTime || $data.venueInfo.close_time),
    p: common_vendor.t($data.venueInfo.price)
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-4c110a64"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/timeslot-fix-test.js.map
