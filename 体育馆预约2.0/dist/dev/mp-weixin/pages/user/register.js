"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_user = require("../../stores/user.js");
const _sfc_main = {
  name: "UserRegister",
  data() {
    return {
      userStore: null,
      showPassword: false,
      showConfirmPassword: false,
      smsCountdown: 0,
      smsTimer: null,
      agreedToTerms: false,
      formData: {
        phone: "",
        smsCode: "",
        password: "",
        confirmPassword: "",
        nickname: "",
        inviteCode: ""
      }
    };
  },
  computed: {
    loading() {
      var _a;
      return ((_a = this.userStore) == null ? void 0 : _a.isLoading) || false;
    },
    // 是否可以发送短信
    canSendSms() {
      return this.formData.phone.length === 11 && /^1[3-9]\d{9}$/.test(this.formData.phone);
    },
    // 密码验证
    passwordValidation() {
      const password = this.formData.password;
      return {
        length: password.length >= 6 && password.length <= 20,
        hasLetter: /[a-zA-Z]/.test(password),
        hasNumber: /\d/.test(password)
      };
    },
    // 密码是否有效
    isPasswordValid() {
      return this.passwordValidation.length && this.passwordValidation.hasLetter && this.passwordValidation.hasNumber;
    },
    // 密码是否匹配
    passwordMatch() {
      return this.formData.password === this.formData.confirmPassword;
    },
    // 是否可以注册
    canRegister() {
      return this.canSendSms && this.formData.smsCode.length === 6 && this.isPasswordValid && this.passwordMatch && this.agreedToTerms;
    }
  },
  onUnload() {
    if (this.smsTimer) {
      clearInterval(this.smsTimer);
    }
  },
  onLoad() {
    this.userStore = stores_user.useUserStore();
  },
  methods: {
    // 切换密码显示
    togglePassword() {
      this.showPassword = !this.showPassword;
    },
    // 切换确认密码显示
    toggleConfirmPassword() {
      this.showConfirmPassword = !this.showConfirmPassword;
    },
    // 切换协议同意状态
    toggleAgreement() {
      this.agreedToTerms = !this.agreedToTerms;
    },
    // 发送短信验证码
    async sendSmsCode() {
      if (!this.canSendSms || this.smsCountdown > 0)
        return;
      try {
        common_vendor.index.showLoading({ title: "发送中..." });
        await this.userStore.getSmsCode({
          phone: this.formData.phone,
          type: "register"
        });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "验证码已发送",
          icon: "success"
        });
        this.startCountdown();
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/user/register.vue:279", "发送验证码失败:", error);
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
    // 处理注册
    async handleRegister() {
      if (!this.canRegister)
        return;
      if (!this.validateForm())
        return;
      try {
        await this.userStore.register({
          username: this.formData.phone,
          // 使用手机号作为用户名
          phone: this.formData.phone,
          code: this.formData.smsCode,
          // 后端期望的字段名是code
          password: this.formData.password,
          nickname: this.formData.nickname || this.formData.phone,
          // 如果没有昵称，使用手机号
          inviteCode: this.formData.inviteCode || void 0
        });
        common_vendor.index.showToast({
          title: "注册成功",
          icon: "success"
        });
        setTimeout(() => {
          common_vendor.index.redirectTo({
            url: "/pages/user/login"
          });
        }, 1500);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/user/register.vue:329", "注册失败:", error);
      }
    },
    // 验证表单
    validateForm() {
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
      if (!this.formData.smsCode) {
        common_vendor.index.showToast({
          title: "请输入验证码",
          icon: "error"
        });
        return false;
      }
      if (this.formData.smsCode.length !== 6) {
        common_vendor.index.showToast({
          title: "验证码格式不正确",
          icon: "error"
        });
        return false;
      }
      if (!this.formData.password) {
        common_vendor.index.showToast({
          title: "请设置密码",
          icon: "error"
        });
        return false;
      }
      if (!this.isPasswordValid) {
        common_vendor.index.showToast({
          title: "密码格式不符合要求",
          icon: "error"
        });
        return false;
      }
      if (!this.passwordMatch) {
        common_vendor.index.showToast({
          title: "两次输入的密码不一致",
          icon: "error"
        });
        return false;
      }
      if (!this.agreedToTerms) {
        common_vendor.index.showToast({
          title: "请同意用户协议和隐私政策",
          icon: "error"
        });
        return false;
      }
      return true;
    },
    // 跳转到登录页
    navigateToLogin() {
      common_vendor.index.navigateBack();
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
    a: $data.formData.phone,
    b: common_vendor.o(($event) => $data.formData.phone = $event.detail.value),
    c: $data.formData.smsCode,
    d: common_vendor.o(($event) => $data.formData.smsCode = $event.detail.value),
    e: common_vendor.t($data.smsCountdown > 0 ? `${$data.smsCountdown}s` : "获取验证码"),
    f: !$options.canSendSms || $data.smsCountdown > 0,
    g: common_vendor.o((...args) => $options.sendSmsCode && $options.sendSmsCode(...args)),
    h: !$data.showPassword,
    i: $data.formData.password,
    j: common_vendor.o(($event) => $data.formData.password = $event.detail.value),
    k: common_vendor.t($data.showPassword ? "🙈" : "👁️"),
    l: common_vendor.o((...args) => $options.togglePassword && $options.togglePassword(...args)),
    m: $options.passwordValidation.length ? 1 : "",
    n: $options.passwordValidation.hasLetter ? 1 : "",
    o: $options.passwordValidation.hasNumber ? 1 : "",
    p: !$data.showConfirmPassword,
    q: $data.formData.confirmPassword,
    r: common_vendor.o(($event) => $data.formData.confirmPassword = $event.detail.value),
    s: common_vendor.t($data.showConfirmPassword ? "🙈" : "👁️"),
    t: common_vendor.o((...args) => $options.toggleConfirmPassword && $options.toggleConfirmPassword(...args)),
    v: $data.formData.confirmPassword && !$options.passwordMatch
  }, $data.formData.confirmPassword && !$options.passwordMatch ? {} : {}, {
    w: $data.formData.nickname,
    x: common_vendor.o(($event) => $data.formData.nickname = $event.detail.value),
    y: $data.formData.inviteCode,
    z: common_vendor.o(($event) => $data.formData.inviteCode = $event.detail.value),
    A: $data.agreedToTerms
  }, $data.agreedToTerms ? {} : {}, {
    B: $data.agreedToTerms ? 1 : "",
    C: common_vendor.o((...args) => $options.showUserAgreement && $options.showUserAgreement(...args)),
    D: common_vendor.o((...args) => $options.showPrivacyPolicy && $options.showPrivacyPolicy(...args)),
    E: common_vendor.o((...args) => $options.toggleAgreement && $options.toggleAgreement(...args)),
    F: !$options.canRegister,
    G: common_vendor.o((...args) => $options.handleRegister && $options.handleRegister(...args)),
    H: common_vendor.o((...args) => $options.navigateToLogin && $options.navigateToLogin(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-239527a3"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/user/register.js.map
