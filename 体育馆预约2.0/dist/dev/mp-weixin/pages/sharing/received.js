"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_sharing = require("../../stores/sharing.js");
const stores_user = require("../../stores/user.js");
const utils_helpers = require("../../utils/helpers.js");
const _sfc_main = {
  name: "ReceivedRequests",
  data() {
    return {
      sharingStore: null,
      userStore: null,
      currentFilter: "all",
      error: "",
      approveTarget: null,
      rejectTarget: null,
      rejectReason: "",
      requests: [],
      filterTabs: [
        { label: "全部", value: "all", count: 0 },
        { label: "待处理", value: "pending", count: 0 },
        { label: "已同意", value: "approved", count: 0 },
        { label: "已拒绝", value: "rejected", count: 0 }
      ],
      // 缓存优化相关字段
      lastRefreshTime: 0,
      cacheTimeout: 3e4,
      // 30秒缓存
      isRefreshing: false,
      // 弹窗状态控制
      internalApprovePopupOpened: false,
      internalRejectPopupOpened: false,
      approvePopupPosition: "",
      rejectPopupPosition: "",
      _approvePopupRef: null,
      _rejectPopupRef: null
    };
  },
  computed: {
    loading() {
      var _a;
      return ((_a = this.sharingStore) == null ? void 0 : _a.isLoading) || false;
    },
    userInfo() {
      var _a;
      return ((_a = this.userStore) == null ? void 0 : _a.userInfoGetter) || {};
    },
    // 过滤后的申请列表
    filteredRequests() {
      if (this.currentFilter === "all") {
        return this.requests;
      }
      const statusMap = {
        "pending": "PENDING",
        "approved": "APPROVED",
        "rejected": "REJECTED"
      };
      return this.requests.filter(
        (request) => request.status === statusMap[this.currentFilter]
      );
    }
  },
  onLoad() {
    this.sharingStore = stores_sharing.useSharingStore();
    this.userStore = stores_user.useUserStore();
    this.internalApprovePopupOpened = false;
    this.internalRejectPopupOpened = false;
    this.approvePopupPosition = "";
    this.rejectPopupPosition = "";
    this._approvePopupRef = null;
    this._rejectPopupRef = null;
    this.$nextTick(() => {
      if (this.$refs.approvePopup) {
        this._approvePopupRef = this.$refs.approvePopup;
      }
      if (this.$refs.rejectPopup) {
        this._rejectPopupRef = this.$refs.rejectPopup;
      }
    });
    this.loadRequests();
  },
  onShow() {
    this.loadRequestsWithCache();
  },
  onPullDownRefresh() {
    this.loadRequests().finally(() => {
      common_vendor.index.stopPullDownRefresh();
    });
  },
  onUnload() {
    this._approvePopupRef = null;
    this._rejectPopupRef = null;
  },
  mounted() {
  },
  methods: {
    // 返回上一页
    goBack() {
      common_vendor.index.navigateBack();
    },
    // 🚀 缓存优化的申请列表加载
    async loadRequestsWithCache() {
      if (this.isRefreshing) {
        return;
      }
      const now = Date.now();
      if (this.requests.length > 0 && this.lastRefreshTime && now - this.lastRefreshTime < this.cacheTimeout) {
        return;
      }
      await this.loadRequests();
    },
    // 加载申请列表
    async loadRequests() {
      this.isRefreshing = true;
      try {
        this.error = "";
        const response = await this.sharingStore.getReceivedRequestsList();
        const requests = (response == null ? void 0 : response.data) || (response == null ? void 0 : response.list) || response || [];
        this.requests = Array.isArray(requests) ? requests : [];
        this.updateFilterCounts();
        this.lastRefreshTime = Date.now();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/received.vue:362", "收到申请页面：加载申请列表失败:", error);
        this.error = error.message || "加载失败，请重试";
        this.requests = [];
      } finally {
        this.isRefreshing = false;
      }
    },
    // 更新筛选标签计数
    updateFilterCounts() {
      const counts = {
        all: this.requests.length,
        pending: this.requests.filter((r) => r.status === "PENDING").length,
        approved: this.requests.filter((r) => r.status === "APPROVED").length,
        rejected: this.requests.filter((r) => r.status === "REJECTED").length
      };
      this.filterTabs.forEach((tab) => {
        tab.count = counts[tab.value] || 0;
      });
    },
    // 切换筛选
    switchFilter(filter) {
      this.currentFilter = filter;
    },
    // 显示同意确认弹窗
    showApproveConfirm(request) {
      this.approveTarget = request;
      common_vendor.index.showModal({
        title: "同意申请",
        content: `确定同意 ${(request == null ? void 0 : request.applicantName) || ""} 的申请吗？`,
        confirmText: "同意",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            this.confirmApprove();
          } else {
            this.approveTarget = null;
          }
        }
      });
    },
    // 显示同意确认弹窗（兼容微信小程序）
    showApprovePopup() {
      this.internalApprovePopupOpened = true;
      this.$nextTick(() => {
        const attemptOpen = () => {
          if (this.$refs.approvePopup && typeof this.$refs.approvePopup.open === "function") {
            this.$refs.approvePopup.open();
            return true;
          }
          if (Array.isArray(this.$refs.approvePopup) && this.$refs.approvePopup.length > 0) {
            this.$refs.approvePopup[0].open();
            return true;
          }
          return false;
        };
        attemptOpen();
      });
    },
    // 显示拒绝对话框（兼容微信小程序）
    showRejectDialog(request) {
      this.rejectTarget = request;
      this.rejectReason = "";
      common_vendor.index.showModal({
        title: "拒绝申请",
        content: `确定拒绝 ${(request == null ? void 0 : request.applicantName) || ""} 的申请吗？`,
        confirmText: "拒绝",
        confirmColor: "#ff4d4f",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            this.confirmReject();
          } else {
            this.closeRejectDialog();
          }
        }
      });
    },
    // 显示拒绝对话框（兼容微信小程序）
    showRejectPopup() {
      this.internalRejectPopupOpened = true;
      this.$nextTick(() => {
        const attemptOpen = () => {
          if (this.$refs.rejectPopup && typeof this.$refs.rejectPopup.open === "function") {
            this.$refs.rejectPopup.open();
            return true;
          }
          if (Array.isArray(this.$refs.rejectPopup) && this.$refs.rejectPopup.length > 0) {
            this.$refs.rejectPopup[0].open();
            return true;
          }
          return false;
        };
        attemptOpen();
      });
    },
    // 关闭拒绝对话框
    closeRejectDialog() {
      this.internalRejectPopupOpened = false;
      this.rejectTarget = null;
      this.rejectReason = "";
    },
    // 关闭拒绝对话框（兼容微信小程序）
    closeRejectPopup() {
      let windowInfo, deviceInfo, appBaseInfo;
      try {
        windowInfo = common_vendor.index.getWindowInfo ? common_vendor.index.getWindowInfo() : {};
        deviceInfo = common_vendor.index.getDeviceInfo ? common_vendor.index.getDeviceInfo() : {};
        appBaseInfo = common_vendor.index.getAppBaseInfo ? common_vendor.index.getAppBaseInfo() : {};
      } catch (e) {
        windowInfo = deviceInfo = appBaseInfo = {};
      }
      const attemptClose = (retryCount = 0) => {
        try {
          if (this.$refs.rejectPopup && typeof this.$refs.rejectPopup.close === "function") {
            this.$refs.rejectPopup.close();
            this.internalRejectPopupOpened = false;
            return true;
          }
          if (Array.isArray(this.$refs.rejectPopup) && this.$refs.rejectPopup.length > 0) {
            const popup = this.$refs.rejectPopup[0];
            if (popup && typeof popup.close === "function") {
              popup.close();
              this.internalRejectPopupOpened = false;
              return true;
            }
          }
          if (this._rejectPopupRef && typeof this._rejectPopupRef.close === "function") {
            this._rejectPopupRef.close();
            this.internalRejectPopupOpened = false;
            return true;
          }
          if (appBaseInfo.uniPlatform === "mp-weixin" || deviceInfo.platform === "devtools") {
            if (this.$scope && typeof this.$scope.selectComponent === "function") {
              const popup = this.$scope.selectComponent("#rejectPopup");
              if (popup && typeof popup.close === "function") {
                popup.close();
                this.internalRejectPopupOpened = false;
                return true;
              }
            }
          }
          if (this.$children && this.$children.length > 0) {
            for (let child of this.$children) {
              if (child.$options && child.$options.name === "UniPopup" && child.$refs && child.$refs.rejectPopup) {
                const popup = child.$refs.rejectPopup;
                if (popup && typeof popup.close === "function") {
                  popup.close();
                  this.internalRejectPopupOpened = false;
                  return true;
                }
              }
            }
          }
          return false;
        } catch (error) {
          return false;
        }
      };
      if (attemptClose()) {
        return;
      }
      setTimeout(() => {
        if (attemptClose(1)) {
          return;
        }
        try {
          this.rejectPopupPosition = "popup-force-hide";
          this.internalRejectPopupOpened = false;
          this.$forceUpdate();
        } catch (error) {
        }
      }, 100);
    },
    // 关闭同意确认弹窗（兼容微信小程序）
    closeApprovePopup() {
      let windowInfo, deviceInfo, appBaseInfo;
      try {
        windowInfo = common_vendor.index.getWindowInfo ? common_vendor.index.getWindowInfo() : {};
        deviceInfo = common_vendor.index.getDeviceInfo ? common_vendor.index.getDeviceInfo() : {};
        appBaseInfo = common_vendor.index.getAppBaseInfo ? common_vendor.index.getAppBaseInfo() : {};
      } catch (e) {
        windowInfo = deviceInfo = appBaseInfo = {};
      }
      const attemptClose = (retryCount = 0) => {
        try {
          if (this.$refs.approvePopup && typeof this.$refs.approvePopup.close === "function") {
            this.$refs.approvePopup.close();
            this.internalApprovePopupOpened = false;
            return true;
          }
          if (Array.isArray(this.$refs.approvePopup) && this.$refs.approvePopup.length > 0) {
            const popup = this.$refs.approvePopup[0];
            if (popup && typeof popup.close === "function") {
              popup.close();
              this.internalApprovePopupOpened = false;
              return true;
            }
          }
          if (this._approvePopupRef && typeof this._approvePopupRef.close === "function") {
            this._approvePopupRef.close();
            this.internalApprovePopupOpened = false;
            return true;
          }
          if (appBaseInfo.uniPlatform === "mp-weixin" || deviceInfo.platform === "devtools") {
            if (this.$scope && typeof this.$scope.selectComponent === "function") {
              const popup = this.$scope.selectComponent("#approvePopup");
              if (popup && typeof popup.close === "function") {
                popup.close();
                this.internalApprovePopupOpened = false;
                return true;
              }
            }
          }
          if (this.$children && this.$children.length > 0) {
            for (let child of this.$children) {
              if (child.$options && child.$options.name === "UniPopup" && child.$refs && child.$refs.approvePopup) {
                const popup = child.$refs.approvePopup;
                if (popup && typeof popup.close === "function") {
                  popup.close();
                  this.internalApprovePopupOpened = false;
                  return true;
                }
              }
            }
          }
          return false;
        } catch (error) {
          return false;
        }
      };
      if (attemptClose()) {
        return;
      }
      setTimeout(() => {
        if (attemptClose(1)) {
          return;
        }
        try {
          this.approvePopupPosition = "popup-force-hide";
          this.internalApprovePopupOpened = false;
          this.$forceUpdate();
        } catch (error) {
        }
      }, 100);
    },
    // 确认同意申请
    async confirmApprove() {
      if (!this.approveTarget)
        return;
      try {
        common_vendor.index.showLoading({ title: "处理中..." });
        await this.sharingStore.processSharingRequest({
          requestId: this.approveTarget.id,
          action: "approve"
        });
        const request = this.requests.find((r) => r.id === this.approveTarget.id);
        if (request) {
          request.status = "APPROVED";
          request.processedAt = (/* @__PURE__ */ new Date()).toISOString();
        }
        this.updateFilterCounts();
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "已同意申请",
          icon: "success"
        });
        this.approveTarget = null;
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/sharing/received.vue:712", "收到申请页面：同意申请失败:", error);
        common_vendor.index.showToast({
          title: error.message || "操作失败",
          icon: "error"
        });
      }
    },
    // 确认拒绝申请
    async confirmReject() {
      if (!this.rejectTarget)
        return;
      try {
        common_vendor.index.showLoading({ title: "处理中..." });
        await this.sharingStore.processSharingRequest({
          requestId: this.rejectTarget.id,
          action: "reject",
          reason: this.rejectReason
        });
        const request = this.requests.find((r) => r.id === this.rejectTarget.id);
        if (request) {
          request.status = "REJECTED";
          request.processedAt = (/* @__PURE__ */ new Date()).toISOString();
          request.rejectReason = this.rejectReason;
        }
        this.updateFilterCounts();
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "已拒绝申请",
          icon: "success"
        });
        this.closeRejectDialog();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/sharing/received.vue:755", "收到申请页面：拒绝申请失败:", error);
        common_vendor.index.showToast({
          title: error.message || "操作失败",
          icon: "error"
        });
      }
    },
    // 跳转到创建拼场
    goToCreateSharing() {
      common_vendor.index.navigateTo({
        url: "/pages/sharing/create"
      });
    },
    // 获取头像文字
    getAvatarText(name) {
      if (!name)
        return "?";
      return name.charAt(name.length - 1);
    },
    // 获取进度百分比
    getProgressPercent(current, max) {
      if (!max || max === 0)
        return 0;
      return Math.round(current / max * 100);
    },
    // 格式化活动时间
    formatActivityTime(request) {
      if (!request)
        return "--";
      const date = this.formatDate(request.bookingDate);
      const timeSlot = this.formatTimeSlot(request.startTime, request.endTime);
      return `${date} ${timeSlot}`;
    },
    // 格式化日期
    formatDate(date) {
      if (!date)
        return "--";
      return utils_helpers.formatDate(date, "MM-DD");
    },
    // 格式化日期时间
    formatDateTime(datetime) {
      if (!datetime)
        return "--";
      return utils_helpers.formatDateTime(datetime, "MM-DD HH:mm");
    },
    // 格式化时间段
    formatTimeSlot(startTime, endTime) {
      if (!startTime && !endTime) {
        return "时间未指定";
      }
      if (startTime && !endTime) {
        return startTime;
      }
      if (!startTime && endTime) {
        return endTime;
      }
      return `${startTime}-${endTime}`;
    },
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        "PENDING": "待处理",
        "APPROVED": "已同意",
        "APPROVED_PENDING_PAYMENT": "已批准待支付",
        "PAID": "拼场成功",
        "REJECTED": "已拒绝",
        "TIMEOUT_CANCELLED": "超时取消"
      };
      return statusMap[status] || "未知状态";
    },
    // 获取状态样式类
    getStatusClass(status) {
      const classMap = {
        "PENDING": "status-pending",
        "APPROVED": "status-approved",
        "REJECTED": "status-rejected"
      };
      return classMap[status] || "status-unknown";
    },
    // 获取空状态标题
    getEmptyTitle() {
      const titleMap = {
        "all": "暂无申请记录",
        "pending": "暂无待处理申请",
        "approved": "暂无已同意申请",
        "rejected": "暂无已拒绝申请"
      };
      return titleMap[this.currentFilter] || "暂无申请记录";
    },
    // 获取空状态描述
    getEmptyDesc() {
      const descMap = {
        "all": "还没有人申请您的拼场",
        "pending": "暂时没有需要处理的申请",
        "approved": "暂时没有同意的申请",
        "rejected": "暂时没有拒绝的申请"
      };
      return descMap[this.currentFilter] || "还没有人申请您的拼场";
    }
  }
};
if (!Array) {
  const _component_uni_popup_dialog = common_vendor.resolveComponent("uni-popup-dialog");
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  (_component_uni_popup_dialog + _component_uni_popup)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b;
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.goBack && $options.goBack(...args)),
    b: common_vendor.f($data.filterTabs, (tab, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(tab.label),
        b: tab.count > 0
      }, tab.count > 0 ? {
        c: common_vendor.t(tab.count)
      } : {}, {
        d: tab.value,
        e: $data.currentFilter === tab.value ? 1 : "",
        f: common_vendor.o(($event) => $options.switchFilter(tab.value), tab.value)
      });
    }),
    c: $options.loading
  }, $options.loading ? {} : $data.error ? {
    e: common_vendor.t($data.error),
    f: common_vendor.o((...args) => $options.loadRequests && $options.loadRequests(...args))
  } : common_vendor.e({
    g: $options.filteredRequests.length > 0
  }, $options.filteredRequests.length > 0 ? {
    h: common_vendor.f($options.filteredRequests, (request, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(request.venueName),
        b: common_vendor.t($options.getStatusText(request.status)),
        c: common_vendor.n($options.getStatusClass(request.status)),
        d: common_vendor.t(request.teamName),
        e: common_vendor.t($options.formatActivityTime(request)),
        f: common_vendor.t(request.pricePerPerson),
        g: common_vendor.t(request.currentParticipants),
        h: common_vendor.t(request.maxParticipants),
        i: common_vendor.t($options.getProgressPercent(request.currentParticipants, request.maxParticipants)),
        j: $options.getProgressPercent(request.currentParticipants, request.maxParticipants) + "%",
        k: request.applicantAvatar
      }, request.applicantAvatar ? {
        l: request.applicantAvatar
      } : {
        m: common_vendor.t($options.getAvatarText(request.applicantName))
      }, {
        n: common_vendor.t(request.applicantName),
        o: common_vendor.t($options.formatDateTime(request.createdAt)),
        p: request.message
      }, request.message ? {
        q: common_vendor.t(request.message)
      } : {}, {
        r: request.status === "PENDING"
      }, request.status === "PENDING" ? {
        s: common_vendor.o(($event) => $options.showRejectDialog(request), request.id),
        t: common_vendor.o(($event) => $options.showApproveConfirm(request), request.id)
      } : request.status === "APPROVED" ? {
        w: common_vendor.t($options.formatDateTime(request.processedAt))
      } : request.status === "REJECTED" ? common_vendor.e({
        y: common_vendor.t($options.formatDateTime(request.processedAt)),
        z: request.rejectReason
      }, request.rejectReason ? {
        A: common_vendor.t(request.rejectReason)
      } : {}) : {}, {
        v: request.status === "APPROVED",
        x: request.status === "REJECTED",
        B: request.id
      });
    })
  } : {
    i: common_vendor.t($options.getEmptyTitle()),
    j: common_vendor.t($options.getEmptyDesc()),
    k: common_vendor.o((...args) => $options.goToCreateSharing && $options.goToCreateSharing(...args))
  }), {
    d: $data.error,
    l: common_vendor.o($options.confirmApprove),
    m: common_vendor.o(() => {
      $data.approveTarget = null;
    }),
    n: common_vendor.p({
      type: "info",
      title: "同意申请",
      content: `确定同意 ${(_a = $data.approveTarget) == null ? void 0 : _a.applicantName} 的申请吗？`
    }),
    o: common_vendor.sr("approvePopup", "5b9a0501-0"),
    p: $data.internalApprovePopupOpened,
    q: common_vendor.n($data.approvePopupPosition),
    r: common_vendor.p({
      id: "approvePopup",
      type: "dialog",
      ["mask-click"]: false
    }),
    s: common_vendor.o((...args) => $options.closeRejectDialog && $options.closeRejectDialog(...args)),
    t: common_vendor.t((_b = $data.rejectTarget) == null ? void 0 : _b.applicantName),
    v: $data.rejectReason,
    w: common_vendor.o(($event) => $data.rejectReason = $event.detail.value),
    x: common_vendor.t($data.rejectReason.length),
    y: common_vendor.o((...args) => $options.closeRejectDialog && $options.closeRejectDialog(...args)),
    z: common_vendor.o((...args) => $options.confirmReject && $options.confirmReject(...args)),
    A: common_vendor.sr("rejectPopup", "5b9a0501-2"),
    B: $data.internalRejectPopupOpened,
    C: common_vendor.n($data.rejectPopupPosition),
    D: common_vendor.p({
      id: "rejectPopup",
      type: "bottom",
      ["mask-click"]: false
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-5b9a0501"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/sharing/received.js.map
