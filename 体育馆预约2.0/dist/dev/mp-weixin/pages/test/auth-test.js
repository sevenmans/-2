"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_auth = require("../../utils/auth.js");
const _sfc_main = {
  data() {
    return {
      currentToken: "",
      currentUserInfo: null,
      isLoggedIn: false
    };
  },
  onLoad() {
    this.refreshStatus();
  },
  onShow() {
    this.refreshStatus();
  },
  methods: {
    // 刷新状态
    refreshStatus() {
      this.currentToken = utils_auth.getToken();
      this.currentUserInfo = utils_auth.getUserInfo();
      this.isLoggedIn = utils_auth.isLoggedIn();
    },
    // 设置测试认证信息
    setTestAuth() {
      const realToken = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMzgwMDAwMDAwMSIsImlhdCI6MTc1MjQwMTgyMSwiZXhwIjoxNzUyNDg4MjIxfQ.vFAd19NFzyYyxS2cRXy3dCq_Va_dguz01QSX2lwN_c0";
      const realUserInfo = {
        id: 33,
        username: "13800000001",
        phone: "13800000001",
        nickname: "测试用户2",
        avatar: "/static/images/default-avatar.svg"
      };
      utils_auth.setToken(realToken);
      utils_auth.setUserInfo(realUserInfo);
      common_vendor.index.showToast({
        title: "真实认证信息已设置",
        icon: "success"
      });
      this.refreshStatus();
    },
    // 清除认证信息
    clearAuth() {
      utils_auth.clearAuth();
      common_vendor.index.showToast({
        title: "认证信息已清除",
        icon: "success"
      });
      this.refreshStatus();
    },
    // 测试跳转到个人中心（需要登录）
    testNavigateToProfile() {
      common_vendor.index.navigateTo({
        url: "/pages/user/profile"
      });
    },
    // 测试跳转到预约页面（需要登录）
    testNavigateToBooking() {
      common_vendor.index.navigateTo({
        url: "/pages/booking/create"
      });
    },
    // 测试跳转到场馆列表（不需要登录）
    testNavigateToVenueList() {
      common_vendor.index.navigateTo({
        url: "/pages/venue/list"
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.t($data.currentToken || "未设置"),
    b: common_vendor.t($data.currentUserInfo ? JSON.stringify($data.currentUserInfo) : "未设置"),
    c: common_vendor.t($data.isLoggedIn ? "已登录" : "未登录"),
    d: common_vendor.o((...args) => $options.setTestAuth && $options.setTestAuth(...args)),
    e: common_vendor.o((...args) => $options.clearAuth && $options.clearAuth(...args)),
    f: common_vendor.o((...args) => $options.refreshStatus && $options.refreshStatus(...args)),
    g: common_vendor.o((...args) => $options.testNavigateToProfile && $options.testNavigateToProfile(...args)),
    h: common_vendor.o((...args) => $options.testNavigateToBooking && $options.testNavigateToBooking(...args)),
    i: common_vendor.o((...args) => $options.testNavigateToVenueList && $options.testNavigateToVenueList(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-97b0e199"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/auth-test.js.map
