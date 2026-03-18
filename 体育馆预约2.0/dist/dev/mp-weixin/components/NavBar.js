"use strict";
const common_vendor = require("../common/vendor.js");
const _sfc_main = {
  name: "NavBar",
  props: {
    // 标题
    title: {
      type: String,
      default: ""
    },
    // 标题颜色
    titleColor: {
      type: String,
      default: "#333333"
    },
    // 背景色
    backgroundColor: {
      type: String,
      default: "#ffffff"
    },
    // 是否显示返回按钮
    showBack: {
      type: Boolean,
      default: true
    },
    // 返回按钮文字
    backText: {
      type: String,
      default: ""
    },
    // 右侧文字
    rightText: {
      type: String,
      default: ""
    },
    // 右侧文字颜色
    rightTextColor: {
      type: String,
      default: ""
    },
    // 是否显示底部边框
    showBorder: {
      type: Boolean,
      default: true
    },
    // 是否固定定位
    fixed: {
      type: Boolean,
      default: true
    },
    // 层级
    zIndex: {
      type: Number,
      default: 999
    },
    // 是否沉浸式
    immersive: {
      type: Boolean,
      default: true
    },
    // 自定义样式
    customStyle: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      statusBarHeight: 0,
      navBarHeight: 44,
      menuButtonRect: null,
      screenWidth: 0
    };
  },
  computed: {
    // 导航栏样式
    navBarStyle() {
      const style = {
        backgroundColor: this.backgroundColor,
        zIndex: this.zIndex,
        ...this.customStyle
      };
      if (this.fixed) {
        style.position = "fixed";
        style.top = "0";
        style.left = "0";
        style.right = "0";
      }
      return style;
    },
    // 标题样式
    titleStyle() {
      return {
        color: this.titleColor
      };
    },
    // 右侧文字样式
    rightTextStyle() {
      return {
        color: this.rightTextColor || this.titleColor
      };
    },
    // 总高度
    totalHeight() {
      return this.statusBarHeight + this.navBarHeight;
    },
    navContentStyle() {
      return {
        height: this.navBarHeight + "px",
        paddingLeft: "30rpx",
        paddingRight: "30rpx"
      };
    },
    // 标题绝对居中，并为右上角胶囊按钮预留，避免遮挡和“整体偏移”
    navCenterStyle() {
      const basePaddingPx = 12;
      let sideSafePx = basePaddingPx;
      if (this.menuButtonRect && this.screenWidth) {
        const rightReserve = Math.max(this.screenWidth - this.menuButtonRect.left, 0);
        sideSafePx = Math.max(basePaddingPx, rightReserve + 8);
      }
      return {
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: `calc(100% - ${sideSafePx * 2}px)`
      };
    }
  },
  mounted() {
    this.getSystemInfo();
  },
  methods: {
    // 获取系统信息
    getSystemInfo() {
      const systemInfo = common_vendor.index.getSystemInfoSync();
      this.statusBarHeight = systemInfo.statusBarHeight || 0;
      this.screenWidth = systemInfo.screenWidth || 0;
      if (typeof common_vendor.index.getMenuButtonBoundingClientRect === "function") {
        try {
          this.menuButtonRect = common_vendor.index.getMenuButtonBoundingClientRect();
        } catch {
          this.menuButtonRect = null;
        }
      }
      if (systemInfo.platform === "ios") {
        this.navBarHeight = 44;
      } else {
        this.navBarHeight = 48;
      }
      if (!this.immersive) {
        this.statusBarHeight = 0;
      }
    },
    // 左侧点击事件
    handleLeftClick() {
      this.$emit("left-click");
      const hasLeftClickListener = !!(this.$attrs && (this.$attrs.onLeftClick || this.$attrs["onLeft-click"]));
      if (this.showBack && !hasLeftClickListener) {
        this.goBack();
      }
    },
    // 右侧点击事件
    handleRightClick() {
      this.$emit("right-click");
    },
    // 返回上一页
    goBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        common_vendor.index.navigateBack();
      } else {
        common_vendor.index.reLaunch({
          url: "/pages/index/index"
        });
      }
    },
    // 获取导航栏高度（供外部调用）
    getNavBarHeight() {
      return this.totalHeight;
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.statusBarHeight + "px",
    b: $props.showBack
  }, $props.showBack ? common_vendor.e({
    c: $props.backText
  }, $props.backText ? {
    d: common_vendor.t($props.backText)
  } : {}) : {}, {
    e: common_vendor.o((...args) => $options.handleLeftClick && $options.handleLeftClick(...args)),
    f: common_vendor.t($props.title),
    g: common_vendor.s($options.titleStyle),
    h: common_vendor.s($options.navCenterStyle),
    i: $props.rightText
  }, $props.rightText ? {
    j: common_vendor.t($props.rightText),
    k: common_vendor.s($options.rightTextStyle)
  } : {}, {
    l: common_vendor.o((...args) => $options.handleRightClick && $options.handleRightClick(...args)),
    m: common_vendor.s($options.navContentStyle),
    n: $props.showBorder
  }, $props.showBorder ? {} : {}, {
    o: common_vendor.s($options.navBarStyle)
  });
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-c3ceb15a"]]);
wx.createComponent(Component);
//# sourceMappingURL=../../.sourcemap/mp-weixin/components/NavBar.js.map
