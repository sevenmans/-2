"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_sharing = require("../../stores/sharing.js");
const stores_user = require("../../stores/user.js");
const utils_countdown = require("../../utils/countdown.js");
const CountdownTimer = () => "../../components/CountdownTimer.js";
const _sfc_main = {
  name: "SharingDetail",
  components: {
    CountdownTimer
  },
  data() {
    return {
      sharingStore: null,
      userStore: null,
      sharingId: null,
      confirmData: {
        title: "",
        content: "",
        action: null
      },
      applyForm: {
        teamName: "",
        contactInfo: "",
        message: ""
      },
      // 弹窗状态控制
      confirmPopupShown: false,
      applyPopupShown: false,
      internalConfirmPopupOpened: false,
      internalApplyPopupOpened: false,
      confirmPopupPosition: "",
      applyPopupPosition: "",
      _confirmPopupRef: null,
      _applyPopupRef: null,
      // 缓存和加载状态
      loadingFlags: {
        detail: false
      },
      lastLoadTime: 0,
      cacheTimeout: 30 * 1e3
      // 30秒缓存
    };
  },
  computed: {
    sharingOrderDetail() {
      var _a;
      return ((_a = this.sharingStore) == null ? void 0 : _a.sharingOrderDetailGetter) || null;
    },
    loading() {
      var _a;
      return ((_a = this.sharingStore) == null ? void 0 : _a.isLoading) || false;
    },
    userInfo() {
      var _a;
      return ((_a = this.userStore) == null ? void 0 : _a.userInfoGetter) || {};
    },
    // 参与者列表（包含队长）
    participants() {
      if (!this.sharingOrderDetail)
        return [];
      const participants = [];
      participants.push({
        username: this.sharingOrderDetail.creatorUsername,
        nickname: this.sharingOrderDetail.creatorUsername,
        role: "organizer",
        isOrganizer: true
      });
      if (this.sharingOrderDetail.participants && Array.isArray(this.sharingOrderDetail.participants)) {
        this.sharingOrderDetail.participants.forEach((participant) => {
          if (participant.username !== this.sharingOrderDetail.creatorUsername) {
            participants.push({
              ...participant,
              role: "member",
              isOrganizer: false
            });
          }
        });
      }
      return participants;
    },
    // 是否为参与者
    isParticipant() {
      if (!this.userInfo || !this.sharingOrderDetail)
        return false;
      return this.participants.some((p) => p.username === this.userInfo.username);
    },
    // 是否为队长
    isOrganizer() {
      if (!this.userInfo || !this.sharingOrderDetail)
        return false;
      return this.sharingOrderDetail.creatorUsername === this.userInfo.username;
    },
    // 是否可以加入
    canJoin() {
      if (!this.sharingOrderDetail || !this.userInfo) {
        return false;
      }
      if (!this.userInfo.username) {
        return false;
      }
      const creatorUsername = (this.sharingOrderDetail.creatorUsername || "").trim();
      const currentUsername = (this.userInfo.username || "").trim();
      if (creatorUsername && currentUsername && creatorUsername === currentUsername) {
        return false;
      }
      if (this.sharingOrderDetail.status !== "OPEN") {
        return false;
      }
      const currentParticipants = this.sharingOrderDetail.currentParticipants || 0;
      const maxParticipants = this.sharingOrderDetail.maxParticipants || 0;
      if (currentParticipants >= maxParticipants) {
        return false;
      }
      if (this.isParticipant) {
        return false;
      }
      return true;
    },
    // 是否可以退出
    canExit() {
      if (!this.sharingOrderDetail)
        return false;
      return this.sharingOrderDetail.allowExit && this.sharingOrderDetail.status === "OPEN" && this.isParticipant && !this.isOrganizer;
    },
    // 是否显示联系信息
    showContactInfo() {
      var _a;
      return this.isParticipant && ((_a = this.sharingOrderDetail) == null ? void 0 : _a.contactInfo);
    },
    // 剩余名额（两支球队模式）
    remainingSlots() {
      if (!this.sharingOrderDetail)
        return 0;
      return 2 - (this.sharingOrderDetail.currentParticipants || 0);
    },
    // 是否可以提交申请
    canSubmitApplication() {
      return this.applyForm.contactInfo.trim().length > 0;
    }
  },
  async onLoad(options) {
    this.internalConfirmPopupOpened = false;
    this.internalApplyPopupOpened = false;
    this.confirmPopupPosition = "";
    this.applyPopupPosition = "";
    this.sharingStore = stores_sharing.useSharingStore();
    this.userStore = stores_user.useUserStore();
    common_vendor.index.__f__("log", "at pages/sharing/detail.vue:470", "拼场详情页面：接收到的参数:", options);
    common_vendor.index.__f__("log", "at pages/sharing/detail.vue:471", "拼场详情页面：options.id:", options.id);
    this.$nextTick(() => {
      if (this.$refs.confirmPopup) {
        this._confirmPopupRef = this.$refs.confirmPopup;
      }
      if (this.$refs.applyPopup) {
        this._applyPopupRef = this.$refs.applyPopup;
      }
    });
    try {
      if (!this.userStore.userInfoGetter || !this.userStore.userInfoGetter.username) {
        common_vendor.index.__f__("log", "at pages/sharing/detail.vue:486", "拼场详情页面：用户信息未加载，尝试获取");
        await this.userStore.getUserInfo();
      }
    } catch (error) {
      common_vendor.index.__f__("error", "at pages/sharing/detail.vue:490", "拼场详情页面：获取用户信息失败:", error);
    }
    if (options.id) {
      this.sharingId = options.id;
      common_vendor.index.__f__("log", "at pages/sharing/detail.vue:495", "拼场详情页面：设置sharingId为:", this.sharingId);
      await this.loadSharingDetail();
    } else {
      common_vendor.index.__f__("error", "at pages/sharing/detail.vue:498", "拼场详情页面：未接收到id参数");
      common_vendor.index.showToast({
        title: "订单ID缺失",
        icon: "error"
      });
    }
  },
  onShow() {
    if (this.sharingId && this.sharingStore && typeof this.sharingStore.getOrderDetail === "function") {
      this.sharingStore.getOrderDetail(this.sharingId, true).catch(() => {
      });
    }
  },
  onPullDownRefresh() {
    this.loadSharingDetail();
  },
  onUnload() {
    this._confirmPopupRef = null;
    this._applyPopupRef = null;
  },
  mounted() {
  },
  methods: {
    // 🚀 缓存优化的拼场详情加载
    async loadSharingDetailWithCache() {
      const now = Date.now();
      if (this.lastLoadTime && now - this.lastLoadTime < this.cacheTimeout) {
        common_vendor.index.__f__("log", "at pages/sharing/detail.vue:536", "拼场详情页面：使用缓存数据，跳过请求");
        return;
      }
      if (this.loadingFlags.detail) {
        common_vendor.index.__f__("log", "at pages/sharing/detail.vue:542", "拼场详情页面：正在加载中，跳过重复请求");
        return;
      }
      try {
        this.loadingFlags.detail = true;
        common_vendor.index.__f__("log", "at pages/sharing/detail.vue:548", "拼场详情页面：开始缓存优化的详情加载，ID:", this.sharingId);
        await this.sharingStore.getOrderDetail(this.sharingId);
        this.lastLoadTime = now;
        common_vendor.index.__f__("log", "at pages/sharing/detail.vue:555", "拼场详情页面：缓存优化加载完成:", this.sharingOrderDetail);
        this.$forceUpdate();
        common_vendor.index.stopPullDownRefresh();
      } catch (error) {
        common_vendor.index.stopPullDownRefresh();
        common_vendor.index.__f__("error", "at pages/sharing/detail.vue:561", "拼场详情页面：缓存优化加载失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "error"
        });
      } finally {
        this.loadingFlags.detail = false;
      }
    },
    // 加载拼场详情（原方法，用于强制刷新）
    async loadSharingDetail() {
      this.lastLoadTime = 0;
      await this.loadSharingDetailWithCache();
    },
    // 跳转到场馆详情
    navigateToVenue() {
      var _a;
      if ((_a = this.sharingOrderDetail) == null ? void 0 : _a.venueId) {
        common_vendor.index.navigateTo({
          url: `/pages/venue/detail?id=${this.sharingOrderDetail.venueId}`
        });
      }
    },
    // 加入拼场
    joinSharing() {
      try {
        if (this.applyPopupShown) {
          common_vendor.index.__f__("log", "at pages/sharing/detail.vue:592", "申请弹窗已显示，跳过重复显示");
          return;
        }
        this.initApplyForm();
        this.showApplyPopupModal();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/detail.vue:602", "打开申请弹窗失败:", error);
        common_vendor.index.showToast({
          title: "操作失败，请重试",
          icon: "none"
        });
      }
    },
    // 退出拼场
    async exitSharing() {
      try {
        if (this.confirmPopupShown) {
          common_vendor.index.__f__("log", "at pages/sharing/detail.vue:615", "确认弹窗已显示，跳过重复显示");
          return;
        }
        this.confirmData = {
          title: "退出拼场",
          content: "确认退出此拼场活动吗？退出后需要重新申请才能加入。",
          action: "exit"
        };
        this.showConfirmPopupModal();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/detail.vue:628", "打开确认弹窗失败:", error);
        common_vendor.index.showToast({
          title: "操作失败，请重试",
          icon: "none"
        });
      }
    },
    // 取消拼场
    async cancelSharing() {
      try {
        if (this.confirmPopupShown) {
          common_vendor.index.__f__("log", "at pages/sharing/detail.vue:641", "确认弹窗已显示，跳过重复显示");
          return;
        }
        this.confirmData = {
          title: "取消拼场",
          content: "确认取消此拼场活动吗？取消后所有参与者将收到通知。",
          action: "cancel"
        };
        this.showConfirmPopupModal();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/detail.vue:654", "打开确认弹窗失败:", error);
        common_vendor.index.showToast({
          title: "操作失败，请重试",
          icon: "none"
        });
      }
    },
    // 移除参与者
    async removeParticipant(participant) {
      try {
        if (this.confirmPopupShown) {
          common_vendor.index.__f__("log", "at pages/sharing/detail.vue:667", "确认弹窗已显示，跳过重复显示");
          return;
        }
        this.confirmData = {
          title: "移除参与者",
          content: `确认移除「${participant.nickname || participant.username}」吗？`,
          action: "remove",
          data: participant
        };
        this.showConfirmPopup();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/detail.vue:681", "打开确认弹窗失败:", error);
        common_vendor.index.showToast({
          title: "操作失败，请重试",
          icon: "none"
        });
      }
    },
    // 联系队长
    contactOrganizer() {
      var _a, _b;
      if ((_b = (_a = this.sharingOrderDetail) == null ? void 0 : _a.contactInfo) == null ? void 0 : _b.phone) {
        this.makePhoneCall();
      } else {
        common_vendor.index.showToast({
          title: "暂无联系方式",
          icon: "none"
        });
      }
    },
    // 管理拼场
    manageSharing() {
      common_vendor.index.navigateTo({
        url: `/pages/sharing/manage?id=${this.sharingId}`
      });
    },
    // 拨打电话
    makePhoneCall() {
      var _a, _b;
      const phone = (_b = (_a = this.sharingOrderDetail) == null ? void 0 : _a.contactInfo) == null ? void 0 : _b.phone;
      if (phone) {
        common_vendor.index.makePhoneCall({
          phoneNumber: phone
        });
      }
    },
    // 关闭确认弹窗
    closeConfirmModal() {
      this.closeConfirmPopup();
    },
    // 关闭确认弹窗（兼容微信小程序）
    closeConfirmPopup() {
      const debugEnabled = false;
      try {
        const windowInfo = common_vendor.index.getWindowInfo();
        const deviceInfo = common_vendor.index.getDeviceInfo();
        const appInfo = common_vendor.index.getAppBaseInfo();
        if (debugEnabled)
          ;
        let popup = null;
        if (this.$refs.confirmPopup) {
          popup = Array.isArray(this.$refs.confirmPopup) ? this.$refs.confirmPopup[0] : this.$refs.confirmPopup;
          if (debugEnabled)
            ;
        }
        if (!popup && this._confirmPopupRef) {
          popup = this._confirmPopupRef;
          if (debugEnabled)
            ;
        }
        if (!popup && this.$scope && this.$scope.selectComponent) {
          popup = this.$scope.selectComponent("#confirmPopup");
          if (debugEnabled)
            ;
        }
        if (!popup && this.$children) {
          for (let child of this.$children) {
            if (child.$options.name === "UniPopup" || child.$options._componentTag === "uni-popup") {
              if (child.$el && child.$el.getAttribute && child.$el.getAttribute("ref") === "confirmPopup") {
                popup = child;
                if (debugEnabled)
                  ;
                break;
              }
            }
          }
        }
        if (popup && typeof popup.close === "function") {
          popup.close();
          this.confirmPopupShown = false;
          this.internalConfirmPopupOpened = false;
          if (debugEnabled)
            ;
          return;
        }
        setTimeout(() => {
          if (debugEnabled)
            ;
          let retryPopup = null;
          if (this.$refs.confirmPopup) {
            retryPopup = Array.isArray(this.$refs.confirmPopup) ? this.$refs.confirmPopup[0] : this.$refs.confirmPopup;
          } else if (this.$scope && this.$scope.selectComponent) {
            retryPopup = this.$scope.selectComponent("#confirmPopup");
          }
          if (retryPopup && typeof retryPopup.close === "function") {
            retryPopup.close();
            this.confirmPopupShown = false;
            this.internalConfirmPopupOpened = false;
            if (debugEnabled)
              ;
          } else {
            if (debugEnabled)
              ;
            this.confirmPopupShown = false;
            this.internalConfirmPopupOpened = false;
            this.confirmPopupPosition = "popup-force-hide";
            this.$forceUpdate();
          }
        }, 100);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/detail.vue:811", "关闭确认弹窗失败:", error);
        this.confirmPopupShown = false;
        this.internalConfirmPopupOpened = false;
        this.$forceUpdate();
      }
    },
    // 安全显示确认弹窗
    showConfirmPopupModal() {
      this.showConfirmPopup();
    },
    // 显示确认弹窗（兼容微信小程序）
    showConfirmPopup() {
      const debugEnabled = false;
      try {
        const windowInfo = common_vendor.index.getWindowInfo();
        const deviceInfo = common_vendor.index.getDeviceInfo();
        const appInfo = common_vendor.index.getAppBaseInfo();
        if (debugEnabled)
          ;
        let popup = null;
        if (this.$refs.confirmPopup) {
          popup = Array.isArray(this.$refs.confirmPopup) ? this.$refs.confirmPopup[0] : this.$refs.confirmPopup;
          if (debugEnabled)
            ;
        }
        if (!popup && this._confirmPopupRef) {
          popup = this._confirmPopupRef;
          if (debugEnabled)
            ;
        }
        if (!popup && this.$scope && this.$scope.selectComponent) {
          popup = this.$scope.selectComponent("#confirmPopup");
          if (debugEnabled)
            ;
        }
        if (!popup && this.$children) {
          for (let child of this.$children) {
            if (child.$options.name === "UniPopup" || child.$options._componentTag === "uni-popup") {
              if (child.$el && child.$el.getAttribute && child.$el.getAttribute("ref") === "confirmPopup") {
                popup = child;
                if (debugEnabled)
                  ;
                break;
              }
            }
          }
        }
        if (popup && typeof popup.open === "function") {
          popup.open();
          this.confirmPopupShown = true;
          this.internalConfirmPopupOpened = true;
          if (!this._confirmPopupRef) {
            this._confirmPopupRef = popup;
          }
          if (debugEnabled)
            ;
          return;
        }
        setTimeout(() => {
          if (debugEnabled)
            ;
          let retryPopup = null;
          if (this.$refs.confirmPopup) {
            retryPopup = Array.isArray(this.$refs.confirmPopup) ? this.$refs.confirmPopup[0] : this.$refs.confirmPopup;
          } else if (this.$scope && this.$scope.selectComponent) {
            retryPopup = this.$scope.selectComponent("#confirmPopup");
          }
          if (retryPopup && typeof retryPopup.open === "function") {
            retryPopup.open();
            this.confirmPopupShown = true;
            this.internalConfirmPopupOpened = true;
            if (!this._confirmPopupRef) {
              this._confirmPopupRef = retryPopup;
            }
            if (debugEnabled)
              ;
          } else {
            if (debugEnabled)
              ;
            this.confirmPopupShown = true;
            this.internalConfirmPopupOpened = true;
            this.confirmPopupPosition = "popup-force-show";
            this.$forceUpdate();
          }
        }, 100);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/detail.vue:923", "显示确认弹窗失败:", error);
        this.confirmPopupShown = true;
        this.internalConfirmPopupOpened = true;
        this.$forceUpdate();
      }
    },
    // 初始化申请表单
    initApplyForm() {
      var _a, _b;
      this.applyForm = {
        teamName: "",
        // 队名默认为空，让用户自己填写
        contactInfo: ((_a = this.userInfo) == null ? void 0 : _a.phone) || ((_b = this.userInfo) == null ? void 0 : _b.mobile) || "",
        // 联系方式默认为手机号
        message: ""
      };
    },
    // 关闭申请弹窗
    closeApplyModal() {
      this.closeApplyPopup();
    },
    // 关闭申请弹窗（兼容微信小程序）
    closeApplyPopup() {
      const debugEnabled = false;
      try {
        const windowInfo = common_vendor.index.getWindowInfo();
        const deviceInfo = common_vendor.index.getDeviceInfo();
        const appInfo = common_vendor.index.getAppBaseInfo();
        if (debugEnabled)
          ;
        let popup = null;
        if (this.$refs.applyPopup) {
          popup = Array.isArray(this.$refs.applyPopup) ? this.$refs.applyPopup[0] : this.$refs.applyPopup;
          if (debugEnabled)
            ;
        }
        if (!popup && this._applyPopupRef) {
          popup = this._applyPopupRef;
          if (debugEnabled)
            ;
        }
        if (!popup && this.$scope && this.$scope.selectComponent) {
          popup = this.$scope.selectComponent("#applyPopup");
          if (debugEnabled)
            ;
        }
        if (!popup && this.$children) {
          for (let child of this.$children) {
            if (child.$options.name === "UniPopup" || child.$options._componentTag === "uni-popup") {
              if (child.$el && child.$el.getAttribute && child.$el.getAttribute("ref") === "applyPopup") {
                popup = child;
                if (debugEnabled)
                  ;
                break;
              }
            }
          }
        }
        if (popup && typeof popup.close === "function") {
          popup.close();
          this.applyPopupShown = false;
          this.internalApplyPopupOpened = false;
          if (debugEnabled)
            ;
          return;
        }
        setTimeout(() => {
          if (debugEnabled)
            ;
          let retryPopup = null;
          if (this.$refs.applyPopup) {
            retryPopup = Array.isArray(this.$refs.applyPopup) ? this.$refs.applyPopup[0] : this.$refs.applyPopup;
          } else if (this.$scope && this.$scope.selectComponent) {
            retryPopup = this.$scope.selectComponent("#applyPopup");
          }
          if (retryPopup && typeof retryPopup.close === "function") {
            retryPopup.close();
            this.applyPopupShown = false;
            this.internalApplyPopupOpened = false;
            if (debugEnabled)
              ;
          } else {
            if (debugEnabled)
              ;
            this.applyPopupShown = false;
            this.internalApplyPopupOpened = false;
            this.applyPopupPosition = "popup-force-hide";
            this.$forceUpdate();
          }
        }, 100);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/detail.vue:1033", "关闭申请弹窗失败:", error);
        this.applyPopupShown = false;
        this.internalApplyPopupOpened = false;
        this.$forceUpdate();
      }
    },
    // 安全显示申请弹窗
    showApplyPopupModal() {
      this.showApplyPopup();
    },
    // 显示申请弹窗（兼容微信小程序）
    showApplyPopup() {
      const debugEnabled = false;
      try {
        const windowInfo = common_vendor.index.getWindowInfo();
        const deviceInfo = common_vendor.index.getDeviceInfo();
        const appInfo = common_vendor.index.getAppBaseInfo();
        if (debugEnabled)
          ;
        let popup = null;
        if (this.$refs.applyPopup) {
          popup = Array.isArray(this.$refs.applyPopup) ? this.$refs.applyPopup[0] : this.$refs.applyPopup;
          if (debugEnabled)
            ;
        }
        if (!popup && this._applyPopupRef) {
          popup = this._applyPopupRef;
          if (debugEnabled)
            ;
        }
        if (!popup && this.$scope && this.$scope.selectComponent) {
          popup = this.$scope.selectComponent("#applyPopup");
          if (debugEnabled)
            ;
        }
        if (!popup && this.$children) {
          for (let child of this.$children) {
            if (child.$options.name === "UniPopup" || child.$options._componentTag === "uni-popup") {
              if (child.$el && child.$el.getAttribute && child.$el.getAttribute("ref") === "applyPopup") {
                popup = child;
                if (debugEnabled)
                  ;
                break;
              }
            }
          }
        }
        if (popup && typeof popup.open === "function") {
          popup.open();
          this.applyPopupShown = true;
          this.internalApplyPopupOpened = true;
          if (!this._applyPopupRef) {
            this._applyPopupRef = popup;
          }
          if (debugEnabled)
            ;
          return;
        }
        setTimeout(() => {
          if (debugEnabled)
            ;
          let retryPopup = null;
          if (this.$refs.applyPopup) {
            retryPopup = Array.isArray(this.$refs.applyPopup) ? this.$refs.applyPopup[0] : this.$refs.applyPopup;
          } else if (this.$scope && this.$scope.selectComponent) {
            retryPopup = this.$scope.selectComponent("#applyPopup");
          }
          if (retryPopup && typeof retryPopup.open === "function") {
            retryPopup.open();
            this.applyPopupShown = true;
            this.internalApplyPopupOpened = true;
            this._applyPopupRef = retryPopup;
            if (debugEnabled)
              ;
          } else {
            if (debugEnabled)
              ;
            this.applyPopupShown = true;
            this.internalApplyPopupOpened = true;
            this.applyPopupPosition = "popup-force-show";
            this.$forceUpdate();
          }
        }, 100);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/detail.vue:1140", "显示申请弹窗失败:", error);
        this.applyPopupShown = true;
        this.internalApplyPopupOpened = true;
        this.$forceUpdate();
      }
    },
    // 注释：移除了增减参与人数的方法，因为现在是固定的两支球队模式
    // 提交申请
    async submitApplication() {
      if (!this.canSubmitApplication) {
        common_vendor.index.showToast({
          title: "请填写完整信息",
          icon: "none"
        });
        return;
      }
      try {
        common_vendor.index.showLoading({ title: "提交中..." });
        const applicationData = {
          teamName: this.applyForm.teamName.trim(),
          contactInfo: this.applyForm.contactInfo.trim(),
          message: this.applyForm.message.trim()
        };
        const response = await this.sharingStore.applySharingOrder({ orderId: this.sharingId, data: applicationData });
        common_vendor.index.hideLoading();
        this.closeApplyModal();
        if (response && response.data && (response.data.status === "APPROVED_PENDING_PAYMENT" || response.data.status === "APPROVED")) {
          common_vendor.index.showModal({
            title: "申请已通过",
            content: "您的拼场申请已自动通过！请在30分钟内完成支付以确认参与。",
            showCancel: false,
            confirmText: "去支付",
            success: () => {
              common_vendor.index.navigateTo({
                url: `/pages/payment/index?orderId=${-response.data.id}&type=sharing&from=sharing-detail`
              });
            }
          });
        } else {
          common_vendor.index.showToast({
            title: (response == null ? void 0 : response.message) || "申请提交成功，等待审核",
            icon: "success",
            duration: 2e3
          });
        }
        await this.loadSharingDetail();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/sharing/detail.vue:1206", "提交申请失败:", error);
        common_vendor.index.showToast({
          title: error.message || "提交失败",
          icon: "error"
        });
      }
    },
    // 确认操作
    async confirmAction() {
      try {
        common_vendor.index.showLoading({ title: "处理中..." });
        switch (this.confirmData.action) {
          case "exit":
            await this.sharingStore.exitSharingOrder(this.sharingId);
            common_vendor.index.showToast({ title: "退出成功", icon: "success" });
            break;
          case "cancel":
            await this.sharingStore.cancelSharingOrder(this.sharingId);
            common_vendor.index.showToast({ title: "取消成功", icon: "success" });
            setTimeout(() => {
              common_vendor.index.navigateBack({
                delta: 1
              });
            }, 1500);
            return;
          case "remove":
            await this.sharingStore.removeParticipantFromSharing({
              sharingId: this.sharingId,
              participantId: this.confirmData.data.id || this.confirmData.data.username
            });
            common_vendor.index.showToast({ title: "移除成功", icon: "success" });
            break;
        }
        common_vendor.index.hideLoading();
        this.closeConfirmModal();
        await this.loadSharingDetail();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/sharing/detail.vue:1255", "操作失败:", error);
        common_vendor.index.showToast({
          title: error.message || "操作失败",
          icon: "error"
        });
      }
    },
    // 格式化活动时间（参考预约订单的实现）
    formatActivityTime() {
      if (!this.sharingOrderDetail)
        return "--";
      const bookingDate = this.sharingOrderDetail.bookingDate || this.sharingOrderDetail.date;
      const startTime = this.sharingOrderDetail.startTime || this.sharingOrderDetail.bookingStartTime;
      const endTime = this.sharingOrderDetail.endTime || this.sharingOrderDetail.bookingEndTime;
      if (!bookingDate) {
        return "时间未知";
      }
      const date = this.formatDate(bookingDate);
      if (!startTime || !endTime) {
        return `${date} 时间待定`;
      }
      const formatTime = (timeStr) => {
        if (!timeStr)
          return "";
        if (typeof timeStr === "string") {
          if (timeStr.length === 5 && timeStr.includes(":")) {
            return timeStr;
          }
          if (timeStr.length > 5 && timeStr.includes(":")) {
            return timeStr.substring(0, 5);
          }
          return timeStr;
        }
        return "";
      };
      const formattedStart = formatTime(startTime);
      const formattedEnd = formatTime(endTime);
      common_vendor.index.__f__("log", "at pages/sharing/detail.vue:1302", "⏰ 开始时间:", formattedStart);
      common_vendor.index.__f__("log", "at pages/sharing/detail.vue:1303", "⏰ 结束时间:", formattedEnd);
      return `${date} ${formattedStart}-${formattedEnd}`;
    },
    // 格式化日期
    formatDate(date) {
      if (!date)
        return "--";
      try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime()))
          return "--";
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/detail.vue:1320", "日期格式化错误:", error);
        return "--";
      }
    },
    // 格式化时间
    formatDateTime(datetime) {
      if (!datetime)
        return "--";
      try {
        let dateStr = datetime;
        if (typeof dateStr === "string" && dateStr.includes(" ") && !dateStr.includes("T")) {
          dateStr = dateStr.replace(" ", "T");
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime()))
          return "--";
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hour = String(date.getHours()).padStart(2, "0");
        const minute = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day} ${hour}:${minute}`;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/detail.vue:1344", "时间格式化错误:", error);
        return "--";
      }
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
      const formatTime = (timeStr) => {
        if (!timeStr)
          return "";
        if (typeof timeStr === "string") {
          if (timeStr.length === 5 && timeStr.includes(":")) {
            return timeStr;
          }
          if (timeStr.length > 5 && timeStr.includes(":")) {
            return timeStr.substring(0, 5);
          }
          return timeStr;
        }
        return "";
      };
      const formattedStart = formatTime(startTime);
      const formattedEnd = formatTime(endTime);
      common_vendor.index.__f__("log", "at pages/sharing/detail.vue:1382", "格式化时间段:", formattedStart, "-", formattedEnd);
      return `${formattedStart}-${formattedEnd}`;
    },
    // 获取总费用
    getTotalPrice() {
      if (!this.sharingOrderDetail)
        return "0.00";
      if (this.sharingOrderDetail.totalPrice) {
        return this.formatPrice(this.sharingOrderDetail.totalPrice);
      }
      if (this.sharingOrderDetail.pricePerPerson) {
        const perTeamPrice = Number(this.sharingOrderDetail.pricePerPerson);
        return this.formatPrice(perTeamPrice * 2);
      }
      const price = this.sharingOrderDetail.price || 0;
      return this.formatPrice(price);
    },
    // 格式化价格显示
    formatPrice(price) {
      if (!price && price !== 0)
        return "0.00";
      const numPrice = Number(price);
      if (isNaN(numPrice))
        return "0.00";
      return numPrice.toFixed(2);
    },
    // 获取进度条宽度
    getProgressWidth() {
      if (!this.sharingOrderDetail)
        return 0;
      const current = this.sharingOrderDetail.currentParticipants || 0;
      const max = this.sharingOrderDetail.maxParticipants || 2;
      return Math.min(current / max * 100, 100);
    },
    // 获取每队费用
    getPerTeamPrice() {
      if (!this.sharingOrderDetail)
        return "0.00";
      if (this.sharingOrderDetail.perTeamPrice) {
        return this.formatPrice(this.sharingOrderDetail.perTeamPrice);
      }
      if (this.sharingOrderDetail.totalPrice) {
        return this.formatPrice(this.sharingOrderDetail.totalPrice / 2);
      }
      if (this.sharingOrderDetail.pricePerPerson) {
        return this.formatPrice(this.sharingOrderDetail.pricePerPerson);
      }
      const price = this.sharingOrderDetail.price || 0;
      return this.formatPrice(price / 2);
    },
    // 获取参与者角色
    getParticipantRole(participant) {
      if (participant.isOrganizer || participant.role === "organizer") {
        return "队长";
      }
      return "队员";
    },
    // 判断参与者是否为队长
    isParticipantOrganizer(participant) {
      var _a;
      return participant.isOrganizer || participant.role === "organizer" || participant.username === ((_a = this.sharingOrderDetail) == null ? void 0 : _a.creatorUsername);
    },
    // 获取状态样式类
    getStatusClass(status) {
      const statusMap = {
        "OPEN": "status-open",
        "FULL": "status-full",
        "CONFIRMED": "status-confirmed",
        "CANCELLED": "status-cancelled",
        "EXPIRED": "status-expired"
      };
      return statusMap[status] || "status-open";
    },
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        "OPEN": "开放中",
        "FULL": "已满员",
        "CONFIRMED": "已确认",
        "CANCELLED": "已取消",
        "EXPIRED": "已过期"
      };
      return statusMap[status] || "开放中";
    },
    // 获取加入按钮文本
    getJoinButtonText() {
      if (!this.sharingOrderDetail)
        return "加载中...";
      if (this.userInfo && this.userInfo.username) {
        const creatorUsername = (this.sharingOrderDetail.creatorUsername || "").trim();
        const currentUsername = (this.userInfo.username || "").trim();
        if (creatorUsername && currentUsername && creatorUsername === currentUsername) {
          return "这是您的拼场";
        }
      }
      switch (this.sharingOrderDetail.status) {
        case "FULL":
          return "已满员";
        case "CONFIRMED":
          return "已确认";
        case "CANCELLED":
          return "已取消";
        case "EXPIRED":
          return "已过期";
        default:
          if (this.isParticipant) {
            return "已加入";
          }
          return "立即加入";
      }
    },
    // 判断是否显示倒计时
    shouldShowCountdown(order) {
      return utils_countdown.shouldShowCountdown(order);
    },
    // 倒计时过期处理
    onCountdownExpired(order) {
      common_vendor.index.__f__("log", "at pages/sharing/detail.vue:1526", "拼场订单倒计时过期:", order.orderNo);
      this.loadSharingDetail();
    }
  },
  mounted() {
    this.confirmPopupShown = false;
    this.applyPopupShown = false;
    this.sharingStore = stores_sharing.useSharingStore();
    this.userStore = stores_user.useUserStore();
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    this.sharingId = currentPage.options.id || currentPage.options.sharingId;
    if (!this.sharingId) {
      common_vendor.index.__f__("error", "at pages/sharing/detail.vue:1547", "未获取到拼场ID");
      common_vendor.index.showToast({
        title: "参数错误",
        icon: "error"
      });
      return;
    }
    this.loadSharingDetail();
  }
};
if (!Array) {
  const _component_CountdownTimer = common_vendor.resolveComponent("CountdownTimer");
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  (_component_CountdownTimer + _component_uni_popup)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b, _c, _d;
  return common_vendor.e({
    a: $options.loading
  }, $options.loading ? {} : $options.sharingOrderDetail ? common_vendor.e({
    c: common_vendor.t($options.getStatusText($options.sharingOrderDetail.status)),
    d: common_vendor.n($options.getStatusClass($options.sharingOrderDetail.status)),
    e: $options.shouldShowCountdown($options.sharingOrderDetail)
  }, $options.shouldShowCountdown($options.sharingOrderDetail) ? {
    f: common_vendor.o($options.onCountdownExpired),
    g: common_vendor.p({
      order: $options.sharingOrderDetail,
      label: "距离自动取消"
    })
  } : {}, {
    h: common_vendor.t($options.sharingOrderDetail.teamName || "未命名队伍"),
    i: common_vendor.t($options.sharingOrderDetail.creatorUsername || "未知"),
    j: common_vendor.t($options.sharingOrderDetail.currentParticipants || 0),
    k: common_vendor.t($options.sharingOrderDetail.maxParticipants || 2),
    l: $options.getProgressWidth() + "%",
    m: common_vendor.t($options.sharingOrderDetail.venueName || "未知场馆"),
    n: common_vendor.t($options.sharingOrderDetail.venueLocation || "位置未知"),
    o: common_vendor.o((...args) => $options.navigateToVenue && $options.navigateToVenue(...args)),
    p: common_vendor.t($options.formatActivityTime()),
    q: common_vendor.t($options.getPerTeamPrice()),
    r: common_vendor.t($options.getTotalPrice()),
    s: common_vendor.t($options.sharingOrderDetail.orderNo || "无"),
    t: common_vendor.t($options.formatDateTime($options.sharingOrderDetail.createdAt)),
    v: $options.sharingOrderDetail.description
  }, $options.sharingOrderDetail.description ? {
    w: common_vendor.t($options.sharingOrderDetail.description)
  } : {}, {
    x: common_vendor.t($options.participants.length),
    y: common_vendor.f($options.participants, (participant, k0, i0) => {
      return common_vendor.e({
        a: participant.avatar || "/static/images/default-avatar.svg",
        b: common_vendor.t(participant.nickname || participant.username || "未知用户"),
        c: common_vendor.t($options.getParticipantRole(participant)),
        d: $options.isOrganizer && !$options.isParticipantOrganizer(participant)
      }, $options.isOrganizer && !$options.isParticipantOrganizer(participant) ? {
        e: common_vendor.o(($event) => $options.removeParticipant(participant), participant.id || participant.username)
      } : {}, {
        f: participant.id || participant.username
      });
    }),
    z: $options.showContactInfo
  }, $options.showContactInfo ? common_vendor.e({
    A: (_a = $options.sharingOrderDetail.contactInfo) == null ? void 0 : _a.phone
  }, ((_b = $options.sharingOrderDetail.contactInfo) == null ? void 0 : _b.phone) ? {
    B: common_vendor.t($options.sharingOrderDetail.contactInfo.phone),
    C: common_vendor.o((...args) => $options.makePhoneCall && $options.makePhoneCall(...args))
  } : {}, {
    D: (_c = $options.sharingOrderDetail.contactInfo) == null ? void 0 : _c.wechat
  }, ((_d = $options.sharingOrderDetail.contactInfo) == null ? void 0 : _d.wechat) ? {
    E: common_vendor.t($options.sharingOrderDetail.contactInfo.wechat)
  } : {}) : {}, {
    F: common_vendor.t($options.sharingOrderDetail.autoApprove ? "是" : "否"),
    G: common_vendor.t($options.sharingOrderDetail.allowExit ? "是" : "否")
  }) : {
    H: common_vendor.o((...args) => $options.loadSharingDetail && $options.loadSharingDetail(...args))
  }, {
    b: $options.sharingOrderDetail,
    I: $options.sharingOrderDetail
  }, $options.sharingOrderDetail ? common_vendor.e({
    J: !$options.isParticipant
  }, !$options.isParticipant ? common_vendor.e({
    K: $options.canJoin
  }, $options.canJoin ? {
    L: common_vendor.o((...args) => $options.joinSharing && $options.joinSharing(...args))
  } : {
    M: common_vendor.t($options.getJoinButtonText())
  }) : !$options.isOrganizer ? common_vendor.e({
    O: common_vendor.o((...args) => $options.contactOrganizer && $options.contactOrganizer(...args)),
    P: $options.canExit
  }, $options.canExit ? {
    Q: common_vendor.o((...args) => $options.exitSharing && $options.exitSharing(...args))
  } : {}) : {
    R: common_vendor.o((...args) => $options.manageSharing && $options.manageSharing(...args)),
    S: common_vendor.o((...args) => $options.cancelSharing && $options.cancelSharing(...args))
  }, {
    N: !$options.isOrganizer
  }) : {}, {
    T: common_vendor.o((...args) => $options.closeApplyModal && $options.closeApplyModal(...args)),
    U: $data.applyForm.teamName,
    V: common_vendor.o(($event) => $data.applyForm.teamName = $event.detail.value),
    W: $data.applyForm.contactInfo,
    X: common_vendor.o(($event) => $data.applyForm.contactInfo = $event.detail.value),
    Y: $data.applyForm.message,
    Z: common_vendor.o(($event) => $data.applyForm.message = $event.detail.value),
    aa: common_vendor.t($data.applyForm.message.length),
    ab: common_vendor.o((...args) => $options.closeApplyModal && $options.closeApplyModal(...args)),
    ac: !$options.canSubmitApplication,
    ad: common_vendor.o((...args) => $options.submitApplication && $options.submitApplication(...args)),
    ae: common_vendor.sr("applyPopup", "1cab9fb2-1"),
    af: $data.internalApplyPopupOpened,
    ag: common_vendor.n($data.applyPopupPosition),
    ah: common_vendor.p({
      type: "bottom"
    }),
    ai: common_vendor.t($data.confirmData.title),
    aj: common_vendor.t($data.confirmData.content),
    ak: common_vendor.o((...args) => $options.closeConfirmModal && $options.closeConfirmModal(...args)),
    al: common_vendor.o((...args) => $options.confirmAction && $options.confirmAction(...args)),
    am: common_vendor.sr("confirmPopup", "1cab9fb2-2"),
    an: $data.internalConfirmPopupOpened,
    ao: common_vendor.n($data.confirmPopupPosition),
    ap: common_vendor.p({
      type: "bottom"
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-1cab9fb2"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/sharing/detail.js.map
