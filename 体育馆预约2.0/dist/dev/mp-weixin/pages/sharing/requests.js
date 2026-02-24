"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_sharing = require("../../stores/sharing.js");
const stores_user = require("../../stores/user.js");
const utils_helpers = require("../../utils/helpers.js");
if (!Array) {
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  _component_uni_popup();
}
const cacheTimeout = 3e4;
const _sfc_main = {
  __name: "requests",
  setup(__props) {
    const sharingStore = stores_sharing.useSharingStore();
    const userStore = stores_user.useUserStore();
    const currentFilter = common_vendor.ref("all");
    const error = common_vendor.ref("");
    const cancelTarget = common_vendor.ref(null);
    const showCancelPopup = common_vendor.ref(false);
    const requests = common_vendor.ref([]);
    const filterTabs = common_vendor.ref([
      { label: "全部", value: "all", count: 0 },
      { label: "待处理", value: "pending", count: 0 },
      { label: "待支付", value: "approved_pending_payment", count: 0 },
      { label: "已完成", value: "approved", count: 0 },
      { label: "已拒绝", value: "rejected", count: 0 },
      { label: "已超时", value: "timeout_cancelled", count: 0 }
    ]);
    const lastRefreshTime = common_vendor.ref(0);
    const isRefreshing = common_vendor.ref(false);
    const cancelPopup = common_vendor.ref(null);
    const loading = common_vendor.computed(() => sharingStore.isLoading || false);
    common_vendor.computed(() => userStore.userInfoGetter || {});
    const filteredRequests = common_vendor.computed(() => {
      if (currentFilter.value === "all") {
        return requests.value;
      }
      const statusMap = {
        "pending": "PENDING",
        "approved_pending_payment": "APPROVED_PENDING_PAYMENT",
        "approved": "APPROVED",
        "rejected": "REJECTED",
        "timeout_cancelled": "TIMEOUT_CANCELLED"
      };
      return requests.value.filter(
        (request) => request.status === statusMap[currentFilter.value]
      );
    });
    common_vendor.onLoad(() => {
      loadRequests();
    });
    common_vendor.onShow(() => {
      loadRequestsWithCache();
    });
    common_vendor.onPullDownRefresh(() => {
      loadRequests(true).finally(() => {
        common_vendor.index.stopPullDownRefresh();
      });
    });
    const showCancelConfirm = (request) => {
      cancelTarget.value = request;
      common_vendor.index.showModal({
        title: "取消申请",
        content: `确定要取消对 ${request ? request.teamName || request.applicantTeamName || "" : ""} 的申请吗？`,
        confirmText: "确认取消",
        confirmColor: "#ff4d4f",
        cancelText: "暂不取消",
        success: async (res) => {
          if (!res.confirm) {
            cancelTarget.value = null;
            return;
          }
          await confirmCancel();
        }
      });
    };
    const closeCancelModal = () => {
      showCancelPopup.value = false;
      cancelTarget.value = null;
    };
    const confirmCancel = async () => {
      if (!cancelTarget.value)
        return;
      const requestId = cancelTarget.value.id;
      common_vendor.index.showLoading({
        title: "正在取消...",
        mask: true
      });
      try {
        const success = await sharingStore.cancelSharingRequest(requestId);
        if (success) {
          common_vendor.index.showToast({
            title: "取消成功",
            icon: "success"
          });
          await loadRequests(true);
        } else {
          throw new Error("取消申请失败，请稍后再试");
        }
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/sharing/requests.vue:265", "An error occurred during cancellation:", err);
        const errorMessage = err.message || "取消操作失败，请检查网络或联系客服";
        common_vendor.index.showToast({
          title: errorMessage,
          icon: "none",
          duration: 3e3
        });
      } finally {
        common_vendor.index.hideLoading();
        closeCancelModal();
      }
    };
    const goToSharingDetail = (sharingId) => {
      if (!sharingId) {
        common_vendor.index.__f__("error", "at pages/sharing/requests.vue:281", "sharingId为空，无法跳转");
        common_vendor.index.showToast({
          title: "订单ID不存在",
          icon: "error"
        });
        return;
      }
      common_vendor.index.navigateTo({
        url: `/pages/sharing/detail?id=${sharingId}`
      });
    };
    const goToSharingList = () => {
      common_vendor.index.navigateTo({
        url: "/pages/sharing/list"
      });
    };
    const getProgressPercent = (current, max) => {
      if (!max || max === 0)
        return 0;
      return Math.round(current / max * 100);
    };
    const formatRequestsForDisplay = (requestsData) => {
      if (!Array.isArray(requestsData)) {
        return [];
      }
      return requestsData.map((req) => {
        let formattedActivityTime = "--";
        if (req.bookingTime) {
          try {
            let bookingTimeStr = req.bookingTime;
            if (typeof bookingTimeStr === "string" && bookingTimeStr.includes(" ") && !bookingTimeStr.includes("T")) {
              bookingTimeStr = bookingTimeStr.replace(" ", "T");
            }
            const bookingTime = new Date(bookingTimeStr);
            if (isNaN(bookingTime.getTime())) {
              throw new Error("Invalid Date object");
            }
            const dateStr = bookingTime.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }).replace("/", "-");
            const startTimeStr = bookingTime.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
            let timeSlot = startTimeStr;
            if (req.startTime && req.endTime) {
              timeSlot = `${req.startTime}-${req.endTime}`;
            } else if (req.endTime) {
              timeSlot = `${startTimeStr}-${req.endTime}`;
            }
            formattedActivityTime = `${dateStr} ${timeSlot}`;
          } catch (error2) {
            common_vendor.index.__f__("error", "at pages/sharing/requests.vue:335", "时间格式化错误:", error2, "for request:", req);
            formattedActivityTime = "时间格式错误";
          }
        } else {
          const date = utils_helpers.formatDate(req.bookingDate, "MM-DD");
          const timeSlot = formatTimeSlot(req.startTime, req.endTime);
          formattedActivityTime = `${date} ${timeSlot}`;
        }
        return {
          ...req,
          formattedActivityTime
        };
      });
    };
    const formatTimeSlot = (startTime, endTime) => {
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
    };
    const getStatusText = (status) => {
      const statusMap = {
        "PENDING": "待处理",
        "APPROVED_PENDING_PAYMENT": "已批准待支付",
        "APPROVED": "已完成",
        "PAID": "拼场成功",
        "REJECTED": "已拒绝",
        "CANCELLED": "已取消",
        "TIMEOUT_CANCELLED": "超时取消"
      };
      return statusMap[status] || "未知状态";
    };
    const getStatusClass = (status) => {
      const classMap = {
        "PENDING": "status-pending",
        "APPROVED_PENDING_PAYMENT": "status-pending",
        "APPROVED": "status-approved",
        "PAID": "status-success",
        "REJECTED": "status-rejected",
        "CANCELLED": "status-cancelled",
        "TIMEOUT_CANCELLED": "status-cancelled"
      };
      return classMap[status] || "status-unknown";
    };
    const getEmptyTitle = () => {
      const titleMap = {
        "all": "暂无申请记录",
        "pending": "暂无待处理申请",
        "approved": "暂无已通过申请",
        "rejected": "暂无被拒绝申请"
      };
      return titleMap[currentFilter.value] || "暂无申请记录";
    };
    const getEmptyDesc = () => {
      const descMap = {
        "all": "快去申请加入感兴趣的拼场吧",
        "pending": "您的申请都已被处理",
        "approved": "暂时没有通过的申请",
        "rejected": "暂时没有被拒绝的申请"
      };
      return descMap[currentFilter.value] || "快去申请加入感兴趣的拼场吧";
    };
    const getRequestPrice = (request) => {
      if (!request)
        return "0.00";
      const price = request.paymentAmount || request.pricePerPerson || request.totalPrice || 0;
      return typeof price === "number" ? price.toFixed(2) : "0.00";
    };
    const switchFilter = (filter) => {
      currentFilter.value = filter;
    };
    const goBack = () => {
      common_vendor.index.navigateBack();
    };
    const loadRequests = async (forceRefresh = false) => {
      if (isRefreshing.value)
        return;
      isRefreshing.value = true;
      error.value = "";
      try {
        const response = await sharingStore.getSentRequestsList({ forceRefresh });
        const data = response.data;
        requests.value = formatRequestsForDisplay(data || []);
        updateFilterCounts();
        lastRefreshTime.value = Date.now();
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/sharing/requests.vue:437", "拼场申请页面：加载申请列表失败:", err);
        error.value = err.message || "加载失败，请稍后重试";
      } finally {
        isRefreshing.value = false;
      }
    };
    const loadRequestsWithCache = () => {
      const now = Date.now();
      if (now - lastRefreshTime.value > cacheTimeout) {
        loadRequests(true);
      } else if (!requests.value || requests.value.length === 0) {
        loadRequests();
      }
    };
    const updateFilterCounts = () => {
      const counts = {
        all: requests.value.length,
        pending: 0,
        approved_pending_payment: 0,
        approved: 0,
        rejected: 0,
        timeout_cancelled: 0
      };
      const statusMap = {
        "PENDING": "pending",
        "APPROVED_PENDING_PAYMENT": "approved_pending_payment",
        "APPROVED": "approved",
        "REJECTED": "rejected",
        "TIMEOUT_CANCELLED": "timeout_cancelled"
      };
      for (const req of requests.value) {
        const filterKey = statusMap[req.status];
        if (filterKey) {
          counts[filterKey]++;
        }
      }
      filterTabs.value = filterTabs.value.map((tab) => ({
        ...tab,
        count: counts[tab.value] || 0
      }));
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.o(goBack),
        b: common_vendor.f(filterTabs.value, (tab, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(tab.label),
            b: tab.count > 0
          }, tab.count > 0 ? {
            c: common_vendor.t(tab.count)
          } : {}, {
            d: tab.value,
            e: currentFilter.value === tab.value ? 1 : "",
            f: common_vendor.o(($event) => switchFilter(tab.value), tab.value)
          });
        }),
        c: loading.value
      }, loading.value ? {} : error.value ? {
        e: common_vendor.t(error.value),
        f: common_vendor.o(loadRequests)
      } : common_vendor.e({
        g: filteredRequests.value.length > 0
      }, filteredRequests.value.length > 0 ? {
        h: common_vendor.f(filteredRequests.value, (request, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(request.venueName),
            b: common_vendor.t(getStatusText(request.status)),
            c: common_vendor.n(getStatusClass(request.status)),
            d: common_vendor.t(request.teamName || request.applicantTeamName),
            e: common_vendor.t(request.formattedActivityTime),
            f: common_vendor.t(getRequestPrice(request)),
            g: common_vendor.t(request.currentParticipants),
            h: common_vendor.t(request.maxParticipants),
            i: common_vendor.t(getProgressPercent(request.currentParticipants, request.maxParticipants)),
            j: getProgressPercent(request.currentParticipants, request.maxParticipants) + "%",
            k: common_vendor.t(common_vendor.unref(utils_helpers.formatDateTime)(request.createdAt)),
            l: request.processedAt
          }, request.processedAt ? {
            m: common_vendor.t(common_vendor.unref(utils_helpers.formatDateTime)(request.processedAt))
          } : {}, {
            n: request.status === "PENDING"
          }, request.status === "PENDING" ? {
            o: common_vendor.o(($event) => showCancelConfirm(request), request.id)
          } : request.status === "APPROVED" ? {
            q: common_vendor.o(($event) => goToSharingDetail(request.orderId || request.sharingId), request.id)
          } : request.status === "REJECTED" ? common_vendor.e({
            s: request.rejectReason
          }, request.rejectReason ? {
            t: common_vendor.t(request.rejectReason)
          } : {}) : {}, {
            p: request.status === "APPROVED",
            r: request.status === "REJECTED",
            v: request.id,
            w: common_vendor.o(($event) => goToSharingDetail(request.orderId || request.sharingId), request.id)
          });
        })
      } : {
        i: common_vendor.t(getEmptyTitle()),
        j: common_vendor.t(getEmptyDesc()),
        k: common_vendor.o(goToSharingList)
      }), {
        d: error.value,
        l: showCancelPopup.value
      }, showCancelPopup.value ? {
        m: common_vendor.t(cancelTarget.value ? cancelTarget.value.teamName || cancelTarget.value.applicantTeamName : ""),
        n: common_vendor.o(closeCancelModal),
        o: common_vendor.o(confirmCancel),
        p: common_vendor.sr(cancelPopup, "3975ffc5-0", {
          "k": "cancelPopup"
        }),
        q: common_vendor.p({
          type: "center",
          ["mask-click"]: false
        })
      } : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-3975ffc5"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/sharing/requests.js.map
