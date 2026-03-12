"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_user = require("../../stores/user.js");
const _sfc_main = {
  name: "EditProfile",
  components: {},
  data() {
    return {
      userStore: null,
      formData: {
        avatar: "",
        nickname: "",
        email: "",
        // 趣味字段（后端暂不存储，仅本地保留）
        gender: "",
        birthday: "",
        sportsPreferences: []
      },
      genderOptions: ["男", "女", "保密"],
      sportsOptions: ["篮球", "足球", "羽毛球", "乒乓球", "网球", "游泳", "健身", "瑜伽"],
      // 密码修改表单
      passwordForm: {
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
      },
      // 弹窗状态控制变量
      internalPasswordPopupOpened: false,
      // 缓存相关
      lastInitTime: 0,
      cacheTimeout: 60 * 1e3,
      // 60秒缓存
      isInitializing: false
    };
  },
  computed: {
    userInfo() {
      var _a;
      return ((_a = this.userStore) == null ? void 0 : _a.userInfoGetter) || {};
    },
    genderIndex() {
      return this.genderOptions.indexOf(this.formData.gender);
    },
    // 登录方式：'wechat' 或 'account'
    loginType() {
      var _a, _b;
      if ((_a = this.userInfo) == null ? void 0 : _a.loginType) {
        return this.userInfo.loginType;
      }
      return ((_b = this.userInfo) == null ? void 0 : _b.wechatOpenid) ? "wechat" : "account";
    }
  },
  onLoad() {
    this.userStore = stores_user.useUserStore();
    this.internalPasswordPopupOpened = false;
    this.initFormData();
  },
  onShow() {
    this.initFormDataWithCache();
  },
  onUnload() {
  },
  methods: {
    // 🚀 缓存优化的表单数据初始化
    async initFormDataWithCache() {
      const now = Date.now();
      if (this.lastInitTime && now - this.lastInitTime < this.cacheTimeout && this.formData.nickname) {
        return;
      }
      if (this.isInitializing) {
        return;
      }
      try {
        this.isInitializing = true;
        await this.initFormData();
        this.lastInitTime = now;
      } finally {
        this.isInitializing = false;
      }
    },
    // 初始化表单数据
    async initFormData() {
      if (!this.userInfo || !this.userInfo.id) {
        try {
          const result = await this.userStore.getUserInfo();
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/user/edit-profile.vue:286", "[EditProfile] 获取用户信息失败:", error);
          common_vendor.index.showToast({
            title: "获取用户信息失败",
            icon: "error"
          });
          return;
        }
      }
      if (this.userInfo) {
        this.formData = {
          avatar: this.userInfo.avatar || "",
          nickname: this.userInfo.nickname || this.userInfo.username || "未设置昵称",
          email: this.userInfo.email || "",
          // 趣味字段（从本地存储恢复）
          gender: this.userInfo.gender || common_vendor.index.getStorageSync("user_gender_" + this.userInfo.id) || "",
          birthday: this.userInfo.birthday || common_vendor.index.getStorageSync("user_birthday_" + this.userInfo.id) || "",
          sportsPreferences: this.userInfo.sportsPreferences || JSON.parse(common_vendor.index.getStorageSync("user_sports_" + this.userInfo.id) || "[]")
        };
      } else {
        this.formData = {
          avatar: "",
          nickname: "未设置昵称",
          email: "",
          gender: "",
          birthday: "",
          sportsPreferences: []
        };
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
          this.uploadUserAvatar(tempFilePath);
        }
      });
    },
    // 上传头像
    async uploadUserAvatar(filePath) {
      try {
        common_vendor.index.showLoading({ title: "上传中..." });
        const result = await this.userStore.uploadAvatar(filePath);
        if (result && result.avatarUrl) {
          this.formData.avatar = result.avatarUrl;
        }
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "头像更新成功",
          icon: "success"
        });
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/user/edit-profile.vue:357", "[EditProfile] 上传头像失败:", error);
        common_vendor.index.showToast({
          title: error.message || "上传失败",
          icon: "error"
        });
      }
    },
    // 性别变化
    onGenderChange(e) {
      this.formData.gender = this.genderOptions[e.detail.value];
    },
    // 生日变化
    onBirthdayChange(e) {
      this.formData.birthday = e.detail.value;
    },
    // 切换运动偏好
    toggleSport(sport) {
      const index = this.formData.sportsPreferences.indexOf(sport);
      if (index > -1) {
        this.formData.sportsPreferences.splice(index, 1);
      } else {
        this.formData.sportsPreferences.push(sport);
      }
    },
    // 保存个人资料
    async saveProfile() {
      var _a, _b, _c;
      if (!this.validateForm())
        return;
      let loadingShown = false;
      try {
        common_vendor.index.showLoading({ title: "保存中..." });
        loadingShown = true;
        const cleanData = {
          nickname: ((_a = this.formData.nickname) == null ? void 0 : _a.trim()) || "",
          email: ((_b = this.formData.email) == null ? void 0 : _b.trim()) || ""
        };
        if (!cleanData.nickname) {
          delete cleanData.nickname;
        }
        await this.userStore.updateUserInfo(cleanData);
        if ((_c = this.userInfo) == null ? void 0 : _c.id) {
          const userId = this.userInfo.id;
          common_vendor.index.setStorageSync("user_gender_" + userId, this.formData.gender || "");
          common_vendor.index.setStorageSync("user_birthday_" + userId, this.formData.birthday || "");
          common_vendor.index.setStorageSync("user_sports_" + userId, JSON.stringify(this.formData.sportsPreferences || []));
        }
        if (loadingShown) {
          common_vendor.index.hideLoading();
          loadingShown = false;
        }
        common_vendor.index.showToast({
          title: "保存成功",
          icon: "success"
        });
        setTimeout(() => {
          common_vendor.index.navigateBack();
        }, 1500);
      } catch (error) {
        if (loadingShown) {
          common_vendor.index.hideLoading();
          loadingShown = false;
        }
        common_vendor.index.__f__("error", "at pages/user/edit-profile.vue:437", "[EditProfile] 保存失败:", error);
        common_vendor.index.showToast({
          title: error.message || "保存失败",
          icon: "error"
        });
      }
    },
    // 验证表单
    validateForm() {
      if (!this.formData.nickname.trim()) {
        common_vendor.index.showToast({
          title: "请输入昵称",
          icon: "error"
        });
        return false;
      }
      if (this.formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formData.email)) {
        common_vendor.index.showToast({
          title: "邮箱格式不正确",
          icon: "error"
        });
        return false;
      }
      return true;
    },
    // 显示密码修改弹窗
    showPasswordDialog() {
      this.passwordForm = {
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
      };
      this.internalPasswordPopupOpened = true;
    },
    // 关闭密码修改弹窗
    closePasswordDialog() {
      this.internalPasswordPopupOpened = false;
    },
    // 修改密码
    async changePassword() {
      if (!this.passwordForm.oldPassword) {
        common_vendor.index.showToast({
          title: "请输入当前密码",
          icon: "error"
        });
        return;
      }
      if (!this.passwordForm.newPassword) {
        common_vendor.index.showToast({
          title: "请输入新密码",
          icon: "error"
        });
        return;
      }
      if (this.passwordForm.newPassword.length < 6) {
        common_vendor.index.showToast({
          title: "新密码至少6位",
          icon: "error"
        });
        return;
      }
      if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
        common_vendor.index.showToast({
          title: "两次密码输入不一致",
          icon: "error"
        });
        return;
      }
      try {
        common_vendor.index.showLoading({ title: "修改中..." });
        await this.userStore.changePassword({
          oldPassword: this.passwordForm.oldPassword,
          newPassword: this.passwordForm.newPassword
        });
        common_vendor.index.hideLoading();
        this.closePasswordDialog();
        common_vendor.index.showToast({
          title: "密码修改成功",
          icon: "success"
        });
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/user/edit-profile.vue:534", "[EditProfile] 修改密码失败:", error);
        common_vendor.index.showToast({
          title: error.message || "修改失败",
          icon: "error"
        });
      }
    },
    // 返回
    goBack() {
      common_vendor.index.navigateBack();
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b;
  return common_vendor.e({
    a: $data.formData.avatar || "/static/images/default-avatar.svg",
    b: common_vendor.o((...args) => $options.changeAvatar && $options.changeAvatar(...args)),
    c: $data.formData.nickname,
    d: common_vendor.o(($event) => $data.formData.nickname = $event.detail.value),
    e: (_a = $options.userInfo) == null ? void 0 : _a.phone
  }, ((_b = $options.userInfo) == null ? void 0 : _b.phone) ? {
    f: common_vendor.t($options.formatPhone($options.userInfo.phone))
  } : {}, {
    g: $data.formData.email,
    h: common_vendor.o(($event) => $data.formData.email = $event.detail.value),
    i: common_vendor.t($data.formData.gender || "请选择性别"),
    j: $data.genderOptions,
    k: $options.genderIndex,
    l: common_vendor.o((...args) => $options.onGenderChange && $options.onGenderChange(...args)),
    m: common_vendor.t($data.formData.birthday || "请选择生日"),
    n: $data.formData.birthday,
    o: common_vendor.o((...args) => $options.onBirthdayChange && $options.onBirthdayChange(...args)),
    p: common_vendor.f($data.sportsOptions, (sport, k0, i0) => {
      return {
        a: common_vendor.t(sport),
        b: $data.formData.sportsPreferences.includes(sport) ? 1 : "",
        c: sport,
        d: common_vendor.o(($event) => $options.toggleSport(sport), sport)
      };
    }),
    q: $options.loginType === "account"
  }, $options.loginType === "account" ? {
    r: common_vendor.o((...args) => $options.showPasswordDialog && $options.showPasswordDialog(...args))
  } : {}, {
    s: common_vendor.o((...args) => $options.goBack && $options.goBack(...args)),
    t: common_vendor.o((...args) => $options.saveProfile && $options.saveProfile(...args)),
    v: $data.internalPasswordPopupOpened
  }, $data.internalPasswordPopupOpened ? {
    w: common_vendor.o((...args) => $options.closePasswordDialog && $options.closePasswordDialog(...args)),
    x: $data.passwordForm.oldPassword,
    y: common_vendor.o(($event) => $data.passwordForm.oldPassword = $event.detail.value),
    z: $data.passwordForm.newPassword,
    A: common_vendor.o(($event) => $data.passwordForm.newPassword = $event.detail.value),
    B: $data.passwordForm.confirmPassword,
    C: common_vendor.o(($event) => $data.passwordForm.confirmPassword = $event.detail.value),
    D: common_vendor.o((...args) => $options.closePasswordDialog && $options.closePasswordDialog(...args)),
    E: common_vendor.o((...args) => $options.changePassword && $options.changePassword(...args)),
    F: common_vendor.o(() => {
    }),
    G: common_vendor.o((...args) => $options.closePasswordDialog && $options.closePasswordDialog(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-c6066cac"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/user/edit-profile.js.map
