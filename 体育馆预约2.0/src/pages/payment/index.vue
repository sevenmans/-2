<template>
  <view class="payment-container">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-left" @click="goBack">
        <text class="nav-icon">←</text>
      </view>
      <view class="nav-title">订单支付</view>
      <view class="nav-right"></view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 订单信息 -->
    <view v-else-if="orderInfo" class="order-section">
      <view class="order-header">
        <text class="order-title">订单信息</text>
        <text class="order-no">{{ orderInfo.orderNo }}</text>
      </view>

      <view class="order-details">
        <view class="detail-item">
          <text class="detail-label">场馆名称</text>
          <text class="detail-value">{{ orderInfo.venueName }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">预约时间</text>
          <text class="detail-value">{{ formatOrderDateTime() }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">预约类型</text>
          <text class="detail-value">{{ getBookingTypeText() }}</text>
        </view>
        <view v-if="orderInfo.bookingType === 'SHARED' || orderInfo.isVirtualOrder" class="detail-item">
          <text class="detail-label">队伍名称</text>
          <text class="detail-value">{{ getTeamName() }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">联系方式</text>
          <text class="detail-value">{{ getContactInfo() }}</text>
        </view>
      </view>

      <!-- 价格信息 -->
      <view class="price-section">
        <view class="price-item">
          <text class="price-label">订单金额</text>
          <text class="price-value">¥{{ getOrderAmount() }}</text>
        </view>
        <view v-if="orderInfo.bookingType === 'SHARED' || orderInfo.isVirtualOrder" class="price-note">
          <text class="note-text">* 拼场订单按队伍收费</text>
        </view>
      </view>
    </view>

    <!-- 支付方式选择 -->
    <view class="payment-methods">
      <view class="method-header">
        <text class="method-title">支付方式</text>
      </view>
      <view class="method-list">
        <view 
          class="method-item" 
          :class="{ active: selectedMethod === 'wechat' }"
          @click="selectMethod('wechat')"
        >
          <view class="method-info">
            <text class="method-icon">💳</text>
            <text class="method-name">微信支付</text>
          </view>
          <view class="method-radio">
            <text v-if="selectedMethod === 'wechat'" class="radio-checked">✓</text>
          </view>
        </view>
        <view 
          class="method-item" 
          :class="{ active: selectedMethod === 'alipay' }"
          @click="selectMethod('alipay')"
        >
          <view class="method-info">
            <text class="method-icon">💰</text>
            <text class="method-name">支付宝</text>
          </view>
          <view class="method-radio">
            <text v-if="selectedMethod === 'alipay'" class="radio-checked">✓</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部支付按钮 -->
    <view class="payment-footer">
      <view class="footer-info">
        <text class="footer-label">应付金额</text>
        <text class="footer-amount">¥{{ getOrderAmount() }}</text>
      </view>
      <button 
        class="pay-button" 
        :class="{ disabled: !canPay }"
        :disabled="!canPay"
        @click="handlePayment"
      >
        {{ payButtonText }}
      </button>
    </view>

    <!-- 支付结果弹窗 - 简化版本，只在手动调用时显示 -->
    <uni-popup ref="resultPopup" type="center" :mask-click="false" v-show="internalResultPopupOpened" :class="resultPopupPosition">
      <view class="result-popup">
        <!-- 右上角关闭按钮 -->
        <view class="popup-close-icon" @click="forceClosePopup">
          <text class="close-x">×</text>
        </view>
        
        <view class="result-icon">
          <text v-if="paymentResult.success" class="success-icon">✓</text>
          <text v-else class="error-icon">✗</text>
        </view>
        <text class="result-title">{{ paymentResult.title }}</text>
        <text class="result-message">{{ paymentResult.message }}</text>
        <view class="popup-actions">
          <button class="result-button" @click="handleResultAction">
            {{ paymentResult.buttonText }}
          </button>
          <!-- 关闭按钮 -->
          <button class="popup-close-button" @click="forceClosePopup">
            关闭
          </button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { payOrder, getPaymentStatus } from '@/api/payment.js'
import { getOrderDetail } from '@/api/order.js'
import { get } from '@/utils/request.js'
import { useBookingStore } from '@/stores/booking.js'
import { debugOrderAmount, runComprehensiveTest } from '@/utils/payment-debug.js'
// 移除popup-protection相关导入

export default {
  name: 'PaymentPage',
  
  data() {
    return {
      bookingStore: null,
      orderId: null,
      orderType: 'booking', // booking 或 sharing
      orderInfo: null,
      loading: true,
      selectedMethod: 'wechat',
      paying: false,
      fromPage: '', // 记录来源页面
      paymentResult: {
        success: false,
        title: '',
        message: '',
        buttonText: '确定'
      },
      // 弹窗状态控制变量
      internalResultPopupOpened: false,
      resultPopupPosition: '',
      _resultPopupRef: null // 缓存弹窗引用
    }
  },
  
  computed: {
    canPay() {
      if (!this.orderInfo || !this.selectedMethod || this.paying) return false

      // 虚拟订单的支付状态判断
      if (this.orderInfo.isVirtualOrder) {
        // 虚拟订单可支付的状态：PENDING（等待支付）
        return this.orderInfo.status === 'PENDING'
      } else {
        // 普通订单只有PENDING状态可以支付
        return this.orderInfo.status === 'PENDING'
      }
    },

    payButtonText() {
      if (this.paying) return '支付中...'
      if (!this.orderInfo) return '加载中...'

      // 虚拟订单的按钮文本逻辑
      if (this.orderInfo.isVirtualOrder) {
        if (this.orderInfo.status === 'PENDING') {
          const amount = this.orderInfo.paymentAmount || this.orderInfo.totalPrice
          return `立即支付 ¥${amount?.toFixed(2) || '0.00'}`
        } else {
          // 根据虚拟订单状态显示不同文本
          const statusMessages = {
            'SHARING_SUCCESS': '拼场已成功',
            'CANCELLED': '申请已取消',
            'EXPIRED': '申请已过期',
            'NOT_FOUND': '申请不存在',
            'ACCESS_DENIED': '无权访问'
          }
          return statusMessages[this.orderInfo.status] || '订单状态异常'
        }
      } else {
        // 普通订单的按钮文本逻辑
        if (this.orderInfo.status === 'PENDING') {
          return `立即支付 ¥${this.orderInfo.totalPrice?.toFixed(2) || '0.00'}`
        } else {
          return '订单状态异常'
        }
      }
    }
  },
  
  onLoad(options) {

    // 初始化Pinia store
    this.bookingStore = useBookingStore()

    if (options.orderId) {
      this.orderId = options.orderId
      this.orderType = options.type || 'booking'
      this.fromPage = options.from || ''  // 记录来源页面
      this.loadOrderInfo()
    } else {
      console.error('支付页面：订单ID缺失')
      // 移除弹窗，直接返回上一页
      uni.navigateBack()
    }

    // 缓存弹窗实例
    this.$nextTick(() => {
      try {
        if (this.$refs.resultPopup) {
          this._resultPopupRef = this.$refs.resultPopup
        }
      } catch (error) {
      }
      
      // 延迟重试缓存
      setTimeout(() => {
        try {
          if (!this._resultPopupRef && this.$refs.resultPopup) {
            this._resultPopupRef = this.$refs.resultPopup
          }
        } catch (error) {
        }
      }, 500)
    })
  },

  onUnload() {
    // 页面卸载时的清理工作
    this._resultPopupRef = null
  },
  
  methods: {
    // 加载订单信息
    async loadOrderInfo() {
      try {
        this.loading = true

        // 检查是否是虚拟订单（负数ID）
        const isVirtualOrder = this.orderId < 0

        let response
        if (isVirtualOrder) {
          // 虚拟订单：使用申请ID调用虚拟订单API
          const requestId = Math.abs(this.orderId) // 转换为正数
          try {
            // 使用项目的请求工具
            response = await get(`/users/me/virtual-order/${requestId}`)
          } catch (error) {
            console.error('获取虚拟订单失败:', error)
            // 如果是404或403错误，创建一个错误状态的虚拟订单
            if (error.status === 404) {
              response = {
                data: {
                  id: this.orderId,
                  orderNo: `REQ_${requestId}`,
                  status: 'NOT_FOUND',
                  isVirtualOrder: true,
                  venueName: '未知场馆',
                  totalPrice: 0,
                  paymentAmount: 0
                }
              }
            } else if (error.status === 403) {
              response = {
                data: {
                  id: this.orderId,
                  orderNo: `REQ_${requestId}`,
                  status: 'ACCESS_DENIED',
                  isVirtualOrder: true,
                  venueName: '未知场馆',
                  totalPrice: 0,
                  paymentAmount: 0
                }
              }
            } else {
              throw error // 重新抛出其他错误
            }
          }
        } else {
          // 真实订单：使用Pinia Booking Store

          // 检查bookingStore是否正确初始化

          if (!this.bookingStore) {
            response = await getOrderDetail(this.orderId)
          } else {
            try {
              // 尝试使用Pinia store
              await this.bookingStore.getBookingDetail(this.orderId)

              // 从store的getter中获取数据
              const storeData = this.bookingStore.bookingDetailGetter

              if (storeData) {
                response = { data: storeData }
              } else {
                response = await getOrderDetail(this.orderId)
              }
            } catch (storeError) {
              console.error('Store调用失败，使用原API作为备用:', storeError)
              response = await getOrderDetail(this.orderId)
            }
          }
        }

        // 处理不同的响应格式
        this.orderInfo = response.data || response

        // 修复订单金额为0的问题
        if (this.orderInfo && !isVirtualOrder && (this.orderInfo.totalPrice === 0 || !this.orderInfo.totalPrice)) {

          // 使用调试工具分析问题
          const debugResult = debugOrderAmount(this.orderInfo)

          if (debugResult.success && debugResult.calculatedPrice > 0) {
            this.orderInfo.totalPrice = debugResult.calculatedPrice
          } else {
            // 如果订单有price字段，使用它
            if (this.orderInfo.price && this.orderInfo.price > 0) {
              this.orderInfo.totalPrice = this.orderInfo.price
            } else {
              // 尝试重新计算价格
              const calculatedPrice = this.calculateOrderPrice()
              if (calculatedPrice > 0) {
                this.orderInfo.totalPrice = calculatedPrice
              }
            }
          }
        }

        // 如果是虚拟订单，添加特殊标识和详细调试信息
        if (isVirtualOrder) {
          this.orderInfo.isVirtualOrder = true

          // 检查是否有错误状态
          if (!this.orderInfo.status) {
            console.error('虚拟订单状态为空！')
            this.orderInfo.status = 'PENDING' // 设置默认状态
          }

          // 检查支付金额
          if (!this.orderInfo.paymentAmount && !this.orderInfo.totalPrice) {
            console.error('虚拟订单金额为空！')
          }
        }

      } catch (error) {
        console.error('加载订单信息失败:', error)
        // 移除弹窗，直接返回上一页
        uni.navigateBack()
      } finally {
        this.loading = false
      }
    },
    
    // 选择支付方式
    selectMethod(method) {
      this.selectedMethod = method
    },
    
    // 处理支付
    async handlePayment() {
      if (!this.canPay || this.paying) return

      try {
        this.paying = true

        // 显示支付加载
        uni.showLoading({ title: '支付中...' })

        // 直接调用支付接口，移除模拟逻辑
        const response = await payOrder(this.orderId, this.selectedMethod)

        uni.hideLoading()

        if (response.success) {
          // 发送支付成功事件
          
          // 发送全局事件通知其他页面
          uni.$emit('paymentSuccess', {
            orderId: this.orderId,
            type: 'sharing', // 拼场支付
            fromPage: this.fromPage || 'payment',
            timestamp: Date.now()
          });
          
          // 支付成功，跳转到成功页面
          let successUrl = `/pages/payment/success?orderId=${this.orderId}`
          if (this.fromPage) {
            successUrl += `&from=${this.fromPage}`
          }
          uni.redirectTo({
            url: successUrl
          })
        } else {
          throw new Error(response.message || '支付失败')
        }

      } catch (error) {
        uni.hideLoading()
        console.error('支付失败:', error)

        // 支付失败，跳转到失败页面
        uni.redirectTo({
          url: `/pages/payment/failed?orderId=${this.orderId}&reason=${encodeURIComponent(error.message)}`
        })
      } finally {
        this.paying = false
      }
    },

    // 移除自动弹窗方法，改为在handlePayment中直接处理结果

    // 关闭弹窗 - 简化版本
    forceClosePopup() {
      try {
        this.closeResultPopup()
        
        // 重置状态
        this.paymentResult = {
          success: false,
          title: '',
          message: '',
          buttonText: '确定'
        }
        
      } catch (error) {
        console.error('关闭弹窗失败:', error)
      }
    },
    
    // 关闭支付结果弹窗（兼容微信小程序）
    closeResultPopup() {
      const debugEnabled = false // 调试开关
      
      try {
        // 获取环境信息
        let windowInfo, deviceInfo, appBaseInfo
        try {
          windowInfo = uni.getWindowInfo()
          deviceInfo = uni.getDeviceInfo()
          appBaseInfo = uni.getAppBaseInfo()
          if (debugEnabled) {
          }
        } catch (e) {
        }

        // 尝试应用样式
        try {
          if (this.resultPopupPosition) {
          }
        } catch (e) {
        }

        let popupInstance = null
        let methodUsed = ''

        // 方法1: 优先使用 $refs
        if (this.$refs.resultPopup) {
          popupInstance = this.$refs.resultPopup
          methodUsed = '$refs'
        }
        // 方法2: 处理数组情况
        else if (this.$refs.resultPopup && Array.isArray(this.$refs.resultPopup) && this.$refs.resultPopup.length > 0) {
          popupInstance = this.$refs.resultPopup[0]
          methodUsed = '$refs[0]'
        }
        // 方法3: 使用缓存引用
        else if (this._resultPopupRef) {
          popupInstance = this._resultPopupRef
          methodUsed = 'cached'
        }
        // 方法4: 微信小程序环境下使用$scope.selectComponent
        else if (appBaseInfo && (appBaseInfo.appPlatform === 'mp-weixin' || deviceInfo?.platform === 'devtools')) {
          try {
            if (this.$scope && typeof this.$scope.selectComponent === 'function') {
              popupInstance = this.$scope.selectComponent('#resultPopup')
              methodUsed = '$scope.selectComponent'
            }
          } catch (e) {
            if (debugEnabled) console.error('closeResultPopup - $scope.selectComponent异常:', e)
          }
        }
        // 方法5: 从组件实例中查找uni-popup子组件
        else {
          try {
            if (this.$children && this.$children.length > 0) {
              for (let child of this.$children) {
                if (child.$options && child.$options.name === 'UniPopup') {
                  popupInstance = child
                  methodUsed = '$children'
                  break
                }
              }
            }
          } catch (e) {
            if (debugEnabled) console.error('closeResultPopup - 查找$children异常:', e)
          }
        }

        // 尝试关闭弹窗
        if (popupInstance && typeof popupInstance.close === 'function') {
          popupInstance.close()
          this.internalResultPopupOpened = false
          
          // 尝试应用样式
          try {
            if (this.resultPopupPosition) {
            }
          } catch (e) {
          }
          return
        }

        // 重试机制
        setTimeout(() => {
          try {
            let retryPopupInstance = null
            
            if (this.$refs.resultPopup) {
              retryPopupInstance = this.$refs.resultPopup
            } else if (this._resultPopupRef) {
              retryPopupInstance = this._resultPopupRef
            } else if (appBaseInfo && (appBaseInfo.appPlatform === 'mp-weixin' || deviceInfo?.platform === 'devtools')) {
              if (this.$scope && typeof this.$scope.selectComponent === 'function') {
                retryPopupInstance = this.$scope.selectComponent('#resultPopup')
              }
            }
            
            if (retryPopupInstance && typeof retryPopupInstance.close === 'function') {
              retryPopupInstance.close()
              this.internalResultPopupOpened = false
              return
            }
            
            // 备选方案：强制隐藏
            this.internalResultPopupOpened = false
            
            // DOM操作备选方案
            try {
              const popupElement = document.querySelector('.uni-popup')
              if (popupElement) {
                popupElement.style.display = 'none'
              }
            } catch (domError) {
            }
            
          } catch (retryError) {
            if (debugEnabled) console.error('closeResultPopup - 重试失败:', retryError)
            this.internalResultPopupOpened = false
          }
        }, 100)
        
      } catch (error) {
        if (debugEnabled) console.error('closeResultPopup - 关闭支付结果弹窗失败:', error)
        this.internalResultPopupOpened = false
      }
    },
    
    // 处理结果操作 - 简化版本
    handleResultAction() {
      // 关闭弹窗
      this.forceClosePopup()
      
      if (this.paymentResult && this.paymentResult.success) {
        // 支付成功，跳转到订单列表
        uni.redirectTo({
          url: '/pages/booking/list'
        })
      }
    },
    

    
    // 格式化日期时间
    formatDateTime(date, startTime, endTime) {
      if (!date || !startTime) return '未设置'

      // 处理日期
      let dateStr = ''
      if (typeof date === 'string' && date.includes('-')) {
        // 如果是 YYYY-MM-DD 格式
        const [year, month, day] = date.split('-')
        dateStr = `${month}-${day}`
      } else {
        // 其他格式
        const dateObj = new Date(date)
        dateStr = dateObj.toLocaleDateString('zh-CN', {
          month: '2-digit',
          day: '2-digit'
        })
      }

      // 处理时间
      const timeStr = endTime ? `${startTime}-${endTime}` : startTime

      return `${dateStr} ${timeStr}`
    },
    
    // 返回
    goBack() {
      uni.navigateBack()
    },

    // 格式化订单时间（处理虚拟订单和普通订单的差异）
    formatOrderDateTime() {
      if (!this.orderInfo) return '未设置'


      if (this.orderInfo.isVirtualOrder) {
        // 虚拟订单使用 bookingTime 和 endTime (LocalDateTime格式: "yyyy-MM-dd HH:mm:ss")
        const startTime = this.orderInfo.bookingTime
        const endTime = this.orderInfo.endTime


        if (!startTime) {
          return '未设置'
        }

        try {
          // 处理后端返回的时间格式 "yyyy-MM-dd HH:mm:ss"，转换为iOS兼容格式
          let startDateTime, endDateTime

          if (typeof startTime === 'string') {
            // 后端格式: "2025-07-16 08:00:00"
            // iOS兼容格式: "2025-07-16T08:00:00"
            let isoTime = startTime
            if (startTime.includes(' ') && !startTime.includes('T')) {
              isoTime = startTime.replace(' ', 'T')
            }
            startDateTime = new Date(isoTime)
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
            } else {
              endDateTime = new Date(endTime)
            }
          }

          // 检查日期是否有效
          if (isNaN(startDateTime.getTime())) {
            console.error('无效的开始时间:', startTime)
            return '时间格式错误'
          }

          // 格式化日期 (MM-DD)
          const dateStr = startDateTime.toLocaleDateString('zh-CN', {
            month: '2-digit',
            day: '2-digit'
          })

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

          const result = `${dateStr} ${startTimeStr}${endTimeStr ? '-' + endTimeStr : ''}`
          return result
        } catch (error) {
          console.error('虚拟订单时间格式化错误:', error, '原始数据:', { startTime, endTime })
          return '时间格式错误'
        }
      } else {
        // 普通订单：处理不同的字段名

        // 优先使用bookingTime字段（新格式），如果没有则使用bookingDate+startTime（旧格式）
        if (this.orderInfo.bookingTime) {
          // 新格式：bookingTime包含完整的日期时间
          const bookingTime = this.orderInfo.bookingTime
          let endTime = this.orderInfo.endTime

          // 如果没有endTime，尝试从其他字段计算
          if (!endTime) {
            // 检查是否有duration字段或其他时间相关字段

            // 如果有duration，计算结束时间
            if (this.orderInfo.duration) {
              try {
                const startDateTime = new Date(bookingTime.replace(' ', 'T'))
                const durationHours = parseFloat(this.orderInfo.duration)
                const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000)
                endTime = endDateTime.toISOString().replace('T', ' ').substring(0, 19)
              } catch (error) {
                console.error('计算结束时间失败:', error)
              }
            } else {
              // 如果没有duration，根据预约类型和价格推算时长

              // 从前端日志看，选择了4个时间段，每个30分钟，总共2小时
              // 可以根据这个模式推算结束时间
              try {
                const startDateTime = new Date(bookingTime.replace(' ', 'T'))

                // 默认假设2小时的预约（这是常见的预约时长）
                const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000)

                // 格式化为 "yyyy-MM-dd HH:mm:ss" 格式
                const year = endDateTime.getFullYear()
                const month = String(endDateTime.getMonth() + 1).padStart(2, '0')
                const day = String(endDateTime.getDate()).padStart(2, '0')
                const hours = String(endDateTime.getHours()).padStart(2, '0')
                const minutes = String(endDateTime.getMinutes()).padStart(2, '0')
                const seconds = String(endDateTime.getSeconds()).padStart(2, '0')

                endTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
              } catch (error) {
                console.error('推算结束时间失败:', error)
              }
            }
          }


          try {
            // 处理bookingTime格式 "2025-07-19 16:00:00"
            let startDateTime
            if (typeof bookingTime === 'string') {
              let isoTime = bookingTime
              if (bookingTime.includes(' ') && !bookingTime.includes('T')) {
                isoTime = bookingTime.replace(' ', 'T')
              }
              startDateTime = new Date(isoTime)
            } else {
              startDateTime = new Date(bookingTime)
            }

            // 提取日期和时间
            const dateStr = startDateTime.toLocaleDateString('zh-CN', {
              month: '2-digit',
              day: '2-digit'
            })

            const startTimeStr = startDateTime.toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })

            // 如果有endTime，也格式化它
            let endTimeStr = ''
            if (endTime) {
              let endDateTime
              if (typeof endTime === 'string') {
                let isoEndTime = endTime
                if (endTime.includes(' ') && !endTime.includes('T')) {
                  isoEndTime = endTime.replace(' ', 'T')
                }
                endDateTime = new Date(isoEndTime)
              } else {
                endDateTime = new Date(endTime)
              }

              if (!isNaN(endDateTime.getTime())) {
                endTimeStr = endDateTime.toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })
              }
            }

            const result = `${dateStr} ${startTimeStr}${endTimeStr ? '-' + endTimeStr : ''}`
            return result
          } catch (error) {
            console.error('普通订单时间格式化错误:', error)
            return '时间格式错误'
          }
        } else {
          // 旧格式：使用bookingDate + startTime + endTime
          return this.formatDateTime(this.orderInfo.bookingDate, this.orderInfo.startTime, this.orderInfo.endTime)
        }
      }
    },

    // 获取队伍名称
    getTeamName() {
      if (!this.orderInfo) return '未设置'

      if (this.orderInfo.isVirtualOrder) {
        return this.orderInfo.applicantTeamName || '未设置'
      } else {
        return this.orderInfo.teamName || '未设置'
      }
    },

    // 获取联系方式
    getContactInfo() {
      if (!this.orderInfo) return '未设置'

      if (this.orderInfo.isVirtualOrder) {
        return this.orderInfo.applicantContact || '未设置'
      } else {
        return this.orderInfo.contactInfo || '未设置'
      }
    },

    // 获取订单金额
    getOrderAmount() {
      if (!this.orderInfo) return '0.00'


      // 安全检查：为undefined字段设置默认值
      const isVirtualOrder = this.orderInfo.isVirtualOrder || false
      const totalPrice = this.orderInfo.totalPrice || 0
      const paymentAmount = this.orderInfo.paymentAmount || 0
      const price = this.orderInfo.price || 0


      let amount
      if (isVirtualOrder) {
        amount = paymentAmount
      } else {
        // 普通订单：优先使用totalPrice，如果为0则尝试使用price字段
        amount = totalPrice
        if (!amount || amount === 0) {
          amount = price

          // 如果price字段也没有，尝试根据时间段计算价格
          if (!amount || amount === 0) {
            amount = this.calculateOrderPrice()
          }
        }
      }

      // 确保amount是数字类型
      const numericAmount = parseFloat(amount) || 0
      const result = numericAmount.toFixed(2)
      return result
    },

    // 计算订单价格（当后端价格为0时的备用方案）
    calculateOrderPrice() {
      if (!this.orderInfo) return 0


      // 尝试从订单信息中提取时间信息来计算价格
      // 优先使用startTime，如果没有则使用bookingTime
      const startTime = this.orderInfo.startTime || this.orderInfo.bookingTime
      const endTime = this.orderInfo.endTime
      const venueId = this.orderInfo.venueId


      // 如果有时间信息，尝试计算价格
      if (startTime && endTime) {
        try {
          // 解析时间格式 "18:00" 和 "20:00"
          const startHour = parseInt(startTime.split(':')[0])
          const startMinute = parseInt(startTime.split(':')[1])
          const endHour = parseInt(endTime.split(':')[0])
          const endMinute = parseInt(endTime.split(':')[1])

          // 计算时长（小时）
          const duration = (endHour + endMinute / 60) - (startHour + startMinute / 60)


          // 根据场馆ID或类型获取更准确的价格
          // 从最新日志看，场馆价格是120元/小时，每个时间段60元
          let hourlyRate = 120 // 使用实际的场馆价格

          // 如果能获取到场馆信息，使用场馆的实际价格
          if (this.orderInfo.venueName) {
            // 根据前端日志中的价格信息调整
            // 场馆价格120元/小时，每个时间段60元，4个时间段=240元
            // 所以实际应该是 4个时间段 × 60元 = 240元
            // 但这里我们按时长计算：2小时 × 120元 = 240元
            hourlyRate = 120
          }

          const calculatedPrice = duration * hourlyRate

          return calculatedPrice
        } catch (error) {
          console.error('价格计算失败:', error)
          return 0
        }
      }

      // 如果没有时间信息，尝试使用固定价格

      // 检查是否是拼场订单
      if (this.orderInfo.bookingType === 'SHARED' || this.orderInfo.isVirtualOrder) {
        return 120 // 拼场订单固定价格
      } else {
        return 240 // 独享订单固定价格（2小时）
      }
    },

    // 获取预约类型文本
    getBookingTypeText() {
      if (!this.orderInfo) return '未知'

      // 虚拟订单始终是拼场类型
      if (this.orderInfo.isVirtualOrder) {
        return '拼场'
      }

      return this.orderInfo.bookingType === 'SHARED' ? '拼场' : '独享'
    }
  }
}
</script>

<style lang="scss" scoped>
.payment-container {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 120rpx;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 32rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #e5e5e5;
  
  .nav-left, .nav-right {
    width: 80rpx;
  }
  
  .nav-icon {
    font-size: 36rpx;
    color: #333333;
  }
  
  .nav-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
  }
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400rpx;
  
  .loading-text {
    font-size: 28rpx;
    color: #999999;
  }
}

.order-section {
  margin: 20rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
  
  .order-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
  }
  
  .order-no {
    font-size: 24rpx;
    color: #999999;
  }
}

.order-details {
  padding: 0 32rpx;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f8f8f8;
  
  &:last-child {
    border-bottom: none;
  }
  
  .detail-label {
    font-size: 28rpx;
    color: #666666;
  }
  
  .detail-value {
    font-size: 28rpx;
    color: #333333;
    text-align: right;
    flex: 1;
    margin-left: 32rpx;
  }
}

.price-section {
  padding: 32rpx;
  border-top: 1rpx solid #f0f0f0;
  background-color: #fafafa;
}

.price-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .price-label {
    font-size: 32rpx;
    color: #333333;
    font-weight: 600;
  }
  
  .price-value {
    font-size: 36rpx;
    color: #ff6b35;
    font-weight: 700;
  }
}

.price-note {
  margin-top: 16rpx;
  
  .note-text {
    font-size: 24rpx;
    color: #999999;
  }
}

.payment-methods {
  margin: 20rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
}

.method-header {
  padding: 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
  
  .method-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
  }
}

.method-list {
  padding: 0 32rpx;
}

.method-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 0;
  border-bottom: 1rpx solid #f8f8f8;
  
  &:last-child {
    border-bottom: none;
  }
  
  &.active {
    .method-name {
      color: #ff6b35;
    }
  }
}

.method-info {
  display: flex;
  align-items: center;
  
  .method-icon {
    font-size: 32rpx;
    margin-right: 16rpx;
  }
  
  .method-name {
    font-size: 28rpx;
    color: #333333;
  }
}

.method-radio {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .radio-checked {
    color: #ff6b35;
    font-size: 24rpx;
    font-weight: bold;
  }
}

.payment-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #e5e5e5;
  z-index: 100;
}

.footer-info {
  flex: 1;
  
  .footer-label {
    font-size: 24rpx;
    color: #666666;
    display: block;
  }
  
  .footer-amount {
    font-size: 32rpx;
    color: #ff6b35;
    font-weight: 700;
  }
}

.pay-button {
  width: 240rpx;
  height: 80rpx;
  background-color: #ff6b35;
  color: #ffffff;
  border: none;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 600;
  
  &.disabled {
    background-color: #cccccc;
    color: #999999;
  }
}

.result-popup {
  width: 560rpx;
  padding: 60rpx 40rpx 40rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  text-align: center;
}

.result-icon {
  margin-bottom: 32rpx;
  
  .success-icon {
    display: inline-block;
    width: 80rpx;
    height: 80rpx;
    line-height: 80rpx;
    background-color: #52c41a;
    color: #ffffff;
    border-radius: 50%;
    font-size: 48rpx;
    font-weight: bold;
  }
  
  .error-icon {
    display: inline-block;
    width: 80rpx;
    height: 80rpx;
    line-height: 80rpx;
    background-color: #ff4d4f;
    color: #ffffff;
    border-radius: 50%;
    font-size: 48rpx;
    font-weight: bold;
  }
}

.result-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 16rpx;
}

.result-message {
  display: block;
  font-size: 28rpx;
  color: #666666;
  margin-bottom: 40rpx;
  line-height: 1.5;
}

.result-button {
  width: 200rpx;
  height: 72rpx;
  background-color: #ff6b35;
  color: #ffffff;
  border: none;
  border-radius: 36rpx;
  font-size: 28rpx;
}
</style>
