"use strict";
const common_vendor = require("../../common/vendor.js");
const api_payment = require("../../api/payment.js");
const _sfc_main = {
  name: "PaymentFailed",
  data() {
    return {
      orderInfo: null,
      orderId: null,
      failureReason: ""
    };
  },
  onLoad(options) {
    this.orderId = options.orderId;
    this.failureReason = options.reason || "支付过程中出现问题";
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
    // 加载订单信息
    async loadOrderInfo() {
      try {
        common_vendor.index.showLoading({ title: "加载中..." });
        const response = await api_payment.getOrderDetail(this.orderId);
        if (response && response.data) {
          this.orderInfo = response.data;
        } else if (response) {
          this.orderInfo = response;
        } else {
          throw new Error("未获取到订单数据");
        }
        common_vendor.index.hideLoading();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/payment/failed.vue:112", "加载订单信息失败:", error);
        this.orderInfo = {
          orderNo: `ORD${Date.now()}`,
          totalPrice: 0,
          venueName: "体育场馆",
          bookingDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          startTime: "09:00",
          endTime: "10:00"
        };
        common_vendor.index.showToast({
          title: "加载订单信息失败，显示默认信息",
          icon: "none",
          duration: 2e3
        });
      }
    },
    // 格式化日期时间
    formatDateTime(date, startTime, endTime) {
      if (!date || !startTime)
        return "未知时间";
      const dateStr = new Date(date).toLocaleDateString("zh-CN");
      const start = startTime.substring(0, 5);
      const end = endTime ? endTime.substring(0, 5) : "";
      return `${dateStr} ${start}${end ? "-" + end : ""}`;
    },
    // 返回订单页面
    goBack() {
      common_vendor.index.navigateBack();
    },
    // 重新支付
    retryPayment() {
      if (this.orderId) {
        common_vendor.index.redirectTo({
          url: `/pages/payment/index?orderId=${this.orderId}`
        });
      }
    },
    // 联系客服
    callService() {
      common_vendor.index.showModal({
        title: "联系客服",
        content: "客服电话：400-123-4567\n工作时间：9:00-18:00",
        showCancel: true,
        cancelText: "取消",
        confirmText: "拨打",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.makePhoneCall({
              phoneNumber: "400-123-4567"
            });
          }
        }
      });
    },
    // 查看常见问题
    viewFAQ() {
      common_vendor.index.showToast({
        title: "功能开发中",
        icon: "none"
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.failureReason || "支付过程中出现问题"),
    b: $data.orderInfo
  }, $data.orderInfo ? {
    c: common_vendor.t($data.orderInfo.orderNo),
    d: common_vendor.t($data.orderInfo.totalPrice),
    e: common_vendor.t($data.orderInfo.venueName),
    f: common_vendor.t($options.formatDateTime($data.orderInfo.bookingDate, $data.orderInfo.startTime, $data.orderInfo.endTime))
  } : {}, {
    g: common_vendor.o((...args) => $options.goBack && $options.goBack(...args)),
    h: common_vendor.o((...args) => $options.retryPayment && $options.retryPayment(...args)),
    i: common_vendor.o((...args) => $options.callService && $options.callService(...args)),
    j: common_vendor.o((...args) => $options.viewFAQ && $options.viewFAQ(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-67faace1"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/payment/failed.js.map
