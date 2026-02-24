"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("../common/vendor.js");
const api_venue = require("../api/venue.js");
const api_timeslot = require("../api/timeslot.js");
const utils_toast = require("../utils/toast.js");
const utils_timeslotConstants = require("../utils/timeslot-constants.js");
const useVenueStore = common_vendor.defineStore("venue", {
  state: () => ({
    venueList: [],
    popularVenues: [],
    venueDetail: null,
    venueTypes: [],
    timeSlots: [],
    selectedTimeSlots: [],
    searchResults: [],
    loading: false,
    error: null,
    pagination: {
      current: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1
    },
    currentVenueId: null,
    currentDate: null,
    // 简化的缓存机制
    cache: {
      timeSlots: /* @__PURE__ */ new Map(),
      // key: venueId_date, value: { data, timestamp }
      venues: /* @__PURE__ */ new Map(),
      details: /* @__PURE__ */ new Map()
    },
    cacheTimeout: 5 * 60 * 1e3
    // 5分钟TTL
  }),
  getters: {
    // 场馆列表相关 - 这些应该是getter，返回状态值
    venueListGetter: (state) => state.venueList,
    popularVenuesGetter: (state) => state.popularVenues,
    venueDetailGetter: (state) => state.venueDetail,
    venueTypesGetter: (state) => state.venueTypes,
    timeSlotsGetter: (state) => state.timeSlots,
    searchResultsGetter: (state) => state.searchResults,
    // 状态相关
    isLoading: (state) => state.loading,
    getPagination: (state) => state.pagination,
    // 计算属性
    totalVenues: (state) => state.venueList.length,
    hasMoreVenues: (state) => state.pagination.current < state.pagination.totalPages,
    // 按类型筛选场馆
    getVenuesByType: (state) => (typeId) => {
      if (!typeId)
        return state.venueList;
      return state.venueList.filter((venue) => venue.typeId === typeId);
    },
    // 获取可用时间段
    getAvailableTimeSlots: (state) => {
      return state.timeSlots.filter((slot) => slot.status === utils_timeslotConstants.SLOT_STATUS.AVAILABLE);
    },
    // 获取已占用时间段
    getOccupiedTimeSlots: (state) => {
      return state.timeSlots.filter((slot) => slot.status === utils_timeslotConstants.SLOT_STATUS.OCCUPIED);
    },
    // 获取过期时间段
    getExpiredTimeSlots: (state) => {
      return state.timeSlots.filter((slot) => slot.status === utils_timeslotConstants.SLOT_STATUS.EXPIRED);
    }
  },
  actions: {
    // 缓存辅助方法
    isCacheValid(timestamp) {
      return Date.now() - timestamp < this.cacheTimeout;
    },
    getCachedData(cacheMap, key) {
      const cached = cacheMap.get(key);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.data;
      }
      return null;
    },
    setCachedData(cacheMap, key, data) {
      cacheMap.set(key, {
        data,
        timestamp: Date.now()
      });
    },
    clearExpiredCache() {
      const now = Date.now();
      for (const [key, value] of this.cache.timeSlots.entries()) {
        if (now - value.timestamp >= this.cacheTimeout) {
          this.cache.timeSlots.delete(key);
        }
      }
      for (const [key, value] of this.cache.venues.entries()) {
        if (now - value.timestamp >= this.cacheTimeout) {
          this.cache.venues.delete(key);
        }
      }
      for (const [key, value] of this.cache.details.entries()) {
        if (now - value.timestamp >= this.cacheTimeout) {
          this.cache.details.delete(key);
        }
      }
    },
    // 🔥 修复：增强的订单过期监听器设置
    setupOrderExpiredListener() {
      if (typeof common_vendor.index === "undefined") {
        setTimeout(() => this.setupOrderExpiredListener(), 1e3);
        return;
      }
      if (!common_vendor.index.$on || !common_vendor.index.$off) {
        setTimeout(() => this.setupOrderExpiredListener(), 1e3);
        return;
      }
      try {
        common_vendor.index.$off("order-expired", this.onOrderExpired);
        const boundHandler = this.onOrderExpired.bind(this);
        common_vendor.index.$on("order-expired", boundHandler);
        this._orderExpiredHandler = boundHandler;
        this.setupAdditionalEventListeners();
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:145", "[VenueStore] ❌ 设置订单过期监听器失败:", error);
        setTimeout(() => this.setupOrderExpiredListener(), 2e3);
      }
    },
    // 🔥 新增：设置其他相关事件监听器
    setupAdditionalEventListeners() {
      try {
        common_vendor.index.$off("booking-success", this.onBookingSuccess);
        common_vendor.index.$on("booking-success", this.onBookingSuccess.bind(this));
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:159", "[VenueStore] ❌ 设置其他事件监听器失败:", error);
      }
    },
    // 🔥 新增：清理事件监听器
    cleanupEventListeners() {
      try {
        if (typeof common_vendor.index !== "undefined" && common_vendor.index.$off) {
          if (this._orderExpiredHandler) {
            common_vendor.index.$off("order-expired", this._orderExpiredHandler);
          }
          common_vendor.index.$off("booking-success", this.onBookingSuccess);
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:173", "[VenueStore] ❌ 清理事件监听器失败:", error);
      }
    },
    // 设置加载状态
    setLoading(loading) {
      this.loading = loading;
    },
    // 设置场馆列表
    setVenueList({ list, pagination }) {
      this.venueList = list;
      if (pagination) {
        this.pagination = { ...this.pagination, ...pagination };
      }
    },
    // 追加场馆列表（分页加载）
    appendVenueList(list) {
      this.venueList = [...this.venueList, ...list];
    },
    // 设置热门场馆
    setPopularVenues(venues) {
      this.popularVenues = venues;
    },
    // 设置场馆详情
    setVenueDetail(venue) {
      this.venueDetail = venue;
    },
    // 设置场馆类型
    setVenueTypes(types) {
      this.venueTypes = types;
    },
    // 设置时间段
    setTimeSlots(slots) {
      if (Array.isArray(slots)) {
        this.timeSlots = slots;
      } else {
        this.timeSlots = [];
      }
    },
    // 设置搜索结果
    setSearchResults(results) {
      this.searchResults = results;
    },
    // 设置分页信息
    setPagination(pagination) {
      this.pagination = { ...this.pagination, ...pagination };
    },
    // 获取场馆列表
    async getVenueList(params = {}) {
      try {
        this.setLoading(true);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("请求超时")), 1e4);
        });
        const apiPromise = api_venue.venueApi.getVenueList(params);
        const response = await Promise.race([apiPromise, timeoutPromise]);
        let list = [];
        let pagination = {
          current: 1,
          pageSize: 10,
          total: 0,
          totalPages: 1
        };
        if (response && response.data) {
          if (Array.isArray(response.data)) {
            list = response.data;
            pagination = {
              current: response.page || params.page || 1,
              pageSize: response.pageSize || params.pageSize || 10,
              total: response.total || response.data.length,
              totalPages: response.totalPages || 1
            };
          } else {
          }
        } else if (response && Array.isArray(response)) {
          list = response;
          pagination.total = response.length;
        } else {
        }
        if (params.page === 1 || params.refresh) {
          this.setVenueList({ list, pagination });
        } else {
          this.appendVenueList(list);
          this.setVenueList({ list: this.venueList, pagination });
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:283", "[VenueStore] 获取场馆列表失败:", error);
        utils_toast.showError(error.message || "获取场馆列表失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取热门场馆
    async getPopularVenues() {
      try {
        const response = await api_venue.venueApi.getPopularVenues();
        let venues = [];
        if (Array.isArray(response)) {
          venues = response;
        } else if (response && Array.isArray(response.data)) {
          venues = response.data;
        } else {
        }
        this.setPopularVenues(venues);
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:308", "[VenueStore] 获取热门场馆失败:", error);
        this.setPopularVenues([]);
        utils_toast.showError(error.message || "获取热门场馆失败");
        throw error;
      }
    },
    // 获取场馆详情
    async getVenueDetail(venueId) {
      try {
        this.setLoading(true);
        const response = await api_venue.venueApi.getVenueDetail(venueId);
        if (response && response.data) {
          this.setVenueDetail(response.data);
        } else if (response) {
          this.setVenueDetail(response);
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:331", "[VenueStore] 获取场馆详情失败:", error);
        utils_toast.showError(error.message || "获取场馆详情失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取场馆类型
    async getVenueTypes() {
      try {
        const response = await api_venue.venueApi.getVenueTypes();
        if (response && response.data) {
          this.setVenueTypes(response.data);
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:350", "[VenueStore] 获取场馆类型失败:", error);
        utils_toast.showError(error.message || "获取场馆类型失败");
        throw error;
      }
    },
    // 获取时间段 - 简化版
    async getTimeSlots(venueId, date, forceRefresh = false, loading = true) {
      try {
        if (loading) {
          this.setLoading(true);
        }
        const cacheKey = `${venueId}_${date}`;
        if (!forceRefresh) {
          const cachedData = this.getCachedData(this.cache.timeSlots, cacheKey);
          if (cachedData) {
            this.setTimeSlots(cachedData);
            this.currentVenueId = venueId;
            this.currentDate = date;
            return { data: cachedData, success: true };
          }
        }
        const apiOptions = { forceRefresh };
        if (forceRefresh) {
          apiOptions._t = Date.now();
        }
        const startTime = Date.now();
        const response = await api_timeslot.timeslotApi.getVenueTimeSlots(venueId, date, apiOptions);
        const endTime = Date.now();
        let timeSlots = [];
        if (response && response.success && Array.isArray(response.data)) {
          timeSlots = response.data;
        } else if (response && Array.isArray(response)) {
          timeSlots = response;
        }
        this.setCachedData(this.cache.timeSlots, cacheKey, timeSlots);
        this.setTimeSlots(timeSlots);
        this.currentVenueId = venueId;
        this.currentDate = date;
        return { data: timeSlots, success: true };
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:407", "[VenueStore] 获取时间段失败:", error);
        this.setTimeSlots([]);
        throw error;
      } finally {
        if (loading) {
          this.setLoading(false);
        }
      }
    },
    // 生成默认时间段（根据场馆营业时间，半小时间隔）
    generateDefaultTimeSlots(venueId, date) {
      const venue = this.venueDetail;
      if (!venue) {
        common_vendor.index.__f__("error", "at stores/venue.js:423", "[VenueStore] 场馆详情不存在，无法生成时间段");
        return;
      }
      const openTime = this.parseTimeString(venue.openTime || venue.open_time || "09:00");
      const closeTime = this.parseTimeString(venue.closeTime || venue.close_time || "22:00");
      const venueHourPrice = venue.price || 100;
      const venueHalfHourPrice = Math.round(venueHourPrice / 2);
      const defaultSlots = [];
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
        defaultSlots.push({
          id: `default_${venueId}_${date}_${currentHour}_${currentMinute}`,
          venueId: parseInt(venueId),
          date,
          startTime,
          endTime,
          price: venueHalfHourPrice,
          status: "AVAILABLE",
          isGenerated: true
          // 标记为前端生成
        });
        currentMinute = nextMinute;
        currentHour = nextHour;
      }
      common_vendor.index.__f__("log", "at stores/venue.js:484", "[VenueStore] 生成默认时间段:", defaultSlots.length > 0 ? `${defaultSlots[0].startTime} - ${defaultSlots[defaultSlots.length - 1].endTime}` : "无");
      this.setTimeSlots(defaultSlots);
    },
    // 解析时间字符串，支持多种格式
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
    },
    // 获取场馆时间段（别名方法，用于兼容性）
    async getVenueTimeSlots(venueId, date, forceRefresh = false, loading = true) {
      if (typeof venueId === "object" && venueId.venueId && venueId.date) {
        const params = venueId;
        return await this.getTimeSlots(params.venueId, params.date, params.forceRefresh || false, params.loading !== false);
      }
      if (venueId && date) {
        return await this.getTimeSlots(venueId, date, forceRefresh, loading);
      }
      return { data: [] };
    },
    // 清理时间段缓存
    async clearTimeSlotCache(venueId, date) {
      try {
        this.timeSlots = [];
        this.loading = false;
        this.currentVenueId = null;
        this.currentDate = null;
        const cacheKey = `${venueId}_${date}`;
        this.cache.timeSlots.delete(cacheKey);
      } catch (error) {
      }
    },
    // 刷新时间段状态 - 简化版
    async refreshTimeSlotStatus(venueId, date, timeSlotId = null) {
      try {
        const result = await this.getTimeSlots(venueId, date, true, false);
        this.notifyTimeSlotUpdate(venueId, date, timeSlotId, result.data);
        return result.data;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:558", "[VenueStore] 刷新时间段状态失败:", error);
        this.notifyTimeSlotError(venueId, date, timeSlotId, error);
        this.setTimeSlots([]);
        return [];
      }
    },
    // 通知时间段更新
    notifyTimeSlotUpdate(venueId, date, timeSlotId = null, timeSlots = null) {
      if (typeof common_vendor.index !== "undefined" && common_vendor.index.$emit) {
        const eventData = {
          venueId,
          date,
          timeSlots: timeSlots || this.timeSlots,
          updatedTimeSlotId: timeSlotId,
          timestamp: Date.now()
        };
        common_vendor.index.$emit("timeSlotUpdated", eventData);
        if (timeSlotId) {
          const updatedSlot = (timeSlots || this.timeSlots).find((slot) => slot.id === timeSlotId);
          common_vendor.index.$emit("timeSlotStatusChanged", {
            venueId,
            date,
            timeSlotId,
            newStatus: updatedSlot == null ? void 0 : updatedSlot.status,
            slot: updatedSlot,
            timestamp: Date.now()
          });
        }
      }
    },
    // 通知时间段错误事件
    notifyTimeSlotError(venueId, date, timeSlotId = null, error) {
      if (typeof common_vendor.index !== "undefined" && common_vendor.index.$emit) {
        common_vendor.index.$emit("timeSlotError", {
          venueId,
          date,
          timeSlotId,
          error: error.message || error,
          timestamp: Date.now()
        });
      }
    },
    // 预约成功后的状态同步 - 简化版
    async onBookingSuccess(bookingData) {
      try {
        if (!bookingData) {
          return;
        }
        const venueId = bookingData.venueId || bookingData.venue_id;
        const date = bookingData.date || bookingData.booking_date;
        if (!venueId || !date) {
          return;
        }
        const timeSlotId = bookingData.timeSlotId || bookingData.time_slot_id || bookingData.slotId;
        if (timeSlotId && this.timeSlots.length > 0) {
          const slot = this.timeSlots.find(
            (s) => s.id === timeSlotId || s.timeSlotId === timeSlotId
          );
          if (slot) {
            slot.status = utils_timeslotConstants.SLOT_STATUS.BOOKED;
            slot.isBooked = true;
            slot.isAvailable = false;
            slot.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
            this.setTimeSlots([...this.timeSlots]);
          }
        }
        const cacheKey = `${venueId}_${date}`;
        this.cache.timeSlots.delete(cacheKey);
        setTimeout(async () => {
          try {
            await this.refreshTimeSlotStatus(venueId, date);
            if (typeof common_vendor.index !== "undefined" && common_vendor.index.$emit) {
              common_vendor.index.$emit("timeslot-updated", {
                venueId,
                date,
                action: "booking-success",
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              });
            }
          } catch (error) {
            common_vendor.index.__f__("error", "at stores/venue.js:660", "[VenueStore] 延迟刷新失败:", error);
          }
        }, 500);
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:665", "[VenueStore] 预约成功状态同步失败:", error);
      }
    },
    // 取消预约后刷新时间段
    async onBookingCancelled(venueId, date, cancelledSlotIds) {
      try {
        if (Array.isArray(cancelledSlotIds) && cancelledSlotIds.length > 0) {
          const updatedSlots = this.timeSlots.map((slot) => {
            if (cancelledSlotIds.includes(slot.id)) {
              return {
                ...slot,
                status: utils_timeslotConstants.SLOT_STATUS.AVAILABLE,
                isBooked: false,
                isAvailable: true,
                lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
              };
            }
            return slot;
          });
          this.setTimeSlots(updatedSlots);
        }
        const cacheKey = `${venueId}_${date}`;
        this.cache.timeSlots.delete(cacheKey);
        setTimeout(() => {
          this.getTimeSlots(venueId, date, true, false);
        }, 1e3);
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:701", "[VenueStore] 预约取消后刷新失败:", error);
      }
    },
    // 搜索场馆
    async searchVenues(searchParams) {
      try {
        this.setLoading(true);
        let params = {};
        if (typeof searchParams === "string") {
          params.keyword = searchParams;
        } else if (typeof searchParams === "object") {
          params = { ...searchParams };
        }
        const response = await api_venue.venueApi.searchVenues(params);
        if (response && response.data) {
          this.setSearchResults(response.data);
          return response.data;
        }
        this.setSearchResults([]);
        return [];
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:729", "[VenueStore] 搜索场馆失败:", error);
        this.setSearchResults([]);
        return [];
      } finally {
        this.setLoading(false);
      }
    },
    // 清空场馆详情
    clearVenueDetail() {
      this.venueDetail = null;
    },
    // 清空搜索结果
    clearSearchResults() {
      this.searchResults = [];
    },
    // 重置分页
    resetPagination() {
      this.pagination = {
        current: 1,
        pageSize: 10,
        total: 0,
        totalPages: 1
      };
    },
    // 清除时间段缓存
    clearTimeSlots() {
      this.timeSlots = [];
      this.selectedTimeSlots = [];
      this.currentVenueId = null;
      this.currentDate = null;
      this.cache.timeSlots.clear();
    },
    // 强力刷新时间段
    async forceRefreshTimeSlots(venueId, date) {
      try {
        const cacheKey = `${venueId}_${date}`;
        this.cache.timeSlots.delete(cacheKey);
        return await this.getTimeSlots(venueId, date, true, false);
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:779", "[VenueStore] 强力刷新时间段失败:", error);
        throw error;
      }
    },
    // 立即释放时间段（用于取消预约后的即时更新）
    immediateReleaseTimeSlots(venueId, date, startTime, endTime) {
      try {
        if (this.timeSlots && Array.isArray(this.timeSlots)) {
          let releasedCount = 0;
          const updatedSlots = this.timeSlots.map((slot) => {
            const slotStart = slot.startTime;
            const slotEnd = slot.endTime;
            const isInRange = slotStart >= startTime && slotEnd <= endTime || slotStart === startTime && slotEnd === endTime || slotStart >= startTime && slotStart < endTime || slotEnd > startTime && slotEnd <= endTime;
            if (isInRange && (slot.status === "BOOKED" || slot.status === "RESERVED" || slot.status === "SHARING")) {
              releasedCount++;
              return {
                ...slot,
                status: "AVAILABLE",
                isBooked: false,
                isAvailable: true,
                lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
              };
            }
            return slot;
          });
          this.setTimeSlots(updatedSlots);
        }
        const cacheKey = `${venueId}_${date}`;
        this.cache.timeSlots.delete(cacheKey);
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:824", "[VenueStore] 立即释放时间段失败:", error);
      }
    },
    // 🔥 新增：根据slotIds立即释放时间段
    immediateReleaseTimeSlotsById(venueId, date, slotIds) {
      try {
        if (!Array.isArray(slotIds) || slotIds.length === 0) {
          return;
        }
        if (this.timeSlots && Array.isArray(this.timeSlots)) {
          let releasedCount = 0;
          const updatedSlots = this.timeSlots.map((slot) => {
            if (slotIds.includes(slot.id)) {
              releasedCount++;
              return {
                ...slot,
                status: utils_timeslotConstants.SLOT_STATUS.AVAILABLE,
                isBooked: false,
                isAvailable: true,
                orderId: null,
                lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
              };
            }
            return slot;
          });
          this.setTimeSlots(updatedSlots);
        }
        const cacheKey = `${venueId}_${date}`;
        this.cache.timeSlots.delete(cacheKey);
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:862", "[VenueStore] ❌ 根据slotIds释放时间段失败:", error);
      }
    },
    // 🔧 新增：强制释放拼场时间段（专门用于拼场订单取消）
    forceReleaseSharingTimeSlots(venueId, date, startTime, endTime) {
      try {
        if (this.timeSlots && Array.isArray(this.timeSlots)) {
          let releasedCount = 0;
          const updatedSlots = this.timeSlots.map((slot) => {
            const slotStart = slot.startTime;
            const slotEnd = slot.endTime;
            const shouldRelease = (
              // 精确匹配
              slotStart === startTime && slotEnd === endTime || // 时间范围重叠
              slotStart >= startTime && slotStart < endTime || slotEnd > startTime && slotEnd <= endTime || // 包含关系
              slotStart <= startTime && slotEnd >= endTime || slotStart >= startTime && slotEnd <= endTime
            );
            if (shouldRelease && slot.status !== "AVAILABLE") {
              releasedCount++;
              return {
                ...slot,
                status: "AVAILABLE",
                isBooked: false,
                isAvailable: true,
                lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
              };
            }
            return slot;
          });
          this.setTimeSlots(updatedSlots);
          this.$forceUpdate && this.$forceUpdate();
        }
        const cacheKey = `${venueId}_${date}`;
        this.cache.timeSlots.delete(cacheKey);
        this.cache.venues.clear();
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:913", "[VenueStore] 强制释放拼场时间段失败:", error);
      }
    },
    // 🔥 修复：增强的订单过期事件处理
    async onOrderExpired(orderData) {
      try {
        if (!orderData || !orderData.venueId || !orderData.date) {
          return;
        }
        const { venueId, date, startTime, endTime, slotIds, orderNo } = orderData;
        if (startTime && endTime) {
          this.immediateReleaseTimeSlots(venueId, date, startTime, endTime);
        } else if (slotIds && Array.isArray(slotIds)) {
          this.immediateReleaseTimeSlotsById(venueId, date, slotIds);
        }
        const cacheKey = `${venueId}_${date}`;
        this.cache.timeSlots.delete(cacheKey);
        setTimeout(async () => {
          try {
            await this.getTimeSlots(venueId, date, true, false);
            if (typeof common_vendor.index !== "undefined" && common_vendor.index.$emit) {
              common_vendor.index.$emit("timeslot-updated", {
                venueId,
                date,
                action: "order-expired",
                orderNo,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              });
            }
          } catch (error) {
            common_vendor.index.__f__("error", "at stores/venue.js:954", "[VenueStore] ❌ 异步刷新时间段失败:", error);
          }
        }, 100);
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:959", "[VenueStore] ❌ 处理订单过期事件失败:", error);
      }
    },
    // 🔥 新增：处理订单取消事件
    async onOrderCancelled(orderData) {
      try {
        if (!orderData || !orderData.venueId || !orderData.date) {
          return;
        }
        const { venueId, date, startTime, endTime, slotIds, orderNo } = orderData;
        if (startTime && endTime) {
          this.immediateReleaseTimeSlots(venueId, date, startTime, endTime);
        } else if (slotIds && Array.isArray(slotIds)) {
          this.immediateReleaseTimeSlotsById(venueId, date, slotIds);
        }
        const cacheKey = `${venueId}_${date}`;
        this.cache.timeSlots.delete(cacheKey);
        setTimeout(async () => {
          try {
            await this.getTimeSlots(venueId, date, true, false);
            if (typeof common_vendor.index !== "undefined" && common_vendor.index.$emit) {
              common_vendor.index.$emit("timeslot-updated", {
                venueId,
                date,
                action: "order-cancelled",
                orderNo,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              });
            }
          } catch (error) {
            common_vendor.index.__f__("error", "at stores/venue.js:998", "[VenueStore] ❌ 刷新时间段失败:", error);
          }
        }, 100);
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:1003", "[VenueStore] ❌ 处理订单取消事件失败:", error);
      }
    },
    // 🔥 新增：处理时间段状态更新事件
    async onTimeslotStatusUpdate(updateData) {
      try {
        if (!updateData || !updateData.venueId || !updateData.date) {
          return;
        }
        const { venueId, date, slotIds } = updateData;
        const cacheKey = `${venueId}_${date}`;
        this.cache.timeSlots.delete(cacheKey);
        if (this.currentVenueId === venueId && this.currentDate === date) {
          await this.getTimeSlots(venueId, date, true, false);
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:1027", "[VenueStore] ❌ 处理时间段状态更新事件失败:", error);
      }
    },
    // 🔄 更新时间段状态（用于实时验证后的状态同步）
    updateTimeSlotsStatus(venueId, date, latestSlots) {
      try {
        if (!venueId || !date || !Array.isArray(latestSlots)) {
          return false;
        }
        if (this.currentVenueId === venueId && this.currentDate === date) {
          this.setTimeSlots(latestSlots);
          this.notifyTimeSlotUpdate(venueId, date, null, latestSlots);
          if (typeof common_vendor.index !== "undefined" && common_vendor.index.$emit) {
            common_vendor.index.$emit("timeslots-status-updated", {
              venueId,
              date,
              timeSlots: latestSlots,
              timestamp: Date.now(),
              source: "realtime-validation"
            });
          }
          return true;
        } else {
          common_vendor.index.__f__("log", "at stores/venue.js:1061", "[VenueStore] 场馆或日期不匹配，跳过更新:", {
            current: { venueId: this.currentVenueId, date: this.currentDate },
            target: { venueId, date }
          });
          return false;
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/venue.js:1069", "[VenueStore] ❌ 更新时间段状态失败:", error);
        return false;
      }
    }
  }
});
exports.useVenueStore = useVenueStore;
//# sourceMappingURL=../../.sourcemap/mp-weixin/stores/venue.js.map
