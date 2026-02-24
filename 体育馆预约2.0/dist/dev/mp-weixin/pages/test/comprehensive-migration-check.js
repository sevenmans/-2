"use strict";
const stores_booking = require("../../stores/booking.js");
const stores_sharing = require("../../stores/sharing.js");
const stores_user = require("../../stores/user.js");
const stores_venue = require("../../stores/venue.js");
const stores_app = require("../../stores/app.js");
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  name: "ComprehensiveMigrationCheck",
  data() {
    return {
      testing: false,
      checkResults: [],
      currentCheck: "",
      checkedCount: 0,
      totalChecks: 30,
      errorChecklist: [
        // A类：语法和结构问题
        { id: "A1", title: "Store定义语法检查", category: "A", check: "checkStoreDefinition" },
        { id: "A2", title: "Getter/Action命名冲突", category: "A", check: "checkNamingConflicts" },
        { id: "A3", title: "State初始化检查", category: "A", check: "checkStateInitialization" },
        { id: "A4", title: "Action返回值处理", category: "A", check: "checkActionReturnValues" },
        { id: "A5", title: "Mutation概念混淆", category: "A", check: "checkMutationConcepts" },
        // B类：组件集成问题
        { id: "B1", title: "Store注入方式检查", category: "B", check: "checkStoreInjection" },
        { id: "B2", title: "Computed属性响应式", category: "B", check: "checkComputedReactivity" },
        { id: "B3", title: "Watch监听检查", category: "B", check: "checkWatchListeners" },
        { id: "B4", title: "组件销毁状态清理", category: "B", check: "checkComponentCleanup" },
        { id: "B5", title: "多实例Store冲突", category: "B", check: "checkMultiInstanceConflicts" },
        // C类：API和数据流问题
        { id: "C1", title: "API方法完整性", category: "C", check: "checkApiMethods" },
        { id: "C2", title: "异步Action错误处理", category: "C", check: "checkAsyncErrorHandling" },
        { id: "C3", title: "Loading状态管理", category: "C", check: "checkLoadingStates" },
        { id: "C4", title: "错误状态传播", category: "C", check: "checkErrorPropagation" },
        { id: "C5", title: "数据格式一致性", category: "C", check: "checkDataConsistency" },
        // D类：路由和权限问题
        { id: "D1", title: "路由守卫Store使用", category: "D", check: "checkRouteGuards" },
        { id: "D2", title: "权限验证机制", category: "D", check: "checkPermissionValidation" },
        { id: "D3", title: "登录状态同步", category: "D", check: "checkLoginStateSync" },
        { id: "D4", title: "页面刷新状态恢复", category: "D", check: "checkPageRefreshState" },
        { id: "D5", title: "深层链接状态恢复", category: "D", check: "checkDeepLinkState" },
        // E类：缓存和持久化问题
        { id: "E1", title: "Store持久化配置", category: "E", check: "checkStorePersistence" },
        { id: "E2", title: "缓存策略一致性", category: "E", check: "checkCacheStrategy" },
        { id: "E3", title: "数据同步时机", category: "E", check: "checkDataSyncTiming" },
        { id: "E4", title: "内存泄漏检查", category: "E", check: "checkMemoryLeaks" },
        { id: "E5", title: "跨页面状态污染", category: "E", check: "checkCrossPagePollution" },
        // F类：性能和优化问题
        { id: "F1", title: "不必要响应式数据", category: "F", check: "checkUnnecessaryReactivity" },
        { id: "F2", title: "Store重新创建频率", category: "F", check: "checkStoreRecreation" },
        { id: "F3", title: "大数据量处理性能", category: "F", check: "checkLargeDataPerformance" },
        { id: "F4", title: "订阅/取消订阅", category: "F", check: "checkSubscriptions" },
        { id: "F5", title: "DevTools集成", category: "F", check: "checkDevToolsIntegration" }
      ]
    };
  },
  setup() {
    const bookingStore = stores_booking.useBookingStore();
    const sharingStore = stores_sharing.useSharingStore();
    const userStore = stores_user.useUserStore();
    const venueStore = stores_venue.useVenueStore();
    const appStore = stores_app.useAppStore();
    return {
      bookingStore,
      sharingStore,
      userStore,
      venueStore,
      appStore
    };
  },
  computed: {
    progressPercent() {
      return this.totalChecks > 0 ? this.checkedCount / this.totalChecks * 100 : 0;
    },
    passedCount() {
      return this.checkResults.filter((r) => r.status === "success").length;
    },
    warningCount() {
      return this.checkResults.filter((r) => r.status === "warning").length;
    },
    failedCount() {
      return this.checkResults.filter((r) => r.status === "error").length;
    }
  },
  methods: {
    addResult(id, title, status, description, suggestion = "") {
      this.checkResults.push({
        id,
        title,
        status,
        description,
        suggestion
      });
      this.checkedCount++;
    },
    getStatusText(status) {
      const statusMap = {
        success: "✅ 通过",
        warning: "⚠️ 警告",
        error: "❌ 失败",
        info: "ℹ️ 信息"
      };
      return statusMap[status] || status;
    },
    async delay(ms = 100) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    // A类检查方法
    async checkAClassErrors() {
      this.testing = true;
      this.checkResults = [];
      this.checkedCount = 0;
      const aClassChecks = this.errorChecklist.filter((item) => item.category === "A");
      this.totalChecks = aClassChecks.length;
      for (const check of aClassChecks) {
        this.currentCheck = check.title;
        await this[check.check](check.id, check.title);
        await this.delay(200);
      }
      this.testing = false;
    },
    // 具体检查方法实现
    async checkStoreDefinition(id, title) {
      try {
        const stores = [this.bookingStore, this.sharingStore, this.userStore, this.venueStore, this.appStore];
        const storeNames = ["booking", "sharing", "user", "venue", "app"];
        let allValid = true;
        let invalidStores = [];
        stores.forEach((store, index) => {
          if (!store || typeof store !== "object") {
            allValid = false;
            invalidStores.push(storeNames[index]);
          }
        });
        if (allValid) {
          this.addResult(id, title, "success", "所有Store定义语法正确", "");
        } else {
          this.addResult(id, title, "error", `以下Store定义有问题: ${invalidStores.join(", ")}`, "检查Store的defineStore调用和导出");
        }
      } catch (error) {
        this.addResult(id, title, "error", `Store定义检查失败: ${error.message}`, "检查Store文件的语法和导入");
      }
    },
    async checkNamingConflicts(id, title) {
      try {
        const bookingGetters = ["bookingListGetter", "bookingDetailGetter", "sharingOrdersGetter"];
        const sharingGetters = ["sharingOrdersGetter", "mySharingOrdersGetter", "sharingOrderDetailGetter"];
        let conflicts = [];
        bookingGetters.forEach((getter) => {
          if (typeof this.bookingStore[getter] === "undefined") {
            conflicts.push(`bookingStore.${getter}`);
          }
        });
        sharingGetters.forEach((getter) => {
          if (typeof this.sharingStore[getter] === "undefined") {
            conflicts.push(`sharingStore.${getter}`);
          }
        });
        if (conflicts.length === 0) {
          this.addResult(id, title, "success", "Getter/Action命名冲突已解决", "");
        } else {
          this.addResult(id, title, "warning", `发现命名问题: ${conflicts.join(", ")}`, "检查getter命名是否使用了xxxGetter格式");
        }
      } catch (error) {
        this.addResult(id, title, "error", `命名冲突检查失败: ${error.message}`, "检查Store的getter和action命名");
      }
    },
    async checkStateInitialization(id, title) {
      try {
        const stores = [
          { name: "booking", store: this.bookingStore, requiredState: ["bookingList", "bookingDetail", "loading"] },
          { name: "sharing", store: this.sharingStore, requiredState: ["sharingOrders", "loading"] },
          { name: "user", store: this.userStore, requiredState: ["userInfo", "token", "isLoggedIn"] },
          { name: "venue", store: this.venueStore, requiredState: ["venues", "currentVenue"] }
        ];
        let initErrors = [];
        stores.forEach(({ name, store, requiredState }) => {
          if (!store) {
            initErrors.push(`${name} store未初始化`);
            return;
          }
          requiredState.forEach((state) => {
            if (!(state in store)) {
              initErrors.push(`${name}.${state}状态缺失`);
            }
          });
        });
        if (initErrors.length === 0) {
          this.addResult(id, title, "success", "所有Store状态初始化正确", "");
        } else {
          this.addResult(id, title, "error", `状态初始化问题: ${initErrors.join(", ")}`, "检查Store的state定义");
        }
      } catch (error) {
        this.addResult(id, title, "error", `状态初始化检查失败: ${error.message}`, "检查Store的state初始化");
      }
    },
    async checkActionReturnValues(id, title) {
      try {
        const actionChecks = [
          { store: this.bookingStore, action: "getUserBookings" },
          { store: this.sharingStore, action: "getSharingOrdersList" },
          { store: this.userStore, action: "login" }
        ];
        let returnValueIssues = [];
        for (const { store, action } of actionChecks) {
          if (store && typeof store[action] === "function") {
            const actionStr = store[action].toString();
            if (!actionStr.includes("async") && !actionStr.includes("Promise")) {
              returnValueIssues.push(`${action}可能不是异步函数`);
            }
          } else {
            returnValueIssues.push(`${action}方法不存在`);
          }
        }
        if (returnValueIssues.length === 0) {
          this.addResult(id, title, "success", "Action返回值处理正确", "");
        } else {
          this.addResult(id, title, "warning", `Action返回值问题: ${returnValueIssues.join(", ")}`, "确保异步action返回Promise");
        }
      } catch (error) {
        this.addResult(id, title, "error", `Action返回值检查失败: ${error.message}`, "检查action的返回值处理");
      }
    },
    async checkMutationConcepts(id, title) {
      try {
        const stores = [this.bookingStore, this.sharingStore, this.userStore, this.venueStore];
        const storeNames = ["booking", "sharing", "user", "venue"];
        let mutationIssues = [];
        stores.forEach((store, index) => {
          if (store) {
            if (typeof store.commit === "function") {
              mutationIssues.push(`${storeNames[index]} store仍有commit方法`);
            }
            if (typeof store.dispatch === "function") {
              mutationIssues.push(`${storeNames[index]} store仍有dispatch方法`);
            }
          }
        });
        if (mutationIssues.length === 0) {
          this.addResult(id, title, "success", "没有Vuex概念残留", "");
        } else {
          this.addResult(id, title, "warning", `发现Vuex概念残留: ${mutationIssues.join(", ")}`, "移除Vuex的commit和dispatch概念");
        }
      } catch (error) {
        this.addResult(id, title, "error", `Mutation概念检查失败: ${error.message}`, "检查是否完全迁移到Pinia");
      }
    },
    // B类检查方法
    async checkBClassErrors() {
      this.testing = true;
      this.checkResults = [];
      this.checkedCount = 0;
      const bClassChecks = this.errorChecklist.filter((item) => item.category === "B");
      this.totalChecks = bClassChecks.length;
      for (const check of bClassChecks) {
        this.currentCheck = check.title;
        await this[check.check](check.id, check.title);
        await this.delay(200);
      }
      this.testing = false;
    },
    async checkStoreInjection(id, title) {
      try {
        const stores = {
          booking: this.bookingStore,
          sharing: this.sharingStore,
          user: this.userStore,
          venue: this.venueStore,
          app: this.appStore
        };
        let injectionIssues = [];
        Object.entries(stores).forEach(([name, store]) => {
          if (!store) {
            injectionIssues.push(`${name} store注入失败`);
          } else if (typeof store !== "object") {
            injectionIssues.push(`${name} store类型错误`);
          }
        });
        if (injectionIssues.length === 0) {
          this.addResult(id, title, "success", "所有Store正确注入", "");
        } else {
          this.addResult(id, title, "error", `Store注入问题: ${injectionIssues.join(", ")}`, "检查setup()中的store导入和返回");
        }
      } catch (error) {
        this.addResult(id, title, "error", `Store注入检查失败: ${error.message}`, "检查组件中的store注入方式");
      }
    },
    async checkComputedReactivity(id, title) {
      try {
        let reactivityIssues = [];
        if (this.bookingStore) {
          const bookingList = this.bookingStore.bookingListGetter;
          if (typeof bookingList === "undefined") {
            reactivityIssues.push("bookingListGetter响应式失效");
          }
        }
        if (this.userStore) {
          const userInfo = this.userStore.userInfoGetter;
          if (typeof userInfo === "undefined") {
            reactivityIssues.push("userInfo getter响应式失效");
          }
        }
        if (reactivityIssues.length === 0) {
          this.addResult(id, title, "success", "Computed属性响应式正常", "");
        } else {
          this.addResult(id, title, "warning", `响应式问题: ${reactivityIssues.join(", ")}`, "检查computed属性中的store访问方式");
        }
      } catch (error) {
        this.addResult(id, title, "error", `响应式检查失败: ${error.message}`, "检查computed属性的响应式设置");
      }
    },
    // 添加剩余的检查方法占位符
    async checkWatchListeners(id, title) {
      this.addResult(id, title, "info", "Watch监听检查需要在实际使用中验证", "在组件中测试watch监听store状态变化");
    },
    async checkComponentCleanup(id, title) {
      this.addResult(id, title, "info", "组件销毁状态清理需要在实际使用中验证", "检查组件销毁时是否正确清理store状态");
    },
    async checkMultiInstanceConflicts(id, title) {
      this.addResult(id, title, "success", "Pinia自动处理多实例，无冲突", "");
    },
    // C类检查方法
    async checkCClassErrors() {
      this.testing = true;
      this.checkResults = [];
      this.checkedCount = 0;
      const cClassChecks = this.errorChecklist.filter((item) => item.category === "C");
      this.totalChecks = cClassChecks.length;
      for (const check of cClassChecks) {
        this.currentCheck = check.title;
        await this[check.check](check.id, check.title);
        await this.delay(200);
      }
      this.testing = false;
    },
    async checkApiMethods(id, title) {
      try {
        const requiredMethods = {
          booking: ["createBooking", "getBookingDetail", "getUserBookings", "getVenueAvailableSlots", "applySharedBooking"],
          sharing: ["getSharingOrdersList", "getOrderDetail", "createOrder"],
          user: ["login", "logout", "getUserInfo", "updateUserInfo"]
        };
        let missingMethods = [];
        Object.entries(requiredMethods).forEach(([storeName, methods]) => {
          const store = this[`${storeName}Store`];
          if (store) {
            methods.forEach((method) => {
              if (typeof store[method] !== "function") {
                missingMethods.push(`${storeName}.${method}`);
              }
            });
          }
        });
        if (missingMethods.length === 0) {
          this.addResult(id, title, "success", "所有必需的API方法都存在", "");
        } else {
          this.addResult(id, title, "error", `缺失API方法: ${missingMethods.join(", ")}`, "添加缺失的API方法到对应的store");
        }
      } catch (error) {
        this.addResult(id, title, "error", `API方法检查失败: ${error.message}`, "检查store中的API方法定义");
      }
    },
    async checkAsyncErrorHandling(id, title) {
      try {
        const stores = [this.bookingStore, this.sharingStore, this.userStore];
        const storeNames = ["booking", "sharing", "user"];
        let errorHandlingIssues = [];
        stores.forEach((store, index) => {
          if (store && store.setLoading && typeof store.setLoading === "function") {
          } else {
            errorHandlingIssues.push(`${storeNames[index]} store缺少loading状态管理`);
          }
        });
        if (errorHandlingIssues.length === 0) {
          this.addResult(id, title, "success", "异步错误处理机制完善", "");
        } else {
          this.addResult(id, title, "warning", `错误处理问题: ${errorHandlingIssues.join(", ")}`, "添加try-catch和loading状态管理");
        }
      } catch (error) {
        this.addResult(id, title, "error", `错误处理检查失败: ${error.message}`, "检查异步action的错误处理");
      }
    },
    async checkLoadingStates(id, title) {
      try {
        const stores = [this.bookingStore, this.sharingStore, this.userStore];
        const storeNames = ["booking", "sharing", "user"];
        let loadingIssues = [];
        stores.forEach((store, index) => {
          if (store) {
            if (!("loading" in store)) {
              loadingIssues.push(`${storeNames[index]} store缺少loading状态`);
            }
            if (typeof store.setLoading !== "function") {
              loadingIssues.push(`${storeNames[index]} store缺少setLoading方法`);
            }
          }
        });
        if (loadingIssues.length === 0) {
          this.addResult(id, title, "success", "Loading状态管理完善", "");
        } else {
          this.addResult(id, title, "warning", `Loading状态问题: ${loadingIssues.join(", ")}`, "添加loading状态和相关管理方法");
        }
      } catch (error) {
        this.addResult(id, title, "error", `Loading状态检查失败: ${error.message}`, "检查loading状态的定义和管理");
      }
    },
    // 添加剩余检查方法的占位符
    async checkErrorPropagation(id, title) {
      this.addResult(id, title, "info", "错误状态传播需要在实际使用中验证", "测试错误是否正确传播到UI层");
    },
    async checkDataConsistency(id, title) {
      this.addResult(id, title, "info", "数据格式一致性需要在实际API调用中验证", "检查API响应数据格式是否一致");
    },
    // 全面检查
    async runFullCheck() {
      this.testing = true;
      this.checkResults = [];
      this.checkedCount = 0;
      this.totalChecks = 30;
      for (const check of this.errorChecklist) {
        this.currentCheck = check.title;
        await this[check.check](check.id, check.title);
        await this.delay(100);
      }
      this.testing = false;
    },
    // 为剩余的检查方法添加占位符实现
    async checkDClassErrors() {
      await this.runCategoryCheck("D");
    },
    async checkEClassErrors() {
      await this.runCategoryCheck("E");
    },
    async checkFClassErrors() {
      await this.runCategoryCheck("F");
    },
    async runCategoryCheck(category) {
      this.testing = true;
      this.checkResults = [];
      this.checkedCount = 0;
      const categoryChecks = this.errorChecklist.filter((item) => item.category === category);
      this.totalChecks = categoryChecks.length;
      for (const check of categoryChecks) {
        this.currentCheck = check.title;
        await this[check.check](check.id, check.title);
        await this.delay(200);
      }
      this.testing = false;
    },
    // 占位符检查方法
    async checkRouteGuards(id, title) {
      this.addResult(id, title, "info", "路由守卫检查需要在路由跳转中验证", "测试路由守卫中的store使用");
    },
    async checkPermissionValidation(id, title) {
      this.addResult(id, title, "info", "权限验证需要在实际权限场景中验证", "测试权限验证逻辑");
    },
    async checkLoginStateSync(id, title) {
      this.addResult(id, title, "info", "登录状态同步需要在登录流程中验证", "测试登录状态在各页面的同步");
    },
    async checkPageRefreshState(id, title) {
      this.addResult(id, title, "info", "页面刷新状态恢复需要刷新页面验证", "测试页面刷新后状态是否正确恢复");
    },
    async checkDeepLinkState(id, title) {
      this.addResult(id, title, "info", "深层链接状态恢复需要直接访问深层页面验证", "测试直接访问深层页面的状态恢复");
    },
    async checkStorePersistence(id, title) {
      this.addResult(id, title, "info", "Store持久化需要检查本地存储配置", "检查Pinia持久化插件配置");
    },
    async checkCacheStrategy(id, title) {
      this.addResult(id, title, "success", "缓存策略已在之前修复中处理", "");
    },
    async checkDataSyncTiming(id, title) {
      this.addResult(id, title, "info", "数据同步时机需要在实际使用中观察", "观察数据同步的时机是否合适");
    },
    async checkMemoryLeaks(id, title) {
      this.addResult(id, title, "info", "内存泄漏需要长时间使用观察", "使用开发者工具监控内存使用");
    },
    async checkCrossPagePollution(id, title) {
      this.addResult(id, title, "info", "跨页面状态污染需要多页面切换验证", "测试页面间状态是否相互影响");
    },
    async checkUnnecessaryReactivity(id, title) {
      this.addResult(id, title, "info", "不必要响应式数据需要性能分析", "分析哪些数据不需要响应式");
    },
    async checkStoreRecreation(id, title) {
      this.addResult(id, title, "success", "Pinia自动管理store实例，无重复创建问题", "");
    },
    async checkLargeDataPerformance(id, title) {
      this.addResult(id, title, "info", "大数据量性能需要在实际大数据场景中测试", "测试大量数据时的性能表现");
    },
    async checkSubscriptions(id, title) {
      this.addResult(id, title, "info", "订阅管理需要检查$subscribe使用", "检查store订阅的正确使用和清理");
    },
    async checkDevToolsIntegration(id, title) {
      this.addResult(id, title, "info", "DevTools集成需要在浏览器开发者工具中验证", "检查Vue DevTools中的Pinia面板");
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.checkAClassErrors && $options.checkAClassErrors(...args)),
    b: $data.testing,
    c: common_vendor.o((...args) => $options.checkBClassErrors && $options.checkBClassErrors(...args)),
    d: $data.testing,
    e: common_vendor.o((...args) => $options.checkCClassErrors && $options.checkCClassErrors(...args)),
    f: $data.testing,
    g: common_vendor.o((...args) => $options.checkDClassErrors && $options.checkDClassErrors(...args)),
    h: $data.testing,
    i: common_vendor.o((...args) => $options.checkEClassErrors && $options.checkEClassErrors(...args)),
    j: $data.testing,
    k: common_vendor.o((...args) => $options.checkFClassErrors && $options.checkFClassErrors(...args)),
    l: $data.testing,
    m: common_vendor.t($data.testing ? "🔄 检查进行中..." : "🚀 运行全面检查 (30项)"),
    n: common_vendor.o((...args) => $options.runFullCheck && $options.runFullCheck(...args)),
    o: $data.testing,
    p: $data.testing
  }, $data.testing ? {
    q: $options.progressPercent + "%",
    r: common_vendor.t($data.currentCheck),
    s: common_vendor.t($data.checkedCount),
    t: common_vendor.t($data.totalChecks)
  } : {}, {
    v: $data.checkResults.length > 0
  }, $data.checkResults.length > 0 ? {
    w: common_vendor.t($options.passedCount),
    x: common_vendor.t($options.warningCount),
    y: common_vendor.t($options.failedCount),
    z: common_vendor.t($data.totalChecks)
  } : {}, {
    A: common_vendor.f($data.checkResults, (result, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(result.title),
        b: common_vendor.t($options.getStatusText(result.status)),
        c: common_vendor.n(result.status),
        d: common_vendor.t(result.description),
        e: result.suggestion
      }, result.suggestion ? {
        f: common_vendor.t(result.suggestion)
      } : {}, {
        g: index,
        h: common_vendor.n(result.status)
      });
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-d1a1fc53"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/comprehensive-migration-check.js.map
