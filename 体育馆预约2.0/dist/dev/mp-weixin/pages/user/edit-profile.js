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
        username: "",
        nickname: "",
        gender: "",
        birthday: "",
        email: "",
        bio: "",
        sportsPreferences: [],
        city: "",
        showBookingHistory: true,
        allowSharingInvite: true,
        receiveNotifications: true
      },
      genderOptions: ["男", "女", "保密"],
      sportsOptions: ["篮球", "足球", "羽毛球", "乒乓球", "网球", "游泳", "健身", "瑜伽"],
      regionValue: [],
      // 密码修改表单
      passwordForm: {
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
      },
      // 弹窗状态控制变量
      internalPasswordPopupOpened: false,
      passwordPopupPosition: "",
      _passwordPopupRef: null,
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
    }
  },
  onLoad() {
    this.userStore = stores_user.useUserStore();
    this.internalPasswordPopupOpened = false;
    this.$nextTick(() => {
      try {
        this._passwordPopupRef = this.$refs.passwordPopup;
        if (!this._passwordPopupRef) {
          setTimeout(() => {
            this._passwordPopupRef = this.$refs.passwordPopup;
          }, 100);
        }
      } catch (e) {
      }
    });
    this.initFormData();
  },
  onShow() {
    this.initFormDataWithCache();
  },
  onUnload() {
    this._passwordPopupRef = null;
  },
  methods: {
    // 🚀 缓存优化的表单数据初始化
    async initFormDataWithCache() {
      const now = Date.now();
      if (this.lastInitTime && now - this.lastInitTime < this.cacheTimeout && this.formData.username) {
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
          common_vendor.index.__f__("error", "at pages/user/edit-profile.vue:357", "[EditProfile] 获取用户信息失败:", error);
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
          username: this.userInfo.username || "",
          nickname: this.userInfo.nickname || this.userInfo.username || "未设置昵称",
          gender: this.userInfo.gender || "",
          birthday: this.userInfo.birthday || "",
          email: this.userInfo.email || "",
          bio: this.userInfo.bio || "",
          sportsPreferences: this.userInfo.sportsPreferences || [],
          city: this.userInfo.city || "",
          showBookingHistory: this.userInfo.showBookingHistory !== false,
          allowSharingInvite: this.userInfo.allowSharingInvite !== false,
          receiveNotifications: this.userInfo.receiveNotifications !== false
        };
        if (this.userInfo.city) {
          this.regionValue = this.userInfo.city.split(" ");
        }
      } else {
        this.formData = {
          avatar: "",
          username: "用户" + Date.now().toString().slice(-6),
          // 生成默认用户名
          nickname: "未设置昵称",
          gender: "",
          birthday: "",
          email: "",
          bio: "",
          sportsPreferences: [],
          city: "",
          showBookingHistory: true,
          allowSharingInvite: true,
          receiveNotifications: true
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
        this.formData.avatar = result.url;
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "头像更新成功",
          icon: "success"
        });
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/user/edit-profile.vue:441", "上传头像失败:", error);
        common_vendor.index.showToast({
          title: "上传失败",
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
    // 地区变化
    onRegionChange(e) {
      this.regionValue = e.detail.value;
      this.formData.city = e.detail.value.join(" ");
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
    // 隐私设置变化
    onPrivacyChange(key, e) {
      this.formData[key] = e.detail.value;
    },
    // 保存个人资料
    async saveProfile() {
      var _a, _b, _c, _d, _e;
      if (!this.validateForm())
        return;
      let loadingShown = false;
      try {
        common_vendor.index.showLoading({ title: "保存中..." });
        loadingShown = true;
        const cleanData = {
          username: ((_a = this.formData.username) == null ? void 0 : _a.trim()) || "",
          nickname: ((_b = this.formData.nickname) == null ? void 0 : _b.trim()) || "",
          gender: this.formData.gender || "",
          birthday: this.formData.birthday || "",
          email: ((_c = this.formData.email) == null ? void 0 : _c.trim()) || "",
          bio: ((_d = this.formData.bio) == null ? void 0 : _d.trim()) || "",
          city: ((_e = this.formData.city) == null ? void 0 : _e.trim()) || "",
          sportsPreferences: this.formData.sportsPreferences || [],
          showBookingHistory: Boolean(this.formData.showBookingHistory),
          allowSharingInvite: Boolean(this.formData.allowSharingInvite),
          receiveNotifications: Boolean(this.formData.receiveNotifications)
        };
        Object.keys(cleanData).forEach((key) => {
          if (cleanData[key] === "" && key !== "bio") {
            delete cleanData[key];
          }
        });
        await this.userStore.updateUserInfo(cleanData);
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
        common_vendor.index.__f__("error", "at pages/user/edit-profile.vue:539", "保存失败:", error);
        common_vendor.index.showToast({
          title: error.message || "保存失败",
          icon: "error"
        });
      }
    },
    // 验证表单
    validateForm() {
      if (!this.formData.username.trim()) {
        common_vendor.index.showToast({
          title: "请输入用户名",
          icon: "error"
        });
        return false;
      }
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
      this.showPasswordPopup();
    },
    // 关闭密码修改弹窗
    closePasswordDialog() {
      this.closePasswordPopup();
    },
    // 显示密码修改弹窗（兼容微信小程序）
    showPasswordPopup() {
      const debugEnabled = false;
      try {
        let windowInfo, deviceInfo, appBaseInfo;
        try {
          windowInfo = common_vendor.index.getWindowInfo();
          deviceInfo = common_vendor.index.getDeviceInfo();
          appBaseInfo = common_vendor.index.getAppBaseInfo();
        } catch (e) {
        }
        const platform = (deviceInfo == null ? void 0 : deviceInfo.platform) || (appBaseInfo == null ? void 0 : appBaseInfo.platform) || "unknown";
        const uniPlatform = (appBaseInfo == null ? void 0 : appBaseInfo.uniPlatform) || "unknown";
        if (debugEnabled)
          ;
        if (this.$refs.passwordPopup) {
          if (Array.isArray(this.$refs.passwordPopup)) {
            const popup = this.$refs.passwordPopup[0];
            if (popup && typeof popup.open === "function") {
              popup.open();
              this.internalPasswordPopupOpened = true;
              return;
            }
          } else if (typeof this.$refs.passwordPopup.open === "function") {
            this.$refs.passwordPopup.open();
            this.internalPasswordPopupOpened = true;
            return;
          }
        }
        if (this._passwordPopupRef && typeof this._passwordPopupRef.open === "function") {
          this._passwordPopupRef.open();
          this.internalPasswordPopupOpened = true;
          return;
        }
        if ((platform === "devtools" || uniPlatform === "mp-weixin") && this.$scope && typeof this.$scope.selectComponent === "function") {
          try {
            const popup = this.$scope.selectComponent("#passwordPopup") || this.$scope.selectComponent(".password-popup");
            if (popup && typeof popup.open === "function") {
              popup.open();
              this.internalPasswordPopupOpened = true;
              return;
            }
          } catch (e) {
            if (debugEnabled)
              ;
          }
        }
        if (this.$children && this.$children.length > 0) {
          for (let child of this.$children) {
            if (child.$options && (child.$options.name === "UniPopup" || child.$options._componentTag === "uni-popup")) {
              if (typeof child.open === "function") {
                child.open();
                this.internalPasswordPopupOpened = true;
                return;
              }
            }
          }
        }
        setTimeout(() => {
          if (this.$refs.passwordPopup && typeof this.$refs.passwordPopup.open === "function") {
            this.$refs.passwordPopup.open();
            this.internalPasswordPopupOpened = true;
            return;
          }
          try {
            this.passwordPopupPosition = "force-show";
            this.internalPasswordPopupOpened = true;
            this.$forceUpdate();
          } catch (e) {
            if (debugEnabled)
              ;
          }
        }, 100);
      } catch (error) {
      }
    },
    // 关闭密码修改弹窗（兼容微信小程序）
    closePasswordPopup() {
      const debugEnabled = false;
      try {
        let windowInfo, deviceInfo, appBaseInfo;
        try {
          windowInfo = common_vendor.index.getWindowInfo();
          deviceInfo = common_vendor.index.getDeviceInfo();
          appBaseInfo = common_vendor.index.getAppBaseInfo();
        } catch (e) {
        }
        const platform = (deviceInfo == null ? void 0 : deviceInfo.platform) || (appBaseInfo == null ? void 0 : appBaseInfo.platform) || "unknown";
        const uniPlatform = (appBaseInfo == null ? void 0 : appBaseInfo.uniPlatform) || "unknown";
        if (debugEnabled)
          ;
        if (this.$refs.passwordPopup) {
          if (Array.isArray(this.$refs.passwordPopup)) {
            const popup = this.$refs.passwordPopup[0];
            if (popup && typeof popup.close === "function") {
              popup.close();
              this.internalPasswordPopupOpened = false;
              return;
            }
          } else if (typeof this.$refs.passwordPopup.close === "function") {
            this.$refs.passwordPopup.close();
            this.internalPasswordPopupOpened = false;
            return;
          }
        }
        if (this._passwordPopupRef && typeof this._passwordPopupRef.close === "function") {
          this._passwordPopupRef.close();
          this.internalPasswordPopupOpened = false;
          return;
        }
        if ((platform === "devtools" || uniPlatform === "mp-weixin") && this.$scope && typeof this.$scope.selectComponent === "function") {
          try {
            const popup = this.$scope.selectComponent("#passwordPopup") || this.$scope.selectComponent(".password-popup");
            if (popup && typeof popup.close === "function") {
              popup.close();
              this.internalPasswordPopupOpened = false;
              return;
            }
          } catch (e) {
            if (debugEnabled)
              ;
          }
        }
        if (this.$children && this.$children.length > 0) {
          for (let child of this.$children) {
            if (child.$options && (child.$options.name === "UniPopup" || child.$options._componentTag === "uni-popup")) {
              if (typeof child.close === "function") {
                child.close();
                this.internalPasswordPopupOpened = false;
                return;
              }
            }
          }
        }
        setTimeout(() => {
          if (this.$refs.passwordPopup && typeof this.$refs.passwordPopup.close === "function") {
            this.$refs.passwordPopup.close();
            this.internalPasswordPopupOpened = false;
            return;
          }
          try {
            this.passwordPopupPosition = "force-hide";
            this.internalPasswordPopupOpened = false;
            this.$forceUpdate();
          } catch (e) {
            if (debugEnabled)
              ;
          }
        }, 100);
      } catch (error) {
      }
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
        await this.userStore.changeUserPassword({
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
        common_vendor.index.__f__("error", "at pages/user/edit-profile.vue:834", "修改密码失败:", error);
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
if (!Array) {
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  _component_uni_popup();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a;
  return {
    a: $data.formData.avatar || "/static/images/default-avatar.svg",
    b: common_vendor.o((...args) => $options.changeAvatar && $options.changeAvatar(...args)),
    c: $data.formData.username,
    d: common_vendor.o(($event) => $data.formData.username = $event.detail.value),
    e: $data.formData.nickname,
    f: common_vendor.o(($event) => $data.formData.nickname = $event.detail.value),
    g: common_vendor.t($data.formData.gender || "请选择性别"),
    h: $data.genderOptions,
    i: $options.genderIndex,
    j: common_vendor.o((...args) => $options.onGenderChange && $options.onGenderChange(...args)),
    k: common_vendor.t($data.formData.birthday || "请选择生日"),
    l: $data.formData.birthday,
    m: common_vendor.o((...args) => $options.onBirthdayChange && $options.onBirthdayChange(...args)),
    n: common_vendor.t($options.formatPhone(((_a = $options.userInfo) == null ? void 0 : _a.phone) || "")),
    o: $data.formData.email,
    p: common_vendor.o(($event) => $data.formData.email = $event.detail.value),
    q: common_vendor.o((...args) => $options.showPasswordDialog && $options.showPasswordDialog(...args)),
    r: $data.formData.bio,
    s: common_vendor.o(($event) => $data.formData.bio = $event.detail.value),
    t: common_vendor.f($data.sportsOptions, (sport, k0, i0) => {
      return {
        a: common_vendor.t(sport),
        b: $data.formData.sportsPreferences.includes(sport) ? 1 : "",
        c: sport,
        d: common_vendor.o(($event) => $options.toggleSport(sport), sport)
      };
    }),
    v: common_vendor.t($data.formData.city || "请选择城市"),
    w: $data.regionValue,
    x: common_vendor.o((...args) => $options.onRegionChange && $options.onRegionChange(...args)),
    y: $data.formData.showBookingHistory,
    z: common_vendor.o(($event) => $options.onPrivacyChange("showBookingHistory", $event)),
    A: $data.formData.allowSharingInvite,
    B: common_vendor.o(($event) => $options.onPrivacyChange("allowSharingInvite", $event)),
    C: $data.formData.receiveNotifications,
    D: common_vendor.o(($event) => $options.onPrivacyChange("receiveNotifications", $event)),
    E: common_vendor.o((...args) => $options.goBack && $options.goBack(...args)),
    F: common_vendor.o((...args) => $options.saveProfile && $options.saveProfile(...args)),
    G: common_vendor.o((...args) => $options.closePasswordDialog && $options.closePasswordDialog(...args)),
    H: $data.passwordForm.oldPassword,
    I: common_vendor.o(($event) => $data.passwordForm.oldPassword = $event.detail.value),
    J: $data.passwordForm.newPassword,
    K: common_vendor.o(($event) => $data.passwordForm.newPassword = $event.detail.value),
    L: $data.passwordForm.confirmPassword,
    M: common_vendor.o(($event) => $data.passwordForm.confirmPassword = $event.detail.value),
    N: common_vendor.o((...args) => $options.closePasswordDialog && $options.closePasswordDialog(...args)),
    O: common_vendor.o((...args) => $options.changePassword && $options.changePassword(...args)),
    P: common_vendor.sr("passwordPopup", "c6066cac-0"),
    Q: $data.internalPasswordPopupOpened,
    R: common_vendor.n($data.passwordPopupPosition),
    S: common_vendor.p({
      type: "center",
      ["mask-click"]: false
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-c6066cac"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/user/edit-profile.js.map
