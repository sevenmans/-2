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
      isLoggingOut: false
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
    this.userStore = stores_user.useUserStore();
    this.bookingStore = stores_booking.useBookingStore();
    this.sharingStore = stores_sharing.useSharingStore();
    this.loadUserData();
  },
  onShow() {
    this.loadUserDataWithCache();
  },
  onUnload() {
  },
  methods: {
    // 缓存优化的数据加载方法
    async loadUserDataWithCache() {
      if (this.isRefreshing) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:199", "[Profile] 正在刷新中，跳过重复请求");
        return;
      }
      const now = Date.now();
      const hasData = this.userInfo && Object.keys(this.userInfo).length > 0;
      if (hasData && this.lastRefreshTime && now - this.lastRefreshTime < this.cacheTimeout) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:209", "[Profile] 使用缓存数据，跳过请求");
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
      common_vendor.index.__f__("log", "at pages/user/profile.vue:226", "[Profile] 开始加载用户数据");
      if (this.isLoading || this.isRefreshing) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:230", "[Profile] 正在加载中，跳过重复请求");
        return;
      }
      this.isLoading = true;
      this.isRefreshing = true;
      try {
        await Promise.all([
          // 第一组：核心数据（用户信息 + 统计），失败会抛异常
          Promise.all([
            this.loadUserInfo(),
            this.loadUserStats()
          ]),
          // 第二组：角标数量，失败只静默降级，不影响页面渲染
          this.loadPendingCounts().catch((error) => {
            common_vendor.index.__f__("warn", "at pages/user/profile.vue:247", "[Profile] 加载待处理数量失败:", error.message);
          })
        ]);
        common_vendor.index.__f__("log", "at pages/user/profile.vue:251", "[Profile] 用户数据加载完成");
        this.lastRefreshTime = Date.now();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/user/profile.vue:257", "[Profile] 加载用户数据失败:", error);
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
        common_vendor.index.__f__("log", "at pages/user/profile.vue:273", "[Profile] 用户信息正在加载中，跳过");
        return;
      }
      if (this.isCacheValid("userInfo") && this.userInfo && Object.keys(this.userInfo).length > 0) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:278", "[Profile] 使用缓存的用户信息");
        return;
      }
      this.loadingFlags.userInfo = true;
      try {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:285", "[Profile] 开始加载用户信息");
        await this.userStore.getUserInfo();
        this.lastLoadTime.userInfo = Date.now();
        common_vendor.index.__f__("log", "at pages/user/profile.vue:288", "[Profile] 用户信息加载成功");
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/user/profile.vue:290", "[Profile] 用户信息加载失败:", error);
        throw error;
      } finally {
        this.loadingFlags.userInfo = false;
      }
    },
    // 加载用户统计
    async loadUserStats() {
      if (this.loadingFlags.userStats) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:301", "[Profile] 用户统计正在加载中，跳过");
        return;
      }
      if (this.isCacheValid("userStats") && this.userStats && Object.keys(this.userStats).length > 0) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:306", "[Profile] 使用缓存的用户统计");
        return;
      }
      this.loadingFlags.userStats = true;
      try {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:313", "[Profile] 开始加载用户统计");
        await this.userStore.getUserStats();
        this.lastLoadTime.userStats = Date.now();
        common_vendor.index.__f__("log", "at pages/user/profile.vue:316", "[Profile] 用户统计加载成功");
      } catch (error) {
        common_vendor.index.__f__("warn", "at pages/user/profile.vue:318", "[Profile] 用户统计加载失败，使用默认值:", error.message);
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
        common_vendor.index.__f__("log", "at pages/user/profile.vue:335", "[Profile] 待处理数量正在加载中，跳过重复请求");
        return;
      }
      if (this.isCacheValid("pendingCounts")) {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:340", "[Profile] 使用缓存的待处理数量");
        return;
      }
      common_vendor.index.__f__("log", "at pages/user/profile.vue:344", "[Profile] 开始加载待处理数量");
      this.loadingFlags.pendingCounts = true;
      this.pendingBookings = 0;
      this.pendingSharings = 0;
      this.pendingRequests = 0;
      this.receivedRequests = 0;
      try {
        await Promise.allSettled([
          this.loadPendingBookings(),
          this.loadPendingSharings(),
          this.loadPendingRequests(),
          this.loadReceivedRequests()
        ]);
        this.lastLoadTime.pendingCounts = Date.now();
        common_vendor.index.__f__("log", "at pages/user/profile.vue:364", "[Profile] 所有待处理数量加载完成:", {
          pendingBookings: this.pendingBookings,
          pendingSharings: this.pendingSharings,
          pendingRequests: this.pendingRequests,
          receivedRequests: this.receivedRequests
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/user/profile.vue:372", "[Profile] 加载待处理数量失败:", error);
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
        common_vendor.index.__f__("log", "at pages/user/profile.vue:393", "[Profile] 加载待确认预约数量");
        const result = await Promise.race([
          this.bookingStore.getUserBookings({
            status: "pending",
            page: 1,
            pageSize: 1
            // 🔥 只需要 total 数字，不需要完整数据
          }),
          this.createTimeoutPromise(5e3)
        ]);
        this.pendingBookings = result.total || 0;
        common_vendor.index.__f__("log", "at pages/user/profile.vue:404", "[Profile] 待确认预约数量:", this.pendingBookings);
      } catch (error) {
        common_vendor.index.__f__("warn", "at pages/user/profile.vue:406", "[Profile] 加载待确认预约数量失败:", error.message);
        this.pendingBookings = 0;
      }
    },
    // 加载待处理拼场数量
    async loadPendingSharings() {
      try {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:414", "[Profile] 加载待处理拼场数量");
        const result = await Promise.race([
          this.bookingStore.getUserSharingOrders({
            status: "PENDING",
            page: 1,
            pageSize: 1
            // 🔥 只需要 total 数字，不需要完整数据
          }),
          this.createTimeoutPromise(5e3)
        ]);
        if (Array.isArray(result.data)) {
          this.pendingSharings = result.data.length;
        } else {
          this.pendingSharings = result.total || 0;
        }
        common_vendor.index.__f__("log", "at pages/user/profile.vue:430", "[Profile] 待处理拼场数量:", this.pendingSharings);
      } catch (error) {
        common_vendor.index.__f__("warn", "at pages/user/profile.vue:432", "[Profile] 加载待处理拼场数量失败:", error.message);
        this.pendingSharings = 0;
      }
    },
    // 加载我发出的待处理申请数量
    async loadPendingRequests() {
      try {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:440", "[Profile] 加载我发出的待处理申请数量");
        const result = await Promise.race([
          this.sharingStore.getSentRequestsList({
            status: "PENDING",
            page: 1,
            pageSize: 1
            // 🔥 只需要 total 数字，不需要完整数据
          }),
          this.createTimeoutPromise(5e3)
        ]);
        const myRequests = (result == null ? void 0 : result.data) || (result == null ? void 0 : result.list) || result || [];
        if (Array.isArray(myRequests)) {
          this.pendingRequests = myRequests.filter((req) => (req.status || "").toString().toUpperCase() === "PENDING").length;
        } else {
          this.pendingRequests = 0;
        }
        common_vendor.index.__f__("log", "at pages/user/profile.vue:457", "[Profile] 我发出的待处理申请数量:", this.pendingRequests);
      } catch (error) {
        common_vendor.index.__f__("warn", "at pages/user/profile.vue:459", "[Profile] 加载我发出的待处理申请数量失败:", error.message);
        this.pendingRequests = 0;
      }
    },
    // 加载收到的待处理申请数量
    async loadReceivedRequests() {
      try {
        common_vendor.index.__f__("log", "at pages/user/profile.vue:467", "[Profile] 加载收到的待处理申请数量");
        const result = await Promise.race([
          this.sharingStore.getReceivedRequestsList({
            status: "PENDING",
            page: 1,
            pageSize: 1
            // 🔥 只需要 total 数字，不需要完整数据
          }),
          this.createTimeoutPromise(5e3)
        ]);
        const receivedRequests = (result == null ? void 0 : result.data) || (result == null ? void 0 : result.list) || result || [];
        if (Array.isArray(receivedRequests)) {
          this.receivedRequests = receivedRequests.filter((req) => (req.status || "").toString().toUpperCase() === "PENDING").length;
        } else {
          this.receivedRequests = 0;
        }
        common_vendor.index.__f__("log", "at pages/user/profile.vue:483", "[Profile] 收到的待处理申请数量:", this.receivedRequests);
      } catch (error) {
        common_vendor.index.__f__("warn", "at pages/user/profile.vue:485", "[Profile] 加载收到的待处理申请数量失败:", error.message);
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
        await this.userStore.uploadAvatar(filePath);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "头像更新成功",
          icon: "success"
        });
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/user/profile.vue:525", "[Profile] 上传头像失败:", error);
        common_vendor.index.showToast({
          title: error.message || "上传失败",
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
      if (this.isLoggingOut) {
        return;
      }
      common_vendor.index.showModal({
        title: "确认退出",
        content: "确定要退出登录吗？",
        confirmText: "退出",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            this.handleLogoutConfirm();
          }
        }
      });
    },
    // 确认退出登录
    async handleLogoutConfirm() {
      try {
        if (this.isLoggingOut)
          return;
        this.isLoggingOut = true;
        await this.userStore.logout();
        common_vendor.index.showToast({
          title: "已退出登录",
          icon: "success"
        });
        setTimeout(() => {
          common_vendor.index.reLaunch({
            url: "/pages/user/login"
          });
        }, 500);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/user/profile.vue:605", "[Profile] 退出登录失败:", error);
        common_vendor.index.showToast({
          title: "退出失败",
          icon: "error"
        });
      } finally {
        this.isLoggingOut = false;
      }
    }
  }
};
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
    x: common_vendor.o((...args) => $options.showLogoutConfirm && $options.showLogoutConfirm(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-f6b4f04d"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/user/profile.js.map
