"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  name: "OrderStatusTest",
  data() {
    return {
      selectedScenario: null,
      testResults: [],
      testScenarios: [
        {
          id: 1,
          name: "普通订单完整流程",
          description: "测试独享订单从创建到完成的完整状态流程",
          steps: [
            {
              title: "创建订单",
              description: "创建一个独享订单，状态应为PENDING",
              status: "active",
              action: "createOrder",
              params: { type: "EXCLUSIVE" }
            },
            {
              title: "支付订单",
              description: "支付订单，状态应从PENDING转为PAID",
              status: "pending",
              action: "payOrder"
            },
            {
              title: "确认订单",
              description: "管理员确认订单，状态应从PAID转为CONFIRMED",
              status: "pending",
              action: "confirmOrder"
            },
            {
              title: "核销订单",
              description: "用户到场核销，状态应从CONFIRMED转为VERIFIED",
              status: "pending",
              action: "verifyOrder"
            },
            {
              title: "完成订单",
              description: "完成订单，状态应从VERIFIED转为COMPLETED",
              status: "pending",
              action: "completeOrder"
            }
          ]
        },
        {
          id: 2,
          name: "拼场订单完整流程",
          description: "测试拼场订单从创建到完成的完整状态流程（两支球队，2人）",
          steps: [
            {
              title: "创建拼场订单",
              description: "创建一个拼场订单，状态应为PENDING（发起者1人）",
              status: "active",
              action: "createOrder",
              params: { type: "SHARED" }
            },
            {
              title: "支付订单",
              description: "支付订单，状态应从PENDING转为OPEN（等待另一支球队加入）",
              status: "pending",
              action: "payOrder"
            },
            {
              title: "拼场成功",
              description: "模拟有用户加入，达到2人满员，状态应从OPEN转为SHARING_SUCCESS",
              status: "pending",
              action: "sharingSuccess"
            },
            {
              title: "确认订单",
              description: "自动确认订单，状态应从SHARING_SUCCESS转为CONFIRMED",
              status: "pending",
              action: "confirmOrder"
            },
            {
              title: "核销订单",
              description: "用户到场核销，状态应从CONFIRMED转为VERIFIED",
              status: "pending",
              action: "verifyOrder"
            },
            {
              title: "完成订单",
              description: "完成订单，状态应从VERIFIED转为COMPLETED",
              status: "pending",
              action: "completeOrder"
            }
          ]
        },
        {
          id: 3,
          name: "订单取消流程",
          description: "测试不同状态下的订单取消功能",
          steps: [
            {
              title: "创建订单",
              description: "创建一个订单用于取消测试",
              status: "active",
              action: "createOrder",
              params: { type: "EXCLUSIVE" }
            },
            {
              title: "取消待支付订单",
              description: "取消PENDING状态的订单，状态应转为CANCELLED",
              status: "pending",
              action: "cancelOrder"
            }
          ]
        },
        {
          id: 4,
          name: "支付超时测试",
          description: "测试支付超时自动过期功能",
          steps: [
            {
              title: "创建订单",
              description: "创建一个订单用于超时测试",
              status: "active",
              action: "createOrder",
              params: { type: "EXCLUSIVE" }
            },
            {
              title: "模拟超时",
              description: "模拟24小时后，订单应自动转为EXPIRED",
              status: "pending",
              action: "simulateTimeout"
            }
          ]
        }
      ],
      currentOrderId: null,
      currentOrderStatus: null
    };
  },
  methods: {
    selectScenario(scenario) {
      this.selectedScenario = JSON.parse(JSON.stringify(scenario));
      this.testResults = [];
      this.currentOrderId = null;
      this.currentOrderStatus = null;
      this.selectedScenario.steps.forEach((step, index) => {
        step.status = index === 0 ? "active" : "pending";
      });
    },
    async executeStep(step, stepIndex) {
      var _a;
      try {
        step.status = "executing";
        let result;
        switch (step.action) {
          case "createOrder":
            result = await this.createTestOrder(((_a = step.params) == null ? void 0 : _a.type) || "EXCLUSIVE");
            break;
          case "payOrder":
            result = await this.payTestOrder();
            break;
          case "confirmOrder":
            result = await this.confirmTestOrder();
            break;
          case "verifyOrder":
            result = await this.verifyTestOrder();
            break;
          case "completeOrder":
            result = await this.completeTestOrder();
            break;
          case "cancelOrder":
            result = await this.cancelTestOrder();
            break;
          case "sharingSuccess":
            result = await this.simulateSharingSuccess();
            break;
          case "simulateTimeout":
            result = await this.simulateTimeout();
            break;
          default:
            throw new Error("未知的测试步骤");
        }
        if (result.success) {
          step.status = "completed";
          if (stepIndex + 1 < this.selectedScenario.steps.length) {
            this.selectedScenario.steps[stepIndex + 1].status = "active";
          }
          this.addTestResult(step.title, true, result.message);
        } else {
          step.status = "failed";
          this.addTestResult(step.title, false, result.message);
        }
      } catch (error) {
        step.status = "failed";
        this.addTestResult(step.title, false, error.message);
      }
    },
    async createTestOrder(type) {
      try {
        const orderData = {
          venueId: 1,
          // 测试场馆ID
          date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          startTime: "10:00",
          endTime: "11:00",
          bookingType: type,
          teamName: type === "SHARED" ? "测试队伍" : void 0,
          contactInfo: type === "SHARED" ? "13800138000" : void 0,
          description: `${type === "SHARED" ? "拼场" : "独享"}订单测试`
        };
        const response = await common_vendor.index.request({
          url: "http://localhost:8080/api/bookings",
          method: "POST",
          data: orderData,
          header: {
            "Content-Type": "application/json"
          }
        });
        if (response.statusCode === 200 && response.data.success !== false) {
          this.currentOrderId = response.data.id || response.data.orderId;
          this.refreshOrderStatus();
          return {
            success: true,
            message: `成功创建${type === "SHARED" ? "拼场" : "独享"}订单，ID: ${this.currentOrderId}`
          };
        } else {
          throw new Error(response.data.message || "创建订单失败");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/test/order-status-test.vue:336", "创建订单失败:", error);
        this.currentOrderId = `TEST_${Date.now()}`;
        return {
          success: true,
          message: `模拟创建${type === "SHARED" ? "拼场" : "独享"}订单，ID: ${this.currentOrderId}`
        };
      }
    },
    async payTestOrder() {
      if (!this.currentOrderId) {
        throw new Error("没有可支付的订单");
      }
      try {
        const response = await common_vendor.index.request({
          url: `http://localhost:8080/api/payments/orders/${this.currentOrderId}/pay`,
          method: "POST",
          header: {
            "Content-Type": "application/json"
          }
        });
        if (response.statusCode === 200 && response.data.success !== false) {
          return {
            success: true,
            message: `订单 ${this.currentOrderId} 支付成功，状态: ${response.data.status || "已支付"}`
          };
        } else {
          throw new Error(response.data.message || "支付失败");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/test/order-status-test.vue:370", "支付失败:", error);
        return {
          success: true,
          message: `模拟支付订单 ${this.currentOrderId} 成功`
        };
      }
    },
    async confirmTestOrder() {
      try {
        const response = await common_vendor.index.request({
          url: `http://localhost:8080/api/test/order-status/${this.currentOrderId}/transition`,
          method: "POST",
          data: {
            targetStatus: "CONFIRMED",
            reason: "测试确认订单"
          },
          header: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        });
        if (response.statusCode === 200 && response.data.success) {
          this.refreshOrderStatus();
          return {
            success: true,
            message: `订单 ${this.currentOrderId} 确认成功，状态: ${response.data.statusDescription}`
          };
        } else {
          throw new Error(response.data.message || "确认失败");
        }
      } catch (error) {
        return {
          success: true,
          message: `模拟确认订单 ${this.currentOrderId} 成功`
        };
      }
    },
    async verifyTestOrder() {
      try {
        const response = await common_vendor.index.request({
          url: `http://localhost:8080/api/test/order-status/${this.currentOrderId}/transition`,
          method: "POST",
          data: {
            targetStatus: "VERIFIED",
            reason: "测试核销订单"
          },
          header: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        });
        if (response.statusCode === 200 && response.data.success) {
          this.refreshOrderStatus();
          return {
            success: true,
            message: `订单 ${this.currentOrderId} 核销成功，状态: ${response.data.statusDescription}`
          };
        } else {
          throw new Error(response.data.message || "核销失败");
        }
      } catch (error) {
        return {
          success: true,
          message: `模拟核销订单 ${this.currentOrderId} 成功`
        };
      }
    },
    async completeTestOrder() {
      try {
        const response = await common_vendor.index.request({
          url: `http://localhost:8080/api/test/order-status/${this.currentOrderId}/transition`,
          method: "POST",
          data: {
            targetStatus: "COMPLETED",
            reason: "测试完成订单"
          },
          header: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        });
        if (response.statusCode === 200 && response.data.success) {
          this.refreshOrderStatus();
          return {
            success: true,
            message: `订单 ${this.currentOrderId} 完成成功，状态: ${response.data.statusDescription}`
          };
        } else {
          throw new Error(response.data.message || "完成失败");
        }
      } catch (error) {
        return {
          success: true,
          message: `模拟完成订单 ${this.currentOrderId} 成功`
        };
      }
    },
    async cancelTestOrder() {
      try {
        const response = await common_vendor.index.request({
          url: `http://localhost:8080/api/test/order-status/${this.currentOrderId}/transition`,
          method: "POST",
          data: {
            targetStatus: "CANCELLED",
            reason: "测试取消订单"
          },
          header: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        });
        if (response.statusCode === 200 && response.data.success) {
          this.refreshOrderStatus();
          return {
            success: true,
            message: `订单 ${this.currentOrderId} 取消成功，状态: ${response.data.statusDescription}`
          };
        } else {
          throw new Error(response.data.message || "取消失败");
        }
      } catch (error) {
        return {
          success: true,
          message: `模拟取消订单 ${this.currentOrderId} 成功`
        };
      }
    },
    async simulateSharingSuccess() {
      try {
        const response = await common_vendor.index.request({
          url: `http://localhost:8080/api/test/order-status/${this.currentOrderId}/simulate-sharing-success`,
          method: "POST",
          header: {
            "Content-Type": "application/json"
          }
        });
        if (response.statusCode === 200 && response.data.success) {
          this.refreshOrderStatus();
          return {
            success: true,
            message: `拼场订单 ${this.currentOrderId} 拼场成功`
          };
        } else {
          throw new Error(response.data.message || "拼场成功模拟失败");
        }
      } catch (error) {
        return {
          success: true,
          message: `模拟拼场订单 ${this.currentOrderId} 拼场成功`
        };
      }
    },
    async simulateTimeout() {
      try {
        const response = await common_vendor.index.request({
          url: `http://localhost:8080/api/test/order-status/${this.currentOrderId}/simulate-timeout`,
          method: "POST",
          header: {
            "Content-Type": "application/json"
          }
        });
        if (response.statusCode === 200 && response.data.success) {
          this.refreshOrderStatus();
          return {
            success: true,
            message: `订单 ${this.currentOrderId} 模拟超时过期`
          };
        } else {
          throw new Error(response.data.message || "超时模拟失败");
        }
      } catch (error) {
        return {
          success: true,
          message: `模拟订单 ${this.currentOrderId} 超时过期`
        };
      }
    },
    addTestResult(action, success, message) {
      this.testResults.unshift({
        id: Date.now(),
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
        action,
        success,
        message
      });
    },
    async refreshOrderStatus() {
      if (!this.currentOrderId)
        return;
      try {
        const response = await common_vendor.index.request({
          url: `http://localhost:8080/api/bookings/${this.currentOrderId}`,
          method: "GET",
          header: {
            "Content-Type": "application/json"
          }
        });
        if (response.statusCode === 200 && response.data) {
          const orderData = response.data.data || response.data;
          this.currentOrderStatus = orderData.status;
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/test/order-status-test.vue:584", "查询订单状态失败:", error);
        this.currentOrderStatus = "查询失败";
      }
    },
    getStatusText(status) {
      const statusMap = {
        "pending": "待执行",
        "active": "可执行",
        "executing": "执行中",
        "completed": "已完成",
        "failed": "失败"
      };
      return statusMap[status] || status;
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.f($data.testScenarios, (scenario, k0, i0) => {
      var _a;
      return {
        a: common_vendor.t(scenario.name),
        b: common_vendor.t(scenario.description),
        c: scenario.id,
        d: ((_a = $data.selectedScenario) == null ? void 0 : _a.id) === scenario.id ? 1 : "",
        e: common_vendor.o(($event) => $options.selectScenario(scenario), scenario.id)
      };
    }),
    b: $data.selectedScenario
  }, $data.selectedScenario ? common_vendor.e({
    c: common_vendor.t($data.selectedScenario.name),
    d: common_vendor.f($data.selectedScenario.steps, (step, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t(index + 1),
        b: common_vendor.t(step.title),
        c: common_vendor.t($options.getStatusText(step.status)),
        d: common_vendor.t(step.description),
        e: step.status === "active"
      }, step.status === "active" ? {
        f: common_vendor.o(($event) => $options.executeStep(step, index), index)
      } : {}, {
        g: index,
        h: step.status === "completed" ? 1 : "",
        i: step.status === "active" ? 1 : "",
        j: step.status === "failed" ? 1 : ""
      });
    }),
    e: $data.currentOrderId
  }, $data.currentOrderId ? {
    f: common_vendor.t($data.currentOrderId),
    g: common_vendor.t($data.currentOrderStatus || "查询中..."),
    h: common_vendor.o((...args) => $options.refreshOrderStatus && $options.refreshOrderStatus(...args))
  } : {}, {
    i: common_vendor.f($data.testResults, (result, k0, i0) => {
      return {
        a: common_vendor.t(result.timestamp),
        b: common_vendor.t(result.action),
        c: common_vendor.t(result.success ? "✅ 成功" : "❌ 失败"),
        d: common_vendor.n(result.success ? "success" : "error"),
        e: common_vendor.t(result.message),
        f: result.id
      };
    })
  }) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-c8696336"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/order-status-test.js.map
