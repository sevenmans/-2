import { createPinia } from 'pinia'

// 创建pinia实例
export const pinia = createPinia()

// 导出所有store以便统一管理
export { useAppStore } from './app.js'
export { useUserStore } from './user.js'
export { useVenueStore } from './venue.js'
export { useBookingStore } from './booking.js'
export { useSharingStore } from './sharing.js'

export default pinia
