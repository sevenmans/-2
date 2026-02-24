"use strict";
const common_vendor = require("../common/vendor.js");
const api_booking = require("../api/booking.js");
const stores_venue = require("./venue.js");
const api_user = require("../api/user.js");
const api_sharing = require("../api/sharing.js");
const utils_ui = require("../utils/ui.js");
async function getVenueStore() {
  try {
    if (typeof stores_venue.useVenueStore === "function") {
      return stores_venue.useVenueStore();
    }
    const venueStoreModule = await "./venue.js";
    if (venueStoreModule && typeof venueStoreModule.useVenueStore === "function") {
      return venueStoreModule.useVenueStore();
    }
    if ((venueStoreModule == null ? void 0 : venueStoreModule.default) && typeof venueStoreModule.default.useVenueStore === "function") {
      return venueStoreModule.default.useVenueStore();
    }
    common_vendor.index.__f__("error", "at stores/booking.js:26", "[BookingStore] 动态导入的 venue.js 模块中未找到 useVenueStore 函数");
    common_vendor.index.__f__("error", "at stores/booking.js:27", "[BookingStore] 可用的导出:", Object.keys(venueStoreModule || {}));
    return null;
  } catch (error) {
    common_vendor.index.__f__("error", "at stores/booking.js:30", "[BookingStore] 动态导入 venue store 失败:", error);
    return null;
  }
}
const useBookingStore = common_vendor.defineStore("booking", {
  state: () => ({
    bookingList: [],
    bookingDetail: null,
    sharingOrders: [],
    userSharingOrders: [],
    joinedSharingOrders: [],
    sharingDetail: null,
    loading: false,
    loadingMore: false,
    // 🔥 修复问题2: 添加加载更多状态
    pagination: {
      current: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
      currentPage: 1
    },
    // 缓存相关状态
    cache: {
      bookingList: {
        data: null,
        timestamp: 0,
        expiry: 5 * 60 * 1e3
        // 5分钟缓存
      },
      bookingDetails: /* @__PURE__ */ new Map(),
      // 预约详情缓存
      lastRefreshTime: 0
    },
    // 最近一次取消（跨页强制刷新使用）
    lastCancelled: null
  }),
  getters: {
    // 基础getters - 修复命名冲突，避免与actions同名
    bookingListGetter: (state) => state.bookingList,
    bookingDetailGetter: (state) => state.bookingDetail,
    sharingOrdersGetter: (state) => state.sharingOrders,
    userSharingOrdersGetter: (state) => state.userSharingOrders,
    joinedSharingOrdersGetter: (state) => state.joinedSharingOrders,
    sharingDetailGetter: (state) => state.sharingDetail,
    isLoading: (state) => state.loading,
    getPagination: (state) => state.pagination,
    // 计算属性
    totalBookings: (state) => state.bookingList.length,
    totalSharingOrders: (state) => state.sharingOrders.length,
    totalUserSharingOrders: (state) => state.userSharingOrders.length,
    totalJoinedSharingOrders: (state) => state.joinedSharingOrders.length,
    // 按状态筛选预订
    getBookingsByStatus: (state) => (status) => {
      return state.bookingList.filter((booking) => booking.status === status);
    },
    // 待确认的预订
    getPendingBookings: (state) => {
      return state.bookingList.filter((booking) => booking.status === "PENDING");
    },
    // 已确认的预订
    getConfirmedBookings: (state) => {
      return state.bookingList.filter((booking) => booking.status === "CONFIRMED");
    },
    // 是否有更多数据
    hasMoreData: (state) => {
      return state.pagination.current < state.pagination.totalPages;
    },
    // 缓存相关getters
    isCacheValid: (state) => (cacheKey) => {
      const cache = state.cache[cacheKey];
      if (!cache || !cache.data)
        return false;
      return Date.now() - cache.timestamp < cache.expiry;
    },
    getCachedData: (state) => (cacheKey) => {
      const cache = state.cache[cacheKey];
      return cache && cache.data ? cache.data : null;
    }
  },
  actions: {
    // 🔥 新增：设置事件监听器
    setupEventListeners() {
      try {
        if (typeof common_vendor.index === "undefined" || !common_vendor.index.$on) {
          setTimeout(() => this.setupEventListeners(), 1e3);
          return;
        }
        common_vendor.index.$on("order-expired", this.onOrderExpired.bind(this));
        common_vendor.index.$on("order-cancelled", this.onOrderCancelled.bind(this));
        common_vendor.index.$on("booking-success", this.onBookingSuccess.bind(this));
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:138", "[BookingStore] ❌ 设置事件监听器失败:", error);
      }
    },
    // 清理事件监听器
    cleanupEventListeners() {
      try {
        if (typeof common_vendor.index !== "undefined" && common_vendor.index.$off) {
          common_vendor.index.$off("order-expired", this.onOrderExpired);
          common_vendor.index.$off("order-cancelled", this.onOrderCancelled);
          common_vendor.index.$off("booking-success", this.onBookingSuccess);
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:151", "[BookingStore] 清理事件监听器失败:", error);
      }
    },
    // 处理订单过期事件
    async onOrderExpired(eventData) {
      if (!eventData || !eventData.orderNo) {
        return;
      }
      const bookingIndex = this.bookingList.findIndex((b) => b.orderNo === eventData.orderNo);
      if (bookingIndex !== -1) {
        this.bookingList[bookingIndex].status = "CANCELLED";
      }
      await this.refreshBookingList();
    },
    // 处理订单取消事件
    async onOrderCancelled(eventData) {
      try {
        if (eventData && (eventData.orderType === "BOOKING" || eventData.orderType === "booking")) {
          await this.refreshBookingList();
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:180", "[BookingStore] 处理订单取消失败:", error);
      }
    },
    // 处理预约成功事件
    async onBookingSuccess(eventData) {
      try {
        await this.refreshBookingList();
        if (eventData && eventData.venueId && eventData.date) {
          try {
            const venueStore = await getVenueStore();
            if (venueStore) {
              await venueStore.onTimeslotStatusUpdate({
                venueId: eventData.venueId,
                date: eventData.date,
                slotIds: eventData.slotIds || [eventData.slotId],
                action: "booking-success"
              });
            }
          } catch (error) {
            common_vendor.index.__f__("error", "at stores/booking.js:204", "[BookingStore] 通知venue store失败:", error);
          }
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:208", "[BookingStore] 处理预约成功失败:", error);
      }
    },
    // 清除缓存
    clearCache() {
      try {
        common_vendor.index.removeStorageSync("booking_list_cache");
        common_vendor.index.removeStorageSync("booking_detail_cache");
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:218", "[BookingStore] 清除缓存失败:", error);
      }
    },
    // 设置加载状态
    setLoading(loading) {
      this.loading = loading;
    },
    // 设置预订列表
    setBookingList({ list, pagination }) {
      this.bookingList = Array.isArray(list) ? list : [];
      if (pagination) {
        this.pagination = { ...this.pagination, ...pagination };
      }
    },
    // 追加预订列表
    appendBookingList(list) {
      const newList = Array.isArray(list) ? list : [];
      this.bookingList = [...this.bookingList, ...newList];
    },
    // 设置预订详情
    setBookingDetail(detail) {
      this.bookingDetail = detail;
    },
    // 设置分享订单列表
    setSharingOrders(orders) {
      this.sharingOrders = Array.isArray(orders) ? orders : [];
    },
    // 设置用户分享订单
    setUserSharingOrders(orders) {
      this.userSharingOrders = Array.isArray(orders) ? orders : [];
    },
    // 设置加入的分享订单
    setJoinedSharingOrders(orders) {
      this.joinedSharingOrders = Array.isArray(orders) ? orders : [];
    },
    // 设置分享详情
    setSharingDetail(detail) {
      this.sharingDetail = detail;
    },
    // 设置分页信息
    setPagination(pagination) {
      this.pagination = { ...this.pagination, ...pagination };
    },
    // 更新预订状态
    updateBookingStatus({ bookingId, status }) {
      const booking = this.bookingList.find((b) => b.id === bookingId);
      if (booking) {
        booking.status = status;
      }
    },
    // 创建预订
    async createBooking(bookingData) {
      try {
        this.setLoading(true);
        const response = await api_booking.createBooking(bookingData);
        utils_ui.showSuccess("预约成功");
        if (bookingData.venueId && bookingData.date) {
          try {
            const venueStore = await getVenueStore();
            if (!venueStore) {
              return response.data || response;
            }
            let slotIds = [];
            if (bookingData.slotIds) {
              slotIds = bookingData.slotIds;
            } else if (bookingData.slotId) {
              slotIds = [bookingData.slotId];
            }
            try {
              const { default: cacheManager } = await "../utils/cache-manager.js";
              if (cacheManager && typeof cacheManager.clearTimeSlotCache === "function") {
                cacheManager.clearTimeSlotCache(bookingData.venueId, bookingData.date);
              }
            } catch (error) {
            }
            if (slotIds.length > 0) {
              const selectedSlots = [];
              if (bookingData.startTime && bookingData.endTime) {
                selectedSlots.push({
                  startTime: bookingData.startTime,
                  endTime: bookingData.endTime
                });
              }
              await venueStore.onBookingSuccess(bookingData.venueId, bookingData.date, slotIds, selectedSlots);
            } else {
              await venueStore.refreshTimeSlotStatus(bookingData.venueId, bookingData.date);
            }
          } catch (refreshError) {
          }
        }
        const result = response.data || response;
        return result;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:341", "[BookingStore] 创建预约失败:", error);
        utils_ui.showError(error.message || "预约失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取我的预订列表（别名方法，用于测试兼容性）
    async getMyBookings(params = {}) {
      return await this.getBookingList(params);
    },
    // 获取预订详情（修复API调用错误）
    async getBookingDetails(bookingId) {
      try {
        this.setLoading(true);
        const response = await api_booking.getBookingDetail(bookingId);
        this.setBookingDetail(response.data || response);
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:367", "[BookingStore] 获取预订详情失败:", error);
        utils_ui.showError(error.message || "获取预订详情失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 创建拼场预约
    async createSharedBooking(bookingData) {
      try {
        this.setLoading(true);
        const response = await api_booking.createSharedBooking(bookingData);
        utils_ui.showSuccess("拼场预约成功");
        this.clearCache("bookingList");
        if (bookingData.venueId && bookingData.date) {
          try {
            try {
              const { default: unifiedTimeSlotManager } = await "../utils/unified-timeslot-manager.js";
              if (unifiedTimeSlotManager && typeof unifiedTimeSlotManager.clearCache === "function") {
                unifiedTimeSlotManager.clearCache(bookingData.venueId, bookingData.date);
              } else {
                const { default: cacheManager } = await "../utils/cache-manager.js";
                if (cacheManager && typeof cacheManager.clearTimeSlotCache === "function") {
                  cacheManager.clearTimeSlotCache(bookingData.venueId, bookingData.date);
                }
              }
            } catch (importError) {
            }
          } catch (error) {
          }
          try {
            const venueStore = await getVenueStore();
            if (venueStore) {
              let slotIds = [];
              if (bookingData.slotIds) {
                slotIds = bookingData.slotIds;
              } else if (bookingData.slotId) {
                slotIds = [bookingData.slotId];
              }
              if (slotIds.length > 0) {
                const selectedSlots = [];
                if (bookingData.startTime && bookingData.endTime) {
                  selectedSlots.push({
                    startTime: bookingData.startTime,
                    endTime: bookingData.endTime
                  });
                }
                await venueStore.onBookingSuccess(bookingData.venueId, bookingData.date, slotIds, selectedSlots);
              } else {
                await venueStore.refreshTimeSlotStatus(bookingData.venueId, bookingData.date);
              }
            }
          } catch (refreshError) {
          }
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:445", "[BookingStore] 创建拼场预约失败:", error);
        utils_ui.showError(error.message || "拼场预约失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取用户预约列表（带缓存）
    async getUserBookings(params = {}) {
      const isFirstPage = !params.page || params.page === 1;
      const isLoadingMore = !isFirstPage;
      const isForceRefresh = params.force === true;
      try {
        if (!isForceRefresh) {
          if (isLoadingMore) {
            this.loadingMore = true;
          } else {
            this.setLoading(true);
          }
        }
        const useCache = isFirstPage && !params.refresh && !params.force;
        if (useCache && this.isCacheValid("bookingList")) {
          const cachedData = this.getCachedData("bookingList");
          if (cachedData) {
            this.setBookingList(cachedData);
            return { success: true, fromCache: true };
          }
        }
        const response = await api_user.getUserBookings(params);
        const { data, total, page, pageSize, totalPages } = response;
        const pagination = {
          current: page,
          pageSize,
          total,
          totalPages,
          currentPage: page
        };
        const listData = { list: data || [], pagination };
        if (params.page === 1 || params.refresh) {
          this.setBookingList(listData);
          if (isFirstPage) {
            this.setCacheData("bookingList", listData);
          }
        } else {
          this.appendBookingList(data || []);
          this.setPagination(pagination);
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:513", "[BookingStore] 获取用户预约列表失败:", error);
        if (error.message === "请求超时") {
          utils_ui.showError("加载超时，请检查网络连接");
        } else {
          utils_ui.showError(error.message || "获取预约列表失败");
        }
        if (isFirstPage) {
          this.setBookingList({
            list: [],
            pagination: { current: 1, pageSize: 10, total: 0, totalPages: 1, currentPage: 1 }
          });
        }
        throw error;
      } finally {
        if (!isForceRefresh) {
          if (isLoadingMore) {
            this.loadingMore = false;
          } else {
            this.setLoading(false);
          }
        }
      }
    },
    // 获取预约详情（带缓存）
    async getBookingDetail(bookingId, useCache = true) {
      try {
        this.setLoading(true);
        if (!bookingId) {
          throw new Error("订单ID不能为空");
        }
        if (useCache && this.cache.bookingDetails.has(bookingId)) {
          const cachedDetail = this.cache.bookingDetails.get(bookingId);
          const now = Date.now();
          if (now - cachedDetail.timestamp < 2 * 60 * 1e3) {
            this.setBookingDetail(cachedDetail.data);
            return { success: true, fromCache: true };
          } else {
            this.cache.bookingDetails.delete(bookingId);
          }
        }
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("请求超时")), 1e4);
        });
        const apiPromise = useCache ? api_booking.getBookingDetail(bookingId) : api_booking.getBookingDetail(bookingId, { _t: Date.now(), _nocache: 1 }, {
          cache: false,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          }
        });
        const response = await Promise.race([apiPromise, timeoutPromise]);
        let bookingData = null;
        if (response && typeof response === "object") {
          if (response.id || response.orderNo) {
            bookingData = response;
          } else if (response.data) {
            bookingData = response.data;
          } else if (response.result) {
            bookingData = response.result;
          } else {
            bookingData = response;
          }
        } else {
          throw new Error("服务器返回的数据格式不正确");
        }
        if (!bookingData) {
          throw new Error("未找到预约详情");
        }
        this.setBookingDetail(bookingData);
        this.cache.bookingDetails.set(bookingId, {
          data: bookingData,
          timestamp: Date.now()
        });
        return { success: true, data: bookingData };
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:621", "[BookingStore] 获取预约详情失败:", error);
        if (error.message === "请求超时") {
          utils_ui.showError("加载超时，请检查网络连接");
        } else if (error.message === "未找到预约详情") {
          utils_ui.showError("预约详情不存在");
        } else {
          utils_ui.showError(error.message || "获取预约详情失败");
        }
        this.setBookingDetail(null);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 取消预约
    async cancelBooking(bookingId) {
      try {
        if (!bookingId) {
          throw new Error("预约ID不能为空");
        }
        const numericId = typeof bookingId === "string" ? Number(bookingId) : bookingId;
        if (Number.isFinite(numericId) && numericId < 0) {
          const requestId = -numericId;
          const response2 = await api_sharing.cancelSharingRequest(requestId);
          const bookingIndex2 = this.bookingList.findIndex((b) => b.id === numericId || b.orderNo === `REQ_${requestId}`);
          if (bookingIndex2 !== -1) {
            this.bookingList.splice(bookingIndex2, 1);
          }
          this.cache.bookingDetails.delete(bookingId);
          this.clearCache("bookingList");
          common_vendor.index.$emit("orderCancelled", {
            orderId: bookingId,
            type: "sharing-request"
          });
          utils_ui.showSuccess("申请已取消");
          return response2;
        }
        let bookingDetail = null;
        try {
          const detailResponse = await this.getBookingDetail(bookingId, false);
          bookingDetail = detailResponse.data || this.bookingDetail;
        } catch (detailError) {
          common_vendor.index.__f__("warn", "at stores/booking.js:671", "[BookingStore] 获取预约详情失败，继续执行取消操作:", detailError);
        }
        const response = await api_booking.cancelBooking(bookingId);
        const bookingIndex = this.bookingList.findIndex((b) => b.id === bookingId || b.orderNo === bookingId);
        if (bookingIndex !== -1) {
          this.bookingList[bookingIndex].status = "CANCELLED";
        }
        this.cache.bookingDetails.delete(bookingId);
        if (this.bookingDetail && (this.bookingDetail.id === bookingId || this.bookingDetail.orderNo === bookingId)) {
          this.bookingDetail = { ...this.bookingDetail, status: "CANCELLED" };
        }
        this.clearCache("bookingList");
        this.lastCancelled = {
          bookingId,
          timestamp: Date.now()
        };
        let venueId = null;
        let bookingDate = null;
        let slotIds = [];
        if (bookingDetail) {
          venueId = bookingDetail.venueId || bookingDetail.venue_id;
          bookingDate = bookingDetail.bookingDate || bookingDetail.booking_date || bookingDetail.date;
          if (bookingDetail.slotIds) {
            slotIds = Array.isArray(bookingDetail.slotIds) ? bookingDetail.slotIds : [bookingDetail.slotIds];
          } else if (bookingDetail.slotId) {
            slotIds = [bookingDetail.slotId];
          } else if (bookingDetail.slot_ids) {
            slotIds = Array.isArray(bookingDetail.slot_ids) ? bookingDetail.slot_ids : [bookingDetail.slot_ids];
          } else if (bookingDetail.slot_id) {
            slotIds = [bookingDetail.slot_id];
          }
        }
        if (response && response.data) {
          const responseData = response.data;
          venueId = venueId || responseData.venueId || responseData.venue_id;
          bookingDate = bookingDate || responseData.bookingDate || responseData.booking_date || responseData.date;
        }
        const actualBookingDate = (bookingDetail == null ? void 0 : bookingDetail.bookingDate) || (bookingDetail == null ? void 0 : bookingDetail.booking_date) || bookingDate;
        const actualVenueId = (bookingDetail == null ? void 0 : bookingDetail.venueId) || (bookingDetail == null ? void 0 : bookingDetail.venue_id) || venueId;
        if (actualVenueId && actualBookingDate) {
          try {
            try {
              const { default: unifiedTimeSlotManager } = await "../utils/unified-timeslot-manager.js";
              if (unifiedTimeSlotManager && typeof unifiedTimeSlotManager.releaseTimeSlots === "function") {
                await unifiedTimeSlotManager.releaseTimeSlots({
                  venueId: actualVenueId,
                  date: actualBookingDate,
                  slotIds,
                  reason: "booking-cancelled",
                  bookingId
                });
              } else {
                if (unifiedTimeSlotManager && typeof unifiedTimeSlotManager.clearCache === "function") {
                  unifiedTimeSlotManager.clearCache(actualVenueId, actualBookingDate);
                }
              }
            } catch (importError) {
              common_vendor.index.__f__("warn", "at stores/booking.js:753", "[BookingStore] 统一时间段管理器不可用，使用备用方案:", importError);
              try {
                const { default: cacheManager } = await "../utils/cache-manager.js";
                if (cacheManager && typeof cacheManager.clearTimeSlotCache === "function") {
                  cacheManager.clearTimeSlotCache(actualVenueId, actualBookingDate);
                }
              } catch (cacheError) {
                common_vendor.index.__f__("warn", "at stores/booking.js:762", "[BookingStore] 缓存管理器也不可用:", cacheError);
              }
            }
            try {
              const venueStore = await getVenueStore();
              if (venueStore && typeof venueStore.onBookingCancelled === "function") {
                await venueStore.onBookingCancelled(actualVenueId, actualBookingDate, slotIds);
              } else if (venueStore && typeof venueStore.refreshTimeSlotStatus === "function") {
                await venueStore.refreshTimeSlotStatus(actualVenueId, actualBookingDate);
              }
            } catch (venueError) {
              common_vendor.index.__f__("warn", "at stores/booking.js:776", "[BookingStore] 通知venue store失败:", venueError);
            }
          } catch (eventError) {
            common_vendor.index.__f__("error", "at stores/booking.js:779", "[BookingStore] 使用统一时间段管理器释放时间段失败:", eventError);
          }
        }
        common_vendor.index.$emit("orderCancelled", {
          orderId: bookingId,
          type: "booking"
        });
        setTimeout(() => {
          this.refreshBookingList();
        }, 1e3);
        utils_ui.showSuccess("预约已取消");
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:797", "[BookingStore] 取消预约失败:", error);
        if (error.message === "请求超时") {
          utils_ui.showError("操作超时，请检查网络连接");
        } else {
          utils_ui.showError(error.message || "取消预约失败");
        }
        throw error;
      }
    },
    // 清空预约详情
    clearBookingDetail() {
      this.bookingDetail = null;
    },
    // 重置分页信息
    resetPagination() {
      this.pagination = {
        current: 1,
        pageSize: 10,
        total: 0,
        totalPages: 1,
        currentPage: 1
      };
    },
    // 创建拼场订单
    async createSharingOrder({ orderId, data }) {
      try {
        this.setLoading(true);
        const response = await api_sharing.createSharingOrder({ orderId, data });
        utils_ui.showSuccess("申请拼场成功");
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:833", "[BookingStore] 申请拼场失败:", error);
        utils_ui.showError(error.message || "申请拼场失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取拼场订单列表
    async getSharingOrdersList(params = {}) {
      try {
        this.setLoading(true);
        const response = await api_sharing.getJoinableSharingOrders(params);
        const orders = (response == null ? void 0 : response.list) || (response == null ? void 0 : response.data) || [];
        this.setSharingOrders(Array.isArray(orders) ? orders : []);
        const pagination = (response == null ? void 0 : response.pagination) || {
          current: (response == null ? void 0 : response.page) || 1,
          pageSize: (response == null ? void 0 : response.pageSize) || (params.pageSize || 10),
          total: (response == null ? void 0 : response.total) || (orders.length || 0),
          totalPages: (response == null ? void 0 : response.totalPages) || 1,
          currentPage: (response == null ? void 0 : response.page) || 1
        };
        this.setPagination(pagination);
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:858", "[BookingStore] 获取拼场订单失败:", error);
        utils_ui.showError(error.message || "获取拼场订单失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取场馆可用时间段
    async getVenueAvailableSlots(venueId, date) {
      try {
        this.setLoading(true);
        const response = await api_booking.getVenueAvailableSlots(venueId, date);
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:873", "[BookingStore] 获取场馆可用时间段失败:", error);
        utils_ui.showError("获取可用时间段失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 申请拼场预约
    async applySharedBooking(orderId, data) {
      try {
        this.setLoading(true);
        const response = await api_sharing.applySharedBooking(orderId, data);
        utils_ui.showSuccess("拼场申请成功");
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:889", "[BookingStore] 拼场预约申请失败:", error);
        utils_ui.showError("拼场申请失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 创建新的拼场订单
    async createSharingOrderNew(sharingData) {
      try {
        this.setLoading(true);
        const response = await api_sharing.createSharingOrderNew(sharingData);
        utils_ui.showSuccess("创建拼场订单成功");
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:905", "[BookingStore] 创建拼场订单失败:", error);
        utils_ui.showError(error.message || "创建拼场订单失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取拼场订单详情
    async getSharingOrderDetail(orderId) {
      try {
        this.setLoading(true);
        const response = await api_sharing.getSharingOrderDetail(orderId);
        this.setSharingDetail(response.data || response);
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:921", "[BookingStore] 获取拼场订单详情失败:", error);
        utils_ui.showError(error.message || "获取拼场订单详情失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 加入拼场订单
    async joinSharingOrder(orderId) {
      try {
        this.setLoading(true);
        const response = await api_sharing.joinSharingOrder(orderId);
        utils_ui.showSuccess("加入拼场成功");
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:937", "[BookingStore] 加入拼场失败:", error);
        utils_ui.showError(error.message || "加入拼场失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取我创建的拼场订单
    async getMyCreatedSharingOrders() {
      try {
        this.setLoading(true);
        const response = await api_sharing.getMyCreatedSharingOrders();
        this.setUserSharingOrders(response.data || []);
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:953", "[BookingStore] 获取我创建的拼场订单失败:", error);
        utils_ui.showError(error.message || "获取我创建的拼场订单失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 处理拼场申请
    async handleSharingRequest({ requestId, data }) {
      try {
        this.setLoading(true);
        const response = await api_sharing.handleSharingRequest({ requestId, data });
        utils_ui.showSuccess("处理拼场申请成功");
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:969", "[BookingStore] 处理拼场申请失败:", error);
        utils_ui.showError(error.message || "处理拼场申请失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取用户拼场申请
    async getUserSharingOrders(params = {}) {
      try {
        this.setLoading(true);
        const response = await api_sharing.getUserSharingOrders(params);
        this.setUserSharingOrders(response.data || []);
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:985", "[BookingStore] 获取拼场申请失败:", error);
        utils_ui.showError(error.message || "获取拼场申请失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取用户加入的拼场订单
    async getUserJoinedSharingOrders(params = {}) {
      try {
        this.setLoading(true);
        const response = await api_sharing.getUserJoinedSharingOrders(params);
        this.setJoinedSharingOrders(response.data || []);
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:1001", "[BookingStore] 获取拼场申请失败:", error);
        utils_ui.showError(error.message || "获取拼场申请失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取拼场详情
    async getSharingDetail(sharingId) {
      try {
        this.setLoading(true);
        const response = await api_sharing.getSharingDetail(sharingId);
        this.setSharingDetail(response.data || response);
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:1017", "[BookingStore] 获取拼场详情失败:", error);
        utils_ui.showError(error.message || "获取拼场详情失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 移除拼场参与者
    async removeSharingParticipant({ sharingId, participantId }) {
      try {
        this.setLoading(true);
        const response = await api_sharing.removeSharingParticipant({
          sharingId,
          participantId
        });
        utils_ui.showSuccess("移除参与者成功");
        await this.getSharingDetail(sharingId);
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:1040", "[BookingStore] 移除拼场参与者失败:", error);
        utils_ui.showError(error.message || "移除参与者失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 更新拼场设置
    async updateSharingSettings({ sharingId, settings }) {
      try {
        this.setLoading(true);
        const response = await api_sharing.updateSharingSettings({
          sharingId,
          settings
        });
        utils_ui.showSuccess("更新拼场设置成功");
        await this.getSharingDetail(sharingId);
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/booking.js:1063", "[BookingStore] 更新拼场设置失败:", error);
        utils_ui.showError(error.message || "更新拼场设置失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 设置缓存数据
    setCacheData(cacheKey, data) {
      if (this.cache[cacheKey]) {
        this.cache[cacheKey].data = data;
        this.cache[cacheKey].timestamp = Date.now();
      }
    },
    clearCache(cacheKey = null) {
      if (cacheKey) {
        if (this.cache[cacheKey]) {
          this.cache[cacheKey].data = null;
          this.cache[cacheKey].timestamp = 0;
        }
      } else {
        this.cache.bookingList.data = null;
        this.cache.bookingList.timestamp = 0;
        this.cache.bookingDetails.clear();
        this.cache.lastRefreshTime = 0;
      }
    },
    // 刷新预约列表（清除缓存）
    async refreshBookingList() {
      this.clearCache("bookingList");
      return await this.getUserBookings({
        page: 1,
        refresh: true,
        _t: Date.now()
        // 🔥 添加时间戳，确保每次请求都有唯一的key，避免被去重机制阻塞
      });
    }
  }
});
exports.useBookingStore = useBookingStore;
//# sourceMappingURL=../../.sourcemap/mp-weixin/stores/booking.js.map
