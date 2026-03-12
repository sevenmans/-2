import { defineStore } from 'pinia';
import * as bookingApi from '@/api/booking.js';
import { useVenueStore as _staticUseVenueStore } from './venue.js';
import * as userApi from '@/api/user.js';
import * as sharingApi from '@/api/sharing.js';
import { showSuccess, showError } from '@/utils/ui.js';
// 🔧 移除直接导入，改用动态导入避免循环依赖
// import { useVenueStore } from '@/stores/venue.js'

// 🔥 修复问题1: 改进 venue store 获取逻辑
async function getVenueStore() {
  try {
    // 优先使用静态导入的 useVenueStore，避免小程序环境下动态导入失败
    if (typeof _staticUseVenueStore === 'function') {
      return _staticUseVenueStore();
    }

    // 兼容路径别名的动态导入（某些打包场景需要别名路径）
    const venueStoreModule = await import('@/stores/venue.js');
    if (venueStoreModule && typeof venueStoreModule.useVenueStore === 'function') {
      return venueStoreModule.useVenueStore();
    }
    if (venueStoreModule?.default && typeof venueStoreModule.default.useVenueStore === 'function') {
      return venueStoreModule.default.useVenueStore();
    }
    console.error('[BookingStore] 动态导入的 venue.js 模块中未找到 useVenueStore 函数');
    console.error('[BookingStore] 可用的导出:', Object.keys(venueStoreModule || {}));
    return null;
  } catch (error) {
    console.error('[BookingStore] 动态导入 venue store 失败:', error);
    return null;
  }
}

export const useBookingStore = defineStore('booking', {
  state: () => ({
    bookingList: [],
    bookingDetail: null,
    sharingOrders: [],
    userSharingOrders: [],
    joinedSharingOrders: [],
    sharingDetail: null,
    loading: false,
    loadingMore: false, // 🔥 修复问题2: 添加加载更多状态
    pagination: {
      current: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
      currentPage: 1
    },
    // 缓存相关状态
    cache: {
      bookingList: {
        data: null,
        timestamp: 0,
        expiry: 5 * 60 * 1000 // 5分钟缓存
      },
      bookingDetails: new Map(), // 预约详情缓存
      lastRefreshTime: 0
    },

    // 最近一次取消（跨页强制刷新使用）
    lastCancelled: null
  }),

  getters: {
    // 基础getters - 修复命名冲突，避免与actions同名
    bookingListGetter: (state) => state.bookingList,
    bookingDetailGetter: (state) => state.bookingDetail,
    sharingOrdersGetter: (state) => state.sharingOrders,
    userSharingOrdersGetter: (state) => state.userSharingOrders,
    joinedSharingOrdersGetter: (state) => state.joinedSharingOrders,
    sharingDetailGetter: (state) => state.sharingDetail,
    isLoading: (state) => state.loading,
    getPagination: (state) => state.pagination,
    
    // 计算属性
    totalBookings: (state) => state.bookingList.length,
    totalSharingOrders: (state) => state.sharingOrders.length,
    totalUserSharingOrders: (state) => state.userSharingOrders.length,
    totalJoinedSharingOrders: (state) => state.joinedSharingOrders.length,
    
    // 按状态筛选预订
    getBookingsByStatus: (state) => (status) => {
      return state.bookingList.filter(booking => booking.status === status);
    },
    
    // 待确认的预订
    getPendingBookings: (state) => {
      return state.bookingList.filter(booking => booking.status === 'PENDING');
    },
    
    // 已确认的预订（现包含已支付即为确认）
    getConfirmedBookings: (state) => {
      // 包含 PAID(已支付/待核销), CONFIRMED(旧数据), SHARING_SUCCESS(拼场成功)
      return state.bookingList.filter(booking => 
        ['PAID', 'CONFIRMED', 'SHARING_SUCCESS', 'FULL'].includes(booking.status)
      );
    },
    
    // 是否有更多数据
    hasMoreData: (state) => {
      return state.pagination.current < state.pagination.totalPages;
    },
    
    // 缓存相关getters
    isCacheValid: (state) => (cacheKey) => {
      const cache = state.cache[cacheKey];
      if (!cache || !cache.data) return false;
      return Date.now() - cache.timestamp < cache.expiry;
    },
    
    getCachedData: (state) => (cacheKey) => {
      const cache = state.cache[cacheKey];
      return cache && cache.data ? cache.data : null;
    }
  },

  actions: {
    // 🔥 新增：设置事件监听器
    setupEventListeners() {
      
      try {
        // 检查uni对象是否可用
        if (typeof uni === 'undefined' || !uni.$on) {
          setTimeout(() => this.setupEventListeners(), 1000);
          return;
        }
        
        // 监听订单过期事件
        uni.$on('order-expired', this.onOrderExpired.bind(this));
        
        // 监听订单取消事件
        uni.$on('order-cancelled', this.onOrderCancelled.bind(this));
        
        // 监听预约成功事件
        uni.$on('booking-success', this.onBookingSuccess.bind(this));
        
      } catch (error) {
        console.error('[BookingStore] ❌ 设置事件监听器失败:', error);
      }
    },

    // 清理事件监听器
    cleanupEventListeners() {
      try {
        if (typeof uni !== 'undefined' && uni.$off) {
          uni.$off('order-expired', this.onOrderExpired);
          uni.$off('order-cancelled', this.onOrderCancelled);
          uni.$off('booking-success', this.onBookingSuccess);
        }
      } catch (error) {
        console.error('[BookingStore] 清理事件监听器失败:', error);
      }
    },

    // 处理订单过期事件
    async onOrderExpired(eventData) {
      
      if (!eventData || !eventData.orderNo) {
        return;
      }
      
      // 在本地立即更新订单状态
      const bookingIndex = this.bookingList.findIndex(b => b.orderNo === eventData.orderNo);
      if (bookingIndex !== -1) {
        this.bookingList[bookingIndex].status = 'CANCELLED';
      }
      
      // 可选：触发一次后台数据刷新，确保数据一致性
      await this.refreshBookingList();
    },

    // 处理订单取消事件
    async onOrderCancelled(eventData) {
      try {
        if (eventData && (eventData.orderType === 'BOOKING' || eventData.orderType === 'booking')) {
          // 刷新预约列表
          await this.refreshBookingList();
        }
      } catch (error) {
        console.error('[BookingStore] 处理订单取消失败:', error);
      }
    },

    // 处理预约成功事件
    async onBookingSuccess(eventData) {
      try {
        // 刷新预约列表
        await this.refreshBookingList();
        
        // 通知venue store更新时间段状态
        if (eventData && eventData.venueId && eventData.date) {
          try {
            const venueStore = await getVenueStore();
            if (venueStore) {
              // 通知venue store有新的预约成功
              await venueStore.onTimeslotStatusUpdate({
                venueId: eventData.venueId,
                date: eventData.date,
                slotIds: eventData.slotIds || [eventData.slotId],
                action: 'booking-success'
              });
            }
          } catch (error) {
            console.error('[BookingStore] 通知venue store失败:', error);
          }
        }
      } catch (error) {
        console.error('[BookingStore] 处理预约成功失败:', error);
      }
    },

    // 清除缓存
    clearCache() {
      try {
        uni.removeStorageSync('booking_list_cache');
        uni.removeStorageSync('booking_detail_cache');
      } catch (error) {
        console.error('[BookingStore] 清除缓存失败:', error);
      }
    },

    // 设置加载状态
    setLoading(loading) {
      this.loading = loading;
    },
    
    // 设置预订列表
    setBookingList({ list, pagination }) {
      this.bookingList = Array.isArray(list) ? list : [];
      if (pagination) {
        this.pagination = { ...this.pagination, ...pagination };
      }
    },
    
    // 追加预订列表
    appendBookingList(list) {
      const newList = Array.isArray(list) ? list : [];
      this.bookingList = [...this.bookingList, ...newList];
    },
    
    // 设置预订详情
    setBookingDetail(detail) {
      this.bookingDetail = detail;
    },
    
    // 设置分享订单列表
    setSharingOrders(orders) {
      this.sharingOrders = Array.isArray(orders) ? orders : [];
    },
    
    // 设置用户分享订单
    setUserSharingOrders(orders) {
      this.userSharingOrders = Array.isArray(orders) ? orders : [];
    },
    
    // 设置加入的分享订单
    setJoinedSharingOrders(orders) {
      this.joinedSharingOrders = Array.isArray(orders) ? orders : [];
    },
    
    // 设置分享详情
    setSharingDetail(detail) {
      this.sharingDetail = detail;
    },
    
    // 设置分页信息
    setPagination(pagination) {
      this.pagination = { ...this.pagination, ...pagination };
    },
    
    // 更新预订状态
    updateBookingStatus({ bookingId, status }) {
      const booking = this.bookingList.find(b => b.id === bookingId);
      if (booking) {
        booking.status = status;
      }
    },
    
    // 创建预订
    async createBooking(bookingData) {
      try {
        this.setLoading(true);

        const response = await bookingApi.createBooking(bookingData);
        showSuccess('预约成功');

        // 预约成功后刷新时间段状态
        if (bookingData.venueId && bookingData.date) {
          try {
            // 使用辅助函数获取 venue store
            const venueStore = await getVenueStore();

            // 检查 venueStore 是否可用
            if (!venueStore) {
              return response.data || response;
            }

            // 支持单个时间段和多个时间段的情况
            let slotIds = [];
            if (bookingData.slotIds) {
              slotIds = bookingData.slotIds;
            } else if (bookingData.slotId) {
              slotIds = [bookingData.slotId];
            }

            // 预约成功后立即清除缓存并刷新时间段状态
            try {
              // 动态导入缓存管理器并清除相关缓存
              const { default: cacheManager } = await import('../utils/cache-manager.js');
              if (cacheManager && typeof cacheManager.clearTimeSlotCache === 'function') {
                cacheManager.clearTimeSlotCache(bookingData.venueId, bookingData.date);
              }
            } catch (error) {
              // 忽略缓存清除错误
            }

            if (slotIds.length > 0) {
              // 构建选中的时间段信息用于时间匹配
              const selectedSlots = [];
              if (bookingData.startTime && bookingData.endTime) {
                selectedSlots.push({
                  startTime: bookingData.startTime,
                  endTime: bookingData.endTime
                });
              }
              
              await venueStore.onBookingSuccess(bookingData.venueId, bookingData.date, slotIds, selectedSlots);
            } else {
              // 如果没有具体的时间段ID，刷新整个日期的时间段
              await venueStore.refreshTimeSlotStatus(bookingData.venueId, bookingData.date);
            }
          } catch (refreshError) {
            // 忽略刷新错误
          }
        }

        // 返回响应数据，确保包含订单ID
        const result = response.data || response;
        return result;
      } catch (error) {
        console.error('[BookingStore] 创建预约失败:', error);
        showError(error.message || '预约失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // 获取我的预订列表（别名方法，用于测试兼容性）
    async getMyBookings(params = {}) {
      return await this.getBookingList(params);
    },

    // 获取预订详情（修复API调用错误）
    async getBookingDetails(bookingId) {
      try {
        this.setLoading(true);

        // 修复：使用正确的API方法名
        const response = await bookingApi.getBookingDetail(bookingId);

        // 设置到store状态中
        this.setBookingDetail(response.data || response);

        return response;
      } catch (error) {
        console.error('[BookingStore] 获取预订详情失败:', error);
        showError(error.message || '获取预订详情失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // 创建拼场预约
    async createSharedBooking(bookingData) {
      try {
        this.setLoading(true);

        const response = await bookingApi.createSharedBooking(bookingData);
        showSuccess('拼场预约成功');

        // 🔥 修复问题2: 拼场预约成功后立即清除预约列表缓存
        this.clearCache('bookingList');

        // 拼场预约成功后也要刷新时间段状态
        if (bookingData.venueId && bookingData.date) {
          try {
            // 使用统一时间段管理器清除缓存
            try {
              const { default: unifiedTimeSlotManager } = await import('../utils/unified-timeslot-manager.js');
              if (unifiedTimeSlotManager && typeof unifiedTimeSlotManager.clearCache === 'function') {
                unifiedTimeSlotManager.clearCache(bookingData.venueId, bookingData.date);
              } else {
                // 备用方案：使用缓存管理器
                const { default: cacheManager } = await import('../utils/cache-manager.js');
                if (cacheManager && typeof cacheManager.clearTimeSlotCache === 'function') {
                  cacheManager.clearTimeSlotCache(bookingData.venueId, bookingData.date);
                }
              }
            } catch (importError) {
              // 忽略导入错误
            }
          } catch (error) {
            // 忽略缓存清除错误
          }
          
          try {
            // 使用辅助函数获取 venue store
            const venueStore = await getVenueStore();

            // 检查 venueStore 是否可用
            if (venueStore) {
              // 支持单个时间段和多个时间段的情况
              let slotIds = [];
              if (bookingData.slotIds) {
                slotIds = bookingData.slotIds;
              } else if (bookingData.slotId) {
                slotIds = [bookingData.slotId];
              }

              if (slotIds.length > 0) {
                // 构建选中的时间段信息用于时间匹配
                const selectedSlots = [];
                if (bookingData.startTime && bookingData.endTime) {
                  selectedSlots.push({
                    startTime: bookingData.startTime,
                    endTime: bookingData.endTime
                  });
                }
                
                await venueStore.onBookingSuccess(bookingData.venueId, bookingData.date, slotIds, selectedSlots);
              } else {
                // 如果没有具体的时间段ID，刷新整个日期的时间段
                await venueStore.refreshTimeSlotStatus(bookingData.venueId, bookingData.date);
              }
            }
          } catch (refreshError) {
            // 忽略刷新错误
          }
        }

        return response;
      } catch (error) {
        console.error('[BookingStore] 创建拼场预约失败:', error);
        showError(error.message || '拼场预约失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    
    // 获取用户预约列表（带缓存）
    async getUserBookings(params = {}) {
      // 🔥 修复问题2: 判断是否是加载更多
      const isFirstPage = !params.page || params.page === 1;
      const isLoadingMore = !isFirstPage;
      const isForceRefresh = params.force === true;

      try {
        // 🔥 修复问题2: 根据是否是加载更多设置不同的loading状态
        // 如果是强制刷新，跳过loading检查
        if (!isForceRefresh) {
          if (isLoadingMore) {
            this.loadingMore = true;
          } else {
            this.setLoading(true);
          }
        }

        // 检查缓存（仅对第一页且非强制刷新的请求使用缓存）
        const useCache = isFirstPage && !params.refresh && !params.force;

        if (useCache && this.isCacheValid('bookingList')) {
          const cachedData = this.getCachedData('bookingList');
          if (cachedData) {
            this.setBookingList(cachedData);
            return { success: true, fromCache: true };
          }
        }

        // 🔥 修复问题2: 移除超时逻辑，完全依赖API层面的超时处理

        const response = await userApi.getUserBookings(params);

        const { data, total, page, pageSize, totalPages } = response;

        const pagination = {
          current: page,
          pageSize: pageSize,
          total: total,
          totalPages: totalPages,
          currentPage: page
        };

        const listData = { list: data || [], pagination: pagination };

        if (params.page === 1 || params.refresh) {
          this.setBookingList(listData);

          // 缓存第一页数据
          if (isFirstPage) {
            this.setCacheData('bookingList', listData);
          }
        } else {
          // 🔥 修复问题2: 加载更多时追加数据
          this.appendBookingList(data || []);
          this.setPagination(pagination);
        }

        return response;
      } catch (error) {
        console.error('[BookingStore] 获取用户预约列表失败:', error);

        // 如果是超时错误，显示特定提示
        if (error.message === '请求超时') {
          showError('加载超时，请检查网络连接');
        } else {
          showError(error.message || '获取预约列表失败');
        }

        // 🔥 修复问题2: 只在加载第一页失败时清空列表
        if (isFirstPage) {
          this.setBookingList({
            list: [],
            pagination: { current: 1, pageSize: 10, total: 0, totalPages: 1, currentPage: 1 }
          });
        }
        throw error;
      } finally {
        // 🔥 修复问题2: 根据是否是加载更多重置不同的loading状态
        // 如果是强制刷新，也要重置loading状态
        if (!isForceRefresh) {
          if (isLoadingMore) {
            this.loadingMore = false;
          } else {
            this.setLoading(false);
          }
        }
      }
    },
    
    // 获取预约详情（带缓存）
    async getBookingDetail(bookingId, useCache = true) {
      try {
        this.setLoading(true);
        
        if (!bookingId) {
          throw new Error('订单ID不能为空');
        }
        
        // 检查缓存
        if (useCache && this.cache.bookingDetails.has(bookingId)) {
          const cachedDetail = this.cache.bookingDetails.get(bookingId);
          const now = Date.now();
          // 详情缓存2分钟
          if (now - cachedDetail.timestamp < 2 * 60 * 1000) {
            this.setBookingDetail(cachedDetail.data);
            return { success: true, fromCache: true };
          } else {
            // 缓存过期，删除
            this.cache.bookingDetails.delete(bookingId);
          }
        }
        
        // 添加超时处理
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('请求超时')), 10000); // 10秒超时
        });

        const apiPromise = useCache
          ? bookingApi.getBookingDetail(bookingId)
          : bookingApi.getBookingDetail(bookingId, { _t: Date.now(), _nocache: 1 }, {
              cache: false,
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
        const response = await Promise.race([apiPromise, timeoutPromise]);
        
        // 处理不同的响应数据结构
        let bookingData = null;
        if (response && typeof response === 'object') {
          // 如果response直接是数据对象
          if (response.id || response.orderNo) {
            bookingData = response;
          }
          // 如果response有data属性
          else if (response.data) {
            bookingData = response.data;
          }
          // 如果response有result属性
          else if (response.result) {
            bookingData = response.result;
          }
          else {
            // 尝试直接使用response
            bookingData = response;
          }
        } else {
          throw new Error('服务器返回的数据格式不正确');
        }
        
        if (!bookingData) {
          throw new Error('未找到预约详情');
        }
        
        // 设置详情数据
        this.setBookingDetail(bookingData);
        
        // 缓存详情数据
        this.cache.bookingDetails.set(bookingId, {
          data: bookingData,
          timestamp: Date.now()
        });
        
        return { success: true, data: bookingData };
      } catch (error) {
        console.error('[BookingStore] 获取预约详情失败:', error);
        
        // 根据错误类型显示不同的提示
        if (error.message === '请求超时') {
          showError('加载超时，请检查网络连接');
        } else if (error.message === '未找到预约详情') {
          showError('预约详情不存在');
        } else {
          showError(error.message || '获取预约详情失败');
        }
        
        // 清空详情数据
        this.setBookingDetail(null);
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    
    // 取消预约
    async cancelBooking(bookingId) {
      try {
        if (!bookingId) {
          throw new Error('预约ID不能为空');
        }

        const numericId = typeof bookingId === 'string' ? Number(bookingId) : bookingId;
        if (Number.isFinite(numericId) && numericId < 0) {
          const requestId = -numericId;
          const response = await sharingApi.cancelSharingRequest(requestId);
          const bookingIndex = this.bookingList.findIndex(b => b.id === numericId || b.orderNo === `REQ_${requestId}`);
          if (bookingIndex !== -1) {
            this.bookingList.splice(bookingIndex, 1);
          }
          this.cache.bookingDetails.delete(bookingId);
          this.clearCache('bookingList');
          uni.$emit('orderCancelled', {
            orderId: bookingId,
            type: 'sharing-request'
          });
          showSuccess('申请已取消');
          return response;
        }

        // 获取预约详情以便后续操作
        let bookingDetail = null;
        try {
          const detailResponse = await this.getBookingDetail(bookingId, false);
          bookingDetail = detailResponse.data || this.bookingDetail;
        } catch (detailError) {
          console.warn('[BookingStore] 获取预约详情失败，继续执行取消操作:', detailError);
        }

        // 执行取消操作
        const response = await bookingApi.cancelBooking(bookingId);

        // 从本地列表中移除或更新状态
        const bookingIndex = this.bookingList.findIndex(b => b.id === bookingId || b.orderNo === bookingId);
        if (bookingIndex !== -1) {
          this.bookingList[bookingIndex].status = 'CANCELLED';
        }

        // 清除详情缓存
        this.cache.bookingDetails.delete(bookingId);
        // 即时更新当前详情的状态为已取消，避免等待后端事务
        if (this.bookingDetail && (this.bookingDetail.id === bookingId || this.bookingDetail.orderNo === bookingId)) {
          this.bookingDetail = { ...this.bookingDetail, status: 'CANCELLED' };
        }

        // 🔥 修复问题3: 取消预约后立即清除预约列表缓存
        this.clearCache('bookingList');

        // 记录最近取消的预约，用于跨页强制刷新
        this.lastCancelled = {
          bookingId: bookingId,
          timestamp: Date.now()
        };

        // 🔥 修复问题3: 取消预约后释放时间段
        // 从预约详情中提取场馆ID和日期信息
        let venueId = null;
        let bookingDate = null;
        let slotIds = [];

        if (bookingDetail) {
          // 尝试多种可能的字段名
          venueId = bookingDetail.venueId || bookingDetail.venue_id;
          bookingDate = bookingDetail.bookingDate || bookingDetail.booking_date || bookingDetail.date;
          
          // 尝试获取时间段ID
          if (bookingDetail.slotIds) {
            slotIds = Array.isArray(bookingDetail.slotIds) ? bookingDetail.slotIds : [bookingDetail.slotIds];
          } else if (bookingDetail.slotId) {
            slotIds = [bookingDetail.slotId];
          } else if (bookingDetail.slot_ids) {
            slotIds = Array.isArray(bookingDetail.slot_ids) ? bookingDetail.slot_ids : [bookingDetail.slot_ids];
          } else if (bookingDetail.slot_id) {
            slotIds = [bookingDetail.slot_id];
          }
        }

        // 从响应中获取场馆和日期信息（备用方案）
        if (response && response.data) {
          const responseData = response.data;
          venueId = venueId || responseData.venueId || responseData.venue_id;
          bookingDate = bookingDate || responseData.bookingDate || responseData.booking_date || responseData.date;
        }

        // 确保我们有正确的数据格式
        const actualBookingDate = bookingDetail?.bookingDate || bookingDetail?.booking_date || bookingDate;
        const actualVenueId = bookingDetail?.venueId || bookingDetail?.venue_id || venueId;

        if (actualVenueId && actualBookingDate) {
          try {
            // 🔥 使用统一时间段管理器释放时间段
            try {
              const { default: unifiedTimeSlotManager } = await import('../utils/unified-timeslot-manager.js');
              if (unifiedTimeSlotManager && typeof unifiedTimeSlotManager.releaseTimeSlots === 'function') {
                await unifiedTimeSlotManager.releaseTimeSlots({
                  venueId: actualVenueId,
                  date: actualBookingDate,
                  slotIds: slotIds,
                  reason: 'booking-cancelled',
                  bookingId: bookingId
                });
              } else {
                // 备用方案：清除缓存
                if (unifiedTimeSlotManager && typeof unifiedTimeSlotManager.clearCache === 'function') {
                  unifiedTimeSlotManager.clearCache(actualVenueId, actualBookingDate);
                }
              }
            } catch (importError) {
              console.warn('[BookingStore] 统一时间段管理器不可用，使用备用方案:', importError);
              
              // 备用方案：使用缓存管理器
              try {
                const { default: cacheManager } = await import('../utils/cache-manager.js');
                if (cacheManager && typeof cacheManager.clearTimeSlotCache === 'function') {
                  cacheManager.clearTimeSlotCache(actualVenueId, actualBookingDate);
                }
              } catch (cacheError) {
                console.warn('[BookingStore] 缓存管理器也不可用:', cacheError);
              }
            }

            // 🔥 通知venue store更新时间段状态
            try {
              const venueStore = await getVenueStore();
              if (venueStore && typeof venueStore.onBookingCancelled === 'function') {
                await venueStore.onBookingCancelled(actualVenueId, actualBookingDate, slotIds);
              } else if (venueStore && typeof venueStore.refreshTimeSlotStatus === 'function') {
                // 备用方案：刷新整个日期的时间段状态
                await venueStore.refreshTimeSlotStatus(actualVenueId, actualBookingDate);
              }
            } catch (venueError) {
              console.warn('[BookingStore] 通知venue store失败:', venueError);
            }
          } catch (eventError) {
            console.error('[BookingStore] 使用统一时间段管理器释放时间段失败:', eventError);
          }
        }

        // 发送全局事件通知
        uni.$emit('orderCancelled', {
          orderId: bookingId,
          type: 'booking'
        });

        // 延迟刷新预约列表，确保后端状态已更新
        setTimeout(() => {
          this.refreshBookingList();
        }, 1000);

        showSuccess('预约已取消');
        return response;
      } catch (error) {
        console.error('[BookingStore] 取消预约失败:', error);
        
        // 根据错误类型显示不同的提示
        if (error.message === '请求超时') {
          showError('操作超时，请检查网络连接');
        } else {
          showError(error.message || '取消预约失败');
        }
        throw error;
      }
    },
    
    // 清空预约详情
    clearBookingDetail() {
      this.bookingDetail = null;
    },
    
    // 重置分页信息
    resetPagination() {
      this.pagination = {
        current: 1,
        pageSize: 10,
        total: 0,
        totalPages: 1,
        currentPage: 1
      };
    },

    // 创建拼场订单
    async createSharingOrder({ orderId, data }) {
      try {
        this.setLoading(true);
        const response = await sharingApi.createSharingOrder({ orderId, data });
        showSuccess('申请拼场成功');
        return response;
      } catch (error) {
        console.error('[BookingStore] 申请拼场失败:', error);
        showError(error.message || '申请拼场失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // 获取拼场订单列表
    async getSharingOrdersList(params = {}) {
      try {
        this.setLoading(true);
        const response = await sharingApi.getJoinableSharingOrders(params);
        const orders = response?.list || response?.data || [];
        this.setSharingOrders(Array.isArray(orders) ? orders : []);
        const pagination = response?.pagination || {
          current: response?.page || 1,
          pageSize: response?.pageSize || (params.pageSize || 10),
          total: response?.total || (orders.length || 0),
          totalPages: response?.totalPages || 1,
          currentPage: response?.page || 1
        };
        this.setPagination(pagination);
        return response;
      } catch (error) {
        console.error('[BookingStore] 获取拼场订单失败:', error);
        showError(error.message || '获取拼场订单失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // 获取场馆可用时间段
    async getVenueAvailableSlots(venueId, date) {
      try {
        this.setLoading(true);
        const response = await bookingApi.getVenueAvailableSlots(venueId, date);
        return response;
      } catch (error) {
        console.error('[BookingStore] 获取场馆可用时间段失败:', error);
        showError('获取可用时间段失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // 申请拼场预约
    async applySharedBooking(orderId, data) {
      try {
        this.setLoading(true);
        const response = await sharingApi.applySharedBooking(orderId, data);
        showSuccess('拼场申请成功');
        return response;
      } catch (error) {
        console.error('[BookingStore] 拼场预约申请失败:', error);
        showError('拼场申请失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // 创建新的拼场订单
    async createSharingOrderNew(sharingData) {
      try {
        this.setLoading(true);
        const response = await sharingApi.createSharingOrderNew(sharingData);
        showSuccess('创建拼场订单成功');
        return response;
      } catch (error) {
        console.error('[BookingStore] 创建拼场订单失败:', error);
        showError(error.message || '创建拼场订单失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // 获取拼场订单详情
    async getSharingOrderDetail(orderId) {
      try {
        this.setLoading(true);
        const response = await sharingApi.getSharingOrderDetail(orderId);
        this.setSharingDetail(response.data || response);
        return response;
      } catch (error) {
        console.error('[BookingStore] 获取拼场订单详情失败:', error);
        showError(error.message || '获取拼场订单详情失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // 加入拼场订单
    async joinSharingOrder(orderId) {
      try {
        this.setLoading(true);
        const response = await sharingApi.joinSharingOrder(orderId);
        showSuccess('加入拼场成功');
        return response;
      } catch (error) {
        console.error('[BookingStore] 加入拼场失败:', error);
        showError(error.message || '加入拼场失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // 获取我创建的拼场订单
    async getMyCreatedSharingOrders() {
      try {
        this.setLoading(true);
        const response = await sharingApi.getMyCreatedSharingOrders();
        this.setUserSharingOrders(response.data || []);
        return response;
      } catch (error) {
        console.error('[BookingStore] 获取我创建的拼场订单失败:', error);
        showError(error.message || '获取我创建的拼场订单失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // 处理拼场申请
    async handleSharingRequest({ requestId, data }) {
      try {
        this.setLoading(true);
        const response = await sharingApi.handleSharingRequest({ requestId, data });
        showSuccess('处理拼场申请成功');
        return response;
      } catch (error) {
        console.error('[BookingStore] 处理拼场申请失败:', error);
        showError(error.message || '处理拼场申请失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // 获取用户拼场申请
    async getUserSharingOrders(params = {}) {
      try {
        this.setLoading(true);
        const response = await sharingApi.getUserSharingOrders(params);
        this.setUserSharingOrders(response.data || []);
        return response;
      } catch (error) {
        console.error('[BookingStore] 获取拼场申请失败:', error);
        showError(error.message || '获取拼场申请失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // 获取用户加入的拼场订单
    async getUserJoinedSharingOrders(params = {}) {
      try {
        this.setLoading(true);
        const response = await sharingApi.getUserJoinedSharingOrders(params);
        this.setJoinedSharingOrders(response.data || []);
        return response;
      } catch (error) {
        console.error('[BookingStore] 获取拼场申请失败:', error);
        showError(error.message || '获取拼场申请失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // 获取拼场详情
    async getSharingDetail(sharingId) {
      try {
        this.setLoading(true);
        const response = await sharingApi.getSharingDetail(sharingId);
        this.setSharingDetail(response.data || response);
        return response;
      } catch (error) {
        console.error('[BookingStore] 获取拼场详情失败:', error);
        showError(error.message || '获取拼场详情失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // 移除拼场参与者
    async removeSharingParticipant({ sharingId, participantId }) {
      try {
        this.setLoading(true);
        const response = await sharingApi.removeSharingParticipant({ 
          sharingId, 
          participantId 
        });
        showSuccess('移除参与者成功');
        
        // 刷新拼场详情
        await this.getSharingDetail(sharingId);
        
        return response;
      } catch (error) {
        console.error('[BookingStore] 移除拼场参与者失败:', error);
        showError(error.message || '移除参与者失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // 更新拼场设置
    async updateSharingSettings({ sharingId, settings }) {
      try {
        this.setLoading(true);
        const response = await sharingApi.updateSharingSettings({ 
          sharingId, 
          settings 
        });
        showSuccess('更新拼场设置成功');
        
        // 刷新拼场详情
        await this.getSharingDetail(sharingId);
        
        return response;
      } catch (error) {
        console.error('[BookingStore] 更新拼场设置失败:', error);
        showError(error.message || '更新拼场设置失败');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    
    // 设置缓存数据
    setCacheData(cacheKey, data) {
      if (this.cache[cacheKey]) {
        this.cache[cacheKey].data = data;
        this.cache[cacheKey].timestamp = Date.now();
      }
    },
    
    clearCache(cacheKey = null) {
      if (cacheKey) {
        // 清除特定缓存
        if (this.cache[cacheKey]) {
          this.cache[cacheKey].data = null;
          this.cache[cacheKey].timestamp = 0;
        }
      } else {
        // 清除所有缓存
        this.cache.bookingList.data = null;
        this.cache.bookingList.timestamp = 0;
        this.cache.bookingDetails.clear();
        this.cache.lastRefreshTime = 0;
      }
    },
    
    // 刷新预约列表（清除缓存）
    async refreshBookingList() {
      this.clearCache('bookingList');
      return await this.getUserBookings({
        page: 1,
        refresh: true,
        _t: Date.now() // 🔥 添加时间戳，确保每次请求都有唯一的key，避免被去重机制阻塞
      });
    }
  }
});
