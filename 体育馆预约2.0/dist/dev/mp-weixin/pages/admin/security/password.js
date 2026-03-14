"use strict";
const common_vendor = require("../../../common/vendor.js");
const stores_user = require("../../../stores/user.js");
const stores_adminSecurity = require("../../../stores/admin-security.js");
const NavBar = () => "../../../components/NavBar.js";
const AdminTabBar = () => "../../../components/admin/AdminTabBar.js";
const _sfc_main = {
  components: { NavBar, AdminTabBar },
  data() {
    return {
      navBarHeight: 0,
      securityStore: null,
      userStore: null,
      form: {
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
      }
    };
  },
  computed: {
    submitting() {
      var _a;
      return (_a = this.securityStore) == null ? void 0 : _a.submitting;
    },
    nickname() {
      var _a, _b;
      return ((_a = this.userStore) == null ? void 0 : _a.nickname) || ((_b = this.userStore) == null ? void 0 : _b.username) || "管理员";
    }
  },
  onLoad() {
    this.securityStore = stores_adminSecurity.useAdminSecurityStore();
    this.userStore = stores_user.useUserStore();
    this.calcNavBarHeight();
  },
  methods: {
    calcNavBarHeight() {
      const sys = common_vendor.index.getSystemInfoSync();
      this.navBarHeight = (sys.statusBarHeight || 0) + 44;
    },
    validate() {
      if (!this.form.oldPassword) {
        common_vendor.index.showToast({ title: "请输入旧密码", icon: "none" });
        return false;
      }
      if (!this.form.newPassword || this.form.newPassword.length < 6) {
        common_vendor.index.showToast({ title: "新密码至少6位", icon: "none" });
        return false;
      }
      if (this.form.newPassword !== this.form.confirmPassword) {
        common_vendor.index.showToast({ title: "两次密码输入不一致", icon: "none" });
        return false;
      }
      if (this.form.oldPassword === this.form.newPassword) {
        common_vendor.index.showToast({ title: "新密码不能与旧密码相同", icon: "none" });
        return false;
      }
      return true;
    },
    async handleChangePassword() {
      if (this.submitting || !this.validate())
        return;
      try {
        await this.securityStore.changePassword(this.form.oldPassword, this.form.newPassword);
        common_vendor.index.showToast({ title: "密码修改成功，请重新登录", icon: "success" });
        this.form = { oldPassword: "", newPassword: "", confirmPassword: "" };
        setTimeout(() => {
          this.userStore.clearUserData();
          common_vendor.index.reLaunch({ url: "/pages/user/login" });
        }, 1500);
      } catch (e) {
        common_vendor.index.showToast({ title: e.message || "密码修改失败", icon: "none" });
      }
    },
    handleLogout() {
      common_vendor.index.showModal({
        title: "确认退出",
        content: "确定要退出登录吗？",
        success: async (res) => {
          if (!res.confirm)
            return;
          try {
            await this.userStore.logout();
          } catch {
            this.userStore.clearUserData();
            common_vendor.index.reLaunch({ url: "/pages/user/login" });
          }
        }
      });
    }
  }
};
if (!Array) {
  const _component_NavBar = common_vendor.resolveComponent("NavBar");
  const _component_AdminTabBar = common_vendor.resolveComponent("AdminTabBar");
  (_component_NavBar + _component_AdminTabBar)();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.p({
      title: "账号与安全",
      showBack: false,
      backgroundColor: "#ff6b35",
      titleColor: "#ffffff",
      showBorder: false
    }),
    b: common_vendor.t($options.nickname),
    c: $data.form.oldPassword,
    d: common_vendor.o(($event) => $data.form.oldPassword = $event.detail.value),
    e: $data.form.newPassword,
    f: common_vendor.o(($event) => $data.form.newPassword = $event.detail.value),
    g: $data.form.confirmPassword,
    h: common_vendor.o(($event) => $data.form.confirmPassword = $event.detail.value),
    i: common_vendor.t($options.submitting ? "提交中..." : "确认修改"),
    j: $options.submitting ? 1 : "",
    k: common_vendor.o((...args) => $options.handleChangePassword && $options.handleChangePassword(...args)),
    l: common_vendor.o((...args) => $options.handleLogout && $options.handleLogout(...args)),
    m: $data.navBarHeight + "px",
    n: common_vendor.p({
      current: "security"
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-406dad52"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/admin/security/password.js.map
