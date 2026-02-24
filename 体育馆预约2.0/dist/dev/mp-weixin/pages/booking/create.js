"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_venue = require("../../stores/venue.js");
const stores_booking = require("../../stores/booking.js");
const stores_user = require("../../stores/user.js");
require("../../utils/request.js");
require("../../utils/cache-manager.js");
require("../../utils/debug-timeslot-expired.js");
const _sfc_main = {
  name: "BookingCreate",
  data() {
    return {
      venueStore: null,
      bookingStore: null,
      userStore: null,
      venueId: null,
      selectedDate: "",
      selectedSlot: null,
      // 🔥 修复问题3: 添加 selectedSlot 到 data 中
      selectedSlots: [],
      // 存储多个选中的时间段
      isRefreshing: false,
      // 是否正在刷新
      refreshRequested: false,
      // 是否有刷新请求
      forceRefreshRequested: false,
      // 是否有强制刷新请求
      // 🔒 并发控制
      isConfirmingBooking: false,
      isLoadingData: false,
      // 📊 性能监控
      performanceMetrics: {
        loadStartTime: 0,
        confirmStartTime: 0,
        networkStartTime: 0
      },
      // 🗜️ 数据压缩配置
      compressionConfig: {
        enabled: true,
        minSize: 1e3,
        // 超过1KB才压缩
        level: 6
        // 压缩级别
      },
      bookingForm: {
        bookingType: "EXCLUSIVE",
        teamName: "",
        contactInfo: "",
        description: ""
      },
      // 📱 用户体验优化
      uxState: {
        showLoading: false,
        loadingText: "加载中...",
        lastError: null,
        retryCount: 0
      },
      // 🎯 自定义确认弹窗
      showConfirmDialog: false,
      confirmDialogData: null,
      confirmDialogResolve: null
    };
  },
  computed: {
    timeSlots() {
      var _a;
      return ((_a = this.venueStore) == null ? void 0 : _a.timeSlots) || [];
    },
    userInfo() {
      var _a;
      return ((_a = this.userStore) == null ? void 0 : _a.userInfoGetter) || {};
    },
    // 获取场馆信息，确保有默认值
    venue() {
      var _a, _b;
      const venueData = ((_a = this.venueStore) == null ? void 0 : _a.venueDetailGetter) || ((_b = this.venueStore) == null ? void 0 : _b.venueDetail);
      if (!venueData) {
        return null;
      }
      const result = {
        ...venueData,
        supportSharing: venueData.supportSharing !== void 0 ? venueData.supportSharing : true,
        price: venueData.price || 0
      };
      return result;
    },
    totalCost() {
      var _a, _b;
      if (this.selectedSlots && this.selectedSlots.length > 0) {
        return this.selectedSlots.reduce((sum, slot) => {
          var _a2;
          let slotPrice = 0;
          if (slot.price) {
            slotPrice = parseFloat(slot.price);
          } else if (slot.pricePerHour) {
            slotPrice = parseFloat(slot.pricePerHour);
          } else {
            const venuePrice2 = ((_a2 = this.venue) == null ? void 0 : _a2.price) || 0;
            slotPrice = parseFloat(venuePrice2) / 2 || 0;
          }
          return sum + slotPrice;
        }, 0);
      }
      if (this.selectedSlot && this.selectedSlot.price) {
        return parseFloat(this.selectedSlot.price);
      }
      if (this.selectedSlot && this.selectedSlot.pricePerHour) {
        return parseFloat(this.selectedSlot.pricePerHour);
      }
      const venuePrice = ((_a = this.venue) == null ? void 0 : _a.pricePerHour) || ((_b = this.venue) == null ? void 0 : _b.price) || 0;
      return parseFloat(venuePrice) || 0;
    },
    // 🔥 修复问题3：修正isMultiSlot计算属性的判断逻辑
    isMultiSlot() {
      if (this.selectedSlots && this.selectedSlots.length > 0) {
        return true;
      }
      return false;
    },
    canConfirm() {
      var _a, _b, _c;
      const hasDate = !!this.selectedDate;
      const hasSlot = !!(((_a = this.selectedSlots) == null ? void 0 : _a.length) > 0 || this.selectedSlot);
      const hasVenue = !!((_b = this.venue) == null ? void 0 : _b.id);
      const hasPrice = !!((_c = this.venue) == null ? void 0 : _c.price);
      const baseValid = hasDate && hasSlot && hasVenue && hasPrice;
      if (this.bookingForm.bookingType === "SHARED") {
        const hasTeamName = !!(this.bookingForm.teamName && this.bookingForm.teamName.trim());
        const hasContactInfo = !!(this.bookingForm.contactInfo && this.bookingForm.contactInfo.trim());
        const result = baseValid && hasTeamName && hasContactInfo;
        return result;
      }
      return baseValid;
    }
  },
  onLoad(options) {
    this.venueStore = stores_venue.useVenueStore();
    this.bookingStore = stores_booking.useBookingStore();
    this.userStore = stores_user.useUserStore();
    this.venueId = options.venueId;
    this.selectedDate = options.date;
    if (options.bookingType) {
      this.bookingForm.bookingType = options.bookingType;
    }
    if (options.selectedSlots) {
      try {
        this.selectedSlots = JSON.parse(decodeURIComponent(options.selectedSlots));
        if (this.selectedSlots.length > 0 && this.selectedSlots[0].date) {
          const slotDate = this.selectedSlots[0].date;
          if (this.selectedDate !== slotDate) {
            this.selectedDate = slotDate;
          }
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:452", "[BookingCreate] 解析时间段数据失败:", error);
      }
    }
  },
  onShow() {
    this.setupEventListeners();
    if (this.venueId) {
      this.optimizedLoadData();
    }
  },
  onHide() {
    this.removeEventListeners();
  },
  methods: {
    // --- 日志和调试 --- 
    log(message, ...args) {
    },
    logError(message, ...args) {
      common_vendor.index.__f__("error", "at pages/booking/create.vue:477", `[BookingCreate] ❌ ${message}`, ...args);
    },
    // --- UI 交互 ---
    showToast(title, icon = "none", duration = 2e3) {
      common_vendor.index.showToast({ title, icon, duration });
    },
    showLoading(title = "加载中...") {
      if (!this.uxState.showLoading) {
        this.uxState.showLoading = true;
        common_vendor.index.showLoading({ title, mask: true });
      }
    },
    hideLoading() {
      if (this.uxState.showLoading) {
        this.uxState.showLoading = false;
        common_vendor.index.hideLoading();
      }
    },
    async optimizedLoadData() {
      this.isLoadingData = true;
      common_vendor.index.showLoading({ title: "加载中..." });
      try {
        const cacheKey = `booking_page_data_${this.venueId}_${this.selectedDate}`;
        const cachedData = common_vendor.index.getStorageSync(cacheKey);
        const now = Date.now();
        if (cachedData && now - cachedData.timestamp < 5 * 60 * 1e3) {
          this.venueStore.setVenueDetail(cachedData.venue);
          this.venueStore.setTimeSlots(cachedData.timeSlots);
          common_vendor.index.hideLoading();
          this.isLoadingData = false;
          return;
        }
        const promises = [this.loadVenueDetail()];
        if (this.selectedDate) {
          promises.push(this.refreshTimeSlotStatus());
        }
        await Promise.all(promises);
        const newCacheData = {
          venue: this.venue,
          timeSlots: this.timeSlots,
          timestamp: Date.now()
        };
        common_vendor.index.setStorageSync(cacheKey, newCacheData);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:532", "[BookingCreate] ❌ 数据加载失败:", error);
        common_vendor.index.showToast({
          title: "数据加载失败，请稍后重试",
          icon: "none",
          duration: 2e3
        });
      } finally {
        this.isLoadingData = false;
        common_vendor.index.hideLoading();
      }
    },
    // 🔄 刷新时间段状态
    async refreshTimeSlotStatus(force = false) {
      this.log(`[TimeSlot] 刷新请求 (Force: ${force})`);
      if (force) {
        this.forceRefreshRequested = true;
      } else {
        this.refreshRequested = true;
      }
      if (this.isRefreshing) {
        this.log("[TimeSlot] 刷新已在进行中，新请求已排队");
        return;
      }
      this.isRefreshing = true;
      while (this.forceRefreshRequested || this.refreshRequested) {
        const isForced = this.forceRefreshRequested;
        this.forceRefreshRequested = false;
        this.refreshRequested = false;
        this.showLoading("更新状态...");
        this.log(`[TimeSlot] 开始刷新 (Forced: ${isForced})`);
        try {
          const result = await this.loadTimeSlots(this.venueId, this.selectedDate, isForced);
          let timeSlotsData = [];
          if (!result) {
            timeSlotsData = [];
          } else if (Array.isArray(result)) {
            timeSlotsData = result;
          } else if (result.data && Array.isArray(result.data)) {
            timeSlotsData = result.data;
          } else if (result.success && result.data && Array.isArray(result.data)) {
            timeSlotsData = result.data;
          } else {
            timeSlotsData = [];
          }
          const processed = this.processTimeSlots(timeSlotsData);
          if (this.venueStore && typeof this.venueStore.setTimeSlots === "function") {
            this.venueStore.setTimeSlots(processed);
          }
          this.log("[TimeSlot] 时间段状态刷新成功");
          common_vendor.index.$emit("timeSlotsStatusUpdated", { venueId: this.venueId, date: this.selectedDate });
        } catch (error) {
          this.logError("[TimeSlot] 刷新时间段状态失败", error);
          this.showToast("状态更新失败，请稍后重试", "error");
        } finally {
          this.hideLoading();
          this.lastRefreshTime = Date.now();
        }
      }
      this.isRefreshing = false;
    },
    processTimeSlots(data) {
      if (!data || !Array.isArray(data)) {
        this.logError("processTimeSlots: 无效的时间段数据", data);
        return [];
      }
      return data.map((slot) => ({
        ...slot
        // 在这里可以添加或修改字段，以适应前端需求
      }));
    },
    // 🔍 验证预约数据一致性
    validateBookingData() {
      const selectedSlots = this.selectedSlots || this.bookingForm.selectedSlots || [];
      if (selectedSlots.length > 0) {
        selectedSlots.forEach((slot) => {
          const currentSlot = this.timeSlots.find((ts) => ts.id === slot.id);
          if (currentSlot && currentSlot.status !== "AVAILABLE")
            ;
        });
      }
    },
    // 加载场馆详情
    async loadVenueDetail() {
      var _a;
      try {
        this.recordPerformanceMetric("venue-detail-start", { venueId: this.venueId });
        const cacheKey = `venue_detail_${this.venueId}`;
        const cachedVenue = common_vendor.index.getStorageSync(cacheKey);
        const now = Date.now();
        if (cachedVenue && cachedVenue.timestamp && now - cachedVenue.timestamp < 5 * 60 * 1e3) {
          this.recordPerformanceMetric("venue-cache-hit", {
            venueId: this.venueId,
            cacheAge: now - cachedVenue.timestamp
          });
          this.venueStore.setVenueDetail(cachedVenue.data);
        } else {
          const requestParams = {
            venueId: parseInt(this.venueId),
            compress: this.compressionConfig.enabled,
            fields: this.compressionConfig.optimizeFields ? "id,name,price,supportSharing,location,openingHours,status" : void 0
          };
          await this.venueStore.getVenueDetail(this.venueId, requestParams);
          try {
            const cacheData = {
              data: this.venue,
              timestamp: now
            };
            common_vendor.index.setStorageSync(cacheKey, cacheData);
          } catch (cacheError) {
          }
        }
        if (this.selectedDate) {
          await this.loadTimeSlots();
        }
        this.recordPerformanceMetric("venue-detail-success", {
          venueId: this.venueId,
          venueName: (_a = this.venue) == null ? void 0 : _a.name
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:694", "[BookingCreate] ❌ 加载场馆详情失败:", error);
        this.recordPerformanceMetric("venue-detail-error", {
          venueId: this.venueId,
          error: error.message
        });
        const mockVenueData = {
          id: this.venueId || 1,
          name: "测试体育馆",
          price: 120,
          supportSharing: true,
          location: "测试地址",
          openingHours: "08:00 - 22:00"
        };
        this.venueStore.setVenueDetail(mockVenueData);
        if (this.selectedDate) {
          const mockTimeSlots = [
            {
              id: 1,
              startTime: "09:00",
              endTime: "10:00",
              status: "AVAILABLE",
              price: 120
            },
            {
              id: 2,
              startTime: "10:00",
              endTime: "11:00",
              status: "AVAILABLE",
              price: 120
            }
          ];
          this.venueStore.setTimeSlots(mockTimeSlots);
        }
        this.showUserFeedback("error", "场馆信息加载失败，使用测试数据");
        this.recordPerformanceMetric("venue-mock-data", { venueId: this.venueId });
      }
    },
    // 加载场馆和指定时间段
    async loadVenueAndSlot(slotId) {
      try {
        await this.venueStore.getVenueDetail(this.venueId);
        await this.loadTimeSlots();
        let slot = this.timeSlots.find((s) => s.id == slotId);
        if (!slot && slotId.includes("-")) {
          const [startTime, endTime] = slotId.split("-");
          slot = this.timeSlots.find((s) => s.startTime === startTime && s.endTime === endTime);
        }
        if (slot) {
          this.selectedSlot = slot;
        } else {
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:765", "加载失败:", error);
        this.venueStore.setVenueDetail({
          id: this.venueId || 1,
          name: "测试体育馆",
          price: 120,
          supportSharing: true,
          location: "测试地址",
          openingHours: "08:00 - 22:00"
        });
        const mockSlots = [
          {
            id: 1,
            startTime: "09:00",
            endTime: "10:00",
            status: "AVAILABLE",
            price: 120
          },
          {
            id: 2,
            startTime: "10:00",
            endTime: "11:00",
            status: "AVAILABLE",
            price: 120
          },
          {
            id: 3,
            startTime: "14:00",
            endTime: "15:00",
            status: "AVAILABLE",
            price: 120
          }
        ];
        this.venueStore.setTimeSlots(mockSlots);
        if (slotId) {
          let slot = mockSlots.find((s) => s.id == slotId);
          if (!slot && slotId.includes("-")) {
            const [startTime, endTime] = slotId.split("-");
            slot = mockSlots.find((s) => s.startTime === startTime && s.endTime === endTime);
          }
          if (slot) {
            this.selectedSlot = slot;
          }
        }
        common_vendor.index.showToast({
          title: "使用模拟数据",
          icon: "none"
        });
      }
    },
    // 加载时间段
    async loadTimeSlots() {
      if (!this.selectedDate) {
        return { data: [] };
      }
      try {
        common_vendor.index.showLoading({ title: "加载时间段..." });
        const result = await this.venueStore.getVenueTimeSlots({
          venueId: this.venueId,
          date: this.selectedDate,
          loading: false
          // 🔥 修复：禁用API请求的自动loading，避免与手动loading冲突
        });
        const timeSlots = this.timeSlots || [];
        if (timeSlots.length === 0) {
          common_vendor.index.showToast({
            title: "该日期暂无可预约时间段",
            icon: "none",
            duration: 2e3
          });
        }
        return result || { data: timeSlots };
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:861", "[BookingCreate] 加载时间段失败:", error);
        common_vendor.index.showToast({
          title: "加载时间段失败，请重试",
          icon: "none",
          duration: 2e3
        });
        common_vendor.index.__f__("error", "at pages/booking/create.vue:871", "[BookingCreate] 时间段加载失败，请手动刷新或联系管理员");
        return { data: [] };
      } finally {
        common_vendor.index.hideLoading();
      }
    },
    // 格式化日期时间
    formatDateTime(date, slot) {
      if (!date) {
        return "请选择时间";
      }
      try {
        const dateObj = new Date(date);
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        const weekDay = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][dateObj.getDay()];
        const dateStr = `${year}年${month}月${day}日 ${weekDay}`;
        if (this.selectedSlots && this.selectedSlots.length > 0) {
          const sortedSlots = [...this.selectedSlots].sort((a, b) => {
            const timeA = a.startTime.split(":").map(Number);
            const timeB = b.startTime.split(":").map(Number);
            if (timeA[0] !== timeB[0]) {
              return timeA[0] - timeB[0];
            }
            return timeA[1] - timeB[1];
          });
          const timeSlots = sortedSlots.map((slot2) => {
            let startTime3 = slot2.startTime;
            let endTime3 = slot2.endTime;
            if (startTime3 && startTime3.length > 5) {
              startTime3 = startTime3.substring(0, 5);
            }
            if (endTime3 && endTime3.length > 5) {
              endTime3 = endTime3.substring(0, 5);
            }
            return `${startTime3}-${endTime3}`;
          });
          const totalDuration = sortedSlots.reduce((total, slot2) => {
            return total + this.calculateDuration(slot2.startTime, slot2.endTime);
          }, 0);
          const durationText2 = totalDuration % 1 === 0 ? totalDuration : totalDuration.toFixed(1);
          const firstSlot = sortedSlots[0];
          const lastSlot = sortedSlots[sortedSlots.length - 1];
          let startTime2 = firstSlot.startTime.length > 5 ? firstSlot.startTime.substring(0, 5) : firstSlot.startTime;
          let endTime2 = lastSlot.endTime.length > 5 ? lastSlot.endTime.substring(0, 5) : lastSlot.endTime;
          const result2 = `${dateStr} ${startTime2}-${endTime2} (共${durationText2}小时，${sortedSlots.length}个时间段)`;
          return result2;
        }
        if (!slot) {
          return "请选择时间";
        }
        let startTime = slot.startTime;
        let endTime = slot.endTime;
        if (startTime && startTime.length > 5) {
          startTime = startTime.substring(0, 5);
        }
        if (endTime && endTime.length > 5) {
          endTime = endTime.substring(0, 5);
        }
        const duration = this.calculateDuration(startTime, endTime);
        const durationText = duration % 1 === 0 ? duration : duration.toFixed(1);
        const timeStr = `${startTime}-${endTime}`;
        const result = `${dateStr} ${timeStr} (${durationText}小时)`;
        return result;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:981", "formatDateTime 错误:", error);
        return "时间格式错误";
      }
    },
    // 计算时长
    calculateDuration(startTime, endTime) {
      try {
        const [startHour, startMinute] = startTime.split(":").map(Number);
        const [endHour, endMinute] = endTime.split(":").map(Number);
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        const durationMinutes = endMinutes - startMinutes;
        const hours = durationMinutes / 60;
        return Math.round(hours * 10) / 10;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:1001", "计算时长错误:", error);
        return 1;
      }
    },
    // 获取单个时间段的价格
    getSlotPrice(slot) {
      var _a;
      if (slot.price && slot.price > 0) {
        return parseFloat(slot.price);
      }
      if (slot.pricePerHour && slot.pricePerHour > 0) {
        return parseFloat(slot.pricePerHour);
      }
      const venuePrice = ((_a = this.venue) == null ? void 0 : _a.price) || 0;
      if (venuePrice > 0) {
        return parseFloat(venuePrice) / 2;
      }
      return 60;
    },
    // 获取时间段状态文本
    getSlotStatusText(status) {
      const statusMap = {
        "AVAILABLE": "可预约",
        "RESERVED": "已预约",
        "OCCUPIED": "已占用",
        "MAINTENANCE": "维护中",
        "BOOKED": "已预订",
        "SHARING": "拼场中",
        "EXPIRED": "已过期"
      };
      return statusMap[status] || status;
    },
    // 🚀 优化的确认预约方法
    async confirmBooking() {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
      if (this.isConfirmingBooking) {
        return;
      }
      if (!this.canConfirm) {
        return;
      }
      try {
        const confirmResult = await this.showConfirmationDialog();
        if (!confirmResult) {
          return;
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:1065", "[BookingCreate] ❌ 确认对话框异常:", error);
        return;
      }
      if (!this.validateForm()) {
        return;
      }
      this.isConfirmingBooking = true;
      try {
        common_vendor.index.showLoading({ title: "创建中..." });
        let result;
        const compressedData = this.compressBookingData();
        if (this.selectedSlots && this.selectedSlots.length > 0) {
          const sortedSlots = [...this.selectedSlots].sort((a, b) => {
            const timeA = a.startTime.split(":").map(Number);
            const timeB = b.startTime.split(":").map(Number);
            if (timeA[0] !== timeB[0]) {
              return timeA[0] - timeB[0];
            }
            return timeA[1] - timeB[1];
          });
          const firstSlot = sortedSlots[0];
          const lastSlot = sortedSlots[sortedSlots.length - 1];
          if (this.bookingForm.bookingType === "SHARED") {
            const totalPrice = sortedSlots.reduce((total, slot) => {
              return total + this.getSlotPrice(slot);
            }, 0);
            const pricePerTeam = Math.round(totalPrice / 2 * 100) / 100;
            const actualDate = firstSlot.date || this.selectedDate;
            const sharedBookingData = {
              venueId: parseInt(this.venueId),
              date: actualDate,
              // 使用时间段的实际日期
              startTime: firstSlot.startTime,
              // 最早时间段的开始时间
              endTime: lastSlot.endTime,
              // 最晚时间段的结束时间
              teamName: this.bookingForm.teamName || "",
              contactInfo: this.bookingForm.contactInfo || "",
              maxParticipants: 2,
              // 拼场固定2队
              description: this.bookingForm.description || "",
              slotIds: sortedSlots.map((slot) => slot.id),
              // 按时间排序的时间段ID
              price: pricePerTeam
              // 🔑 关键：传递每队价格给后端
            };
            result = await this.bookingStore.createSharedBooking(sharedBookingData);
          } else {
            const totalPrice = sortedSlots.reduce((total, slot) => {
              return total + this.getSlotPrice(slot);
            }, 0);
            const multiSlotBookingData = {
              venueId: parseInt(this.venueId),
              date: this.selectedDate,
              startTime: firstSlot.startTime,
              endTime: lastSlot.endTime,
              slotIds: sortedSlots.map((slot) => slot.id),
              bookingType: this.bookingForm.bookingType,
              description: this.bookingForm.description || "",
              price: totalPrice || sortedSlots.length * 60,
              // 备用价格
              // 🔧 修复：添加fieldName字段确保数据库字段统一
              fieldName: ((_a = this.venue) == null ? void 0 : _a.name) || ((_b = this.venue) == null ? void 0 : _b.fieldName) || "主场地"
            };
            result = await this.bookingStore.createBooking(multiSlotBookingData);
          }
        } else {
          let bookingData;
          if (this.selectedSlots && this.selectedSlots.length > 0) {
            const sortedSlots = [...this.selectedSlots].sort((a, b) => {
              const timeA = a.startTime.split(":").map(Number);
              const timeB = b.startTime.split(":").map(Number);
              if (timeA[0] !== timeB[0])
                return timeA[0] - timeB[0];
              return timeA[1] - timeB[1];
            });
            const firstSlot = sortedSlots[0];
            const lastSlot = sortedSlots[sortedSlots.length - 1];
            const totalPrice = sortedSlots.reduce((sum, slot) => sum + this.getSlotPrice(slot), 0);
            const actualDate = firstSlot.date || this.selectedDate;
            bookingData = {
              venueId: parseInt(this.venueId),
              date: actualDate,
              // 使用时间段的实际日期
              startTime: firstSlot.startTime,
              endTime: lastSlot.endTime,
              slotId: firstSlot.id,
              // 主要时间段ID
              slotIds: sortedSlots.map((slot) => slot.id),
              // 所有时间段ID
              bookingType: this.bookingForm.bookingType,
              description: this.bookingForm.description || "",
              price: totalPrice,
              fieldName: ((_c = this.venueDetail) == null ? void 0 : _c.name) || ((_d = this.venueDetail) == null ? void 0 : _d.fieldName) || "主场地"
            };
          } else if (this.selectedSlot) {
            const actualDate = this.selectedSlot.date || this.selectedDate;
            bookingData = {
              venueId: parseInt(this.venueId),
              date: actualDate,
              // 使用时间段的实际日期
              startTime: this.selectedSlot.startTime,
              endTime: this.selectedSlot.endTime,
              slotId: this.selectedSlot.id,
              bookingType: this.bookingForm.bookingType,
              description: this.bookingForm.description || "",
              price: this.getSlotPrice(this.selectedSlot),
              fieldName: ((_e = this.venueDetail) == null ? void 0 : _e.name) || ((_f = this.venueDetail) == null ? void 0 : _f.fieldName) || "主场地"
            };
          } else {
            throw new Error("没有选择时间段");
          }
          if (!bookingData.venueId || !bookingData.date || !bookingData.startTime || !bookingData.price) {
            throw new Error("预约数据不完整");
          }
          try {
            if (this.bookingForm.bookingType === "SHARED") {
              const pricePerTeam = Math.round(bookingData.price / 2 * 100) / 100;
              const actualDate = bookingData.date;
              const sharedBookingData = {
                venueId: parseInt(this.venueId),
                date: actualDate,
                // 使用时间段的实际日期
                startTime: bookingData.startTime,
                // 使用已计算好的开始时间
                endTime: bookingData.endTime,
                // 使用已计算好的结束时间
                teamName: this.bookingForm.teamName || "",
                contactInfo: this.bookingForm.contactInfo || "",
                maxParticipants: 2,
                description: this.bookingForm.description || "",
                price: pricePerTeam,
                slotIds: bookingData.slotIds || [bookingData.slotId],
                // 使用所有时间段ID
                fieldName: ((_g = this.venueDetail) == null ? void 0 : _g.name) || ((_h = this.venueDetail) == null ? void 0 : _h.fieldName) || "主场地"
              };
              result = await this.bookingStore.createSharedBooking(sharedBookingData);
            } else {
              result = await this.bookingStore.createBooking(bookingData);
            }
          } catch (error) {
            common_vendor.index.__f__("error", "at pages/booking/create.vue:1261", "预约创建失败:", error);
            throw error;
          }
        }
        try {
          let syncData;
          if (this.bookingForm.bookingType === "SHARED") {
            const sortedSlots = [...this.selectedSlots].sort((a, b) => {
              const timeA = a.startTime.split(":").map(Number);
              const timeB = b.startTime.split(":").map(Number);
              if (timeA[0] !== timeB[0])
                return timeA[0] - timeB[0];
              return timeA[1] - timeB[1];
            });
            const firstSlot = sortedSlots[0];
            const lastSlot = sortedSlots[sortedSlots.length - 1];
            const actualDate = firstSlot.date || this.selectedDate;
            syncData = {
              venueId: parseInt(this.venueId),
              venue_id: parseInt(this.venueId),
              date: actualDate,
              // 使用修复后的日期
              booking_date: actualDate,
              bookingType: this.bookingForm.bookingType,
              booking_type: this.bookingForm.bookingType,
              slotIds: sortedSlots.map((slot) => slot.id),
              startTime: firstSlot.startTime,
              endTime: lastSlot.endTime
            };
          } else {
            syncData = {
              venueId: parseInt(this.venueId),
              venue_id: parseInt(this.venueId),
              date: this.selectedDate,
              // 使用页面的选中日期
              booking_date: this.selectedDate,
              bookingType: this.bookingForm.bookingType,
              booking_type: this.bookingForm.bookingType,
              slotIds: this.selectedSlots.length > 0 ? this.selectedSlots.map((slot) => slot.id) : [(_i = this.selectedSlot) == null ? void 0 : _i.id],
              startTime: this.selectedSlots.length > 0 ? this.selectedSlots[0].startTime : (_j = this.selectedSlot) == null ? void 0 : _j.startTime,
              endTime: this.selectedSlots.length > 0 ? this.selectedSlots[this.selectedSlots.length - 1].endTime : (_k = this.selectedSlot) == null ? void 0 : _k.endTime
            };
          }
          const bookingSuccessData = syncData;
          if (this.selectedSlots && this.selectedSlots.length > 0) {
            const sortedSlots = [...this.selectedSlots].sort((a, b) => {
              const timeA = a.startTime.split(":").map(Number);
              const timeB = b.startTime.split(":").map(Number);
              if (timeA[0] !== timeB[0])
                return timeA[0] - timeB[0];
              return timeA[1] - timeB[1];
            });
            const firstSlot = sortedSlots[0];
            const lastSlot = sortedSlots[sortedSlots.length - 1];
            bookingSuccessData.startTime = firstSlot.startTime;
            bookingSuccessData.start_time = firstSlot.startTime;
            bookingSuccessData.bookingStartTime = firstSlot.startTime;
            bookingSuccessData.endTime = lastSlot.endTime;
            bookingSuccessData.end_time = lastSlot.endTime;
            bookingSuccessData.bookingEndTime = lastSlot.endTime;
            bookingSuccessData.timeSlotIds = sortedSlots.map((slot) => slot.id);
            bookingSuccessData.time_slot_ids = sortedSlots.map((slot) => slot.id);
            bookingSuccessData.slotIds = sortedSlots.map((slot) => slot.id);
            if (sortedSlots.length === 1) {
              bookingSuccessData.timeSlotId = sortedSlots[0].id;
              bookingSuccessData.time_slot_id = sortedSlots[0].id;
              bookingSuccessData.slotId = sortedSlots[0].id;
            }
          } else if (this.selectedSlot) {
            bookingSuccessData.startTime = this.selectedSlot.startTime;
            bookingSuccessData.start_time = this.selectedSlot.startTime;
            bookingSuccessData.bookingStartTime = this.selectedSlot.startTime;
            bookingSuccessData.endTime = this.selectedSlot.endTime;
            bookingSuccessData.end_time = this.selectedSlot.endTime;
            bookingSuccessData.bookingEndTime = this.selectedSlot.endTime;
            bookingSuccessData.timeSlotId = this.selectedSlot.id;
            bookingSuccessData.time_slot_id = this.selectedSlot.id;
            bookingSuccessData.slotId = this.selectedSlot.id;
            bookingSuccessData.timeSlotIds = [this.selectedSlot.id];
            bookingSuccessData.time_slot_ids = [this.selectedSlot.id];
            bookingSuccessData.slotIds = [this.selectedSlot.id];
          }
          if (result && result.data) {
            bookingSuccessData.bookingId = result.data.id || result.data.bookingId;
            bookingSuccessData.booking_id = result.data.id || result.data.bookingId;
          }
          await this.venueStore.onBookingSuccess(bookingSuccessData);
          this.selectedSlots = [];
          this.selectedSlot = null;
          this.$forceUpdate();
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/booking/create.vue:1380", "❌ 时间段同步修复失败:", error);
          this.selectedSlots = [];
          this.selectedSlot = null;
          this.$forceUpdate();
        }
        common_vendor.index.hideLoading();
        try {
          const bookingStore = this.bookingStore || stores_booking.useBookingStore();
          if (bookingStore && typeof bookingStore.clearCache === "function") {
            bookingStore.clearCache("bookingList");
          }
        } catch (error) {
        }
        try {
          common_vendor.index.$emit("bookingCreated", {
            type: "booking-created",
            bookingId: (_l = result == null ? void 0 : result.data) == null ? void 0 : _l.id,
            timestamp: Date.now()
          });
        } catch (error) {
        }
        this.$showUserFeedback("success", "预约创建成功！正在跳转到支付页面...", {
          duration: 2e3,
          vibrate: true
        });
        let orderId = null;
        if (!result) {
          common_vendor.index.__f__("error", "at pages/booking/create.vue:1422", "❌ 预约创建结果为空");
        } else {
          if (result.id) {
            orderId = result.id;
          } else if (result.orderId) {
            orderId = result.orderId;
          } else if (result.data && result.data.id) {
            orderId = result.data.id;
          } else if (result.data && result.data.orderId) {
            orderId = result.data.orderId;
          } else if (typeof result === "number") {
            orderId = result;
          }
        }
        if (orderId && (typeof orderId === "number" || typeof orderId === "string")) {
          common_vendor.index.redirectTo({
            url: `/pages/payment/index?orderId=${orderId}&type=booking&from=create`,
            success: () => {
            },
            fail: (error) => {
              common_vendor.index.__f__("error", "at pages/booking/create.vue:1448", "❌ 跳转支付页面失败:", error);
              common_vendor.index.navigateTo({
                url: `/pages/payment/index?orderId=${orderId}&type=booking&from=create`
              });
            }
          });
        } else {
          common_vendor.index.__f__("error", "at pages/booking/create.vue:1456", "❌ 无法获取有效的订单ID，跳转到预约列表");
          common_vendor.index.__f__("error", "at pages/booking/create.vue:1457", "❌ 原始结果:", result);
          this.$showUserFeedback("confirm", '预约创建成功，但无法获取订单信息。请到"我的预约"中查看。', {
            confirmText: "查看预约",
            cancelText: "稍后查看",
            onConfirm: () => {
              common_vendor.index.redirectTo({
                url: "/pages/booking/list"
              });
            }
          });
        }
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/booking/create.vue:1473", "创建预约失败:", error);
        const errorMessage = error.message || "创建预约失败，请稍后重试";
        this.showUserFeedback("error", errorMessage, {
          duration: 3e3,
          vibrate: true,
          showModal: errorMessage.length > 20
        });
        this.recordPerformanceMetric("booking-creation-error", {
          error: error.message || "unknown",
          timestamp: Date.now()
        });
      } finally {
        this.isConfirmingBooking = false;
      }
    },
    // 验证表单
    validateForm() {
      try {
        this.recordPerformanceMetric("form-validation-start", {
          bookingType: this.bookingForm.bookingType,
          hasSelectedSlots: !!(this.selectedSlots && this.selectedSlots.length > 0),
          hasSelectedSlot: !!this.selectedSlot
        });
        if (!this.bookingForm.bookingType) {
          this.recordPerformanceMetric("form-validation-error", {
            field: "bookingType",
            error: "missing"
          });
          this.$showUserFeedback("error", "请选择预约类型");
          return false;
        }
        const hasTimeSlots = this.selectedSlots && this.selectedSlots.length > 0 || this.selectedSlot;
        if (!hasTimeSlots) {
          this.recordPerformanceMetric("form-validation-error", {
            field: "timeSlots",
            error: "missing"
          });
          this.showUserFeedback("error", "请选择预约时间段");
          return false;
        }
        if (!this.venueId || !this.venue) {
          this.recordPerformanceMetric("form-validation-error", {
            field: "venue",
            error: "missing"
          });
          this.$showUserFeedback("error", "场馆信息缺失，请重新选择");
          return false;
        }
        if (!this.selectedDate) {
          this.recordPerformanceMetric("form-validation-error", {
            field: "date",
            error: "missing"
          });
          this.$showUserFeedback("error", "请选择预约日期");
          return false;
        }
        if (this.bookingForm.bookingType === "SHARED") {
          if (!this.bookingForm.teamName || !this.bookingForm.teamName.trim()) {
            this.recordPerformanceMetric("form-validation-error", {
              field: "teamName",
              error: "empty",
              bookingType: "SHARED"
            });
            this.$showUserFeedback("error", "请输入队伍名称");
            return false;
          }
          if (!this.bookingForm.contactInfo || !this.bookingForm.contactInfo.trim()) {
            this.recordPerformanceMetric("form-validation-error", {
              field: "contactInfo",
              error: "empty",
              bookingType: "SHARED"
            });
            this.$showUserFeedback("error", "请输入联系方式");
            return false;
          }
          const contactInfo = this.bookingForm.contactInfo.trim();
          const phoneRegex = /^1[3-9]\d{9}$/;
          const wechatRegex = /^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/;
          if (!phoneRegex.test(contactInfo) && !wechatRegex.test(contactInfo)) {
            this.recordPerformanceMetric("form-validation-error", {
              field: "contactInfo",
              error: "invalid_format",
              bookingType: "SHARED"
            });
            this.showUserFeedback("error", "请输入有效的手机号或微信号");
            return false;
          }
          if (this.bookingForm.teamName.trim().length > 20) {
            this.recordPerformanceMetric("form-validation-error", {
              field: "teamName",
              error: "too_long",
              bookingType: "SHARED"
            });
            this.showUserFeedback("error", "队伍名称不能超过20个字符");
            return false;
          }
        }
        if (this.bookingForm.description && this.bookingForm.description.length > 200) {
          this.recordPerformanceMetric("form-validation-error", {
            field: "description",
            error: "too_long"
          });
          this.showUserFeedback("error", "预约描述不能超过200个字符");
          return false;
        }
        if (this.selectedSlots && this.selectedSlots.length > 0) {
          const unavailableSlots = this.selectedSlots.filter((slot) => slot.status !== "AVAILABLE");
          if (unavailableSlots.length > 0) {
            this.recordPerformanceMetric("form-validation-error", {
              field: "slotStatus",
              error: "unavailable",
              unavailableCount: unavailableSlots.length
            });
            const errorMessage = unavailableSlots.length === 1 ? `时间段 ${unavailableSlots[0].startTime}-${unavailableSlots[0].endTime} 已不可用，请重新选择` : `有 ${unavailableSlots.length} 个时间段已不可用，请重新选择`;
            this.showUserFeedback("error", errorMessage, {
              showModal: true,
              vibrate: true,
              confirmText: "重新选择",
              onConfirm: () => {
                this.loadTimeSlots();
                this.$nextTick(() => {
                  common_vendor.index.pageScrollTo({
                    selector: ".time-slots-container",
                    duration: 300
                  });
                });
              }
            });
            return false;
          }
        } else if (this.selectedSlot && this.selectedSlot.status !== "AVAILABLE") {
          this.recordPerformanceMetric("form-validation-error", {
            field: "slotStatus",
            error: "unavailable",
            slotId: this.selectedSlot.id
          });
          const errorMessage = `时间段 ${this.selectedSlot.startTime}-${this.selectedSlot.endTime} 已不可用，请重新选择`;
          this.showUserFeedback("error", errorMessage, {
            showModal: true,
            vibrate: true,
            confirmText: "重新选择",
            onConfirm: () => {
              this.loadTimeSlots();
              this.$nextTick(() => {
                common_vendor.index.pageScrollTo({
                  selector: ".time-slots-container",
                  duration: 300
                });
              });
            }
          });
          return false;
        }
        this.recordPerformanceMetric("form-validation-success", {
          bookingType: this.bookingForm.bookingType,
          slotsCount: this.selectedSlots ? this.selectedSlots.length : this.selectedSlot ? 1 : 0,
          hasDescription: !!this.bookingForm.description
        });
        return true;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:1698", "[BookingCreate] ❌ 表单验证异常:", error);
        this.recordPerformanceMetric("form-validation-exception", {
          error: error.message,
          stack: error.stack
        });
        this.showUserFeedback("error", "表单验证失败，请检查输入信息");
        return false;
      }
    },
    // 🗜️ 数据压缩方法
    compressBookingData() {
      try {
        const baseData = {
          venueId: parseInt(this.venueId),
          date: this.selectedDate,
          bookingType: this.bookingForm.bookingType,
          description: this.bookingForm.description || ""
        };
        if (this.selectedSlots && this.selectedSlots.length > 0) {
          const sortedSlots = [...this.selectedSlots].sort((a, b) => {
            const timeA = a.startTime.split(":").map(Number);
            const timeB = b.startTime.split(":").map(Number);
            if (timeA[0] !== timeB[0])
              return timeA[0] - timeB[0];
            return timeA[1] - timeB[1];
          });
          baseData.startTime = sortedSlots[0].startTime;
          baseData.endTime = sortedSlots[sortedSlots.length - 1].endTime;
          baseData.slotIds = sortedSlots.map((slot) => slot.id);
        } else if (this.selectedSlot) {
          baseData.startTime = this.selectedSlot.startTime;
          baseData.endTime = this.selectedSlot.endTime;
          baseData.slotId = this.selectedSlot.id;
        }
        if (this.bookingForm.bookingType === "SHARED") {
          baseData.teamName = this.bookingForm.teamName;
          baseData.contactInfo = this.bookingForm.contactInfo;
          baseData.maxParticipants = 2;
        }
        const compressedData = {};
        Object.keys(baseData).forEach((key) => {
          const value = baseData[key];
          if (value !== null && value !== void 0 && value !== "") {
            compressedData[key] = value;
          }
        });
        return compressedData;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:1757", "[BookingCreate] ❌ 数据压缩失败:", error);
        return {};
      }
    },
    // 返回
    goBack() {
      common_vendor.index.navigateBack();
    },
    async validateSelectedSlotsAfterUpdate(latestSlots) {
      if (!this.selectedSlots || this.selectedSlots.length === 0) {
        return;
      }
      if (!latestSlots) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:1775", "[BookingCreate] ❌ validateSelectedSlotsAfterUpdate 调用时未提供 latestSlots");
        return;
      }
      const unavailableSlots = [];
      for (const selectedSlot of this.selectedSlots) {
        const latestSlot = latestSlots.find((s) => s.id.toString() === selectedSlot.id.toString());
        if (!latestSlot) {
          const analysisResult = {
            selectedSlot,
            searchId: selectedSlot.id,
            searchTime: `${selectedSlot.startTime}-${selectedSlot.endTime}`,
            totalAvailableSlots: latestSlots.length,
            availableIds: latestSlots.map((s) => s.id),
            availableTimes: latestSlots.map((s) => `${s.startTime}-${s.endTime}`),
            possibleMatches: [],
            analysisDetails: {
              hasId: !!selectedSlot.id,
              hasTime: !!(selectedSlot.startTime && selectedSlot.endTime),
              idExistsInApi: selectedSlot.id ? latestSlots.some((s) => s.id && s.id.toString() === selectedSlot.id.toString()) : false,
              timeExistsInApi: selectedSlot.startTime && selectedSlot.endTime ? latestSlots.some((s) => s.startTime === selectedSlot.startTime && s.endTime === selectedSlot.endTime) : false
            }
          };
          if (selectedSlot.startTime && selectedSlot.endTime) {
            const similarSlots = latestSlots.filter((slot) => {
              const startMatch = slot.startTime && slot.startTime.includes(selectedSlot.startTime.split(":")[0]);
              const endMatch = slot.endTime && slot.endTime.includes(selectedSlot.endTime.split(":")[0]);
              return startMatch || endMatch;
            });
            analysisResult.possibleMatches = similarSlots.map((s) => ({
              id: s.id,
              time: `${s.startTime}-${s.endTime}`,
              status: s.status
            }));
          }
          let suggestedSlot = null;
          if (selectedSlot.startTime && latestSlots.length > 0) {
            const targetHour = parseInt(selectedSlot.startTime.split(":")[0]);
            suggestedSlot = latestSlots.filter((s) => s.status === "AVAILABLE").sort((a, b) => {
              const aHour = parseInt(a.startTime.split(":")[0]);
              const bHour = parseInt(b.startTime.split(":")[0]);
              return Math.abs(aHour - targetHour) - Math.abs(bHour - targetHour);
            })[0];
          }
          unavailableSlots.push({
            ...selectedSlot,
            reason: "时间段不存在",
            newStatus: "NOT_FOUND",
            analysis: analysisResult,
            suggestedAlternative: suggestedSlot
          });
        } else if (latestSlot.status !== "AVAILABLE") {
          const statusChangeTime = /* @__PURE__ */ new Date();
          ({
            date: this.selectedDate,
            startTime: latestSlot.startTime,
            endTime: latestSlot.endTime,
            timeRange: `${latestSlot.startTime}-${latestSlot.endTime}`
          });
          let slotStartDateTime = null;
          let slotEndDateTime = null;
          let shouldBeExpired = false;
          const currentDateStr = statusChangeTime.toISOString().split("T")[0];
          const isToday = this.selectedDate === currentDateStr;
          const isFutureDate = this.selectedDate > currentDateStr;
          try {
            const [startHour, startMinute] = latestSlot.startTime.split(":").map(Number);
            const [endHour, endMinute] = latestSlot.endTime.split(":").map(Number);
            const [year, month, day] = this.selectedDate.split("-").map(Number);
            slotStartDateTime = /* @__PURE__ */ new Date();
            slotEndDateTime = /* @__PURE__ */ new Date();
            slotStartDateTime.setFullYear(year, month - 1, day);
            slotStartDateTime.setHours(startHour, startMinute, 0, 0);
            slotEndDateTime.setFullYear(year, month - 1, day);
            slotEndDateTime.setHours(endHour, endMinute, 0, 0);
            shouldBeExpired = statusChangeTime > slotEndDateTime;
            if (isFutureDate) {
              shouldBeExpired = false;
            }
          } catch (timeError) {
            common_vendor.index.__f__("error", "at pages/booking/create.vue:1882", "[BookingCreate] ❌ 时间计算错误:", timeError);
          }
          if (isFutureDate && latestSlot.status === "EXPIRED") {
            common_vendor.index.__f__("error", "at pages/booking/create.vue:1887", "[BookingCreate] 🚨 强制修正未来日期的错误EXPIRED状态:", {
              slotId: latestSlot.id,
              timeRange: `${latestSlot.startTime}-${latestSlot.endTime}`,
              selectedDate: this.selectedDate,
              currentDate: currentDateStr
            });
            continue;
          }
          if (isToday && latestSlot.status === "EXPIRED" && !shouldBeExpired) {
            continue;
          }
          if (latestSlot.status !== "AVAILABLE") {
            unavailableSlots.push({
              ...latestSlot,
              reason: latestSlot.status === "BOOKED" ? "已被预约" : latestSlot.status === "MAINTENANCE" ? "维护中" : latestSlot.status === "EXPIRED" ? "已过期" : "不可用",
              newStatus: latestSlot.status
            });
          }
        }
      }
      this.showUserFeedback("hide-loading");
      if (unavailableSlots.length > 0) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:1920", "[BookingCreate] ❌ 发现不可用时间段:", unavailableSlots.map((slot) => ({
          id: slot.id,
          timeRange: `${slot.startTime}-${slot.endTime}`,
          reason: slot.reason,
          status: slot.newStatus
        })));
        common_vendor.index.__f__("error", "at pages/booking/create.vue:1928", "[BookingCreate] 🚨 关键问题分析:", {
          selectedDate: this.selectedDate,
          currentDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          isToday: this.selectedDate === (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          isTomorrow: this.selectedDate === new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
          unavailableSlots: unavailableSlots.map((s) => s.timeRange)
        });
        this.recordPerformanceMetric("realtime-validation-failed", {
          unavailableCount: unavailableSlots.length,
          reasons: unavailableSlots.map((slot) => slot.reason),
          statuses: unavailableSlots.map((slot) => slot.newStatus)
        });
        try {
          this.venueStore.updateTimeSlotsStatus(this.venueId, this.selectedDate, latestSlots);
        } catch (updateError) {
        }
        this.clearUnavailableSelections(unavailableSlots);
        const errorDetails = this.generateValidationErrorMessage(unavailableSlots);
        this.$showUserFeedback("error", errorDetails, {
          useModal: true,
          confirmText: "重新选择",
          onConfirm: () => {
            this.$emit("refresh-timeslots");
            this.$nextTick(() => {
              common_vendor.index.pageScrollTo({
                selector: ".time-slots-container",
                duration: 300
              });
            });
          }
        });
        this.$emit("refresh-timeslots");
        return false;
      }
      this.recordPerformanceMetric("realtime-validation-success");
      return true;
    },
    // 🎧 设置事件监听器
    setupEventListeners() {
      if (typeof common_vendor.index !== "undefined" && common_vendor.index.$on) {
        common_vendor.index.$on("timeslots-status-updated", this.handleTimeSlotsStatusUpdated);
        common_vendor.index.$on("timeslots-refreshed", this.handleTimeSlotsRefreshed);
        common_vendor.index.$on("booking-status-changed", this.handleBookingStatusChanged);
        common_vendor.index.$on("orderCancelled", this.handleOrderCancelled);
        common_vendor.index.$on("timeslot-updated", this.handleTimeslotUpdated);
        common_vendor.index.$on("force-refresh-timeslots", this.handleForceRefreshTimeslots);
      }
    },
    // 🎧 移除事件监听器
    removeEventListeners() {
      if (typeof common_vendor.index !== "undefined" && common_vendor.index.$off) {
        common_vendor.index.$off("timeslots-status-updated", this.handleTimeSlotsStatusUpdated);
        common_vendor.index.$off("timeslots-refreshed", this.handleTimeSlotsRefreshed);
        common_vendor.index.$off("booking-status-changed", this.handleBookingStatusChanged);
        common_vendor.index.$off("orderCancelled", this.handleOrderCancelled);
        common_vendor.index.$off("timeslot-updated", this.handleTimeslotUpdated);
        common_vendor.index.$off("force-refresh-timeslots", this.handleForceRefreshTimeslots);
      }
    },
    // 🔄 处理时间段状态更新事件
    handleTimeSlotsStatusUpdated(eventData) {
      var _a;
      try {
        if (eventData.venueId === this.venueId && eventData.date === this.selectedDate) {
          this.validateSelectedSlotsAfterUpdate(eventData.timeSlots);
          this.recordPerformanceMetric("timeslots-auto-updated", {
            source: eventData.source || "unknown",
            slotsCount: ((_a = eventData.timeSlots) == null ? void 0 : _a.length) || 0
          });
          this.showUserFeedback("success", "时间段状态已更新", { duration: 2e3 });
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:2032", "[BookingCreate] ❌ 处理时间段状态更新失败:", error);
      }
    },
    // 🔄 处理时间段刷新事件
    handleTimeSlotsRefreshed(eventData) {
      try {
        if (eventData.venueId === this.venueId && eventData.date === this.selectedDate) {
          this.validateSelectedSlotsAfterUpdate(eventData.timeSlots);
          this.recordPerformanceMetric("timeslots-refreshed", {
            trigger: eventData.trigger || "unknown"
          });
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:2050", "[BookingCreate] ❌ 处理时间段刷新失败:", error);
      }
    },
    // 🔄 处理预约状态变更事件
    handleBookingStatusChanged(eventData) {
      try {
        if (eventData.venueId === this.venueId && eventData.date === this.selectedDate) {
          const { status } = eventData;
          if (status === "CANCELLED" || status === "PAYMENT_FAILED") {
            this.refreshTimeSlotStatusSafe(true);
          } else {
            this.refreshTimeSlotStatusSafe();
          }
          this.recordPerformanceMetric("booking-status-changed", {
            bookingId: eventData.bookingId,
            status: eventData.status
          });
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:2074", "[BookingCreate] ❌ 处理预约状态变更失败:", error);
      }
    },
    // 🔄 处理订单取消事件
    handleOrderCancelled(eventData) {
      try {
        this.selectedSlots = [];
        this.selectedSlot = null;
        this.refreshTimeSlotStatusSafe(true);
        setTimeout(() => {
          this.refreshTimeSlotStatusSafe(true);
        }, 500);
        this.recordPerformanceMetric("order-cancelled", {
          orderId: eventData.orderId,
          type: eventData.type
        });
        this.$showUserFeedback("info", "时间段已释放，可重新预约", {
          duration: 2500
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:2106", "[BookingCreate] ❌ 处理订单取消事件失败:", error);
      }
    },
    // 🔄 处理时间段更新事件
    handleTimeslotUpdated(eventData) {
      try {
        if (eventData.venueId == this.venueId && eventData.date === this.selectedDate) {
          if (eventData.immediate || eventData.action === "booking-cancelled-immediate") {
            if (eventData.startTime && eventData.endTime) {
              this.useUnifiedTimeSlotManager(eventData);
            }
            this.refreshTimeSlotStatusSafe(true);
            setTimeout(() => {
              this.refreshTimeSlotStatusSafe(true);
            }, 500);
          } else if (eventData.action === "booking-cancelled" && eventData.bookingType === "SHARED") {
            if (eventData.startTime && eventData.endTime) {
              this.useUnifiedTimeSlotManager(eventData);
            }
            this.refreshTimeSlotStatusSafe(true);
            setTimeout(() => {
              this.refreshTimeSlotStatusSafe(true);
            }, 500);
            setTimeout(() => {
              this.refreshTimeSlotStatusSafe(true);
            }, 1500);
          } else {
            this.refreshTimeSlotStatusSafe();
          }
          this.recordPerformanceMetric("timeslot-updated", {
            action: eventData.action,
            slotIds: eventData.slotIds,
            bookingType: eventData.bookingType
          });
          if (eventData.action === "booking-cancelled") {
            const message = eventData.bookingType === "SHARED" ? "拼场订单已取消，时间段状态已更新" : "预约已取消，时间段状态已更新";
            this.showUserFeedback("info", message, {
              duration: 2e3
            });
          }
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:2177", "[BookingCreate] ❌ 处理时间段更新事件失败:", error);
      }
    },
    // 🎯 使用统一时间段管理器立即释放时间段
    async useUnifiedTimeSlotManager(eventData) {
      try {
        const { default: unifiedTimeSlotManager } = await "../../utils/unified-timeslot-manager.js";
        if (unifiedTimeSlotManager && typeof unifiedTimeSlotManager.immediateReleaseTimeSlots === "function") {
          await unifiedTimeSlotManager.immediateReleaseTimeSlots(
            eventData.venueId,
            eventData.date,
            eventData.startTime,
            eventData.endTime,
            eventData.bookingType || "EXCLUSIVE"
          );
        } else {
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:2200", "[BookingCreate] 使用统一时间段管理器失败:", error);
      }
    },
    // 🚨 处理强制刷新时间段事件
    handleForceRefreshTimeslots(eventData) {
      try {
        if (eventData.venueId == this.venueId && eventData.date === this.selectedDate) {
          this.refreshTimeSlotStatusSafe(true);
          setTimeout(() => {
            this.refreshTimeSlotStatusSafe(true);
          }, 200);
          setTimeout(() => {
            this.refreshTimeSlotStatusSafe(true);
          }, 800);
          this.recordPerformanceMetric("force-refresh-timeslots", {
            reason: eventData.reason,
            venueId: eventData.venueId,
            date: eventData.date
          });
          this.showUserFeedback("info", "时间段状态已强制更新", {
            duration: 2e3
          });
        } else {
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:2238", "[BookingCreate] ❌ 处理强制刷新时间段事件失败:", error);
      }
    },
    // ✅ 验证更新后的选中时间段
    validateSelectedSlotsAfterUpdate(latestSlots) {
      try {
        if (!latestSlots || !Array.isArray(latestSlots)) {
          return;
        }
        const selectedSlots = this.isMultiSlot ? this.selectedSlots : [this.selectedSlot];
        if (!selectedSlots || selectedSlots.length === 0) {
          return;
        }
        const invalidSlots = [];
        for (const selectedSlot of selectedSlots) {
          if (!selectedSlot)
            continue;
          const latestSlot = latestSlots.find(
            (slot) => slot.id === selectedSlot.id || slot.startTime === selectedSlot.startTime && slot.endTime === selectedSlot.endTime
          );
          if (!latestSlot || latestSlot.status !== "AVAILABLE") {
            invalidSlots.push({
              ...selectedSlot,
              newStatus: (latestSlot == null ? void 0 : latestSlot.status) || "NOT_FOUND",
              reason: !latestSlot ? "时间段已删除" : latestSlot.status === "BOOKED" ? "已被其他用户预约" : latestSlot.status === "MAINTENANCE" ? "进入维护状态" : "状态异常"
            });
          }
        }
        if (invalidSlots.length > 0) {
          if (this.isMultiSlot) {
            this.selectedSlots = this.selectedSlots.filter(
              (slot) => !invalidSlots.some((invalid) => invalid.id === slot.id)
            );
          } else {
            const isCurrentSlotInvalid = invalidSlots.some(
              (invalid) => {
                var _a;
                return invalid.id === ((_a = this.selectedSlot) == null ? void 0 : _a.id);
              }
            );
            if (isCurrentSlotInvalid) {
              this.selectedSlot = null;
            }
          }
          const message = invalidSlots.length === 1 ? `时间段${invalidSlots[0].startTime}-${invalidSlots[0].endTime}${invalidSlots[0].reason}，请重新选择` : `有${invalidSlots.length}个时间段状态已变更，请重新选择`;
          this.$showUserFeedback("warning", message, { duration: 4e3 });
          this.recordPerformanceMetric("selected-slots-invalidated", {
            invalidCount: invalidSlots.length,
            reasons: invalidSlots.map((slot) => slot.reason)
          });
        } else {
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:2309", "[BookingCreate] ❌ 验证选中时间段失败:", error);
      }
    },
    // 🎯 显示预约确认对话框
    async showConfirmationDialog() {
      try {
        if (this.showConfirmDialog) {
          return false;
        }
        const confirmInfo = this.buildConfirmationInfo();
        this.confirmDialogData = confirmInfo;
        this.showConfirmDialog = true;
        const result = await new Promise((resolve) => {
          this.confirmDialogResolve = resolve;
        });
        return result;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:2335", "[BookingCreate] ❌ 显示确认对话框异常:", error);
        this.showConfirmDialog = false;
        this.confirmDialogData = null;
        this.confirmDialogResolve = null;
        return false;
      }
    },
    // 🏗️ 构建确认信息
    buildConfirmationInfo() {
      var _a;
      try {
        const venue = this.venue || {};
        const isShared = this.bookingForm.bookingType === "SHARED";
        const isMulti = this.isMultiSlot;
        let timeInfo = "";
        let timeDetails = [];
        let totalPrice = 0;
        let actualPrice = 0;
        if (isMulti && ((_a = this.selectedSlots) == null ? void 0 : _a.length) > 0) {
          const sortedSlots = [...this.selectedSlots].sort((a, b) => {
            const timeA = a.startTime.split(":").map(Number);
            const timeB = b.startTime.split(":").map(Number);
            return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
          });
          timeDetails = sortedSlots.map((slot) => `${slot.startTime}-${slot.endTime}`);
          const firstSlot = sortedSlots[0];
          const lastSlot = sortedSlots[sortedSlots.length - 1];
          timeInfo = `${this.selectedDate} ${firstSlot.startTime}-${lastSlot.endTime}`;
          totalPrice = this.totalCost;
          actualPrice = isShared ? totalPrice / 2 : totalPrice;
        } else if (this.selectedSlot) {
          timeDetails = [`${this.selectedSlot.startTime}-${this.selectedSlot.endTime}`];
          timeInfo = `${this.selectedDate} ${timeDetails[0]}`;
          totalPrice = this.totalCost;
          actualPrice = isShared ? totalPrice / 2 : totalPrice;
        }
        totalPrice = parseFloat(totalPrice.toFixed(2));
        actualPrice = parseFloat(actualPrice.toFixed(2));
        const result = {
          venueName: venue.name || "未知场馆",
          timeInfo,
          timeDetails,
          bookingType: isShared ? "拼场预约" : "包场预约",
          totalPrice,
          actualPrice,
          isShared,
          teamName: this.bookingForm.teamName,
          contactInfo: this.bookingForm.contactInfo,
          description: this.bookingForm.description
        };
        return result;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:2405", "[BookingCreate] ❌ 构建确认信息失败:", error);
        return {
          venueName: "未知场馆",
          timeInfo: "",
          timeDetails: [],
          bookingType: "包场预约",
          totalPrice: 0,
          actualPrice: 0,
          isShared: false,
          teamName: "",
          contactInfo: "",
          description: ""
        };
      }
    },
    // 🎯 取消确认弹窗
    cancelConfirmDialog() {
      try {
        if (this.confirmDialogResolve) {
          this.confirmDialogResolve(false);
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:2428", "[BookingCreate] ❌ 取消确认弹窗异常:", error);
      } finally {
        this.showConfirmDialog = false;
        this.confirmDialogData = null;
        this.confirmDialogResolve = null;
      }
    },
    // 🎯 确认弹窗操作
    confirmDialogAction() {
      try {
        if (this.confirmDialogResolve) {
          this.confirmDialogResolve(true);
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:2444", "[BookingCreate] ❌ 确认弹窗操作异常:", error);
      } finally {
        this.showConfirmDialog = false;
        this.confirmDialogData = null;
        this.confirmDialogResolve = null;
      }
    },
    // 📊 性能监控方法
    recordPerformanceMetric(metricName, metricData = {}) {
      try {
        const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      } catch (error) {
      }
    },
    // 🔄 安全的刷新时间段状态方法
    async refreshTimeSlotStatusSafe(force = false) {
      try {
        await this.refreshTimeSlotStatus(force);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:2470", "[BookingCreate] ❌ 刷新时间段状态失败:", error);
      }
    },
    // 🎯 用户反馈方法
    showUserFeedback(type, message, options = {}) {
      try {
        switch (type) {
          case "success":
            common_vendor.index.showToast({
              title: message,
              icon: "success",
              duration: options.duration || 2e3
            });
            break;
          case "error":
            if (options.showModal || options.useModal) {
              common_vendor.index.showModal({
                title: "错误",
                content: message,
                showCancel: false,
                confirmText: options.confirmText || "确定",
                success: (res) => {
                  if (res.confirm && options.onConfirm) {
                    options.onConfirm();
                  }
                }
              });
            } else {
              common_vendor.index.showToast({
                title: message,
                icon: "none",
                duration: options.duration || 3e3
              });
            }
            break;
          case "warning":
            common_vendor.index.showToast({
              title: message,
              icon: "none",
              duration: options.duration || 3e3
            });
            break;
          case "info":
            common_vendor.index.showToast({
              title: message,
              icon: "none",
              duration: options.duration || 2e3
            });
            break;
          case "confirm":
            common_vendor.index.showModal({
              title: "提示",
              content: message,
              confirmText: options.confirmText || "确定",
              cancelText: options.cancelText || "取消",
              success: (res) => {
                if (res.confirm && options.onConfirm) {
                  options.onConfirm();
                } else if (res.cancel && options.onCancel) {
                  options.onCancel();
                }
              }
            });
            break;
          case "hide-loading":
            common_vendor.index.hideLoading();
            break;
          default:
            common_vendor.index.showToast({
              title: message,
              icon: "none",
              duration: options.duration || 2e3
            });
        }
        if (options.vibrate) {
          common_vendor.index.vibrateShort();
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/create.vue:2560", "[BookingCreate] ❌ 显示用户反馈失败:", error);
        try {
          common_vendor.index.showToast({
            title: message,
            icon: "none",
            duration: 2e3
          });
        } catch (e) {
          common_vendor.index.__f__("error", "at pages/booking/create.vue:2569", "[BookingCreate] ❌ 降级提示也失败:", e);
        }
      }
    }
  },
  watch: {
    // 移除了showTimeSelector的watch监听器，因为该变量未在data中定义
    // 这可能是导致弹窗自动打开的原因
  },
  mounted() {
    this.showConfirmDialog = false;
    this.confirmDialogData = null;
    this.confirmDialogResolve = null;
    this.venueStore = stores_venue.useVenueStore();
    this.bookingStore = stores_booking.useBookingStore();
    this.userStore = stores_user.useUserStore();
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    this.venueId = currentPage.options.id || currentPage.options.venueId;
    if (!this.venueId) {
      common_vendor.index.__f__("error", "at pages/booking/create.vue:2597", "未获取到场馆ID");
      common_vendor.index.showToast({
        title: "参数错误",
        icon: "error"
      });
      return;
    }
    this.selectedDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    this.loadVenueDetail();
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t;
  return common_vendor.e({
    a: $options.venue
  }, $options.venue ? {
    b: $options.venue.image || "https://via.placeholder.com/400x200?text=场馆图片",
    c: common_vendor.t($options.venue.name),
    d: common_vendor.t($options.venue.location),
    e: common_vendor.t($options.venue.price)
  } : {}, {
    f: common_vendor.t($data.bookingForm.bookingType === "EXCLUSIVE" ? "独享预约" : "拼场预约"),
    g: $options.venue && $options.venue.supportSharing && $data.bookingForm.bookingType === "SHARED"
  }, $options.venue && $options.venue.supportSharing && $data.bookingForm.bookingType === "SHARED" ? {} : {}, {
    h: common_vendor.t($options.formatDateTime($data.selectedDate)),
    i: $data.bookingForm.bookingType === "SHARED"
  }, $data.bookingForm.bookingType === "SHARED" ? {
    j: $data.bookingForm.teamName,
    k: common_vendor.o(($event) => $data.bookingForm.teamName = $event.detail.value),
    l: $data.bookingForm.contactInfo,
    m: common_vendor.o(($event) => $data.bookingForm.contactInfo = $event.detail.value)
  } : {}, {
    n: common_vendor.t($data.bookingForm.bookingType === "SHARED" ? "拼场说明" : "备注信息"),
    o: $data.bookingForm.bookingType === "SHARED" ? "球队实力中等，出汗局" : "请输入备注信息（可选）",
    p: $data.bookingForm.description,
    q: common_vendor.o(($event) => $data.bookingForm.description = $event.detail.value),
    r: $data.selectedSlots && $data.selectedSlots.length > 0
  }, $data.selectedSlots && $data.selectedSlots.length > 0 ? {
    s: common_vendor.f($data.selectedSlots, (slot, index, i0) => {
      return {
        a: common_vendor.t(slot.startTime),
        b: common_vendor.t(slot.endTime),
        c: common_vendor.t($options.getSlotPrice(slot)),
        d: index
      };
    })
  } : $data.selectedSlot ? {
    v: common_vendor.t($data.selectedSlot.startTime),
    w: common_vendor.t($data.selectedSlot.endTime),
    x: common_vendor.t($options.getSlotPrice($data.selectedSlot))
  } : {
    y: common_vendor.t(((_a = $options.venue) == null ? void 0 : _a.price) || 0)
  }, {
    t: $data.selectedSlot,
    z: $data.bookingForm.bookingType === "SHARED"
  }, $data.bookingForm.bookingType === "SHARED" ? {
    A: common_vendor.t(($options.totalCost / 2).toFixed(2)),
    B: common_vendor.t($options.totalCost),
    C: common_vendor.t(($options.totalCost / 2).toFixed(2))
  } : {
    D: common_vendor.t($options.totalCost)
  }, {
    E: common_vendor.t($data.bookingForm.bookingType === "SHARED" ? "实付金额：" : "总费用："),
    F: common_vendor.t($data.bookingForm.bookingType === "SHARED" ? ($options.totalCost / 2).toFixed(2) : $options.totalCost.toFixed(2)),
    G: $data.bookingForm.bookingType === "SHARED" ? 1 : "",
    H: common_vendor.o((...args) => $options.goBack && $options.goBack(...args)),
    I: !$options.canConfirm,
    J: common_vendor.o((...args) => $options.confirmBooking && $options.confirmBooking(...args)),
    K: $data.showConfirmDialog
  }, $data.showConfirmDialog ? common_vendor.e({
    L: common_vendor.t((_b = $data.confirmDialogData) == null ? void 0 : _b.venueName),
    M: common_vendor.t((_c = $data.confirmDialogData) == null ? void 0 : _c.timeInfo),
    N: ((_e = (_d = $data.confirmDialogData) == null ? void 0 : _d.timeDetails) == null ? void 0 : _e.length) > 0
  }, ((_g = (_f = $data.confirmDialogData) == null ? void 0 : _f.timeDetails) == null ? void 0 : _g.length) > 0 ? {
    O: common_vendor.f($data.confirmDialogData.timeDetails, (detail, index, i0) => {
      return {
        a: common_vendor.t(detail),
        b: index
      };
    })
  } : {}, {
    P: common_vendor.t((_h = $data.confirmDialogData) == null ? void 0 : _h.bookingType),
    Q: (_i = $data.confirmDialogData) == null ? void 0 : _i.isShared
  }, ((_j = $data.confirmDialogData) == null ? void 0 : _j.isShared) ? {
    R: common_vendor.t((_k = $data.confirmDialogData) == null ? void 0 : _k.teamName),
    S: common_vendor.t((_l = $data.confirmDialogData) == null ? void 0 : _l.contactInfo)
  } : {}, {
    T: (_m = $data.confirmDialogData) == null ? void 0 : _m.description
  }, ((_n = $data.confirmDialogData) == null ? void 0 : _n.description) ? {
    U: common_vendor.t((_o = $data.confirmDialogData) == null ? void 0 : _o.description)
  } : {}, {
    V: common_vendor.t(((_p = $data.confirmDialogData) == null ? void 0 : _p.isShared) ? "实付金额：" : "总费用："),
    W: common_vendor.t((_q = $data.confirmDialogData) == null ? void 0 : _q.actualPrice),
    X: (_r = $data.confirmDialogData) == null ? void 0 : _r.isShared
  }, ((_s = $data.confirmDialogData) == null ? void 0 : _s.isShared) ? {
    Y: common_vendor.t((_t = $data.confirmDialogData) == null ? void 0 : _t.totalPrice)
  } : {}, {
    Z: common_vendor.o((...args) => $options.cancelConfirmDialog && $options.cancelConfirmDialog(...args)),
    aa: common_vendor.o((...args) => $options.confirmDialogAction && $options.confirmDialogAction(...args)),
    ab: common_vendor.o(() => {
    }),
    ac: common_vendor.o((...args) => $options.cancelConfirmDialog && $options.cancelConfirmDialog(...args))
  }) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-8ad5571f"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/booking/create.js.map
