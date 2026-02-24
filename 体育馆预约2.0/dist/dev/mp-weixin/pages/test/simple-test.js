"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_auth = require("../../utils/auth.js");
const api_user = require("../../api/user.js");
const _sfc_main = {
  name: "SimpleTest",
  data() {
    return {
      token: "",
      userInfo: null,
      apiStatus: "待测试",
      result: "暂无结果"
    };
  },
  onLoad() {
    this.refreshAuth();
  },
  methods: {
    refreshAuth() {
      this.token = utils_auth.getToken();
      this.userInfo = utils_auth.getUserInfo();
    },
    setAuth() {
      const realToken = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMzgwMDAwMDAwMSIsImlhdCI6MTc1MjQwMTgyMSwiZXhwIjoxNzUyNDg4MjIxfQ.vFAd19NFzyYyxS2cRXy3dCq_Va_dguz01QSX2lwN_c0";
      const realUserInfo = {
        id: 33,
        username: "13800000001",
        phone: "13800000001",
        nickname: "测试用户2"
      };
      utils_auth.setToken(realToken);
      utils_auth.setUserInfo(realUserInfo);
      this.refreshAuth();
      common_vendor.index.showToast({
        title: "认证信息已设置",
        icon: "success"
      });
    },
    async testGetBookings() {
      try {
        this.apiStatus = "请求中...";
        const response = await api_user.getUserBookings({ page: 1, pageSize: 10 });
        this.apiStatus = "请求成功";
        let analysis = `总记录数: ${response.total}
`;
        analysis += `数据数组长度: ${response.data ? response.data.length : 0}

`;
        if (response.data && response.data.length > 0) {
          response.data.forEach((item, index) => {
            analysis += `=== 订单 ${index + 1} ===
`;
            analysis += `ID: ${item.id}
`;
            analysis += `订单号: ${item.orderNo}
`;
            analysis += `状态: ${item.status}
`;
            analysis += `类型: ${item.bookingType}
`;
            analysis += `场馆: ${item.venueName}
`;
            analysis += `价格: ${item.totalPrice}
`;
            analysis += `预约日期: ${item.bookingDate}
`;
            analysis += `开始时间: ${item.startTime}
`;
            analysis += `结束时间: ${item.endTime}
`;
            analysis += `创建时间: ${item.createdAt}

`;
          });
        } else {
          analysis += "没有找到任何订单数据\n";
        }
        this.result = analysis;
        common_vendor.index.showToast({
          title: `获取到${response.total}条记录`,
          icon: "success"
        });
      } catch (error) {
        this.apiStatus = "请求失败";
        this.result = `错误: ${error.message}
堆栈: ${error.stack || "无"}`;
        common_vendor.index.showToast({
          title: "请求失败",
          icon: "error"
        });
      }
    },
    goBack() {
      common_vendor.index.navigateBack();
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.t($data.token ? "已设置" : "未设置"),
    b: common_vendor.t($data.userInfo ? $data.userInfo.username : "未登录"),
    c: common_vendor.o((...args) => $options.setAuth && $options.setAuth(...args)),
    d: common_vendor.o((...args) => $options.testGetBookings && $options.testGetBookings(...args)),
    e: common_vendor.t($data.apiStatus),
    f: common_vendor.t($data.result),
    g: common_vendor.o((...args) => $options.goBack && $options.goBack(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-5097a525"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/simple-test.js.map
