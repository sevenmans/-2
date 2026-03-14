"use strict";
const STATUS_TEXT_MAP = {
  PENDING: "待支付",
  PAID: "待核销",
  CONFIRMED: "待核销",
  SHARING_SUCCESS: "拼场成功(待核销)",
  OPEN: "开放中",
  APPROVED_PENDING_PAYMENT: "等待支付",
  VERIFIED: "已核销",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
  EXPIRED: "已过期"
};
const STATUS_COLOR_MAP = {
  PENDING: "#ff9900",
  PAID: "#19be6b",
  CONFIRMED: "#19be6b",
  SHARING_SUCCESS: "#19be6b",
  OPEN: "#2979ff",
  APPROVED_PENDING_PAYMENT: "#ff9900",
  VERIFIED: "#2979ff",
  COMPLETED: "#909399",
  CANCELLED: "#fa3534",
  EXPIRED: "#909399"
};
function adaptAdminStats(raw) {
  if (!raw)
    return {};
  return {
    totalOrders: raw.totalOrders ?? raw.total ?? 0,
    income: raw.income ?? raw.revenue ?? raw.estimatedRevenue ?? 0,
    pendingVerification: raw.pendingVerification ?? raw.waitVerify ?? 0,
    verified: raw.verified ?? raw.verifiedCount ?? 0,
    refundOrCancel: raw.refundOrCancel ?? raw.cancelledCount ?? 0,
    avgPrice: raw.avgPrice ?? raw.averagePrice ?? 0,
    completedIncome: raw.completedIncome ?? raw.completedRevenue ?? 0
  };
}
function adaptAdminOrder(raw) {
  var _a, _b, _c, _d, _e, _f, _g;
  if (!raw)
    return null;
  const status = raw.status || "";
  const refundType = raw.refundType || "";
  let statusText = STATUS_TEXT_MAP[status] || status;
  if (status === "CANCELLED" && refundType === "LOGIC_REFUND") {
    statusText = "已退款";
  }
  let date = raw.bookingDate || raw.date || "";
  let startTime = raw.startTime || "";
  let endTime = raw.endTimeStr || "";
  if (!date && raw.bookingTime) {
    const bookingTimeStr = String(raw.bookingTime);
    if (bookingTimeStr.includes("T")) {
      const parts = bookingTimeStr.split("T");
      date = parts[0];
      startTime = parts[1] ? parts[1].substring(0, 5) : "";
    }
  }
  if (!endTime && raw.endTime) {
    const endTimeStr = String(raw.endTime);
    if (endTimeStr.includes("T")) {
      endTime = ((_a = endTimeStr.split("T")[1]) == null ? void 0 : _a.substring(0, 5)) || "";
    }
  }
  return {
    id: raw.id,
    orderNo: raw.orderNo || raw.verifyCode || "",
    venueName: raw.venueName || "",
    venueId: raw.venueId,
    date,
    startTime,
    endTime,
    price: raw.totalPrice ?? raw.price ?? 0,
    status,
    statusText,
    statusColor: STATUS_COLOR_MAP[status] || "#909399",
    type: raw.bookingType || raw.type || "EXCLUSIVE",
    typeText: (raw.bookingType || raw.type) === "SHARED" ? "拼场" : "包场",
    userName: raw.userName || raw.nickname || "",
    userPhone: raw.userPhone || raw.phone || "",
    phoneTail: (raw.userPhone || raw.phone || "").slice(-4),
    createTime: raw.createTime || raw.createdAt || "",
    refundType,
    verifyCode: raw.verifyCode || raw.orderNo || "",
    // Sharing fields
    sharingInfo: raw.sharingInfo || null,
    teamName: raw.teamName || ((_b = raw.sharingInfo) == null ? void 0 : _b.teamName) || "",
    sharingDescription: raw.sharingDescription || ((_c = raw.sharingInfo) == null ? void 0 : _c.description) || "",
    currentPeople: raw.currentPeople ?? ((_d = raw.sharingInfo) == null ? void 0 : _d.currentPeople) ?? 0,
    totalPeople: raw.totalPeople ?? ((_e = raw.sharingInfo) == null ? void 0 : _e.totalPeople) ?? 0,
    pricePerPerson: raw.pricePerPerson ?? ((_f = raw.sharingInfo) == null ? void 0 : _f.pricePerPerson) ?? 0,
    participants: (raw.participants || ((_g = raw.sharingInfo) == null ? void 0 : _g.participants) || []).map(adaptParticipant)
  };
}
function adaptParticipant(raw) {
  if (!raw)
    return { name: "", phone: "", status: "", code: "" };
  return {
    name: raw.nickname || raw.name || raw.userName || "",
    phone: raw.maskedPhone || raw.phone || "",
    status: raw.verificationStatus || raw.status || "",
    code: raw.verifyCode || raw.code || "",
    userId: raw.userId || raw.id || ""
  };
}
exports.adaptAdminOrder = adaptAdminOrder;
exports.adaptAdminStats = adaptAdminStats;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/admin-adapter.js.map
