"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_user = require("../../stores/user.js");
const stores_booking = require("../../stores/booking.js");
const stores_sharing = require("../../stores/sharing.js");
const _sfc_main = {
  name: "UserProfile",
  data() {
    return {
      userStore: null,
      bookingStore: null,
      sharingStore: null,
      pendingBookings: 0,
      pendingSharings: 0,
      pendingRequests: 0,
      receivedRequests: 0,
      isLoading: false,
      // 防重复请求标记
      loadingFlags: {
        userInfo: false,
        userStats: false,
        pendingCounts: false
      },
      // 请求缓存时间戳
      lastLoadTime: {
        userInfo: 0,
        userStats: 0,
        pendingCounts: 0
      },
      // 缓存有效期（毫秒）
      cacheTimeout: 3e4,
      // 30秒
      // 整体缓存时间戳
      lastRefreshTime: 0,
      isRefreshing: false,
      // 退出登录弹窗状态（已移除showLogoutPopup变量，改用ref方式）
      logoutPopupShown: false,
      // 弹窗状态控制变量
      internalLogoutPopupOpened: false,
      logoutPopupPosition: "",
      // 弹窗实例缓存
      _logoutPopupRef: null
    };
  },
  computed: {
    userInfo() {
      var _a;
      return ((_a = this.userStore) == null ? void 0 : _a.userInfoGetter) || {};
    },
    userStats() {
      var _a;
      return ((_a = this.userStore) == null ? void 0 : _a.userStats) || {};
    },
    isLoggedIn() {
      var _a;
      return ((_a = this.userStore) == null ? void 0 : _a.getIsLoggedIn) || false;
    }
  },
  onLoad() {
    this.logoutPopupShown = false;
    this.internalLogoutPopupOpened = false;
    this.userStore = stores_user.useUserStore();
    this.bookingStore = stores_booking.useBookingStore();
    this.sharingStore = stores_sharing.useSharingStore();
    this.$nextTick(() => {
      try {
        if (this.$refs.logoutPopup) {
          this._logoutPopupRef = this.$refs.logoutPopup;
        }
      } catch (e) {
        common_vendor.index.__f__("warn", "at pages/user/profile.vue:210", "[Profile] 缓存弹窗实例失败:", e);
      }
      setTimeout(() => {
        try {
          if (!this._logoutPopupRef && this.$refs.logoutPopup) {
            this._logoutPopupRef = this.$refs.logoutPopup;
          }
        } catch (e) {
          common_vendor.index.__f__("warn", "at pages/user/profile.vue:220", "[Profile] 延迟缓存弹窗实例失败:", e);
        }
      }, 500);
    });
    this.loadUserData();
  },
  onShow() {
    this.loadUserDataWithCache();
  },
  onUnload() {
    this._logoutPopupRef = null;
  },
  methods: {
    // 缓存优化的数据加载方法
    async loadUserDataWithCache() {
      if (this.isRefreshing) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:245", "[Profile] 正在刷新中，跳过重复请求");
        return;
      }
      const now = Date.now();
      const hasData = this.userInfo && Object.keys(this.userInfo).length > 0;
      if (hasData && this.lastRefreshTime && now - this.lastRefreshTime < this.cacheTimeout) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:255", "[Profile] 使用缓存数据，跳过请求");
        return;
      }
      await this.loadUserData();
    },
    // 检查缓存是否有效
    isCacheValid(type) {
      const now = Date.now();
      const lastTime = this.lastLoadTime[type];
      return now - lastTime < this.cacheTimeout;
    },
    // 加载用户数据
    async loadUserData() {
      common_vendor.index.__f__("log", "at pages/user/profile.vue:272", "[Profile] 开始加载用户数据");
      if (this.isLoading || this.isRefreshing) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:276", "[Profile] 正在加载中，跳过重复请求");
        return;
      }
      this.isLoading = true;
      this.isRefreshing = true;
      try {
        await this.loadUserInfo();
        await this.loadUserStats();
        setTimeout(async () => {
          try {
            common_vendor.index.__f__("log", "at pages/user/profile.vue:293", "[Profile] 延迟加载待处理数量");
            await this.loadPendingCounts();
          } catch (error) {
            common_vendor.index.__f__("warn", "at pages/user/profile.vue:296", "[Profile] 加载待处理数量失败:", error.message);
          }
        }, 500);
        common_vendor.index.__f__("log", "at pages/user/profile.vue:300", "[Profile] 用户数据加载完成");
        this.lastRefreshTime = Date.now();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/user/profile.vue:306", "[Profile] 加载用户数据失败:", error);
        common_vendor.index.showToast({
          title: "加载用户信息失败",
          icon: "none",
          duration: 2e3
        });
      } finally {
        this.isLoading = false;
        this.isRefreshing = false;
      }
    },
    // 加载用户信息
    async loadUserInfo() {
      if (this.loadingFlags.userInfo) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:322", "[Profile] 用户信息正在加载中，跳过");
        return;
      }
      if (this.isCacheValid("userInfo") && this.userInfo && Object.keys(this.userInfo).length > 0) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:327", "[Profile] 使用缓存的用户信息");
        return;
      }
      this.loadingFlags.userInfo = true;
      try {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:334", "[Profile] 开始加载用户信息");
        await this.userStore.getUserInfo();
        this.lastLoadTime.userInfo = Date.now();
        common_vendor.index.__f__("log", "at pages/user/profile.vue:337", "[Profile] 用户信息加载成功");
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/user/profile.vue:339", "[Profile] 用户信息加载失败:", error);
        throw error;
      } finally {
        this.loadingFlags.userInfo = false;
      }
    },
    // 加载用户统计
    async loadUserStats() {
      if (this.loadingFlags.userStats) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:350", "[Profile] 用户统计正在加载中，跳过");
        return;
      }
      if (this.isCacheValid("userStats") && this.userStats && Object.keys(this.userStats).length > 0) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:355", "[Profile] 使用缓存的用户统计");
        return;
      }
      this.loadingFlags.userStats = true;
      try {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:362", "[Profile] 开始加载用户统计");
        await this.userStore.getUserStats();
        this.lastLoadTime.userStats = Date.now();
        common_vendor.index.__f__("log", "at pages/user/profile.vue:365", "[Profile] 用户统计加载成功");
      } catch (error) {
        common_vendor.index.__f__("warn", "at pages/user/profile.vue:367", "[Profile] 用户统计加载失败，使用默认值:", error.message);
        this.userStats = {
          totalBookings: 0,
          pendingBookings: 0,
          completedBookings: 0,
          totalSpent: 0
        };
      } finally {
        this.loadingFlags.userStats = false;
      }
    },
    // 加载待处理数量
    async loadPendingCounts() {
      if (this.loadingFlags.pendingCounts) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:384", "[Profile] 待处理数量正在加载中，跳过重复请求");
        return;
      }
      if (this.isCacheValid("pendingCounts")) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:389", "[Profile] 使用缓存的待处理数量");
        return;
      }
      common_vendor.index.__f__("log", "at pages/user/profile.vue:393", "[Profile] 开始加载待处理数量");
      this.loadingFlags.pendingCounts = true;
      this.pendingBookings = 0;
      this.pendingSharings = 0;
      this.pendingRequests = 0;
      this.receivedRequests = 0;
      try {
        await this.loadPendingBookings();
        await this.delay(200);
        await this.loadPendingSharings();
        await this.delay(200);
        await this.loadPendingRequests();
        await this.delay(200);
        await this.loadReceivedRequests();
        this.lastLoadTime.pendingCounts = Date.now();
        common_vendor.index.__f__("log", "at pages/user/profile.vue:417", "[Profile] 所有待处理数量加载完成:", {
          pendingBookings: this.pendingBookings,
          pendingSharings: this.pendingSharings,
          pendingRequests: this.pendingRequests,
          receivedRequests: this.receivedRequests
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/user/profile.vue:425", "[Profile] 加载待处理数量失败:", error);
      } finally {
        this.loadingFlags.pendingCounts = false;
      }
    },
    // 延迟函数
    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    // 创建超时Promise
    createTimeoutPromise(timeout = 5e3) {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error("请求超时")), timeout);
      });
    },
    // 加载待确认预约数量
    async loadPendingBookings() {
      try {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:446", "[Profile] 加载待确认预约数量");
        const result = await Promise.race([
          this.bookingStore.getUserBookings({
            status: "pending",
            page: 1,
            pageSize: 1
          }),
          this.createTimeoutPromise(5e3)
        ]);
        this.pendingBookings = result.total || 0;
        common_vendor.index.__f__("log", "at pages/user/profile.vue:457", "[Profile] 待确认预约数量:", this.pendingBookings);
      } catch (error) {
        common_vendor.index.__f__("warn", "at pages/user/profile.vue:459", "[Profile] 加载待确认预约数量失败:", error.message);
        this.pendingBookings = 0;
      }
    },
    // 加载待处理拼场数量
    async loadPendingSharings() {
      try {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:467", "[Profile] 加载待处理拼场数量");
        const result = await Promise.race([
          this.bookingStore.getUserSharingOrders({
            status: "pending",
            page: 1,
            pageSize: 1
          }),
          this.createTimeoutPromise(5e3)
        ]);
        if (Array.isArray(result.data)) {
          this.pendingSharings = result.data.length;
        } else {
          this.pendingSharings = result.total || 0;
        }
        common_vendor.index.__f__("log", "at pages/user/profile.vue:483", "[Profile] 待处理拼场数量:", this.pendingSharings);
      } catch (error) {
        common_vendor.index.__f__("warn", "at pages/user/profile.vue:485", "[Profile] 加载待处理拼场数量失败:", error.message);
        this.pendingSharings = 0;
      }
    },
    // 加载我发出的待处理申请数量
    async loadPendingRequests() {
      try {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:493", "[Profile] 加载我发出的待处理申请数量");
        const result = await Promise.race([
          this.sharingStore.getSentRequestsList(),
          this.createTimeoutPromise(5e3)
        ]);
        const myRequests = (result == null ? void 0 : result.data) || (result == null ? void 0 : result.list) || result || [];
        if (Array.isArray(myRequests)) {
          this.pendingRequests = myRequests.filter((req) => req.status === "pending").length;
        } else {
          this.pendingRequests = 0;
        }
        common_vendor.index.__f__("log", "at pages/user/profile.vue:505", "[Profile] 我发出的待处理申请数量:", this.pendingRequests);
      } catch (error) {
        common_vendor.index.__f__("warn", "at pages/user/profile.vue:507", "[Profile] 加载我发出的待处理申请数量失败:", error.message);
        this.pendingRequests = 0;
      }
    },
    // 加载收到的待处理申请数量
    async loadReceivedRequests() {
      try {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:515", "[Profile] 加载收到的待处理申请数量");
        const result = await Promise.race([
          this.sharingStore.getReceivedRequestsList(),
          this.createTimeoutPromise(5e3)
        ]);
        const receivedRequests = (result == null ? void 0 : result.data) || (result == null ? void 0 : result.list) || result || [];
        if (Array.isArray(receivedRequests)) {
          this.receivedRequests = receivedRequests.filter((req) => req.status === "pending").length;
        } else {
          this.receivedRequests = 0;
        }
        common_vendor.index.__f__("log", "at pages/user/profile.vue:527", "[Profile] 收到的待处理申请数量:", this.receivedRequests);
      } catch (error) {
        common_vendor.index.__f__("warn", "at pages/user/profile.vue:529", "[Profile] 加载收到的待处理申请数量失败:", error.message);
        this.receivedRequests = 0;
      }
    },
    // 格式化手机号
    formatPhone(phone) {
      if (!phone)
        return "";
      return phone.replace(/(\d{3})(\d{4})(\d{4})/, "$1****$3");
    },
    // 更换头像
    changeAvatar() {
      common_vendor.index.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0];
          this.uploadAvatar(tempFilePath);
        }
      });
    },
    // 上传头像
    async uploadAvatar(filePath) {
      try {
        common_vendor.index.showLoading({ title: "上传中..." });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "头像更新成功",
          icon: "success"
        });
        await this.userStore.getUserInfo();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/user/profile.vue:572", "上传头像失败:", error);
        common_vendor.index.showToast({
          title: "上传失败",
          icon: "error"
        });
      }
    },
    // 编辑资料
    editProfile() {
      if (!this.userInfo) {
        this.loadUserData();
      }
      common_vendor.index.navigateTo({
        url: "/pages/user/edit-profile"
      });
    },
    // 页面跳转
    navigateTo(url) {
      const tabbarPages = [
        "/pages/index/index",
        "/pages/venue/list",
        "/pages/sharing/list",
        "/pages/booking/list",
        "/pages/user/profile"
      ];
      const pagePath = url.split("?")[0];
      if (tabbarPages.includes(pagePath)) {
        common_vendor.index.switchTab({ url: pagePath });
      } else {
        common_vendor.index.navigateTo({ url });
      }
    },
    // 显示退出登录确认
    showLogoutConfirm() {
      if (this.logoutPopupShown) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:618", "[Profile] 退出登录弹窗已显示，跳过重复操作");
        return;
      }
      this.showLogoutPopup();
      this.logoutPopupShown = true;
      common_vendor.index.__f__("log", "at pages/user/profile.vue:624", "[Profile] 显示退出登录确认弹窗");
    },
    // 取消退出登录
    handleLogoutCancel() {
      this.closeLogoutPopup();
      this.logoutPopupShown = false;
      common_vendor.index.__f__("log", "at pages/user/profile.vue:631", "[Profile] 取消退出登录");
    },
    // 显示退出登录弹窗（兼容微信小程序）
    showLogoutPopup() {
      const debugEnabled = false;
      try {
        let windowInfo, deviceInfo, appInfo;
        try {
          windowInfo = common_vendor.index.getWindowInfo ? common_vendor.index.getWindowInfo() : {};
          deviceInfo = common_vendor.index.getDeviceInfo ? common_vendor.index.getDeviceInfo() : {};
          appInfo = common_vendor.index.getAppBaseInfo ? common_vendor.index.getAppBaseInfo() : {};
        } catch (e) {
          if (debugEnabled)
            ;
        }
        let popup = null;
        if (this.$refs.logoutPopup) {
          popup = this.$refs.logoutPopup;
          if (Array.isArray(popup)) {
            popup = popup[0];
          }
        }
        if (!popup && this._logoutPopupRef) {
          popup = this._logoutPopupRef;
        }
        if (!popup && this.$scope && typeof this.$scope.selectComponent === "function") {
          try {
            popup = this.$scope.selectComponent("#logoutPopup");
          } catch (e) {
            if (debugEnabled)
              ;
          }
        }
        if (!popup && this.$children && this.$children.length > 0) {
          for (let child of this.$children) {
            if (child.$options && child.$options.name === "UniPopup") {
              popup = child;
              break;
            }
          }
        }
        if (popup && typeof popup.open === "function") {
          popup.open();
          this.internalLogoutPopupOpened = true;
          try {
            if (this.logoutPopupPosition) {
              this.$nextTick(() => {
              });
            }
          } catch (e) {
            if (debugEnabled)
              ;
          }
          if (debugEnabled)
            ;
          return;
        }
        setTimeout(() => {
          try {
            let retryPopup = this.$refs.logoutPopup || this._logoutPopupRef;
            if (retryPopup && typeof retryPopup.open === "function") {
              retryPopup.open();
              this.internalLogoutPopupOpened = true;
              if (debugEnabled)
                ;
              return;
            }
          } catch (e) {
            if (debugEnabled)
              ;
          }
        }, 100);
        if (debugEnabled)
          ;
        this.internalLogoutPopupOpened = false;
        this.$forceUpdate();
      } catch (error) {
      }
    },
    // 关闭退出登录弹窗（兼容微信小程序）
    closeLogoutPopup() {
      const debugEnabled = false;
      try {
        let windowInfo, deviceInfo, appInfo;
        try {
          windowInfo = common_vendor.index.getWindowInfo ? common_vendor.index.getWindowInfo() : {};
          deviceInfo = common_vendor.index.getDeviceInfo ? common_vendor.index.getDeviceInfo() : {};
          appInfo = common_vendor.index.getAppBaseInfo ? common_vendor.index.getAppBaseInfo() : {};
        } catch (e) {
          if (debugEnabled)
            ;
        }
        let popup = null;
        if (this.$refs.logoutPopup) {
          popup = this.$refs.logoutPopup;
          if (Array.isArray(popup)) {
            popup = popup[0];
          }
        }
        if (!popup && this._logoutPopupRef) {
          popup = this._logoutPopupRef;
        }
        if (!popup && this.$scope && typeof this.$scope.selectComponent === "function") {
          try {
            popup = this.$scope.selectComponent("#logoutPopup");
          } catch (e) {
            if (debugEnabled)
              ;
          }
        }
        if (!popup && this.$children && this.$children.length > 0) {
          for (let child of this.$children) {
            if (child.$options && child.$options.name === "UniPopup") {
              popup = child;
              break;
            }
          }
        }
        if (popup && typeof popup.close === "function") {
          popup.close();
          this.internalLogoutPopupOpened = false;
          try {
            if (this.logoutPopupPosition) {
              this.$nextTick(() => {
              });
            }
          } catch (e) {
            if (debugEnabled)
              ;
          }
          if (debugEnabled)
            ;
          return;
        }
        setTimeout(() => {
          try {
            let retryPopup = this.$refs.logoutPopup || this._logoutPopupRef;
            if (retryPopup && typeof retryPopup.close === "function") {
              retryPopup.close();
              this.internalLogoutPopupOpened = false;
              if (debugEnabled)
                ;
              return;
            }
          } catch (e) {
            if (debugEnabled)
              ;
          }
        }, 100);
        if (debugEnabled)
          ;
        this.internalLogoutPopupOpened = true;
        this.$forceUpdate();
      } catch (error) {
      }
    },
    // 确认退出登录
    async handleLogoutConfirm() {
      try {
        await this.userStore.logout();
        this.handleLogoutCancel();
        common_vendor.index.showToast({
          title: "已退出登录",
          icon: "success"
        });
        setTimeout(() => {
          common_vendor.index.reLaunch({
            url: "/pages/user/login"
          });
        }, 1e3);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/user/profile.vue:843", "[Profile] 退出登录失败:", error);
        common_vendor.index.showToast({
          title: "退出失败",
          icon: "error"
        });
      } finally {
        this.logoutPopupShown = false;
      }
    }
  }
};
if (!Array) {
  const _component_uni_popup_dialog = common_vendor.resolveComponent("uni-popup-dialog");
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  (_component_uni_popup_dialog + _component_uni_popup)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b, _c, _d, _e;
  return common_vendor.e({
    a: ((_a = $options.userInfo) == null ? void 0 : _a.avatar) || "/static/images/default-avatar.svg",
    b: common_vendor.o((...args) => $options.changeAvatar && $options.changeAvatar(...args)),
    c: common_vendor.t(((_b = $options.userInfo) == null ? void 0 : _b.nickname) || ((_c = $options.userInfo) == null ? void 0 : _c.username) || "未设置昵称"),
    d: common_vendor.t(((_d = $options.userInfo) == null ? void 0 : _d.username) || "未设置用户名"),
    e: common_vendor.t($options.formatPhone(((_e = $options.userInfo) == null ? void 0 : _e.phone) || "")),
    f: common_vendor.o((...args) => $options.editProfile && $options.editProfile(...args)),
    g: common_vendor.t($options.userStats.totalBookings || 0),
    h: common_vendor.o(($event) => $options.navigateTo("/pages/booking/list")),
    i: common_vendor.t($options.userStats.totalSharings || 0),
    j: common_vendor.o(($event) => $options.navigateTo("/pages/sharing/list?tab=my")),
    k: $data.pendingBookings > 0
  }, $data.pendingBookings > 0 ? {
    l: common_vendor.t($data.pendingBookings)
  } : {}, {
    m: common_vendor.o(($event) => $options.navigateTo("/pages/booking/list")),
    n: $data.pendingSharings > 0
  }, $data.pendingSharings > 0 ? {
    o: common_vendor.t($data.pendingSharings)
  } : {}, {
    p: common_vendor.o(($event) => $options.navigateTo("/pages/sharing/list?tab=my")),
    q: $data.pendingRequests > 0
  }, $data.pendingRequests > 0 ? {
    r: common_vendor.t($data.pendingRequests)
  } : {}, {
    s: common_vendor.o(($event) => $options.navigateTo("/pages/sharing/requests")),
    t: $data.receivedRequests > 0
  }, $data.receivedRequests > 0 ? {
    v: common_vendor.t($data.receivedRequests)
  } : {}, {
    w: common_vendor.o(($event) => $options.navigateTo("/pages/sharing/received")),
    x: common_vendor.o((...args) => $options.showLogoutConfirm && $options.showLogoutConfirm(...args)),
    y: common_vendor.o($options.handleLogoutCancel),
    z: common_vendor.o($options.handleLogoutConfirm),
    A: common_vendor.p({
      type: "warn",
      title: "确认退出",
      content: "确定要退出登录吗？",
      ["before-close"]: true
    }),
    B: common_vendor.sr("logoutPopup", "f6b4f04d-0"),
    C: $data.internalLogoutPopupOpened,
    D: common_vendor.n($data.logoutPopupPosition),
    E: common_vendor.p({
      type: "dialog"
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-f6b4f04d"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/user/profile.js.map
