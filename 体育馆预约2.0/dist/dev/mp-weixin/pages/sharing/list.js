"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_sharing = require("../../stores/sharing.js");
const stores_user = require("../../stores/user.js");
const utils_countdown = require("../../utils/countdown.js");
const utils_helpers = require("../../utils/helpers.js");
const CountdownTimer = () => "../../components/CountdownTimer.js";
const _sfc_main = {
  name: "SharingList",
  components: {
    CountdownTimer
  },
  data() {
    return {
      sharingStore: null,
      userStore: null,
      currentSharing: null,
      showMode: "joinable",
      // 'joinable' 可参与的, 'all' 全部
      userApplications: [],
      // 用户的申请记录
      // 缓存和防重复请求
      lastRefreshTime: 0,
      cacheTimeout: 3e4,
      // 30秒缓存
      isRefreshing: false,
      refreshTimer: null,
      // 定时刷新计时器
      // 弹窗状态控制
      internalJoinPopupOpened: false,
      _joinPopupRef: null,
      // 申请表单数据
      applyForm: {
        teamName: "",
        contactInfo: "",
        message: ""
      }
    };
  },
  computed: {
    sharingOrders() {
      var _a;
      return ((_a = this.sharingStore) == null ? void 0 : _a.sharingOrdersGetter) || [];
    },
    loading() {
      var _a;
      return ((_a = this.sharingStore) == null ? void 0 : _a.isLoading) || false;
    },
    pagination() {
      var _a;
      return ((_a = this.sharingStore) == null ? void 0 : _a.getPagination) || { current: 0, totalPages: 0 };
    },
    userInfo() {
      var _a;
      return ((_a = this.userStore) == null ? void 0 : _a.userInfoGetter) || {};
    },
    filteredSharingOrders() {
      let orders = this.sharingOrders || [];
      orders = orders.filter((order) => {
        const invalidStatuses = ["EXPIRED", "CANCELLED", "TIMEOUT_CANCELLED"];
        return !invalidStatuses.includes(order.status);
      });
      if (this.showMode === "joinable") {
        orders = orders.filter((order) => {
          order.status === "OPEN" && order.currentParticipants < order.maxParticipants && !this.isMySharing(order);
          return order.status === "OPEN" || order.status === "FULL";
        });
      }
      return orders;
    },
    hasMore() {
      return this.pagination.current < Math.ceil(this.pagination.total / this.pagination.pageSize);
    },
    // 是否可以提交申请
    canSubmitApplication() {
      return this.applyForm.contactInfo.trim().length > 0;
    }
  },
  onLoad() {
    common_vendor.index.__f__("log", "at pages/sharing/list.vue:313", "🔍 [DEBUG] sharing/list.vue onLoad被调用");
    this.sharingStore = stores_sharing.useSharingStore();
    this.userStore = stores_user.useUserStore();
    common_vendor.index.$on("sharingDataChanged", this.onSharingDataChanged);
    common_vendor.index.$on("orderCancelled", this.onOrderCancelled);
    this.$nextTick(() => {
      try {
        if (this.$refs.filterPopup) {
          this._filterPopupRef = this.$refs.filterPopup;
        }
        if (this.$refs.joinPopup) {
          this._joinPopupRef = this.$refs.joinPopup;
        }
      } catch (e) {
        common_vendor.index.__f__("warn", "at pages/sharing/list.vue:338", "缓存弹窗实例失败:", e);
      }
      setTimeout(() => {
        try {
          if (!this._joinPopupRef && this.$refs.joinPopup) {
            this._joinPopupRef = this.$refs.joinPopup;
          }
        } catch (e) {
          common_vendor.index.__f__("warn", "at pages/sharing/list.vue:348", "延迟缓存弹窗实例失败:", e);
        }
      }, 100);
    });
  },
  onUnload() {
    common_vendor.index.$off("sharingDataChanged", this.onSharingDataChanged);
    common_vendor.index.$off("orderCancelled", this.onOrderCancelled);
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this._joinPopupRef = null;
  },
  mounted() {
  },
  async onShow() {
    common_vendor.index.__f__("log", "at pages/sharing/list.vue:374", "🔍 [DEBUG] sharing/list.vue onShow被调用");
    const refreshPromise = this.lastRefreshTime === 0 ? this.refreshData() : this.refreshDataWithCache();
    await Promise.all([
      refreshPromise,
      this.loadUserApplications().catch((err) => common_vendor.index.__f__("warn", "at pages/sharing/list.vue:384", "加载申请记录失败:", err.message))
    ]);
    this.startAutoRefresh();
  },
  onHide() {
    this.stopAutoRefresh();
  },
  onPullDownRefresh() {
    this.refreshData();
  },
  onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.loadMore();
    }
  },
  methods: {
    // 初始化数据
    async initData() {
      try {
        common_vendor.index.__f__("log", "at pages/sharing/list.vue:411", "拼场列表页面：开始初始化数据");
        common_vendor.index.__f__("log", "at pages/sharing/list.vue:412", "拼场列表页面：Store状态:", this.sharingStore);
        common_vendor.index.__f__("log", "at pages/sharing/list.vue:413", "拼场列表页面：当前显示模式:", this.showMode);
        const apiMethod = this.showMode === "all" ? this.sharingStore.getAllSharingOrders : this.sharingStore.getJoinableSharingOrders;
        const result = await apiMethod({ page: 1, pageSize: 10 });
        common_vendor.index.__f__("log", "at pages/sharing/list.vue:418", "拼场列表页面：API返回结果:", result);
        this.$forceUpdate();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/list.vue:422", "拼场列表页面：初始化数据失败:", error);
        common_vendor.index.showToast({
          title: "获取拼场数据失败",
          icon: "none"
        });
      }
    },
    // 带缓存的刷新数据
    async refreshDataWithCache() {
      var _a, _b;
      const now = Date.now();
      common_vendor.index.__f__("log", "at pages/sharing/list.vue:434", "拼场列表页面：refreshDataWithCache 被调用", {
        isRefreshing: this.isRefreshing,
        hasOrders: ((_a = this.sharingOrders) == null ? void 0 : _a.length) > 0,
        timeSinceLastRefresh: now - this.lastRefreshTime,
        cacheTimeout: this.cacheTimeout
      });
      if (this.isRefreshing) {
        common_vendor.index.__f__("log", "at pages/sharing/list.vue:443", "拼场列表页面：正在刷新中，跳过本次请求");
        return;
      }
      if (((_b = this.sharingOrders) == null ? void 0 : _b.length) > 0 && now - this.lastRefreshTime < this.cacheTimeout) {
        common_vendor.index.__f__("log", "at pages/sharing/list.vue:449", "拼场列表页面：使用缓存数据，跳过刷新");
        return;
      }
      common_vendor.index.__f__("log", "at pages/sharing/list.vue:454", "拼场列表页面：缓存已过期或无数据，执行刷新");
      await this.refreshData();
    },
    // 刷新数据
    async refreshData() {
      var _a;
      if (this.isRefreshing) {
        return;
      }
      this.isRefreshing = true;
      try {
        const apiMethod = this.showMode === "all" ? this.sharingStore.getAllSharingOrders.bind(this.sharingStore) : this.sharingStore.getJoinableSharingOrders.bind(this.sharingStore);
        const result = await apiMethod({
          page: 1,
          pageSize: 10,
          refresh: true,
          _t: Date.now()
        });
        common_vendor.index.__f__("log", "at pages/sharing/list.vue:479", "[SharingList] 刷新完成，订单数量:", ((_a = this.sharingOrders) == null ? void 0 : _a.length) || 0);
        this.lastRefreshTime = Date.now();
        this.$forceUpdate();
        common_vendor.index.stopPullDownRefresh();
      } catch (error) {
        common_vendor.index.stopPullDownRefresh();
        common_vendor.index.__f__("error", "at pages/sharing/list.vue:489", "[SharingList] 刷新失败:", error.message);
        common_vendor.index.showToast({
          title: "刷新数据失败",
          icon: "none",
          duration: 2e3
        });
      } finally {
        this.isRefreshing = false;
      }
    },
    // 加载更多
    async loadMore() {
      var _a;
      if (this.loading || !this.hasMore)
        return;
      try {
        common_vendor.index.__f__("log", "at pages/sharing/list.vue:506", "拼场列表页面：开始加载更多，当前页码:", this.pagination.current, "显示模式:", this.showMode);
        const nextPage = this.pagination.current + 1;
        const apiMethod = this.showMode === "all" ? this.sharingStore.getAllSharingOrders : this.sharingStore.getJoinableSharingOrders;
        await apiMethod({
          page: nextPage,
          pageSize: 10,
          status: this.selectedStatus
        });
        common_vendor.index.__f__("log", "at pages/sharing/list.vue:515", "拼场列表页面：加载更多完成，订单数量:", ((_a = this.sharingOrders) == null ? void 0 : _a.length) || 0);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/list.vue:517", "拼场列表页面：加载更多失败:", error);
        common_vendor.index.showToast({
          title: "加载更多失败",
          icon: "none"
        });
      }
    },
    // 选择状态
    async selectStatus(status) {
      this.selectedStatus = status;
      try {
        const apiMethod = this.showMode === "all" ? this.sharingStore.getAllSharingOrders : this.sharingStore.getJoinableSharingOrders;
        await apiMethod({
          page: 1,
          pageSize: 10,
          status,
          refresh: true
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/list.vue:538", "筛选失败:", error);
      }
    },
    // 切换显示模式
    async switchMode(mode) {
      var _a, _b;
      if (this.showMode === mode) {
        common_vendor.index.__f__("log", "at pages/sharing/list.vue:545", "拼场列表页面：模式未改变，跳过切换");
        return;
      }
      common_vendor.index.__f__("log", "at pages/sharing/list.vue:549", "拼场列表页面：🔄 切换显示模式从", this.showMode, "到", mode);
      common_vendor.index.__f__("log", "at pages/sharing/list.vue:550", "拼场列表页面：当前状态:", {
        isRefreshing: this.isRefreshing,
        storeLoading: (_a = this.sharingStore) == null ? void 0 : _a.loading,
        ordersCount: (_b = this.sharingOrders) == null ? void 0 : _b.length
      });
      this.isRefreshing = false;
      this.showMode = mode;
      this.selectedStatus = "";
      try {
        common_vendor.index.__f__("log", "at pages/sharing/list.vue:562", "拼场列表页面：准备刷新数据...");
        this.lastRefreshTime = 0;
        await this.refreshData();
        common_vendor.index.__f__("log", "at pages/sharing/list.vue:569", "拼场列表页面：✅ 模式切换成功");
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/list.vue:571", "拼场列表页面：❌ 切换模式失败:", error);
        common_vendor.index.showToast({
          title: "切换模式失败，请重试",
          icon: "none"
        });
        this.showMode = mode === "all" ? "joinable" : "all";
      } finally {
        this.isRefreshing = false;
        common_vendor.index.__f__("log", "at pages/sharing/list.vue:581", "拼场列表页面：🔓 switchMode finally: isRefreshing = false");
      }
    },
    // 跳转到详情页
    navigateToDetail(sharingId) {
      common_vendor.index.navigateTo({
        url: `/pages/sharing/detail?id=${sharingId}`
      });
    },
    // 判断是否可以加入拼场
    canJoinSharing(sharing) {
      if (this.userInfo && sharing.creatorUsername === this.userInfo.username) {
        return false;
      }
      if (this.hasAppliedToSharing(sharing.id)) {
        return false;
      }
      return sharing.status === "OPEN" && (sharing.currentParticipants || 0) < (sharing.maxParticipants || 0);
    },
    // 判断是否属于自己的拼场
    isMySharing(sharing) {
      return this.userInfo && sharing.creatorUsername === this.userInfo.username;
    },
    // 判断是否已申请过该拼场
    hasAppliedToSharing(sharingId) {
      return this.userApplications.some(
        (app) => app.sharingOrder && app.sharingOrder.id === sharingId
      );
    },
    // 加载用户申请记录
    async loadUserApplications() {
      try {
        const response = await this.sharingStore.getSentRequestsList();
        const applications = (response == null ? void 0 : response.data) || (response == null ? void 0 : response.list) || response || [];
        this.userApplications = Array.isArray(applications) ? applications : [];
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/list.vue:628", "加载用户申请记录失败:", error);
        this.userApplications = [];
      }
    },
    // 加入拼场
    joinSharing(sharingId) {
      common_vendor.index.__f__("log", "at pages/sharing/list.vue:635", "🔍 [DEBUG] joinSharing被调用，sharingId:", sharingId, "调用栈:", new Error().stack);
      const sharing = this.sharingOrders.find((s) => s.id === sharingId);
      if (this.isMySharing(sharing)) {
        common_vendor.index.showToast({
          title: "不能申请自己的拼场",
          icon: "none",
          duration: 2e3
        });
        return;
      }
      this.currentSharing = sharing;
      this.resetApplyForm();
      const debugEnabled = false;
      try {
        const windowInfo = common_vendor.index.getWindowInfo();
        const deviceInfo = common_vendor.index.getDeviceInfo();
        const appBaseInfo = common_vendor.index.getAppBaseInfo();
        const isWeChat = appBaseInfo.appPlatform === "mp-weixin" || deviceInfo.platform === "devtools";
        if (debugEnabled)
          ;
        const getInstance = () => {
          let inst = this.$refs.joinPopup;
          if (Array.isArray(inst))
            inst = inst[0];
          if (debugEnabled)
            ;
          if (!inst && this._joinPopupRef) {
            inst = this._joinPopupRef;
            if (debugEnabled)
              ;
          }
          if (!inst && isWeChat && this.$scope && typeof this.$scope.selectComponent === "function") {
            try {
              inst = this.$scope.selectComponent("#joinPopup");
              if (debugEnabled)
                ;
              if (!inst || typeof inst.open !== "function") {
                const componentInstance = this.$scope.selectComponent(".join-popup");
                if (componentInstance) {
                  inst = componentInstance;
                  if (debugEnabled)
                    ;
                }
              }
              if (inst && debugEnabled)
                ;
            } catch (e) {
              if (debugEnabled)
                ;
            }
          }
          return inst;
        };
        const tryOpen = (attempt = 0) => {
          const inst = getInstance();
          if (inst && typeof inst.open === "function") {
            try {
              if (!this._joinPopupRef) {
                this._joinPopupRef = inst;
              }
              inst.open();
              this.internalJoinPopupOpened = true;
              if (debugEnabled)
                ;
              return;
            } catch (e) {
              common_vendor.index.__f__("error", "at pages/sharing/list.vue:738", "joinSharing - open调用异常", e);
              if (attempt === 0) {
                const self = this;
                setTimeout(() => {
                  tryOpen(1);
                }, 100);
                return;
              }
            }
          }
          if (attempt >= 1) {
            try {
              this.internalJoinPopupOpened = true;
              this.$forceUpdate();
              if (debugEnabled)
                ;
            } catch (fallbackError) {
              common_vendor.index.__f__("error", "at pages/sharing/list.vue:757", "joinSharing - 备选方案失败:", fallbackError);
              common_vendor.index.showToast({ title: "弹窗打开失败", icon: "none" });
            }
            return;
          }
          if (debugEnabled)
            ;
          setTimeout(() => {
            tryOpen(attempt + 1);
          }, 100);
        };
        tryOpen(0);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/list.vue:773", "joinSharing - 执行失败:", error);
        common_vendor.index.showToast({
          title: "操作失败，请重试",
          icon: "none"
        });
      }
    },
    // 重置申请表单
    resetApplyForm() {
      var _a, _b;
      this.applyForm = {
        teamName: "",
        // 队名默认为空，让用户自己填写
        contactInfo: ((_a = this.userInfo) == null ? void 0 : _a.phone) || ((_b = this.userInfo) == null ? void 0 : _b.mobile) || "",
        // 联系方式默认为手机号
        message: ""
      };
    },
    // 关闭加入弹窗
    closeJoinModal() {
      common_vendor.index.__f__("log", "at pages/sharing/list.vue:792", "🔍 [DEBUG] closeJoinModal被调用");
      const debugEnabled = false;
      try {
        const windowInfo = common_vendor.index.getWindowInfo();
        const deviceInfo = common_vendor.index.getDeviceInfo();
        const appBaseInfo = common_vendor.index.getAppBaseInfo();
        const isWeChat = appBaseInfo.appPlatform === "mp-weixin" || deviceInfo.platform === "devtools";
        if (debugEnabled)
          ;
        const getInstance = () => {
          let inst = this.$refs.joinPopup;
          if (Array.isArray(inst))
            inst = inst[0];
          if (debugEnabled)
            ;
          if (!inst && this._joinPopupRef) {
            inst = this._joinPopupRef;
            if (debugEnabled)
              ;
          }
          if (!inst && isWeChat && this.$scope && typeof this.$scope.selectComponent === "function") {
            try {
              inst = this.$scope.selectComponent("#joinPopup");
              if (debugEnabled)
                ;
              if (!inst || typeof inst.close !== "function") {
                const componentInstance = this.$scope.selectComponent(".join-popup");
                if (componentInstance) {
                  inst = componentInstance;
                  if (debugEnabled)
                    ;
                }
              }
              if (inst && debugEnabled)
                ;
            } catch (e) {
              if (debugEnabled)
                ;
            }
          }
          return inst;
        };
        const tryClose = (attempt = 0) => {
          const inst = getInstance();
          if (inst && typeof inst.close === "function") {
            try {
              if (!this._joinPopupRef) {
                this._joinPopupRef = inst;
              }
              inst.close();
              this.internalJoinPopupOpened = false;
              if (debugEnabled)
                ;
              return;
            } catch (e) {
              common_vendor.index.__f__("error", "at pages/sharing/list.vue:880", "closeJoinModal - close调用异常", e);
              if (attempt === 0) {
                setTimeout(() => tryClose(1), 100);
                return;
              }
            }
          }
          if (attempt >= 1) {
            try {
              this.internalJoinPopupOpened = false;
              this.$forceUpdate();
              if (debugEnabled)
                ;
            } catch (fallbackError) {
              common_vendor.index.__f__("error", "at pages/sharing/list.vue:898", "closeJoinModal - 备选方案失败:", fallbackError);
              common_vendor.index.showToast({ title: "弹窗关闭失败", icon: "none" });
            }
            return;
          }
          if (debugEnabled)
            ;
          setTimeout(() => tryClose(attempt + 1), 100);
        };
        tryClose(0);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/list.vue:914", "closeJoinModal - 执行失败:", error);
        this.internalJoinPopupOpened = false;
      } finally {
        this.currentSharing = null;
        this.resetApplyForm();
      }
    },
    // 提交申请
    async submitApplication() {
      if (!this.canSubmitApplication) {
        common_vendor.index.showToast({
          title: "请填写联系方式",
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
        const response = await this.sharingStore.applySharingOrder({
          orderId: this.currentSharing.id,
          data: applicationData
        });
        common_vendor.index.hideLoading();
        this.closeJoinModal();
        if (response && response.data && response.data.status === "APPROVED_PENDING_PAYMENT") {
          common_vendor.index.showModal({
            title: "申请已通过",
            content: "您的拼场申请已自动通过！请在30分钟内完成支付以确认参与。",
            showCancel: false,
            confirmText: "去支付",
            success: () => {
              common_vendor.index.navigateTo({
                url: `/pages/payment/index?orderId=${-response.data.id}&type=sharing&from=sharing-list`
              });
            }
          });
        } else if (response && response.data && response.data.status === "APPROVED") {
          common_vendor.index.showModal({
            title: "申请已通过",
            content: "您的拼场申请已自动通过！请完成支付以确认参与。",
            showCancel: false,
            confirmText: "去支付",
            success: () => {
              common_vendor.index.navigateTo({
                url: `/pages/payment/index?orderId=${-response.data.id}&type=sharing&from=sharing-list`
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
        await this.refreshData();
        await this.loadUserApplications();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/sharing/list.vue:995", "加入拼场失败:", error);
        common_vendor.index.showToast({
          title: error.message || "加入失败",
          icon: "error"
        });
      }
    },
    // 显示筛选弹窗
    showFilterModal() {
      common_vendor.index.__f__("log", "at pages/sharing/list.vue:1005", "🔍 [DEBUG] showFilterModal被调用");
      const debugEnabled = false;
      try {
        const windowInfo = common_vendor.index.getWindowInfo();
        const deviceInfo = common_vendor.index.getDeviceInfo();
        const appBaseInfo = common_vendor.index.getAppBaseInfo();
        const isWeChat = appBaseInfo.appPlatform === "mp-weixin" || deviceInfo.platform === "devtools";
        if (debugEnabled)
          ;
        const getInstance = () => {
          let inst = this.$refs.filterPopup;
          if (Array.isArray(inst))
            inst = inst[0];
          if (debugEnabled)
            ;
          if (!inst && this._filterPopupRef) {
            inst = this._filterPopupRef;
            if (debugEnabled)
              ;
          }
          if (!inst && isWeChat && this.$scope && typeof this.$scope.selectComponent === "function") {
            try {
              inst = this.$scope.selectComponent("#filterPopup");
              if (debugEnabled)
                ;
              if (!inst || typeof inst.open !== "function") {
                const componentInstance = this.$scope.selectComponent(".filter-popup");
                if (componentInstance) {
                  inst = componentInstance;
                  if (debugEnabled)
                    ;
                }
              }
              if (inst && debugEnabled)
                ;
            } catch (e) {
              if (debugEnabled)
                ;
            }
          }
          return inst;
        };
        const tryOpen = (attempt = 0) => {
          const inst = getInstance();
          if (inst && typeof inst.open === "function") {
            try {
              if (!this._filterPopupRef) {
                this._filterPopupRef = inst;
              }
              if (this.filterPopupPosition.x || this.filterPopupPosition.y) {
                try {
                  const popupEl = inst.$el || inst;
                  if (popupEl && popupEl.style) {
                    popupEl.style.transform = `translate(${this.filterPopupPosition.x}px, ${this.filterPopupPosition.y}px)`;
                  }
                } catch (styleError) {
                  if (debugEnabled)
                    ;
                }
              }
              inst.open("bottom");
              this.internalFilterPopupOpened = true;
              if (debugEnabled)
                ;
              return;
            } catch (e) {
              common_vendor.index.__f__("error", "at pages/sharing/list.vue:1103", "showFilterModal - open调用异常", e);
              if (attempt === 0) {
                setTimeout(() => tryOpen(1), 100);
                return;
              }
            }
          }
          if (attempt >= 1) {
            try {
              this.internalFilterPopupOpened = true;
              this.$forceUpdate();
              if (debugEnabled)
                ;
            } catch (fallbackError) {
              common_vendor.index.__f__("error", "at pages/sharing/list.vue:1121", "showFilterModal - 备选方案失败:", fallbackError);
              common_vendor.index.showToast({ title: "弹窗打开失败", icon: "none" });
            }
            return;
          }
          if (debugEnabled)
            ;
          setTimeout(() => tryOpen(attempt + 1), 100);
        };
        tryOpen(0);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/sharing/list.vue:1137", "showFilterModal - 执行失败:", error);
        this.internalFilterPopupOpened = true;
      }
    },
    // 格式化日期
    formatDate(date) {
      if (!date)
        return "--";
      return utils_helpers.formatDate(date, "MM-DD");
    },
    // 格式化时间
    formatDateTime(datetime) {
      if (!datetime)
        return "--";
      return utils_helpers.formatDateTime(datetime);
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
    // 格式化时间范围显示（参考booking/list）
    formatTimeRange(sharing) {
      const startTime = sharing.startTime || sharing.bookingStartTime;
      const endTime = sharing.endTime || sharing.bookingEndTime;
      const timeSlotCount = sharing.timeSlotCount || 1;
      if (!startTime || !endTime) {
        return "时间待定";
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
      const dateStr = this.formatDate(sharing.bookingDate);
      if (timeSlotCount > 1) {
        return `${dateStr} ${formattedStart} - ${formattedEnd} (${timeSlotCount}个时段)`;
      }
      return `${dateStr} ${formattedStart} - ${formattedEnd}`;
    },
    // 格式化创建时间（参考booking/list）
    formatCreateTime(datetime) {
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
        common_vendor.index.__f__("error", "at pages/sharing/list.vue:1224", "时间格式化错误:", error);
        return "--";
      }
    },
    // 格式化加入时间
    formatJoinTime() {
      if (!this.currentSharing)
        return "";
      return `${this.formatDate(this.currentSharing.bookingDate)} ${this.formatTimeSlot(this.currentSharing.startTime, this.currentSharing.endTime)}`;
    },
    // 格式化价格显示
    formatPrice(price) {
      if (!price && price !== 0)
        return "0";
      const numPrice = Number(price);
      if (isNaN(numPrice))
        return "0";
      return numPrice.toFixed(2);
    },
    // 获取进度条宽度
    getProgressWidth(sharing) {
      const current = sharing.currentParticipants || 0;
      const max = sharing.maxParticipants || 2;
      return Math.min(current / max * 100, 100);
    },
    // 判断是否显示倒计时
    shouldShowCountdown(order) {
      return utils_countdown.shouldShowCountdown(order);
    },
    // 倒计时过期处理
    onCountdownExpired(order) {
      common_vendor.index.__f__("log", "at pages/sharing/list.vue:1257", "拼场订单倒计时过期:", order.orderNo);
      this.refreshData();
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
        "OPEN": "开放中(1/2)",
        "APPROVED_PENDING_PAYMENT": "等待对方支付",
        "SHARING_SUCCESS": "拼场成功(2人)",
        "CONFIRMED": "已确认",
        "CANCELLED": "已取消",
        "REJECTED": "已拒绝",
        "TIMEOUT_CANCELLED": "超时取消",
        "EXPIRED": "已过期"
      };
      return statusMap[status] || "开放中";
    },
    // 处理拼场数据变化
    onSharingDataChanged(data) {
      common_vendor.index.__f__("log", "at pages/sharing/list.vue:1291", "拼场列表页面：收到数据变化通知:", data);
      if (this.sharingOrders && data.orderId) {
        const order = this.sharingOrders.find((o) => o.id == data.orderId);
        if (order) {
          if (data.currentParticipants !== void 0) {
            order.currentParticipants = data.currentParticipants;
          }
          if (data.action === "APPROVED" && order.currentParticipants >= 2) {
            order.status = "SHARING_SUCCESS";
          }
          common_vendor.index.__f__("log", "at pages/sharing/list.vue:1307", "拼场列表页面：已更新订单数据:", order);
        }
      }
      setTimeout(() => {
        this.refreshData();
      }, 1e3);
    },
    // 处理订单取消事件
    onOrderCancelled(data) {
      common_vendor.index.__f__("log", "at pages/sharing/list.vue:1319", "拼场列表页面：收到订单取消通知:", data);
      if (data.orderId) {
        if (data.type === "sharing") {
          common_vendor.index.__f__("log", "at pages/sharing/list.vue:1324", "检测到拼场订单取消，刷新拼场大厅数据");
          setTimeout(() => {
            common_vendor.index.__f__("log", "at pages/sharing/list.vue:1327", "开始刷新拼场大厅数据...");
            this.refreshData();
          }, 500);
        } else if (data.type === "booking") {
          common_vendor.index.__f__("log", "at pages/sharing/list.vue:1331", "检测到预约订单取消，刷新拼场大厅数据");
          setTimeout(() => {
            common_vendor.index.__f__("log", "at pages/sharing/list.vue:1334", "开始刷新拼场大厅数据...");
            this.refreshData();
          }, 1500);
        }
      }
    },
    // 获取加入按钮文本
    getJoinButtonText(sharing) {
      if (this.isMySharing(sharing)) {
        return "我的拼场";
      }
      if (this.hasAppliedToSharing(sharing)) {
        return "已申请";
      }
      if (sharing.status === "FULL") {
        return "已满员";
      }
      if (sharing.status === "CONFIRMED") {
        return "已确认";
      }
      if (sharing.status === "CANCELLED") {
        return "已取消";
      }
      if (sharing.status === "EXPIRED") {
        return "已过期";
      }
      return "申请拼场";
    },
    // 导航到我的拼场页面
    goToMyOrders() {
      common_vendor.index.navigateTo({
        url: "/pages/sharing/my-orders"
      });
    },
    // 启动自动刷新
    startAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
      }
      this.refreshTimer = setInterval(async () => {
        try {
          common_vendor.index.__f__("log", "at pages/sharing/list.vue:1383", "定时刷新拼场数据...");
          await this.refreshData();
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/sharing/list.vue:1386", "定时刷新失败:", error);
        }
      }, 6e4);
    },
    // 停止自动刷新
    stopAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    }
  }
};
if (!Array) {
  const _component_CountdownTimer = common_vendor.resolveComponent("CountdownTimer");
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  (_component_CountdownTimer + _component_uni_popup)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.showMode === "joinable" ? 1 : "",
    b: common_vendor.o(($event) => $options.switchMode("joinable")),
    c: $data.showMode === "all" ? 1 : "",
    d: common_vendor.o(($event) => $options.switchMode("all")),
    e: common_vendor.f($options.filteredSharingOrders, (sharing, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(sharing.venueName || "未知场馆"),
        b: common_vendor.t(sharing.venueLocation || "位置未知"),
        c: $options.isMySharing(sharing)
      }, $options.isMySharing(sharing) ? {} : {}, {
        d: sharing.status === "FULL" || sharing.currentParticipants >= sharing.maxParticipants
      }, sharing.status === "FULL" || sharing.currentParticipants >= sharing.maxParticipants ? {} : {}, {
        e: common_vendor.t($options.getStatusText(sharing.status)),
        f: common_vendor.n($options.getStatusClass(sharing.status)),
        g: common_vendor.t($options.formatTimeRange(sharing)),
        h: common_vendor.t(sharing.teamName || "未命名队伍"),
        i: common_vendor.t(sharing.currentParticipants || 0),
        j: common_vendor.t(sharing.maxParticipants || 2),
        k: $options.getProgressWidth(sharing) + "%",
        l: $options.shouldShowCountdown(sharing)
      }, $options.shouldShowCountdown(sharing) ? {
        m: common_vendor.o($options.onCountdownExpired, sharing.id),
        n: "f3dce692-0-" + i0,
        o: common_vendor.p({
          order: sharing,
          label: "自动取消",
          short: true
        })
      } : {}, {
        p: common_vendor.t($options.formatPrice(sharing.pricePerTeam || sharing.perTeamPrice || sharing.pricePerPerson || 0)),
        q: common_vendor.t(sharing.creatorUsername || "未知"),
        r: common_vendor.t($options.formatCreateTime(sharing.createdAt)),
        s: sharing.description
      }, sharing.description ? {
        t: common_vendor.t(sharing.description)
      } : {}, {
        v: common_vendor.t(sharing.creatorUsername || "未知用户"),
        w: $options.canJoinSharing(sharing)
      }, $options.canJoinSharing(sharing) ? {
        x: common_vendor.o(($event) => $options.joinSharing(sharing.id), sharing.id)
      } : {
        y: common_vendor.t($options.getJoinButtonText(sharing)),
        z: $options.hasAppliedToSharing(sharing) ? 1 : "",
        A: $options.isMySharing(sharing) ? 1 : ""
      }, {
        B: sharing.id,
        C: sharing.status === "FULL" || sharing.currentParticipants >= sharing.maxParticipants ? 1 : "",
        D: common_vendor.o(($event) => $options.navigateToDetail(sharing.id), sharing.id)
      });
    }),
    f: $options.filteredSharingOrders.length === 0 && !$options.loading
  }, $options.filteredSharingOrders.length === 0 && !$options.loading ? {} : {}, {
    g: $options.loading
  }, $options.loading ? {} : {}, {
    h: $options.hasMore && $options.filteredSharingOrders.length > 0
  }, $options.hasMore && $options.filteredSharingOrders.length > 0 ? {
    i: common_vendor.t($options.loading ? "加载中..." : "加载更多"),
    j: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args))
  } : {}, {
    k: common_vendor.o((...args) => $options.goToMyOrders && $options.goToMyOrders(...args)),
    l: common_vendor.o((...args) => $options.closeJoinModal && $options.closeJoinModal(...args)),
    m: $data.applyForm.teamName,
    n: common_vendor.o(($event) => $data.applyForm.teamName = $event.detail.value),
    o: $data.applyForm.contactInfo,
    p: common_vendor.o(($event) => $data.applyForm.contactInfo = $event.detail.value),
    q: $data.applyForm.message,
    r: common_vendor.o(($event) => $data.applyForm.message = $event.detail.value),
    s: common_vendor.t($data.applyForm.message.length),
    t: common_vendor.o((...args) => $options.closeJoinModal && $options.closeJoinModal(...args)),
    v: !$options.canSubmitApplication,
    w: common_vendor.o((...args) => $options.submitApplication && $options.submitApplication(...args)),
    x: common_vendor.sr("joinPopup", "f3dce692-1"),
    y: $data.internalJoinPopupOpened,
    z: common_vendor.p({
      type: "bottom"
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-f3dce692"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/sharing/list.js.map
