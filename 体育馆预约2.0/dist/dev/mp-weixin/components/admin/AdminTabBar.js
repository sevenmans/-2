"use strict";
const common_vendor = require("../../common/vendor.js");
const TAB_CONFIG = [
  { key: "dashboard", icon: "📊", label: "工作台", path: "/pages/admin/dashboard" },
  { key: "orders", icon: "📋", label: "订单", path: "/pages/admin/orders/list" },
  { key: "verification", icon: "📷", label: "核销", path: "/pages/admin/verification/index", highlight: true },
  { key: "venues", icon: "🏟️", label: "场馆", path: "/pages/admin/venues/list" },
  { key: "security", icon: "👤", label: "我的", path: "/pages/admin/security/password" }
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
    a: common_vendor.f($data.tabs, (tab, idx, i0) => {
      return common_vendor.e({
        a: tab.highlight
      }, tab.highlight ? {
        b: common_vendor.t(tab.icon)
      } : {
        c: common_vendor.t(tab.icon)
      }, {
        d: common_vendor.t(tab.label),
        e: tab.highlight ? 1 : "",
        f: tab.key,
        g: $props.current === tab.key ? 1 : "",
        h: tab.highlight ? 1 : "",
        i: common_vendor.o(($event) => $options.switchTab(tab), tab.key)
      });
    })
  };
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-153c7e3a"]]);
wx.createComponent(Component);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/components/admin/AdminTabBar.js.map
