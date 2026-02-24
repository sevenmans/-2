"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_booking = require("../../stores/booking.js");
const stores_venue = require("../../stores/venue.js");
const utils_helpers = require("../../utils/helpers.js");
const utils_request = require("../../utils/request.js");
const _sfc_main = {
  name: "BookingDetail",
  data() {
    return {
      bookingStore: null,
      venueStore: null,
      bookingId: "",
      showCancelPopup: false
    };
  },
  computed: {
    bookingDetail() {
      var _a;
      return ((_a = this.bookingStore) == null ? void 0 : _a.bookingDetailGetter) || null;
    },
    loading() {
      var _a;
      return ((_a = this.bookingStore) == null ? void 0 : _a.isLoading) || false;
    }
  },
  onLoad(options) {
    this.bookingStore = stores_booking.useBookingStore();
    this.venueStore = stores_venue.useVenueStore();
    this.bookingId = options.id;
    this.internalCancelPopupOpened = false;
    this.cancelPopupPosition = "";
    common_vendor.index.$on("orderCancelled", this.handleOrderCancelled);
    common_vendor.index.__f__("log", "at pages/booking/detail.vue:264", "[BookingDetail] 已注册 orderCancelled 事件监听");
    this.initData();
  },
  onUnload() {
    this._cancelPopupRef = null;
    common_vendor.index.$off("orderCancelled", this.handleOrderCancelled);
    common_vendor.index.__f__("log", "at pages/booking/detail.vue:278", "[BookingDetail] 已移除 orderCancelled 事件监听");
  },
  onPullDownRefresh() {
    this.refreshData();
  },
  onShow() {
    try {
      if (this.bookingId) {
        this.bookingStore.getBookingDetail(this.bookingId, false).then(() => this.$nextTick()).catch(() => {
        });
      }
    } catch (e) {
    }
  },
  mounted() {
  },
  methods: {
    // 初始化数据
    async initData() {
      try {
        if (!this.bookingId) {
          throw new Error("订单ID无效，请重新进入页面");
        }
        utils_request.clearCache(`/bookings/${this.bookingId}`);
        await this.bookingStore.getBookingDetail(this.bookingId);
        await this.$nextTick();
        if (!this.bookingDetail) {
          throw new Error("未能获取到订单数据，请检查网络连接");
        }
        if (!this.bookingDetail.orderNo && !this.bookingDetail.id) {
          throw new Error("订单数据不完整，订单可能不存在或已被删除");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/detail.vue:333", "初始化数据失败:", error);
        common_vendor.index.showModal({
          title: "加载失败",
          content: error.message || "无法获取订单详情，请检查订单号是否正确",
          showCancel: true,
          cancelText: "返回",
          confirmText: "重试",
          success: (res) => {
            if (res.confirm) {
              this.initData();
            } else {
              common_vendor.index.navigateBack();
            }
          }
        });
      }
    },
    // 刷新数据
    async refreshData() {
      try {
        await this.initData();
        common_vendor.index.stopPullDownRefresh();
      } catch (error) {
        common_vendor.index.stopPullDownRefresh();
        common_vendor.index.__f__("error", "at pages/booking/detail.vue:361", "刷新数据失败:", error);
      }
    },
    // 🔥 修复问题1: 处理订单取消事件
    async handleOrderCancelled(eventData) {
      try {
        if (eventData.orderId && eventData.orderId == this.bookingId) {
          await this.bookingStore.getBookingDetail(this.bookingId, false);
          await this.$nextTick();
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/detail.vue:381", "[BookingDetail] ❌ 处理订单取消事件失败:", error);
      }
    },
    // 显示取消预约弹窗
    showCancelModal() {
      common_vendor.index.__f__("log", "at pages/booking/detail.vue:387", "显示取消预约弹窗");
      this.showCancelPopup = true;
      this.$nextTick(() => {
        if (this.$refs.cancelPopup) {
          common_vendor.index.__f__("log", "at pages/booking/detail.vue:393", "打开弹窗，cancelPopup ref:", this.$refs.cancelPopup);
          this.$refs.cancelPopup.open();
        } else {
          common_vendor.index.__f__("error", "at pages/booking/detail.vue:396", "cancelPopup引用不存在，使用系统弹窗");
          this.showCancelPopup = false;
          common_vendor.index.showModal({
            title: "取消预约",
            content: "确定要取消这个预约吗？取消后可能产生手续费，具体以场馆规定为准",
            success: (res) => {
              if (res.confirm) {
                this.confirmCancel();
              }
            }
          });
        }
      });
    },
    // 关闭取消预约弹窗
    closeCancelModal() {
      common_vendor.index.__f__("log", "at pages/booking/detail.vue:413", "关闭取消预约弹窗");
      if (this.$refs.cancelPopup) {
        this.$refs.cancelPopup.close();
      }
      this.showCancelPopup = false;
    },
    // 确认取消
    async confirmCancel() {
      var _a, _b, _c;
      try {
        common_vendor.index.showLoading({ title: "取消中..." });
        await this.bookingStore.cancelBooking(this.bookingId);
        common_vendor.index.hideLoading();
        this.closeCancelModal();
        common_vendor.index.showToast({
          title: "取消成功",
          icon: "success"
        });
        try {
          await this.bookingStore.getBookingDetail(this.bookingId, false);
          await this.$nextTick();
        } catch (e) {
          common_vendor.index.__f__("warn", "at pages/booking/detail.vue:443", "[BookingDetail] 快速刷新详情失败(忽略)：", e);
        }
        if (this.bookingDetail && typeof common_vendor.index !== "undefined" && common_vendor.index.$emit) {
          const venueId = this.bookingDetail.venueId;
          const date = this.bookingDetail.bookingDate || this.bookingDetail.date;
          try {
            if (this.venueStore) {
              if (typeof this.venueStore.clearTimeSlotCache === "function") {
                await this.venueStore.clearTimeSlotCache(venueId, date);
              }
              if (this.venueStore.cache && this.venueStore.cache.timeSlots) {
                const cacheKey = `${venueId}_${date}`;
                this.venueStore.cache.timeSlots.delete(cacheKey);
                this.venueStore.cache.timeSlots.clear();
              }
              this.venueStore.setTimeSlots([]);
              common_vendor.index.__f__("log", "at pages/booking/detail.vue:470", "[BookingDetail] ✅ 已清除 venue store 缓存");
            }
            const { default: cacheManager } = await "../../utils/cache-manager.js";
            if (cacheManager) {
              cacheManager.clearTimeSlotCache(venueId, date);
              const timeSlotKey = cacheManager.generateTimeSlotKey ? cacheManager.generateTimeSlotKey(venueId, date) : `timeslots_${venueId}_${date}`;
              cacheManager.delete(timeSlotKey);
              common_vendor.index.__f__("log", "at pages/booking/detail.vue:483", "[BookingDetail] ✅ 已清除缓存管理器缓存");
            }
            const { default: unifiedTimeSlotManager } = await "../../utils/unified-timeslot-manager.js";
            if (unifiedTimeSlotManager) {
              unifiedTimeSlotManager.clearCache(venueId, date);
              common_vendor.index.__f__("log", "at pages/booking/detail.vue:490", "[BookingDetail] ✅ 已清除统一时间段管理器缓存");
            }
            try {
              const storageKeys = [
                `gym_booking_timeslots_${venueId}_${date}`,
                `timeslots_${venueId}_${date}`,
                `venue_${venueId}_${date}`,
                `cache_timeslots_${venueId}_${date}`
              ];
              storageKeys.forEach((key) => {
                try {
                  common_vendor.index.removeStorageSync(key);
                } catch (e) {
                }
              });
              common_vendor.index.__f__("log", "at pages/booking/detail.vue:509", "[BookingDetail] ✅ 已清除本地存储缓存");
            } catch (storageError) {
              common_vendor.index.__f__("warn", "at pages/booking/detail.vue:511", "[BookingDetail] 清除本地存储缓存失败:", storageError);
            }
          } catch (error) {
            common_vendor.index.__f__("error", "at pages/booking/detail.vue:515", "[BookingDetail] ❌ 清除缓存失败:", error);
          }
          common_vendor.index.$emit("force-refresh-timeslots", {
            venueId,
            date,
            reason: "booking-cancelled-cache-clear",
            clearCache: true,
            forceRefresh: true,
            orderId: this.bookingId,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
          common_vendor.index.$emit("timeslot-updated", {
            venueId,
            date,
            action: "booking-cancelled-immediate",
            bookingType: this.bookingDetail.bookingType,
            startTime: this.bookingDetail.startTime,
            endTime: this.bookingDetail.endTime,
            orderId: this.bookingId,
            immediate: true,
            clearCache: true,
            forceRefresh: true,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
          setTimeout(() => {
            common_vendor.index.$emit("force-refresh-timeslots", {
              venueId,
              date,
              reason: "booking-cancelled-delayed-refresh",
              clearCache: true,
              forceRefresh: true,
              orderId: this.bookingId,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          }, 1e3);
        }
        try {
          const venueId = (_a = this.bookingDetail) == null ? void 0 : _a.venueId;
          const date = ((_b = this.bookingDetail) == null ? void 0 : _b.bookingDate) || ((_c = this.bookingDetail) == null ? void 0 : _c.date);
          if (!venueId || !date) {
            throw new Error("缺少场馆或日期，无法验证后端状态");
          }
          const { get } = await "../../utils/request.js";
          const response = await get(`/timeslots/venue/${venueId}/date/${date}`, {
            _t: Date.now(),
            _nocache: 1
          }, {
            cache: false,
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache",
              "Expires": "0"
            }
          });
          if (response && response.data) {
            const targetSlots = response.data.filter((slot) => {
              const startHour = parseInt(slot.startTime.split(":")[0]);
              return startHour >= 11 && startHour < 13;
            });
          }
        } catch (verifyError) {
          common_vendor.index.__f__("error", "at pages/booking/detail.vue:595", "[BookingDetail] 验证后端状态失败:", verifyError);
        }
        if (!this.bookingDetail || this.bookingDetail.status !== "CANCELLED") {
          await this.refreshData();
        }
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/booking/detail.vue:605", "取消预约失败:", error);
        common_vendor.index.showToast({
          title: error.message || "取消失败",
          icon: "error"
        });
      }
    },
    // 🎯 使用统一时间段管理器立即释放时间段
    async useUnifiedTimeSlotManagerForRelease() {
      try {
        common_vendor.index.__f__("log", "at pages/booking/detail.vue:616", "[BookingDetail] 🚨🚨🚨 开始使用统一时间段管理器立即释放时间段 🚨🚨🚨");
        common_vendor.index.__f__("log", "at pages/booking/detail.vue:617", "[BookingDetail] 预约详情:", {
          venueId: this.bookingDetail.venueId,
          date: this.bookingDetail.bookingDate || this.bookingDetail.date,
          startTime: this.bookingDetail.startTime,
          endTime: this.bookingDetail.endTime,
          bookingType: this.bookingDetail.bookingType
        });
        const { default: unifiedTimeSlotManager } = await "../../utils/unified-timeslot-manager.js";
        if (unifiedTimeSlotManager && typeof unifiedTimeSlotManager.immediateReleaseTimeSlots === "function") {
          common_vendor.index.__f__("log", "at pages/booking/detail.vue:629", "[BookingDetail] ✅ 统一时间段管理器可用，开始调用立即释放方法");
          await unifiedTimeSlotManager.immediateReleaseTimeSlots(
            this.bookingDetail.venueId,
            this.bookingDetail.bookingDate || this.bookingDetail.date,
            this.bookingDetail.startTime,
            this.bookingDetail.endTime,
            this.bookingDetail.bookingType || "EXCLUSIVE"
          );
          common_vendor.index.__f__("log", "at pages/booking/detail.vue:637", "[BookingDetail] 🎉 统一时间段管理器立即释放完成");
        } else {
          common_vendor.index.__f__("error", "at pages/booking/detail.vue:639", "[BookingDetail] ❌ 统一时间段管理器不可用或方法不存在");
          common_vendor.index.__f__("log", "at pages/booking/detail.vue:640", "[BookingDetail] unifiedTimeSlotManager:", unifiedTimeSlotManager);
          common_vendor.index.__f__("log", "at pages/booking/detail.vue:641", "[BookingDetail] immediateReleaseTimeSlots 方法存在:", typeof (unifiedTimeSlotManager == null ? void 0 : unifiedTimeSlotManager.immediateReleaseTimeSlots));
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/booking/detail.vue:645", "[BookingDetail] ❌ 使用统一时间段管理器失败:", error);
      }
    },
    // 评价场馆
    reviewVenue() {
      common_vendor.index.navigateTo({
        url: `/pages/venue/review?venueId=${this.bookingDetail.venueId}&bookingId=${this.bookingId}`
      });
    },
    // 支付订单
    payBooking() {
      if (!this.bookingDetail || !this.bookingDetail.id) {
        common_vendor.index.showToast({
          title: "订单信息不完整",
          icon: "none"
        });
        return;
      }
      common_vendor.index.__f__("log", "at pages/booking/detail.vue:666", "跳转到支付页面，订单ID:", this.bookingDetail.id);
      common_vendor.index.navigateTo({
        url: `/pages/payment/index?orderId=${this.bookingDetail.id}&type=booking`
      });
    },
    // 再次预约
    rebookVenue() {
      common_vendor.index.navigateTo({
        url: `/pages/venue/detail?id=${this.bookingDetail.venueId}`
      });
    },
    // 跳转到拼场详情
    navigateToSharingDetail() {
      if (this.bookingDetail.sharingOrder) {
        common_vendor.index.navigateTo({
          url: `/pages/sharing/detail?id=${this.bookingDetail.sharingOrder.id}`
        });
      }
    },
    // 拨打电话
    callVenue() {
      if (this.bookingDetail.venuePhone) {
        common_vendor.index.makePhoneCall({
          phoneNumber: this.bookingDetail.venuePhone
        });
      } else {
        common_vendor.index.showToast({
          title: "暂无联系方式",
          icon: "none"
        });
      }
    },
    // 打开地图
    openMap() {
      if (this.bookingDetail.venueLatitude && this.bookingDetail.venueLongitude) {
        common_vendor.index.openLocation({
          latitude: this.bookingDetail.venueLatitude,
          longitude: this.bookingDetail.venueLongitude,
          name: this.bookingDetail.venueName,
          address: this.bookingDetail.venueLocation
        });
      } else {
        common_vendor.index.showToast({
          title: "暂无位置信息",
          icon: "none"
        });
      }
    },
    // 格式化日期
    formatDate(date) {
      return utils_helpers.formatDate(date, "YYYY年MM月DD日 dddd");
    },
    // 格式化日期时间
    formatDateTime(datetime) {
      return utils_helpers.formatDateTime(datetime, "YYYY-MM-DD HH:mm");
    },
    // 格式化创建时间
    formatCreateTime(datetime) {
      return utils_helpers.formatTime(datetime, "YYYY-MM-DD HH:mm");
    },
    // 获取状态样式类
    getStatusClass(status) {
      const statusMap = {
        "PENDING": "status-pending",
        "CONFIRMED": "status-confirmed",
        "COMPLETED": "status-completed",
        "CANCELLED": "status-cancelled"
      };
      return statusMap[status] || "status-pending";
    },
    // 获取状态图标
    getStatusIcon(status) {
      const iconMap = {
        "PENDING": "⏳",
        "CONFIRMED": "✅",
        "COMPLETED": "🎉",
        "CANCELLED": "❌"
      };
      return iconMap[status] || "⏳";
    },
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        "PENDING": "待确认",
        "CONFIRMED": "已确认",
        "COMPLETED": "已完成",
        "CANCELLED": "已取消"
      };
      return statusMap[status] || "待确认";
    },
    // 获取状态描述
    getStatusDesc(status) {
      const descMap = {
        "PENDING": "场馆正在确认您的预约",
        "CONFIRMED": "预约已确认，请按时到场",
        "COMPLETED": "预约已完成，感谢您的使用",
        "CANCELLED": "预约已取消"
      };
      return descMap[status] || "";
    },
    // 获取拼场状态文本
    getSharingStatusText(status) {
      const statusMap = {
        "RECRUITING": "招募中",
        "FULL": "已满员",
        "COMPLETED": "已完成",
        "CANCELLED": "已取消"
      };
      return statusMap[status] || "招募中";
    },
    // 获取预约类型文本
    getBookingTypeText(bookingType) {
      const typeMap = {
        "EXCLUSIVE": "包场",
        "SHARED": "拼场"
      };
      return typeMap[bookingType] || "--";
    },
    // 获取预约类型样式类
    getBookingTypeClass(bookingType) {
      const classMap = {
        "EXCLUSIVE": "booking-type-exclusive",
        "SHARED": "booking-type-shared"
      };
      return classMap[bookingType] || "";
    },
    // 检查是否是虚拟订单
    isVirtualOrder() {
      if (!this.bookingDetail)
        return false;
      const bookingId = typeof this.bookingDetail.id === "string" ? parseInt(this.bookingDetail.id) : this.bookingDetail.id;
      return bookingId < 0;
    },
    // 获取支付金额（兼容虚拟订单和普通订单）
    getPaymentAmount() {
      if (!this.bookingDetail)
        return "0.00";
      if (this.isVirtualOrder()) {
        const amount = this.bookingDetail.paymentAmount || 0;
        return amount.toFixed(2);
      } else {
        const amount = this.bookingDetail.totalPrice || 0;
        return amount.toFixed(2);
      }
    },
    // 格式化预约日期（兼容虚拟订单和普通订单）
    formatBookingDate() {
      if (!this.bookingDetail)
        return "--";
      if (this.isVirtualOrder()) {
        const bookingTime = this.bookingDetail.bookingTime;
        if (!bookingTime)
          return "--";
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
            common_vendor.index.__f__("error", "at pages/booking/detail.vue:851", "虚拟订单日期格式化错误 - 无效的时间:", bookingTime);
            return "--";
          }
          return dateTime.toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
          }).replace(/\//g, "-");
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/booking/detail.vue:861", "虚拟订单日期格式化错误:", error);
          return "--";
        }
      } else {
        if (this.bookingDetail.bookingDate) {
          return this.formatDate(this.bookingDetail.bookingDate);
        }
        return "--";
      }
    },
    // 格式化预约时间（兼容虚拟订单和普通订单）
    formatBookingTime() {
      if (!this.bookingDetail)
        return "--";
      if (this.isVirtualOrder()) {
        const startTime = this.bookingDetail.bookingTime;
        const endTime = this.bookingDetail.endTime;
        if (!startTime)
          return "--";
        try {
          let startDateTime, endDateTime;
          if (typeof startTime === "string") {
            let isoTime = startTime;
            if (startTime.includes(" ") && !startTime.includes("T")) {
              isoTime = startTime.replace(" ", "T");
            }
            startDateTime = new Date(isoTime);
            common_vendor.index.__f__("log", "at pages/booking/detail.vue:895", "预约详情时间转换 - 原始:", startTime, "转换后:", isoTime, "解析结果:", startDateTime);
          } else {
            startDateTime = new Date(startTime);
          }
          if (endTime) {
            if (typeof endTime === "string") {
              let isoEndTime = endTime;
              if (endTime.includes(" ") && !endTime.includes("T")) {
                isoEndTime = endTime.replace(" ", "T");
              }
              endDateTime = new Date(isoEndTime);
              common_vendor.index.__f__("log", "at pages/booking/detail.vue:907", "预约详情结束时间转换 - 原始:", endTime, "转换后:", isoEndTime, "解析结果:", endDateTime);
            } else {
              endDateTime = new Date(endTime);
            }
          }
          if (isNaN(startDateTime.getTime())) {
            common_vendor.index.__f__("error", "at pages/booking/detail.vue:915", "虚拟订单时间格式化错误 - 无效的开始时间:", startTime);
            return "--";
          }
          const startTimeStr = startDateTime.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          });
          let endTimeStr = "";
          if (endDateTime && !isNaN(endDateTime.getTime())) {
            endTimeStr = endDateTime.toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false
            });
          }
          return endTimeStr ? `${startTimeStr} - ${endTimeStr}` : startTimeStr;
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/booking/detail.vue:938", "虚拟订单时间格式化错误:", error);
          return "--";
        }
      } else {
        if (this.bookingDetail.startTime && this.bookingDetail.endTime) {
          return `${this.bookingDetail.startTime} - ${this.bookingDetail.endTime}`;
        }
        return "--";
      }
    }
  }
};
if (!Array) {
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  _component_uni_popup();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  return common_vendor.e({
    a: $options.loading
  }, $options.loading ? {} : !$options.bookingDetail || !$options.bookingDetail.orderNo ? {
    c: common_vendor.o((...args) => $options.initData && $options.initData(...args))
  } : common_vendor.e({
    d: common_vendor.t($options.getStatusIcon((_a = $options.bookingDetail) == null ? void 0 : _a.status)),
    e: common_vendor.n($options.getStatusClass((_b = $options.bookingDetail) == null ? void 0 : _b.status)),
    f: common_vendor.t($options.getStatusText((_c = $options.bookingDetail) == null ? void 0 : _c.status)),
    g: common_vendor.t($options.getStatusDesc((_d = $options.bookingDetail) == null ? void 0 : _d.status)),
    h: common_vendor.t(((_e = $options.bookingDetail) == null ? void 0 : _e.orderNo) || "--"),
    i: common_vendor.t(((_f = $options.bookingDetail) == null ? void 0 : _f.venueName) || "--"),
    j: common_vendor.t($options.getBookingTypeText((_g = $options.bookingDetail) == null ? void 0 : _g.bookingType)),
    k: common_vendor.n($options.getBookingTypeClass((_h = $options.bookingDetail) == null ? void 0 : _h.bookingType)),
    l: $options.isVirtualOrder()
  }, $options.isVirtualOrder() ? {} : {}, {
    m: common_vendor.t(((_i = $options.bookingDetail) == null ? void 0 : _i.venueLocation) || "--"),
    n: common_vendor.t($options.formatBookingDate()),
    o: common_vendor.t($options.formatBookingTime()),
    p: $options.isVirtualOrder()
  }, $options.isVirtualOrder() ? {
    q: common_vendor.t($options.getPaymentAmount())
  } : $options.bookingDetail && $options.bookingDetail.isSharedBooking ? {
    s: common_vendor.t($options.bookingDetail && $options.bookingDetail.totalOriginalPrice || 0),
    t: common_vendor.t(($options.bookingDetail && $options.bookingDetail.totalOriginalPrice) - ($options.bookingDetail && $options.bookingDetail.totalPrice) || 0),
    v: common_vendor.t($options.bookingDetail && $options.bookingDetail.totalPrice || 0)
  } : {
    w: common_vendor.t($options.bookingDetail && $options.bookingDetail.totalPrice || 0)
  }, {
    r: $options.bookingDetail && $options.bookingDetail.isSharedBooking,
    x: common_vendor.t($options.formatCreateTime($options.bookingDetail && $options.bookingDetail.createdAt || $options.bookingDetail && $options.bookingDetail.createTime)),
    y: common_vendor.t($options.bookingDetail && $options.bookingDetail.venuePhone || "暂无"),
    z: common_vendor.o((...args) => $options.callVenue && $options.callVenue(...args)),
    A: common_vendor.t($options.bookingDetail && $options.bookingDetail.venueLocation || "暂无"),
    B: common_vendor.o((...args) => $options.openMap && $options.openMap(...args)),
    C: $options.bookingDetail && $options.bookingDetail.sharingOrder
  }, $options.bookingDetail && $options.bookingDetail.sharingOrder ? {
    D: common_vendor.t($options.bookingDetail && $options.bookingDetail.sharingOrder && $options.bookingDetail.sharingOrder.teamName || ""),
    E: common_vendor.t($options.getSharingStatusText($options.bookingDetail && $options.bookingDetail.sharingOrder && $options.bookingDetail.sharingOrder.status)),
    F: common_vendor.t($options.bookingDetail && $options.bookingDetail.sharingOrder && $options.bookingDetail.sharingOrder.currentParticipants || 0),
    G: common_vendor.t($options.bookingDetail && $options.bookingDetail.sharingOrder && $options.bookingDetail.sharingOrder.maxParticipants || 0),
    H: common_vendor.t($options.bookingDetail && $options.bookingDetail.sharingOrder && $options.bookingDetail.sharingOrder.pricePerPerson || 0),
    I: common_vendor.t($options.bookingDetail && $options.bookingDetail.sharingOrder && $options.bookingDetail.sharingOrder.description || "暂无说明"),
    J: common_vendor.o((...args) => $options.navigateToSharingDetail && $options.navigateToSharingDetail(...args))
  } : {}, {
    K: $options.bookingDetail && $options.bookingDetail.status === "PENDING"
  }, $options.bookingDetail && $options.bookingDetail.status === "PENDING" ? {
    L: common_vendor.o((...args) => $options.showCancelModal && $options.showCancelModal(...args))
  } : {}, {
    M: $options.bookingDetail && $options.bookingDetail.status === "PENDING"
  }, $options.bookingDetail && $options.bookingDetail.status === "PENDING" ? {
    N: common_vendor.o((...args) => $options.payBooking && $options.payBooking(...args))
  } : {}, {
    O: $options.bookingDetail && $options.bookingDetail.status === "COMPLETED"
  }, $options.bookingDetail && $options.bookingDetail.status === "COMPLETED" ? {
    P: common_vendor.o((...args) => $options.reviewVenue && $options.reviewVenue(...args))
  } : {}, {
    Q: common_vendor.o((...args) => $options.rebookVenue && $options.rebookVenue(...args)),
    R: $data.showCancelPopup
  }, $data.showCancelPopup ? {
    S: common_vendor.o((...args) => $options.closeCancelModal && $options.closeCancelModal(...args)),
    T: common_vendor.o((...args) => $options.confirmCancel && $options.confirmCancel(...args)),
    U: common_vendor.sr("cancelPopup", "2f755c8f-0"),
    V: common_vendor.p({
      type: "center",
      ["mask-click"]: false
    })
  } : {}), {
    b: !$options.bookingDetail || !$options.bookingDetail.orderNo
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-2f755c8f"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/booking/detail.js.map
