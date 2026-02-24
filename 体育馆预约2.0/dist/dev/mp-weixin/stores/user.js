"use strict";
const common_vendor = require("../common/vendor.js");
const api_auth = require("../api/auth.js");
const api_user = require("../api/user.js");
const utils_auth = require("../utils/auth.js");
const utils_ui = require("../utils/ui.js");
const utils_routerGuardNew = require("../utils/router-guard-new.js");
const useUserStore = common_vendor.defineStore("user", {
  state: () => ({
    token: utils_auth.getToken(),
    userInfo: utils_auth.getUserInfo(),
    userStats: {
      totalBookings: 0,
      totalSharings: 0
    },
    isLoggedIn: !!(utils_auth.getToken() && utils_auth.getUserInfo()),
    loginChecking: false
    // 是否正在检查登录状态
  }),
  getters: {
    // Token相关
    getToken: (state) => state.token,
    // 用户信息相关
    userInfoGetter: (state) => state.userInfo,
    getIsLoggedIn: (state) => state.isLoggedIn,
    userId: (state) => {
      var _a;
      return (_a = state.userInfo) == null ? void 0 : _a.id;
    },
    username: (state) => {
      var _a;
      return (_a = state.userInfo) == null ? void 0 : _a.username;
    },
    nickname: (state) => {
      var _a, _b;
      return ((_a = state.userInfo) == null ? void 0 : _a.nickname) || ((_b = state.userInfo) == null ? void 0 : _b.username);
    },
    avatar: (state) => {
      var _a;
      return (_a = state.userInfo) == null ? void 0 : _a.avatar;
    },
    phone: (state) => {
      var _a;
      return (_a = state.userInfo) == null ? void 0 : _a.phone;
    },
    email: (state) => {
      var _a;
      return (_a = state.userInfo) == null ? void 0 : _a.email;
    },
    // 统计信息
    totalBookings: (state) => state.userStats.totalBookings,
    totalSharings: (state) => state.userStats.totalSharings,
    // 状态检查
    isLoginChecking: (state) => state.loginChecking
  },
  actions: {
    // 初始化用户状态（从本地存储恢复）
    initUserState() {
      const token = utils_auth.getToken();
      const userInfo = utils_auth.getUserInfo();
      if (token && userInfo) {
        this.token = token;
        this.userInfo = userInfo;
        this.isLoggedIn = true;
      } else {
        this.logout();
      }
    },
    // 设置token
    setToken(token) {
      this.token = token;
      utils_auth.setToken(token);
    },
    // 设置用户信息
    setUserInfo(userInfo) {
      this.userInfo = userInfo;
      utils_auth.setUserInfo(userInfo);
    },
    // 设置登录状态
    setLoginStatus(status) {
      this.isLoggedIn = status;
      utils_routerGuardNew.updateAuthCache(status);
    },
    // 设置登录检查状态
    setLoginChecking(checking) {
      this.loginChecking = checking;
    },
    // 设置用户统计
    setUserStats(stats) {
      this.userStats = stats;
    },
    // 清除用户数据
    clearUserData() {
      this.token = "";
      this.userInfo = null;
      this.userStats = {
        totalBookings: 0,
        totalSharings: 0
      };
      this.isLoggedIn = false;
      this.loginChecking = false;
      utils_auth.removeToken();
      utils_auth.removeUserInfo();
      utils_routerGuardNew.clearAuthCache();
    },
    // 用户登录
    async login(loginData) {
      try {
        const response = await api_auth.login(loginData);
        if (!response) {
          throw new Error("登录响应为空");
        }
        const responseData = response.data || response;
        const token = responseData.accessToken || responseData.token;
        if (!token) {
          common_vendor.index.__f__("error", "at stores/user.js:115", "[UserStore] 响应数据:", responseData);
          throw new Error("未获取到登录令牌");
        }
        const user = {
          id: responseData.id,
          username: responseData.username,
          email: responseData.email,
          phone: responseData.phone,
          nickname: responseData.nickname,
          avatar: responseData.avatar,
          roles: responseData.roles
        };
        this.setToken(token);
        this.setUserInfo(user);
        this.setLoginStatus(true);
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/user.js:136", "[UserStore] 登录错误:", error);
        this.setLoginStatus(false);
        throw error;
      }
    },
    // 获取用户信息
    async getUserInfo() {
      var _a, _b;
      try {
        if (!this.token) {
          throw new Error("用户未登录");
        }
        const response = await api_user.userApi.getUserInfo();
        const userInfo = response.data || response;
        this.setUserInfo(userInfo);
        return userInfo;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/user.js:157", "[UserStore] 获取用户信息失败:", error);
        if (((_a = error.message) == null ? void 0 : _a.includes("401")) || ((_b = error.message) == null ? void 0 : _b.includes("未登录"))) {
          this.clearUserData();
        }
        throw error;
      }
    },
    // 更新用户信息
    async updateUserInfo(updateData) {
      try {
        const response = await api_user.userApi.updateUserInfo(updateData);
        const updatedUserInfo = response.data || response;
        this.setUserInfo(updatedUserInfo);
        utils_ui.showSuccess("用户信息更新成功");
        return updatedUserInfo;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/user.js:178", "[UserStore] 更新用户信息失败:", error);
        utils_ui.showError(error.message || "更新用户信息失败");
        throw error;
      }
    },
    // 用户注册
    async register(registerData) {
      try {
        const response = await api_auth.register(registerData);
        utils_ui.showSuccess("注册成功");
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/user.js:192", "[UserStore] 注册错误:", error);
        utils_ui.showError(error.message || "注册失败");
        throw error;
      }
    },
    // 用户退出
    async logout() {
      try {
        try {
          await api_auth.logout();
        } catch (error) {
        }
        this.clearUserData();
        utils_ui.showSuccess("退出成功");
        common_vendor.index.reLaunch({
          url: "/pages/user/login"
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/user.js:220", "[UserStore] 退出登录错误:", error);
        this.clearUserData();
        throw error;
      }
    },
    // 检查登录状态
    async checkLoginStatus() {
      if (this.loginChecking) {
        return this.isLoggedIn;
      }
      this.setLoginChecking(true);
      try {
        const token = utils_auth.getToken();
        const userInfo = utils_auth.getUserInfo();
        if (!token || !userInfo) {
          this.setLoginStatus(false);
          return false;
        }
        try {
          const response = await api_user.userApi.getCurrentUser();
          if (response && response.data) {
            this.setUserInfo(response.data);
          }
          this.setLoginStatus(true);
          return true;
        } catch (error) {
          common_vendor.index.__f__("error", "at stores/user.js:257", "[UserStore] Token验证失败:", error);
          this.clearUserData();
          return false;
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/user.js:264", "[UserStore] 检查登录状态错误:", error);
        this.setLoginStatus(false);
        return false;
      } finally {
        this.setLoginChecking(false);
      }
    },
    // 获取用户统计信息
    async getUserStats() {
      try {
        const response = await api_user.userApi.getUserStats();
        if (response && response.data) {
          this.setUserStats(response.data);
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/user.js:283", "[UserStore] 获取用户统计信息失败:", error);
        throw error;
      }
    },
    // 更新用户信息
    async updateProfile(profileData) {
      try {
        const response = await api_user.userApi.updateProfile(profileData);
        if (response && response.data) {
          this.setUserInfo({
            ...this.userInfo,
            ...response.data
          });
          utils_ui.showSuccess("信息更新成功");
        }
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/user.js:304", "[UserStore] 更新用户信息失败:", error);
        utils_ui.showError(error.message || "更新失败");
        throw error;
      }
    },
    // 修改密码
    async changePassword(passwordData) {
      try {
        const response = await api_user.userApi.changePassword(passwordData);
        utils_ui.showSuccess("密码修改成功");
        return response;
      } catch (error) {
        common_vendor.index.__f__("error", "at stores/user.js:319", "[UserStore] 修改密码失败:", error);
        utils_ui.showError(error.message || "密码修改失败");
        throw error;
      }
    }
  }
});
exports.useUserStore = useUserStore;
//# sourceMappingURL=../../.sourcemap/mp-weixin/stores/user.js.map
