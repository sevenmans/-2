"use strict";
const common_vendor = require("../../common/vendor.js");
const TAB_CONFIG = [
  {
    key: "dashboard",
    label: "工作台",
    path: "/pages/admin/dashboard",
    iconPath: "/static/icons/admin/dashboard.svg",
    selectedIconPath: "/static/icons/admin/dashboard-active.svg"
  },
  {
    key: "orders",
    label: "订单",
    path: "/pages/admin/orders/list",
    iconPath: "/static/icons/admin/orders.svg",
    selectedIconPath: "/static/icons/admin/orders-active.svg"
  },
  {
    key: "verification",
    label: "核销",
    path: "/pages/admin/verification/index",
    iconPath: "/static/icons/admin/scan.svg",
    selectedIconPath: "/static/icons/admin/scan-active.svg"
  },
  {
    key: "venues",
    label: "场馆",
    path: "/pages/admin/venues/list",
    iconPath: "/static/icons/admin/venue.svg",
    selectedIconPath: "/static/icons/admin/venue-active.svg"
  },
  {
    key: "security",
    label: "我的",
    path: "/pages/admin/security/password",
    iconPath: "/static/icons/admin/user.svg",
    selectedIconPath: "/static/icons/admin/user-active.svg"
  }
];
const _sfc_main = {
  name: "AdminTabBar",
  props: {
    current: {
      type: String,
      default: "dashboard"
    }
  },
  data() {
    return {
      tabs: TAB_CONFIG
    };
  },
  methods: {
    switchTab(tab) {
      if (tab.key === this.current)
        return;
      common_vendor.index.redirectTo({ url: tab.path });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.f($data.tabs, (tab, k0, i0) => {
      return {
        a: $props.current === tab.key ? tab.selectedIconPath : tab.iconPath,
        b: common_vendor.t(tab.label),
        c: tab.key,
        d: $props.current === tab.key ? 1 : "",
        e: common_vendor.o(($event) => $options.switchTab(tab), tab.key)
      };
    })
  };
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-153c7e3a"]]);
wx.createComponent(Component);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/components/admin/AdminTabBar.js.map
