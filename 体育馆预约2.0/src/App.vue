<script>
	import { setupRouterGuard } from '@/utils/router-guard-new.js'
	import { useUserStore } from '@/stores/user.js'
	import { useAppStore } from '@/stores/app.js'
	import { useVenueStore } from '@/stores/venue.js'
	import { useSharingStore } from '@/stores/sharing.js'
	import { useBookingStore } from '@/stores/booking.js'
	import { getToken, getUserInfo } from '@/utils/auth.js'
	import { isAdmin } from '@/utils/router-guard-new.js'
	// WebSocket功能已被移除

	export default {
		data() {
			return {
				userStore: null,
				appStore: null,
				venueStore: null,
				sharingStore: null,
				bookingStore: null
				// webSocketService已被移除
			}
		},
		onLaunch: function() {
		console.log('[App] 应用启动')

		// 初始化 Pinia stores
		console.log('🏪 初始化 Pinia stores')
		this.userStore = useUserStore()
		this.appStore = useAppStore()
		this.venueStore = useVenueStore()
		this.sharingStore = useSharingStore()
		this.bookingStore = useBookingStore()

		// 1. 立即设置新的路由守卫
		setupRouterGuard()

		// 2. 初始化用户状态（从本地存储恢复）
		this.userStore.initUserState()

		// 3. 设置所有Store的事件监听器
		console.log('🎧 设置所有Store的事件监听器')
		
		// 设置venue store的事件监听器
		this.venueStore.setupOrderExpiredListener()
		if (this.venueStore.setupAdditionalEventListeners) {
			this.venueStore.setupAdditionalEventListeners()
		}
		
		// 设置sharing store的事件监听器
		if (this.sharingStore.setupEventListeners) {
			this.sharingStore.setupEventListeners()
		}
		
		// 设置booking store的事件监听器（如果有的话）
		if (this.bookingStore.setupEventListeners) {
			this.bookingStore.setupEventListeners()
		}
		
		console.log('✅ 所有Store事件监听器设置完成')

		// WebSocket功能已被移除，不再初始化WebSocket连接

		// 5. 立即检查登录状态，未登录则跳转到登录页
		this.checkAndRedirectToLogin()

		// 6. 延迟执行非关键操作，提升启动速度
		this.$nextTick(() => {
			this.setupNetworkListener()
		})
	},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
			// WebSocket功能已被移除
		},
		methods: {
			
			// WebSocket功能已被移除，initWebSocket方法已删除
			
			// 检查登录状态并跳转到登录页
			checkAndRedirectToLogin() {
				try {
					console.log('[App] 检查登录状态')
					const token = getToken()
					const userInfo = getUserInfo()
					
					if (!token || !userInfo) {
						console.log('[App] 未登录，跳转到登录页')
						uni.reLaunch({
							url: '/pages/user/login'
						})
						return
					}

					// 管理员账号在自动编译/热重载后经常会落到用户端 TabBar 首页，这里强制分流到管理员工作台
					const pages = getCurrentPages()
					const currentPage = pages && pages.length ? `/${pages[pages.length - 1].route}` : ''
					if (isAdmin(userInfo) && (!currentPage || !currentPage.startsWith('/pages/admin/'))) {
						uni.reLaunch({ url: '/pages/admin/dashboard' })
						return
					}
					
					console.log('[App] 已登录，继续正常流程')
				} catch (error) {
					console.warn('[App] 登录状态检查失败:', error.message)
					// 检查失败时也跳转到登录页
					uni.reLaunch({
						url: '/pages/user/login'
					})
				}
			},
			
			// 设置网络监听
			setupNetworkListener() {
				uni.onNetworkStatusChange((res) => {
					this.appStore.setNetworkStatus(res.isConnected)
					if (!res.isConnected) {
						uni.showToast({
							title: '网络连接已断开',
							icon: 'none'
						})
					}
				})
			}
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
