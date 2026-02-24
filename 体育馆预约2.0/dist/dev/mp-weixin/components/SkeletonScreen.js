"use strict";
const common_vendor = require("../common/vendor.js");
const _sfc_main = {
  name: "SkeletonScreen",
  props: {
    // 显示轮播图骨架屏
    showBanner: {
      type: Boolean,
      default: false
    },
    // 显示快捷功能骨架屏
    showActions: {
      type: Boolean,
      default: false
    },
    // 显示场馆列表骨架屏
    showVenues: {
      type: Boolean,
      default: false
    },
    // 显示拼场列表骨架屏
    showSharings: {
      type: Boolean,
      default: false
    },
    // 骨架屏数量
    count: {
      type: Number,
      default: 3
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $props.showBanner
  }, $props.showBanner ? {} : {}, {
    b: $props.showActions
  }, $props.showActions ? {
    c: common_vendor.f(4, (i, k0, i0) => {
      return {
        a: i
      };
    })
  } : {}, {
    d: $props.showVenues
  }, $props.showVenues ? {
    e: common_vendor.f($props.count, (i, k0, i0) => {
      return {
        a: i
      };
    })
  } : {}, {
    f: $props.showSharings
  }, $props.showSharings ? {
    g: common_vendor.f($props.count, (i, k0, i0) => {
      return {
        a: i
      };
    })
  } : {});
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-2d3e614a"]]);
wx.createComponent(Component);
//# sourceMappingURL=../../.sourcemap/mp-weixin/components/SkeletonScreen.js.map
