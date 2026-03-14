"use strict";
const common_vendor = require("../common/vendor.js");
const _sfc_main = {
  name: "LoadMore",
  props: {
    // 状态：loading(加载中) | more(加载更多) | nomore(没有更多) | error(加载失败) | empty(空状态)
    status: {
      type: String,
      default: "more",
      validator: (value) => {
        return ["loading", "more", "nomore", "error", "empty"].includes(value);
      }
    },
    // 加载中文本
    loadingText: {
      type: String,
      default: "加载中..."
    },
    // 加载更多文本
    moreText: {
      type: String,
      default: "点击加载更多"
    },
    // 没有更多文本
    nomoreText: {
      type: String,
      default: "没有更多了"
    },
    // 加载失败文本
    errorText: {
      type: String,
      default: "加载失败"
    },
    // 空状态文本
    emptyText: {
      type: String,
      default: "暂无数据"
    },
    // 空状态图片
    emptyImage: {
      type: String,
      default: "/static/images/empty.png"
    },
    // 是否显示刷新按钮
    showRefreshBtn: {
      type: Boolean,
      default: true
    },
    // 刷新按钮文本
    refreshText: {
      type: String,
      default: "刷新"
    },
    // 自定义样式
    customStyle: {
      type: Object,
      default: () => ({})
    },
    // 是否显示分割线
    showLine: {
      type: Boolean,
      default: true
    },
    // 组件高度
    height: {
      type: String,
      default: "auto"
    }
  },
  computed: {
    containerStyle() {
      return {
        height: this.height,
        ...this.customStyle
      };
    }
  },
  methods: {
    // 加载更多
    handleLoadMore() {
      this.$emit("loadmore");
    },
    // 重试
    handleRetry() {
      this.$emit("retry");
    },
    // 刷新
    handleRefresh() {
      this.$emit("refresh");
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $props.status === "loading"
  }, $props.status === "loading" ? {
    b: common_vendor.f(3, (i, k0, i0) => {
      return {
        a: i
      };
    }),
    c: common_vendor.t($props.loadingText)
  } : $props.status === "more" ? {
    e: common_vendor.t($props.moreText),
    f: common_vendor.o((...args) => $options.handleLoadMore && $options.handleLoadMore(...args))
  } : $props.status === "nomore" ? {
    h: common_vendor.t($props.nomoreText)
  } : $props.status === "error" ? {
    j: common_vendor.t($props.errorText),
    k: common_vendor.o((...args) => $options.handleRetry && $options.handleRetry(...args))
  } : $props.status === "empty" ? common_vendor.e({
    m: $props.emptyImage
  }, $props.emptyImage ? {
    n: $props.emptyImage
  } : {}, {
    o: common_vendor.t($props.emptyText),
    p: $props.showRefreshBtn
  }, $props.showRefreshBtn ? {
    q: common_vendor.t($props.refreshText),
    r: common_vendor.o((...args) => $options.handleRefresh && $options.handleRefresh(...args))
  } : {}) : {}, {
    d: $props.status === "more",
    g: $props.status === "nomore",
    i: $props.status === "error",
    l: $props.status === "empty",
    s: common_vendor.n(`status-${$props.status}`)
  });
}
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-67b8b8fc"]]);
wx.createComponent(Component);
//# sourceMappingURL=../../.sourcemap/mp-weixin/components/LoadMore.js.map
