"use strict";
const common_vendor = require("../common/vendor.js");
const utils_countdown = require("../utils/countdown.js");
const _sfc_main = {
  name: "CountdownTimer",
  props: {
    // 订单对象
    order: {
      type: Object,
      required: true
    },
    // 显示标签
    label: {
      type: String,
      default: "自动取消"
    },
    // 是否使用简短格式
    short: {
      type: Boolean,
      default: false
    },
    // 更新间隔（毫秒）
    interval: {
      type: Number,
      default: 1e3
    }
  },
  data() {
    return {
      countdown: null,
      timerId: null,
      showCountdown: false,
      countdownText: "",
      countdownClass: ""
    };
  },
  mounted() {
    var _a;
    common_vendor.index.__f__("log", "at components/CountdownTimer.vue:57", "CountdownTimer组件mounted，订单:", (_a = this.order) == null ? void 0 : _a.orderNo);
    this.initCountdown();
  },
  beforeDestroy() {
    this.cleanup();
  },
  watch: {
    order: {
      handler() {
        this.initCountdown();
      },
      deep: true
    }
  },
  methods: {
    // 初始化倒计时
    initCountdown() {
      var _a;
      common_vendor.index.__f__("log", "at components/CountdownTimer.vue:77", "CountdownTimer初始化，订单:", (_a = this.order) == null ? void 0 : _a.orderNo);
      this.cleanup();
      if (!utils_countdown.shouldShowCountdown(this.order)) {
        this.showCountdown = false;
        return;
      }
      this.showCountdown = true;
      const isExpired = this.updateCountdown(true);
      if (!isExpired) {
        this.timerId = utils_countdown.createCountdownTimer(() => {
          this.updateCountdown(false);
        }, this.interval);
      }
    },
    // 更新倒计时
    updateCountdown(isInit = false) {
      var _a;
      const countdownInfo = utils_countdown.getSharingOrderCountdown(this.order);
      this.countdown = countdownInfo;
      if (!countdownInfo.showCountdown) {
        this.showCountdown = false;
        return false;
      }
      if (this.short) {
        this.countdownText = utils_countdown.formatCountdownShort(countdownInfo);
      } else {
        this.countdownText = countdownInfo.formatted;
      }
      this.countdownClass = utils_countdown.getCountdownClass(countdownInfo);
      if (countdownInfo.isExpired) {
        this.cleanup();
        if (!isInit) {
          this.$emit("expired", this.order);
          if (this.order) {
            common_vendor.index.__f__("log", "at components/CountdownTimer.vue:129", "[CountdownTimer] 触发全局订单过期事件:", this.order.orderNo);
            common_vendor.index.$emit("order-expired", {
              orderId: this.order.id,
              orderNo: this.order.orderNo,
              venueId: this.order.venueId,
              date: this.order.bookingDate,
              timeSlotIds: this.order.timeSlotIds || [],
              orderType: this.order.bookingType || "EXCLUSIVE"
            });
          }
        } else {
          common_vendor.index.__f__("log", "at components/CountdownTimer.vue:140", "[CountdownTimer] 订单加载时已过期，跳过事件触发:", (_a = this.order) == null ? void 0 : _a.orderNo);
        }
        return true;
      }
      return false;
    },
    // 清理资源
    cleanup() {
      if (this.timerId) {
        utils_countdown.clearCountdownTimer(this.timerId);
        this.timerId = null;
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.showCountdown
  }, $data.showCountdown ? {
    b: common_vendor.t($props.label),
    c: common_vendor.t($data.countdownText),
    d: common_vendor.n($data.countdownClass)
  } : {});
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-357e1131"]]);
wx.createComponent(Component);
//# sourceMappingURL=../../.sourcemap/mp-weixin/components/CountdownTimer.js.map
