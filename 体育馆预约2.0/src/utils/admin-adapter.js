const STATUS_TEXT_MAP = {
  PENDING: '待支付',
  PAID: '待核销',
  CONFIRMED: '待核销',
  SHARING_SUCCESS: '拼场成功(待核销)',
  OPEN: '开放中',
  APPROVED_PENDING_PAYMENT: '等待支付',
  VERIFIED: '已核销',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  EXPIRED: '已过期'
}

const STATUS_COLOR_MAP = {
  PENDING: '#ff9900',
  PAID: '#19be6b',
  CONFIRMED: '#19be6b',
  SHARING_SUCCESS: '#19be6b',
  OPEN: '#2979ff',
  APPROVED_PENDING_PAYMENT: '#ff9900',
  VERIFIED: '#2979ff',
  COMPLETED: '#909399',
  CANCELLED: '#fa3534',
  EXPIRED: '#909399'
}

export function adaptAdminStats(raw) {
  if (!raw) return {}
  return {
    totalOrders: raw.totalOrders ?? raw.total ?? 0,
    income: raw.income ?? raw.revenue ?? raw.estimatedRevenue ?? 0,
    pendingVerification: raw.pendingVerification ?? raw.waitVerify ?? 0,
    verified: raw.verified ?? raw.verifiedCount ?? 0,
    refundOrCancel: raw.refundOrCancel ?? raw.cancelledCount ?? 0,
    avgPrice: raw.avgPrice ?? raw.averagePrice ?? 0,
    completedIncome: raw.completedIncome ?? raw.completedRevenue ?? 0
  }
}

export function adaptAdminOrder(raw) {
  if (!raw) return null
  const status = raw.status || ''
  const refundType = raw.refundType || ''

  // CANCELLED + LOGIC_REFUND -> display as "已退款"
  let statusText = STATUS_TEXT_MAP[status] || status
  if (status === 'CANCELLED' && refundType === 'LOGIC_REFUND') {
    statusText = '已退款'
  }

  // 处理日期和时间字段
  let date = raw.bookingDate || raw.date || ''
  let startTime = raw.startTime || ''
  let endTime = raw.endTimeStr || ''

  // 如果 bookingTime 存在但 bookingDate/startTime 不存在，从 bookingTime 解析
  if (!date && raw.bookingTime) {
    const bookingTimeStr = String(raw.bookingTime)
    if (bookingTimeStr.includes('T')) {
      const parts = bookingTimeStr.split('T')
      date = parts[0]
      startTime = parts[1] ? parts[1].substring(0, 5) : ''
    }
  }

  // 如果 endTime 是完整的 DateTime 格式，只取时间部分
  if (!endTime && raw.endTime) {
    const endTimeStr = String(raw.endTime)
    if (endTimeStr.includes('T')) {
      endTime = endTimeStr.split('T')[1]?.substring(0, 5) || ''
    }
  }

  return {
    id: raw.id,
    orderNo: raw.orderNo || raw.verifyCode || '',
    venueName: raw.venueName || '',
    venueId: raw.venueId,
    date,
    startTime,
    endTime,
    price: raw.totalPrice ?? raw.price ?? 0,
    status,
    statusText,
    statusColor: STATUS_COLOR_MAP[status] || '#909399',
    type: raw.bookingType || raw.type || 'EXCLUSIVE',
    typeText: (raw.bookingType || raw.type) === 'SHARED' ? '拼场' : '包场',
    userName: raw.userName || raw.nickname || '',
    userPhone: raw.userPhone || raw.phone || '',
    phoneTail: (raw.userPhone || raw.phone || '').slice(-4),
    createTime: raw.createTime || raw.createdAt || '',
    refundType,
    verifyCode: raw.verifyCode || raw.orderNo || '',
    // Sharing fields
    sharingInfo: raw.sharingInfo || null,
    teamName: raw.teamName || raw.sharingInfo?.teamName || '',
    sharingDescription: raw.sharingDescription || raw.sharingInfo?.description || '',
    currentPeople: raw.currentPeople ?? raw.sharingInfo?.currentPeople ?? 0,
    totalPeople: raw.totalPeople ?? raw.sharingInfo?.totalPeople ?? 0,
    pricePerPerson: raw.pricePerPerson ?? raw.sharingInfo?.pricePerPerson ?? 0,
    participants: (raw.participants || raw.sharingInfo?.participants || []).map(adaptParticipant)
  }
}

export function adaptParticipant(raw) {
  if (!raw) return { name: '', phone: '', status: '', code: '' }
  return {
    name: raw.nickname || raw.name || raw.userName || '',
    phone: raw.maskedPhone || raw.phone || '',
    status: raw.verificationStatus || raw.status || '',
    code: raw.verifyCode || raw.code || '',
    userId: raw.userId || raw.id || ''
  }
}

export { STATUS_TEXT_MAP, STATUS_COLOR_MAP }
