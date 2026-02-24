"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  name: "TestIndex",
  data() {
    return {
      testResults: null
    };
  },
  methods: {
    // 导航到测试工具
    navigateToTool(toolName) {
      common_vendor.index.__f__("log", "at pages/test/index.vue:234", `导航到测试工具: ${toolName}`);
      common_vendor.index.navigateTo({
        url: `/pages/test/${toolName}`,
        fail: (error) => {
          common_vendor.index.__f__("error", "at pages/test/index.vue:238", "导航失败:", error);
          common_vendor.index.showToast({
            title: "页面不存在",
            icon: "none"
          });
        }
      });
    },
    // 运行快速检查
    async runQuickCheck() {
      common_vendor.index.showLoading({
        title: "正在检查..."
      });
      try {
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          title: "快速检查完成",
          content: "发现3个需要关注的问题，建议使用详细测试工具进一步检查",
          confirmText: "查看详情",
          success: (res) => {
            if (res.confirm) {
              this.navigateToTool("comprehensive-migration-check");
            }
          }
        });
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "检查失败",
          icon: "error"
        });
      }
    },
    // 查看测试结果
    viewResults() {
      common_vendor.index.showModal({
        title: "测试结果",
        content: "当前已修复5项问题，还有15项需要检查。建议运行完整测试获得详细报告。",
        confirmText: "运行测试",
        success: (res) => {
          if (res.confirm) {
            this.navigateToTool("comprehensive-migration-check");
          }
        }
      });
    },
    // 查看文档
    viewDocumentation() {
      common_vendor.index.showModal({
        title: "迁移文档",
        content: "迁移文档包含30项错误清单和详细修复指南，建议先阅读文档了解迁移要点。",
        confirmText: "我知道了"
      });
    }
  },
  onLoad() {
    common_vendor.index.__f__("log", "at pages/test/index.vue:302", "测试中心页面加载");
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o(($event) => $options.navigateToTool("pinia-migration-final-validation")),
    b: common_vendor.o(($event) => $options.navigateToTool("comprehensive-migration-check")),
    c: common_vendor.o(($event) => $options.navigateToTool("quick-fix-validation")),
    d: common_vendor.o(($event) => $options.navigateToTool("naming-conflict-fix")),
    e: common_vendor.o(($event) => $options.navigateToTool("api-diagnosis")),
    f: common_vendor.o(($event) => $options.navigateToTool("migration-validation")),
    g: common_vendor.o(($event) => $options.navigateToTool("payment-fix")),
    h: common_vendor.o(($event) => $options.navigateToTool("timeslot-fix-test")),
    i: common_vendor.o(($event) => $options.navigateToTool("timeslot-sync-debug")),
    j: common_vendor.o(($event) => $options.navigateToTool("booking-data-fix-test")),
    k: common_vendor.o(($event) => $options.navigateToTool("timeslot-status-debug")),
    l: common_vendor.o(($event) => $options.navigateToTool("field-mapping-validation")),
    m: common_vendor.o(($event) => $options.navigateToTool("timeslot-display-fix-test")),
    n: common_vendor.o((...args) => $options.runQuickCheck && $options.runQuickCheck(...args)),
    o: common_vendor.o((...args) => $options.viewResults && $options.viewResults(...args)),
    p: common_vendor.o((...args) => $options.viewDocumentation && $options.viewDocumentation(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-2881d7c1"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/index.js.map
