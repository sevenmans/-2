"use strict";
const common_vendor = require("../../common/vendor.js");
const api_payment = require("../../api/payment.js");
const _sfc_main = {
  name: "PaymentTest",
  data() {
    return {
      testOrders: [
        {
          id: 1,
          orderNo: "TEST001",
          bookingType: "EXCLUSIVE",
          venueName: "篮球场A",
          bookingDate: "2025-01-15",
          startTime: "09:00",
          endTime: "10:00",
          totalPrice: 100,
          status: "PENDING"
        },
        {
          id: 2,
          orderNo: "TEST002",
          bookingType: "SHARED",
          venueName: "羽毛球场B",
          bookingDate: "2025-01-15",
          startTime: "14:00",
          endTime: "15:00",
          totalPrice: 50,
          status: "PENDING"
        },
        {
          id: 3,
          orderNo: "TEST003",
          bookingType: "EXCLUSIVE",
          venueName: "网球场C",
          bookingDate: "2025-01-15",
          startTime: "16:00",
          endTime: "17:00",
          totalPrice: 150,
          status: "PAID"
        },
        {
          id: 4,
          orderNo: "TEST004",
          bookingType: "SHARED",
          venueName: "乒乓球场D",
          bookingDate: "2025-01-15",
          startTime: "19:00",
          endTime: "20:00",
          totalPrice: 30,
          status: "PENDING"
        }
      ],
      testResults: []
    };
  },
  methods: {
    // 测试支付功能
    async testPayment(order) {
      try {
        common_vendor.index.showLoading({ title: "测试支付中..." });
        const response = await api_payment.payOrder(order.id);
        order.status = "PAID";
        this.testResults.push({
          id: Date.now(),
          orderNo: order.orderNo,
          success: true,
          message: `${this.getTypeText(order.bookingType)}订单支付成功`
        });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "支付测试成功",
          icon: "success"
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/test/payment-test.vue:151", "支付测试失败:", error);
        this.testResults.push({
          id: Date.now(),
          orderNo: order.orderNo,
          success: false,
          message: `支付失败: ${error.message || "未知错误"}`
        });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "支付测试失败",
          icon: "error"
        });
      }
    },
    // 获取订单类型文本
    getTypeText(bookingType) {
      const typeMap = {
        "EXCLUSIVE": "独享",
        "SHARED": "拼场"
      };
      return typeMap[bookingType] || "普通";
    },
    // 获取订单类型样式
    getTypeClass(bookingType) {
      const classMap = {
        "EXCLUSIVE": "type-exclusive",
        "SHARED": "type-shared"
      };
      return classMap[bookingType] || "type-normal";
    },
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        "PENDING": "待支付",
        "PAID": "已支付",
        "CONFIRMED": "已确认",
        "SHARING": "拼场中",
        "SHARING_SUCCESS": "拼场成功",
        "COMPLETED": "已完成",
        "CANCELLED": "已取消",
        "EXPIRED": "已过期"
      };
      return statusMap[status] || "未知状态";
    },
    // 获取状态样式
    getStatusClass(status) {
      const classMap = {
        "PENDING": "status-pending",
        "PAID": "status-paid",
        "CONFIRMED": "status-confirmed",
        "SHARING": "status-sharing",
        "COMPLETED": "status-completed",
        "CANCELLED": "status-cancelled"
      };
      return classMap[status] || "status-default";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.f($data.testOrders, (order, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(order.orderNo),
        b: common_vendor.t($options.getTypeText(order.bookingType)),
        c: common_vendor.n($options.getTypeClass(order.bookingType)),
        d: common_vendor.t(order.venueName),
        e: common_vendor.t(order.bookingDate),
        f: common_vendor.t(order.startTime),
        g: common_vendor.t(order.endTime),
        h: common_vendor.t(order.totalPrice),
        i: common_vendor.t($options.getStatusText(order.status)),
        j: common_vendor.n($options.getStatusClass(order.status)),
        k: order.status === "PENDING"
      }, order.status === "PENDING" ? {
        l: common_vendor.o(($event) => $options.testPayment(order), order.id)
      } : {
        m: common_vendor.t(order.status === "PAID" ? "已支付" : "不可支付")
      }, {
        n: order.id
      });
    }),
    b: common_vendor.f($data.testResults, (result, k0, i0) => {
      return {
        a: common_vendor.t(result.orderNo),
        b: common_vendor.t(result.success ? "✅ 支付成功" : "❌ 支付失败"),
        c: common_vendor.n(result.success ? "success" : "error"),
        d: common_vendor.t(result.message),
        e: result.id
      };
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-0e21c3a9"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/payment-test.js.map
