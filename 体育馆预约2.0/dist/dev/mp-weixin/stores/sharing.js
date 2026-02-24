"use strict";
const common_vendor = require("../common/vendor.js");
const api_sharing = require("../api/sharing.js");
const utils_ui = require("../utils/ui.js");
const useSharingStore = common_vendor.defineStore("sharing", {
  state: () => ({
    sharingOrders: [],
    mySharingOrders: [],
    receivedRequests: [],
    sentRequests: [],
    sharingOrderDetail: null,
    loading: false,
    pagination: {
      current: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1
    }
  }),
  getters: {
    // 基础getters - 修复命名冲突，避免与actions同名
    sharingOrdersGetter: (state) => state.sharingOrders,
    mySharingOrdersGetter: (state) => state.mySharingOrders,
    receivedRequestsGetter: (state) => state.receivedRequests,
    sentRequestsGetter: (state) => state.sentRequests,
    sharingOrderDetailGetter: (state) => state.sharingOrderDetail,
    isLoading: (state) => state.loading,
    getPagination: (state) => state.pagination,
    // 计算属性
    totalSharingOrders: (state) => state.sharingOrders.length,
    totalMySharingOrders: (state) => state.mySharingOrders.length,
    totalReceivedRequests: (state) => state.receivedRequests.length,
    totalSentRequests: (state) => state.sentRequests.length,
    // 按状态筛选
    getOrdersByStatus: (state) => (status) => {
      return state.sharingOrders.filter((order) => order.status === status);
    },
    // 待处理的请求
    getPendingRequests: (state) => {
      return state.receivedRequests.filter((request) => request.status === "PENDING");
    },
    // 是否有更多数据
    hasMoreData: (state) => {
      return state.pagination.current < state.pagination.totalPages;
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
        common_vendor.index.$on("sharing-data-changed", this.onSharingDataChanged.bind(this));
        common_vendor.index.$on("orderCancelled", this.onOrderCancelled.bind(this));
        common_vendor.index.$on("timeslots-updated", this.onTimeSlotsUpdated.bind(this));
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:77", "[SharingStore] ❌ 设置事件监听器失败:", error);
      }
    },
    // 🔥 新增：清理事件监听器
    cleanupEventListeners() {
      try {
        if (typeof common_vendor.index !== "undefined" && common_vendor.index.$off) {
          common_vendor.index.$off("order-expired", this.onOrderExpired);
          common_vendor.index.$off("sharing-data-changed", this.onSharingDataChanged);
          common_vendor.index.$off("orderCancelled", this.onOrderCancelled);
          common_vendor.index.$off("timeslots-updated", this.onTimeSlotsUpdated);
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:91", "[SharingStore] ❌ 清理事件监听器失败:", error);
      }
    },
    // 🔥 新增：处理订单过期事件
    async onOrderExpired(eventData) {
      try {
        if (!eventData) {
          return;
        }
        if (eventData.orderType === "SHARING" || eventData.orderType === "sharing") {
          await this.refreshSharingOrders();
          await this.refreshMySharingOrders();
          if (typeof common_vendor.index !== "undefined" && common_vendor.index.$emit) {
            common_vendor.index.$emit("sharing-data-changed", {
              type: "order-expired",
              orderNo: eventData.orderNo,
              venueId: eventData.venueId,
              date: eventData.date
            });
          }
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:122", "[SharingStore] ❌ 处理订单过期失败:", error);
      }
    },
    // 🔥 新增：处理拼场数据变化事件
    async onSharingDataChanged(eventData) {
      try {
        await this.refreshSharingOrders();
        if (eventData && eventData.venueId && eventData.date) {
          common_vendor.index.__f__("log", "at stores/sharing.js:134", "精确刷新场馆数据:", {
            venueId: eventData.venueId,
            date: eventData.date
          });
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:140", "[SharingStore] ❌ 处理拼场数据变化失败:", error);
      }
    },
    // 🔥 新增：处理订单取消事件
    async onOrderCancelled(eventData) {
      try {
        if (eventData && (eventData.orderType === "SHARING" || eventData.orderType === "sharing")) {
          await this.refreshSharingOrders();
          await this.refreshMySharingOrders();
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:155", "[SharingStore] ❌ 处理订单取消失败:", error);
      }
    },
    // 🔥 新增：处理时间段更新事件
    async onTimeSlotsUpdated(eventData) {
      try {
        if (eventData && eventData.reason === "order-expired") {
          await this.refreshSharingOrders();
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:167", "[SharingStore] ❌ 处理时间段更新失败:", error);
      }
    },
    // 🔥 新增：刷新拼场订单列表
    async refreshSharingOrders() {
      try {
        this.clearCache();
        await this.getAllSharingOrders({ refresh: true });
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:180", "[SharingStore] ❌ 刷新拼场订单列表失败:", error);
      }
    },
    // 🔥 新增：刷新我的拼场订单
    async refreshMySharingOrders() {
      try {
        this.clearCache();
        await this.getMyOrders({ refresh: true });
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:193", "[SharingStore] ❌ 刷新我的拼场订单失败:", error);
      }
    },
    // 🔥 新增：清除缓存
    clearCache() {
      try {
        common_vendor.index.removeStorageSync("sharing_orders_cache");
        common_vendor.index.removeStorageSync("my_sharing_orders_cache");
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:205", "[SharingStore] ❌ 清除缓存失败:", error);
      }
    },
    // 设置加载状态
    setLoading(loading) {
      this.loading = loading;
    },
    // 设置分享订单列表
    setSharingOrders(orders) {
      this.sharingOrders = Array.isArray(orders) ? orders : [];
    },
    // 设置我的分享订单
    setMySharingOrders(orders) {
      this.mySharingOrders = Array.isArray(orders) ? orders : [];
    },
    // 设置收到的请求
    setReceivedRequests(requests) {
      this.receivedRequests = Array.isArray(requests) ? requests : [];
    },
    // 设置发送的请求
    setSentRequests(requests) {
      this.sentRequests = Array.isArray(requests) ? requests : [];
    },
    // 设置分享订单详情
    setSharingOrderDetail(order) {
      this.sharingOrderDetail = order;
    },
    // 设置分页信息
    setPagination(pagination) {
      this.pagination = { ...this.pagination, ...pagination };
    },
    // 更新订单状态
    updateOrderStatus({ orderId, status }) {
      const order = this.sharingOrders.find((o) => o.id === orderId);
      if (order) {
        order.status = status;
      }
      const myOrder = this.mySharingOrders.find((o) => o.id === orderId);
      if (myOrder) {
        myOrder.status = status;
      }
    },
    // 获取分享订单列表
    async getSharingOrdersList(params = {}) {
      try {
        this.setLoading(true);
        const response = await api_sharing.getJoinableSharingOrders(params);
        if (response && response.data) {
          const orders = Array.isArray(response.data) ? response.data : [];
          this.setSharingOrders(orders);
          if (response.pagination) {
            this.setPagination(response.pagination);
          }
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:275", "[SharingStore] 获取分享订单列表失败:", error);
        utils_ui.showError(error.message || "获取分享订单列表失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取可加入的拼场订单
    async getJoinableSharingOrders(params = {}) {
      try {
        this.setLoading(true);
        const response = await api_sharing.getJoinableSharingOrders(params);
        if (response) {
          const orders = response.list || response.data || [];
          if (params.refresh || params.page === 1) {
            this.setSharingOrders(orders);
          } else {
            this.sharingOrders.push(...orders);
          }
          if (response.pagination) {
            this.setPagination(response.pagination);
          }
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:308", "[SharingStore] 获取可加入拼场订单失败:", error);
        utils_ui.showError(error.message || "获取可加入拼场订单失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取所有拼场订单
    async getAllSharingOrders(params = {}) {
      try {
        this.setLoading(true);
        const response = await api_sharing.getAllSharingOrders(params);
        if (response) {
          const orders = response.list || response.data || [];
          if (params.refresh || params.page === 1) {
            this.setSharingOrders(orders);
          } else {
            this.sharingOrders.push(...orders);
          }
          if (response.pagination) {
            this.setPagination(response.pagination);
          }
        } else {
          if (params.refresh || params.page === 1) {
            this.setSharingOrders([]);
          }
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:349", "[SharingStore] 获取所有拼场订单失败:", error);
        utils_ui.showError(error.message || "获取所有拼场订单失败");
        if (params.refresh || params.page === 1) {
          this.setSharingOrders([]);
        }
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取我的分享订单
    async getMyOrders(params = {}) {
      try {
        this.setLoading(true);
        const response = await api_sharing.getMyCreatedSharingOrders(params);
        if (response && response.data) {
          const orders = Array.isArray(response.data) ? response.data : [];
          this.setMySharingOrders(orders);
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:377", "[SharingStore] 获取我的分享订单失败:", error);
        utils_ui.showError(error.message || "获取我的分享订单失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取收到的请求
    async getReceivedRequestsList(params = {}) {
      try {
        this.setLoading(true);
        const response = await api_sharing.getReceivedSharedRequests(params);
        if (response && response.data) {
          const requests = Array.isArray(response.data) ? response.data : [];
          this.setReceivedRequests(requests);
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:399", "[SharingStore] 获取收到的请求失败:", error);
        utils_ui.showError(error.message || "获取收到的请求失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取发送的请求
    async getSentRequestsList(params = {}) {
      try {
        this.setLoading(true);
        const response = await api_sharing.getMySharedRequests(params);
        if (response && response.data) {
          const requests = Array.isArray(response.data) ? response.data : [];
          this.setSentRequests(requests);
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:421", "[SharingStore] 获取发送的请求失败:", error);
        utils_ui.showError(error.message || "获取发送的请求失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 获取分享订单详情
    async getOrderDetail(orderId, forceRefresh = false) {
      try {
        this.setLoading(true);
        if (forceRefresh) {
          this.sharingOrderDetail = null;
        }
        const response = await api_sharing.getSharingOrderById(orderId);
        if (response) {
          if (response.message && !response.id) {
            this.setSharingOrderDetail(null);
          } else if (response.id) {
            this.setSharingOrderDetail(response);
          } else {
            this.setSharingOrderDetail(null);
          }
        } else {
          this.setSharingOrderDetail(null);
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:457", "[SharingStore] 获取分享订单详情失败:", error);
        utils_ui.showError(error.message || "获取分享订单详情失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 通过主订单ID获取分享订单详情
    async getOrderDetailByMainOrderId(mainOrderId) {
      try {
        this.setLoading(true);
        const response = await api_sharing.getSharingOrderByMainOrderId(mainOrderId);
        if (response) {
          if (response.message && !response.id) {
            this.setSharingOrderDetail(null);
          } else if (response.id) {
            this.setSharingOrderDetail(response);
            return response.id;
          } else {
            this.setSharingOrderDetail(null);
          }
        } else {
          this.setSharingOrderDetail(null);
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:489", "[SharingStore] 通过主订单ID获取分享订单详情失败:", error);
        utils_ui.showError(error.message || "获取分享订单详情失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 创建分享订单
    async createOrder(orderData) {
      try {
        this.setLoading(true);
        const response = await api_sharing.createSharingOrder(orderData);
        if (response && response.data) {
          utils_ui.showSuccess("分享订单创建成功");
          common_vendor.index.$emit("bookingCreated", {
            orderId: response.data.orderId || response.data.id,
            type: "sharing",
            source: "sharingStore"
          });
          common_vendor.index.$emit("sharingDataChanged", {
            action: "created",
            orderId: response.data.id
          });
          await this.getMyOrders();
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:526", "[SharingStore] 创建分享订单失败:", error);
        utils_ui.showError(error.message || "创建分享订单失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 创建拼场订单（别名方法，用于测试兼容性）
    async createSharingOrder(orderData) {
      return await this.createOrder(orderData);
    },
    // 处理分享请求
    async handleRequest({ requestId, action }) {
      try {
        this.setLoading(true);
        const response = await api_sharing.handleSharedRequest(requestId, action);
        if (response && response.success) {
          await this.getReceivedRequestsList();
          utils_ui.showSuccess(`请求${action === "accept" ? "接受" : "拒绝"}成功`);
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:554", "[SharingStore] 处理分享请求失败:", error);
        utils_ui.showError(error.message || "处理分享请求失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 处理拼场申请（新增方法，对应Vuex中的processSharingRequest）
    async processSharingRequest({ requestId, action, reason = "" }) {
      try {
        this.setLoading(true);
        const data = {
          action,
          // 直接传递action参数：'approve' 或 'reject'
          responseMessage: reason || ""
        };
        const response = await api_sharing.handleSharedRequest(requestId, data);
        if (response && response.success) {
          utils_ui.showSuccess(action === "approve" ? "已同意拼场申请" : "已拒绝拼场申请");
          await this.getReceivedRequestsList();
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:583", "[SharingStore] 处理拼场申请失败:", error);
        if (error.needPayment) {
          const enhancedError = new Error(error.message || "处理拼场申请失败");
          enhancedError.needPayment = error.needPayment;
          enhancedError.orderId = error.orderId;
          enhancedError.orderStatus = error.orderStatus;
          throw enhancedError;
        } else {
          utils_ui.showError(error.message || "处理拼场申请失败");
          throw error;
        }
      } finally {
        this.setLoading(false);
      }
    },
    // 申请加入拼场订单（需要支付）
    async applyJoinSharingOrder(orderId) {
      try {
        this.setLoading(true);
        const response = await api_sharing.applyJoinSharingOrder(orderId);
        if (response && response.success) {
          utils_ui.showSuccess("申请提交成功");
          await this.getSentRequestsList();
          return response;
        } else {
          throw new Error(response.message || "申请失败");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:620", "[SharingStore] 申请加入拼场订单失败:", error);
        utils_ui.showError(error.message || "申请加入拼场订单失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 更新拼场设置
    async updateSharingSettings({ sharingId, settings }) {
      try {
        this.setLoading(true);
        const response = await api_sharing.updateSharingSettings(sharingId, settings);
        utils_ui.showSuccess("设置已更新");
        await this.getOrderDetail(sharingId);
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:643", "[SharingStore] 更新拼场设置失败:", error);
        utils_ui.showError(error.message || "更新设置失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 申请拼场
    async applySharingOrder({ orderId, data }) {
      try {
        this.setLoading(true);
        const response = await api_sharing.applySharedBooking(orderId, data);
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:662", "[SharingStore] 申请拼场失败:", error);
        utils_ui.showError(error.message || "申请拼场失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 移除拼场参与者
    async removeSharingParticipant({ sharingId, participantId }) {
      try {
        this.setLoading(true);
        const response = await api_sharing.removeSharingParticipant(sharingId, participantId);
        if (response && response.success) {
          utils_ui.showSuccess("参与者移除成功");
          await this.getOrderDetail(sharingId);
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:686", "[SharingStore] 移除参与者失败:", error);
        utils_ui.showError(error.message || "移除参与者失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 确认拼场订单
    async confirmSharingOrder(orderId) {
      try {
        this.setLoading(true);
        const response = await api_sharing.confirmSharingOrder(orderId);
        if (response && response.success) {
          utils_ui.showSuccess("拼场订单确认成功");
          await this.getMyOrders();
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:710", "[SharingStore] 确认拼场订单失败:", error);
        utils_ui.showError(error.message || "确认拼场订单失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 取消拼场订单
    async cancelSharingOrder(orderId) {
      var _a, _b, _c, _d;
      try {
        this.setLoading(true);
        const response = await api_sharing.cancelSharingOrder(orderId);
        if (response && response.success) {
          utils_ui.showSuccess("拼场订单取消成功");
          const relatedBookingId = response.relatedBookingId || response.bookingOrderId;
          if (relatedBookingId) {
            try {
              const actualVenueId = response.venueId || ((_a = response.venue) == null ? void 0 : _a.id);
              const actualBookingDate = response.bookingDate || response.date;
              const startTime = response.startTime;
              const endTime = response.endTime;
              const bookingType = response.bookingType || "sharing";
              const venueStoreInst = ((_c = (_b = common_vendor.index.$store) == null ? void 0 : _b.state) == null ? void 0 : _c.venue) || {};
              const cacheKey = `${actualVenueId}_${actualBookingDate}`;
              if ((_d = venueStoreInst == null ? void 0 : venueStoreInst.cache) == null ? void 0 : _d.timeSlots) {
                venueStoreInst.cache.timeSlots.delete(cacheKey);
              }
              if (typeof (venueStoreInst == null ? void 0 : venueStoreInst.setTimeSlots) === "function") {
                venueStoreInst.setTimeSlots([]);
              }
              if (typeof common_vendor.index !== "undefined" && common_vendor.index.$emit) {
                common_vendor.index.$emit("timeslot-updated", {
                  venueId: actualVenueId,
                  date: actualBookingDate,
                  action: "booking-cancelled",
                  startTime,
                  endTime,
                  bookingType,
                  releasedTimeSlotIds: [],
                  immediate: true,
                  source: "sharingStore.cancelSharingOrder",
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                });
              }
            } catch (clearErr) {
            }
          }
          common_vendor.index.$emit("orderCancelled", {
            sharingOrderId: orderId,
            bookingOrderId: relatedBookingId,
            orderId: relatedBookingId || orderId,
            type: "sharing",
            source: "sharingStore"
          });
          common_vendor.index.$emit("sharingDataChanged", { action: "cancelled", orderId });
          await this.getMyOrders();
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:788", "[SharingStore] 取消拼场订单失败:", error);
        utils_ui.showError(error.message || "取消拼场订单失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 取消拼场申请
    async cancelSharingRequest(requestId) {
      try {
        this.setLoading(true);
        const response = await api_sharing.cancelSharingRequest(requestId);
        if (response && response.success) {
          utils_ui.showSuccess("拼场申请取消成功");
          await this.getSentRequestsList();
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/sharing.js:812", "[SharingStore] 取消拼场申请失败:", error);
        utils_ui.showError(error.message || "取消拼场申请失败");
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    // 清除订单详情
    clearOrderDetail() {
      this.sharingOrderDetail = null;
    },
    // 重置分页
    resetPagination() {
      this.pagination = {
        current: 1,
        pageSize: 10,
        total: 0,
        totalPages: 1
      };
    }
  }
});
exports.useSharingStore = useSharingStore;
//# sourceMappingURL=../../.sourcemap/mp-weixin/stores/sharing.js.map
