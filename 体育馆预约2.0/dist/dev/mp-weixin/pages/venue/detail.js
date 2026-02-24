"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_venue = require("../../stores/venue.js");
const stores_booking = require("../../stores/booking.js");
const utils_helpers = require("../../utils/helpers.js");
const _sfc_main = {
  name: "VenueDetail",
  data() {
    return {
      venueStore: null,
      bookingStore: null,
      venueId: "",
      selectedDate: "",
      selectedTimeSlots: [],
      // 改为数组以支持多时间段选择
      availableDates: [],
      bookingType: "EXCLUSIVE",
      // 预约类型：EXCLUSIVE(独享) 或 SHARED(拼场)
      // 简化的状态管理
      isRefreshing: false,
      lastRefreshTime: 0,
      loading: false,
      // 将loading移到data中
      // 帮助说明相关
      showHelpModal: false,
      helpContent: {
        title: "",
        description: ""
      }
    };
  },
  computed: {
    venueDetail() {
      var _a;
      return ((_a = this.venueStore) == null ? void 0 : _a.venueDetailGetter) || {};
    },
    timeSlots() {
      var _a, _b;
      const slots = ((_a = this.venueStore) == null ? void 0 : _a.timeSlots) || [];
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:282", "timeSlots computed - venueStore:", this.venueStore);
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:283", "timeSlots computed - timeSlots:", (_b = this.venueStore) == null ? void 0 : _b.timeSlots);
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:284", "timeSlots computed - 返回值:", slots);
      return slots;
    },
    // 处理场馆图片
    venueImages() {
      if (this.venueDetail.image) {
        if (typeof this.venueDetail.image === "string") {
          return [this.venueDetail.image];
        }
        if (Array.isArray(this.venueDetail.image)) {
          return this.venueDetail.image;
        }
      }
      return ["https://via.placeholder.com/400x200?text=场馆图片"];
    },
    // 处理设施列表
    facilitiesList() {
      if (this.venueDetail.facilities) {
        if (typeof this.venueDetail.facilities === "string") {
          return this.venueDetail.facilities.split(",").map((f) => f.trim()).filter((f) => f);
        }
        if (Array.isArray(this.venueDetail.facilities)) {
          return this.venueDetail.facilities;
        }
      }
      return [];
    },
    // 格式化营业时间
    formatOpeningHours() {
      if (this.venueDetail.openTime && this.venueDetail.closeTime) {
        return `${this.venueDetail.openTime} - ${this.venueDetail.closeTime}`;
      }
      return "营业时间待更新";
    },
    // 过滤掉已过期的时间段
    filteredTimeSlots() {
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:333", "[DEBUG] filteredTimeSlots 计算开始");
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:334", "[DEBUG] 原始时间段数据:", this.timeSlots);
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:335", "[DEBUG] 当前选择的日期:", this.selectedDate);
      if (!Array.isArray(this.timeSlots)) {
        common_vendor.index.__f__("warn", "at pages/venue/detail.vue:339", "[DEBUG] timeSlots不是数组:", this.timeSlots);
        return [];
      }
      const now = /* @__PURE__ */ new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const selectedDate = this.selectedDate;
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const slots = this.timeSlots.filter((slot) => {
        if (!slot || typeof slot !== "object") {
          return false;
        }
        if (selectedDate === today) {
          if (slot.status === "EXPIRED") {
            return false;
          }
          if (slot.startTime) {
            const slotStartTime = this.getMinutesFromTimeString(slot.startTime);
            if (slotStartTime <= currentTime) {
              return false;
            }
          }
        }
        return true;
      });
      return slots;
    }
  },
  async onLoad(options) {
    this.venueStore = stores_venue.useVenueStore();
    this.bookingStore = stores_booking.useBookingStore();
    this.venueId = options.id;
    await this.initData();
  },
  async onShow() {
    this.setupGlobalEventListeners();
    try {
      const storeFlag = this.bookingStore && this.bookingStore.lastCancelled;
      let persistedFlag = null;
      try {
        persistedFlag = common_vendor.index.getStorageSync && common_vendor.index.getStorageSync("lastCancelledTimeslot");
      } catch (_) {
      }
      const flag = storeFlag || persistedFlag;
      if (flag && String(flag.venueId) === String(this.venueId)) {
        if (!this.selectedDate && flag.date) {
          this.selectedDate = flag.date;
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:402", "[VenueDetail] onShow: 根据最近一次取消记录设置 selectedDate =", this.selectedDate);
        }
        if (this.selectedDate === flag.date) {
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:406", "[VenueDetail] onShow: 检测到最近一次取消匹配当前页面，强制刷新时间段");
          await this.loadTimeSlots(true);
          if (this.bookingStore)
            this.bookingStore.lastCancelled = null;
          try {
            common_vendor.index.removeStorageSync && common_vendor.index.removeStorageSync("lastCancelledTimeslot");
          } catch (_) {
          }
          return;
        }
      }
      if (this.venueId && this.selectedDate) {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:417", "[VenueDetail] onShow: 常规重新加载时间段数据");
        this.loadTimeSlots(false);
      } else {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:420", "[VenueDetail] onShow: 缺少 venueId 或 selectedDate，跳过加载");
      }
    } catch (e) {
      common_vendor.index.__f__("warn", "at pages/venue/detail.vue:423", "[VenueDetail] onShow 处理异常:", e);
    }
  },
  onHide() {
    common_vendor.index.__f__("log", "at pages/venue/detail.vue:428", "[VenueDetail] 页面隐藏");
    this.removeGlobalEventListeners();
  },
  onPullDownRefresh() {
    this.refreshData();
  },
  methods: {
    /**
     * 检查网络状态
     */
    async checkNetworkStatus() {
      try {
        const networkInfo = await common_vendor.index.getNetworkType();
        return {
          isConnected: networkInfo.networkType !== "none",
          networkType: networkInfo.networkType
        };
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/venue/detail.vue:450", "[VenueDetail] 网络状态检查失败:", error);
        return {
          isConnected: false,
          networkType: "unknown"
        };
      }
    },
    // 🚀 ===== 原有方法（已优化） =====
    // 简化的时间段刷新
    async refreshTimeSlotsWithCache() {
      if (this.loading) {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:463", "[VenueDetail] 正在加载中，跳过重复请求");
        return;
      }
      try {
        this.loading = true;
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:469", "[VenueDetail] 开始刷新时间段");
        await this.loadTimeSlots();
        this.lastRefreshTime = Date.now();
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:477", "[VenueDetail] 时间段刷新完成");
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/venue/detail.vue:479", "[VenueDetail] 刷新时间段失败:", error);
        common_vendor.index.showToast({
          title: "刷新失败",
          icon: "error"
        });
      } finally {
        this.loading = false;
      }
    },
    // 将时间字符串转换为分钟数（用于比较）
    getMinutesFromTimeString(timeStr) {
      if (!timeStr || typeof timeStr !== "string") {
        common_vendor.index.__f__("warn", "at pages/venue/detail.vue:492", "getMinutesFromTimeString: 无效的时间字符串:", timeStr);
        return 0;
      }
      try {
        const [hours, minutes] = timeStr.split(":").map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
          common_vendor.index.__f__("warn", "at pages/venue/detail.vue:499", "getMinutesFromTimeString: 时间格式错误:", timeStr);
          return 0;
        }
        return hours * 60 + minutes;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/venue/detail.vue:504", "getMinutesFromTimeString: 解析时间失败:", timeStr, error);
        return 0;
      }
    },
    // 简化的初始化数据方法
    async initData() {
      try {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:512", `[VenueDetail] 开始初始化数据，场馆ID: ${this.venueId}`);
        if (!this.venueId) {
          common_vendor.index.__f__("error", "at pages/venue/detail.vue:515", "[VenueDetail] 场馆ID为空");
          common_vendor.index.showToast({
            title: "参数错误",
            icon: "error"
          });
          return;
        }
        this.loading = true;
        await this.venueStore.getVenueDetail(this.venueId);
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:527", "[VenueDetail] 获取场馆详情成功");
        this.initDates();
        if (this.selectedDate) {
          await this.loadTimeSlots();
        }
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:537", "[VenueDetail] 数据初始化完成");
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/venue/detail.vue:540", "[VenueDetail] 初始化数据失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "error"
        });
      } finally {
        this.loading = false;
      }
    },
    // 简化的数据刷新方法
    async refreshData() {
      try {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:559", "[VenueDetail] 🔄 开始刷新数据");
        this.loading = true;
        await this.initData();
        common_vendor.index.showToast({
          title: "刷新成功",
          icon: "success"
        });
        common_vendor.index.stopPullDownRefresh();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/venue/detail.vue:573", "[VenueDetail] ❌ 数据刷新失败:", error);
        common_vendor.index.showToast({
          title: "刷新失败",
          icon: "error"
        });
        common_vendor.index.stopPullDownRefresh();
      } finally {
        this.loading = false;
      }
    },
    // 初始化可选日期
    initDates() {
      const dates = [];
      const today = /* @__PURE__ */ new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
        const day = i === 0 ? "今天" : i === 1 ? "明天" : dayNames[date.getDay()];
        dates.push({
          value: utils_helpers.formatDate(date, "YYYY-MM-DD"),
          day,
          date: utils_helpers.formatDate(date, "MM/DD")
        });
      }
      this.availableDates = dates;
      this.selectedDate = dates[0].value;
    },
    // 简化的日期选择方法
    async selectDate(date) {
      try {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:612", "[VenueDetail] 🗓️ 选择日期:", date);
        this.selectedDate = date;
        this.selectedTimeSlots = [];
        this.loading = true;
        await this.venueStore.getVenueTimeSlots({
          venueId: this.venueId,
          date,
          forceRefresh: false
        });
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:625", "[VenueDetail] ✅ 日期选择完成");
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/venue/detail.vue:628", "[VenueDetail] ❌ 日期选择失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "error"
        });
      } finally {
        this.loading = false;
      }
    },
    // 预约类型变化
    onBookingTypeChange(type) {
      this.bookingType = type;
      this.selectedTimeSlots = [];
    },
    // 判断是否需要刷新时间段
    shouldRefreshTimeSlots() {
      if (!this.timeSlots || this.timeSlots.length === 0) {
        return true;
      }
      return false;
    },
    // 加载时间段
    async loadTimeSlots(forceRefresh = false) {
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:660", "[VenueDetail] 🚨🚨🚨 开始加载时间段 🚨🚨🚨", {
        venueId: this.venueId,
        date: this.selectedDate,
        forceRefresh
      });
      if (this.isRefreshing) {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:667", "[VenueDetail] 正在刷新中，跳过重复加载");
        return;
      }
      this.isRefreshing = true;
      try {
        common_vendor.index.showLoading({ title: "加载时间段..." });
        if (forceRefresh) {
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:678", "[VenueDetail] 🗑️ 强制刷新，清除所有缓存");
          if (this.venueStore && this.venueStore.cache && this.venueStore.cache.timeSlots) {
            const cacheKey = `${this.venueId}_${this.selectedDate}`;
            this.venueStore.cache.timeSlots.delete(cacheKey);
            this.venueStore.cache.timeSlots.clear();
            common_vendor.index.__f__("log", "at pages/venue/detail.vue:685", "[VenueDetail] ✅ 已清除 venue store 缓存");
          }
          try {
            const { default: cacheManager } = await "../../utils/cache-manager.js";
            if (cacheManager) {
              cacheManager.clearTimeSlotCache(this.venueId, this.selectedDate);
              cacheManager.clear();
              common_vendor.index.__f__("log", "at pages/venue/detail.vue:694", "[VenueDetail] ✅ 已清除缓存管理器缓存");
            }
          } catch (importError) {
            common_vendor.index.__f__("warn", "at pages/venue/detail.vue:697", "[VenueDetail] 导入缓存管理器失败:", importError);
          }
          try {
            const { default: unifiedTimeSlotManager } = await "../../utils/unified-timeslot-manager.js";
            if (unifiedTimeSlotManager) {
              unifiedTimeSlotManager.clearCache(this.venueId, this.selectedDate);
              common_vendor.index.__f__("log", "at pages/venue/detail.vue:705", "[VenueDetail] ✅ 已清除统一时间段管理器缓存");
            }
          } catch (importError) {
            common_vendor.index.__f__("warn", "at pages/venue/detail.vue:708", "[VenueDetail] 导入统一时间段管理器失败:", importError);
          }
        }
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:712", "[VenueDetail] 🔄 从后端获取时间段数据");
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:713", "[VenueDetail] 🔥 调用getVenueTimeSlots，参数:", {
          venueId: this.venueId,
          date: this.selectedDate,
          forceRefresh,
          loading: false,
          timestamp: Date.now()
        });
        const result = await this.venueStore.getVenueTimeSlots(
          this.venueId,
          this.selectedDate,
          forceRefresh,
          false
        );
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:728", "[VenueDetail] 🔥 getVenueTimeSlots返回结果:", result);
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:729", "[VenueDetail] 时间段获取结果:", result);
        let timeSlots = this.timeSlots || [];
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:732", "[VenueDetail] 原始时间段数量:", timeSlots.length);
        if (timeSlots.length > 0) {
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:736", "[VenueDetail] 🔧 开始修正时间段状态");
          timeSlots = timeSlots.map((slot) => {
            const originalStatus = slot.status;
            if (originalStatus === "AVAILABLE") {
              common_vendor.index.__f__("log", "at pages/venue/detail.vue:742", `[VenueDetail] 🔧 修正时间段 ${slot.id} (${slot.startTime}-${slot.endTime}) 状态: ${originalStatus} -> AVAILABLE`);
              return {
                ...slot,
                status: "AVAILABLE",
                isBooked: false,
                isAvailable: true
              };
            }
            return slot;
          });
          this.venueStore.setTimeSlots(timeSlots);
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:756", "[VenueDetail] 🎉 时间段状态修正完成");
        }
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:759", "[VenueDetail] 修正后时间段数量:", timeSlots.length);
        if (forceRefresh) {
          common_vendor.index.showToast({
            title: `刷新成功，获取到${timeSlots.length}个时间段`,
            icon: "success",
            duration: 2e3
          });
        }
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:769", "[VenueDetail] 🎉 时间段加载完成");
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/venue/detail.vue:772", "[VenueDetail] 加载时间段失败:", error);
        common_vendor.index.showToast({
          title: "加载时间段失败，请重试",
          icon: "error",
          duration: 2e3
        });
      } finally {
        common_vendor.index.hideLoading();
        this.isRefreshing = false;
      }
    },
    // 处理初始化数据失败
    handleInitDataFailure() {
      common_vendor.index.showModal({
        title: "提示",
        content: "场馆信息加载失败，请检查网络后重试",
        showCancel: false,
        success: () => {
          common_vendor.index.navigateBack();
        }
      });
    },
    // 时间段选择方法
    selectTimeSlot(slot) {
      try {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:799", "[VenueDetail] 点击时间段:", slot);
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:800", "[VenueDetail] 时间段状态:", slot.status);
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:801", "[VenueDetail] 当前预约类型:", this.bookingType);
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:802", "[VenueDetail] 当前已选时间段:", this.selectedTimeSlots);
        if (slot.status === "OCCUPIED" || slot.status === "RESERVED") {
          common_vendor.index.showToast({
            title: "该时间段已被预约",
            icon: "none",
            duration: 2e3
          });
          return;
        } else if (slot.status === "MAINTENANCE") {
          common_vendor.index.showToast({
            title: "该时间段维护中",
            icon: "none",
            duration: 2e3
          });
          return;
        } else if (slot.status === "EXPIRED") {
          const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          const selectedDate = this.selectedDate;
          if (selectedDate <= today) {
            common_vendor.index.showToast({
              title: "该时间段已过期，无法预约",
              icon: "none",
              duration: 2e3
            });
            return;
          } else {
            common_vendor.index.__f__("log", "at pages/venue/detail.vue:834", "[VenueDetail] 未来日期EXPIRED状态允许选择:", {
              selectedDate,
              today,
              isFutureDate: selectedDate > today
            });
          }
        }
        if (slot.status === "AVAILABLE" || slot.status === "EXPIRED" && this.selectedDate > (/* @__PURE__ */ new Date()).toISOString().split("T")[0]) {
          if (this.bookingType === "SHARED") {
            if (!this.isTimeSlotValidForSharing(slot)) {
              common_vendor.index.showToast({
                title: "拼场预约请选择三个小时以后的时间段",
                icon: "none",
                duration: 3e3
              });
              return;
            }
          }
          const existingIndex = this.selectedTimeSlots.findIndex(
            (item) => item.id && item.id === slot.id || item.startTime === slot.startTime && item.endTime === slot.endTime
          );
          if (existingIndex !== -1) {
            this.selectedTimeSlots.splice(existingIndex, 1);
            common_vendor.index.__f__("log", "at pages/venue/detail.vue:865", "取消选择时间段:", slot);
            common_vendor.index.showToast({
              title: "已取消选择",
              icon: "success",
              duration: 1e3
            });
            return;
          }
          if (this.selectedTimeSlots.length > 0) {
            const hasConsecutive = this.selectedTimeSlots.some(
              (selectedSlot) => this.isConsecutiveTimeSlot(selectedSlot, slot)
            );
            if (!hasConsecutive) {
              common_vendor.index.showToast({
                title: "只能选择连续的时间段",
                icon: "none",
                duration: 2e3
              });
              return;
            }
          }
          this.selectedTimeSlots.push(slot);
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:894", "已选择时间段:", this.selectedTimeSlots);
          common_vendor.index.showToast({
            title: "已选择时间段",
            icon: "success",
            duration: 1e3
          });
        } else {
          common_vendor.index.showToast({
            title: "该时间段不可用",
            icon: "none",
            duration: 2e3
          });
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/venue/detail.vue:911", "[VenueDetail] 时间段选择失败:", error);
        common_vendor.index.showToast({
          title: "选择时间段时出现问题，请重试",
          icon: "none",
          duration: 2e3
        });
      }
    },
    // 检查两个时间段是否连续
    isConsecutiveTimeSlot(slot1, slot2) {
      const slot1End = this.getMinutesFromTimeString(slot1.endTime);
      const slot2Start = this.getMinutesFromTimeString(slot2.startTime);
      const slot1Start = this.getMinutesFromTimeString(slot1.startTime);
      const slot2End = this.getMinutesFromTimeString(slot2.endTime);
      return slot1End === slot2Start || slot2End === slot1Start;
    },
    // 获取时间段样式类
    getSlotClass(slot) {
      const classes = ["timeslot-item"];
      if (slot.status === "OCCUPIED") {
        classes.push("occupied");
        classes.push("disabled");
      } else if (slot.status === "RESERVED") {
        classes.push("occupied");
        classes.push("disabled");
      } else if (slot.status === "MAINTENANCE") {
        classes.push("maintenance");
        classes.push("disabled");
      } else if (slot.status === "EXPIRED") {
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const selectedDate = this.selectedDate;
        if (selectedDate <= today) {
          classes.push("expired");
          classes.push("disabled");
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:955", "[VenueDetail] 🔧 今日EXPIRED状态添加expired和disabled样式:", {
            selectedDate,
            today,
            isPastOrToday: selectedDate <= today
          });
        } else {
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:961", "[VenueDetail] 🔧 未来日期EXPIRED状态不添加expired和disabled样式:", {
            selectedDate,
            today,
            isFutureDate: selectedDate > today
          });
        }
      }
      const isSelected = this.selectedTimeSlots.some(
        (selectedSlot) => slot.id && selectedSlot.id === slot.id || slot.startTime === selectedSlot.startTime && slot.endTime === selectedSlot.endTime
      );
      if (isSelected) {
        classes.push("selected");
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:977", "添加选中样式:", slot);
      }
      return classes.join(" ");
    },
    // 获取第一个时间段（按开始时间排序）
    getFirstTimeSlot() {
      if (this.selectedTimeSlots.length === 0)
        return null;
      return this.selectedTimeSlots.reduce((earliest, current) => {
        const earliestTime = this.getMinutesFromTimeString(earliest.startTime);
        const currentTime = this.getMinutesFromTimeString(current.startTime);
        return currentTime < earliestTime ? current : earliest;
      }, this.selectedTimeSlots[0]);
    },
    // 获取最后一个时间段（按结束时间排序）
    getLastTimeSlot() {
      if (this.selectedTimeSlots.length === 0)
        return null;
      return this.selectedTimeSlots.reduce((latest, current) => {
        const latestTime = this.getMinutesFromTimeString(latest.endTime);
        const currentTime = this.getMinutesFromTimeString(current.endTime);
        return currentTime > latestTime ? current : latest;
      }, this.selectedTimeSlots[0]);
    },
    // 检查时间段是否满足拼场预约的时间限制（需要提前3小时）
    isTimeSlotValidForSharing(slot) {
      try {
        const now = /* @__PURE__ */ new Date();
        const dateStr = this.selectedDate.replace(/-/g, "/");
        const timeStr = slot.startTime + ":00";
        const selectedDateTime = /* @__PURE__ */ new Date(`${dateStr} ${timeStr}`);
        if (isNaN(selectedDateTime.getTime())) {
          common_vendor.index.__f__("warn", "at pages/venue/detail.vue:1019", "[VenueDetail] 无效的日期时间:", `${dateStr} ${timeStr}`);
          return false;
        }
        const timeDiff = selectedDateTime.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1e3 * 60 * 60);
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1029", "[VenueDetail] 拼场时间检查:", {
          now: now.toISOString(),
          selectedDateTime: selectedDateTime.toISOString(),
          hoursDiff: hoursDiff.toFixed(2),
          isValid: hoursDiff >= 3
        });
        return hoursDiff >= 3;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/venue/detail.vue:1039", "[VenueDetail] 拼场时间检查失败:", error);
        return false;
      }
    },
    // 计算总价格
    getTotalPrice() {
      if (this.selectedTimeSlots.length === 0)
        return 0;
      return this.selectedTimeSlots.reduce((total, slot) => {
        return total + (slot.price || 0);
      }, 0);
    },
    // 获取时间段状态文本
    getSlotStatusText(status) {
      const statusMap = {
        "AVAILABLE": "可预约",
        "OCCUPIED": "已预约",
        "RESERVED": "已预约",
        "MAINTENANCE": "维护中",
        "EXPIRED": "已过期"
      };
      if (status === "EXPIRED") {
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const selectedDate = this.selectedDate;
        if (selectedDate > today) {
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:1070", "[VenueDetail] 🔧 未来日期EXPIRED状态修正为可预约:", {
            selectedDate,
            today,
            isFutureDate: selectedDate > today
          });
          return "可预约";
        }
      }
      return statusMap[status] || "可预约";
    },
    // 获取预约按钮文本
    getBookButtonText() {
      if (this.selectedTimeSlots.length === 0) {
        return "请选择时间段";
      }
      return `预约 ${this.selectedTimeSlots.length} 个时间段`;
    },
    // 预约场馆
    bookVenue() {
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1093", "[VenueDetail] 🎯 预约按钮被点击");
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1099", "[VenueDetail] 🚨 关键日期调试:", {
        selectedDate: this.selectedDate,
        today,
        tomorrow,
        isToday: this.selectedDate === today,
        isTomorrow: this.selectedDate === tomorrow,
        availableDates: this.availableDates.map((d) => ({ value: d.value, day: d.day }))
      });
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1108", "[VenueDetail] 📊 当前状态:", {
        selectedTimeSlots: this.selectedTimeSlots,
        selectedTimeSlotsLength: this.selectedTimeSlots.length,
        bookingType: this.bookingType,
        venueId: this.venueDetail.id,
        selectedDate: this.selectedDate
      });
      if (this.selectedTimeSlots.length === 0) {
        common_vendor.index.__f__("warn", "at pages/venue/detail.vue:1117", "[VenueDetail] ❌ 未选择时间段");
        common_vendor.index.showToast({
          title: "请选择时间段",
          icon: "none"
        });
        return;
      }
      const selectedSlotsData = JSON.stringify(this.selectedTimeSlots);
      const targetUrl = `/pages/booking/create?venueId=${this.venueDetail.id}&date=${this.selectedDate}&bookingType=${this.bookingType}&selectedSlots=${encodeURIComponent(selectedSlotsData)}`;
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1130", "[VenueDetail] 📋 跳转参数:", {
        venueId: this.venueDetail.id,
        selectedDate: this.selectedDate,
        bookingType: this.bookingType,
        selectedTimeSlots: this.selectedTimeSlots,
        targetUrl
      });
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1138", "[VenueDetail] 🚀 准备跳转到预约页面");
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1139", "[VenueDetail] 📋 跳转URL:", targetUrl);
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1140", "[VenueDetail] 📦 传递的时间段数据:", this.selectedTimeSlots);
      common_vendor.index.navigateTo({
        url: targetUrl,
        success: () => {
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:1146", "[VenueDetail] ✅ 成功跳转到预约页面");
        },
        fail: (error) => {
          common_vendor.index.__f__("error", "at pages/venue/detail.vue:1149", "[VenueDetail] ❌ 跳转预约页面失败:", error);
          common_vendor.index.showToast({
            title: "跳转失败，请重试",
            icon: "none"
          });
        }
      });
    },
    // 弹窗相关方法已移除，统一使用跳转到booking/create页面的预约流程
    // 联系场馆
    contactVenue() {
      if (this.venueDetail.phone) {
        common_vendor.index.makePhoneCall({
          phoneNumber: this.venueDetail.phone
        });
      } else {
        common_vendor.index.showToast({
          title: "暂无联系方式",
          icon: "none"
        });
      }
    },
    // 返回上一页
    goBack() {
      common_vendor.index.navigateBack();
    },
    // 格式化选中日期
    formatSelectedDate() {
      const selectedDateObj = this.availableDates.find((d) => d.value === this.selectedDate);
      return selectedDateObj ? `${selectedDateObj.day} ${selectedDateObj.date}` : this.selectedDate;
    },
    // 计算预约时长
    getBookingDuration() {
      if (this.selectedTimeSlots.length === 0) {
        return "0小时";
      }
      if (this.selectedTimeSlots.length === 1) {
        const slot = this.selectedTimeSlots[0];
        const startMinutes = this.getMinutesFromTimeString(slot.startTime);
        const endMinutes = this.getMinutesFromTimeString(slot.endTime);
        const durationMinutes = endMinutes - startMinutes;
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        if (minutes === 0) {
          return `${hours}小时`;
        } else {
          return `${hours}小时${minutes}分钟`;
        }
      } else {
        const firstSlot = this.getFirstTimeSlot();
        const lastSlot = this.getLastTimeSlot();
        if (firstSlot && lastSlot) {
          const startMinutes = this.getMinutesFromTimeString(firstSlot.startTime);
          const endMinutes = this.getMinutesFromTimeString(lastSlot.endTime);
          const durationMinutes = endMinutes - startMinutes;
          const hours = Math.floor(durationMinutes / 60);
          const minutes = durationMinutes % 60;
          if (minutes === 0) {
            return `${hours}小时`;
          } else {
            return `${hours}小时${minutes}分钟`;
          }
        }
        return "0小时";
      }
    },
    // 强制刷新时间段数据
    async forceRefreshTimeSlots() {
      try {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1230", "[VenueDetail] 🔄 用户手动触发强制刷新时间段");
        this.selectedTimeSlots = [];
        await this.loadTimeSlots(true);
        common_vendor.index.showToast({
          title: "刷新成功",
          icon: "success",
          duration: 1500
        });
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1244", "[VenueDetail] ✅ 手动刷新完成");
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/venue/detail.vue:1247", "[VenueDetail] ❌ 手动刷新失败:", error);
        common_vendor.index.showToast({
          title: "刷新失败，请重试",
          icon: "none",
          duration: 2e3
        });
      }
    },
    // 设置全局事件监听
    setupGlobalEventListeners() {
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1259", "[VenueDetail] 🚨🚨🚨 设置全局事件监听 🚨🚨🚨");
      common_vendor.index.$on("order-expired", this.onOrderExpiredEvent);
      common_vendor.index.$on("booking-success", this.onBookingSuccessEvent);
      common_vendor.index.$on("timeslot-status-updated", this.onTimeSlotStatusUpdated);
      common_vendor.index.$on("timeslot-updated", this.onTimeSlotUpdated);
      common_vendor.index.$on("force-refresh-timeslots", this.onForceRefreshTimeslots);
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1276", "[VenueDetail] ✅ 全局事件监听设置完成");
    },
    // 移除全局事件监听
    removeGlobalEventListeners() {
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1281", "[VenueDetail] 移除全局事件监听");
      common_vendor.index.$off("order-expired", this.onOrderExpiredEvent);
      common_vendor.index.$off("booking-success", this.onBookingSuccessEvent);
      common_vendor.index.$off("timeslot-status-updated", this.onTimeSlotStatusUpdated);
      common_vendor.index.$off("timeslot-updated", this.onTimeSlotUpdated);
      common_vendor.index.$off("force-refresh-timeslots", this.onForceRefreshTimeslots);
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1290", "[VenueDetail] 全局事件监听移除完成");
    },
    // 🔥 处理订单过期事件
    async onOrderExpiredEvent(eventData) {
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1295", "[VenueDetail] 🚨🚨🚨 收到订单过期事件 🚨🚨🚨");
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1296", "[VenueDetail] 订单过期事件数据:", eventData);
      if (eventData && eventData.venueId == this.venueId && eventData.date === this.selectedDate) {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1303", "[VenueDetail] 🎯 订单过期事件匹配当前页面，立即释放时间段并刷新");
        try {
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:1307", "[VenueDetail] 🗑️ 清除相关缓存");
          if (this.venueStore && this.venueStore.cache && this.venueStore.cache.timeSlots) {
            const cacheKey = `${this.venueId}_${this.selectedDate}`;
            this.venueStore.cache.timeSlots.delete(cacheKey);
            common_vendor.index.__f__("log", "at pages/venue/detail.vue:1313", "[VenueDetail] ✅ 已清除 venue store 缓存");
          }
          try {
            const { default: cacheManager } = await "../../utils/cache-manager.js";
            if (cacheManager) {
              cacheManager.clearTimeSlotCache(this.venueId, this.selectedDate);
              common_vendor.index.__f__("log", "at pages/venue/detail.vue:1321", "[VenueDetail] ✅ 已清除缓存管理器缓存");
            }
          } catch (importError) {
            common_vendor.index.__f__("warn", "at pages/venue/detail.vue:1324", "[VenueDetail] 导入缓存管理器失败:", importError);
          }
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:1328", "[VenueDetail] 🔄 立即刷新时间段数据");
          await this.loadTimeSlots(true);
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:1330", "[VenueDetail] 🎉 订单过期后时间段刷新完成");
          common_vendor.index.showToast({
            title: "订单已过期，时间段已释放",
            icon: "none",
            duration: 3e3
          });
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/venue/detail.vue:1340", "[VenueDetail] ❌ 处理订单过期事件失败:", error);
        }
      } else {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1344", "[VenueDetail] 🔍 订单过期事件不匹配当前页面，忽略");
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1345", "[VenueDetail] 当前页面:", { venueId: this.venueId, date: this.selectedDate });
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1346", "[VenueDetail] 事件数据:", { venueId: eventData == null ? void 0 : eventData.venueId, date: eventData == null ? void 0 : eventData.date });
      }
    },
    // 处理预约成功事件
    async onBookingSuccessEvent(eventData) {
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1352", "[VenueDetail] 收到预约成功事件:", eventData);
      if (eventData && eventData.venueId === this.venueId && eventData.date === this.selectedDate) {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1359", "[VenueDetail] 预约成功事件匹配当前页面，刷新时间段数据");
        setTimeout(async () => {
          try {
            await this.loadTimeSlots(true);
          } catch (error) {
            common_vendor.index.__f__("error", "at pages/venue/detail.vue:1366", "[VenueDetail] 刷新时间段数据失败:", error);
          }
        }, 1e3);
      } else {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1371", "[VenueDetail] 预约成功事件不匹配当前页面，忽略");
      }
    },
    // 显示预约类型帮助说明
    showBookingTypeHelp(type) {
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1377", "[VenueDetail] 显示预约类型帮助:", type);
      if (type === "EXCLUSIVE") {
        this.helpContent = {
          title: "包场预约",
          description: "包场预约是指您独享整个场地，不与其他用户共享。适合团队训练、比赛或私人活动。价格相对较高，但享有完全的场地使用权。"
        };
      } else if (type === "SHARED") {
        this.helpContent = {
          title: "拼场预约",
          description: "拼场预约是指与其他用户共享场地，适合个人或小组活动。价格相对优惠，但需要与其他用户协调使用场地。系统会自动匹配合适的拼场伙伴。"
        };
      }
      this.showHelpModal = true;
    },
    // 关闭帮助说明弹窗
    closeHelpModal() {
      this.showHelpModal = false;
      this.helpContent = {
        title: "",
        description: ""
      };
    },
    // 处理时间段状态更新事件
    async onTimeSlotStatusUpdated(eventData) {
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1405", "[VenueDetail] 收到时间段状态更新事件:", eventData);
      if (eventData && eventData.venueId === this.venueId && eventData.date === this.selectedDate) {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1412", "[VenueDetail] 时间段状态更新事件匹配当前页面，刷新数据");
        setTimeout(async () => {
          try {
            await this.loadTimeSlots(true);
            common_vendor.index.__f__("log", "at pages/venue/detail.vue:1418", "[VenueDetail] 时间段状态更新后刷新完成");
          } catch (error) {
            common_vendor.index.__f__("error", "at pages/venue/detail.vue:1420", "[VenueDetail] 时间段状态更新后刷新失败:", error);
          }
        }, 500);
      }
    },
    // 🎯 处理时间段更新事件（预约取消后）
    async onTimeSlotUpdated(eventData) {
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1428", "[VenueDetail] 🚨🚨🚨 收到时间段更新事件（预约取消后）🚨🚨🚨");
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1429", "[VenueDetail] 事件数据:", eventData);
      if (eventData && eventData.venueId == this.venueId && eventData.date === this.selectedDate) {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1436", "[VenueDetail] 🎯 时间段更新事件匹配当前页面，清除缓存并立即刷新数据");
        try {
          if (eventData.action === "booking-cancelled" || eventData.immediate) {
            common_vendor.index.__f__("log", "at pages/venue/detail.vue:1441", "[VenueDetail] 🗑️ 检测到立即更新事件，立即清除缓存");
            if (this.venueStore && this.venueStore.cache && this.venueStore.cache.timeSlots) {
              const cacheKey = `${this.venueId}_${this.selectedDate}`;
              this.venueStore.cache.timeSlots.delete(cacheKey);
              common_vendor.index.__f__("log", "at pages/venue/detail.vue:1447", "[VenueDetail] ✅ 已清除 venue store 缓存:", cacheKey);
            }
            try {
              const { default: cacheManager } = await "../../utils/cache-manager.js";
              if (cacheManager) {
                cacheManager.clearTimeSlotCache(this.venueId, this.selectedDate);
                common_vendor.index.__f__("log", "at pages/venue/detail.vue:1455", "[VenueDetail] ✅ 已清除缓存管理器缓存");
              }
            } catch (importError) {
              common_vendor.index.__f__("warn", "at pages/venue/detail.vue:1458", "[VenueDetail] 导入缓存管理器失败:", importError);
            }
          }
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:1463", "[VenueDetail] 🔄 立即从后端重新获取时间段数据");
          await this.loadTimeSlots(true);
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:1465", "[VenueDetail] 🎉 时间段立即刷新完成");
          common_vendor.index.showToast({
            title: "时间段状态已更新",
            icon: "success",
            duration: 2e3
          });
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/venue/detail.vue:1475", "[VenueDetail] ❌ 时间段立即刷新失败:", error);
        }
      } else {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1478", "[VenueDetail] 🔍 时间段更新事件不匹配当前页面，忽略");
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1479", "[VenueDetail] 当前页面:", { venueId: this.venueId, date: this.selectedDate });
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1480", "[VenueDetail] 事件数据:", { venueId: eventData == null ? void 0 : eventData.venueId, date: eventData == null ? void 0 : eventData.date });
      }
    },
    // 🎯 处理强制刷新时间段事件
    async onForceRefreshTimeslots(eventData) {
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1486", "[VenueDetail] 🚨🚨🚨 收到强制刷新时间段事件 🚨🚨🚨");
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1487", "[VenueDetail] 强制刷新事件数据:", eventData);
      if (eventData && eventData.venueId == this.venueId && eventData.date === this.selectedDate) {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1494", "[VenueDetail] 🎯 强制刷新事件匹配当前页面，执行强制清除缓存并刷新");
        try {
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:1498", "[VenueDetail] 🗑️ 强制清除所有缓存");
          if (this.venueStore && this.venueStore.cache && this.venueStore.cache.timeSlots) {
            const cacheKey = `${this.venueId}_${this.selectedDate}`;
            this.venueStore.cache.timeSlots.delete(cacheKey);
            this.venueStore.cache.timeSlots.clear();
            common_vendor.index.__f__("log", "at pages/venue/detail.vue:1505", "[VenueDetail] ✅ 已清除 venue store 缓存");
          }
          try {
            const { default: cacheManager } = await "../../utils/cache-manager.js";
            if (cacheManager) {
              cacheManager.clearTimeSlotCache(this.venueId, this.selectedDate);
              const timeSlotKey = cacheManager.generateTimeSlotKey ? cacheManager.generateTimeSlotKey(this.venueId, this.selectedDate) : `timeslots_${this.venueId}_${this.selectedDate}`;
              cacheManager.delete(timeSlotKey);
              cacheManager.clear();
              common_vendor.index.__f__("log", "at pages/venue/detail.vue:1520", "[VenueDetail] ✅ 已清除缓存管理器缓存");
            }
          } catch (importError) {
            common_vendor.index.__f__("warn", "at pages/venue/detail.vue:1523", "[VenueDetail] 导入缓存管理器失败:", importError);
          }
          try {
            const storageKeys = [
              `gym_booking_timeslots_${this.venueId}_${this.selectedDate}`,
              `timeslots_${this.venueId}_${this.selectedDate}`,
              `venue_${this.venueId}_${this.selectedDate}`,
              `cache_timeslots_${this.venueId}_${this.selectedDate}`
            ];
            storageKeys.forEach((key) => {
              try {
                common_vendor.index.removeStorageSync(key);
              } catch (e) {
              }
            });
            common_vendor.index.__f__("log", "at pages/venue/detail.vue:1542", "[VenueDetail] ✅ 已清除本地存储缓存");
          } catch (storageError) {
            common_vendor.index.__f__("warn", "at pages/venue/detail.vue:1544", "[VenueDetail] 清除本地存储缓存失败:", storageError);
          }
          this.selectedTimeSlots = [];
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:1551", "[VenueDetail] 🔄 强制从后端重新获取时间段数据");
          await this.loadTimeSlots(true);
          common_vendor.index.__f__("log", "at pages/venue/detail.vue:1554", "[VenueDetail] 🎉 强制清除缓存并刷新完成");
          common_vendor.index.showToast({
            title: "时间段已强制刷新",
            icon: "success",
            duration: 2e3
          });
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/venue/detail.vue:1564", "[VenueDetail] ❌ 强制清除缓存并刷新失败:", error);
          common_vendor.index.showToast({
            title: "刷新失败，请重试",
            icon: "error",
            duration: 2e3
          });
        }
      } else {
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1574", "[VenueDetail] 🔍 强制刷新事件不匹配当前页面，忽略");
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1575", "[VenueDetail] 当前:", { venueId: this.venueId, date: this.selectedDate });
        common_vendor.index.__f__("log", "at pages/venue/detail.vue:1576", "[VenueDetail] 事件:", { venueId: eventData == null ? void 0 : eventData.venueId, date: eventData == null ? void 0 : eventData.date });
      }
    }
  },
  // 监听器
  watch: {
    // 监听venueStore的isLoading状态变化
    "venueStore.isLoading"(newVal) {
      if (newVal !== void 0) {
        this.loading = newVal;
      }
    },
    // 监听bookingStore的isLoading状态变化
    "bookingStore.isLoading"(newVal) {
      if (newVal !== void 0) {
        this.loading = this.loading || newVal;
      }
    }
  },
  // 页面销毁时清理资源
  onUnload() {
    common_vendor.index.__f__("log", "at pages/venue/detail.vue:1601", "[VenueDetail] 📱 页面即将销毁，开始清理资源");
    try {
      this.removeGlobalEventListeners();
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
      common_vendor.index.__f__("log", "at pages/venue/detail.vue:1613", "[VenueDetail] ✅ 页面资源清理完成");
    } catch (error) {
      common_vendor.index.__f__("error", "at pages/venue/detail.vue:1616", "[VenueDetail] 页面资源清理失败:", error);
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.loading
  }, $data.loading ? {} : $options.venueDetail ? common_vendor.e({
    c: common_vendor.f($options.venueImages, (image, index, i0) => {
      return {
        a: image,
        b: index
      };
    }),
    d: common_vendor.o((...args) => $options.goBack && $options.goBack(...args)),
    e: common_vendor.t($options.venueDetail.name),
    f: common_vendor.t($options.venueDetail.rating || "暂无评分"),
    g: $options.venueDetail.rating
  }, $options.venueDetail.rating ? {} : {}, {
    h: $options.venueDetail.reviewCount
  }, $options.venueDetail.reviewCount ? {
    i: common_vendor.t($options.venueDetail.reviewCount)
  } : {}, {
    j: common_vendor.t($options.venueDetail.location),
    k: $options.venueDetail.distance
  }, $options.venueDetail.distance ? {
    l: common_vendor.t($options.venueDetail.distance)
  } : {}, {
    m: common_vendor.t($options.venueDetail.price),
    n: common_vendor.t($options.venueDetail.type),
    o: $options.venueDetail.supportSharing
  }, $options.venueDetail.supportSharing ? {} : {}, {
    p: common_vendor.t($options.venueDetail.status === "ACTIVE" ? "营业中" : "暂停营业"),
    q: common_vendor.t($options.venueDetail.description),
    r: common_vendor.f($options.facilitiesList, (facility, k0, i0) => {
      return {
        a: common_vendor.t(facility),
        b: facility
      };
    }),
    s: common_vendor.t($options.formatOpeningHours),
    t: $options.venueDetail.supportSharing
  }, $options.venueDetail.supportSharing ? common_vendor.e({
    v: $data.bookingType === "EXCLUSIVE" ? 1 : "",
    w: common_vendor.o(($event) => $options.onBookingTypeChange("EXCLUSIVE")),
    x: common_vendor.o(($event) => $options.showBookingTypeHelp("EXCLUSIVE")),
    y: $data.bookingType === "SHARED" ? 1 : "",
    z: common_vendor.o(($event) => $options.onBookingTypeChange("SHARED")),
    A: common_vendor.o(($event) => $options.showBookingTypeHelp("SHARED")),
    B: $data.bookingType === "SHARED"
  }, $data.bookingType === "SHARED" ? {} : {}) : {}, {
    C: common_vendor.o((...args) => $options.forceRefreshTimeSlots && $options.forceRefreshTimeSlots(...args)),
    D: common_vendor.f($data.availableDates, (date, index, i0) => {
      return {
        a: common_vendor.t(date.day),
        b: common_vendor.t(date.date),
        c: index,
        d: $data.selectedDate === date.value ? 1 : "",
        e: common_vendor.o(($event) => $options.selectDate(date.value), index)
      };
    }),
    E: common_vendor.f($options.filteredTimeSlots, (slot, k0, i0) => {
      return {
        a: common_vendor.t(slot.startTime),
        b: common_vendor.t(slot.endTime),
        c: common_vendor.t(slot.price),
        d: common_vendor.t($options.getSlotStatusText(slot.status)),
        e: slot.id,
        f: common_vendor.n($options.getSlotClass(slot)),
        g: common_vendor.o(($event) => $options.selectTimeSlot(slot), slot.id)
      };
    }),
    F: $options.filteredTimeSlots.length === 0
  }, $options.filteredTimeSlots.length === 0 ? {} : {}, {
    G: $data.selectedTimeSlots.length > 0
  }, $data.selectedTimeSlots.length > 0 ? {
    H: common_vendor.t($data.selectedTimeSlots.length),
    I: common_vendor.t($options.getTotalPrice())
  } : {}, {
    J: common_vendor.o((...args) => $options.contactVenue && $options.contactVenue(...args)),
    K: common_vendor.t($options.getBookButtonText()),
    L: $data.selectedTimeSlots.length > 0 ? 1 : "",
    M: $data.selectedTimeSlots.length === 0,
    N: common_vendor.o((...args) => $options.bookVenue && $options.bookVenue(...args))
  }) : {
    O: common_vendor.o((...args) => $options.initData && $options.initData(...args))
  }, {
    b: $options.venueDetail,
    P: $data.showHelpModal
  }, $data.showHelpModal ? {
    Q: common_vendor.t($data.helpContent.title),
    R: common_vendor.o((...args) => $options.closeHelpModal && $options.closeHelpModal(...args)),
    S: common_vendor.t($data.helpContent.description),
    T: common_vendor.o((...args) => $options.closeHelpModal && $options.closeHelpModal(...args)),
    U: common_vendor.o(() => {
    }),
    V: common_vendor.o((...args) => $options.closeHelpModal && $options.closeHelpModal(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-91798fc9"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/venue/detail.js.map
