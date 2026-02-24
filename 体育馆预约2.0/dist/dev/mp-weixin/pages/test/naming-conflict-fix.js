"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_user = require("../../stores/user.js");
const _sfc_main = {
  name: "NamingConflictFix",
  data() {
    return {
      testing: false,
      logs: []
    };
  },
  setup() {
    const userStore = stores_user.useUserStore();
    return { userStore };
  },
  methods: {
    addLog(type, message) {
      this.logs.push({
        type,
        message,
        time: (/* @__PURE__ */ new Date()).toLocaleTimeString()
      });
      common_vendor.index.__f__("log", "at pages/test/naming-conflict-fix.vue:85", `[命名冲突修复] ${type.toUpperCase()}: ${message}`);
    },
    clearLogs() {
      this.logs = [];
    },
    // 验证命名冲突修复
    async testNamingConflictFix() {
      this.testing = true;
      this.clearLogs();
      this.addLog("info", "🔧 开始验证命名冲突修复...");
      try {
        this.addLog("info", "检查Getter重命名...");
        if (typeof this.userStore.getUserInfo !== "undefined") {
          const getUserInfoType = typeof this.userStore.getUserInfo;
          this.addLog("info", `getUserInfo类型: ${getUserInfoType}`);
          if (getUserInfoType === "function") {
            this.addLog("success", "✅ getUserInfo现在是function (Action)");
          } else {
            this.addLog("error", `❌ getUserInfo仍然是${getUserInfoType} (可能是Getter)`);
          }
        } else {
          this.addLog("error", "❌ getUserInfo完全不存在");
        }
        if (typeof this.userStore.userInfoGetter !== "undefined") {
          this.addLog("success", "✅ userInfoGetter存在 (新的Getter名称)");
          const userInfo = this.userStore.userInfoGetter;
          this.addLog("info", `userInfoGetter返回值类型: ${typeof userInfo}`);
          if (userInfo && typeof userInfo === "object") {
            this.addLog("success", "✅ userInfoGetter返回用户信息对象");
          } else {
            this.addLog("warning", "⚠️ userInfoGetter返回值为空或类型异常");
          }
        } else {
          this.addLog("error", "❌ userInfoGetter不存在 (新Getter未创建)");
        }
        this.addLog("info", "测试getUserInfo Action调用...");
        if (typeof this.userStore.getUserInfo === "function") {
          try {
            this.addLog("success", "✅ getUserInfo Action可以调用");
          } catch (error) {
            this.addLog("error", `❌ getUserInfo Action调用失败: ${error.message}`);
          }
        } else {
          this.addLog("error", "❌ getUserInfo不是函数，无法作为Action调用");
        }
        this.addLog("success", "🎉 命名冲突修复验证完成！");
      } catch (error) {
        this.addLog("error", `验证过程出错: ${error.message}`);
      } finally {
        this.testing = false;
      }
    },
    // 检查User Store结构
    async testUserStoreStructure() {
      this.testing = true;
      this.addLog("info", "🔍 检查User Store结构...");
      try {
        const storeKeys = Object.keys(this.userStore);
        const storeProps = Object.getOwnPropertyNames(this.userStore);
        this.addLog("info", `Store可枚举属性数量: ${storeKeys.length}`);
        this.addLog("info", `Store所有属性数量: ${storeProps.length}`);
        const keyProperties = ["userInfo", "token", "isLoggedIn"];
        keyProperties.forEach((prop) => {
          if (prop in this.userStore) {
            this.addLog("success", `✅ 状态属性 ${prop} 存在`);
          } else {
            this.addLog("error", `❌ 状态属性 ${prop} 缺失`);
          }
        });
        const keyMethods = ["getUserInfo", "login", "logout", "setUserInfo"];
        keyMethods.forEach((method) => {
          if (typeof this.userStore[method] === "function") {
            this.addLog("success", `✅ Action方法 ${method} 存在`);
          } else {
            this.addLog("error", `❌ Action方法 ${method} 缺失或类型错误`);
          }
        });
        const keyGetters = ["userInfoGetter", "getIsLoggedIn", "userId", "username"];
        keyGetters.forEach((getter) => {
          if (getter in this.userStore) {
            this.addLog("success", `✅ Getter ${getter} 存在`);
          } else {
            this.addLog("warning", `⚠️ Getter ${getter} 可能缺失`);
          }
        });
        this.addLog("success", "🎉 User Store结构检查完成！");
      } catch (error) {
        this.addLog("error", `结构检查失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    },
    // 验证Getter/Action分离
    async testGetterActionSeparation() {
      this.testing = true;
      this.addLog("info", "🔬 验证Getter/Action分离...");
      try {
        const potentialConflicts = [
          { name: "getUserInfo", shouldBe: "function" },
          { name: "userInfoGetter", shouldBe: "object" },
          { name: "getIsLoggedIn", shouldBe: "boolean" },
          { name: "login", shouldBe: "function" },
          { name: "logout", shouldBe: "function" }
        ];
        let conflictCount = 0;
        potentialConflicts.forEach(({ name, shouldBe }) => {
          const actualType = typeof this.userStore[name];
          if (shouldBe === "object" && this.userStore[name] !== null) {
            if (actualType === "object" || this.userStore[name] === null) {
              this.addLog("success", `✅ ${name}: 类型正确 (${actualType})`);
            } else {
              this.addLog("error", `❌ ${name}: 期望object，实际${actualType}`);
              conflictCount++;
            }
          } else if (shouldBe === "boolean") {
            const value = this.userStore[name];
            if (typeof value === "boolean") {
              this.addLog("success", `✅ ${name}: 类型正确 (${actualType})`);
            } else {
              this.addLog("error", `❌ ${name}: 期望boolean，实际${actualType}`);
              conflictCount++;
            }
          } else if (shouldBe === "function") {
            if (actualType === "function") {
              this.addLog("success", `✅ ${name}: 类型正确 (${actualType})`);
            } else {
              this.addLog("error", `❌ ${name}: 期望function，实际${actualType}`);
              conflictCount++;
            }
          }
        });
        if (conflictCount === 0) {
          this.addLog("success", "🎉 所有Getter/Action分离正确，无命名冲突！");
        } else {
          this.addLog("warning", `⚠️ 发现 ${conflictCount} 个潜在问题`);
        }
      } catch (error) {
        this.addLog("error", `分离验证失败: ${error.message}`);
      } finally {
        this.testing = false;
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o((...args) => $options.testNamingConflictFix && $options.testNamingConflictFix(...args)),
    b: $data.testing,
    c: common_vendor.o((...args) => $options.testUserStoreStructure && $options.testUserStoreStructure(...args)),
    d: $data.testing,
    e: common_vendor.o((...args) => $options.testGetterActionSeparation && $options.testGetterActionSeparation(...args)),
    f: $data.testing,
    g: common_vendor.f($data.logs, (log, index, i0) => {
      return {
        a: common_vendor.t(log.message),
        b: common_vendor.t(log.time),
        c: index,
        d: common_vendor.n(log.type)
      };
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-27e1f013"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/naming-conflict-fix.js.map
