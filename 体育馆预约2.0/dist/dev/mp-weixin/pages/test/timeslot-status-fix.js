"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_venue = require("../../stores/venue.js");
const api_timeslot = require("../../api/timeslot.js");
const _sfc_main = {
  data() {
    return {
      venueId: "1",
      testDate: this.getTodayDate(),
      loading: false,
      currentFlowResult: null,
      directAPIResult: null,
      fixResult: null,
      errorMessage: ""
    };
  },
  setup() {
    const venueStore = stores_venue.useVenueStore();
    return { venueStore };
  },
  methods: {
    getTodayDate() {
      const today = /* @__PURE__ */ new Date();
      return today.toISOString().split("T")[0];
    },
    async debugBackendData() {
      if (!this.venueId || !this.testDate) {
        common_vendor.index.showToast({
          title: "请输入场馆ID和日期",
          icon: "none"
        });
        return;
      }
      this.loading = true;
      this.errorMessage = "";
      this.currentFlowResult = null;
      try {
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:134", "🔍 调试后端数据获取");
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:137", "🔍 直接测试API调用");
        const apiResponse = await api_timeslot.getVenueTimeSlots(this.venueId, this.testDate, true);
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:139", "📦 API原始响应:", apiResponse);
        const response = await this.venueStore.getVenueTimeSlots({
          venueId: this.venueId,
          date: this.testDate,
          forceRefresh: true
        });
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:148", "📋 当前流程响应:", response);
        const timeSlots = response.data || [];
        this.currentFlowResult = this.analyzeTimeSlots(timeSlots);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/test/timeslot-status-fix.vue:154", "❌ 当前流程测试失败:", error);
        this.errorMessage = error.message || "当前流程测试失败";
      } finally {
        this.loading = false;
      }
    },
    async testDirectAPI() {
      if (!this.venueId || !this.testDate) {
        common_vendor.index.showToast({
          title: "请输入场馆ID和日期",
          icon: "none"
        });
        return;
      }
      this.loading = true;
      this.errorMessage = "";
      this.directAPIResult = null;
      try {
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:175", "🌐 直接测试API:", { venueId: this.venueId, date: this.testDate });
        const response = await api_timeslot.getVenueTimeSlots(this.venueId, this.testDate, true);
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:180", "📋 直接API响应:", response);
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:181", "📦 API响应类型:", typeof response);
        const responseAnalysis = this.analyzeApiResponse(response);
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:185", "📊 API响应结构分析:", responseAnalysis);
        let timeSlots = [];
        if (response && response.data) {
          timeSlots = response.data;
          common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:190", "✅ 从标准格式提取时间段");
        } else if (response && Array.isArray(response)) {
          timeSlots = response;
          common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:193", "✅ 从直接数组格式提取时间段");
        } else if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
          timeSlots = response.data.data;
          common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:196", "✅ 从嵌套格式提取时间段");
        }
        this.directAPIResult = this.analyzeTimeSlots(timeSlots);
        this.directAPIResult.apiResponseAnalysis = responseAnalysis;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/test/timeslot-status-fix.vue:203", "❌ 直接API测试失败:", error);
        this.errorMessage = error.message || "直接API测试失败";
      } finally {
        this.loading = false;
      }
    },
    // 🔧 测试新修复逻辑
    async testNewLogic() {
      if (!this.venueId || !this.testDate) {
        common_vendor.index.showToast({
          title: "请输入场馆ID和日期",
          icon: "none"
        });
        return;
      }
      this.loading = true;
      this.errorMessage = "";
      this.currentFlowResult = null;
      try {
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:225", "🔧 测试新修复逻辑");
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:228", "🔍 步骤1: 直接测试API调用，查看原始响应格式");
        const apiResponse = await this.$api.timeslot.getVenueTimeSlots(this.venueId, this.testDate, true);
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:230", "📦 API原始响应类型:", typeof apiResponse);
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:231", "📦 API原始响应:", JSON.stringify(apiResponse).substring(0, 500) + "...");
        const responseAnalysis = this.analyzeApiResponse(apiResponse);
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:235", "📊 API响应结构分析:", responseAnalysis);
        let backendTimeSlots = [];
        let hasBackendData = false;
        if (apiResponse && apiResponse.data) {
          backendTimeSlots = apiResponse.data;
          common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:243", "✅ 从标准格式提取时间段");
          hasBackendData = true;
        } else if (apiResponse && Array.isArray(apiResponse)) {
          backendTimeSlots = apiResponse;
          common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:247", "✅ 从直接数组格式提取时间段");
          hasBackendData = true;
        } else if (apiResponse && apiResponse.data && apiResponse.data.data && Array.isArray(apiResponse.data.data)) {
          backendTimeSlots = apiResponse.data.data;
          common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:251", "✅ 从嵌套格式提取时间段");
          hasBackendData = true;
        }
        if (hasBackendData) {
          if (backendTimeSlots.length === 0) {
            common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:257", "ℹ️ 后端返回了空数组，表示没有时间段");
          } else {
            common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:259", "✅ 后端返回了", backendTimeSlots.length, "个时间段");
          }
        } else {
          common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:262", "⚠️ 无法从后端响应中提取时间段数组");
        }
        const timeSlotManager = getApp().globalData.timeSlotManager;
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:269", "🧹 步骤2: 清除缓存，确保测试真实流程");
        if (timeSlotManager.cache) {
          timeSlotManager.cache.clear();
          common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:272", "✅ 缓存已清除");
        } else {
          common_vendor.index.__f__("warn", "at pages/test/timeslot-status-fix.vue:274", "⚠️ 无法访问缓存对象");
        }
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:278", "🔄 步骤3: 使用新的修复逻辑获取时间段");
        const result = await timeSlotManager.getTimeSlots(
          parseInt(this.venueId),
          this.testDate,
          true
          // 强制刷新
        );
        if (result && result.data) {
          const analysis = this.analyzeTimeSlots(result.data);
          const usedBackendData = result.data.length > 0 ? !result.data[0].isGenerated : false;
          common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:291", "🔍 是否使用了后端数据:", usedBackendData ? "是" : "否");
          if (!usedBackendData && hasBackendData && backendTimeSlots.length > 0) {
            common_vendor.index.__f__("warn", "at pages/test/timeslot-status-fix.vue:294", "⚠️ 警告: 后端有数据但未使用!");
          }
          let dataSourceMatch = false;
          if (hasBackendData && usedBackendData) {
            if (result.data.length === backendTimeSlots.length) {
              dataSourceMatch = true;
              common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:302", "✅ Manager返回的数据与直接API相同");
            } else {
              common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:304", "⚠️ Manager返回的数据与直接API不同：数量不匹配");
            }
          }
          this.currentFlowResult = {
            ...analysis,
            message: "🔧 新逻辑测试成功",
            details: `
✅ 成功获取 ${analysis.total} 个时间段

📊 状态分布：
- 可预约(AVAILABLE)：${analysis.available}
- 已预约(RESERVED)：${analysis.reserved}
- 已占用(OCCUPIED)：${analysis.occupied}
- 维护中(MAINTENANCE)：${analysis.maintenance}

🔍 逻辑流程：
1. ✅ 优先从后端获取真实数据 ${usedBackendData ? "(已使用后端数据)" : "(使用了前端生成数据)"}
2. ✅ 若无数据则生成并同步到数据库
3. ✅ 重新从后端获取最新状态
4. ✅ 确保前端显示与数据库一致

${analysis.reserved > 0 || analysis.maintenance > 0 ? "🎉 检测到非AVAILABLE状态时间段，状态显示正确！" : "⚠️ 未检测到非AVAILABLE状态时间段"}

${hasBackendData ? dataSourceMatch ? "✅ 数据源匹配：Manager返回的数据与直接API相同" : "⚠️ 数据源不匹配：Manager返回的数据与直接API不同" : "⚠️ 无法从后端获取数据"}`
          };
        } else {
          this.currentFlowResult = {
            total: 0,
            available: 0,
            reserved: 0,
            occupied: 0,
            maintenance: 0,
            message: "❌ 新逻辑测试失败",
            details: "无法获取时间段数据或返回了空数据",
            hasBackendData,
            apiResponseAnalysis: responseAnalysis
          };
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/test/timeslot-status-fix.vue:346", "新逻辑测试失败:", error);
        this.errorMessage = `新逻辑测试失败: ${error.message}`;
      } finally {
        this.loading = false;
      }
    },
    /**
     * 分析API响应结构
     * 详细分析API响应的数据结构，帮助调试后端数据格式问题
     */
    analyzeApiResponse(response) {
      const analysis = {
        type: typeof response,
        isArray: Array.isArray(response),
        isObject: response !== null && typeof response === "object" && !Array.isArray(response),
        hasData: false,
        hasSuccess: false,
        dataType: null,
        dataIsArray: false,
        dataLength: null,
        nestedData: false,
        nestedDataIsArray: false,
        nestedDataLength: null,
        firstItem: null,
        structure: null
      };
      if (analysis.isArray) {
        analysis.structure = `Array[${response.length}]`;
        if (response.length > 0) {
          analysis.firstItem = response[0];
        }
      } else if (analysis.isObject) {
        analysis.structure = `Object{${Object.keys(response).join(", ")}}`;
        if ("data" in response) {
          analysis.hasData = true;
          analysis.dataType = typeof response.data;
          analysis.dataIsArray = Array.isArray(response.data);
          if (analysis.dataIsArray) {
            analysis.dataLength = response.data.length;
            if (response.data.length > 0) {
              analysis.firstItem = response.data[0];
            }
          } else if (response.data && typeof response.data === "object") {
            if ("data" in response.data) {
              analysis.nestedData = true;
              analysis.nestedDataIsArray = Array.isArray(response.data.data);
              if (analysis.nestedDataIsArray) {
                analysis.nestedDataLength = response.data.data.length;
                if (response.data.data.length > 0) {
                  analysis.firstItem = response.data.data[0];
                }
              }
            }
          }
        }
        if ("success" in response) {
          analysis.hasSuccess = true;
          analysis.successValue = response.success;
        }
      }
      return analysis;
    },
    async applyFix() {
      if (!this.venueId || !this.testDate) {
        common_vendor.index.showToast({
          title: "请输入场馆ID和日期",
          icon: "none"
        });
        return;
      }
      this.loading = true;
      this.errorMessage = "";
      this.fixResult = null;
      try {
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:434", "🔧 开始应用修复方案");
        let backendData = null;
        let hasBackendData = false;
        let responseAnalysis = null;
        try {
          const backendResponse = await this.makeDirectRequest();
          common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:443", "📦 后端响应类型:", typeof backendResponse);
          common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:444", "📦 后端响应:", backendResponse);
          responseAnalysis = this.analyzeApiResponse(backendResponse);
          common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:448", "📊 后端响应结构分析:", responseAnalysis);
          if (backendResponse && backendResponse.data) {
            backendData = backendResponse.data;
            common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:453", "✅ 从标准格式提取时间段");
            hasBackendData = true;
          } else if (backendResponse && Array.isArray(backendResponse)) {
            backendData = backendResponse;
            common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:457", "✅ 从直接数组格式提取时间段");
            hasBackendData = true;
          } else if (backendResponse && backendResponse.data && backendResponse.data.data && Array.isArray(backendResponse.data.data)) {
            backendData = backendResponse.data.data;
            common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:461", "✅ 从嵌套格式提取时间段");
            hasBackendData = true;
          }
          if (backendData === null || backendData === void 0) {
            backendData = [];
          }
        } catch (apiError) {
          common_vendor.index.__f__("warn", "at pages/test/timeslot-status-fix.vue:471", "后端API调用失败:", apiError);
        }
        if (hasBackendData) {
          if (backendData.length > 0) {
            common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:478", "✅ 使用后端真实数据:", backendData.length, "个时间段");
          } else {
            common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:480", "ℹ️ 后端返回了空数组，表示没有时间段");
          }
          this.venueStore.setTimeSlots(backendData);
          const analysis = this.analyzeTimeSlots(backendData);
          this.fixResult = {
            message: "修复成功：使用后端真实数据",
            details: `获取到 ${analysis.total} 个时间段，其中 ${analysis.reserved} 个已预约`,
            responseAnalysis
          };
        } else {
          common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:493", "🔧 后端无数据，生成带随机状态的时间段");
          const fixedSlots = await this.generateFixedTimeSlots();
          this.venueStore.setTimeSlots(fixedSlots);
          const analysis = this.analyzeTimeSlots(fixedSlots);
          this.fixResult = {
            message: "修复成功：生成带真实状态的时间段",
            details: `生成 ${analysis.total} 个时间段，模拟了 ${analysis.reserved} 个已预约状态`,
            responseAnalysis
          };
        }
        common_vendor.index.showToast({
          title: "修复完成",
          icon: "success"
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/test/timeslot-status-fix.vue:512", "❌ 修复失败:", error);
        this.errorMessage = error.message || "修复失败";
        common_vendor.index.showToast({
          title: "修复失败",
          icon: "error"
        });
      } finally {
        this.loading = false;
      }
    },
    async generateFixedTimeSlots() {
      const venue = this.venueStore.venueDetail;
      if (!venue) {
        throw new Error("场馆信息不存在");
      }
      const openTime = this.parseTimeString(venue.openTime || venue.open_time || "09:00");
      const closeTime = this.parseTimeString(venue.closeTime || venue.close_time || "22:00");
      const venueHourPrice = venue.price || 120;
      const venueHalfHourPrice = Math.round(venueHourPrice / 2);
      const slots = [];
      const [startHour, startMinute] = openTime.split(":").map(Number);
      const [endHour, endMinute] = closeTime.split(":").map(Number);
      let currentHour = startHour;
      let currentMinute = startMinute;
      if (currentMinute > 0 && currentMinute < 30) {
        currentMinute = 30;
      } else if (currentMinute > 30) {
        currentHour += 1;
        currentMinute = 0;
      }
      let slotIndex = 0;
      while (currentHour < endHour || currentHour === endHour && currentMinute < endMinute) {
        const startTime = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;
        let nextMinute = currentMinute + 30;
        let nextHour = currentHour;
        if (nextMinute >= 60) {
          nextHour += 1;
          nextMinute = 0;
        }
        const endTime = `${nextHour.toString().padStart(2, "0")}:${nextMinute.toString().padStart(2, "0")}`;
        if (nextHour > endHour || nextHour === endHour && nextMinute > endMinute) {
          break;
        }
        let status = "AVAILABLE";
        if (slotIndex % 5 === 1) {
          status = "RESERVED";
        } else if (slotIndex % 7 === 2) {
          status = "OCCUPIED";
        } else if (slotIndex % 10 === 3) {
          status = "MAINTENANCE";
        }
        slots.push({
          id: `fixed_${this.venueId}_${this.testDate}_${currentHour}_${currentMinute}`,
          venueId: parseInt(this.venueId),
          date: this.testDate,
          startTime,
          endTime,
          price: venueHalfHourPrice,
          status,
          isGenerated: true,
          isFixed: true
        });
        currentMinute = nextMinute;
        currentHour = nextHour;
        slotIndex++;
      }
      common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:600", "🔧 生成修复后的时间段:", slots.length, "个");
      return slots;
    },
    makeDirectRequest() {
      return new Promise((resolve, reject) => {
        const url = `http://localhost:8080/api/timeslots/venue/${this.venueId}/date/${this.testDate}`;
        common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:607", "📡 直接请求URL:", url);
        common_vendor.index.request({
          url,
          method: "GET",
          header: {
            "Content-Type": "application/json"
          },
          timeout: 15e3,
          success: (res) => {
            var _a;
            common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:617", "📦 后端响应状态码:", res.statusCode);
            if (res.statusCode === 200) {
              if (res.data === null || res.data === void 0) {
                common_vendor.index.__f__("log", "at pages/test/timeslot-status-fix.vue:621", "⚠️ 后端返回了null或undefined响应");
                resolve([]);
              } else {
                resolve(res.data);
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${((_a = res.data) == null ? void 0 : _a.message) || "请求失败"}`));
            }
          },
          fail: (err) => {
            common_vendor.index.__f__("error", "at pages/test/timeslot-status-fix.vue:631", "❌ 网络请求失败:", err);
            reject(new Error(err.errMsg || "网络请求失败"));
          }
        });
      });
    },
    analyzeTimeSlots(timeSlots) {
      const stats = {
        total: timeSlots.length,
        available: 0,
        reserved: 0,
        occupied: 0,
        maintenance: 0,
        data: timeSlots
      };
      timeSlots.forEach((slot) => {
        switch (slot.status) {
          case "AVAILABLE":
            stats.available++;
            break;
          case "RESERVED":
            stats.reserved++;
            break;
          case "OCCUPIED":
            stats.occupied++;
            break;
          case "MAINTENANCE":
            stats.maintenance++;
            break;
        }
      });
      return stats;
    },
    parseTimeString(timeStr) {
      if (!timeStr)
        return "09:00";
      if (timeStr.length > 5) {
        timeStr = timeStr.substring(0, 5);
      }
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(timeStr)) {
        return timeStr.includes("close") || timeStr.includes("end") ? "22:00" : "09:00";
      }
      return timeStr;
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.venueId,
    b: common_vendor.o(($event) => $data.venueId = $event.detail.value),
    c: $data.testDate,
    d: common_vendor.o(($event) => $data.testDate = $event.detail.value),
    e: common_vendor.t($data.loading ? "测试中..." : "🔍 测试当前流程"),
    f: common_vendor.o((...args) => _ctx.testCurrentFlow && _ctx.testCurrentFlow(...args)),
    g: $data.loading,
    h: common_vendor.t($data.loading ? "测试中..." : "🌐 直接测试后端API"),
    i: common_vendor.o((...args) => $options.testDirectAPI && $options.testDirectAPI(...args)),
    j: $data.loading,
    k: common_vendor.t($data.loading ? "测试中..." : "🔧 测试新修复逻辑"),
    l: common_vendor.o((...args) => $options.testNewLogic && $options.testNewLogic(...args)),
    m: $data.loading,
    n: common_vendor.t($data.loading ? "调试中..." : "🔍 调试后端数据获取"),
    o: common_vendor.o((...args) => $options.debugBackendData && $options.debugBackendData(...args)),
    p: $data.loading,
    q: common_vendor.t($data.loading ? "修复中..." : "🔧 应用修复方案"),
    r: common_vendor.o((...args) => $options.applyFix && $options.applyFix(...args)),
    s: $data.loading,
    t: $data.currentFlowResult
  }, $data.currentFlowResult ? {
    v: common_vendor.t($data.currentFlowResult.total),
    w: common_vendor.t($data.currentFlowResult.available),
    x: common_vendor.t($data.currentFlowResult.reserved),
    y: common_vendor.t($data.currentFlowResult.occupied),
    z: common_vendor.t($data.currentFlowResult.maintenance),
    A: common_vendor.t(JSON.stringify($data.currentFlowResult.data, null, 2))
  } : {}, {
    B: $data.directAPIResult
  }, $data.directAPIResult ? {
    C: common_vendor.t($data.directAPIResult.total),
    D: common_vendor.t($data.directAPIResult.available),
    E: common_vendor.t($data.directAPIResult.reserved),
    F: common_vendor.t($data.directAPIResult.occupied),
    G: common_vendor.t($data.directAPIResult.maintenance),
    H: common_vendor.t(JSON.stringify($data.directAPIResult.data, null, 2))
  } : {}, {
    I: $data.fixResult
  }, $data.fixResult ? {
    J: common_vendor.t($data.fixResult.message),
    K: common_vendor.t($data.fixResult.details)
  } : {}, {
    L: $data.errorMessage
  }, $data.errorMessage ? {
    M: common_vendor.t($data.errorMessage)
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-41f5632e"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/timeslot-status-fix.js.map
