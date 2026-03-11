"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_booking = require("../../stores/booking.js");
const stores_user = require("../../stores/user.js");
const utils_helpers = require("../../utils/helpers.js");
const utils_countdown = require("../../utils/countdown.js");
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
        common_vendor.index.__f__("error", "at pages/booking/list.vue:303", "[BookingList] 数据初始化失败:", error);
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
        common_vendor.index.__f__("error", "at pages/booking/list.vue:347", "刷新数据失败:", error);
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
        common_vendor.index.__f__("error", "at pages/booking/list.vue:365", "[BookingList] ❌ 加载更多失败:", error);
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
        common_vendor.index.__f__("error", "at pages/booking/list.vue:413", "No booking ID selected for cancellation");
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
        common_vendor.index.__f__("error", "at pages/booking/list.vue:434", "取消预约失败:", error);
        common_vendor.index.showToast({
          title: error.message || "取消失败",
          icon: "error"
        });
      }
    };
    const reviewVenue = (booking) => {
      common_vendor.index.navigateTo({
        url: `/pages/venue/review?venueId=${booking.venueId}&bookingId=${booking.id}`
      });
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
        "PAID": "已支付，待确认",
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
          common_vendor.index.__f__("error", "at pages/booking/list.vue:543", "虚拟订单时间格式化错误:", error);
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
      const virtualOrder = isVirtualOrder(booking);
      let price;
      if (virtualOrder) {
        price = booking.paymentAmount || 0;
      } else {
        price = booking.totalPrice || 0;
      }
      return price.toFixed(2);
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
            common_vendor.index.__f__("error", "at pages/booking/list.vue:650", "虚拟订单日期格式化错误 - 无效的时间:", bookingTime);
            return "";
          }
          return dateTime.toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
          }).replace(/\//g, "-");
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/booking/list.vue:660", "虚拟订单日期格式化错误:", error);
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
        common_vendor.index.__f__("error", "at pages/booking/list.vue:698", "[BookingList] ❌ 处理预约创建事件失败:", error);
        common_vendor.index.__f__("error", "at pages/booking/list.vue:699", "[BookingList] 错误堆栈:", error.stack);
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
        common_vendor.index.__f__("error", "at pages/booking/list.vue:743", "处理订单过期事件失败:", e);
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
          common_vendor.index.__f__("error", "at pages/booking/list.vue:787", "[BookingList] ❌ 强制刷新失败:", error);
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
        common_vendor.index.__f__("error", "at pages/booking/list.vue:803", "[BookingList] ❌ 刷新预约列表失败:", error);
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
    const checkinOrder = (_booking) => {
      common_vendor.index.showModal({
        title: "确认签到",
        content: "确认已到达场馆并开始使用？",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.showToast({
              title: "签到成功",
              icon: "success"
            });
            initData();
          }
        }
      });
    };
    const completeOrder = (_booking) => {
      common_vendor.index.showModal({
        title: "完成订单",
        content: "确认完成此次预约？",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.showToast({
              title: "订单已完成",
              icon: "success"
            });
            initData();
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
            m: common_vendor.t(getBookingPrice(booking)),
            n: common_vendor.unref(utils_countdown.shouldShowCountdown)(booking)
          }, common_vendor.unref(utils_countdown.shouldShowCountdown)(booking) ? {
            o: common_vendor.o(onCountdownExpired, `booking-${booking.id}`),
            p: "afb09895-0-" + i0,
            q: common_vendor.p({
              order: booking,
              label: "自动取消",
              short: true
            })
          } : {}, {
            r: booking.status === "PENDING" && !booking.isExpired
          }, booking.status === "PENDING" && !booking.isExpired ? {
            s: common_vendor.o(($event) => payOrder(booking), `booking-${booking.id}`),
            t: common_vendor.o(($event) => showCancelModal(booking.id), `booking-${booking.id}`)
          } : booking.status === "EXPIRED" || booking.isExpired ? {
            w: common_vendor.o(($event) => rebookVenue(booking), `booking-${booking.id}`)
          } : booking.status === "PAID" ? {
            y: common_vendor.o(($event) => viewOrderDetail(booking), `booking-${booking.id}`),
            z: common_vendor.o(($event) => showCancelModal(booking.id), `booking-${booking.id}`)
          } : booking.status === "OPEN" || booking.status === "SHARING" || booking.status === "PENDING_FULL" ? {
            B: common_vendor.o(($event) => viewOrderDetail(booking), `booking-${booking.id}`),
            C: common_vendor.o(($event) => viewParticipants(booking), `booking-${booking.id}`),
            D: common_vendor.o(($event) => showCancelModal(booking.id), `booking-${booking.id}`)
          } : booking.status === "SHARING_SUCCESS" || booking.status === "FULL" ? {
            F: common_vendor.o(($event) => viewOrderDetail(booking), `booking-${booking.id}`),
            G: common_vendor.o(($event) => viewParticipants(booking), `booking-${booking.id}`)
          } : booking.status === "CONFIRMED" ? {
            I: common_vendor.o(($event) => checkinOrder(), `booking-${booking.id}`),
            J: common_vendor.o(($event) => showCancelModal(booking.id), `booking-${booking.id}`)
          } : booking.status === "VERIFIED" ? {
            L: common_vendor.o(($event) => completeOrder(), `booking-${booking.id}`)
          } : booking.status === "COMPLETED" ? {
            N: common_vendor.o(($event) => reviewVenue(booking), `booking-${booking.id}`),
            O: common_vendor.o(($event) => rebookVenue(booking), `booking-${booking.id}`)
          } : booking.status === "CANCELLED" || booking.status === "EXPIRED" ? {
            Q: common_vendor.o(($event) => rebookVenue(booking), `booking-${booking.id}`)
          } : {}, {
            v: booking.status === "EXPIRED" || booking.isExpired,
            x: booking.status === "PAID",
            A: booking.status === "OPEN" || booking.status === "SHARING" || booking.status === "PENDING_FULL",
            E: booking.status === "SHARING_SUCCESS" || booking.status === "FULL",
            H: booking.status === "CONFIRMED",
            K: booking.status === "VERIFIED",
            M: booking.status === "COMPLETED",
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
        k: showCancelPopup.value
      }, showCancelPopup.value ? {
        l: common_vendor.o(closeCancelModal),
        m: common_vendor.o(confirmCancel),
        n: common_vendor.sr(cancelPopup, "afb09895-1", {
          "k": "cancelPopup"
        }),
        o: common_vendor.p({
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
