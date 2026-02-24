"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_sharing = require("../../stores/sharing.js");
const stores_user = require("../../stores/user.js");
const _sfc_main = {
  name: "MyOrders",
  data() {
    return {
      sharingStore: null,
      userStore: null,
      currentTab: "created",
      loading: false,
      error: null,
      createdOrders: [],
      appliedOrders: [],
      successOrders: [],
      notifications: [],
      // 通知数组
      // 缓存优化相关字段
      lastLoadTime: 0,
      cacheTimeout: 3e4,
      // 30秒缓存
      isLoading: false
    };
  },
  computed: {
    userInfo() {
      var _a;
      return ((_a = this.userStore) == null ? void 0 : _a.userInfoGetter) || {};
    },
    // 按时间倒序排列的订单列表
    sortedCreatedOrders() {
      return [...this.createdOrders].sort((a, b) => {
        var _a, _b;
        const dateA = new Date(((_a = a.createdAt) == null ? void 0 : _a.replace(/-/g, "/")) || 0);
        const dateB = new Date(((_b = b.createdAt) == null ? void 0 : _b.replace(/-/g, "/")) || 0);
        return dateB.getTime() - dateA.getTime();
      });
    },
    sortedAppliedOrders() {
      return [...this.appliedOrders].sort((a, b) => {
        var _a, _b;
        const dateA = new Date(((_a = a.createdAt) == null ? void 0 : _a.replace(/-/g, "/")) || 0);
        const dateB = new Date(((_b = b.createdAt) == null ? void 0 : _b.replace(/-/g, "/")) || 0);
        return dateB.getTime() - dateA.getTime();
      });
    },
    sortedSuccessOrders() {
      return [...this.successOrders].sort((a, b) => {
        var _a, _b;
        const dateA = new Date(((_a = a.createdAt) == null ? void 0 : _a.replace(/-/g, "/")) || 0);
        const dateB = new Date(((_b = b.createdAt) == null ? void 0 : _b.replace(/-/g, "/")) || 0);
        return dateB.getTime() - dateA.getTime();
      });
    },
    tabs() {
      return [
        {
          value: "created",
          label: "我创建的",
          count: this.sortedCreatedOrders.length
        },
        {
          value: "applied",
          label: "我申请的",
          count: this.sortedAppliedOrders.length
        },
        {
          value: "success",
          label: "拼场成功",
          count: this.sortedSuccessOrders.length
        }
      ];
    }
  },
  onLoad() {
    this.sharingStore = stores_sharing.useSharingStore();
    this.userStore = stores_user.useUserStore();
    this.loadData();
    this.checkForNewNotifications();
  },
  onShow() {
    this.loadDataWithCache();
    this.checkForNewNotifications();
  },
  onPullDownRefresh() {
    this.loadData().finally(() => {
      common_vendor.index.stopPullDownRefresh();
    });
  },
  methods: {
    // 🚀 缓存优化的数据加载
    async loadDataWithCache() {
      if (this.isLoading) {
        return;
      }
      const now = Date.now();
      const hasData = this.createdOrders.length > 0 || this.appliedOrders.length > 0 || this.successOrders.length > 0;
      if (hasData && this.lastLoadTime && now - this.lastLoadTime < this.cacheTimeout) {
        return;
      }
      await this.loadData();
    },
    async loadData() {
      this.isLoading = true;
      this.loading = true;
      this.error = null;
      if (typeof window !== "undefined" && window.cacheManager) {
        window.cacheManager.clearUrl("/sharing-orders/my-created");
        window.cacheManager.clearUrl("/shared/my-requests");
      }
      try {
        await Promise.all([
          this.loadCreatedOrders(),
          this.loadAppliedOrders(),
          this.loadSuccessOrders()
        ]);
        this.lastLoadTime = Date.now();
        this.$forceUpdate();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/my-orders.vue:398", "加载数据失败:", error);
        this.error = error.message || "加载失败";
      } finally {
        this.loading = false;
        this.isLoading = false;
      }
    },
    async loadCreatedOrders() {
      try {
        const response = await this.sharingStore.getMyOrders();
        let orders = [];
        if (Array.isArray(response)) {
          orders = response;
        } else if (response && Array.isArray(response.data)) {
          orders = response.data;
        } else if (response && Array.isArray(response.list)) {
          orders = response.list;
        }
        this.createdOrders = orders;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/my-orders.vue:424", "❌ 加载创建的订单失败:", error);
        this.createdOrders = [];
      }
    },
    async loadAppliedOrders() {
      try {
        const response = await this.sharingStore.getSentRequestsList();
        let requests = [];
        if (Array.isArray(response)) {
          requests = response;
        } else if (response && Array.isArray(response.data)) {
          requests = response.data;
        } else if (response && Array.isArray(response.list)) {
          requests = response.list;
        }
        this.appliedOrders = requests;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/my-orders.vue:446", "加载申请的订单失败:", error);
        this.appliedOrders = [];
      }
    },
    async loadSuccessOrders() {
      try {
        const createdResponse = await this.sharingStore.getMyOrders();
        const createdOrders = createdResponse.data || createdResponse.list || createdResponse || [];
        const myCreatedSuccessOrders = createdOrders.filter(
          (order) => order.status === "FULL" || order.status === "CONFIRMED" || order.status === "SHARING_SUCCESS"
        );
        const appliedResponse = await this.sharingStore.getSentRequestsList();
        const appliedRequests = appliedResponse.data || appliedResponse.list || appliedResponse || [];
        const myAppliedSuccessOrders = appliedRequests.filter((request) => {
          const isPaid = request.status === "PAID";
          return isPaid;
        }).map((request) => {
          return {
            // 使用申请记录中的订单信息，而不是sharingOrder
            id: request.orderId || request.id,
            orderNo: request.orderNo || `REQ_${request.id}`,
            venueName: request.venueName || "未知场馆",
            venueId: request.venueId,
            venueLocation: request.venueLocation || "位置未知",
            status: "SHARING_SUCCESS",
            // 申请成功的订单状态
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
            // 拼场相关信息
            teamName: request.applicantTeamName || request.teamName || "未知队伍",
            contactInfo: request.applicantContact || request.contactInfo || "未知联系方式",
            currentParticipants: request.currentParticipants || 2,
            maxParticipants: request.maxParticipants || 2,
            description: request.description || "拼场申请",
            // 价格信息
            totalPrice: request.totalPrice || 0,
            pricePerTeam: request.paymentAmount || request.totalPrice || 0,
            paymentAmount: request.paymentAmount || 0,
            // 时间信息
            bookingDate: request.bookingDate,
            startTime: request.startTime,
            endTime: request.endTime,
            bookingTime: request.bookingTime,
            // 标记这是申请成功的订单
            isAppliedOrder: true,
            applicationId: request.id
          };
        });
        this.successOrders = [...myCreatedSuccessOrders, ...myAppliedSuccessOrders];
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/my-orders.vue:510", "加载成功订单失败:", error);
        this.successOrders = [];
      }
    },
    switchTab(tab) {
      this.currentTab = tab;
    },
    goBack() {
      common_vendor.index.navigateBack();
    },
    goToDetail(sharingId) {
      if (!sharingId) {
        common_vendor.index.__f__("error", "at pages/sharing/my-orders.vue:525", "拼场订单ID为空，无法跳转");
        common_vendor.index.showToast({
          title: "订单信息错误",
          icon: "error"
        });
        return;
      }
      common_vendor.index.navigateTo({
        url: `/pages/sharing/detail?id=${sharingId}`
      });
    },
    goToRequestDetail(request) {
      const targetId = request.sharingOrderId || request.orderId;
      if (targetId) {
        common_vendor.index.navigateTo({
          url: `/pages/sharing/detail?id=${targetId}`
        });
      } else {
        common_vendor.index.__f__("error", "at pages/sharing/my-orders.vue:545", "申请记录缺少sharingOrderId和orderId字段");
        common_vendor.index.showToast({
          title: "申请信息错误",
          icon: "error"
        });
      }
    },
    goToManage(sharingId) {
      common_vendor.index.navigateTo({
        url: `/pages/sharing/manage?id=${sharingId}`
      });
    },
    goToVenueList() {
      common_vendor.index.switchTab({
        url: "/pages/venue/list"
      });
    },
    goToBrowse() {
      common_vendor.index.switchTab({
        url: "/pages/sharing/list"
      });
    },
    async cancelOrder(orderId) {
      try {
        await common_vendor.index.showModal({
          title: "确认取消",
          content: "确定要取消这个拼场订单吗？"
        });
        common_vendor.index.showLoading({ title: "取消中..." });
        await this.sharingStore.cancelSharingOrder(orderId);
        common_vendor.index.hideLoading();
        this.addNotification("info", "已取消拼场订单");
        this.addNotification("info", "已取消拼场申请");
        common_vendor.index.showToast({
          title: "取消成功",
          icon: "success"
        });
        try {
          await this.sharingStore.refreshMySharingOrders();
        } catch (e) {
        }
        this.loadData();
      } catch (error) {
        common_vendor.index.hideLoading();
        if (error.errMsg !== "showModal:fail cancel") {
          this.addNotification("error", "取消申请失败");
          common_vendor.index.showToast({
            title: error.message || "取消失败",
            icon: "error"
          });
        }
      }
    },
    async cancelRequest(requestId) {
      try {
        await common_vendor.index.showModal({
          title: "确认取消",
          content: "确定要取消这个申请吗？"
        });
        common_vendor.index.showLoading({ title: "取消中..." });
        await this.sharingStore.cancelSharingRequest(requestId);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "取消成功",
          icon: "success"
        });
        this.loadData();
      } catch (error) {
        common_vendor.index.hideLoading();
        if (error.errMsg !== "showModal:fail cancel") {
          common_vendor.index.showToast({
            title: error.message || "取消失败",
            icon: "error"
          });
        }
      }
    },
    getStatusClass(status) {
      const statusMap = {
        "OPEN": "open",
        "FULL": "full",
        "CONFIRMED": "confirmed",
        "CANCELLED": "cancelled",
        "EXPIRED": "expired"
      };
      return statusMap[status] || "unknown";
    },
    getStatusText(status) {
      const statusMap = {
        "OPEN": "开放中",
        "FULL": "已满员",
        "CONFIRMED": "已确认",
        "CANCELLED": "已取消",
        "EXPIRED": "已过期",
        "SHARING_SUCCESS": "拼场成功"
      };
      return statusMap[status] || "未知状态";
    },
    getRequestStatusClass(status) {
      const statusMap = {
        "PENDING": "pending",
        "APPROVED": "approved",
        "REJECTED": "rejected",
        "CANCELLED": "cancelled"
      };
      return statusMap[status] || "unknown";
    },
    getRequestStatusText(status) {
      const statusMap = {
        "PENDING": "待审核",
        "APPROVED": "已通过",
        "APPROVED_PENDING_PAYMENT": "已批准待支付",
        "PAID": "拼场成功",
        "REJECTED": "已拒绝",
        "CANCELLED": "已取消",
        "TIMEOUT_CANCELLED": "超时取消"
      };
      return statusMap[status] || "未知状态";
    },
    // 格式化日期显示
    formatDate(dateStr) {
      if (!dateStr)
        return "日期未知";
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime()))
          return "日期未知";
        return `${date.getMonth() + 1}月${date.getDate()}日`;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/my-orders.vue:693", "日期格式化错误:", error);
        return "日期未知";
      }
    },
    // 格式化时间段显示
    formatTimeSlot(startTime, endTime) {
      if (!startTime || !endTime)
        return "时间未知";
      const formatTime = (timeStr) => {
        if (!timeStr)
          return "";
        if (timeStr.length > 5 && timeStr.includes(":")) {
          return timeStr.substring(0, 5);
        }
        return timeStr;
      };
      const formattedStart = formatTime(startTime);
      const formattedEnd = formatTime(endTime);
      return `${formattedStart}-${formattedEnd}`;
    },
    // 格式化时间范围显示（与预约订单保持一致）
    formatTimeRange(sharing) {
      if (!sharing)
        return "时间未知";
      if (sharing.startTime && sharing.endTime) {
        return `${sharing.startTime} - ${sharing.endTime}`;
      }
      if (sharing.bookingTime) {
        try {
          let bookingTimeStr = sharing.bookingTime;
          if (typeof bookingTimeStr === "string" && bookingTimeStr.includes(" ") && !bookingTimeStr.includes("T")) {
            bookingTimeStr = bookingTimeStr.replace(" ", "T");
          }
          const bookingTime = new Date(bookingTimeStr);
          const startTimeStr = bookingTime.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          });
          if (sharing.endTime && typeof sharing.endTime === "string" && sharing.endTime.match(/^\d{2}:\d{2}$/)) {
            return `${startTimeStr} - ${sharing.endTime}`;
          }
          return startTimeStr;
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/sharing/my-orders.vue:752", "虚拟订单时间格式化错误:", error);
          return "时间格式错误";
        }
      }
      const startTime = sharing.startTime || sharing.bookingStartTime || sharing.start_time;
      const endTime = sharing.endTime || sharing.bookingEndTime || sharing.end_time;
      if (!startTime || !endTime) {
        return "时间待定";
      }
      const formatTime = (timeStr) => {
        if (!timeStr)
          return "";
        if (timeStr.length > 5 && timeStr.includes(":")) {
          return timeStr.substring(0, 5);
        }
        return timeStr;
      };
      const formattedStart = formatTime(startTime);
      const formattedEnd = formatTime(endTime);
      if (timeSlotCount > 1) {
        return `${formattedStart} - ${formattedEnd} (${timeSlotCount}个时段)`;
      }
      return `${formattedStart} - ${formattedEnd}`;
    },
    formatCreateTime(dateTime) {
      if (!dateTime)
        return "";
      let formattedDateTime = dateTime;
      if (typeof dateTime === "string" && dateTime.includes(" ") && dateTime.includes("-")) {
        formattedDateTime = dateTime.replace(/-/g, "/");
      }
      const date = new Date(formattedDateTime);
      if (isNaN(date.getTime())) {
        return dateTime;
      }
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${month}-${day} ${hours}:${minutes}`;
    },
    // 格式化价格显示
    formatPrice(price) {
      if (!price && price !== 0)
        return "0";
      const numPrice = Number(price);
      if (isNaN(numPrice))
        return "0";
      return numPrice.toFixed(2);
    },
    // 计算每队费用
    getPerTeamPrice(order) {
      if (!order)
        return "0";
      const isVirtualOrder = order.id && order.id < 0;
      if (isVirtualOrder) {
        const amount = order.paymentAmount || 0;
        return this.formatPrice(amount);
      }
      if (order.pricePerPerson) {
        return this.formatPrice(order.pricePerPerson);
      }
      if (order.paymentAmount) {
        return this.formatPrice(order.paymentAmount);
      }
      const totalPrice = order.totalPrice || order.price || 0;
      const perTeamPrice = totalPrice / 2;
      return this.formatPrice(perTeamPrice);
    },
    // 添加通知
    addNotification(type, message) {
      const notification = {
        type,
        // 'success', 'info', 'warning', 'error'
        message,
        timestamp: Date.now()
      };
      this.notifications.unshift(notification);
      setTimeout(() => {
        this.dismissNotification(0);
      }, 5e3);
    },
    // 移除通知
    dismissNotification(index) {
      this.notifications.splice(index, 1);
    },
    // 获取通知图标
    getNotificationIcon(type) {
      const icons = {
        success: "✅",
        info: "ℹ️",
        warning: "⚠️",
        error: "❌"
      };
      return icons[type] || "ℹ️";
    },
    // 检查新通知
    async checkForNewNotifications() {
      try {
        const appliedRequests = await this.sharingStore.getSentRequestsList();
        const requests = appliedRequests.data || appliedRequests.list || appliedRequests || [];
        const lastStatusKey = "sharing_request_status";
        const lastStatus = common_vendor.index.getStorageSync(lastStatusKey) || {};
        requests.forEach((request) => {
          const requestId = request.id;
          const currentStatus = request.status;
          const lastRequestStatus = lastStatus[requestId];
          if (lastRequestStatus && lastRequestStatus !== currentStatus) {
            if (currentStatus === "APPROVED") {
              this.addNotification("success", `您的拼场申请已被批准！队伍：${request.teamName}`);
            } else if (currentStatus === "REJECTED") {
              this.addNotification("warning", `您的拼场申请已被拒绝。队伍：${request.teamName}`);
            }
          }
          lastStatus[requestId] = currentStatus;
        });
        common_vendor.index.setStorageSync(lastStatusKey, lastStatus);
        const createdOrders = await this.sharingStore.getMyOrders();
        const orders = createdOrders.data || createdOrders.list || createdOrders || [];
        const lastApplicationsKey = "sharing_applications";
        const lastApplications = common_vendor.index.getStorageSync(lastApplicationsKey) || {};
        for (const order of orders) {
          if (order.status === "OPEN") {
            try {
              const applicationsResponse = await this.sharingStore.getReceivedRequestsList({ orderId: order.id });
              const applications = applicationsResponse.data || applicationsResponse.list || applicationsResponse || [];
              const currentApplicationCount = applications.filter((app) => app.status === "PENDING").length;
              const lastApplicationCount = lastApplications[order.id] || 0;
              if (currentApplicationCount > lastApplicationCount) {
                const newApplications = currentApplicationCount - lastApplicationCount;
                this.addNotification("info", `您的拼场「${order.teamName}」收到了 ${newApplications} 个新申请`);
              }
              lastApplications[order.id] = currentApplicationCount;
            } catch (error) {
            }
          }
        }
        common_vendor.index.setStorageSync(lastApplicationsKey, lastApplications);
      } catch (error) {
      }
    },
    formatDateTime(dateTimeStr) {
      if (!dateTimeStr)
        return "";
      try {
        let dateString = dateTimeStr;
        if (typeof dateTimeStr === "string") {
          dateString = dateTimeStr.replace(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2}:\d{2})$/, "$1T$2");
          dateString = dateString.replace(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2})$/, "$1T$2");
        }
        const date = new Date(dateString);
        if (isNaN(date.getTime()))
          return "--";
        return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/my-orders.vue:964", "日期格式化错误:", error);
        return "--";
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.notifications.length > 0
  }, $data.notifications.length > 0 ? {
    b: common_vendor.f($data.notifications, (notification, index, i0) => {
      return {
        a: common_vendor.t($options.getNotificationIcon(notification.type)),
        b: common_vendor.t(notification.message),
        c: index,
        d: common_vendor.n(notification.type),
        e: common_vendor.o(($event) => $options.dismissNotification(index), index)
      };
    })
  } : {}, {
    c: common_vendor.o((...args) => $options.goBack && $options.goBack(...args)),
    d: common_vendor.f($options.tabs, (tab, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(tab.label),
        b: tab.count > 0
      }, tab.count > 0 ? {
        c: common_vendor.t(tab.count)
      } : {}, {
        d: tab.value,
        e: $data.currentTab === tab.value ? 1 : "",
        f: common_vendor.o(($event) => $options.switchTab(tab.value), tab.value)
      });
    }),
    e: $data.loading
  }, $data.loading ? {} : $data.error ? {
    g: common_vendor.t($data.error),
    h: common_vendor.o((...args) => $options.loadData && $options.loadData(...args))
  } : common_vendor.e({
    i: $data.currentTab === "created"
  }, $data.currentTab === "created" ? common_vendor.e({
    j: $options.sortedCreatedOrders.length > 0
  }, $options.sortedCreatedOrders.length > 0 ? {
    k: common_vendor.f($options.sortedCreatedOrders, (order, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(order.venueName),
        b: common_vendor.t($options.getStatusText(order.status)),
        c: common_vendor.n($options.getStatusClass(order.status)),
        d: common_vendor.t($options.formatTimeRange(order)),
        e: common_vendor.t(order.venueLocation || "位置未知"),
        f: common_vendor.t(order.teamName),
        g: common_vendor.t(order.currentParticipants || 0),
        h: common_vendor.t(order.maxParticipants || 2),
        i: common_vendor.t($options.formatPrice($options.getPerTeamPrice(order))),
        j: common_vendor.t($options.formatCreateTime(order.createdAt)),
        k: order.status === "OPEN"
      }, order.status === "OPEN" ? {
        l: common_vendor.o(($event) => $options.goToManage(order.id), order.id)
      } : {}, {
        m: order.status === "OPEN"
      }, order.status === "OPEN" ? {
        n: common_vendor.o(($event) => $options.cancelOrder(order.id), order.id)
      } : {}, {
        o: order.id,
        p: common_vendor.o(($event) => $options.goToDetail(order.id), order.id)
      });
    })
  } : {
    l: common_vendor.o((...args) => $options.goToVenueList && $options.goToVenueList(...args))
  }) : {}, {
    m: $data.currentTab === "applied"
  }, $data.currentTab === "applied" ? common_vendor.e({
    n: $options.sortedAppliedOrders.length > 0
  }, $options.sortedAppliedOrders.length > 0 ? {
    o: common_vendor.f($options.sortedAppliedOrders, (request, k0, i0) => {
      var _a, _b;
      return common_vendor.e({
        a: common_vendor.t(request.venueName),
        b: common_vendor.t($options.getRequestStatusText(request.status)),
        c: common_vendor.n($options.getRequestStatusClass(request.status)),
        d: common_vendor.t($options.formatTimeRange(request.sharingOrder || request)),
        e: common_vendor.t(request.venueLocation || ((_a = request.sharingOrder) == null ? void 0 : _a.venueLocation) || request.venueName || ((_b = request.sharingOrder) == null ? void 0 : _b.venueName) || "位置未知"),
        f: common_vendor.t(request.teamName),
        g: common_vendor.t($options.formatPrice($options.getPerTeamPrice(request.sharingOrder || request))),
        h: common_vendor.t($options.formatCreateTime(request.createdAt)),
        i: request.responseMessage
      }, request.responseMessage ? {
        j: common_vendor.t(request.responseMessage)
      } : {}, {
        k: request.status === "PENDING"
      }, request.status === "PENDING" ? {
        l: common_vendor.o(($event) => $options.cancelRequest(request.id), request.id)
      } : {}, {
        m: request.id,
        n: common_vendor.o(($event) => $options.goToRequestDetail(request), request.id)
      });
    })
  } : {
    p: common_vendor.o((...args) => $options.goToBrowse && $options.goToBrowse(...args))
  }) : {}, {
    q: $data.currentTab === "success"
  }, $data.currentTab === "success" ? common_vendor.e({
    r: $options.sortedSuccessOrders.length > 0
  }, $options.sortedSuccessOrders.length > 0 ? {
    s: common_vendor.f($options.sortedSuccessOrders, (order, k0, i0) => {
      return {
        a: common_vendor.t(order.venueName),
        b: common_vendor.t($options.formatTimeRange(order)),
        c: common_vendor.t(order.venueLocation || order.venueName || "位置未知"),
        d: common_vendor.t(order.teamName),
        e: common_vendor.t(order.currentParticipants),
        f: common_vendor.t(order.maxParticipants),
        g: common_vendor.t($options.formatPrice($options.getPerTeamPrice(order))),
        h: common_vendor.t(order.contactInfo),
        i: order.id,
        j: common_vendor.o(($event) => $options.goToDetail(order.id), order.id)
      };
    })
  } : {
    t: common_vendor.o((...args) => $options.goToBrowse && $options.goToBrowse(...args))
  }) : {}), {
    f: $data.error
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-8c445ed0"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/sharing/my-orders.js.map
