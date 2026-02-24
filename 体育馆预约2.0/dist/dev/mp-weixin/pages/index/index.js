"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_venue = require("../../stores/venue.js");
const stores_booking = require("../../stores/booking.js");
const utils_navigation = require("../../utils/navigation.js");
const utils_helpers = require("../../utils/helpers.js");
const utils_performance = require("../../utils/performance.js");
const SkeletonScreen = () => "../../components/SkeletonScreen.js";
const _sfc_main = {
  name: "IndexPage",
  components: {
    SkeletonScreen
  },
  data() {
    return {
      venueStore: null,
      bookingStore: null,
      loading: false,
      // WebSocket状态变量已被移除
      banners: [
        {
          image: "/static/banner1.jpg",
          title: "专业体育场馆"
        },
        {
          image: "/static/banner2.jpg",
          title: "便捷预约服务"
        },
        {
          image: "/static/banner3.jpg",
          title: "拼场找队友"
        }
      ]
    };
  },
  computed: {
    popularVenues() {
      var _a;
      return ((_a = this.venueStore) == null ? void 0 : _a.popularVenuesGetter) || [];
    },
    availableSharingOrders() {
      var _a;
      return ((_a = this.bookingStore) == null ? void 0 : _a.sharingOrdersGetter) || [];
    },
    latestSharingOrders() {
      if (!this.availableSharingOrders || !Array.isArray(this.availableSharingOrders)) {
        return [];
      }
      return this.availableSharingOrders.slice(0, 3);
    },
    // 确保热门场馆数据安全
    safePopularVenues() {
      if (!this.popularVenues || !Array.isArray(this.popularVenues)) {
        return [];
      }
      return this.popularVenues;
    }
  },
  onLoad() {
    this.venueStore = stores_venue.useVenueStore();
    this.bookingStore = stores_booking.useBookingStore();
    this.loadHomeDataWithCache();
  },
  onPullDownRefresh() {
    this.refreshData();
  },
  onShow() {
    const cacheKey = "homePageData";
    const cached = utils_performance.CacheManager.get(cacheKey);
    if (!cached) {
      this.loadHomeDataWithCache();
    }
  },
  methods: {
    // WebSocket初始化方法已被移除
    // WebSocket测试方法已被移除
    // 优化的首页数据加载（带缓存和超时处理）
    async loadHomeDataWithCache() {
      const cacheKey = "homePageData";
      try {
        utils_performance.SimplePerformanceMonitor.mark("homeDataLoad");
        const cached = utils_performance.CacheManager.get(cacheKey);
        if (cached) {
          this.venueStore.setPopularVenues(cached.popularVenues || []);
          this.bookingStore.setSharingOrders(cached.latestSharingOrders || []);
          common_vendor.index.__f__("log", "at pages/index/index.vue:239", "使用缓存数据");
          utils_performance.SimplePerformanceMonitor.measure("homeDataLoad");
          return;
        }
        this.loading = true;
        common_vendor.index.__f__("log", "at pages/index/index.vue:248", "加载首页数据，无需登录验证");
        const timeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("请求超时")), 5e3);
        });
        const dataPromise = Promise.allSettled([
          this.venueStore.getPopularVenues(),
          this.bookingStore.getSharingOrdersList({ page: 1, pageSize: 3 })
        ]);
        const results = await Promise.race([
          dataPromise,
          timeout.then(() => {
            common_vendor.index.__f__("warn", "at pages/index/index.vue:266", "请求超时，使用备用数据");
            return [
              { status: "rejected", reason: "请求超时" },
              { status: "rejected", reason: "请求超时" }
            ];
          })
        ]);
        const [venuesResult, sharingsResult] = results;
        if (venuesResult.status === "rejected") {
          common_vendor.index.__f__("warn", "at pages/index/index.vue:278", "获取场馆数据失败:", venuesResult.reason);
          this.venueStore.setPopularVenues([]);
        }
        if (sharingsResult.status === "rejected") {
          common_vendor.index.__f__("warn", "at pages/index/index.vue:284", "获取拼场数据失败:", sharingsResult.reason);
          this.bookingStore.setSharingOrders([]);
        }
        if (this.popularVenues.length > 0 || this.latestSharingOrders.length > 0) {
          const cacheData = {
            popularVenues: this.popularVenues,
            latestSharingOrders: this.latestSharingOrders
          };
          utils_performance.CacheManager.set(cacheKey, cacheData, 5 * 60 * 1e3);
        }
        utils_performance.SimplePerformanceMonitor.measure("homeDataLoad");
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:301", "加载首页数据失败:", error);
        if (error.code === "LOGIN_EXPIRED") {
          common_vendor.index.__f__("log", "at pages/index/index.vue:304", "登录已过期，但允许继续浏览首页");
          this.venueStore.setPopularVenues([]);
          this.bookingStore.setSharingOrders([]);
        } else {
          common_vendor.index.showToast({
            title: "数据加载失败",
            icon: "none"
          });
        }
      } finally {
        this.loading = false;
      }
    },
    // 图片加载成功处理
    onImageLoad(e) {
      common_vendor.index.__f__("log", "at pages/index/index.vue:321", "图片加载成功");
    },
    // 图片加载失败处理
    onImageError(e) {
      common_vendor.index.__f__("log", "at pages/index/index.vue:326", "图片加载失败:", e);
    },
    // 下拉刷新（清除缓存）
    async refreshData() {
      try {
        utils_performance.CacheManager.remove("homePageData");
        await this.loadHomeDataWithCache();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:338", "刷新数据失败:", error);
        common_vendor.index.showToast({
          title: "刷新失败",
          icon: "none"
        });
      } finally {
        common_vendor.index.stopPullDownRefresh();
      }
    },
    // 初始化数据（备用方法）
    async initData() {
      try {
        await Promise.all([
          this.venueStore.getPopularVenues(),
          this.bookingStore.getSharingOrdersList({ page: 1, pageSize: 3 })
        ]);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:356", "初始化数据失败:", error);
      }
    },
    // 页面跳转
    navigateTo(url) {
      utils_navigation.smartNavigate(url);
    },
    // 格式化日期
    formatDate(date) {
      return utils_helpers.formatDate(date, "MM-DD");
    },
    // 获取状态样式类
    getStatusClass(status) {
      const statusMap = {
        "AVAILABLE": "status-available",
        "MAINTENANCE": "status-maintenance",
        "OCCUPIED": "status-occupied"
      };
      return statusMap[status] || "status-available";
    },
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        "AVAILABLE": "可用",
        "MAINTENANCE": "维护中",
        "OCCUPIED": "已占用"
      };
      return statusMap[status] || "可用";
    }
  }
};
if (!Array) {
  const _component_SkeletonScreen = common_vendor.resolveComponent("SkeletonScreen");
  _component_SkeletonScreen();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.loading
  }, $data.loading ? {
    b: common_vendor.p({
      ["show-banner"]: true,
      ["show-actions"]: true,
      ["show-venues"]: true,
      ["show-sharings"]: true,
      count: 3
    })
  } : common_vendor.e({
    c: common_vendor.f($data.banners, (banner, index, i0) => {
      return {
        a: banner.image,
        b: common_vendor.o((...args) => $options.onImageLoad && $options.onImageLoad(...args), index),
        c: common_vendor.o((...args) => $options.onImageError && $options.onImageError(...args), index),
        d: index
      };
    }),
    d: common_vendor.o(($event) => $options.navigateTo("/pages/venue/list")),
    e: common_vendor.o(($event) => $options.navigateTo("/pages/sharing/list")),
    f: common_vendor.o(($event) => $options.navigateTo("/pages/booking/list")),
    g: common_vendor.o(($event) => $options.navigateTo("/pages/user/profile")),
    h: common_vendor.o(($event) => $options.navigateTo("/pages/venue/list")),
    i: common_vendor.f($options.safePopularVenues, (venue, k0, i0) => {
      return {
        a: venue.images && venue.images[0] || "/static/default-venue.jpg",
        b: common_vendor.o((...args) => $options.onImageLoad && $options.onImageLoad(...args), venue.id),
        c: common_vendor.o((...args) => $options.onImageError && $options.onImageError(...args), venue.id),
        d: common_vendor.t(venue.name || "未知场馆"),
        e: common_vendor.t(venue.location || "位置未知"),
        f: common_vendor.t(venue.price || 0),
        g: common_vendor.t($options.getStatusText(venue.status)),
        h: common_vendor.n($options.getStatusClass(venue.status)),
        i: venue.id,
        j: common_vendor.o(($event) => $options.navigateTo(`/pages/venue/detail?id=${venue.id}`), venue.id)
      };
    }),
    j: $options.safePopularVenues.length === 0
  }, $options.safePopularVenues.length === 0 ? {} : {}, {
    k: common_vendor.o(($event) => $options.navigateTo("/pages/sharing/list")),
    l: common_vendor.f($options.latestSharingOrders, (sharing, k0, i0) => {
      return {
        a: common_vendor.t(sharing.venueName),
        b: common_vendor.t($options.formatDate(sharing.bookingDate)),
        c: common_vendor.t(sharing.startTime),
        d: common_vendor.t(sharing.endTime),
        e: common_vendor.t(sharing.teamName),
        f: common_vendor.t(sharing.currentParticipants),
        g: common_vendor.t(sharing.maxParticipants),
        h: common_vendor.t(sharing.pricePerPerson),
        i: sharing.id,
        j: common_vendor.o(($event) => $options.navigateTo(`/pages/sharing/detail?id=${sharing.id}`), sharing.id)
      };
    })
  }));
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-83a5a03c"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
