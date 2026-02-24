"use strict";
const common_vendor = require("../../common/vendor.js");
const api_payment = require("../../api/payment.js");
const api_order = require("../../api/order.js");
const utils_request = require("../../utils/request.js");
const stores_booking = require("../../stores/booking.js");
const utils_paymentDebug = require("../../utils/payment-debug.js");
const _sfc_main = {
  name: "PaymentPage",
  data() {
    return {
      bookingStore: null,
      orderId: null,
      orderType: "booking",
      // booking 或 sharing
      orderInfo: null,
      loading: true,
      selectedMethod: "wechat",
      paying: false,
      fromPage: "",
      // 记录来源页面
      paymentResult: {
        success: false,
        title: "",
        message: "",
        buttonText: "确定"
      },
      // 弹窗状态控制变量
      internalResultPopupOpened: false,
      resultPopupPosition: "",
      _resultPopupRef: null
      // 缓存弹窗引用
    };
  },
  computed: {
    canPay() {
      if (!this.orderInfo || !this.selectedMethod || this.paying)
        return false;
      if (this.orderInfo.isVirtualOrder) {
        return this.orderInfo.status === "PENDING";
      } else {
        return this.orderInfo.status === "PENDING";
      }
    },
    payButtonText() {
      var _a;
      if (this.paying)
        return "支付中...";
      if (!this.orderInfo)
        return "加载中...";
      if (this.orderInfo.isVirtualOrder) {
        if (this.orderInfo.status === "PENDING") {
          const amount = this.orderInfo.paymentAmount || this.orderInfo.totalPrice;
          return `立即支付 ¥${(amount == null ? void 0 : amount.toFixed(2)) || "0.00"}`;
        } else {
          const statusMessages = {
            "SHARING_SUCCESS": "拼场已成功",
            "CANCELLED": "申请已取消",
            "EXPIRED": "申请已过期",
            "NOT_FOUND": "申请不存在",
            "ACCESS_DENIED": "无权访问"
          };
          return statusMessages[this.orderInfo.status] || "订单状态异常";
        }
      } else {
        if (this.orderInfo.status === "PENDING") {
          return `立即支付 ¥${((_a = this.orderInfo.totalPrice) == null ? void 0 : _a.toFixed(2)) || "0.00"}`;
        } else {
          return "订单状态异常";
        }
      }
    }
  },
  onLoad(options) {
    this.bookingStore = stores_booking.useBookingStore();
    if (options.orderId) {
      this.orderId = options.orderId;
      this.orderType = options.type || "booking";
      this.fromPage = options.from || "";
      this.loadOrderInfo();
    } else {
      common_vendor.index.__f__("error", "at pages/payment/index.vue:228", "支付页面：订单ID缺失");
      common_vendor.index.navigateBack();
    }
    this.$nextTick(() => {
      try {
        if (this.$refs.resultPopup) {
          this._resultPopupRef = this.$refs.resultPopup;
        }
      } catch (error) {
      }
      setTimeout(() => {
        try {
          if (!this._resultPopupRef && this.$refs.resultPopup) {
            this._resultPopupRef = this.$refs.resultPopup;
          }
        } catch (error) {
        }
      }, 500);
    });
  },
  onUnload() {
    this._resultPopupRef = null;
  },
  methods: {
    // 加载订单信息
    async loadOrderInfo() {
      try {
        this.loading = true;
        const isVirtualOrder = this.orderId < 0;
        let response;
        if (isVirtualOrder) {
          const requestId = Math.abs(this.orderId);
          try {
            response = await utils_request.get(`/users/me/virtual-order/${requestId}`);
          } catch (error) {
            common_vendor.index.__f__("error", "at pages/payment/index.vue:276", "获取虚拟订单失败:", error);
            if (error.status === 404) {
              response = {
                data: {
                  id: this.orderId,
                  orderNo: `REQ_${requestId}`,
                  status: "NOT_FOUND",
                  isVirtualOrder: true,
                  venueName: "未知场馆",
                  totalPrice: 0,
                  paymentAmount: 0
                }
              };
            } else if (error.status === 403) {
              response = {
                data: {
                  id: this.orderId,
                  orderNo: `REQ_${requestId}`,
                  status: "ACCESS_DENIED",
                  isVirtualOrder: true,
                  venueName: "未知场馆",
                  totalPrice: 0,
                  paymentAmount: 0
                }
              };
            } else {
              throw error;
            }
          }
        } else {
          if (!this.bookingStore) {
            response = await api_order.getOrderDetail(this.orderId);
          } else {
            try {
              await this.bookingStore.getBookingDetail(this.orderId);
              const storeData = this.bookingStore.bookingDetailGetter;
              if (storeData) {
                response = { data: storeData };
              } else {
                response = await api_order.getOrderDetail(this.orderId);
              }
            } catch (storeError) {
              common_vendor.index.__f__("error", "at pages/payment/index.vue:327", "Store调用失败，使用原API作为备用:", storeError);
              response = await api_order.getOrderDetail(this.orderId);
            }
          }
        }
        this.orderInfo = response.data || response;
        if (this.orderInfo && !isVirtualOrder && (this.orderInfo.totalPrice === 0 || !this.orderInfo.totalPrice)) {
          const debugResult = utils_paymentDebug.debugOrderAmount(this.orderInfo);
          if (debugResult.success && debugResult.calculatedPrice > 0) {
            this.orderInfo.totalPrice = debugResult.calculatedPrice;
          } else {
            if (this.orderInfo.price && this.orderInfo.price > 0) {
              this.orderInfo.totalPrice = this.orderInfo.price;
            } else {
              const calculatedPrice = this.calculateOrderPrice();
              if (calculatedPrice > 0) {
                this.orderInfo.totalPrice = calculatedPrice;
              }
            }
          }
        }
        if (isVirtualOrder) {
          this.orderInfo.isVirtualOrder = true;
          if (!this.orderInfo.status) {
            common_vendor.index.__f__("error", "at pages/payment/index.vue:364", "虚拟订单状态为空！");
            this.orderInfo.status = "PENDING";
          }
          if (!this.orderInfo.paymentAmount && !this.orderInfo.totalPrice) {
            common_vendor.index.__f__("error", "at pages/payment/index.vue:370", "虚拟订单金额为空！");
          }
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/payment/index.vue:375", "加载订单信息失败:", error);
        common_vendor.index.navigateBack();
      } finally {
        this.loading = false;
      }
    },
    // 选择支付方式
    selectMethod(method) {
      this.selectedMethod = method;
    },
    // 处理支付
    async handlePayment() {
      if (!this.canPay || this.paying)
        return;
      try {
        this.paying = true;
        common_vendor.index.showLoading({ title: "支付中..." });
        const response = await api_payment.payOrder(this.orderId, this.selectedMethod);
        common_vendor.index.hideLoading();
        if (response.success) {
          common_vendor.index.$emit("paymentSuccess", {
            orderId: this.orderId,
            type: "sharing",
            // 拼场支付
            fromPage: this.fromPage || "payment",
            timestamp: Date.now()
          });
          let successUrl = `/pages/payment/success?orderId=${this.orderId}`;
          if (this.fromPage) {
            successUrl += `&from=${this.fromPage}`;
          }
          common_vendor.index.redirectTo({
            url: successUrl
          });
        } else {
          throw new Error(response.message || "支付失败");
        }
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/payment/index.vue:428", "支付失败:", error);
        common_vendor.index.redirectTo({
          url: `/pages/payment/failed?orderId=${this.orderId}&reason=${encodeURIComponent(error.message)}`
        });
      } finally {
        this.paying = false;
      }
    },
    // 移除自动弹窗方法，改为在handlePayment中直接处理结果
    // 关闭弹窗 - 简化版本
    forceClosePopup() {
      try {
        this.closeResultPopup();
        this.paymentResult = {
          success: false,
          title: "",
          message: "",
          buttonText: "确定"
        };
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/payment/index.vue:455", "关闭弹窗失败:", error);
      }
    },
    // 关闭支付结果弹窗（兼容微信小程序）
    closeResultPopup() {
      const debugEnabled = false;
      try {
        let windowInfo, deviceInfo, appBaseInfo;
        try {
          windowInfo = common_vendor.index.getWindowInfo();
          deviceInfo = common_vendor.index.getDeviceInfo();
          appBaseInfo = common_vendor.index.getAppBaseInfo();
          if (debugEnabled)
            ;
        } catch (e) {
        }
        try {
          if (this.resultPopupPosition) {
          }
        } catch (e) {
        }
        let popupInstance = null;
        let methodUsed = "";
        if (this.$refs.resultPopup) {
          popupInstance = this.$refs.resultPopup;
          methodUsed = "$refs";
        } else if (this.$refs.resultPopup && Array.isArray(this.$refs.resultPopup) && this.$refs.resultPopup.length > 0) {
          popupInstance = this.$refs.resultPopup[0];
          methodUsed = "$refs[0]";
        } else if (this._resultPopupRef) {
          popupInstance = this._resultPopupRef;
          methodUsed = "cached";
        } else if (appBaseInfo && (appBaseInfo.appPlatform === "mp-weixin" || (deviceInfo == null ? void 0 : deviceInfo.platform) === "devtools")) {
          try {
            if (this.$scope && typeof this.$scope.selectComponent === "function") {
              popupInstance = this.$scope.selectComponent("#resultPopup");
              methodUsed = "$scope.selectComponent";
            }
          } catch (e) {
            if (debugEnabled)
              ;
          }
        } else {
          try {
            if (this.$children && this.$children.length > 0) {
              for (let child of this.$children) {
                if (child.$options && child.$options.name === "UniPopup") {
                  popupInstance = child;
                  methodUsed = "$children";
                  break;
                }
              }
            }
          } catch (e) {
            if (debugEnabled)
              ;
          }
        }
        if (popupInstance && typeof popupInstance.close === "function") {
          popupInstance.close();
          this.internalResultPopupOpened = false;
          try {
            if (this.resultPopupPosition) {
            }
          } catch (e) {
          }
          return;
        }
        setTimeout(() => {
          try {
            let retryPopupInstance = null;
            if (this.$refs.resultPopup) {
              retryPopupInstance = this.$refs.resultPopup;
            } else if (this._resultPopupRef) {
              retryPopupInstance = this._resultPopupRef;
            } else if (appBaseInfo && (appBaseInfo.appPlatform === "mp-weixin" || (deviceInfo == null ? void 0 : deviceInfo.platform) === "devtools")) {
              if (this.$scope && typeof this.$scope.selectComponent === "function") {
                retryPopupInstance = this.$scope.selectComponent("#resultPopup");
              }
            }
            if (retryPopupInstance && typeof retryPopupInstance.close === "function") {
              retryPopupInstance.close();
              this.internalResultPopupOpened = false;
              return;
            }
            this.internalResultPopupOpened = false;
            try {
              const popupElement = document.querySelector(".uni-popup");
              if (popupElement) {
                popupElement.style.display = "none";
              }
            } catch (domError) {
            }
          } catch (retryError) {
            if (debugEnabled)
              ;
            this.internalResultPopupOpened = false;
          }
        }, 100);
      } catch (error) {
        this.internalResultPopupOpened = false;
      }
    },
    // 处理结果操作 - 简化版本
    handleResultAction() {
      this.forceClosePopup();
      if (this.paymentResult && this.paymentResult.success) {
        common_vendor.index.redirectTo({
          url: "/pages/booking/list"
        });
      }
    },
    // 格式化日期时间
    formatDateTime(date, startTime, endTime) {
      if (!date || !startTime)
        return "未设置";
      let dateStr = "";
      if (typeof date === "string" && date.includes("-")) {
        const [year, month, day] = date.split("-");
        dateStr = `${month}-${day}`;
      } else {
        const dateObj = new Date(date);
        dateStr = dateObj.toLocaleDateString("zh-CN", {
          month: "2-digit",
          day: "2-digit"
        });
      }
      const timeStr = endTime ? `${startTime}-${endTime}` : startTime;
      return `${dateStr} ${timeStr}`;
    },
    // 返回
    goBack() {
      common_vendor.index.navigateBack();
    },
    // 格式化订单时间（处理虚拟订单和普通订单的差异）
    formatOrderDateTime() {
      if (!this.orderInfo)
        return "未设置";
      if (this.orderInfo.isVirtualOrder) {
        const startTime = this.orderInfo.bookingTime;
        const endTime = this.orderInfo.endTime;
        if (!startTime) {
          return "未设置";
        }
        try {
          let startDateTime, endDateTime;
          if (typeof startTime === "string") {
            let isoTime = startTime;
            if (startTime.includes(" ") && !startTime.includes("T")) {
              isoTime = startTime.replace(" ", "T");
            }
            startDateTime = new Date(isoTime);
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
            } else {
              endDateTime = new Date(endTime);
            }
          }
          if (isNaN(startDateTime.getTime())) {
            common_vendor.index.__f__("error", "at pages/payment/index.vue:677", "无效的开始时间:", startTime);
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
          let endTimeStr = "";
          if (endDateTime && !isNaN(endDateTime.getTime())) {
            endTimeStr = endDateTime.toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false
            });
          }
          const result = `${dateStr} ${startTimeStr}${endTimeStr ? "-" + endTimeStr : ""}`;
          return result;
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/payment/index.vue:707", "虚拟订单时间格式化错误:", error, "原始数据:", { startTime, endTime });
          return "时间格式错误";
        }
      } else {
        if (this.orderInfo.bookingTime) {
          const bookingTime = this.orderInfo.bookingTime;
          let endTime = this.orderInfo.endTime;
          if (!endTime) {
            if (this.orderInfo.duration) {
              try {
                const startDateTime = new Date(bookingTime.replace(" ", "T"));
                const durationHours = parseFloat(this.orderInfo.duration);
                const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1e3);
                endTime = endDateTime.toISOString().replace("T", " ").substring(0, 19);
              } catch (error) {
                common_vendor.index.__f__("error", "at pages/payment/index.vue:731", "计算结束时间失败:", error);
              }
            } else {
              try {
                const startDateTime = new Date(bookingTime.replace(" ", "T"));
                const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1e3);
                const year = endDateTime.getFullYear();
                const month = String(endDateTime.getMonth() + 1).padStart(2, "0");
                const day = String(endDateTime.getDate()).padStart(2, "0");
                const hours = String(endDateTime.getHours()).padStart(2, "0");
                const minutes = String(endDateTime.getMinutes()).padStart(2, "0");
                const seconds = String(endDateTime.getSeconds()).padStart(2, "0");
                endTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
              } catch (error) {
                common_vendor.index.__f__("error", "at pages/payment/index.vue:754", "推算结束时间失败:", error);
              }
            }
          }
          try {
            let startDateTime;
            if (typeof bookingTime === "string") {
              let isoTime = bookingTime;
              if (bookingTime.includes(" ") && !bookingTime.includes("T")) {
                isoTime = bookingTime.replace(" ", "T");
              }
              startDateTime = new Date(isoTime);
            } else {
              startDateTime = new Date(bookingTime);
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
            let endTimeStr = "";
            if (endTime) {
              let endDateTime;
              if (typeof endTime === "string") {
                let isoEndTime = endTime;
                if (endTime.includes(" ") && !endTime.includes("T")) {
                  isoEndTime = endTime.replace(" ", "T");
                }
                endDateTime = new Date(isoEndTime);
              } else {
                endDateTime = new Date(endTime);
              }
              if (!isNaN(endDateTime.getTime())) {
                endTimeStr = endDateTime.toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false
                });
              }
            }
            const result = `${dateStr} ${startTimeStr}${endTimeStr ? "-" + endTimeStr : ""}`;
            return result;
          } catch (error) {
            common_vendor.index.__f__("error", "at pages/payment/index.vue:811", "普通订单时间格式化错误:", error);
            return "时间格式错误";
          }
        } else {
          return this.formatDateTime(this.orderInfo.bookingDate, this.orderInfo.startTime, this.orderInfo.endTime);
        }
      }
    },
    // 获取队伍名称
    getTeamName() {
      if (!this.orderInfo)
        return "未设置";
      if (this.orderInfo.isVirtualOrder) {
        return this.orderInfo.applicantTeamName || "未设置";
      } else {
        return this.orderInfo.teamName || "未设置";
      }
    },
    // 获取联系方式
    getContactInfo() {
      if (!this.orderInfo)
        return "未设置";
      if (this.orderInfo.isVirtualOrder) {
        return this.orderInfo.applicantContact || "未设置";
      } else {
        return this.orderInfo.contactInfo || "未设置";
      }
    },
    // 获取订单金额
    getOrderAmount() {
      if (!this.orderInfo)
        return "0.00";
      const isVirtualOrder = this.orderInfo.isVirtualOrder || false;
      const totalPrice = this.orderInfo.totalPrice || 0;
      const paymentAmount = this.orderInfo.paymentAmount || 0;
      const price = this.orderInfo.price || 0;
      let amount;
      if (isVirtualOrder) {
        amount = paymentAmount;
      } else {
        amount = totalPrice;
        if (!amount || amount === 0) {
          amount = price;
          if (!amount || amount === 0) {
            amount = this.calculateOrderPrice();
          }
        }
      }
      const numericAmount = parseFloat(amount) || 0;
      const result = numericAmount.toFixed(2);
      return result;
    },
    // 计算订单价格（当后端价格为0时的备用方案）
    calculateOrderPrice() {
      if (!this.orderInfo)
        return 0;
      const startTime = this.orderInfo.startTime || this.orderInfo.bookingTime;
      const endTime = this.orderInfo.endTime;
      this.orderInfo.venueId;
      if (startTime && endTime) {
        try {
          const startHour = parseInt(startTime.split(":")[0]);
          const startMinute = parseInt(startTime.split(":")[1]);
          const endHour = parseInt(endTime.split(":")[0]);
          const endMinute = parseInt(endTime.split(":")[1]);
          const duration = endHour + endMinute / 60 - (startHour + startMinute / 60);
          let hourlyRate = 120;
          if (this.orderInfo.venueName) {
            hourlyRate = 120;
          }
          const calculatedPrice = duration * hourlyRate;
          return calculatedPrice;
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/payment/index.vue:919", "价格计算失败:", error);
          return 0;
        }
      }
      if (this.orderInfo.bookingType === "SHARED" || this.orderInfo.isVirtualOrder) {
        return 120;
      } else {
        return 240;
      }
    },
    // 获取预约类型文本
    getBookingTypeText() {
      if (!this.orderInfo)
        return "未知";
      if (this.orderInfo.isVirtualOrder) {
        return "拼场";
      }
      return this.orderInfo.bookingType === "SHARED" ? "拼场" : "独享";
    }
  }
};
if (!Array) {
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  _component_uni_popup();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.goBack && $options.goBack(...args)),
    b: $data.loading
  }, $data.loading ? {} : $data.orderInfo ? common_vendor.e({
    d: common_vendor.t($data.orderInfo.orderNo),
    e: common_vendor.t($data.orderInfo.venueName),
    f: common_vendor.t($options.formatOrderDateTime()),
    g: common_vendor.t($options.getBookingTypeText()),
    h: $data.orderInfo.bookingType === "SHARED" || $data.orderInfo.isVirtualOrder
  }, $data.orderInfo.bookingType === "SHARED" || $data.orderInfo.isVirtualOrder ? {
    i: common_vendor.t($options.getTeamName())
  } : {}, {
    j: common_vendor.t($options.getContactInfo()),
    k: common_vendor.t($options.getOrderAmount()),
    l: $data.orderInfo.bookingType === "SHARED" || $data.orderInfo.isVirtualOrder
  }, $data.orderInfo.bookingType === "SHARED" || $data.orderInfo.isVirtualOrder ? {} : {}) : {}, {
    c: $data.orderInfo,
    m: $data.selectedMethod === "wechat"
  }, $data.selectedMethod === "wechat" ? {} : {}, {
    n: $data.selectedMethod === "wechat" ? 1 : "",
    o: common_vendor.o(($event) => $options.selectMethod("wechat")),
    p: $data.selectedMethod === "alipay"
  }, $data.selectedMethod === "alipay" ? {} : {}, {
    q: $data.selectedMethod === "alipay" ? 1 : "",
    r: common_vendor.o(($event) => $options.selectMethod("alipay")),
    s: common_vendor.t($options.getOrderAmount()),
    t: common_vendor.t($options.payButtonText),
    v: !$options.canPay ? 1 : "",
    w: !$options.canPay,
    x: common_vendor.o((...args) => $options.handlePayment && $options.handlePayment(...args)),
    y: common_vendor.o((...args) => $options.forceClosePopup && $options.forceClosePopup(...args)),
    z: $data.paymentResult.success
  }, $data.paymentResult.success ? {} : {}, {
    A: common_vendor.t($data.paymentResult.title),
    B: common_vendor.t($data.paymentResult.message),
    C: common_vendor.t($data.paymentResult.buttonText),
    D: common_vendor.o((...args) => $options.handleResultAction && $options.handleResultAction(...args)),
    E: common_vendor.o((...args) => $options.forceClosePopup && $options.forceClosePopup(...args)),
    F: common_vendor.sr("resultPopup", "44be683b-0"),
    G: $data.internalResultPopupOpened,
    H: common_vendor.n($data.resultPopupPosition),
    I: common_vendor.p({
      type: "center",
      ["mask-click"]: false
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-44be683b"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/payment/index.js.map
