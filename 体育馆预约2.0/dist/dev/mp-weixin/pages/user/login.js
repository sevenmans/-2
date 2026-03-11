"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_user = require("../../stores/user.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  name: "UserLogin",
  data() {
    return {
      userStore: null,
      loginType: "password",
      // 'password' | 'sms'
      showPassword: false,
      smsCountdown: 0,
      smsTimer: null,
      showAccountLogin: false,
      formData: {
        phone: "13402838501",
        // 默认手机号
        password: "yangyu123..",
        // 默认密码
        smsCode: ""
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
      if (this.loginType === "password") {
        return this.canSendSms && this.formData.password.length >= 6;
      } else {
        return this.canSendSms && this.formData.smsCode.length === 6;
      }
    }
  },
  onLoad(options) {
    this.userStore = stores_user.useUserStore();
    if (options.redirect) {
      this.redirectUrl = decodeURIComponent(options.redirect);
    }
  },
  onUnload() {
    if (this.smsTimer) {
      clearInterval(this.smsTimer);
    }
  },
  methods: {
    // 切换登录方式
    switchLoginType(type) {
      this.loginType = type;
      this.formData.password = "";
      this.formData.smsCode = "";
    },
    // 切换密码显示
    togglePassword() {
      this.showPassword = !this.showPassword;
    },
    toggleAccountLogin() {
      this.showAccountLogin = !this.showAccountLogin;
    },
    // 发送短信验证码
    async sendSmsCode() {
      if (!this.canSendSms || this.smsCountdown > 0)
        return;
      try {
        await this.userStore.getSmsCode({
          phone: this.formData.phone,
          type: "login"
        });
        common_vendor.index.showToast({
          title: "验证码已发送",
          icon: "success"
        });
        this.startCountdown();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/user/login.vue:219", "发送验证码失败:", error);
        common_vendor.index.showToast({
          title: error.message || "发送失败",
          icon: "error"
        });
      }
    },
    // 开始倒计时
    startCountdown() {
      this.smsCountdown = 60;
      this.smsTimer = setInterval(() => {
        this.smsCountdown--;
        if (this.smsCountdown <= 0) {
          clearInterval(this.smsTimer);
          this.smsTimer = null;
        }
      }, 1e3);
    },
    // 处理登录
    async handleLogin() {
      if (!this.canLogin)
        return;
      if (!this.validatePhone())
        return;
      try {
        let result;
        if (this.loginType === "password") {
          result = await this.userStore.login({
            username: this.formData.phone,
            password: this.formData.password
          });
        } else {
          result = await this.userStore.smsLogin({
            phone: this.formData.phone,
            smsCode: this.formData.smsCode
          });
        }
        common_vendor.index.showToast({
          title: "登录成功",
          icon: "success"
        });
        setTimeout(() => {
          this.handleLoginSuccess();
        }, 1500);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/user/login.vue:275", "登录失败:", error);
        let errorMessage = "登录失败";
        if (error.message) {
          if (error.message.includes("用户名或密码错误") || error.message.includes("账号或密码错误")) {
            errorMessage = "账号或密码错误，请重新输入";
          } else if (error.message.includes("用户不存在")) {
            errorMessage = "账号不存在，请先注册";
          } else if (error.message.includes("密码错误")) {
            errorMessage = "密码错误，请重新输入";
          } else if (error.message.includes("验证码错误") || error.message.includes("验证码不正确")) {
            errorMessage = "验证码错误，请重新输入";
          } else if (error.message.includes("验证码已过期")) {
            errorMessage = "验证码已过期，请重新获取";
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
    // 处理登录成功
    handleLoginSuccess() {
      this.userStore.setLoginStatus(true);
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
              fail: (err) => {
                common_vendor.index.__f__("error", "at pages/user/login.vue:330", "[Login] switchTab失败:", err);
                common_vendor.index.switchTab({ url: "/pages/index/index" });
              }
            });
          } else {
            common_vendor.index.redirectTo({
              url: decodedUrl,
              fail: (err) => {
                common_vendor.index.__f__("error", "at pages/user/login.vue:339", "[Login] redirectTo失败:", err);
                common_vendor.index.switchTab({ url: "/pages/index/index" });
              }
            });
          }
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/user/login.vue:346", "[Login] 处理重定向URL失败:", error);
          common_vendor.index.switchTab({ url: "/pages/index/index" });
        }
      } else {
        common_vendor.index.switchTab({
          url: "/pages/index/index",
          fail: (err) => {
            common_vendor.index.__f__("error", "at pages/user/login.vue:355", "[Login] 跳转首页失败:", err);
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
    // 跳转到注册页
    navigateToRegister() {
      common_vendor.index.navigateTo({
        url: "/pages/user/register"
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
  }, $data.showAccountLogin ? common_vendor.e({
    f: $data.loginType === "password" ? 1 : "",
    g: common_vendor.o(($event) => $options.switchLoginType("password")),
    h: $data.loginType === "sms" ? 1 : "",
    i: common_vendor.o(($event) => $options.switchLoginType("sms")),
    j: $data.formData.phone,
    k: common_vendor.o(($event) => $data.formData.phone = $event.detail.value),
    l: $data.loginType === "password"
  }, $data.loginType === "password" ? {
    m: !$data.showPassword,
    n: $data.formData.password,
    o: common_vendor.o(($event) => $data.formData.password = $event.detail.value),
    p: common_vendor.t($data.showPassword ? "🙈" : "👁️"),
    q: common_vendor.o((...args) => $options.togglePassword && $options.togglePassword(...args))
  } : {}, {
    r: $data.loginType === "sms"
  }, $data.loginType === "sms" ? {
    s: $data.formData.smsCode,
    t: common_vendor.o(($event) => $data.formData.smsCode = $event.detail.value),
    v: common_vendor.t($data.smsCountdown > 0 ? `${$data.smsCountdown}s` : "获取验证码"),
    w: !$options.canSendSms || $data.smsCountdown > 0,
    x: common_vendor.o((...args) => $options.sendSmsCode && $options.sendSmsCode(...args))
  } : {}, {
    y: !$options.canLogin,
    z: common_vendor.o((...args) => $options.handleLogin && $options.handleLogin(...args)),
    A: $data.loginType === "password"
  }, $data.loginType === "password" ? {
    B: common_vendor.o((...args) => $options.navigateToReset && $options.navigateToReset(...args))
  } : {}) : {}, {
    C: $data.showAccountLogin
  }, $data.showAccountLogin ? {
    D: common_vendor.o((...args) => $options.navigateToRegister && $options.navigateToRegister(...args))
  } : {}, {
    E: common_vendor.o((...args) => $options.showUserAgreement && $options.showUserAgreement(...args)),
    F: common_vendor.o((...args) => $options.showPrivacyPolicy && $options.showPrivacyPolicy(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-ebed24a8"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/user/login.js.map
