"use strict";
const common_vendor = require("../../common/vendor.js");
const api_payment = require("../../api/payment.js");
const utils_request = require("../../utils/request.js");
const stores_adminOrders = require("../../stores/admin-orders.js");
const _sfc_main = {
  name: "PaymentSuccess",
  data() {
    return {
      orderInfo: null,
      orderId: null,
      fromPage: ""
      // 来源页面
    };
  },
  onLoad(options) {
    this.orderId = options.orderId;
    this.fromPage = options.from || "";
    this.notifyAdminOrdersNeedRefresh();
    if (this.orderId) {
      this.loadOrderInfo();
    } else {
      this.orderInfo = {
        orderNo: "未知订单",
        totalPrice: 0,
        venueName: "未知场馆",
        bookingDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        startTime: "00:00",
        endTime: "00:00"
      };
    }
  },
  methods: {
    notifyAdminOrdersNeedRefresh() {
      utils_request.clearCache("/admin/bookings");
      utils_request.clearCache("/admin/dashboard/stats");
      try {
        const adminOrdersStore = stores_adminOrders.useAdminOrdersStore();
        adminOrdersStore.needRefresh = true;
      } catch {
      }
    },
    // 加载订单信息
    async loadOrderInfo() {
      try {
        common_vendor.index.showLoading({ title: "加载中..." });
        const isVirtualOrder = this.orderId < 0;
        let response;
        if (isVirtualOrder) {
          const requestId = Math.abs(this.orderId);
          response = await utils_request.get(`/users/me/virtual-order/${requestId}`);
        } else {
          response = await api_payment.getOrderDetail(this.orderId);
        }
        if (response && response.data) {
          this.orderInfo = response.data;
          if (isVirtualOrder) {
            this.orderInfo.isVirtualOrder = true;
          }
        } else if (response) {
          this.orderInfo = response;
          if (isVirtualOrder) {
            this.orderInfo.isVirtualOrder = true;
          }
        } else {
          throw new Error("未获取到订单数据");
        }
        common_vendor.index.hideLoading();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/payment/success.vue:134", "加载订单信息失败:", error);
        this.orderInfo = {
          orderNo: `ORD${Date.now()}`,
          totalPrice: 0,
          paymentAmount: 0,
          venueName: "体育场馆",
          bookingDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          startTime: "09:00",
          endTime: "10:00",
          isVirtualOrder: this.orderId < 0
        };
        common_vendor.index.showToast({
          title: "加载订单信息失败，显示默认信息",
          icon: "none",
          duration: 2e3
        });
      }
    },
    // 格式化订单时间（兼容虚拟订单和普通订单）
    formatOrderDateTime() {
      if (!this.orderInfo)
        return "未知时间";
      if (this.orderInfo.isVirtualOrder || this.orderInfo.bookingTime) {
        const startTime = this.orderInfo.bookingTime;
        const endTime = this.orderInfo.endTime;
        if (!startTime)
          return "未设置";
        try {
          let startDateTime, endDateTime;
          if (typeof startTime === "string") {
            const isoTime = startTime.replace(" ", "T");
            startDateTime = new Date(isoTime);
          } else {
            startDateTime = new Date(startTime);
          }
          if (endTime) {
            if (typeof endTime === "string") {
              const isoEndTime = endTime.replace(" ", "T");
              endDateTime = new Date(isoEndTime);
            } else {
              endDateTime = new Date(endTime);
            }
          }
          if (isNaN(startDateTime.getTime())) {
            common_vendor.index.__f__("error", "at pages/payment/success.vue:189", "无效的开始时间:", startTime);
            return "时间格式错误";
          }
          const dateStr = startDateTime.toLocaleDateString("zh-CN", {
            month: "2-digit",
            day: "2-digit"
          });
          const startTimeStr = startDateTime.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          });
          let result = `${dateStr} ${startTimeStr}`;
          if (endDateTime && !isNaN(endDateTime.getTime())) {
            const endTimeStr = endDateTime.toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false
            });
            result += `-${endTimeStr}`;
          }
          return result;
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/payment/success.vue:216", "时间格式化错误:", error);
          return "时间格式错误";
        }
      }
      return this.formatDateTime(this.orderInfo.bookingDate, this.orderInfo.startTime, this.orderInfo.endTime);
    },
    // 格式化日期时间（普通订单）
    formatDateTime(date, startTime, endTime) {
      if (!date || !startTime)
        return "未知时间";
      const dateStr = new Date(date).toLocaleDateString("zh-CN");
      const start = startTime.substring(0, 5);
      const end = endTime ? endTime.substring(0, 5) : "";
      return `${dateStr} ${start}${end ? "-" + end : ""}`;
    },
    // 格式化支付时间
    formatPaymentTime() {
      return (/* @__PURE__ */ new Date()).toLocaleString("zh-CN");
    },
    // 获取查看订单按钮文本
    getViewOrderText() {
      if (this.fromPage === "sharing-manage") {
        return "返回管理";
      } else if (this.fromPage === "sharing-list" || this.fromPage === "sharing-detail") {
        return "查看预约";
      } else {
        return "查看订单";
      }
    },
    // 获取返回按钮文本
    getGoHomeText() {
      if (this.fromPage === "sharing-list") {
        return "返回拼场";
      } else if (this.fromPage === "sharing-detail") {
        return "返回拼场";
      } else if (this.fromPage === "sharing-manage") {
        return "返回上页";
      } else {
        return "返回首页";
      }
    },
    // 查看订单
    viewOrder() {
      var _a;
      if (this.orderId) {
        common_vendor.index.$emit("paymentSuccess", {
          orderId: this.orderId,
          fromPage: this.fromPage,
          type: ((_a = this.fromPage) == null ? void 0 : _a.includes("sharing")) ? "sharing" : "booking",
          timestamp: Date.now(),
          preventAutoPopup: true
          // 添加标识防止自动弹窗
        });
        if (this.fromPage === "sharing-manage") {
          common_vendor.index.switchTab({
            url: "/pages/booking/list"
          });
        } else if (this.fromPage === "sharing-list" || this.fromPage === "sharing-detail") {
          common_vendor.index.switchTab({
            url: "/pages/booking/list"
          });
        } else {
          common_vendor.index.navigateTo({
            url: `/pages/booking/detail?id=${this.orderId}`
          });
        }
      }
    },
    // 返回首页
    goHome() {
      var _a;
      common_vendor.index.$emit("paymentSuccess", {
        orderId: this.orderId,
        fromPage: this.fromPage,
        type: ((_a = this.fromPage) == null ? void 0 : _a.includes("sharing")) ? "sharing" : "booking",
        timestamp: Date.now(),
        preventAutoPopup: true
        // 添加标识防止自动弹窗
      });
      if (this.fromPage === "sharing-manage") {
        common_vendor.index.navigateBack();
      } else if (this.fromPage === "sharing-list") {
        common_vendor.index.switchTab({
          url: "/pages/sharing/list"
        });
      } else if (this.fromPage === "sharing-detail") {
        common_vendor.index.switchTab({
          url: "/pages/sharing/list"
        });
      } else {
        common_vendor.index.switchTab({
          url: "/pages/index/index"
        });
      }
    },
    // 获取支付金额（兼容虚拟订单和普通订单）
    getPaymentAmount() {
      if (!this.orderInfo)
        return "0.00";
      const amount = this.orderInfo.isVirtualOrder ? this.orderInfo.paymentAmount : this.orderInfo.totalPrice;
      return (amount == null ? void 0 : amount.toFixed(2)) || "0.00";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.orderInfo
  }, $data.orderInfo ? {
    b: common_vendor.t($data.orderInfo.orderNo),
    c: common_vendor.t($options.getPaymentAmount()),
    d: common_vendor.t($data.orderInfo.venueName),
    e: common_vendor.t($options.formatOrderDateTime()),
    f: common_vendor.t($options.formatPaymentTime())
  } : {}, {
    g: common_vendor.t($options.getViewOrderText()),
    h: common_vendor.o((...args) => $options.viewOrder && $options.viewOrder(...args)),
    i: common_vendor.t($options.getGoHomeText()),
    j: common_vendor.o((...args) => $options.goHome && $options.goHome(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-58066c56"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/payment/success.js.map
