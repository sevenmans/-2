"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_sharing = require("../../stores/sharing.js");
const stores_booking = require("../../stores/booking.js");
const stores_user = require("../../stores/user.js");
const utils_helpers = require("../../utils/helpers.js");
const _sfc_main = {
  name: "SharingCreate",
  data() {
    return {
      sharingStore: null,
      bookingStore: null,
      userStore: null,
      formData: {
        teamName: "",
        maxParticipants: 2,
        // 固定为2支球队
        pricePerPerson: "",
        description: "",
        contactPhone: "",
        contactWechat: "",
        autoApprove: true,
        allowExit: true
      },
      selectedBooking: null,
      confirmedBookings: []
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
    // 是否可以创建
    canCreate() {
      return this.selectedBooking && this.formData.teamName.trim() && this.formData.pricePerPerson && parseFloat(this.formData.pricePerPerson) > 0 && this.formData.contactPhone.trim();
    }
  },
  onLoad() {
    this.sharingStore = stores_sharing.useSharingStore();
    this.bookingStore = stores_booking.useBookingStore();
    this.userStore = stores_user.useUserStore();
    this.loadConfirmedBookings();
    this.initUserInfo();
  },
  methods: {
    // 初始化用户信息
    initUserInfo() {
      var _a;
      if ((_a = this.userInfo) == null ? void 0 : _a.phone) {
        this.formData.contactPhone = this.userInfo.phone;
      }
    },
    // 加载已确认的预约
    async loadConfirmedBookings() {
      try {
        const bookings = await this.bookingStore.getMyBookings({ status: "CONFIRMED" });
        this.confirmedBookings = bookings || [];
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/create.vue:302", "拼场创建页面：加载预约失败:", error);
        this.confirmedBookings = [];
      }
    },
    // 返回上一页
    goBack() {
      common_vendor.index.navigateBack();
    },
    // 选择预约
    selectBooking() {
      this.loadConfirmedBookings();
      this.showBookingPopup();
    },
    // 显示预约选择弹窗（兼容微信小程序）
    showBookingPopup() {
      const debugEnabled = false;
      try {
        if (this.$refs.bookingPopup) {
          this.$refs.bookingPopup.open();
          return;
        }
        if (typeof common_vendor.index !== "undefined" && common_vendor.index.getSystemInfoSync) {
          try {
            const systemInfo = common_vendor.index.getSystemInfoSync();
            if (systemInfo.platform === "devtools" || systemInfo.uniPlatform === "mp-weixin") {
              if (this.$scope && typeof this.$scope.selectComponent === "function") {
                const popup = this.$scope.selectComponent("#bookingPopup");
                if (popup && typeof popup.open === "function") {
                  popup.open();
                  return;
                }
              }
            }
          } catch (e) {
            if (debugEnabled)
              ;
          }
        }
      } catch (error) {
      }
    },
    // 选择预约项
    selectBookingItem(booking) {
      this.selectedBooking = booking;
    },
    // 确认预约选择
    confirmBookingSelection() {
      if (!this.selectedBooking) {
        common_vendor.index.showToast({
          title: "请选择预约",
          icon: "none"
        });
        return;
      }
      this.closeBookingModal();
      if (this.selectedBooking.totalPrice) {
        const teamPrice = Math.ceil(this.selectedBooking.totalPrice / 2);
        this.formData.pricePerPerson = teamPrice.toString();
      }
    },
    // 关闭预约选择弹窗
    closeBookingModal() {
      this.closeBookingPopup();
    },
    // 关闭预约选择弹窗（兼容微信小程序）
    closeBookingPopup() {
      const debugEnabled = false;
      try {
        if (this.$refs.bookingPopup) {
          this.$refs.bookingPopup.close();
          return;
        }
        if (typeof common_vendor.index !== "undefined" && common_vendor.index.getSystemInfoSync) {
          try {
            const systemInfo = common_vendor.index.getSystemInfoSync();
            if (systemInfo.platform === "devtools" || systemInfo.uniPlatform === "mp-weixin") {
              if (this.$scope && typeof this.$scope.selectComponent === "function") {
                const popup = this.$scope.selectComponent("#bookingPopup");
                if (popup && typeof popup.close === "function") {
                  popup.close();
                  return;
                }
              }
            }
          } catch (e) {
            if (debugEnabled)
              ;
          }
        }
      } catch (error) {
      }
    },
    // 注释：移除了改变参与人数的方法，因为现在是固定的两支球队模式
    // 自动通过申请开关
    onAutoApproveChange(e) {
      this.formData.autoApprove = e.detail.value;
    },
    // 允许中途退出开关
    onAllowExitChange(e) {
      this.formData.allowExit = e.detail.value;
    },
    // 创建拼场
    async createSharing() {
      if (!this.canCreate) {
        common_vendor.index.showToast({
          title: "请完善必填信息",
          icon: "none"
        });
        return;
      }
      try {
        common_vendor.index.showLoading({ title: "创建中..." });
        const sharingData = {
          orderId: this.selectedBooking.id,
          venueId: this.selectedBooking.venueId,
          venueName: this.selectedBooking.venueName,
          bookingDate: this.selectedBooking.bookingDate,
          startTime: this.selectedBooking.startTime,
          endTime: this.selectedBooking.endTime,
          teamName: this.formData.teamName.trim(),
          maxParticipants: this.formData.maxParticipants,
          pricePerPerson: parseFloat(this.formData.pricePerPerson),
          description: this.formData.description.trim(),
          contactInfo: {
            phone: this.formData.contactPhone.trim(),
            wechat: this.formData.contactWechat.trim()
          },
          autoApprove: this.formData.autoApprove,
          allowExit: this.formData.allowExit
        };
        const result = await this.sharingStore.createSharingOrder(sharingData);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "创建成功",
          icon: "success"
        });
        setTimeout(() => {
          const orderId = result.orderId || result.id;
          if (orderId) {
            common_vendor.index.redirectTo({
              url: `/pages/payment/index?orderId=${orderId}&type=sharing&from=create`
            });
          } else {
            common_vendor.index.__f__("error", "at pages/sharing/create.vue:476", "无法获取订单ID，跳转到拼场列表");
            common_vendor.index.redirectTo({
              url: "/pages/sharing/list"
            });
          }
        }, 1500);
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/sharing/create.vue:485", "拼场创建页面：创建拼场失败:", error);
        common_vendor.index.showToast({
          title: error.message || "创建失败",
          icon: "error"
        });
      }
    },
    // 获取总费用
    getTotalPrice() {
      const pricePerPerson = parseFloat(this.formData.pricePerPerson) || 0;
      const maxParticipants = this.formData.maxParticipants || 0;
      return pricePerPerson * maxParticipants;
    },
    // 格式化预约时间
    formatBookingTime(booking) {
      if (!booking)
        return "--";
      const date = this.formatDate(booking.bookingDate);
      const timeSlot = this.formatTimeSlot(booking.startTime, booking.endTime);
      return `${date} ${timeSlot}`;
    },
    // 格式化日期
    formatDate(date) {
      if (!date)
        return "--";
      return utils_helpers.formatDate(date, "YYYY-MM-DD");
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
    // 获取预约状态文本
    getBookingStatusText(status) {
      const statusMap = {
        "PENDING": "待确认",
        "CONFIRMED": "已确认",
        "CANCELLED": "已取消",
        "COMPLETED": "已完成",
        "EXPIRED": "已过期"
      };
      return statusMap[status] || "未知状态";
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
    b: $data.selectedBooking
  }, $data.selectedBooking ? {
    c: common_vendor.t($data.selectedBooking.venueName),
    d: common_vendor.t($options.getBookingStatusText($data.selectedBooking.status)),
    e: common_vendor.t($options.formatBookingTime($data.selectedBooking)),
    f: common_vendor.t($data.selectedBooking.totalPrice || 0)
  } : {}, {
    g: common_vendor.o((...args) => $options.selectBooking && $options.selectBooking(...args)),
    h: $data.formData.teamName,
    i: common_vendor.o(($event) => $data.formData.teamName = $event.detail.value),
    j: $data.formData.pricePerPerson,
    k: common_vendor.o(($event) => $data.formData.pricePerPerson = $event.detail.value),
    l: $data.formData.description,
    m: common_vendor.o(($event) => $data.formData.description = $event.detail.value),
    n: common_vendor.t($data.formData.description.length),
    o: $data.formData.contactPhone,
    p: common_vendor.o(($event) => $data.formData.contactPhone = $event.detail.value),
    q: $data.formData.contactWechat,
    r: common_vendor.o(($event) => $data.formData.contactWechat = $event.detail.value),
    s: $data.formData.autoApprove,
    t: common_vendor.o((...args) => $options.onAutoApproveChange && $options.onAutoApproveChange(...args)),
    v: $data.formData.allowExit,
    w: common_vendor.o((...args) => $options.onAllowExitChange && $options.onAllowExitChange(...args)),
    x: common_vendor.t($options.getTotalPrice()),
    y: !$options.canCreate ? 1 : "",
    z: common_vendor.o((...args) => $options.createSharing && $options.createSharing(...args)),
    A: common_vendor.o((...args) => $options.closeBookingModal && $options.closeBookingModal(...args)),
    B: $options.loading
  }, $options.loading ? {} : $data.confirmedBookings.length === 0 ? {} : {
    D: common_vendor.f($data.confirmedBookings, (booking, k0, i0) => {
      var _a, _b, _c;
      return common_vendor.e({
        a: common_vendor.t(booking.venueName),
        b: common_vendor.t($options.getBookingStatusText(booking.status)),
        c: common_vendor.t($options.formatBookingTime(booking)),
        d: common_vendor.t(booking.totalPrice || 0),
        e: ((_a = $data.selectedBooking) == null ? void 0 : _a.id) === booking.id
      }, ((_b = $data.selectedBooking) == null ? void 0 : _b.id) === booking.id ? {} : {}, {
        f: booking.id,
        g: ((_c = $data.selectedBooking) == null ? void 0 : _c.id) === booking.id ? 1 : "",
        h: common_vendor.o(($event) => $options.selectBookingItem(booking), booking.id)
      });
    })
  }, {
    C: $data.confirmedBookings.length === 0,
    E: common_vendor.o((...args) => $options.closeBookingModal && $options.closeBookingModal(...args)),
    F: !$data.selectedBooking ? 1 : "",
    G: common_vendor.o((...args) => $options.confirmBookingSelection && $options.confirmBookingSelection(...args)),
    H: common_vendor.sr("bookingPopup", "da6f6252-0"),
    I: common_vendor.p({
      type: "bottom",
      ["mask-click"]: false
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-da6f6252"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/sharing/create.js.map
