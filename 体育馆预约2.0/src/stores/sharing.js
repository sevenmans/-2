import { defineStore } from 'pinia'
import * as sharingApi from '@/api/sharing.js'
import { showSuccess, showError } from '@/utils/ui.js'

export const useSharingStore = defineStore('sharing', {
  state: () => ({
    sharingOrders: [],
    mySharingOrders: [],
    receivedRequests: [],
    sentRequests: [],
    sharingOrderDetail: null,
    loading: false,
    pagination: {
      current: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1
    }
  }),

  getters: {
    // 基础getters - 修复命名冲突，避免与actions同名
    sharingOrdersGetter: (state) => state.sharingOrders,
    mySharingOrdersGetter: (state) => state.mySharingOrders,
    receivedRequestsGetter: (state) => state.receivedRequests,
    sentRequestsGetter: (state) => state.sentRequests,
    sharingOrderDetailGetter: (state) => state.sharingOrderDetail,
    isLoading: (state) => state.loading,
    getPagination: (state) => state.pagination,
    
    // 计算属性
    totalSharingOrders: (state) => state.sharingOrders.length,
    totalMySharingOrders: (state) => state.mySharingOrders.length,
    totalReceivedRequests: (state) => state.receivedRequests.length,
    totalSentRequests: (state) => state.sentRequests.length,
    
    // 按状态筛选
    getOrdersByStatus: (state) => (status) => {
      return state.sharingOrders.filter(order => order.status === status)
    },
    
    // 待处理的请求
    getPendingRequests: (state) => {
      return state.receivedRequests.filter(request => request.status === 'PENDING')
    },
    
    // 是否有更多数据
    hasMoreData: (state) => {
      return state.pagination.current < state.pagination.totalPages
    }
  },

  actions: {
    // 🔥 新增：设置事件监听器
    setupEventListeners() {
      try {
        // 检查uni对象是否可用
        if (typeof uni === 'undefined' || !uni.$on) {
          setTimeout(() => this.setupEventListeners(), 1000)
          return
        }
        
        // 监听订单过期事件
        uni.$on('order-expired', this.onOrderExpired.bind(this))
        
        // 监听拼场数据变化事件
        uni.$on('sharing-data-changed', this.onSharingDataChanged.bind(this))
        
        // 监听订单取消事件
        // 统一使用 camelCase 事件名，与页面保持一致
        uni.$on('orderCancelled', this.onOrderCancelled.bind(this))
        
        // 监听时间段更新事件
        uni.$on('timeslots-updated', this.onTimeSlotsUpdated.bind(this))
        
      } catch (error) {
        console.error('[SharingStore] ❌ 设置事件监听器失败:', error)
      }
    },

    // 🔥 新增：清理事件监听器
    cleanupEventListeners() {
      try {
        if (typeof uni !== 'undefined' && uni.$off) {
          uni.$off('order-expired', this.onOrderExpired)
          uni.$off('sharing-data-changed', this.onSharingDataChanged)
          uni.$off('orderCancelled', this.onOrderCancelled)
          uni.$off('timeslots-updated', this.onTimeSlotsUpdated)
        }
      } catch (error) {
        console.error('[SharingStore] ❌ 清理事件监听器失败:', error)
      }
    },

    // 🔥 新增：处理订单过期事件
    async onOrderExpired(eventData) {
      try {
        if (!eventData) {
          return
        }
        
        // 如果是拼场订单过期
        if (eventData.orderType === 'SHARING' || eventData.orderType === 'sharing') {
          
          // 刷新拼场订单列表
          await this.refreshSharingOrders()
          
          // 刷新我的拼场订单
          await this.refreshMySharingOrders()
          
          // 触发全局拼场数据变化事件
          if (typeof uni !== 'undefined' && uni.$emit) {
            uni.$emit('sharing-data-changed', {
              type: 'order-expired',
              orderNo: eventData.orderNo,
              venueId: eventData.venueId,
              date: eventData.date
            })
          }
        }
      } catch (error) {
        console.error('[SharingStore] ❌ 处理订单过期失败:', error)
      }
    },

    // 🔥 新增：处理拼场数据变化事件
    async onSharingDataChanged(eventData) {
      try {
        // 刷新拼场订单列表
        await this.refreshSharingOrders()
        
        // 如果有具体的场馆和日期信息，可以进行更精确的刷新
        if (eventData && eventData.venueId && eventData.date) {
          console.log('精确刷新场馆数据:', {
            venueId: eventData.venueId,
            date: eventData.date
          })
        }
      } catch (error) {
        console.error('[SharingStore] ❌ 处理拼场数据变化失败:', error)
      }
    },

    // 🔥 新增：处理订单取消事件
    async onOrderCancelled(eventData) {
      try {
        if (eventData && (eventData.orderType === 'SHARING' || eventData.orderType === 'sharing')) {
          // 刷新拼场订单列表
          await this.refreshSharingOrders()
          
          // 刷新我的拼场订单
          await this.refreshMySharingOrders()
        }
      } catch (error) {
        console.error('[SharingStore] ❌ 处理订单取消失败:', error)
      }
    },

    // 🔥 新增：处理时间段更新事件
    async onTimeSlotsUpdated(eventData) {
      try {
        // 如果时间段更新是由于订单过期引起的，刷新拼场数据
        if (eventData && eventData.reason === 'order-expired') {
          await this.refreshSharingOrders()
        }
      } catch (error) {
        console.error('[SharingStore] ❌ 处理时间段更新失败:', error)
      }
    },

    // 🔥 新增：刷新拼场订单列表
    async refreshSharingOrders() {
      try {
        // 清除缓存
        this.clearCache()
        
        // 重新获取拼场订单列表
        await this.getAllSharingOrders({ refresh: true }) // 强制刷新
      } catch (error) {
        console.error('[SharingStore] ❌ 刷新拼场订单列表失败:', error)
      }
    },

    // 🔥 新增：刷新我的拼场订单
    async refreshMySharingOrders() {
      try {
        // 清除缓存
        this.clearCache()
        
        // 重新获取我的拼场订单
        await this.getMyOrders({ refresh: true }) // 强制刷新
      } catch (error) {
        console.error('[SharingStore] ❌ 刷新我的拼场订单失败:', error)
      }
    },

    // 🔥 新增：清除缓存
    clearCache() {
      // 这里可以添加具体的缓存清除逻辑
      // 例如清除localStorage中的缓存数据
      try {
        uni.removeStorageSync('sharing_orders_cache')
        uni.removeStorageSync('my_sharing_orders_cache')
      } catch (error) {
        console.error('[SharingStore] ❌ 清除缓存失败:', error)
      }
    },

    // 设置加载状态
    setLoading(loading) {
      this.loading = loading
    },
    
    // 设置分享订单列表
    setSharingOrders(orders) {
      this.sharingOrders = Array.isArray(orders) ? orders : []
    },
    
    // 设置我的分享订单
    setMySharingOrders(orders) {
      this.mySharingOrders = Array.isArray(orders) ? orders : []
    },
    
    // 设置收到的请求
    setReceivedRequests(requests) {
      this.receivedRequests = Array.isArray(requests) ? requests : []
    },
    
    // 设置发送的请求
    setSentRequests(requests) {
      this.sentRequests = Array.isArray(requests) ? requests : []
    },
    
    // 设置分享订单详情
    setSharingOrderDetail(order) {
      this.sharingOrderDetail = order
    },
    
    // 设置分页信息
    setPagination(pagination) {
      this.pagination = { ...this.pagination, ...pagination }
    },
    
    // 更新订单状态
    updateOrderStatus({ orderId, status }) {
      const order = this.sharingOrders.find(o => o.id === orderId)
      if (order) {
        order.status = status
      }
      
      const myOrder = this.mySharingOrders.find(o => o.id === orderId)
      if (myOrder) {
        myOrder.status = status
      }
    },
    
    // 获取分享订单列表
    async getSharingOrdersList(params = {}) {
      try {
        this.setLoading(true)

        const response = await sharingApi.getJoinableSharingOrders(params)

        if (response && response.data) {
          const orders = Array.isArray(response.data) ? response.data : []
          this.setSharingOrders(orders)

          if (response.pagination) {
            this.setPagination(response.pagination)
          }
        }

        return response
      } catch (error) {
        console.error('[SharingStore] 获取分享订单列表失败:', error)
        showError(error.message || '获取分享订单列表失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 获取可加入的拼场订单
    async getJoinableSharingOrders(params = {}) {
      try {
        this.setLoading(true)

        const response = await sharingApi.getJoinableSharingOrders(params)

        if (response) {
          // 处理后端返回的数据格式：{list: [...], pagination: {...}}
          const orders = response.list || response.data || []

          // 如果是刷新或第一页，替换数据；否则追加数据
          if (params.refresh || params.page === 1) {
            this.setSharingOrders(orders)
          } else {
            this.sharingOrders.push(...orders)
          }

          if (response.pagination) {
            this.setPagination(response.pagination)
          }
        }

        return response
      } catch (error) {
        console.error('[SharingStore] 获取可加入拼场订单失败:', error)
        showError(error.message || '获取可加入拼场订单失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 获取所有拼场订单
    async getAllSharingOrders(params = {}) {
      try {
        this.setLoading(true)

        // 🔥 修复问题3: 移除store层面的超时逻辑，由页面层面统一处理
        const response = await sharingApi.getAllSharingOrders(params)

        if (response) {
          // 处理后端返回的数据格式：{list: [...], pagination: {...}}
          const orders = response.list || response.data || []



          // 如果是刷新或第一页，替换数据；否则追加数据
          if (params.refresh || params.page === 1) {
            this.setSharingOrders(orders)
          } else {
            this.sharingOrders.push(...orders)
          }

          if (response.pagination) {
            this.setPagination(response.pagination)
          }
        } else {
          // 如果是刷新，清空数据
          if (params.refresh || params.page === 1) {
            this.setSharingOrders([])
          }
        }

        return response
      } catch (error) {
        console.error('[SharingStore] 获取所有拼场订单失败:', error)
        showError(error.message || '获取所有拼场订单失败')

        // 如果是刷新，确保清空加载状态
        if (params.refresh || params.page === 1) {
          this.setSharingOrders([])
        }

        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    // 获取我的分享订单
    async getMyOrders(params = {}) {
      try {
        this.setLoading(true)

        const response = await sharingApi.getMyCreatedSharingOrders(params)

        if (response && response.data) {
          const orders = Array.isArray(response.data) ? response.data : []
          this.setMySharingOrders(orders)
        }

        return response
      } catch (error) {
        console.error('[SharingStore] 获取我的分享订单失败:', error)
        showError(error.message || '获取我的分享订单失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    // 获取收到的请求
    async getReceivedRequestsList(params = {}) {
      try {
        this.setLoading(true)

        const response = await sharingApi.getReceivedSharedRequests(params)

        if (response && response.data) {
          const requests = Array.isArray(response.data) ? response.data : []
          this.setReceivedRequests(requests)
        }

        return response
      } catch (error) {
        console.error('[SharingStore] 获取收到的请求失败:', error)
        showError(error.message || '获取收到的请求失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    // 获取发送的请求
    async getSentRequestsList(params = {}) {
      try {
        this.setLoading(true)

        const response = await sharingApi.getMySharedRequests(params)

        if (response && response.data) {
          const requests = Array.isArray(response.data) ? response.data : []
          this.setSentRequests(requests)
        }

        return response
      } catch (error) {
        console.error('[SharingStore] 获取发送的请求失败:', error)
        showError(error.message || '获取发送的请求失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },
    
    // 获取分享订单详情
    async getOrderDetail(orderId, forceRefresh = false) {
      try {
        this.setLoading(true)

        // 如果是强制刷新，清除当前数据
        if (forceRefresh) {
          this.sharingOrderDetail = null
        }

        const response = await sharingApi.getSharingOrderById(orderId)

        if (response) {
          // 检查是否是错误响应（包含message字段）
          if (response.message && !response.id) {
            this.setSharingOrderDetail(null)
          } else if (response.id) {
            // 如果响应包含id字段，说明是有效的拼场订单数据
            this.setSharingOrderDetail(response)
          } else {
            this.setSharingOrderDetail(null)
          }
        } else {
          this.setSharingOrderDetail(null)
        }

        return response
      } catch (error) {
        console.error('[SharingStore] 获取分享订单详情失败:', error)
        showError(error.message || '获取分享订单详情失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 通过主订单ID获取分享订单详情
    async getOrderDetailByMainOrderId(mainOrderId) {
      try {
        this.setLoading(true)

        const response = await sharingApi.getSharingOrderByMainOrderId(mainOrderId)

        if (response) {
          // 检查是否是错误响应（包含message字段）
          if (response.message && !response.id) {
            this.setSharingOrderDetail(null)
          } else if (response.id) {
            // 如果响应包含id字段，说明是有效的拼场订单数据
            this.setSharingOrderDetail(response)
            return response.id // 返回拼场订单ID
          } else {
            this.setSharingOrderDetail(null)
          }
        } else {
          this.setSharingOrderDetail(null)
        }

        return response
      } catch (error) {
        console.error('[SharingStore] 通过主订单ID获取分享订单详情失败:', error)
        showError(error.message || '获取分享订单详情失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 创建分享订单
    async createOrder(orderData) {
      try {
        this.setLoading(true)

        const response = await sharingApi.createSharingOrder(orderData)

        if (response && response.data) {
          showSuccess('分享订单创建成功')

          // 🔥 修复问题2: 发送事件通知预约列表刷新
          uni.$emit('bookingCreated', {
            orderId: response.data.orderId || response.data.id,
            type: 'sharing',
            source: 'sharingStore'
          })

          // 🔥 修复问题2: 发送事件通知拼场大厅刷新
          uni.$emit('sharingDataChanged', {
            action: 'created',
            orderId: response.data.id
          })

          // 刷新我的拼场订单列表
          await this.getMyOrders()
        }

        return response
      } catch (error) {
        console.error('[SharingStore] 创建分享订单失败:', error)
        showError(error.message || '创建分享订单失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 创建拼场订单（别名方法，用于测试兼容性）
    async createSharingOrder(orderData) {
      return await this.createOrder(orderData)
    },

    // 处理分享请求
    async handleRequest({ requestId, action }) {
      try {
        this.setLoading(true)

        const response = await sharingApi.handleSharedRequest(requestId, action)

        if (response && response.success) {
          // 处理成功后，刷新相关列表
          await this.getReceivedRequestsList()
          showSuccess(`请求${action === 'accept' ? '接受' : '拒绝'}成功`)
        }

        return response
      } catch (error) {
        console.error('[SharingStore] 处理分享请求失败:', error)
        showError(error.message || '处理分享请求失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 处理拼场申请（新增方法，对应Vuex中的processSharingRequest）
    async processSharingRequest({ requestId, action, reason = '' }) {
      try {
        this.setLoading(true)

        const data = {
          action: action, // 直接传递action参数：'approve' 或 'reject'
          responseMessage: reason || ''
        }

        const response = await sharingApi.handleSharedRequest(requestId, data)

        if (response && response.success) {
          showSuccess(action === 'approve' ? '已同意拼场申请' : '已拒绝拼场申请')

          // 刷新相关列表
          await this.getReceivedRequestsList()
        }

        return response
      } catch (error) {
        console.error('[SharingStore] 处理拼场申请失败:', error)

        // 检查是否是需要支付的错误
        if (error.needPayment) {
          // 保留完整的错误信息，包括needPayment和orderId
          const enhancedError = new Error(error.message || '处理拼场申请失败')
          enhancedError.needPayment = error.needPayment
          enhancedError.orderId = error.orderId
          enhancedError.orderStatus = error.orderStatus
          throw enhancedError
        } else {
          showError(error.message || '处理拼场申请失败')
          throw error
        }
      } finally {
        this.setLoading(false)
      }
    },

    // 申请加入拼场订单（需要支付）
    async applyJoinSharingOrder(orderId) {
      try {
        this.setLoading(true)

        const response = await sharingApi.applyJoinSharingOrder(orderId)

        if (response && response.success) {
          showSuccess('申请提交成功')
          
          // 刷新发送的请求列表
          await this.getSentRequestsList()
          
          return response
        } else {
          throw new Error(response.message || '申请失败')
        }
      } catch (error) {
        console.error('[SharingStore] 申请加入拼场订单失败:', error)
        showError(error.message || '申请加入拼场订单失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 更新拼场设置
    async updateSharingSettings({ sharingId, settings }) {
      try {
        this.setLoading(true)

        // 确保正确传递参数：sharingId 和 settings 分别作为两个参数
        const response = await sharingApi.updateSharingSettings(sharingId, settings)

        showSuccess('设置已更新')

        // 刷新订单详情
        await this.getOrderDetail(sharingId)

        return response
      } catch (error) {
        console.error('[SharingStore] 更新拼场设置失败:', error)
        showError(error.message || '更新设置失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 申请拼场
    async applySharingOrder({ orderId, data }) {
      try {
        this.setLoading(true)

        const response = await sharingApi.applySharedBooking(orderId, data)

        // 不在这里显示消息，让前端页面根据响应状态决定显示内容

        return response
      } catch (error) {
        console.error('[SharingStore] 申请拼场失败:', error)
        showError(error.message || '申请拼场失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 移除拼场参与者
    async removeSharingParticipant({ sharingId, participantId }) {
      try {
        this.setLoading(true)

        const response = await sharingApi.removeSharingParticipant(sharingId, participantId)

        if (response && response.success) {
          showSuccess('参与者移除成功')

          // 刷新订单详情
          await this.getOrderDetail(sharingId)
        }

        return response
      } catch (error) {
        console.error('[SharingStore] 移除参与者失败:', error)
        showError(error.message || '移除参与者失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 确认拼场订单
    async confirmSharingOrder(orderId) {
      try {
        this.setLoading(true)

        const response = await sharingApi.confirmSharingOrder(orderId)

        if (response && response.success) {
          showSuccess('拼场订单确认成功')

          // 刷新我的拼场订单列表
          await this.getMyOrders()
        }

        return response
      } catch (error) {
        console.error('[SharingStore] 确认拼场订单失败:', error)
        showError(error.message || '确认拼场订单失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 取消拼场订单
    async cancelSharingOrder(orderId) {
      try {
        this.setLoading(true)

        const response = await sharingApi.cancelSharingOrder(orderId)

        if (response && response.success) {
          showSuccess('拼场订单取消成功')

          // 获取相关的预约订单ID
          const relatedBookingId = response.relatedBookingId || response.bookingOrderId

          // 🔥 修复问题1: 清除场馆时间段缓存
          if (relatedBookingId) {
            try {
              // 从响应中获取场馆和日期信息
              const actualVenueId = response.venueId || response.venue?.id
              const actualBookingDate = response.bookingDate || response.date
              const startTime = response.startTime
              const endTime = response.endTime
              const bookingType = response.bookingType || 'sharing'

              // 清除场馆store中的时间段缓存
              const venueStoreInst = uni.$store?.state?.venue || {}
              const cacheKey = `${actualVenueId}_${actualBookingDate}`
              if (venueStoreInst?.cache?.timeSlots) {
                venueStoreInst.cache.timeSlots.delete(cacheKey)
              }
              if (typeof venueStoreInst?.setTimeSlots === 'function') {
                venueStoreInst.setTimeSlots([])
              }

              // 发送时间段更新事件
              if (typeof uni !== 'undefined' && uni.$emit) {
                uni.$emit('timeslot-updated', {
                  venueId: actualVenueId,
                  date: actualBookingDate,
                  action: 'booking-cancelled',
                  startTime,
                  endTime,
                  bookingType,
                  releasedTimeSlotIds: [],
                  immediate: true,
                  source: 'sharingStore.cancelSharingOrder',
                  timestamp: new Date().toISOString()
                })
              }
            } catch (clearErr) {
              // 忽略清除缓存的错误，不影响主流程
            }
          }

          // 🔥 修复问题2: 发送事件通知预约列表刷新
          uni.$emit('orderCancelled', {
            sharingOrderId: orderId,
            bookingOrderId: relatedBookingId,
            orderId: relatedBookingId || orderId,
            type: 'sharing',
            source: 'sharingStore'
          })

          uni.$emit('sharingDataChanged', { action: 'cancelled', orderId })

          // 刷新我的拼场订单列表
          await this.getMyOrders()
        }

        return response
      } catch (error) {
        console.error('[SharingStore] 取消拼场订单失败:', error)
        showError(error.message || '取消拼场订单失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 取消拼场申请
    async cancelSharingRequest(requestId) {
      try {
        this.setLoading(true)

        const response = await sharingApi.cancelSharingRequest(requestId)

        if (response && response.success) {
          showSuccess('拼场申请取消成功')

          // 刷新发送的请求列表
          await this.getSentRequestsList()
        }

        return response
      } catch (error) {
        console.error('[SharingStore] 取消拼场申请失败:', error)
        showError(error.message || '取消拼场申请失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 清除订单详情
    clearOrderDetail() {
      this.sharingOrderDetail = null
    },

    // 重置分页
    resetPagination() {
      this.pagination = {
        current: 1,
        pageSize: 10,
        total: 0,
        totalPages: 1
      }
    }
  }
})
