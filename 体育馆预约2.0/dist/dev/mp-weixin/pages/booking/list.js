"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_booking = require("../../stores/booking.js");
const stores_user = require("../../stores/user.js");
const utils_helpers = require("../../utils/helpers.js");
const utils_countdown = require("../../utils/countdown.js");
const api_order = require("../../api/order.js");
const utils_request = require("../../utils/request.js");
if (!Array) {
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  _component_uni_popup();
}
if (!Math) {
  CountdownTimer();
}
const CountdownTimer = () => "../../components/CountdownTimer.js";
const REFRESH_INTERVAL = 3e3;
const _sfc_main = {
  __name: "list",
  setup(__props) {
    const bookingStore = stores_booking.useBookingStore();
    stores_user.useUserStore();
    const selectedStatus = common_vendor.ref("all");
    const statusOptions = common_vendor.ref([
      { label: "全部", value: "all" },
      { label: "待支付", value: "pending" },
      { label: "进行中", value: "ongoing" },
      { label: "已完成", value: "done" },
      { label: "已取消", value: "closed" }
    ]);
    const statusGroupMap = {
      "all": null,
      // 全部，不过滤
      "pending": ["PENDING"],
      // 待支付
      "ongoing": ["PAID", "CONFIRMED", "OPEN", "APPROVED_PENDING_PAYMENT", "SHARING_SUCCESS", "FULL", "PENDING_FULL"],
      // 进行中
      "done": ["VERIFIED", "COMPLETED"],
      // 已完成
      "closed": ["CANCELLED", "EXPIRED"]
      // 已取消
    };
    const currentBookingId = common_vendor.ref(null);
    const cancelPopup = common_vendor.ref(null);
    const showCancelPopup = common_vendor.ref(false);
    const showVerifyCodePopup = common_vendor.ref(false);
    const activeVerifyCode = common_vendor.ref("");
    const loadingMore = common_vendor.computed(() => bookingStore.loadingMore);
    const showCancelModal = (bookingId) => {
      currentBookingId.value = bookingId;
      common_vendor.index.showModal({
        title: "取消预约",
        content: "确定要取消这个预约吗？取消后可能产生手续费，具体以场馆规定为准",
        confirmText: "确认取消",
        confirmColor: "#ff4d4f",
        cancelText: "暂不取消",
        success: (res) => {
          if (res.confirm) {
            confirmCancel();
          } else {
            currentBookingId.value = null;
          }
        }
      });
    };
    const showVerifyCodeModal = (booking) => {
      activeVerifyCode.value = getVerifyCode(booking);
      showVerifyCodePopup.value = true;
    };
    const closeVerifyCodeModal = () => {
      showVerifyCodePopup.value = false;
    };
    const bookingList = common_vendor.computed(() => bookingStore.bookingListGetter);
    const loading = common_vendor.computed(() => bookingStore.isLoading);
    const pagination = common_vendor.computed(() => {
      return bookingStore.getPagination;
    });
    const hasMore = common_vendor.computed(() => {
      return pagination.value.current < pagination.value.totalPages;
    });
    const filteredBookings = common_vendor.computed(() => {
      const bookings = bookingList.value || [];
      const currentTab = selectedStatus.value;
      if (currentTab === "all") {
        return bookings;
      }
      const allowedStatuses = statusGroupMap[currentTab];
      if (!allowedStatuses) {
        return bookings;
      }
      return bookings.filter((booking) => allowedStatuses.includes(booking.status));
    });
    const emptyStateText = common_vendor.computed(() => {
      var _a;
      if (selectedStatus.value === "all") {
        return "暂无预约记录";
      }
      const statusText = ((_a = statusOptions.value.find((s) => s.value === selectedStatus.value)) == null ? void 0 : _a.label) || "";
      return `暂无${statusText}记录`;
    });
    const initData = async () => {
      if (loading.value) {
        return;
      }
      try {
        await bookingStore.getUserBookings({
          page: 1,
          pageSize: 10,
          refresh: false
          // 允许使用缓存，提升首屏速度
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/list.vue:330", "[BookingList] 数据初始化失败:", error);
        common_vendor.index.showToast({
          title: "加载失败，请重试",
          icon: "none"
        });
      }
    };
    const refreshData = async () => {
      if (loading.value) {
        return;
      }
      try {
        await bookingStore.refreshBookingList();
        common_vendor.index.stopPullDownRefresh();
      } catch (error) {
        common_vendor.index.stopPullDownRefresh();
        common_vendor.index.__f__("error", "at pages/booking/list.vue:374", "刷新数据失败:", error);
        common_vendor.index.showToast({
          title: error.message || "刷新数据失败",
          icon: "none"
        });
      }
    };
    const loadMore = async () => {
      if (loading.value || !hasMore.value || loadingMore.value) {
        return;
      }
      try {
        const nextPage = pagination.value.current + 1;
        await bookingStore.getUserBookings({ page: nextPage, pageSize: 10 });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/list.vue:392", "[BookingList] ❌ 加载更多失败:", error);
        common_vendor.index.showToast({
          title: "加载失败，请重试",
          icon: "none"
        });
      }
    };
    const selectStatus = (status) => {
      selectedStatus.value = status;
    };
    const navigateToDetail = (bookingId) => {
      common_vendor.index.navigateTo({
        url: `/pages/booking/detail?id=${bookingId}`
      });
    };
    const closeCancelModal = () => {
      if (cancelPopup.value) {
        cancelPopup.value.close();
      }
      showCancelPopup.value = false;
      currentBookingId.value = null;
    };
    const confirmCancel = async () => {
      if (!currentBookingId.value) {
        common_vendor.index.__f__("error", "at pages/booking/list.vue:440", "No booking ID selected for cancellation");
        return;
      }
      try {
        common_vendor.index.showLoading({ title: "取消中..." });
        await bookingStore.cancelBooking(currentBookingId.value);
        common_vendor.index.hideLoading();
        closeCancelModal();
        common_vendor.index.showToast({
          title: "取消成功",
          icon: "success"
        });
        await initData();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/booking/list.vue:461", "取消预约失败:", error);
        common_vendor.index.showToast({
          title: error.message || "取消失败",
          icon: "error"
        });
      }
    };
    const rebookVenue = (booking) => {
      common_vendor.index.navigateTo({
        url: `/pages/venue/detail?id=${booking.venueId}`
      });
    };
    const navigateToVenueList = () => {
      common_vendor.index.switchTab({
        url: "/pages/venue/list"
      });
    };
    const formatCreateTime = (datetime) => {
      return utils_helpers.formatTime(datetime, "YYYY-MM-DD HH:mm");
    };
    const getStatusClass = (status) => {
      const statusMap = {
        // 基础状态样式
        "PENDING": "status-pending",
        "PAID": "status-paid",
        "CONFIRMED": "status-confirmed",
        "VERIFIED": "status-verified",
        "COMPLETED": "status-completed",
        "CANCELLED": "status-cancelled",
        "EXPIRED": "status-expired",
        // 拼场状态样式
        "OPEN": "status-open",
        "APPROVED_PENDING_PAYMENT": "status-approved-pending-payment",
        "SHARING_SUCCESS": "status-sharing-success",
        "PENDING_FULL": "status-pending-full",
        "FULL": "status-full"
      };
      return statusMap[status] || "status-pending";
    };
    const getStatusText = (status) => {
      const statusMap = {
        // 基础状态
        "PENDING": "待支付",
        "PAID": "待使用",
        "CONFIRMED": "待使用",
        "VERIFIED": "已核销",
        "COMPLETED": "已完成",
        "CANCELLED": "已取消",
        "EXPIRED": "已过期",
        // 拼场订单特有状态（在「进行中」Tab 内通过标签区分）
        "OPEN": "拼场中",
        "APPROVED_PENDING_PAYMENT": "等待对方付款",
        "SHARING_SUCCESS": "拼场成功",
        "PENDING_FULL": "待满员",
        "FULL": "已满员"
      };
      return statusMap[status] || "待支付";
    };
    const formatTimeRange = (booking) => {
      const bookingId = typeof booking.id === "string" ? parseInt(booking.id) : booking.id;
      const isVirtual = bookingId < 0;
      if (isVirtual) {
        const startTime = booking.startTime;
        const endTime = booking.endTime;
        if (!startTime)
          return "时间待定";
        try {
          const startTimeStr = startTime;
          const endTimeStr = endTime;
          if (endTimeStr) {
            return `${startTimeStr} - ${endTimeStr}`;
          } else {
            return startTimeStr;
          }
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/booking/list.vue:565", "虚拟订单时间格式化错误:", error);
          return "时间待定";
        }
      } else {
        const startTime = booking.startTime || booking.bookingStartTime || booking.timeSlotStartTime;
        const endTime = booking.endTime || booking.bookingEndTime || booking.timeSlotEndTime;
        const timeSlotCount = booking.timeSlotCount || booking.slotCount || 1;
        if (!startTime || !endTime) {
          return "时间待定";
        }
        const formatTime = (timeStr) => {
          if (!timeStr)
            return "";
          if (timeStr.includes("T")) {
            return timeStr.split("T")[1].substring(0, 5);
          }
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
      }
    };
    const getBookingTypeText = (bookingType) => {
      const typeMap = {
        "EXCLUSIVE": "包场",
        "SHARED": "拼场"
      };
      return bookingType ? typeMap[bookingType] || "普通" : "普通";
    };
    const getBookingTypeClass = (bookingType) => {
      const classMap = {
        "EXCLUSIVE": "tag-exclusive",
        "SHARED": "tag-shared"
      };
      return bookingType ? classMap[bookingType] || "tag-default" : "tag-default";
    };
    const isVirtualOrder = (booking) => {
      if (!booking)
        return false;
      const bookingId = typeof booking.id === "string" ? parseInt(booking.id) : booking.id;
      return bookingId < 0;
    };
    const getBookingPrice = (booking) => {
      if (!booking)
        return "0.00";
      const isShared = booking.bookingType === "SHARED";
      const virtualOrder = isVirtualOrder(booking);
      const basePrice = virtualOrder ? booking.paymentAmount ?? booking.totalPrice ?? 0 : booking.totalPrice ?? 0;
      const displayPrice = isShared ? basePrice * 2 : basePrice;
      return Number(displayPrice).toFixed(2);
    };
    const getBookingPriceLabel = (booking) => {
      if (!booking)
        return "费用：";
      return booking.bookingType === "SHARED" ? "合计：" : "费用：";
    };
    const formatBookingDate = (booking) => {
      if (!booking)
        return "";
      const virtualOrder = isVirtualOrder(booking);
      if (virtualOrder) {
        const bookingTime = booking.bookingTime;
        if (!bookingTime)
          return "";
        try {
          let dateTime;
          if (typeof bookingTime === "string") {
            let isoTime = bookingTime;
            if (bookingTime.includes(" ") && !bookingTime.includes("T")) {
              isoTime = bookingTime.replace(" ", "T");
            }
            dateTime = new Date(isoTime);
          } else {
            dateTime = new Date(bookingTime);
          }
          if (isNaN(dateTime.getTime())) {
            common_vendor.index.__f__("error", "at pages/booking/list.vue:669", "虚拟订单日期格式化错误 - 无效的时间:", bookingTime);
            return "";
          }
          return dateTime.toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
          }).replace(/\//g, "-");
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/booking/list.vue:679", "虚拟订单日期格式化错误:", error);
          return "";
        }
      } else {
        if (booking.bookingDate) {
          return utils_helpers.formatDate(booking.bookingDate);
        }
        return "";
      }
    };
    let needForceRefresh = false;
    let lastShowTime = 0;
    const handleBookingCreated = (eventData) => {
      needForceRefresh = true;
      lastShowTime = 0;
      bookingStore.clearCache("bookingList");
      bookingStore.getUserBookings({
        page: 1,
        refresh: true,
        force: true,
        _t: Date.now()
        // 🔥 添加时间戳，确保每次请求都有唯一的key，避免被去重机制阻塞
      }).then((result) => {
      }).catch((error) => {
        common_vendor.index.__f__("error", "at pages/booking/list.vue:717", "[BookingList] ❌ 处理预约创建事件失败:", error);
        common_vendor.index.__f__("error", "at pages/booking/list.vue:718", "[BookingList] 错误堆栈:", error.stack);
      });
    };
    const handleOrderCancelled = (eventData) => {
      needForceRefresh = true;
      lastShowTime = 0;
      bookingStore.clearCache("bookingList");
      try {
        if (eventData && eventData.orderId) {
          const idx = bookingStore.bookingList.findIndex((b) => b.id === eventData.orderId || b.orderNo === eventData.orderId);
          if (idx > -1) {
            bookingStore.bookingList[idx] = { ...bookingStore.bookingList[idx], status: "CANCELLED" };
          }
        }
      } catch (e) {
      }
    };
    const handleOrderExpired = (eventData) => {
      needForceRefresh = true;
      lastShowTime = 0;
      try {
        if (eventData && eventData.orderId) {
          const idx = bookingStore.bookingList.findIndex((b) => b.id === eventData.orderId || b.orderNo === eventData.orderNo);
          if (idx > -1) {
            const updatedBooking = { ...bookingStore.bookingList[idx], status: "EXPIRED", isExpired: true };
            bookingStore.bookingList.splice(idx, 1, updatedBooking);
          }
        }
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/booking/list.vue:762", "处理订单过期事件失败:", e);
      }
    };
    common_vendor.onMounted(() => {
      initData();
      common_vendor.index.$on("bookingCreated", handleBookingCreated);
      common_vendor.index.$on("orderCancelled", handleOrderCancelled);
      common_vendor.index.$on("order-expired", handleOrderExpired);
    });
    common_vendor.onUnmounted(() => {
      currentBookingId.value = null;
      cancelPopup.value = null;
      common_vendor.index.$off("bookingCreated", handleBookingCreated);
      common_vendor.index.$off("orderCancelled", handleOrderCancelled);
      common_vendor.index.$off("order-expired", handleOrderExpired);
    });
    common_vendor.onShow(async () => {
      const now = Date.now();
      const timeSinceLastShow = now - lastShowTime;
      if (needForceRefresh) {
        needForceRefresh = false;
        lastShowTime = now;
        try {
          await bookingStore.refreshBookingList();
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/booking/list.vue:806", "[BookingList] ❌ 强制刷新失败:", error);
        }
        return;
      }
      if (timeSinceLastShow < REFRESH_INTERVAL && bookingStore.bookingList.length > 0) {
        lastShowTime = now;
        return;
      }
      try {
        await bookingStore.refreshBookingList();
        lastShowTime = now;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/list.vue:822", "[BookingList] ❌ 刷新预约列表失败:", error);
      }
    });
    common_vendor.onPullDownRefresh(async () => {
      await refreshData();
    });
    common_vendor.onReachBottom(() => {
      loadMore();
    });
    const onCountdownExpired = (_order) => {
      initData();
    };
    const payOrder = (booking) => {
      common_vendor.index.navigateTo({
        url: `/pages/payment/index?orderId=${booking.id}&type=booking`
      });
    };
    const viewOrderDetail = (booking) => {
      common_vendor.index.navigateTo({
        url: `/pages/booking/detail?id=${booking.id}`
      });
    };
    const viewParticipants = (booking) => {
      common_vendor.index.navigateTo({
        url: `/pages/sharing/participants?orderId=${booking.id}`
      });
    };
    const getVerifyCode = (booking) => {
      if (!booking)
        return "";
      if (booking.orderNo)
        return String(booking.orderNo);
      if (booking.id !== void 0 && booking.id !== null)
        return String(booking.id);
      return "";
    };
    const formatVerifyCodeDisplay = (code) => {
      if (!code)
        return "--";
      const compact = String(code).replace(/\s+/g, "");
      return compact.replace(/(.{4})/g, "$1 ").trim();
    };
    const completeOrder = (booking) => {
      common_vendor.index.showModal({
        title: "完成订单",
        content: "确认完成此次预约？",
        success: async (res) => {
          if (res.confirm) {
            try {
              await api_order.completeUserOrder(booking.id);
              utils_request.clearCache("/bookings");
              utils_request.clearCache(`/bookings/${booking.id}`);
              common_vendor.index.showToast({
                title: "订单已完成",
                icon: "success"
              });
              await bookingStore.getUserBookings({
                page: 1,
                pageSize: 10,
                refresh: true,
                force: true
              });
            } catch (e) {
              common_vendor.index.showToast({
                title: e.message || "操作失败",
                icon: "none"
              });
            }
          }
        }
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.f(statusOptions.value, (status, k0, i0) => {
          return {
            a: common_vendor.t(status.label),
            b: status.value,
            c: selectedStatus.value === status.value ? 1 : "",
            d: common_vendor.o(($event) => selectStatus(status.value), status.value)
          };
        }),
        b: loading.value
      }, loading.value ? {} : {}, {
        c: !loading.value
      }, !loading.value ? {
        d: common_vendor.f(filteredBookings.value, (booking, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(booking.venueName || "未知场馆"),
            b: booking.bookingType || booking.type || booking.orderType
          }, booking.bookingType || booking.type || booking.orderType ? {
            c: common_vendor.t(getBookingTypeText(booking.bookingType || booking.type || booking.orderType)),
            d: common_vendor.n(getBookingTypeClass(booking.bookingType || booking.type || booking.orderType))
          } : {}, {
            e: isVirtualOrder(booking)
          }, isVirtualOrder(booking) ? {} : {}, {
            f: common_vendor.t(formatBookingDate(booking)),
            g: common_vendor.t(getStatusText(booking.status)),
            h: common_vendor.n(getStatusClass(booking.status)),
            i: common_vendor.t(formatTimeRange(booking)),
            j: common_vendor.t(booking.venueLocation || "未知地点"),
            k: common_vendor.t(booking.orderNo || (booking.id ? booking.id : "")),
            l: common_vendor.t(formatCreateTime(booking && (booking.createdAt || booking.createTime))),
            m: common_vendor.t(getBookingPriceLabel(booking)),
            n: common_vendor.t(getBookingPrice(booking)),
            o: common_vendor.unref(utils_countdown.shouldShowCountdown)(booking)
          }, common_vendor.unref(utils_countdown.shouldShowCountdown)(booking) ? {
            p: common_vendor.o(onCountdownExpired, `booking-${booking.id}`),
            q: "afb09895-0-" + i0,
            r: common_vendor.p({
              order: booking,
              label: "自动取消",
              short: true
            })
          } : {}, {
            s: booking.status === "PENDING" && !booking.isExpired
          }, booking.status === "PENDING" && !booking.isExpired ? {
            t: common_vendor.o(($event) => payOrder(booking), `booking-${booking.id}`),
            v: common_vendor.o(($event) => showCancelModal(booking.id), `booking-${booking.id}`)
          } : booking.status === "EXPIRED" || booking.isExpired ? {
            x: common_vendor.o(($event) => rebookVenue(booking), `booking-${booking.id}`)
          } : booking.status === "PAID" ? {
            z: common_vendor.o(($event) => showVerifyCodeModal(booking), `booking-${booking.id}`),
            A: common_vendor.o(($event) => showCancelModal(booking.id), `booking-${booking.id}`)
          } : booking.status === "OPEN" || booking.status === "SHARING" || booking.status === "PENDING_FULL" ? {
            C: common_vendor.o(($event) => viewOrderDetail(booking), `booking-${booking.id}`),
            D: common_vendor.o(($event) => viewParticipants(booking), `booking-${booking.id}`),
            E: common_vendor.o(($event) => showCancelModal(booking.id), `booking-${booking.id}`)
          } : booking.status === "SHARING_SUCCESS" || booking.status === "FULL" ? {
            G: common_vendor.o(($event) => showVerifyCodeModal(booking), `booking-${booking.id}`),
            H: common_vendor.o(($event) => viewParticipants(booking), `booking-${booking.id}`)
          } : booking.status === "CONFIRMED" ? {
            J: common_vendor.o(($event) => showVerifyCodeModal(booking), `booking-${booking.id}`),
            K: common_vendor.o(($event) => showCancelModal(booking.id), `booking-${booking.id}`)
          } : booking.status === "VERIFIED" ? {
            M: common_vendor.o(($event) => completeOrder(booking), `booking-${booking.id}`)
          } : booking.status === "COMPLETED" ? {
            O: common_vendor.o(($event) => rebookVenue(booking), `booking-${booking.id}`)
          } : booking.status === "CANCELLED" || booking.status === "EXPIRED" ? {
            Q: common_vendor.o(($event) => rebookVenue(booking), `booking-${booking.id}`)
          } : {}, {
            w: booking.status === "EXPIRED" || booking.isExpired,
            y: booking.status === "PAID",
            B: booking.status === "OPEN" || booking.status === "SHARING" || booking.status === "PENDING_FULL",
            F: booking.status === "SHARING_SUCCESS" || booking.status === "FULL",
            I: booking.status === "CONFIRMED",
            L: booking.status === "VERIFIED",
            N: booking.status === "COMPLETED",
            P: booking.status === "CANCELLED" || booking.status === "EXPIRED",
            R: `booking-${booking.id}`,
            S: common_vendor.o(($event) => navigateToDetail(booking.id), `booking-${booking.id}`)
          });
        })
      } : {}, {
        e: !loading.value && filteredBookings.value.length === 0
      }, !loading.value && filteredBookings.value.length === 0 ? {
        f: common_vendor.t(emptyStateText.value),
        g: common_vendor.o(navigateToVenueList)
      } : {}, {
        h: !loading.value && hasMore.value && filteredBookings.value.length > 0
      }, !loading.value && hasMore.value && filteredBookings.value.length > 0 ? common_vendor.e({
        i: loadingMore.value
      }, loadingMore.value ? {} : {}, {
        j: common_vendor.o(loadMore)
      }) : {}, {
        k: showVerifyCodePopup.value
      }, showVerifyCodePopup.value ? {
        l: common_vendor.t(formatVerifyCodeDisplay(activeVerifyCode.value)),
        m: common_vendor.o(closeVerifyCodeModal),
        n: common_vendor.o(() => {
        }),
        o: common_vendor.o(closeVerifyCodeModal)
      } : {}, {
        p: showCancelPopup.value
      }, showCancelPopup.value ? {
        q: common_vendor.o(closeCancelModal),
        r: common_vendor.o(confirmCancel),
        s: common_vendor.sr(cancelPopup, "afb09895-1", {
          "k": "cancelPopup"
        }),
        t: common_vendor.p({
          type: "center",
          ["mask-click"]: false
        })
      } : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-afb09895"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/booking/list.js.map
