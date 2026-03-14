"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_user = require("../../stores/user.js");
const utils_routerGuard = require("../../utils/router-guard.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  name: "UserLogin",
  data() {
    return {
      userStore: null,
      showPassword: false,
      showAccountLogin: false,
      formData: {
        phone: "13402838501",
        password: "yangyu123.."
      }
    };
  },
  computed: {
    loading() {
      var _a;
      return ((_a = this.userStore) == null ? void 0 : _a.loading) || false;
    },
    // 是否可以发送短信
    canSendSms() {
      return this.formData.phone.length === 11 && /^1[3-9]\d{9}$/.test(this.formData.phone);
    },
    // 是否可以登录
    canLogin() {
      return this.canSendSms && this.formData.password.length >= 6;
    }
  },
  onLoad(options) {
    this.userStore = stores_user.useUserStore();
    if (options.redirect) {
      this.redirectUrl = decodeURIComponent(options.redirect);
    }
  },
  onUnload() {
  },
  methods: {
    // 切换密码显示
    togglePassword() {
      this.showPassword = !this.showPassword;
    },
    toggleAccountLogin() {
      this.showAccountLogin = !this.showAccountLogin;
    },
    // 处理登录
    async handleLogin() {
      if (!this.canLogin)
        return;
      if (!this.validatePhone())
        return;
      try {
        await this.userStore.login({
          username: this.formData.phone,
          password: this.formData.password
        });
        common_vendor.index.showToast({
          title: "登录成功",
          icon: "success"
        });
        setTimeout(() => {
          this.handleLoginSuccess();
        }, 1500);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/user/login.vue:162", "登录失败:", error);
        let errorMessage = "登录失败";
        if (error.message) {
          if (error.message.includes("用户名或密码错误") || error.message.includes("账号或密码错误")) {
            errorMessage = "账号或密码错误，请重新输入";
          } else if (error.message.includes("用户不存在")) {
            errorMessage = "账号不存在，请使用微信登录";
          } else if (error.message.includes("密码错误")) {
            errorMessage = "密码错误，请重新输入";
          } else if (error.message.includes("网络")) {
            errorMessage = "网络连接失败，请检查网络";
          } else {
            errorMessage = error.message;
          }
        }
        common_vendor.index.showToast({
          title: errorMessage,
          icon: "error",
          duration: 3e3
        });
      }
    },
    handleLoginSuccess() {
      this.userStore.setLoginStatus(true);
      const userInfo = this.userStore.userInfo;
      if (utils_routerGuard.isAdmin(userInfo)) {
        common_vendor.index.reLaunch({ url: "/pages/admin/dashboard" });
        return;
      }
      if (this.redirectUrl) {
        try {
          const decodedUrl = decodeURIComponent(this.redirectUrl);
          const tabBarPages = [
            "/pages/index/index",
            "/pages/venue/list",
            "/pages/sharing/list",
            "/pages/booking/list",
            "/pages/user/profile"
          ];
          const pagePath = decodedUrl.split("?")[0];
          const isTabBarPage = tabBarPages.includes(pagePath);
          if (isTabBarPage) {
            common_vendor.index.switchTab({
              url: pagePath,
              fail: () => {
                common_vendor.index.switchTab({ url: "/pages/index/index" });
              }
            });
          } else {
            common_vendor.index.redirectTo({
              url: decodedUrl,
              fail: () => {
                common_vendor.index.switchTab({ url: "/pages/index/index" });
              }
            });
          }
        } catch (error) {
          common_vendor.index.switchTab({ url: "/pages/index/index" });
        }
      } else {
        common_vendor.index.switchTab({
          url: "/pages/index/index",
          fail: () => {
          }
        });
      }
    },
    // 验证手机号
    validatePhone() {
      if (!this.formData.phone) {
        common_vendor.index.showToast({
          title: "请输入手机号",
          icon: "error"
        });
        return false;
      }
      if (!/^1[3-9]\d{9}$/.test(this.formData.phone)) {
        common_vendor.index.showToast({
          title: "手机号格式不正确",
          icon: "error"
        });
        return false;
      }
      return true;
    },
    // 微信登录
    async wechatLogin() {
      try {
        await this.userStore.loginByWechat();
        common_vendor.index.showToast({
          title: "登录成功",
          icon: "success"
        });
        setTimeout(() => {
          this.handleLoginSuccess();
        }, 1200);
      } catch (error) {
        common_vendor.index.showToast({
          title: error.message || "微信登录失败",
          icon: "none"
        });
      }
    },
    // Apple登录
    appleLogin() {
      common_vendor.index.showToast({
        title: "功能开发中",
        icon: "none"
      });
    },
    // 跳转到重置密码页
    navigateToReset() {
      common_vendor.index.navigateTo({
        url: "/pages/user/reset-password"
      });
    },
    // 显示用户协议
    showUserAgreement() {
      common_vendor.index.navigateTo({
        url: "/pages/user/agreement?type=user"
      });
    },
    // 显示隐私政策
    showPrivacyPolicy() {
      common_vendor.index.navigateTo({
        url: "/pages/user/agreement?type=privacy"
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_assets._imports_0,
    b: common_vendor.o((...args) => $options.wechatLogin && $options.wechatLogin(...args)),
    c: common_vendor.t($data.showAccountLogin ? "收起其他登录方式" : "使用手机号/账号登录"),
    d: common_vendor.o((...args) => $options.toggleAccountLogin && $options.toggleAccountLogin(...args)),
    e: $data.showAccountLogin
  }, $data.showAccountLogin ? {
    f: $data.formData.phone,
    g: common_vendor.o(($event) => $data.formData.phone = $event.detail.value),
    h: !$data.showPassword,
    i: $data.formData.password,
    j: common_vendor.o(($event) => $data.formData.password = $event.detail.value),
    k: common_vendor.t($data.showPassword ? "🙈" : "👁️"),
    l: common_vendor.o((...args) => $options.togglePassword && $options.togglePassword(...args)),
    m: !$options.canLogin,
    n: common_vendor.o((...args) => $options.handleLogin && $options.handleLogin(...args)),
    o: common_vendor.o((...args) => $options.navigateToReset && $options.navigateToReset(...args))
  } : {}, {
    p: common_vendor.o((...args) => $options.showUserAgreement && $options.showUserAgreement(...args)),
    q: common_vendor.o((...args) => $options.showPrivacyPolicy && $options.showPrivacyPolicy(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-ebed24a8"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/user/login.js.map
