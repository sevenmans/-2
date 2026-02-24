"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_sharing = require("../../stores/sharing.js");
const stores_user = require("../../stores/user.js");
const _sfc_main = {
  name: "SharingManage",
  setup() {
    const sharingStore = stores_sharing.useSharingStore();
    const userStore = stores_user.useUserStore();
    return {
      sharingStore,
      userStore
    };
  },
  data() {
    return {
      sharingId: "",
      error: "",
      removeTarget: null,
      pendingSettings: {},
      // 暂存未支付用户的设置
      settings: {
        autoApprove: true,
        allowExit: true
      },
      participants: [],
      requests: [],
      // 缓存和防重复请求
      lastRefreshTime: 0,
      cacheTimeout: 3e4,
      // 30秒缓存
      isRefreshing: false,
      // 弹窗状态控制
      // 支付成功处理标志，防止数据刷新时自动显示弹窗
      isProcessingPaymentSuccess: false
    };
  },
  computed: {
    // 使用Pinia store的getters（修复：使用新的getter名称）
    sharingOrderDetail() {
      return this.sharingStore.sharingOrderDetailGetter;
    },
    loading() {
      return this.sharingStore.isLoading;
    },
    userInfo() {
      return this.userStore.userInfoGetter;
    },
    // 拼场详情
    sharingDetail() {
      return this.sharingOrderDetail;
    },
    // 检查发起者是否已支付
    isCreatorPaid() {
      if (!this.sharingDetail)
        return false;
      const mainOrderStatus = this.sharingDetail.orderStatus;
      if (mainOrderStatus) {
        const paidStatuses = [
          "PAID",
          // 已支付（普通订单）
          "OPEN",
          // 开放中（拼场订单发起者已支付）
          "APPROVED_PENDING_PAYMENT",
          // 已批准待支付（发起者已支付，等待申请者支付）
          "SHARING_SUCCESS",
          // 拼场成功（双方都已支付）
          "CONFIRMED",
          // 已确认
          "VERIFIED",
          // 已核销
          "COMPLETED"
          // 已完成
        ];
        const isPaid = paidStatuses.includes(mainOrderStatus);
        return isPaid;
      }
      const fallbackPaid = this.sharingDetail.status === "OPEN";
      return fallbackPaid;
    },
    // 是否可以管理（基础权限检查，不包括支付状态）
    canManage() {
      var _a, _b, _c, _d, _e;
      const hasSharingDetail = !!this.sharingDetail;
      const hasUserInfo = !!this.userInfo;
      const creatorMatch = ((_a = this.sharingDetail) == null ? void 0 : _a.creatorUsername) === ((_b = this.userInfo) == null ? void 0 : _b.username);
      const statusCheck = ((_c = this.sharingDetail) == null ? void 0 : _c.status) === "ACTIVE" || ((_d = this.sharingDetail) == null ? void 0 : _d.status) === "RECRUITING" || ((_e = this.sharingDetail) == null ? void 0 : _e.status) === "OPEN";
      const result = hasSharingDetail && hasUserInfo && creatorMatch && statusCheck;
      return result;
    },
    // 是否可以确认
    canConfirm() {
      var _a, _b;
      return ((_a = this.sharingDetail) == null ? void 0 : _a.status) === "OPEN" && ((_b = this.sharingDetail) == null ? void 0 : _b.currentParticipants) >= 2;
    },
    // 是否可以取消
    canCancel() {
      var _a;
      return ["OPEN", "FULL"].includes((_a = this.sharingDetail) == null ? void 0 : _a.status);
    },
    // 待处理申请
    pendingRequests() {
      return this.requests.filter((request) => request.status === "PENDING");
    }
  },
  onLoad(options) {
    if (options.id) {
      this.sharingId = options.id;
      this.loadSharingDetail();
    } else {
      common_vendor.index.__f__("error", "at pages/sharing/manage.vue:399", "缺少拼场ID参数");
      this.error = "缺少拼场ID参数";
    }
    common_vendor.index.$on("paymentSuccess", this.onPaymentSuccess);
  },
  onShow() {
    if (this.sharingId) {
      this.loadPendingSettings();
      this.refreshDataWithCache().then(() => {
        this.applyPendingSettings();
      });
    }
  },
  onPullDownRefresh() {
    this.loadSharingDetail().finally(() => {
      common_vendor.index.stopPullDownRefresh();
    });
  },
  onUnload() {
    common_vendor.index.$off("paymentSuccess", this.onPaymentSuccess);
  },
  methods: {
    // 使用Pinia store的actions
    async getSharingOrderDetail(orderId, forceRefresh = false) {
      return await this.sharingStore.getOrderDetail(orderId, forceRefresh);
    },
    async updateSharingSettings(data) {
      try {
        const result = await this.sharingStore.updateSharingSettings(data);
        return result;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/manage.vue:442", "[ManagePage] updateSharingSettings 失败:", error);
        throw error;
      }
    },
    async removeSharingParticipant(data) {
    },
    async confirmSharingOrder(orderId) {
      return await this.sharingStore.confirmSharingOrder(orderId);
    },
    async cancelSharingOrder(orderId) {
      return await this.sharingStore.cancelSharingOrder(orderId);
    },
    async processSharingRequest(data) {
      return await this.sharingStore.processSharingRequest(data);
    },
    async getSharingRequests(params) {
      return await this.sharingStore.getReceivedRequestsList(params);
    },
    // 返回上一页
    goBack() {
      common_vendor.index.navigateBack();
    },
    // 带缓存的刷新数据
    async refreshDataWithCache() {
      const now = Date.now();
      if (this.isRefreshing) {
        return;
      }
      if (this.sharingDetail && now - this.lastRefreshTime < this.cacheTimeout) {
        return;
      }
      await this.loadSharingDetail();
    },
    // 加载拼场详情
    async loadSharingDetail() {
      if (!this.sharingId)
        return;
      if (this.isRefreshing) {
        return;
      }
      this.isRefreshing = true;
      try {
        this.error = "";
        await this.getSharingOrderDetail(this.sharingId);
        if (this.sharingDetail) {
          this.settings = {
            autoApprove: this.sharingDetail.autoApprove || false,
            allowExit: this.sharingDetail.allowExit || false
          };
          this.participants = [
            {
              id: "creator",
              username: this.sharingDetail.creatorUsername,
              nickname: this.sharingDetail.creatorUsername,
              avatar: "",
              isCreator: true
            }
          ];
          for (let i = 1; i < this.sharingDetail.currentParticipants; i++) {
            this.participants.push({
              id: `participant_${i}`,
              username: `user_${i}`,
              nickname: `用户${i}`,
              avatar: "",
              isCreator: false
            });
          }
          await this.loadSharingRequests();
          this.lastRefreshTime = Date.now();
        } else {
          this.error = "拼场不存在或已被删除";
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/manage.vue:543", "拼场管理页面：加载拼场详情失败:", error);
        this.error = error.message || "加载失败，请重试";
      } finally {
        this.isRefreshing = false;
      }
    },
    // 加载拼场申请
    async loadSharingRequests() {
      try {
        const requests = await this.getSharingRequests(this.sharingId);
        this.requests = requests || [];
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/manage.vue:556", "拼场管理页面：加载拼场申请失败:", error);
        this.requests = [];
      }
    },
    // 自动通过申请开关变化
    async onAutoApproveChange(e) {
      const newValue = e.detail.value;
      const oldValue = this.settings.autoApprove;
      if (newValue && !this.isCreatorPaid) {
        this.pendingSettings = {
          ...this.pendingSettings,
          autoApprove: newValue
        };
        common_vendor.index.setStorageSync(`pendingSettings_${this.sharingId}`, this.pendingSettings);
        common_vendor.index.showModal({
          title: "需要先支付",
          content: "支付完成后，自动通过申请功能将自动开启。",
          showCancel: true,
          cancelText: "取消",
          confirmText: "去支付",
          success: (res) => {
            if (res.confirm) {
              common_vendor.index.navigateTo({
                url: `/pages/payment/index?orderId=${this.sharingDetail.orderId}&type=sharing&from=sharing-manage`
              });
            } else {
              this.pendingSettings = {};
              common_vendor.index.removeStorageSync(`pendingSettings_${this.sharingId}`);
              this.$forceUpdate();
            }
          }
        });
        return;
      }
      try {
        this.settings.autoApprove = newValue;
        const result = await this.updateSharingSettings({
          sharingId: this.sharingId,
          settings: {
            autoApprove: newValue,
            allowExit: this.settings.allowExit
          }
        });
        common_vendor.index.showToast({
          title: newValue ? "已开启自动通过" : "已关闭自动通过",
          icon: "success"
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/manage.vue:624", "[ManagePage] 更新自动通过设置失败:", error);
        this.settings.autoApprove = oldValue;
        this.$forceUpdate();
        common_vendor.index.showToast({
          title: error.message || "设置失败",
          icon: "error"
        });
      }
    },
    // 允许中途退出开关变化
    async onAllowExitChange(e) {
      const newValue = e.detail.value;
      const oldValue = this.settings.allowExit;
      try {
        this.settings.allowExit = newValue;
        const result = await this.updateSharingSettings({
          sharingId: this.sharingId,
          settings: {
            autoApprove: this.settings.autoApprove,
            allowExit: newValue
          }
        });
        common_vendor.index.showToast({
          title: newValue ? "已允许中途退出" : "已禁止中途退出",
          icon: "success"
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/manage.vue:664", "[ManagePage] 更新退出设置失败:", error);
        this.settings.allowExit = oldValue;
        this.$forceUpdate();
        common_vendor.index.showToast({
          title: error.message || "设置失败",
          icon: "error"
        });
      }
    },
    // 显示移除确认弹窗
    showRemoveConfirm(participant) {
      const actionContext = createUserActionContext("user", {
        action: "showRemoveConfirm",
        component: "sharing/manage",
        eventType: "click",
        target: participant == null ? void 0 : participant.id
      });
      if (!validateUserAction(actionContext)) {
        return;
      }
      if (this.isProcessingPaymentSuccess) {
        return;
      }
      this.removeTarget = participant;
      this.showRemovePopup();
    },
    // 确认移除参与者
    async confirmRemove() {
      if (!this.removeTarget)
        return;
      try {
        this.closeRemovePopup();
        await this.removeSharingParticipant({
          sharingId: this.sharingId,
          participantId: this.removeTarget.id
        });
        const index = this.participants.findIndex((p) => p.id === this.removeTarget.id);
        if (index > -1) {
          this.participants.splice(index, 1);
        }
        if (this.sharingDetail) {
          this.sharingDetail.currentParticipants--;
        }
        common_vendor.index.showToast({
          title: "移除成功",
          icon: "success"
        });
        this.removeTarget = null;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/manage.vue:736", "拼场管理页面：移除参与者失败:", error);
        common_vendor.index.showToast({
          title: error.message || "移除失败",
          icon: "error"
        });
        this.closeRemovePopup();
      }
    },
    // 显示移除确认弹窗
    showRemovePopup() {
      try {
        if (this.$refs.removePopup) {
          this.$refs.removePopup.open();
          return;
        }
        if (typeof common_vendor.index !== "undefined" && common_vendor.index.getSystemInfoSync && this.$scope) {
          const systemInfo = common_vendor.index.getSystemInfoSync();
          if (systemInfo.platform === "devtools" || systemInfo.uniPlatform === "mp-weixin") {
            const popup = this.$scope.selectComponent("#removePopup");
            if (popup) {
              popup.open();
              return;
            }
          }
        }
      } catch (error) {
      }
    },
    // 关闭移除确认弹窗
    closeRemovePopup() {
      try {
        if (this.$refs.removePopup) {
          this.$refs.removePopup.close();
          return;
        }
        if (typeof common_vendor.index !== "undefined" && common_vendor.index.getSystemInfoSync && this.$scope) {
          const systemInfo = common_vendor.index.getSystemInfoSync();
          if (systemInfo.platform === "devtools" || systemInfo.uniPlatform === "mp-weixin") {
            const popup = this.$scope.selectComponent("#removePopup");
            if (popup) {
              popup.close();
              return;
            }
          }
        }
      } catch (error) {
      }
    },
    // 取消移除
    cancelRemove() {
      this.closeRemovePopup();
      this.removeTarget = null;
    },
    // 处理拼场申请
    async handleRequest(requestId, action) {
      var _a;
      try {
        await this.processSharingRequest({
          requestId,
          action: action === "APPROVED" ? "approve" : "reject"
        });
        const request = this.requests.find((r) => r.id === requestId);
        if (request) {
          request.status = action;
        }
        if (action === "APPROVED") {
          if (request) {
            this.participants.push({
              id: request.userId,
              username: request.username,
              nickname: request.userNickname,
              avatar: request.userAvatar,
              isCreator: false
            });
          }
          if (this.sharingDetail) {
            this.sharingDetail.currentParticipants++;
          }
        }
        common_vendor.index.showToast({
          title: action === "APPROVED" ? "已同意申请" : "已拒绝申请",
          icon: "success"
        });
        common_vendor.index.$emit("sharingDataChanged", {
          orderId: this.sharingId,
          action,
          currentParticipants: ((_a = this.sharingDetail) == null ? void 0 : _a.currentParticipants) || 0
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/manage.vue:854", "拼场管理页面：处理申请失败:", error);
        if (error.needPayment && error.orderId) {
          common_vendor.index.showModal({
            title: "需要先支付",
            content: error.message || "发起者尚未支付，无法批准申请。请先完成支付后再处理申请。",
            showCancel: true,
            cancelText: "取消",
            confirmText: "去支付",
            success: (res) => {
              if (res.confirm) {
                common_vendor.index.navigateTo({
                  url: `/pages/payment/index?orderId=${error.orderId}&from=sharing-manage`
                });
              }
            }
          });
        } else {
          common_vendor.index.showToast({
            title: error.message || "操作失败",
            icon: "error"
          });
        }
      }
    },
    // 处理确认拼场点击
    handleConfirmSharing() {
      if (!this.isCreatorPaid) {
        this.showPaymentPrompt();
        return;
      }
      this.confirmSharing();
    },
    // 处理取消拼场点击
    handleCancelSharing() {
      if (!this.isCreatorPaid) {
        this.showPaymentPrompt();
        return;
      }
      this.showCancelConfirm();
    },
    // 显示支付提示
    showPaymentPrompt() {
      common_vendor.index.showModal({
        title: "需要先支付",
        content: "请先完成订单支付后再管理拼场",
        confirmText: "去支付",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.navigateTo({
              url: `/pages/payment/index?orderId=${this.sharingDetail.orderId}&type=sharing`
            });
          }
        }
      });
    },
    // 强制刷新数据（不使用缓存）
    async forceRefreshData() {
      try {
        this.error = "";
        this.sharingStore.setSharingOrderDetail(null);
        await this.getSharingOrderDetail(this.sharingId, true);
        if (this.sharingDetail) {
          this.settings = {
            autoApprove: this.sharingDetail.autoApprove || false,
            allowExit: this.sharingDetail.allowExit || false
          };
          await this.loadSharingRequests();
        } else {
          this.error = "拼场不存在或已被删除";
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/manage.vue:950", "强制刷新数据失败:", error);
        common_vendor.index.showToast({
          title: "数据刷新失败",
          icon: "error"
        });
      }
    },
    // 处理支付成功事件
    async onPaymentSuccess(eventData) {
      if (eventData.preventAutoPopup)
        ;
      this.closeRemovePopup();
      this.closeCancelPopup();
      if (eventData.type === "sharing" && eventData.fromPage === "sharing-manage") {
        try {
          const mainOrderId = eventData.orderId;
          setTimeout(async () => {
            try {
              await this.findSharingOrderByMainOrderId(mainOrderId);
            } catch (error) {
              common_vendor.index.__f__("error", "at pages/sharing/manage.vue:988", "通过主订单ID查找拼场订单失败:", error);
              this.forceRefreshData();
            }
          }, 1e3);
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/sharing/manage.vue:996", "处理支付成功事件失败:", error);
          setTimeout(() => {
            this.forceRefreshData();
          }, 1e3);
        }
      }
    },
    // 通过主订单ID查找拼场订单
    async findSharingOrderByMainOrderId(mainOrderId) {
      try {
        const newSharingOrderId = await this.sharingStore.getOrderDetailByMainOrderId(mainOrderId);
        if (newSharingOrderId) {
          this.sharingId = newSharingOrderId.toString();
          this.error = "";
          if (this.sharingDetail) {
            this.settings = {
              autoApprove: this.sharingDetail.autoApprove || false,
              allowExit: this.sharingDetail.allowExit || false
            };
            await this.loadSharingRequests();
          }
        } else {
          throw new Error("未找到对应的拼场订单");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/manage.vue:1038", "通过主订单ID查找拼场订单失败:", error);
        throw error;
      }
    },
    // 加载暂存设置
    loadPendingSettings() {
      try {
        const savedSettings = common_vendor.index.getStorageSync(`pendingSettings_${this.sharingId}`);
        if (savedSettings && typeof savedSettings === "object") {
          this.pendingSettings = savedSettings;
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/manage.vue:1051", "加载暂存设置失败:", error);
        this.pendingSettings = {};
      }
    },
    // 应用暂存的设置
    async applyPendingSettings() {
      if (Object.keys(this.pendingSettings).length === 0) {
        return;
      }
      if (!this.isCreatorPaid) {
        return;
      }
      try {
        const newSettings = {
          autoApprove: this.pendingSettings.autoApprove !== void 0 ? this.pendingSettings.autoApprove : this.settings.autoApprove,
          allowExit: this.pendingSettings.allowExit !== void 0 ? this.pendingSettings.allowExit : this.settings.allowExit
        };
        await this.updateSharingSettings({
          sharingId: this.sharingId,
          settings: newSettings
        });
        this.settings = { ...newSettings };
        this.pendingSettings = {};
        common_vendor.index.removeStorageSync(`pendingSettings_${this.sharingId}`);
        common_vendor.index.showToast({
          title: "设置已自动应用",
          icon: "success"
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/manage.vue:1092", "应用暂存设置失败:", error);
      }
    },
    // 确认拼场
    async confirmSharing() {
      if (!this.sharingId) {
        common_vendor.index.showToast({
          title: "拼场ID缺失",
          icon: "error"
        });
        return;
      }
      try {
        common_vendor.index.showLoading({ title: "确认中..." });
        const result = await this.confirmSharingOrder(this.sharingId);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "确认成功",
          icon: "success"
        });
        setTimeout(() => {
          this.loadSharingDetail();
        }, 1500);
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/sharing/manage.vue:1126", "拼场管理页面：确认拼场失败:", error);
        common_vendor.index.showToast({
          title: error.message || "确认失败",
          icon: "error"
        });
      }
    },
    // 显示取消确认弹窗
    showCancelConfirm() {
      try {
        if (this.$refs.cancelPopup) {
          this.$refs.cancelPopup.open();
          return;
        }
        if (typeof common_vendor.index !== "undefined" && common_vendor.index.getSystemInfoSync && this.$scope) {
          const systemInfo = common_vendor.index.getSystemInfoSync();
          if (systemInfo.platform === "devtools" || systemInfo.uniPlatform === "mp-weixin") {
            const popup = this.$scope.selectComponent("#cancelPopup");
            if (popup) {
              popup.open();
              return;
            }
          }
        }
      } catch (error) {
      }
    },
    // 确认取消拼场
    async confirmCancel() {
      if (!this.sharingId) {
        common_vendor.index.showToast({
          title: "拼场ID缺失",
          icon: "error"
        });
        this.showCancelPopup = false;
        return;
      }
      try {
        common_vendor.index.showLoading({ title: "取消中..." });
        const result = await this.cancelSharingOrder(this.sharingId);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "取消成功",
          icon: "success"
        });
        this.closeCancelPopup();
        setTimeout(() => {
          common_vendor.index.navigateBack();
        }, 1500);
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/sharing/manage.vue:1199", "拼场管理页面：取消拼场失败:", error);
        common_vendor.index.showToast({
          title: error.message || "取消失败",
          icon: "error"
        });
        this.closeCancelPopup();
      }
    },
    // 关闭取消确认弹窗
    closeCancelPopup() {
      try {
        if (this.$refs.cancelPopup) {
          this.$refs.cancelPopup.close();
          return;
        }
        if (typeof common_vendor.index !== "undefined" && common_vendor.index.getSystemInfoSync && this.$scope) {
          const systemInfo = common_vendor.index.getSystemInfoSync();
          if (systemInfo.platform === "devtools" || systemInfo.uniPlatform === "mp-weixin") {
            const popup = this.$scope.selectComponent("#cancelPopup");
            if (popup) {
              popup.close();
              return;
            }
          }
        }
      } catch (error) {
      }
    },
    // 取消取消拼场操作
    cancelCancelSharing() {
      this.showCancelPopup = false;
      this.closeCancelPopup();
    },
    // 获取进度百分比
    getProgressPercent(current, max) {
      if (!max || max === 0)
        return 0;
      return Math.round(current / max * 100);
    },
    // 格式化活动时间（参考预约订单的实现）
    formatActivityTime(sharing) {
      if (!sharing)
        return "--";
      const bookingDate = sharing.bookingDate || sharing.date;
      const startTime = sharing.startTime || sharing.bookingStartTime;
      const endTime = sharing.endTime || sharing.bookingEndTime;
      const timeSlotCount = sharing.timeSlotCount || 1;
      if (!bookingDate) {
        return "时间未知";
      }
      const date = this.formatDate(bookingDate);
      if (!startTime || !endTime) {
        if (timeSlotCount > 0) {
          return `${date} (${timeSlotCount}个时段)`;
        }
        return `${date} 时间待定`;
      }
      const formatTime = (timeStr) => {
        if (!timeStr)
          return "";
        if (timeStr.length > 5 && timeStr.includes(":")) {
          return timeStr.substring(0, 5);
        }
        return timeStr;
      };
      const formattedStart = formatTime(startTime);
      const formattedEnd = formatTime(endTime);
      if (timeSlotCount > 1) {
        return `${date} ${formattedStart}-${formattedEnd} (${timeSlotCount}个时段)`;
      }
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
        common_vendor.index.__f__("error", "at pages/sharing/manage.vue:1305", "日期格式化错误:", error);
        return "--";
      }
    },
    // 格式化日期时间
    formatDateTime(datetime) {
      if (!datetime)
        return "--";
      try {
        let dateStr = datetime;
        if (typeof datetime === "string" && datetime.includes(" ") && datetime.includes("-")) {
          dateStr = datetime.replace(/-/g, "/");
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
        common_vendor.index.__f__("error", "at pages/sharing/manage.vue:1330", "时间格式化错误:", error);
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
        if (timeStr.length > 5 && timeStr.includes(":")) {
          return timeStr.substring(0, 5);
        }
        return timeStr;
      };
      const formattedStart = formatTime(startTime);
      const formattedEnd = formatTime(endTime);
      return `${formattedStart}-${formattedEnd}`;
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
    // 获取每队费用
    getPerTeamPrice() {
      if (!this.sharingDetail)
        return "0.00";
      if (this.sharingDetail.pricePerPerson) {
        return this.formatPrice(this.sharingDetail.pricePerPerson);
      }
      const totalPrice = this.sharingDetail.totalPrice || this.sharingDetail.price || 0;
      const maxParticipants = this.sharingDetail.maxParticipants || 2;
      const perTeamPrice = totalPrice / maxParticipants;
      return this.formatPrice(perTeamPrice);
    },
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        "OPEN": "招募中",
        "FULL": "已满员",
        "CONFIRMED": "已确认",
        "CANCELLED": "已取消",
        "EXPIRED": "已过期"
      };
      return statusMap[status] || "未知状态";
    },
    // 获取状态样式类
    getStatusClass(status) {
      const classMap = {
        "OPEN": "status-open",
        "FULL": "status-full",
        "CONFIRMED": "status-confirmed",
        "CANCELLED": "status-cancelled",
        "EXPIRED": "status-expired"
      };
      return classMap[status] || "status-unknown";
    },
    // 获取申请状态文本
    getRequestStatusText(status) {
      const statusMap = {
        "PENDING": "待处理",
        "APPROVED": "已同意",
        "REJECTED": "已拒绝"
      };
      return statusMap[status] || "未知状态";
    },
    // 获取申请状态样式类
    getRequestStatusClass(status) {
      const classMap = {
        "PENDING": "request-pending",
        "APPROVED": "request-approved",
        "REJECTED": "request-rejected"
      };
      return classMap[status] || "request-unknown";
    }
  }
};
if (!Array) {
  const _component_uni_popup_dialog = common_vendor.resolveComponent("uni-popup-dialog");
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  (_component_uni_popup_dialog + _component_uni_popup)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b;
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.goBack && $options.goBack(...args)),
    b: $options.loading
  }, $options.loading ? {} : $data.error ? {
    d: common_vendor.t($data.error),
    e: common_vendor.o((...args) => $options.loadSharingDetail && $options.loadSharingDetail(...args))
  } : $options.sharingDetail ? common_vendor.e({
    g: common_vendor.t($options.sharingDetail.venueName),
    h: common_vendor.t($options.getStatusText($options.sharingDetail.status)),
    i: common_vendor.n($options.getStatusClass($options.sharingDetail.status)),
    j: common_vendor.t($options.sharingDetail.teamName),
    k: common_vendor.t($options.sharingDetail.currentParticipants),
    l: common_vendor.t($options.sharingDetail.maxParticipants),
    m: common_vendor.t($options.getProgressPercent($options.sharingDetail.currentParticipants, $options.sharingDetail.maxParticipants)),
    n: $options.getProgressPercent($options.sharingDetail.currentParticipants, $options.sharingDetail.maxParticipants) + "%",
    o: common_vendor.t($options.formatActivityTime($options.sharingDetail)),
    p: common_vendor.t($options.getPerTeamPrice()),
    q: common_vendor.t($options.sharingDetail.orderNo),
    r: common_vendor.t($options.formatDateTime($options.sharingDetail.createdAt)),
    s: $options.sharingDetail.description
  }, $options.sharingDetail.description ? {
    t: common_vendor.t($options.sharingDetail.description)
  } : {}, {
    v: common_vendor.t($data.participants.length),
    w: common_vendor.f($data.participants, (participant, k0, i0) => {
      return common_vendor.e({
        a: participant.avatar || "/static/images/default-avatar.png",
        b: common_vendor.t(participant.nickname || participant.username),
        c: common_vendor.t(participant.isCreator ? "队长" : "队员"),
        d: !participant.isCreator && $options.canManage
      }, !participant.isCreator && $options.canManage ? {
        e: common_vendor.o(($event) => $options.showRemoveConfirm(participant), participant.id)
      } : {}, {
        f: participant.id
      });
    }),
    x: $data.participants.length === 0
  }, $data.participants.length === 0 ? {} : {}, {
    y: common_vendor.t($options.canManage ? "开启后，其他用户申请加入时将自动通过" : "请先完成支付后才能设置自动通过"),
    z: $data.settings.autoApprove,
    A: common_vendor.o((...args) => $options.onAutoApproveChange && $options.onAutoApproveChange(...args)),
    B: !$options.canManage,
    C: $data.settings.allowExit,
    D: common_vendor.o((...args) => $options.onAllowExitChange && $options.onAllowExitChange(...args)),
    E: !$options.canManage,
    F: $data.requests.length > 0
  }, $data.requests.length > 0 ? {
    G: common_vendor.t($options.pendingRequests.length),
    H: common_vendor.f($data.requests, (request, k0, i0) => {
      return common_vendor.e({
        a: request.userAvatar || "/static/images/default-avatar.png",
        b: common_vendor.t(request.userNickname || request.username),
        c: common_vendor.t($options.formatDateTime(request.createdAt)),
        d: request.status === "PENDING"
      }, request.status === "PENDING" ? {
        e: common_vendor.o(($event) => $options.handleRequest(request.id, "REJECTED"), request.id),
        f: common_vendor.o(($event) => $options.handleRequest(request.id, "APPROVED"), request.id)
      } : {
        g: common_vendor.t($options.getRequestStatusText(request.status)),
        h: common_vendor.n($options.getRequestStatusClass(request.status))
      }, {
        i: request.id
      });
    })
  } : {}) : {}, {
    c: $data.error,
    f: $options.sharingDetail,
    I: $options.sharingDetail && $options.canManage
  }, $options.sharingDetail && $options.canManage ? common_vendor.e({
    J: $options.canConfirm
  }, $options.canConfirm ? {
    K: common_vendor.o((...args) => $options.handleConfirmSharing && $options.handleConfirmSharing(...args))
  } : {}, {
    L: $options.canCancel
  }, $options.canCancel ? {
    M: common_vendor.o((...args) => $options.handleCancelSharing && $options.handleCancelSharing(...args))
  } : {}) : {}, {
    N: common_vendor.o($options.confirmRemove),
    O: common_vendor.o($options.cancelRemove),
    P: common_vendor.p({
      title: "确认移除",
      content: `确定要移除 ${((_a = $data.removeTarget) == null ? void 0 : _a.nickname) || ((_b = $data.removeTarget) == null ? void 0 : _b.username) || "该参与者"} 吗？`
    }),
    Q: common_vendor.sr("removePopup", "1df554a0-0"),
    R: common_vendor.p({
      type: "dialog",
      ["mask-click"]: false
    }),
    S: common_vendor.o($options.confirmCancel),
    T: common_vendor.o($options.cancelCancelSharing),
    U: common_vendor.p({
      title: "确认取消",
      content: "确定要取消这个拼场吗？取消后将无法恢复。"
    }),
    V: common_vendor.sr("cancelPopup", "1df554a0-2"),
    W: common_vendor.p({
      type: "dialog",
      ["mask-click"]: false
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-1df554a0"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/sharing/manage.js.map
