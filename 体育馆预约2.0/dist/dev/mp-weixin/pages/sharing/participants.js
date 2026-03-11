"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_sharing = require("../../stores/sharing.js");
const api_sharing = require("../../api/sharing.js");
const _sfc_main = {
  name: "SharingParticipants",
  setup() {
    const sharingStore = stores_sharing.useSharingStore();
    return { sharingStore };
  },
  data() {
    return {
      orderId: "",
      sharingOrder: null,
      participants: [],
      loading: false,
      error: ""
    };
  },
  onLoad(options) {
    common_vendor.index.__f__("log", "at pages/sharing/participants.vue:113", "SharingParticipants onLoad:", options);
    this.orderId = (options == null ? void 0 : options.orderId) || "";
    if (!this.orderId) {
      common_vendor.index.showToast({ title: "订单ID缺失", icon: "none" });
      setTimeout(() => common_vendor.index.navigateBack(), 300);
      return;
    }
    this.load();
  },
  onPullDownRefresh() {
    this.load().finally(() => common_vendor.index.stopPullDownRefresh());
  },
  methods: {
    getInitial(name) {
      if (!name)
        return "友";
      return name.substring(0, 1).toUpperCase();
    },
    getAvatarClass(index, badgeText) {
      if (badgeText === "发起方")
        return "avatar-creator";
      const colors = ["bg-c1", "bg-c2", "bg-c3", "bg-c4", "bg-c5"];
      return colors[index % colors.length];
    },
    normalizeStatus(status) {
      return (status || "").toString().toUpperCase();
    },
    async load() {
      if (this.loading)
        return;
      this.loading = true;
      this.error = "";
      try {
        const [sharingOrderResp, receivedResp] = await Promise.all([
          api_sharing.getSharingOrderByMainOrderId(this.orderId),
          this.sharingStore.getReceivedRequestsList()
        ]);
        const sharingOrder = (sharingOrderResp == null ? void 0 : sharingOrderResp.data) || sharingOrderResp || null;
        this.sharingOrder = sharingOrder;
        const receivedRequests = (receivedResp == null ? void 0 : receivedResp.data) || (receivedResp == null ? void 0 : receivedResp.list) || receivedResp || [];
        const receivedList = Array.isArray(receivedRequests) ? receivedRequests : [];
        const sharingOrderId = sharingOrder == null ? void 0 : sharingOrder.id;
        const related = receivedList.filter((r) => {
          const rOrderId = r.orderId || r.mainOrderId;
          const rSharingOrderId = r.sharingOrderId;
          return sharingOrderId && rSharingOrderId == sharingOrderId || rOrderId && rOrderId == this.orderId;
        });
        const creator = sharingOrder ? [{
          key: `creator_${sharingOrder.creatorUsername || "creator"}`,
          username: sharingOrder.creatorUsername,
          teamName: sharingOrder.teamName,
          contact: sharingOrder.contactInfo,
          participantsCount: 1,
          badgeText: "发起方",
          badgeClass: "badge-creator"
        }] : [];
        const approvedStatuses = /* @__PURE__ */ new Set(["APPROVED_PENDING_PAYMENT", "PAID", "APPROVED"]);
        const members = related.map((r) => {
          const status = this.normalizeStatus(r.status);
          let badgeText = "申请中";
          let badgeClass = "badge-pending";
          if (status === "PENDING") {
            badgeText = "待处理";
            badgeClass = "badge-pending";
          } else if (approvedStatuses.has(status)) {
            badgeText = status === "APPROVED_PENDING_PAYMENT" ? "已同意(待支付)" : status === "PAID" ? "已支付" : "已完成";
            badgeClass = "badge-approved";
          } else if (status === "REJECTED") {
            badgeText = "已拒绝";
            badgeClass = "badge-rejected";
          } else if (status === "TIMEOUT_CANCELLED") {
            badgeText = "已超时";
            badgeClass = "badge-muted";
          } else if (status === "CANCELLED") {
            badgeText = "已取消";
            badgeClass = "badge-muted";
          }
          return {
            key: `req_${r.id}`,
            username: r.applicantName || r.applicantUsername,
            teamName: r.applicantTeamName,
            contact: r.applicantContact,
            participantsCount: r.participantsCount,
            badgeText,
            badgeClass
          };
        });
        const visibleMembers = members.filter((m) => {
          const statusText = m.badgeText || "";
          return statusText.startsWith("已同意") || statusText === "已支付" || statusText === "已完成" || statusText === "发起方";
        });
        this.participants = [...creator, ...visibleMembers];
      } catch (e) {
        this.error = (e == null ? void 0 : e.message) || "加载失败";
        this.participants = [];
      } finally {
        this.loading = false;
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.sharingOrder
  }, $data.sharingOrder ? {
    b: common_vendor.t($data.sharingOrder.venueName || "拼场活动"),
    c: common_vendor.t($data.sharingOrder.startTime || ""),
    d: common_vendor.t($data.sharingOrder.endTime || ""),
    e: common_vendor.t($data.sharingOrder.teamName || "-"),
    f: common_vendor.t($data.sharingOrder.currentParticipants || 0),
    g: common_vendor.t($data.sharingOrder.maxParticipants || 0)
  } : {}, {
    h: $data.loading
  }, $data.loading ? {} : $data.error ? {
    j: common_vendor.t($data.error),
    k: common_vendor.o((...args) => $options.load && $options.load(...args))
  } : common_vendor.e({
    l: common_vendor.t($data.participants.length),
    m: $data.participants.length === 0
  }, $data.participants.length === 0 ? {} : {
    n: common_vendor.f($data.participants, (p, index, i0) => {
      return common_vendor.e({
        a: common_vendor.t($options.getInitial(p.teamName || p.username)),
        b: common_vendor.n($options.getAvatarClass(index, p.badgeText)),
        c: p.badgeText === "发起方"
      }, p.badgeText === "发起方" ? {} : {}, {
        d: common_vendor.t(p.teamName || p.username || "神秘球友"),
        e: common_vendor.t(p.badgeText),
        f: common_vendor.n(p.badgeClass),
        g: common_vendor.t(p.participantsCount || 0),
        h: common_vendor.t(p.contact || "暂无"),
        i: p.key,
        j: p.badgeText === "发起方" ? 1 : ""
      });
    })
  }), {
    i: $data.error
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-bb53d9bf"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/sharing/participants.js.map
