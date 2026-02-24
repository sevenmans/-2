import { defineStore } from 'pinia'
import { venueApi } from '@/api/venue.js'
import { timeslotApi } from '@/api/timeslot.js'
import { showError, showSuccess } from '@/utils/toast.js'
import { SLOT_STATUS } from '@/utils/timeslot-constants.js'

export const useVenueStore = defineStore('venue', {
  state: () => ({
    venueList: [],
    popularVenues: [],
    venueDetail: null,
    venueTypes: [],
    timeSlots: [],
    selectedTimeSlots: [],
    searchResults: [],
    loading: false,
    error: null,
    pagination: {
      current: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1
    },
    currentVenueId: null,
    currentDate: null,
    // 简化的缓存机制
    cache: {
      timeSlots: new Map(), // key: venueId_date, value: { data, timestamp }
      venues: new Map(),
      details: new Map()
    },
    cacheTimeout: 5 * 60 * 1000 // 5分钟TTL
  }),

  getters: {
    // 场馆列表相关 - 这些应该是getter，返回状态值
    venueListGetter: (state) => state.venueList,
    popularVenuesGetter: (state) => state.popularVenues,
    venueDetailGetter: (state) => state.venueDetail,
    venueTypesGetter: (state) => state.venueTypes,
    timeSlotsGetter: (state) => state.timeSlots,
    searchResultsGetter: (state) => state.searchResults,

    // 状态相关
    isLoading: (state) => state.loading,
    getPagination: (state) => state.pagination,

    // 计算属性
    totalVenues: (state) => state.venueList.length,
    hasMoreVenues: (state) => state.pagination.current < state.pagination.totalPages,

    // 按类型筛选场馆
    getVenuesByType: (state) => (typeId) => {
      if (!typeId) return state.venueList
      return state.venueList.filter(venue => venue.typeId === typeId)
    },

    // 获取可用时间段
    getAvailableTimeSlots: (state) => {
      return state.timeSlots.filter(slot => slot.status === SLOT_STATUS.AVAILABLE)
    },
    
    // 获取已占用时间段
    getOccupiedTimeSlots: (state) => {
      return state.timeSlots.filter(slot => slot.status === SLOT_STATUS.OCCUPIED)
    },
    
    // 获取过期时间段
    getExpiredTimeSlots: (state) => {
      return state.timeSlots.filter(slot => slot.status === SLOT_STATUS.EXPIRED)
    }
  },

  actions: {
    // 缓存辅助方法
    isCacheValid(timestamp) {
      return Date.now() - timestamp < this.cacheTimeout
    },
    
    getCachedData(cacheMap, key) {
      const cached = cacheMap.get(key)
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.data
      }
      return null
    },
    
    setCachedData(cacheMap, key, data) {
      cacheMap.set(key, {
        data,
        timestamp: Date.now()
      })
    },
    
    clearExpiredCache() {
      const now = Date.now()
      for (const [key, value] of this.cache.timeSlots.entries()) {
        if (now - value.timestamp >= this.cacheTimeout) {
          this.cache.timeSlots.delete(key)
        }
      }
      for (const [key, value] of this.cache.venues.entries()) {
        if (now - value.timestamp >= this.cacheTimeout) {
          this.cache.venues.delete(key)
        }
      }
      for (const [key, value] of this.cache.details.entries()) {
        if (now - value.timestamp >= this.cacheTimeout) {
          this.cache.details.delete(key)
        }
      }
    },
    // 🔥 修复：增强的订单过期监听器设置
    setupOrderExpiredListener() {
      
      // 确保uni对象存在
      if (typeof uni === 'undefined') {
        setTimeout(() => this.setupOrderExpiredListener(), 1000)
        return
      }
      
      // 确保uni.$on方法存在
      if (!uni.$on || !uni.$off) {
        setTimeout(() => this.setupOrderExpiredListener(), 1000)
        return
      }
      
      try {
        // 先移除可能存在的监听器，避免重复监听
        uni.$off('order-expired', this.onOrderExpired)
        
        // 绑定this上下文的处理函数
        const boundHandler = this.onOrderExpired.bind(this)
        
        // 设置新的监听器
        uni.$on('order-expired', boundHandler)
        
        // 存储处理函数引用，用于后续清理
        this._orderExpiredHandler = boundHandler
        
        // 设置其他相关事件监听器
        this.setupAdditionalEventListeners()
        
      } catch (error) {
        console.error('[VenueStore] ❌ 设置订单过期监听器失败:', error)
        // 重试设置
        setTimeout(() => this.setupOrderExpiredListener(), 2000)
      }
    },

    // 🔥 新增：设置其他相关事件监听器
    setupAdditionalEventListeners() {
      try {
        // 监听预约成功事件
        uni.$off('booking-success', this.onBookingSuccess)
        uni.$on('booking-success', this.onBookingSuccess.bind(this))
        
      } catch (error) {
        console.error('[VenueStore] ❌ 设置其他事件监听器失败:', error)
      }
    },

    // 🔥 新增：清理事件监听器
    cleanupEventListeners() {
      try {
        if (typeof uni !== 'undefined' && uni.$off) {
          if (this._orderExpiredHandler) {
            uni.$off('order-expired', this._orderExpiredHandler)
          }
          uni.$off('booking-success', this.onBookingSuccess)
        }
      } catch (error) {
        console.error('[VenueStore] ❌ 清理事件监听器失败:', error)
      }
    },

    // 设置加载状态
    setLoading(loading) {
      this.loading = loading
    },
    
    // 设置场馆列表
    setVenueList({ list, pagination }) {
      this.venueList = list
      if (pagination) {
        this.pagination = { ...this.pagination, ...pagination }
      }
    },
    
    // 追加场馆列表（分页加载）
    appendVenueList(list) {
      this.venueList = [...this.venueList, ...list]
    },
    
    // 设置热门场馆
    setPopularVenues(venues) {
      this.popularVenues = venues
    },
    
    // 设置场馆详情
    setVenueDetail(venue) {
      this.venueDetail = venue
    },
    
    // 设置场馆类型
    setVenueTypes(types) {
      this.venueTypes = types
    },
    
    // 设置时间段
    setTimeSlots(slots) {

      // 确保设置的是数组
      if (Array.isArray(slots)) {
        this.timeSlots = slots
      } else {
        this.timeSlots = []
      }

    },
    
    // 设置搜索结果
    setSearchResults(results) {
      this.searchResults = results
    },
    
    // 设置分页信息
    setPagination(pagination) {
      this.pagination = { ...this.pagination, ...pagination }
    },

    // 获取场馆列表
    async getVenueList(params = {}) {
      try {
        this.setLoading(true)
        
        // 添加超时处理
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('请求超时')), 10000) // 10秒超时
        })
        
        const apiPromise = venueApi.getVenueList(params)
        const response = await Promise.race([apiPromise, timeoutPromise])
        
        
        // 处理响应数据
        let list = []
        let pagination = {
          current: 1,
          pageSize: 10,
          total: 0,
          totalPages: 1
        }
        
        if (response && response.data) {
          if (Array.isArray(response.data)) {
            list = response.data
            pagination = {
              current: response.page || params.page || 1,
              pageSize: response.pageSize || params.pageSize || 10,
              total: response.total || response.data.length,
              totalPages: response.totalPages || 1
            }
          } else {
          }
        } else if (response && Array.isArray(response)) {
          // 直接返回数组的情况
          list = response
          pagination.total = response.length
        } else {
        }
        
        
        if (params.page === 1 || params.refresh) {
          this.setVenueList({ list, pagination })
        } else {
          this.appendVenueList(list)
          this.setVenueList({ list: this.venueList, pagination })
        }
        
        return response
      } catch (error) {
        console.error('[VenueStore] 获取场馆列表失败:', error)
        showError(error.message || '获取场馆列表失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 获取热门场馆
    async getPopularVenues() {
      try {
        const response = await venueApi.getPopularVenues()

        // 处理两种可能的响应格式：直接返回数组 或 包装在data中
        let venues = []
        if (Array.isArray(response)) {
          venues = response
        } else if (response && Array.isArray(response.data)) {
          venues = response.data
        } else {
        }

        this.setPopularVenues(venues)
        return response
      } catch (error) {
        console.error('[VenueStore] 获取热门场馆失败:', error)
        this.setPopularVenues([])
        showError(error.message || '获取热门场馆失败')
        throw error
      }
    },

    // 获取场馆详情
    async getVenueDetail(venueId) {
      try {
        this.setLoading(true)
        
        const response = await venueApi.getVenueDetail(venueId)

        if (response && response.data) {
          this.setVenueDetail(response.data)
        } else if (response) {
          // 如果没有data字段，可能数据直接在response中
          this.setVenueDetail(response)
        }
        
        return response
      } catch (error) {
        console.error('[VenueStore] 获取场馆详情失败:', error)
        showError(error.message || '获取场馆详情失败')
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 获取场馆类型
    async getVenueTypes() {
      try {
        const response = await venueApi.getVenueTypes()
        
        if (response && response.data) {
          this.setVenueTypes(response.data)
        }
        
        return response
      } catch (error) {
        console.error('[VenueStore] 获取场馆类型失败:', error)
        showError(error.message || '获取场馆类型失败')
        throw error
      }
    },

    // 获取时间段 - 简化版
    async getTimeSlots(venueId, date, forceRefresh = false, loading = true) {
      try {

        if (loading) {
          this.setLoading(true)
        }

        const cacheKey = `${venueId}_${date}`

        // 检查缓存（除非强制刷新）
        if (!forceRefresh) {
          const cachedData = this.getCachedData(this.cache.timeSlots, cacheKey)
          if (cachedData) {
            this.setTimeSlots(cachedData)
            this.currentVenueId = venueId
            this.currentDate = date
            return { data: cachedData, success: true }
          }
        }

        // 从API获取数据
        // 🔥 修复：对于强制刷新，添加时间戳参数确保请求不被去重
        const apiOptions = { forceRefresh }
        if (forceRefresh) {
          apiOptions._t = Date.now()
        }

        const startTime = Date.now()
        const response = await timeslotApi.getVenueTimeSlots(venueId, date, apiOptions)
        const endTime = Date.now()

        let timeSlots = []
        if (response && response.success && Array.isArray(response.data)) {
          timeSlots = response.data
        } else if (response && Array.isArray(response)) {
          timeSlots = response
        }


        // 缓存数据
        this.setCachedData(this.cache.timeSlots, cacheKey, timeSlots)

        // 更新状态
        this.setTimeSlots(timeSlots)
        this.currentVenueId = venueId
        this.currentDate = date

        return { data: timeSlots, success: true }

      } catch (error) {
        console.error('[VenueStore] 获取时间段失败:', error)
        this.setTimeSlots([])
        throw error
      } finally {
        if (loading) {
          this.setLoading(false)
        }
      }
    },

    // 生成默认时间段（根据场馆营业时间，半小时间隔）
    generateDefaultTimeSlots(venueId, date) {

      // 获取场馆详情中的营业时间和价格
      const venue = this.venueDetail
      if (!venue) {
        console.error('[VenueStore] 场馆详情不存在，无法生成时间段')
        return
      }

      // 解析营业时间，支持多种格式
      const openTime = this.parseTimeString(venue.openTime || venue.open_time || '09:00')
      const closeTime = this.parseTimeString(venue.closeTime || venue.close_time || '22:00')
      const venueHourPrice = venue.price || 100
      const venueHalfHourPrice = Math.round(venueHourPrice / 2)


      const defaultSlots = []
      const [startHour, startMinute] = openTime.split(':').map(Number)
      const [endHour, endMinute] = closeTime.split(':').map(Number)

      // 从营业开始时间生成时间段
      let currentHour = startHour
      let currentMinute = startMinute

      // 确保开始时间对齐到30分钟间隔
      if (currentMinute > 0 && currentMinute < 30) {
        currentMinute = 30
      } else if (currentMinute > 30) {
        currentHour += 1
        currentMinute = 0
      }

      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const startTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`

        // 计算结束时间
        let nextMinute = currentMinute + 30
        let nextHour = currentHour
        if (nextMinute >= 60) {
          nextHour += 1
          nextMinute = 0
        }

        const endTime = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`

        // 检查是否超过营业时间
        if (nextHour > endHour || (nextHour === endHour && nextMinute > endMinute)) {
          break
        }

        defaultSlots.push({
          id: `default_${venueId}_${date}_${currentHour}_${currentMinute}`,
          venueId: parseInt(venueId),
          date: date,
          startTime: startTime,
          endTime: endTime,
          price: venueHalfHourPrice,
          status: 'AVAILABLE',
          isGenerated: true // 标记为前端生成
        })

        // 移动到下一个时间段
        currentMinute = nextMinute
        currentHour = nextHour
      }

      console.log('[VenueStore] 生成默认时间段:', defaultSlots.length > 0 ? 
        `${defaultSlots[0].startTime} - ${defaultSlots[defaultSlots.length - 1].endTime}` : '无')

      this.setTimeSlots(defaultSlots)
    },

    // 解析时间字符串，支持多种格式
    parseTimeString(timeStr) {
      if (!timeStr) return '09:00'

      // 如果是 HH:mm:ss 格式，截取前5位
      if (timeStr.length > 5) {
        timeStr = timeStr.substring(0, 5)
      }

      // 验证格式是否正确
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/
      if (!timeRegex.test(timeStr)) {
        return timeStr.includes('close') || timeStr.includes('end') ? '22:00' : '09:00'
      }

      return timeStr
    },

    // 获取场馆时间段（别名方法，用于兼容性）
    async getVenueTimeSlots(venueId, date, forceRefresh = false, loading = true) {
      
      // 支持对象参数（向后兼容）
      if (typeof venueId === 'object' && venueId.venueId && venueId.date) {
        const params = venueId
        return await this.getTimeSlots(params.venueId, params.date, params.forceRefresh || false, params.loading !== false)
      }
      
      // 支持独立参数
      if (venueId && date) {
        return await this.getTimeSlots(venueId, date, forceRefresh, loading)
      }
      
      // 参数格式错误时返回空数据
      return { data: [] }
    },

    // 清理时间段缓存
    async clearTimeSlotCache(venueId, date) {
      try {
        
        // 清理Store状态
        this.timeSlots = []
        this.loading = false
        this.currentVenueId = null
        this.currentDate = null
        
        // 清理缓存
        const cacheKey = `${venueId}_${date}`
        this.cache.timeSlots.delete(cacheKey)
        
        
      } catch (error) {
      }
    },

    // 刷新时间段状态 - 简化版
    async refreshTimeSlotStatus(venueId, date, timeSlotId = null) {
      try {
        
        // 强制刷新，不使用缓存
        const result = await this.getTimeSlots(venueId, date, true, false)
        
        // 触发事件通知
        this.notifyTimeSlotUpdate(venueId, date, timeSlotId, result.data)
        
        return result.data
        
      } catch (error) {
        console.error('[VenueStore] 刷新时间段状态失败:', error)
        
        // 触发错误事件
        this.notifyTimeSlotError(venueId, date, timeSlotId, error)
        
        // 返回空数组
        this.setTimeSlots([])
        return []
      }
    },

    // 通知时间段更新
    notifyTimeSlotUpdate(venueId, date, timeSlotId = null, timeSlots = null) {
      if (typeof uni !== 'undefined' && uni.$emit) {
        const eventData = {
          venueId,
          date,
          timeSlots: timeSlots || this.timeSlots,
          updatedTimeSlotId: timeSlotId,
          timestamp: Date.now()
        }
        
        uni.$emit('timeSlotUpdated', eventData)
        
        if (timeSlotId) {
          const updatedSlot = (timeSlots || this.timeSlots).find(slot => slot.id === timeSlotId)
          uni.$emit('timeSlotStatusChanged', {
            venueId,
            date,
            timeSlotId,
            newStatus: updatedSlot?.status,
            slot: updatedSlot,
            timestamp: Date.now()
          })
        }
        
      }
    },

    // 通知时间段错误事件
    notifyTimeSlotError(venueId, date, timeSlotId = null, error) {
      if (typeof uni !== 'undefined' && uni.$emit) {
        uni.$emit('timeSlotError', {
          venueId,
          date,
          timeSlotId,
          error: error.message || error,
          timestamp: Date.now()
        })
      }
    },

    // 预约成功后的状态同步 - 简化版
    async onBookingSuccess(bookingData) {
      
      try {
        if (!bookingData) {
          return
        }
        
        const venueId = bookingData.venueId || bookingData.venue_id
        const date = bookingData.date || bookingData.booking_date
        
        if (!venueId || !date) {
          return
        }
        
        // 乐观更新：立即更新本地状态
        const timeSlotId = bookingData.timeSlotId || bookingData.time_slot_id || bookingData.slotId
        if (timeSlotId && this.timeSlots.length > 0) {
          const slot = this.timeSlots.find(s => 
            s.id === timeSlotId || s.timeSlotId === timeSlotId
          )
          if (slot) {
            slot.status = SLOT_STATUS.BOOKED
            slot.isBooked = true
            slot.isAvailable = false
            slot.lastUpdated = new Date().toISOString()
            this.setTimeSlots([...this.timeSlots])
          }
        }
        
        // 清除相关缓存
        const cacheKey = `${venueId}_${date}`
        this.cache.timeSlots.delete(cacheKey)
        
        // 延迟刷新确保数据一致性
        setTimeout(async () => {
          try {
            await this.refreshTimeSlotStatus(venueId, date)
            
            // 触发全局事件
            if (typeof uni !== 'undefined' && uni.$emit) {
              uni.$emit('timeslot-updated', {
                venueId,
                date,
                action: 'booking-success',
                timestamp: new Date().toISOString()
              })
            }
            
          } catch (error) {
            console.error('[VenueStore] 延迟刷新失败:', error)
          }
        }, 500)
        
      } catch (error) {
        console.error('[VenueStore] 预约成功状态同步失败:', error)
      }
    },



    // 取消预约后刷新时间段
    async onBookingCancelled(venueId, date, cancelledSlotIds) {
      try {

        // 乐观更新本地状态
        if (Array.isArray(cancelledSlotIds) && cancelledSlotIds.length > 0) {
          const updatedSlots = this.timeSlots.map(slot => {
            if (cancelledSlotIds.includes(slot.id)) {
              return { 
                ...slot, 
                status: SLOT_STATUS.AVAILABLE,
                isBooked: false,
                isAvailable: true,
                lastUpdated: new Date().toISOString()
              }
            }
            return slot
          })
          this.setTimeSlots(updatedSlots)
        }

        // 清除相关缓存并延迟刷新
        const cacheKey = `${venueId}_${date}`
        this.cache.timeSlots.delete(cacheKey)
        
        setTimeout(() => {
          this.getTimeSlots(venueId, date, true, false)
        }, 1000)

      } catch (error) {
        console.error('[VenueStore] 预约取消后刷新失败:', error)
      }
    },

    // 搜索场馆
    async searchVenues(searchParams) {
      try {
        this.setLoading(true)

        // 支持两种参数格式：字符串关键词或对象参数
        let params = {}
        if (typeof searchParams === 'string') {
          params.keyword = searchParams
        } else if (typeof searchParams === 'object') {
          params = { ...searchParams }
        }

        const response = await venueApi.searchVenues(params)

        if (response && response.data) {
          // 🔧 修复：搜索结果应该设置到 searchResults 而不是 venueList
          this.setSearchResults(response.data)
          return response.data
        }

        this.setSearchResults([])
        return []
      } catch (error) {
        console.error('[VenueStore] 搜索场馆失败:', error)
        this.setSearchResults([])
        return []
      } finally {
        this.setLoading(false)
      }
    },

    // 清空场馆详情
    clearVenueDetail() {
      this.venueDetail = null
    },
    
    // 清空搜索结果
    clearSearchResults() {
      this.searchResults = []
    },
    
    // 重置分页
    resetPagination() {
      this.pagination = {
        current: 1,
        pageSize: 10,
        total: 0,
        totalPages: 1
      }
    },

    // 清除时间段缓存
    clearTimeSlots() {
      this.timeSlots = []
      this.selectedTimeSlots = []
      this.currentVenueId = null
      this.currentDate = null
      
      // 清除所有时间段缓存
      this.cache.timeSlots.clear()
    },

    // 强力刷新时间段
    async forceRefreshTimeSlots(venueId, date) {
      try {

        // 清除缓存并重新获取
        const cacheKey = `${venueId}_${date}`
        this.cache.timeSlots.delete(cacheKey)

        return await this.getTimeSlots(venueId, date, true, false)

      } catch (error) {
        console.error('[VenueStore] 强力刷新时间段失败:', error)
        throw error
      }
    },

    // 立即释放时间段（用于取消预约后的即时更新）
    immediateReleaseTimeSlots(venueId, date, startTime, endTime) {
      try {

        // 乐观更新：立即将匹配的时间段状态设为可用
        if (this.timeSlots && Array.isArray(this.timeSlots)) {
          let releasedCount = 0
          const updatedSlots = this.timeSlots.map(slot => {
            // 🔧 关键修复：更精确的时间段匹配逻辑
            // 对于拼场订单，需要释放整个时间范围内的所有时间段
            const slotStart = slot.startTime
            const slotEnd = slot.endTime

            // 检查时间段是否在要释放的时间范围内
            const isInRange = (slotStart >= startTime && slotEnd <= endTime) ||
                             (slotStart === startTime && slotEnd === endTime) ||
                             (slotStart >= startTime && slotStart < endTime) ||
                             (slotEnd > startTime && slotEnd <= endTime)

            if (isInRange && (slot.status === 'BOOKED' || slot.status === 'RESERVED' || slot.status === 'SHARING')) {
              releasedCount++
              return {
                ...slot,
                status: 'AVAILABLE',
                isBooked: false,
                isAvailable: true,
                lastUpdated: new Date().toISOString()
              }
            }
            return slot
          })

          this.setTimeSlots(updatedSlots)
        }

        // 清除缓存，确保下次获取时是最新数据
        const cacheKey = `${venueId}_${date}`
        this.cache.timeSlots.delete(cacheKey)

      } catch (error) {
        console.error('[VenueStore] 立即释放时间段失败:', error)
      }
    },

    // 🔥 新增：根据slotIds立即释放时间段
    immediateReleaseTimeSlotsById(venueId, date, slotIds) {
      try {

        if (!Array.isArray(slotIds) || slotIds.length === 0) {
          return
        }

        // 乐观更新：立即将匹配的时间段状态设为可用
        if (this.timeSlots && Array.isArray(this.timeSlots)) {
          let releasedCount = 0
          const updatedSlots = this.timeSlots.map(slot => {
            if (slotIds.includes(slot.id)) {
              releasedCount++
              return {
                ...slot,
                status: SLOT_STATUS.AVAILABLE,
                isBooked: false,
                isAvailable: true,
                orderId: null,
                lastUpdated: new Date().toISOString()
              }
            }
            return slot
          })

          this.setTimeSlots(updatedSlots)
        }

        // 清除缓存，确保下次获取时是最新数据
        const cacheKey = `${venueId}_${date}`
        this.cache.timeSlots.delete(cacheKey)
        
      } catch (error) {
        console.error('[VenueStore] ❌ 根据slotIds释放时间段失败:', error)
      }
    },

    // 🔧 新增：强制释放拼场时间段（专门用于拼场订单取消）
    forceReleaseSharingTimeSlots(venueId, date, startTime, endTime) {
      try {

        if (this.timeSlots && Array.isArray(this.timeSlots)) {
          let releasedCount = 0
          const updatedSlots = this.timeSlots.map(slot => {
            // 对于拼场订单，释放所有可能相关的时间段
            const slotStart = slot.startTime
            const slotEnd = slot.endTime

            // 更宽松的匹配条件，确保拼场相关的时间段都被释放
            const shouldRelease =
              // 精确匹配
              (slotStart === startTime && slotEnd === endTime) ||
              // 时间范围重叠
              (slotStart >= startTime && slotStart < endTime) ||
              (slotEnd > startTime && slotEnd <= endTime) ||
              // 包含关系
              (slotStart <= startTime && slotEnd >= endTime) ||
              (slotStart >= startTime && slotEnd <= endTime)

            if (shouldRelease && slot.status !== 'AVAILABLE') {
              releasedCount++
              return {
                ...slot,
                status: 'AVAILABLE',
                isBooked: false,
                isAvailable: true,
                lastUpdated: new Date().toISOString()
              }
            }
            return slot
          })

          this.setTimeSlots(updatedSlots)

          // 立即触发UI更新
          this.$forceUpdate && this.$forceUpdate()
        }

        // 清除所有相关缓存
        const cacheKey = `${venueId}_${date}`
        this.cache.timeSlots.delete(cacheKey)
        this.cache.venues.clear() // 清除场馆缓存

      } catch (error) {
        console.error('[VenueStore] 强制释放拼场时间段失败:', error)
      }
    },

    // 🔥 修复：增强的订单过期事件处理
    async onOrderExpired(orderData) {
      try {
        
        if (!orderData || !orderData.venueId || !orderData.date) {
          return
        }
        
        const { venueId, date, startTime, endTime, slotIds, orderNo } = orderData
        
        // 🔥 立即释放时间段状态（乐观更新）
        if (startTime && endTime) {
          this.immediateReleaseTimeSlots(venueId, date, startTime, endTime)
        } else if (slotIds && Array.isArray(slotIds)) {
          this.immediateReleaseTimeSlotsById(venueId, date, slotIds)
        }
        
        // 清除缓存
        const cacheKey = `${venueId}_${date}`
        this.cache.timeSlots.delete(cacheKey)
        
        // 异步刷新数据以确保与后端同步
        setTimeout(async () => {
          try {
            await this.getTimeSlots(venueId, date, true, false)
            
            // 触发全局事件通知其他组件
            if (typeof uni !== 'undefined' && uni.$emit) {
              uni.$emit('timeslot-updated', {
                venueId,
                date,
                action: 'order-expired',
                orderNo,
                timestamp: new Date().toISOString()
              })
            }
          } catch (error) {
            console.error('[VenueStore] ❌ 异步刷新时间段失败:', error)
          }
        }, 100) // 100ms延迟，确保UI更新
        
      } catch (error) {
        console.error('[VenueStore] ❌ 处理订单过期事件失败:', error)
      }
    },

     // 🔥 新增：处理订单取消事件
     async onOrderCancelled(orderData) {
       try {
         
         if (!orderData || !orderData.venueId || !orderData.date) {
           return
         }
         
         const { venueId, date, startTime, endTime, slotIds, orderNo } = orderData
         
         // 立即释放时间段状态
         if (startTime && endTime) {
           this.immediateReleaseTimeSlots(venueId, date, startTime, endTime)
         } else if (slotIds && Array.isArray(slotIds)) {
           this.immediateReleaseTimeSlotsById(venueId, date, slotIds)
         }
         
         // 清除缓存并刷新数据
         const cacheKey = `${venueId}_${date}`
         this.cache.timeSlots.delete(cacheKey)
         
         setTimeout(async () => {
           try {
             await this.getTimeSlots(venueId, date, true, false)
             
             if (typeof uni !== 'undefined' && uni.$emit) {
               uni.$emit('timeslot-updated', {
                 venueId,
                 date,
                 action: 'order-cancelled',
                 orderNo,
                 timestamp: new Date().toISOString()
               })
             }
           } catch (error) {
             console.error('[VenueStore] ❌ 刷新时间段失败:', error)
           }
         }, 100)
         
       } catch (error) {
         console.error('[VenueStore] ❌ 处理订单取消事件失败:', error)
       }
     },

     // 🔥 新增：处理时间段状态更新事件
     async onTimeslotStatusUpdate(updateData) {
       try {
         
         if (!updateData || !updateData.venueId || !updateData.date) {
           return
         }
         
         const { venueId, date, slotIds } = updateData
         
         // 清除缓存并重新获取数据
         const cacheKey = `${venueId}_${date}`
         this.cache.timeSlots.delete(cacheKey)
         
         // 如果当前正在查看这个场馆的这个日期，则刷新数据
         if (this.currentVenueId === venueId && this.currentDate === date) {
           await this.getTimeSlots(venueId, date, true, false)
         }
         
       } catch (error) {
         console.error('[VenueStore] ❌ 处理时间段状态更新事件失败:', error)
       }
     },
 
     // 🔄 更新时间段状态（用于实时验证后的状态同步）
    updateTimeSlotsStatus(venueId, date, latestSlots) {
      try {
        // 验证输入参数
        if (!venueId || !date || !Array.isArray(latestSlots)) {
          return false
        }
        
        // 只有当前场馆和日期匹配时才更新
        if (this.currentVenueId === venueId && this.currentDate === date) {
          // 更新本地时间段状态
          this.setTimeSlots(latestSlots)
          
          
          // 触发全局事件通知其他组件
          this.notifyTimeSlotUpdate(venueId, date, null, latestSlots)
          
          // 触发专门的状态更新事件
          if (typeof uni !== 'undefined' && uni.$emit) {
            uni.$emit('timeslots-status-updated', {
              venueId,
              date,
              timeSlots: latestSlots,
              timestamp: Date.now(),
              source: 'realtime-validation'
            })
          }
          
          return true
        } else {
          console.log('[VenueStore] 场馆或日期不匹配，跳过更新:', {
            current: { venueId: this.currentVenueId, date: this.currentDate },
            target: { venueId, date }
          })
          return false
        }
        
      } catch (error) {
        console.error('[VenueStore] ❌ 更新时间段状态失败:', error)
        return false
      }
    }
  }
})
