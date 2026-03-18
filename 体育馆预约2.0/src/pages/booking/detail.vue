<template>
  <view class="container">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">正在加载订单详情...</text>
    </view>
    
    <!-- 数据为空状态 -->
    <view v-else-if="!bookingDetail || !bookingDetail.orderNo" class="empty-state">
      <text class="empty-text">订单信息不存在</text>
      <button class="retry-btn" @click="initData">重新加载</button>
    </view>
    
    <!-- 正常内容 -->
    <view v-else>
    <!-- 预约状态 -->
    <view class="status-section">
      <view class="status-icon" :class="getStatusClass(bookingDetail?.status)">
        <text>{{ getStatusIcon(bookingDetail?.status) }}</text>
      </view>
      <view class="status-info">
        <text class="status-text">{{ getStatusText(bookingDetail?.status) }}</text>
        <text class="status-desc">{{ getStatusDesc(bookingDetail?.status) }}</text>
      </view>
    </view>
    
    <!-- 预约信息 -->
    <view class="info-section">
      <view class="section-title">预约信息</view>
      
      <view class="info-item">
        <text class="info-label">预约编号</text>
        <text class="info-value">{{ bookingDetail?.orderNo || '--' }}</text>
      </view>
      
      <view class="info-item">
        <text class="info-label">场馆名称</text>
        <text class="info-value">{{ bookingDetail?.venueName || '--' }}</text>
      </view>
      
      <!-- 预约类型标注 -->
      <view class="info-item">
        <text class="info-label">预约类型</text>
        <view class="booking-type-container">
          <text class="info-value booking-type" :class="getBookingTypeClass(bookingDetail?.bookingType)">
            {{ getBookingTypeText(bookingDetail?.bookingType) }}
          </text>
          <!-- 虚拟订单标识 -->
          <text v-if="isVirtualOrder()" class="virtual-order-badge">拼场申请</text>
        </view>
      </view>
      
      <view class="info-item">
        <text class="info-label">场馆地址</text>
        <text class="info-value">{{ bookingDetail?.venueLocation || '--' }}</text>
      </view>
      
      <view class="info-item">
        <text class="info-label">预约日期</text>
        <text class="info-value">{{ formatBookingDate() }}</text>
      </view>
      
      <view class="info-item">
        <text class="info-label">预约时间</text>
        <text class="info-value">{{ formatBookingTime() }}</text>
      </view>
      
      <!-- 预约费用 - 根据订单类型显示不同内容 -->
      <template v-if="isVirtualOrder()">
        <!-- 虚拟订单（拼场申请）的价格显示 -->
        <view class="info-item">
          <text class="info-label">支付金额</text>
          <text class="info-value price" style="color: #722ed1; font-size: 36rpx;">
            ¥{{ getPaymentAmount() }}
          </text>
        </view>
        <view class="info-tip" style="font-size: 24rpx; color: #999; margin-top: 10rpx;">
          <text>拼场申请订单，支付成功后即可参与拼场</text>
        </view>
      </template>
      <template v-else-if="bookingDetail && bookingDetail.isSharedBooking">
        <!-- 普通拼场订单的价格显示 -->
        <view class="price-section" style="margin: 20rpx 0;">
          <view class="info-item">
            <text class="info-label">总费用</text>
            <text class="info-value price">¥{{ (bookingDetail && bookingDetail.totalOriginalPrice) || 0 }}</text>
          </view>
          <view class="info-item" style="color: #ff6b00; background-color: #fff8f0; padding: 10rpx; border-radius: 8rpx;">
            <text class="info-label" style="color: #ff6b00;">拼场优惠</text>
            <text class="info-value" style="color: #ff6b00;">
              ¥{{ ((bookingDetail && bookingDetail.totalOriginalPrice) - (bookingDetail && bookingDetail.totalPrice)) || 0 }}（5折）
            </text>
          </view>
          <view class="info-item" style="font-weight: bold; margin-top: 10rpx;">
            <text class="info-label">实付金额</text>
            <text class="info-value price" style="color: #ff6b00; font-size: 36rpx;">
              ¥{{ (bookingDetail && bookingDetail.totalPrice) || 0 }}
            </text>
          </view>
          <view class="info-tip" style="font-size: 24rpx; color: #999; margin-top: 10rpx;">
            <text>拼场订单，费用由两队均摊，每队支付总费用的50%</text>
          </view>
        </view>
      </template>
      <template v-else>
        <!-- 普通订单的价格显示 -->
        <view class="info-item">
          <text class="info-label">预约费用</text>
          <text class="info-value price">¥{{ (bookingDetail && bookingDetail.totalPrice) || 0 }}</text>
        </view>
      </template>
  
      <view class="info-item">
        <text class="info-label">创建时间</text>
        <text class="info-value">{{ formatCreateTime((bookingDetail && bookingDetail.createdAt) || (bookingDetail && bookingDetail.createTime)) }}</text>
      </view>
    </view>
    
    <!-- 联系信息 -->
    <view class="contact-section">
      <view class="section-title">联系信息</view>
      
      <view class="contact-item" @click="contactVenue">
        <view class="contact-icon">
          <text>📞</text>
        </view>
        <view class="contact-info">
          <text class="contact-label">场馆电话</text>
          <text class="contact-value">{{ (bookingDetail && bookingDetail.venuePhone) || '暂无点此复制' }}</text>
        </view>
        <view class="copy-location-btn">
          <text class="copy-text">复制</text>
        </view>
      </view>

      <view class="contact-item" @click="copyLocation">
        <view class="contact-icon">
          <text>📍</text>
        </view>
        <view class="contact-info">
          <text class="contact-label">导航到场馆</text>
          <text class="contact-value">{{ (bookingDetail && bookingDetail.venueLocation) || '暂无' }}</text>
        </view>
        <view class="copy-location-btn" @click.stop="copyLocation">
          <text class="copy-text">复制</text>
        </view>
      </view>
    </view>
    
    <!-- 拼场信息 -->
    <view v-if="bookingDetail && bookingDetail.sharingOrder" class="sharing-section">
      <view class="section-title">拼场信息</view>
      
      <view class="sharing-card" @click="navigateToSharingDetail">
        <view class="sharing-header">
          <text class="sharing-team">{{ (bookingDetail && bookingDetail.sharingOrder && bookingDetail.sharingOrder.teamName) || '' }}</text>
          <text class="sharing-status">{{ getSharingStatusText(bookingDetail && bookingDetail.sharingOrder && bookingDetail.sharingOrder.status) }}</text>
        </view>
        
        <view class="sharing-info">
          <text class="sharing-participants">
            当前人数：{{ (bookingDetail && bookingDetail.sharingOrder && bookingDetail.sharingOrder.currentParticipants) || 0 }}/{{ (bookingDetail && bookingDetail.sharingOrder && bookingDetail.sharingOrder.maxParticipants) || 0 }}人
          </text>
          <text class="sharing-price">人均：¥{{ (bookingDetail && bookingDetail.sharingOrder && bookingDetail.sharingOrder.pricePerPerson) || 0 }}</text>
        </view>
        
        <view class="sharing-desc">
          <text>{{ (bookingDetail && bookingDetail.sharingOrder && bookingDetail.sharingOrder.description) || '暂无说明' }}</text>
        </view>
      </view>
    </view>
    
    <!-- 操作按钮 -->
    <view class="action-section">
      <button v-if="bookingDetail && bookingDetail.status === 'PENDING'" class="action-btn cancel-btn" @click="showCancelModal">
        取消预约
      </button>

      <button v-if="bookingDetail && bookingDetail.status === 'PENDING'" class="action-btn pay-btn" @click="payBooking">
        立即支付
      </button>
      
      <!-- 已支付或已确认状态（待使用） -->
      <button v-if="bookingDetail && (bookingDetail.status === 'PAID' || bookingDetail.status === 'CONFIRMED' || bookingDetail.status === 'SHARING_SUCCESS' || bookingDetail.status === 'FULL')" class="action-btn checkin-btn" @click="showVerifyCodeModal">
        核销码
      </button>

      <button v-if="bookingDetail && (bookingDetail.status === 'PAID' || bookingDetail.status === 'CONFIRMED')" class="action-btn cancel-btn" @click="showCancelModal">
        取消预约
      </button>

      
      <button v-if="bookingDetail && bookingDetail.status === 'COMPLETED'" class="action-btn review-btn" @click="reviewVenue">
        评价场馆
      </button>
      
      <button class="action-btn rebook-btn" @click="rebookVenue">
        再次预约
      </button>
    </view>
    
    <!-- 取消预约确认弹窗 -->
    <uni-popup v-if="showCancelPopup" ref="cancelPopup" type="center" :mask-click="false">
      <view class="cancel-modal">
        <view class="modal-header">
          <text class="modal-title">取消预约</text>
        </view>
        
        <view class="modal-content">
          <text class="modal-text">确定要取消这个预约吗？</text>
          <text class="modal-note">取消后可能产生手续费，具体以场馆规定为准</text>
        </view>
        
        <view class="modal-actions">
          <button class="modal-btn cancel-btn" @click="closeCancelModal">暂不取消</button>
          <button class="modal-btn confirm-btn" @click="confirmCancel">确认取消</button>
        </view>
      </view>
    </uni-popup>

    <view v-if="showVerifyCodePopup" class="verify-code-overlay" @click="closeVerifyCodeModal">
      <view class="verify-code-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">请向前台出示此核销码</text>
        </view>

        <view class="verify-code-content">
          <text class="verify-code-text">{{ formatVerifyCodeDisplay(activeVerifyCode) }}</text>
          <text class="verify-code-tip">管理员将使用此码完成核销</text>
        </view>

        <view class="modal-actions">
          <button class="modal-btn cancel-btn" @click="closeVerifyCodeModal">关闭</button>
        </view>
      </view>
    </view>
    
    <!-- 优化后的联系场馆弹窗 -->
    <view v-if="showContactModal" class="contact-modal-overlay" @click="hideContactModal">
      <view class="contact-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">联系场馆</text>
        </view>
        <view class="modal-content">
          <text class="phone-text">{{ bookingDetail && bookingDetail.venuePhone }}</text>
          <text class="phone-desc">场馆服务热线，建议在工作时间拨打</text>
        </view>
        <view class="modal-actions">
          <button class="action-btn copy-btn" @click="copyPhone">复制号码</button>
        </view>
        <view class="modal-close-row">
           <button class="action-btn cancel-btn" @click="hideContactModal">取消</button>
        </view>
      </view>
    </view>
    </view>
  </view>
</template>

<script>
import { useBookingStore } from '@/stores/booking.js'
import { useVenueStore } from '@/stores/venue.js'
import { formatDate, formatDateTime, formatTime } from '@/utils/helpers.js'
import { clearCache } from '@/utils/request.js'
// 已移除popup-protection相关导入
// import { 
//   logPopupAction, 
//   initPagePopupProtection,
//   cleanupPagePopupProtection,
//   registerPagePopup
// } from '@/utils/popup-debug.js'

export default {
  name: 'BookingDetail',
  
  data() {
    return {
      bookingStore: null,
      venueStore: null,
      bookingId: '',
      showCancelPopup: false,
      showVerifyCodePopup: false,
      activeVerifyCode: '',
      showContactModal: false
    }
  },

  computed: {
    bookingDetail() {
      return this.bookingStore?.bookingDetailGetter || null
    },

    loading() {
      return this.bookingStore?.isLoading || false
    }
  },

  onLoad(options) {
    // 初始化Pinia stores
    this.bookingStore = useBookingStore()
    this.venueStore = useVenueStore()

    this.bookingId = options.id

    // 初始化弹窗状态
    this.internalCancelPopupOpened = false
    this.cancelPopupPosition = ''

    // 🔥 修复问题1: 监听订单取消事件
    uni.$on('orderCancelled', this.handleOrderCancelled)
    console.log('[BookingDetail] 已注册 orderCancelled 事件监听')

    this.initData()
  },

  onUnload() {
    // 已移除页面弹窗防护清理
    // cleanupPagePopupProtection('booking/detail')

    // 清理弹窗缓存引用
    this._cancelPopupRef = null

    // 🔥 修复问题1: 移除订单取消事件监听
    uni.$off('orderCancelled', this.handleOrderCancelled)
    console.log('[BookingDetail] 已移除 orderCancelled 事件监听')
  },
  
  onPullDownRefresh() {
    this.refreshData()
  },
  
  onShow() {
    try {
      if (this.bookingId) {
        this.bookingStore.getBookingDetail(this.bookingId, false)
          .then(() => this.$nextTick())
          .catch(() => {})
      }
    } catch (e) {}
  },
  
  mounted() {
    // 已移除弹窗组件注册
    // this.$nextTick(() => {
    //   registerPagePopup('booking/detail', 'cancelPopup', this.$refs.cancelPopup)
    // })
  },
  
  methods: {
    
    // 初始化数据
    async initData() {
      try {
        // 验证bookingId是否有效
        if (!this.bookingId) {
          throw new Error('订单ID无效，请重新进入页面')
        }

        if (this.bookingStore?.cache?.bookingDetails) {
          this.bookingStore.cache.bookingDetails.delete(this.bookingId)
          const numericBookingId = Number(this.bookingId)
          if (Number.isFinite(numericBookingId)) {
            this.bookingStore.cache.bookingDetails.delete(numericBookingId)
          }
        }
        clearCache(`/bookings/${this.bookingId}`)

        

        await this.bookingStore.getBookingDetail(this.bookingId, false)

        // 等待一下确保数据已经更新到store
        await this.$nextTick()

        // 检查数据是否有效
        if (!this.bookingDetail) {
          throw new Error('未能获取到订单数据，请检查网络连接')
        }

        if (!this.bookingDetail.orderNo && !this.bookingDetail.id) {
          throw new Error('订单数据不完整，订单可能不存在或已被删除')
        }

      } catch (error) {
        console.error('初始化数据失败:', error)
        
        uni.showModal({
          title: '加载失败',
          content: error.message || '无法获取订单详情，请检查订单号是否正确',
          showCancel: true,
          cancelText: '返回',
          confirmText: '重试',
          success: (res) => {
            if (res.confirm) {
              // 重试
              this.initData()
            } else {
              // 返回上一页
              uni.navigateBack()
            }
          }
        })
      }
    },
    
    // 刷新数据
    async refreshData() {
      try {
        await this.initData()
        uni.stopPullDownRefresh()
      } catch (error) {
        uni.stopPullDownRefresh()
        console.error('刷新数据失败:', error)
      }
    },

    // 🔥 修复问题1: 处理订单取消事件
    async handleOrderCancelled(eventData) {
      try {
        

        // 检查是否是当前订单
        if (eventData.orderId && eventData.orderId == this.bookingId) {
          

          // 立即刷新订单详情（跳过缓存，确保拿到最新状态）
          await this.bookingStore.getBookingDetail(this.bookingId, false)
          await this.$nextTick()

          
        }
      } catch (error) {
        console.error('[BookingDetail] ❌ 处理订单取消事件失败:', error)
      }
    },
    
    // 显示取消预约弹窗
    showCancelModal() {
      console.log('显示取消预约弹窗')
      this.showCancelPopup = true
      
      // 使用nextTick确保DOM更新后再打开弹窗
      this.$nextTick(() => {
        if (this.$refs.cancelPopup) {
          console.log('打开弹窗，cancelPopup ref:', this.$refs.cancelPopup)
          this.$refs.cancelPopup.open()
        } else {
          console.error('cancelPopup引用不存在，使用系统弹窗')
          this.showCancelPopup = false
          uni.showModal({
            title: '取消预约',
            content: '确定要取消这个预约吗？取消后可能产生手续费，具体以场馆规定为准',
            success: (res) => {
              if (res.confirm) {
                this.confirmCancel()
              }
            }
          })
        }
      })
    },
    
    // 关闭取消预约弹窗
    closeCancelModal() {
      console.log('关闭取消预约弹窗')
      
      // 先调用uni-popup的close方法
      if (this.$refs.cancelPopup) {
        this.$refs.cancelPopup.close()
      }
      
      // 然后设置showCancelPopup为false，移除DOM元素
      this.showCancelPopup = false
    },

    showVerifyCodeModal() {
      this.activeVerifyCode = this.getVerifyCode(this.bookingDetail)
      this.showVerifyCodePopup = true
    },

    closeVerifyCodeModal() {
      this.showVerifyCodePopup = false
    },
    
    // 确认取消
    async confirmCancel() {
      try {
        uni.showLoading({ title: '取消中...' })
        
        await this.bookingStore.cancelBooking(this.bookingId)
        
        uni.hideLoading()
        this.closeCancelModal()
        
        uni.showToast({
          title: '取消成功',
          icon: 'success'
        })

        // 🎯 关键修复：先快速刷新本页详情，立刻呈现最新状态（跳过缓存）
        try {
          await this.bookingStore.getBookingDetail(this.bookingId, false)
          await this.$nextTick()
        } catch (e) { console.warn('[BookingDetail] 快速刷新详情失败(忽略)：', e) }

        // 然后再进行跨页时间段刷新逻辑
        if (this.bookingDetail && typeof uni !== 'undefined' && uni.$emit) {
          const venueId = this.bookingDetail.venueId
          const date = this.bookingDetail.bookingDate || this.bookingDetail.date

          // 策略1：彻底清除所有层级的缓存
          try {

            // 1. 清除 Pinia venue store 缓存
            if (this.venueStore) {
              // 使用 venue store 的清除方法
              if (typeof this.venueStore.clearTimeSlotCache === 'function') {
                await this.venueStore.clearTimeSlotCache(venueId, date)
              }

              // 直接清除缓存 Map
              if (this.venueStore.cache && this.venueStore.cache.timeSlots) {
                const cacheKey = `${venueId}_${date}`
                this.venueStore.cache.timeSlots.delete(cacheKey)
                // 清除所有相关缓存
                this.venueStore.cache.timeSlots.clear()
              }

              // 重置时间段状态
              this.venueStore.setTimeSlots([])
              console.log('[BookingDetail] ✅ 已清除 venue store 缓存')
            }

            // 2. 清除缓存管理器缓存
            const { default: cacheManager } = await import('@/utils/cache-manager.js')
            if (cacheManager) {
              // 清除时间段相关的所有缓存
              cacheManager.clearTimeSlotCache(venueId, date)

              // 清除API层缓存
              const timeSlotKey = cacheManager.generateTimeSlotKey ? cacheManager.generateTimeSlotKey(venueId, date) : `timeslots_${venueId}_${date}`
              cacheManager.delete(timeSlotKey)

              console.log('[BookingDetail] ✅ 已清除缓存管理器缓存')
            }

            // 3. 清除统一时间段管理器缓存
            const { default: unifiedTimeSlotManager } = await import('@/utils/unified-timeslot-manager.js')
            if (unifiedTimeSlotManager) {
              unifiedTimeSlotManager.clearCache(venueId, date)
              console.log('[BookingDetail] ✅ 已清除统一时间段管理器缓存')
            }

            // 4. 清除本地存储缓存
            try {
              const storageKeys = [
                `gym_booking_timeslots_${venueId}_${date}`,
                `timeslots_${venueId}_${date}`,
                `venue_${venueId}_${date}`,
                `cache_timeslots_${venueId}_${date}`
              ]

              storageKeys.forEach(key => {
                try {
                  uni.removeStorageSync(key)
                } catch (e) {
                  // 忽略删除失败
                }
              })
              console.log('[BookingDetail] ✅ 已清除本地存储缓存')
            } catch (storageError) {
              console.warn('[BookingDetail] 清除本地存储缓存失败:', storageError)
            }

          } catch (error) {
            console.error('[BookingDetail] ❌ 清除缓存失败:', error)
          }

          // 策略2：发送强制刷新事件
          
          uni.$emit('force-refresh-timeslots', {
            venueId: venueId,
            date: date,
            reason: 'booking-cancelled-cache-clear',
            clearCache: true,
            forceRefresh: true,
            orderId: this.bookingId,
            timestamp: new Date().toISOString()
          })

          // 策略3：发送时间段更新事件
          uni.$emit('timeslot-updated', {
            venueId: venueId,
            date: date,
            action: 'booking-cancelled-immediate',
            bookingType: this.bookingDetail.bookingType,
            startTime: this.bookingDetail.startTime,
            endTime: this.bookingDetail.endTime,
            orderId: this.bookingId,
            immediate: true,
            clearCache: true,
            forceRefresh: true,
            timestamp: new Date().toISOString()
          })

          // 策略4：延迟发送额外的刷新事件，确保数据同步
          setTimeout(() => {
          
            uni.$emit('force-refresh-timeslots', {
              venueId: venueId,
              date: date,
              reason: 'booking-cancelled-delayed-refresh',
              clearCache: true,
              forceRefresh: true,
              orderId: this.bookingId,
              timestamp: new Date().toISOString()
            })
          }, 1000)

          
        }

        // 策略5：直接验证后端时间段状态
        try {
          
          const venueId = this.bookingDetail?.venueId
          const date = this.bookingDetail?.bookingDate || this.bookingDetail?.date
          if (!venueId || !date) {
            throw new Error('缺少场馆或日期，无法验证后端状态')
          }
          const { get } = await import('@/utils/request.js')
          const response = await get(`/timeslots/venue/${venueId}/date/${date}`, {
            _t: Date.now(),
            _nocache: 1
          }, {
            cache: false,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          })

          if (response && response.data) {
            

            // 查找11点到13点的时间段状态
            const targetSlots = response.data.filter(slot => {
              const startHour = parseInt(slot.startTime.split(':')[0])
              return startHour >= 11 && startHour < 13
            })

            
          }
        } catch (verifyError) {
          console.error('[BookingDetail] 验证后端状态失败:', verifyError)
        }

        // 如未处于已取消状态，再执行一次完整刷新
        if (!this.bookingDetail || this.bookingDetail.status !== 'CANCELLED') {
          await this.refreshData()
        }

      } catch (error) {
        uni.hideLoading()
        console.error('取消预约失败:', error)
        uni.showToast({
          title: error.message || '取消失败',
          icon: 'error'
        })
      }
    },

    // 🎯 使用统一时间段管理器立即释放时间段
    async useUnifiedTimeSlotManagerForRelease() {
      try {
        console.log('[BookingDetail] 🚨🚨🚨 开始使用统一时间段管理器立即释放时间段 🚨🚨🚨')
        console.log('[BookingDetail] 预约详情:', {
          venueId: this.bookingDetail.venueId,
          date: this.bookingDetail.bookingDate || this.bookingDetail.date,
          startTime: this.bookingDetail.startTime,
          endTime: this.bookingDetail.endTime,
          bookingType: this.bookingDetail.bookingType
        })

        // 动态导入统一时间段管理器
        const { default: unifiedTimeSlotManager } = await import('@/utils/unified-timeslot-manager.js')

        if (unifiedTimeSlotManager && typeof unifiedTimeSlotManager.immediateReleaseTimeSlots === 'function') {
          console.log('[BookingDetail] ✅ 统一时间段管理器可用，开始调用立即释放方法')
          await unifiedTimeSlotManager.immediateReleaseTimeSlots(
            this.bookingDetail.venueId,
            this.bookingDetail.bookingDate || this.bookingDetail.date,
            this.bookingDetail.startTime,
            this.bookingDetail.endTime,
            this.bookingDetail.bookingType || 'EXCLUSIVE'
          )
          console.log('[BookingDetail] 🎉 统一时间段管理器立即释放完成')
        } else {
          console.error('[BookingDetail] ❌ 统一时间段管理器不可用或方法不存在')
          console.log('[BookingDetail] unifiedTimeSlotManager:', unifiedTimeSlotManager)
          console.log('[BookingDetail] immediateReleaseTimeSlots 方法存在:', typeof unifiedTimeSlotManager?.immediateReleaseTimeSlots)
        }

      } catch (error) {
        console.error('[BookingDetail] ❌ 使用统一时间段管理器失败:', error)
      }
    },

    getVerifyCode(booking) {
      if (!booking) return ''
      if (booking.orderNo) return String(booking.orderNo)
      if (booking.id !== undefined && booking.id !== null) return String(booking.id)
      return ''
    },

    formatVerifyCodeDisplay(code) {
      if (!code) return '--'
      const compact = String(code).replace(/\s+/g, '')
      return compact.replace(/(.{4})/g, '$1 ').trim()
    },

    // 评价场馆
    reviewVenue() {
      uni.navigateTo({
        url: `/pages/venue/review?venueId=${this.bookingDetail.venueId}&bookingId=${this.bookingId}`
      })
    },
    
    // 支付订单
    payBooking() {
      if (!this.bookingDetail || !this.bookingDetail.id) {
        uni.showToast({
          title: '订单信息不完整',
          icon: 'none'
        })
        return
      }

      console.log('跳转到支付页面，订单ID:', this.bookingDetail.id)
      uni.navigateTo({
        url: `/pages/payment/index?orderId=${this.bookingDetail.id}&type=booking`
      })
    },

    // 再次预约
    rebookVenue() {
      uni.navigateTo({
        url: `/pages/venue/detail?id=${this.bookingDetail.venueId}`
      })
    },
    
    // 跳转到拼场详情
    navigateToSharingDetail() {
      if (this.bookingDetail.sharingOrder) {
        uni.navigateTo({
          url: `/pages/sharing/detail?id=${this.bookingDetail.sharingOrder.id}`
        })
      }
    },
    
    // 显示联系场馆弹窗
    contactVenue() {
      // 后端字段名是 venuePhone
      const phone = this.bookingDetail.venuePhone
      if (phone) {
        this.showContactModal = true
      } else {
        uni.showToast({
          title: '暂无联系方式',
          icon: 'none'
        })
      }
    },

    // 隐藏联系场馆弹窗
    hideContactModal() {
      this.showContactModal = false
    },
    
    // 复制电话号码
    copyPhone() {
      const phone = this.bookingDetail.venuePhone
      if (phone) {
        uni.setClipboardData({
          data: phone,
          success: () => {
            uni.showToast({
              title: '号码已复制',
              icon: 'success'
            })
            this.hideContactModal()
          }
        })
      }
    },

    // 复制场馆地址
    copyLocation() {
      const location = this.bookingDetail.venueLocation
      if (location) {
        uni.setClipboardData({
          data: location,
          success: () => {
            uni.showToast({
              title: '地址已复制',
              icon: 'success'
            })
          }
        })
      }
    },
    
    // 打开地图 (如果此后不再需要可以去掉，这里先保留防止被别处调用)
    openMap() {
      if (this.bookingDetail.venueLatitude && this.bookingDetail.venueLongitude) {
        uni.openLocation({
          latitude: this.bookingDetail.venueLatitude,
          longitude: this.bookingDetail.venueLongitude,
          name: this.bookingDetail.venueName,
          address: this.bookingDetail.venueLocation
        })
      } else {
        uni.showToast({
          title: '暂无位置信息',
          icon: 'none'
        })
      }
    },
    
    // 格式化日期
    formatDate(date) {
      return formatDate(date, 'YYYY年MM月DD日 dddd')
    },
    
    // 格式化日期时间
    formatDateTime(datetime) {
      return formatDateTime(datetime, 'YYYY-MM-DD HH:mm')
    },
    
    // 格式化创建时间
    formatCreateTime(datetime) {
      return formatTime(datetime, 'YYYY-MM-DD HH:mm')
    },
    
    // 获取状态样式类
    getStatusClass(status) {
      const statusMap = {
        'PENDING': 'status-pending',
        'PAID': 'status-paid', // 复用已支付样式
        'CONFIRMED': 'status-paid', // 复用已支付样式
        'SHARING_SUCCESS': 'status-paid', // 拼场成功视为已支付/待使用
        'FULL': 'status-paid', // 满员视为已支付/待使用
        'VERIFIED': 'status-completed', // 已核销视为完成
        'COMPLETED': 'status-completed',
        'CANCELLED': 'status-cancelled'
      }
      return statusMap[status] || 'status-pending'
    },
    
    // 获取状态图标
    getStatusIcon(status) {
      const iconMap = {
        'PENDING': '⏳',
        'PAID': '✅',
        'CONFIRMED': '✅',
        'SHARING_SUCCESS': '✅',
        'FULL': '✅',
        'VERIFIED': '🎉',
        'COMPLETED': '🎉',
        'CANCELLED': '❌'
      }
      return iconMap[status] || '⏳'
    },
    
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        'PENDING': '待支付',
        'PAID': '待使用',
        'CONFIRMED': '待使用', // 兼容
        'SHARING_SUCCESS': '拼场成功',
        'FULL': '已满员',
        'VERIFIED': '已核销',
        'COMPLETED': '已完成',
        'CANCELLED': '已取消'
      }
      return statusMap[status] || '待确认'
    },
    
    // 获取状态描述
    getStatusDesc(status) {
      const descMap = {
        'PENDING': '请尽快完成支付，超时将自动取消',
        'PAID': '您已成功预订，请向前台出示核销码',
        'CONFIRMED': '您已成功预订，请向前台出示核销码',
        'SHARING_SUCCESS': '拼场成功，请向前台出示核销码',
        'FULL': '拼场已满员，请向前台出示核销码',
        'VERIFIED': '核销成功，祝您运动愉快',
        'COMPLETED': '预约已完成，感谢您的使用',
        'CANCELLED': '预约已取消'
      }
      return descMap[status] || ''
    },
    
    // 获取拼场状态文本
    getSharingStatusText(status) {
      const statusMap = {
        'RECRUITING': '招募中',
        'FULL': '已满员',
        'COMPLETED': '已完成',
        'CANCELLED': '已取消'
      }
      return statusMap[status] || '招募中'
    },
    
    // 获取预约类型文本
    getBookingTypeText(bookingType) {
      const typeMap = {
        'EXCLUSIVE': '包场',
        'SHARED': '拼场'
      }
      return typeMap[bookingType] || '--'
    },
    
    // 获取预约类型样式类
    getBookingTypeClass(bookingType) {
      const classMap = {
        'EXCLUSIVE': 'booking-type-exclusive',
        'SHARED': 'booking-type-shared'
      }
      return classMap[bookingType] || ''
    },

    // 检查是否是虚拟订单
    isVirtualOrder() {
      if (!this.bookingDetail) return false
      const bookingId = typeof this.bookingDetail.id === 'string' ? parseInt(this.bookingDetail.id) : this.bookingDetail.id
      return bookingId < 0
    },

    // 获取支付金额（兼容虚拟订单和普通订单）
    getPaymentAmount() {
      if (!this.bookingDetail) return '0.00'

      if (this.isVirtualOrder()) {
        // 虚拟订单使用 paymentAmount
        const amount = this.bookingDetail.paymentAmount || 0
        return amount.toFixed(2)
      } else {
        // 普通订单使用 totalPrice
        const amount = this.bookingDetail.totalPrice || 0
        return amount.toFixed(2)
      }
    },

    // 格式化预约日期（兼容虚拟订单和普通订单）
    formatBookingDate() {
      if (!this.bookingDetail) return '--'

      if (this.isVirtualOrder()) {
        // 虚拟订单从 bookingTime 中提取日期
        const bookingTime = this.bookingDetail.bookingTime
        if (!bookingTime) return '--'

        try {
          let dateTime
          if (typeof bookingTime === 'string') {
            let isoTime = bookingTime
            if (bookingTime.includes(' ') && !bookingTime.includes('T')) {
              isoTime = bookingTime.replace(' ', 'T')
            }
            dateTime = new Date(isoTime)
          } else {
            dateTime = new Date(bookingTime)
          }

          if (isNaN(dateTime.getTime())) {
            console.error('虚拟订单日期格式化错误 - 无效的时间:', bookingTime)
            return '--'
          }

          return dateTime.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/\//g, '-')
        } catch (error) {
          console.error('虚拟订单日期格式化错误:', error)
          return '--'
        }
      } else {
        // 普通订单使用 bookingDate 字段
        if (this.bookingDetail.bookingDate) {
          return this.formatDate(this.bookingDetail.bookingDate)
        }
        return '--'
      }
    },

    // 格式化预约时间（兼容虚拟订单和普通订单）
    formatBookingTime() {
      if (!this.bookingDetail) return '--'

      if (this.isVirtualOrder()) {
        // 虚拟订单使用 bookingTime 和 endTime (LocalDateTime格式: "yyyy-MM-dd HH:mm:ss")
        const startTime = this.bookingDetail.bookingTime
        const endTime = this.bookingDetail.endTime

        if (!startTime) return '--'

        try {
          // 处理后端返回的时间格式 "yyyy-MM-dd HH:mm:ss"，转换为iOS兼容格式
          let startDateTime, endDateTime

          if (typeof startTime === 'string') {
            // 确保iOS兼容性：将空格替换为T
            let isoTime = startTime
            if (startTime.includes(' ') && !startTime.includes('T')) {
              isoTime = startTime.replace(' ', 'T')
            }
            startDateTime = new Date(isoTime)
            console.log('预约详情时间转换 - 原始:', startTime, '转换后:', isoTime, '解析结果:', startDateTime)
          } else {
            startDateTime = new Date(startTime)
          }

          if (endTime) {
            if (typeof endTime === 'string') {
              let isoEndTime = endTime
              if (endTime.includes(' ') && !endTime.includes('T')) {
                isoEndTime = endTime.replace(' ', 'T')
              }
              endDateTime = new Date(isoEndTime)
              console.log('预约详情结束时间转换 - 原始:', endTime, '转换后:', isoEndTime, '解析结果:', endDateTime)
            } else {
              endDateTime = new Date(endTime)
            }
          }

          // 检查日期是否有效
          if (isNaN(startDateTime.getTime())) {
            console.error('虚拟订单时间格式化错误 - 无效的开始时间:', startTime)
            return '--'
          }

          // 格式化开始时间 (HH:mm)
          const startTimeStr = startDateTime.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })

          // 格式化结束时间 (HH:mm)
          let endTimeStr = ''
          if (endDateTime && !isNaN(endDateTime.getTime())) {
            endTimeStr = endDateTime.toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })
          }

          return endTimeStr ? `${startTimeStr} - ${endTimeStr}` : startTimeStr
        } catch (error) {
          console.error('虚拟订单时间格式化错误:', error)
          return '--'
        }
      } else {
        // 普通订单使用 startTime 和 endTime
        if (this.bookingDetail.startTime && this.bookingDetail.endTime) {
          return `${this.bookingDetail.startTime} - ${this.bookingDetail.endTime}`
        }
        return '--'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 120rpx;
}

// 状态区域
.status-section {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  padding: 40rpx 30rpx;
  margin-bottom: 20rpx;
  
  .status-icon {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48rpx;
    margin-right: 30rpx;
    
    &.status-pending {
      background-color: #fff7e6;
    }
    
    &.status-confirmed {
      background-color: #e6f7ff;
    }
    
    &.status-completed {
      background-color: #f6ffed;
    }
    
    &.status-cancelled {
      background-color: #fff2f0;
    }
  }
  
  .status-info {
    flex: 1;
    
    .status-text {
      display: block;
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
      margin-bottom: 8rpx;
    }
    
    .status-desc {
      font-size: 24rpx;
      color: #666666;
    }
  }
}

// 信息区域
.info-section,
.contact-section,
.sharing-section {
  background-color: #ffffff;
  margin-bottom: 20rpx;
  
  .section-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
    padding: 30rpx 30rpx 20rpx;
    border-bottom: 1rpx solid #f0f0f0;
  }
}

// 预约信息
.info-section {
  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 30rpx;
    border-bottom: 1rpx solid #f8f8f8;
    
    &:last-child {
      border-bottom: none;
    }
    
    .info-label {
      font-size: 28rpx;
      color: #666666;
    }
    
    .info-value {
      font-size: 28rpx;
      color: #333333;
      text-align: right;
      max-width: 60%;
      
      &.price {
        color: #ff6b35;
        font-weight: 600;
      }
      
      &.booking-type {
        padding: 8rpx 16rpx;
        border-radius: 20rpx;
        font-size: 24rpx;
        font-weight: 500;

        &.booking-type-exclusive {
          background-color: #e6f7ff;
          color: #1890ff;
        }

        &.booking-type-shared {
          background-color: #fff7e6;
          color: #fa8c16;
        }
      }
    }

    // 预约类型容器
    .booking-type-container {
      display: flex;
      align-items: center;
      gap: 12rpx;
    }

    // 虚拟订单标识
    .virtual-order-badge {
      font-size: 20rpx;
      padding: 4rpx 12rpx;
      border-radius: 12rpx;
      background-color: #f9f0ff;
      color: #722ed1;
      border: 1rpx solid #722ed1;
    }
  }
}

// 联系信息
.contact-section {
  .contact-item {
    display: flex;
    align-items: center;
    padding: 24rpx 30rpx;
    border-bottom: 1rpx solid #f8f8f8;
    
    &:last-child {
      border-bottom: none;
    }
    
    .contact-icon {
      width: 60rpx;
      height: 60rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32rpx;
      margin-right: 20rpx;
    }
    
    .contact-info {
      flex: 1;
      
      .contact-label {
        display: block;
        font-size: 28rpx;
        color: #333333;
        margin-bottom: 4rpx;
      }
      
      .contact-value {
        font-size: 24rpx;
        color: #666666;
      }
    }
    
    .copy-location-btn {
      display: flex;
      align-items: center;
      padding: 6rpx 20rpx;
      background-color: #f5f5f5;
      border-radius: 8rpx;
      margin-left: 10rpx;
      
      .copy-text {
        font-size: 24rpx;
        color: #666666;
      }
      
      &:active {
        background-color: #e8e8e8;
      }
    }
  }
}

// 联系场馆弹窗
.contact-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.contact-modal {
  width: 600rpx;
  background-color: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  .modal-header {
    padding: 30rpx;
    text-align: center;
    border-bottom: 1rpx solid #f0f0f0;
    
    .modal-title {
      font-size: 34rpx;
      font-weight: 600;
      color: #333333;
    }
  }
  
  .modal-content {
    padding: 50rpx 40rpx;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .phone-text {
      font-size: 48rpx;
      font-weight: bold;
      color: #ff6b35;
      margin-bottom: 20rpx;
      letter-spacing: 2rpx;
    }
    
    .phone-desc {
      font-size: 26rpx;
      color: #888888;
    }
  }
  
  .modal-actions {
    display: flex;
    padding: 0 40rpx;
    justify-content: space-between;
    gap: 30rpx;
    margin-bottom: 30rpx;
    
    .action-btn {
      flex: 1;
      height: 80rpx;
      border-radius: 40rpx;
      font-size: 28rpx;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      
      &::after {
        border: none;
      }
    }
    
    .copy-btn {
      background-color: #ff6b35;
      color: #ffffff;
    }
  }

  .modal-close-row {
    padding: 0 40rpx 30rpx;
    
    .cancel-btn {
      width: 100%;
      height: 80rpx;
      background-color: #f5f5f5;
      color: #666666;
      border-radius: 40rpx;
      font-size: 28rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      
      &::after {
        border: none;
      }
    }
  }
}

// 拼场信息
.sharing-section {
  .sharing-card {
    padding: 30rpx;
    
    .sharing-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16rpx;
      
      .sharing-team {
        font-size: 28rpx;
        font-weight: 600;
        color: #333333;
      }
      
      .sharing-status {
        font-size: 22rpx;
        padding: 6rpx 16rpx;
        background-color: #e6f7ff;
        color: #1890ff;
        border-radius: 16rpx;
      }
    }
    
    .sharing-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16rpx;
      
      .sharing-participants,
      .sharing-price {
        font-size: 24rpx;
        color: #666666;
      }
      
      .sharing-price {
        color: #ff6b35;
        font-weight: 600;
      }
    }
    
    .sharing-desc {
      font-size: 24rpx;
      color: #999999;
      line-height: 1.4;
    }
  }
}

// 操作按钮
.actions-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background-color: #ffffff;
  padding: 20rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
  z-index: 100;
  
  .action-btn {
    flex: 1;
    height: 80rpx;
    border-radius: 8rpx;
    font-size: 28rpx;
    margin-right: 20rpx;
    border: 1rpx solid;
    
    &:last-child {
      margin-right: 0;
    }
    
    &.checkin-btn {
      background-color: #52c41a;
      color: #ffffff;
      border-color: #52c41a;
    }

    &.cancel-btn {
      background-color: transparent;
      color: #ff4d4f;
      border-color: #ff4d4f;
    }
    
    &.share-btn {
      background-color: #ff6b35;
      color: #ffffff;
      border-color: #ff6b35;
    }
    
    &.review-btn {
      background-color: transparent;
      color: #1890ff;
      border-color: #1890ff;
    }
    
    &.rebook-btn {
      background-color: #ff6b35;
      color: #ffffff;
      border-color: #ff6b35;
    }
  }
}

// 取消弹窗
.cancel-modal {
  width: 600rpx;
  max-width: 90vw;
  background-color: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  margin: 0 auto;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
  position: relative;
  
  .modal-header {
    padding: 30rpx;
    text-align: center;
    border-bottom: 1rpx solid #f0f0f0;
    width: 100%;
    
    .modal-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
    }
  }
  
  .modal-content {
    padding: 40rpx 30rpx;
    text-align: center;
    width: 100%;
    
    .modal-text {
      display: block;
      font-size: 28rpx;
      color: #333333;
      margin-bottom: 16rpx;
    }
    
    .modal-note {
      font-size: 24rpx;
      color: #999999;
    }
  }
  
  .modal-actions {
    display: flex;
    border-top: 1rpx solid #f0f0f0;
    width: 100%;
    
    .modal-btn {
      flex: 1;
      height: 100rpx;
      border: none;
      font-size: 28rpx;
      
      &.cancel-btn {
        background-color: #f5f5f5;
        color: #666666;
      }
      
      &.confirm-btn {
        background-color: #ff6b35;
        color: #ffffff;
      }
    }
  }
}

.verify-code-overlay {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10000;
}

.verify-code-modal {
  width: 600rpx;
  max-width: 90vw;
  background-color: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  margin: 0 auto;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
  position: relative;

  .modal-header {
    padding: 30rpx;
    text-align: center;
    border-bottom: 1rpx solid #f0f0f0;
    width: 100%;

    .modal-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
    }
  }

  .verify-code-content {
    padding: 40rpx 30rpx;
    text-align: center;
    width: 100%;

    .verify-code-text {
      display: block;
      width: 100%;
      box-sizing: border-box;
      padding: 0 12rpx;
      font-size: 44rpx;
      font-weight: 700;
      line-height: 1.35;
      letter-spacing: 2rpx;
      color: #ff6b35;
      margin-bottom: 16rpx;
      white-space: normal;
      word-break: break-all;
      overflow-wrap: anywhere;
    }

    .verify-code-tip {
      font-size: 24rpx;
      color: #999999;
    }
  }

  .modal-actions {
    display: flex;
    border-top: 1rpx solid #f0f0f0;
    width: 100%;

    .modal-btn {
      flex: 1;
      height: 100rpx;
      border: none;
      font-size: 28rpx;

      &.cancel-btn {
        background-color: #f5f5f5;
        color: #666666;
      }
    }
  }
}

// 加载状态
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400rpx;
  
  .loading-text {
    font-size: 28rpx;
    color: #999999;
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 400rpx;
  
  .empty-text {
    font-size: 28rpx;
    color: #999999;
    margin-bottom: 30rpx;
  }
  
  .retry-btn {
    padding: 16rpx 32rpx;
    background-color: #007aff;
    color: #ffffff;
    border: none;
    border-radius: 8rpx;
    font-size: 26rpx;
  }
}
</style>
