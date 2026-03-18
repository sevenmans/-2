<template>
  <view class="container">
    <scroll-view scroll-y class="main-scroll-view">      
      <view class="content-wrapper">
    <!-- 场馆信息 -->
    <view class="venue-summary" v-if="venue">
        <image :src="resolveFileUrl(venue.image) || 'https://via.placeholder.com/400x200?text=场馆图片'" class="venue-image" mode="aspectFill" />
        <view class="venue-info">
          <text class="venue-name">{{ venue.name }}</text>
          <text class="venue-location">{{ venue.location }}</text>
          <text class="venue-price">¥{{ venue.price }}/小时</text>
        </view>
      </view>
      
      <!-- 预约信息表单 -->
      <view class="booking-form">
        <!-- 预约类型 -->
        <!-- 预约类型显示 -->
        <view class="form-section">
          <text class="section-title">预约类型</text>
          <view class="booking-type-display">
            <text class="booking-type-text">{{ bookingForm.bookingType === 'EXCLUSIVE' ? '独享预约' : '拼场预约' }}</text>
          </view>
        </view>
          
          <!-- 拼场说明 -->
          <view class="sharing-notice" v-if="(venue && venue.supportSharing) && bookingForm.bookingType === 'SHARED'">
            <view class="notice-header">
              <view class="notice-icon">🏆</view>
              <text class="notice-title">拼场预约说明</text>
            </view>
            <view class="notice-content">
              <view class="notice-item">
                <view class="item-icon">✨</view>
                <text class="item-text">本平台专为球队提供拼场服务</text>
              </view>
              <view class="notice-item">
                <view class="item-icon">⚡</view>
                <text class="item-text">只需一个球队申请即可成功拼场</text>
              </view>
              <view class="notice-item">
                <view class="item-icon">📝</view>
                <text class="item-text">请在队伍名称中注明球队信息</text>
              </view>
              <view class="notice-item">
                <view class="item-icon">📞</view>
                <text class="item-text">联系方式用于其他球队联系您</text>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 时间选择 -->
        <view class="form-section">
          <text class="section-title">预约时间</text>
          <view class="time-info">
            <text class="time-text">{{ formatDateTime(selectedDate) }}</text>
          </view>
          

        </view>
        
        <!-- 拼场信息 (仅拼场时显示) -->
        <view class="form-section" v-if="bookingForm.bookingType === 'SHARED'">
          <text class="section-title">拼场信息</text>
          
          <view class="form-item">
            <text class="item-label">球队名称 <text class="required">*</text></text>
            <input 
              v-model="bookingForm.teamName" 
              placeholder="请输入球队名称（如：XX篮球队）"
              class="form-input"
              maxlength="20"
            />
          </view>
          
          <view class="form-item">
            <text class="item-label">联系方式 <text class="required">*</text></text>
            <input 
              v-model="bookingForm.contactInfo" 
              placeholder="请输入联系方式（供其他球队联系）"
              class="form-input"
              maxlength="20"
            />
          </view>
          

          
          <!-- 拼场说明 -->
          <view class="sharing-notice">
            <view class="notice-header">
              <view class="notice-icon">ℹ️</view>
              <text class="notice-title">拼场说明</text>
            </view>
            <view class="notice-content">
              <view class="notice-item">
                <view class="item-icon">•</view>
                <text class="item-text">拼场预约需要等待其他用户加入</text>
              </view>
              <view class="notice-item">
                <view class="item-icon">•</view>
                <text class="item-text">如果预约时间前2小时内无人加入，系统将自动退款</text>
              </view>
              <view class="notice-item">
                <view class="item-icon">•</view>
                <text class="item-text">请确保联系方式准确，便于其他用户联系</text>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 预约描述 -->
        <view class="form-section">
          <text class="section-title">{{ bookingForm.bookingType === 'SHARED' ? '拼场说明' : '备注信息' }}</text>
          <textarea
            v-model="bookingForm.description"
            :placeholder="bookingForm.bookingType === 'SHARED' ? '球队实力中等，出汗局' : '请输入备注信息（可选）'"
            class="form-textarea"
            maxlength="200"
          ></textarea>
        </view>
      </view>
      
      <!-- 费用明细 -->
      <view class="cost-summary">
        <text class="summary-title">费用明细</text>
        
        <!-- 多个时间段的费用明细 -->
        <template v-if="selectedSlots && selectedSlots.length > 0">
          <view class="cost-item" v-for="(slot, index) in selectedSlots" :key="index">
            <text>{{ slot.startTime }}-{{ slot.endTime }}</text>
            <text>¥{{ getSlotPrice(slot) }}</text>
          </view>
        </template>
        
        <!-- 单个时间段的费用明细（兼容） -->
        <template v-else-if="selectedSlot">
          <view class="cost-item">
            <text>{{ selectedSlot.startTime }}-{{ selectedSlot.endTime }}</text>
            <text>¥{{ getSlotPrice(selectedSlot) }}</text>
          </view>
        </template>
        
        <!-- 默认场地费用 -->
        <template v-else>
          <view class="cost-item">
            <text>场地费用</text>
            <text>¥{{ venue?.price || 0 }}</text>
          </view>
        </template>
        
        <!-- 显示总价和拼场优惠信息 -->
        <template v-if="bookingForm.bookingType === 'SHARED'">
          <view class="cost-item" style="color: #ff6b00; background-color: #fff8f0; padding: 10rpx; border-radius: 8rpx; margin-top: 10rpx;">
            <text>拼场优惠</text>
            <text>¥{{ (totalCost / 2).toFixed(2) }} (5折)</text>
          </view>
          <view class="cost-total" style="border-top: 1px dashed #eee; padding-top: 20rpx; margin-top: 10rpx;">
            <text>总计（原价）</text>
            <text>¥{{ totalCost }}</text>
          </view>
          <view class="cost-total" style="margin-top: 5rpx;">
            <text>实付金额</text>
            <text class="total-amount" style="color: #ff6b00; font-size: 36rpx;">¥{{ (totalCost / 2).toFixed(2) }}</text>
          </view>
          <view class="info-tip" style="font-size: 24rpx; color: #999; margin-top: 10rpx; text-align: right;">
            <text>拼场订单，费用由两队均摊，每队支付总费用的50%</text>
          </view>
        </template>
        <template v-else>
          <view class="cost-total">
            <text>总计</text>
            <text class="total-amount">¥{{ totalCost }}</text>
          </view>
        </template>
      </view>
    </scroll-view>

  <!-- 底部操作 -->
  <view class="bottom-actions">
      <view class="bottom-cost">
        <text class="cost-label">{{ bookingForm.bookingType === 'SHARED' ? '实付金额：' : '总费用：' }}</text>
        <text class="cost-value" :class="{'shared-price': bookingForm.bookingType === 'SHARED'}">
          ¥{{ bookingForm.bookingType === 'SHARED' ? (totalCost / 2).toFixed(2) : totalCost.toFixed(2) }}
        </text>
      </view>
      <view class="action-buttons">
        <button class="cancel-btn" @click="goBack">取消</button>
        <button class="confirm-btn" :disabled="!canConfirm" @click="confirmBooking">确认预约</button>
      </view>
    </view>
  </view>

  <!-- 自定义确认预约弹窗 -->
  <view v-if="showConfirmDialog" class="confirm-dialog-overlay" @click="cancelConfirmDialog">
    <view class="confirm-dialog" @click.stop>
      <view class="dialog-header">
        <text class="dialog-title">确认预约</text>
      </view>
      <view class="dialog-content">
        <!-- 场馆名 -->
        <view class="info-row">
          <text class="info-label">场馆：</text>
          <text class="info-value">{{ confirmDialogData?.venueName }}</text>
        </view>
        
        <!-- 时间信息 -->
        <view class="info-row">
          <text class="info-label">时间：</text>
          <view class="info-value-column">
            <text class="info-value">{{ confirmDialogData?.timeInfo }}</text>
            <view v-if="confirmDialogData?.timeDetails?.length > 0" class="time-details">
              <text v-for="(detail, index) in confirmDialogData.timeDetails" :key="index" class="time-detail-item">
                {{ detail }}
              </text>
            </view>
          </view>
        </view>
        
        <!-- 预约类型 -->
        <view class="info-row">
          <text class="info-label">类型：</text>
          <text class="info-value">{{ confirmDialogData?.bookingType }}</text>
        </view>
        
        <!-- 拼场信息 -->
        <template v-if="confirmDialogData?.isShared">
          <view class="info-row">
            <text class="info-label">队伍：</text>
            <text class="info-value">{{ confirmDialogData?.teamName }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">联系：</text>
            <text class="info-value">{{ confirmDialogData?.contactInfo }}</text>
          </view>
        </template>
        
        <!-- 描述 -->
        <view v-if="confirmDialogData?.description" class="info-row">
          <text class="info-label">备注：</text>
          <text class="info-value">{{ confirmDialogData?.description }}</text>
        </view>
        
        <!-- 金额信息 -->
        <view class="info-row price-row">
          <text class="info-label">{{ confirmDialogData?.isShared ? '实付金额：' : '总费用：' }}</text>
          <text class="info-value price-value">¥{{ confirmDialogData?.actualPrice }}</text>
        </view>
        <view v-if="confirmDialogData?.isShared" class="price-note">
          <text>总费用 ¥{{ confirmDialogData?.totalPrice }}，拼场费用均摊</text>
        </view>
      </view>
      <view class="dialog-actions">
        <button class="dialog-btn cancel-btn" @click="cancelConfirmDialog">取消</button>
        <button class="dialog-btn confirm-btn" @click="confirmDialogAction">确认预约</button>
      </view>
    </view>
  </view>
  </template>

<script>
import { resolveFileUrl } from '@/utils/url.js'
import { useVenueStore } from '@/stores/venue.js'
import { useBookingStore } from '@/stores/booking.js'
import { useUserStore } from '@/stores/user.js'
import { getVenueTimeSlots, refreshTimeSlotStatus } from '@/api/timeslot.js'
import { debugTimeSlotExpired } from '@/utils/debug-timeslot-expired.js'



export default {
  name: 'BookingCreate',
  
  data() {
    return {
      venueStore: null,
      bookingStore: null,
      userStore: null,
      venueId: null,
      selectedDate: '',
      selectedSlot: null, // 🔥 修复问题3: 添加 selectedSlot 到 data 中
      selectedSlots: [], // 存储多个选中的时间段
      isRefreshing: false, // 是否正在刷新
      refreshRequested: false, // 是否有刷新请求
      forceRefreshRequested: false, // 是否有强制刷新请求

      // 🔒 并发控制
      isConfirmingBooking: false,
      isLoadingData: false,

      // 📊 性能监控
      performanceMetrics: {
        loadStartTime: 0,
        confirmStartTime: 0,
        networkStartTime: 0
      },

      // 🗜️ 数据压缩配置
      compressionConfig: {
        enabled: true,
        minSize: 1000, // 超过1KB才压缩
        level: 6 // 压缩级别
      },

      bookingForm: {
        bookingType: 'EXCLUSIVE',
        teamName: '',
        contactInfo: '',
        description: ''
      },

      // 📱 用户体验优化
      uxState: {
        showLoading: false,
        loadingText: '加载中...',
        lastError: null,
        retryCount: 0
      },

      // 🎯 自定义确认弹窗
      showConfirmDialog: false,
      confirmDialogData: null,
      confirmDialogResolve: null
    }
  },
  
  computed: {
    timeSlots() {
      return this.venueStore?.timeSlots || []
    },

    userInfo() {
      return this.userStore?.userInfoGetter || {}
    },

    // 获取场馆信息，确保有默认值
    venue() {
      const venueData = this.venueStore?.venueDetailGetter || this.venueStore?.venueDetail

      if (!venueData) {
        return null
      }

      const result = {
        ...venueData,
        supportSharing: venueData.supportSharing !== undefined ? venueData.supportSharing : true,
        price: venueData.price || 0
      }

      return result
    },
    
    totalCost() {
      // 如果有多个时间段，计算所有时间段的总价格
      if (this.selectedSlots && this.selectedSlots.length > 0) {
        return this.selectedSlots.reduce((sum, slot) => {
          let slotPrice = 0

          // 优先使用时间段的价格
          if (slot.price) {
            slotPrice = parseFloat(slot.price)
          } else if (slot.pricePerHour) {
            slotPrice = parseFloat(slot.pricePerHour)
          } else {
            // 使用场馆价格的一半（30分钟价格）
            const venuePrice = this.venue?.price || 0
            slotPrice = parseFloat(venuePrice) / 2 || 0
          }

          return sum + slotPrice
        }, 0)
      }

      // 兼容单个时间段的情况
      if (this.selectedSlot && this.selectedSlot.price) {
        return parseFloat(this.selectedSlot.price)
      }

      // 如果时间段有每小时价格信息
      if (this.selectedSlot && this.selectedSlot.pricePerHour) {
        return parseFloat(this.selectedSlot.pricePerHour)
      }

      const venuePrice = this.venue?.pricePerHour || this.venue?.price || 0
      return parseFloat(venuePrice) || 0
    },
    

    
    // 🔥 修复问题3：修正isMultiSlot计算属性的判断逻辑
    isMultiSlot() {
      // 判断是否为多时间段模式
      // 逻辑：
      // 1. 如果 selectedSlots 数组有多个元素（>= 1），则为多时间段模式
      // 2. 如果只有 selectedSlot 单个对象，则为单时间段模式
      // 3. 优先检查 selectedSlots 数组

      if (this.selectedSlots && this.selectedSlots.length > 0) {
        // 有 selectedSlots 数组，使用数组模式
        return true
      }

      // 只有 selectedSlot 单个对象，或者都没有
      return false
    },
    
    canConfirm() {
      const hasDate = !!this.selectedDate
      const hasSlot = !!(this.selectedSlots?.length > 0 || this.selectedSlot)
      const hasVenue = !!this.venue?.id
      const hasPrice = !!(this.venue?.price)
      
      const baseValid = hasDate && hasSlot && hasVenue && hasPrice

      if (this.bookingForm.bookingType === 'SHARED') {
        const hasTeamName = !!(this.bookingForm.teamName && this.bookingForm.teamName.trim())
        const hasContactInfo = !!(this.bookingForm.contactInfo && this.bookingForm.contactInfo.trim())
        const result = baseValid && hasTeamName && hasContactInfo
        return result
      }

      return baseValid
    }
  },
  
  onLoad(options) {
    // 初始化Pinia stores
    this.venueStore = useVenueStore()
    this.bookingStore = useBookingStore()
    this.userStore = useUserStore()

    this.venueId = options.venueId
    this.selectedDate = options.date

    // 设置预约类型
    if (options.bookingType) {
      this.bookingForm.bookingType = options.bookingType
    }

    // 处理选中的时间段数据
    if (options.selectedSlots) {
      try {
        this.selectedSlots = JSON.parse(decodeURIComponent(options.selectedSlots))

        // 从时间段数据中提取正确的日期
        if (this.selectedSlots.length > 0 && this.selectedSlots[0].date) {
          const slotDate = this.selectedSlots[0].date
          if (this.selectedDate !== slotDate) {
            this.selectedDate = slotDate
          }
        }
      } catch (error) {
        console.error('[BookingCreate] 解析时间段数据失败:', error)
      }
    }
  },

  onShow() {
    // 监听时间段状态更新事件
    this.setupEventListeners()

    if (this.venueId) {
      // 使用优化的并行加载方法
      this.optimizedLoadData()
    }
  },

  onHide() {
    // 移除事件监听
    this.removeEventListeners()
  },
  
  methods: {
    resolveFileUrl,
    // --- 日志和调试 --- 
    log(message, ...args) {
    },
    logError(message, ...args) {
      console.error(`[BookingCreate] ❌ ${message}`, ...args);
    },

    // --- UI 交互 ---
    showToast(title, icon = 'none', duration = 2000) {
      uni.showToast({ title, icon, duration });
    },
    showLoading(title = '加载中...') {
      if (!this.uxState.showLoading) {
        this.uxState.showLoading = true;
        uni.showLoading({ title, mask: true });
      }
    },
    hideLoading() {
      if (this.uxState.showLoading) {
        this.uxState.showLoading = false;
        uni.hideLoading();
      }
    },

    
    async optimizedLoadData() {
      this.isLoadingData = true;
      uni.showLoading({ title: '加载中...' });

      try {
        // 检查并使用缓存
        const cacheKey = `booking_page_data_${this.venueId}_${this.selectedDate}`;
        const cachedData = uni.getStorageSync(cacheKey);
        const now = Date.now();

        if (cachedData && (now - cachedData.timestamp < 5 * 60 * 1000)) { // 5分钟缓存
          this.venueStore.setVenueDetail(cachedData.venue);
          this.venueStore.setTimeSlots(cachedData.timeSlots);
          uni.hideLoading();
          this.isLoadingData = false;
          return;
        }

        // 并行加载场馆详情和时间段状态
        const promises = [this.loadVenueDetail()];
        if (this.selectedDate) {
          promises.push(this.refreshTimeSlotStatus());
        }
        await Promise.all(promises);

        // 缓存新数据
        const newCacheData = {
          venue: this.venue,
          timeSlots: this.timeSlots,
          timestamp: Date.now()
        };
        uni.setStorageSync(cacheKey, newCacheData);

      } catch (error) {
        console.error('[BookingCreate] ❌ 数据加载失败:', error);
        uni.showToast({
          title: '数据加载失败，请稍后重试',
          icon: 'none',
          duration: 2000
        });
      } finally {
        this.isLoadingData = false;
        uni.hideLoading();
      }
    },
    
    // 🔄 刷新时间段状态
    async refreshTimeSlotStatus(force = false) {
      this.log(`[TimeSlot] 刷新请求 (Force: ${force})`);
      if (force) {
        this.forceRefreshRequested = true;
      } else {
        this.refreshRequested = true;
      }

      if (this.isRefreshing) {
        this.log('[TimeSlot] 刷新已在进行中，新请求已排队');
        return;
      }

      this.isRefreshing = true;

      while (this.forceRefreshRequested || this.refreshRequested) {
        const isForced = this.forceRefreshRequested;

        // 消费本次执行的标记
        this.forceRefreshRequested = false;
        this.refreshRequested = false;

        this.showLoading('更新状态...');
        this.log(`[TimeSlot] 开始刷新 (Forced: ${isForced})`);

        try {
          // 🔥 修复问题1: 确保 loadTimeSlots 返回有效数据
          const result = await this.loadTimeSlots(this.venueId, this.selectedDate, isForced);


          // 🔥 修复: 更严格的数据提取逻辑
          let timeSlotsData = [];

          if (!result) {
            timeSlotsData = [];
          } else if (Array.isArray(result)) {
            // 直接返回数组
            timeSlotsData = result;
          } else if (result.data && Array.isArray(result.data)) {
            // 返回 {data: [...]} 格式
            timeSlotsData = result.data;
          } else if (result.success && result.data && Array.isArray(result.data)) {
            // 返回 {success: true, data: [...]} 格式
            timeSlotsData = result.data;
          } else {
            timeSlotsData = [];
          }


          // 将处理后的时间段写入 store，避免直接写 computed 属性
          const processed = this.processTimeSlots(timeSlotsData);
          if (this.venueStore && typeof this.venueStore.setTimeSlots === 'function') {
            this.venueStore.setTimeSlots(processed);
          }
          this.log('[TimeSlot] 时间段状态刷新成功');
          uni.$emit('timeSlotsStatusUpdated', { venueId: this.venueId, date: this.selectedDate });
        } catch (error) {
          this.logError('[TimeSlot] 刷新时间段状态失败', error);
          this.showToast('状态更新失败，请稍后重试', 'error');
        } finally {
          this.hideLoading();
          this.lastRefreshTime = Date.now();
        }
      }

      this.isRefreshing = false;
    },

    processTimeSlots(data) {
      if (!data || !Array.isArray(data)) {
        this.logError('processTimeSlots: 无效的时间段数据', data);
        return [];
      }
      return data.map(slot => ({
        ...slot,
        // 在这里可以添加或修改字段，以适应前端需求
      }));
    },
    
    // 🔍 验证预约数据一致性
    validateBookingData() {
      
      // 验证预约类型和选中的时间段
      const selectedSlots = this.selectedSlots || this.bookingForm.selectedSlots || []
      if (selectedSlots.length > 0) {
        // 检查时间段状态是否仍然可用
        selectedSlots.forEach(slot => {
          const currentSlot = this.timeSlots.find(ts => ts.id === slot.id)
          if (currentSlot && currentSlot.status !== 'AVAILABLE') {
            // 时间段状态已变更
          }
        })
      }
    },
    
    // 加载场馆详情
    async loadVenueDetail() {
      try {
        // 📊 性能监控：开始加载场馆详情
        this.recordPerformanceMetric('venue-detail-start', { venueId: this.venueId })
        
        
        // 🧠 智能缓存：检查场馆详情缓存
        const cacheKey = `venue_detail_${this.venueId}`
        const cachedVenue = uni.getStorageSync(cacheKey)
        const now = Date.now()
        
        if (cachedVenue && cachedVenue.timestamp && (now - cachedVenue.timestamp < 5 * 60 * 1000)) {
          // 📊 性能监控：缓存命中
          this.recordPerformanceMetric('venue-cache-hit', {
            venueId: this.venueId,
            cacheAge: now - cachedVenue.timestamp
          })
          
          this.venueStore.setVenueDetail(cachedVenue.data)
        } else {
          // 🗜️ 数据压缩：优化请求参数
          const requestParams = {
            venueId: parseInt(this.venueId),
            compress: this.compressionConfig.enabled,
            fields: this.compressionConfig.optimizeFields ? 'id,name,price,supportSharing,location,openingHours,status' : undefined
          }
          
          await this.venueStore.getVenueDetail(this.venueId, requestParams)
          
          // 🧠 智能缓存：存储场馆详情
          try {
            const cacheData = {
              data: this.venue,
              timestamp: now
            }
            uni.setStorageSync(cacheKey, cacheData)
          } catch (cacheError) {
          }
        }
        

        // 如果有日期，加载时间段
        if (this.selectedDate) {
          await this.loadTimeSlots()
        }
        
        // 📊 性能监控：场馆详情加载成功
        this.recordPerformanceMetric('venue-detail-success', { 
          venueId: this.venueId,
          venueName: this.venue?.name 
        })
        
      } catch (error) {
        console.error('[BookingCreate] ❌ 加载场馆详情失败:', error)
        
        // 📊 性能监控：场馆详情加载失败
        this.recordPerformanceMetric('venue-detail-error', { 
          venueId: this.venueId,
          error: error.message 
        })
        
        // 如果后端不可用，设置模拟数据用于测试
        const mockVenueData = {
          id: this.venueId || 1,
          name: '测试体育馆',
          price: 120,
          supportSharing: true,
          location: '测试地址',
          openingHours: '08:00 - 22:00'
        }
        
        this.venueStore.setVenueDetail(mockVenueData)

        // 设置模拟时间段数据
        if (this.selectedDate) {
          const mockTimeSlots = [
            {
              id: 1,
              startTime: '09:00',
              endTime: '10:00',
              status: 'AVAILABLE',
              price: 120
            },
            {
              id: 2,
              startTime: '10:00',
              endTime: '11:00',
              status: 'AVAILABLE',
              price: 120
            }
          ]
          this.venueStore.setTimeSlots(mockTimeSlots)
        }
        
        // 🎯 用户体验：错误反馈
        this.showUserFeedback('error', '场馆信息加载失败，使用测试数据')
        
        // 📊 性能监控：使用模拟数据
        this.recordPerformanceMetric('venue-mock-data', { venueId: this.venueId })
      }
    },
    
    // 加载场馆和指定时间段
    async loadVenueAndSlot(slotId) {
      try {
        await this.venueStore.getVenueDetail(this.venueId)
        await this.loadTimeSlots()
        
        
        // 查找并选择指定的时间段
        let slot = this.timeSlots.find(s => s.id == slotId)
        
        // 如果通过ID没找到，尝试通过时间段字符串查找（格式：'09:00-10:00'）
        if (!slot && slotId.includes('-')) {
          const [startTime, endTime] = slotId.split('-')
          slot = this.timeSlots.find(s => s.startTime === startTime && s.endTime === endTime)
        }
        
        
        if (slot) {
          this.selectedSlot = slot
        } else {
        }
      } catch (error) {
        console.error('加载失败:', error)
        
        // 如果后端不可用，设置模拟数据用于测试
        this.venueStore.setVenueDetail({
          id: this.venueId || 1,
          name: '测试体育馆',
          price: 120,
          supportSharing: true,
          location: '测试地址',
          openingHours: '08:00 - 22:00'
        })
        
        // 设置模拟时间段数据
        const mockSlots = [
          {
            id: 1,
            startTime: '09:00',
            endTime: '10:00',
            status: 'AVAILABLE',
            price: 120
          },
          {
            id: 2,
            startTime: '10:00',
            endTime: '11:00',
            status: 'AVAILABLE',
            price: 120
          },
          {
            id: 3,
            startTime: '14:00',
            endTime: '15:00',
            status: 'AVAILABLE',
            price: 120
          }
        ]
        
        this.venueStore.setTimeSlots(mockSlots)
        
        // 如果有指定的slotId，尝试选择对应的时间段
        if (slotId) {
          let slot = mockSlots.find(s => s.id == slotId)
          
          // 如果通过ID没找到，尝试通过时间段字符串查找
          if (!slot && slotId.includes('-')) {
            const [startTime, endTime] = slotId.split('-')
            slot = mockSlots.find(s => s.startTime === startTime && s.endTime === endTime)
          }
          
          if (slot) {
            this.selectedSlot = slot
          }
        }
        
        uni.showToast({
          title: '使用模拟数据',
          icon: 'none'
        })
      }
    },
    
    // 加载时间段
    async loadTimeSlots() {
      if (!this.selectedDate) {
        return { data: [] }  // 🔥 修复：返回空数据而不是 undefined
      }


      try {
        // 显示加载状态
        uni.showLoading({ title: '加载时间段...' })

        const result = await this.venueStore.getVenueTimeSlots({
          venueId: this.venueId,
          date: this.selectedDate,
          loading: false  // 🔥 修复：禁用API请求的自动loading，避免与手动loading冲突
        })


        // 验证数据
        const timeSlots = this.timeSlots || []

        if (timeSlots.length === 0) {
          // 显示友好提示，不自动生成默认时间段
          uni.showToast({
            title: '该日期暂无可预约时间段',
            icon: 'none',
            duration: 2000
          })
        }


        // 🔥 修复：返回结果数据，供 refreshTimeSlotStatus 使用
        return result || { data: timeSlots }

      } catch (error) {
        console.error('[BookingCreate] 加载时间段失败:', error)

        // 显示用户友好的错误信息
        uni.showToast({
          title: '加载时间段失败，请重试',
          icon: 'none',
          duration: 2000
        })

        // 记录错误，不自动生成默认时间段
        console.error('[BookingCreate] 时间段加载失败，请手动刷新或联系管理员')
        // 不使用备用方案生成默认时间段，避免覆盖已预约状态

        // 🔥 修复：即使出错也返回空数据，而不是 undefined
        return { data: [] }
      } finally {
        // 隐藏加载状态
        uni.hideLoading()
      }
    },
    

    

    

    

    
    // 格式化日期时间
    formatDateTime(date, slot) {
      
      if (!date) {
        return '请选择时间'
      }
      
      try {
        const dateObj = new Date(date)
        const year = dateObj.getFullYear()
        const month = dateObj.getMonth() + 1
        const day = dateObj.getDate()
        const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dateObj.getDay()]
        
        const dateStr = `${year}年${month}月${day}日 ${weekDay}`
        
        // 如果有多个时间段，显示所有时间段
        if (this.selectedSlots && this.selectedSlots.length > 0) {
          // 按时间排序时间段，确保正确的显示顺序
          const sortedSlots = [...this.selectedSlots].sort((a, b) => {
            // 比较时间字符串 (格式: "HH:MM")
            const timeA = a.startTime.split(':').map(Number);
            const timeB = b.startTime.split(':').map(Number);
            
            // 先比较小时，再比较分钟
            if (timeA[0] !== timeB[0]) {
              return timeA[0] - timeB[0];
            }
            return timeA[1] - timeB[1];
          });
          
          const timeSlots = sortedSlots.map(slot => {
            let startTime = slot.startTime
            let endTime = slot.endTime
            
            // 如果时间包含秒，去掉秒部分
            if (startTime && startTime.length > 5) {
              startTime = startTime.substring(0, 5)
            }
            if (endTime && endTime.length > 5) {
              endTime = endTime.substring(0, 5)
            }
            
            return `${startTime}-${endTime}`
          })
          
          // 计算总时长
          const totalDuration = sortedSlots.reduce((total, slot) => {
            return total + this.calculateDuration(slot.startTime, slot.endTime)
          }, 0)
          
          // 格式化总时长显示
          const durationText = totalDuration % 1 === 0 ? totalDuration : totalDuration.toFixed(1)
          
          // 显示时间范围：最早开始时间 - 最晚结束时间
          const firstSlot = sortedSlots[0];
          const lastSlot = sortedSlots[sortedSlots.length - 1];
          let startTime = firstSlot.startTime.length > 5 ? firstSlot.startTime.substring(0, 5) : firstSlot.startTime;
          let endTime = lastSlot.endTime.length > 5 ? lastSlot.endTime.substring(0, 5) : lastSlot.endTime;
          
          const result = `${dateStr} ${startTime}-${endTime} (共${durationText}小时，${sortedSlots.length}个时间段)`
          return result
        }
        
        // 兼容单个时间段的情况
        if (!slot) {
          return '请选择时间'
        }
        
        // 处理时间格式，确保显示正确
        let startTime = slot.startTime
        let endTime = slot.endTime
        
        // 如果时间包含秒，去掉秒部分
        if (startTime && startTime.length > 5) {
          startTime = startTime.substring(0, 5)
        }
        if (endTime && endTime.length > 5) {
          endTime = endTime.substring(0, 5)
        }
        
        // 计算时长
        const duration = this.calculateDuration(startTime, endTime)
        
        // 格式化时长显示
        const durationText = duration % 1 === 0 ? duration : duration.toFixed(1)
        const timeStr = `${startTime}-${endTime}`
        const result = `${dateStr} ${timeStr} (${durationText}小时)`
        
        return result
      } catch (error) {
        console.error('formatDateTime 错误:', error)
        return '时间格式错误'
      }
    },
    
    // 计算时长
    calculateDuration(startTime, endTime) {
      try {
        const [startHour, startMinute] = startTime.split(':').map(Number)
        const [endHour, endMinute] = endTime.split(':').map(Number)
        
        const startMinutes = startHour * 60 + startMinute
        const endMinutes = endHour * 60 + endMinute
        
        const durationMinutes = endMinutes - startMinutes
        const hours = durationMinutes / 60
        
        // 返回精确的小时数（保留一位小数）
        return Math.round(hours * 10) / 10
      } catch (error) {
        console.error('计算时长错误:', error)
        return 1
      }
    },
    
    // 获取单个时间段的价格
    getSlotPrice(slot) {
      // 方法1: 使用时间段的价格
      if (slot.price && slot.price > 0) {
        return parseFloat(slot.price)
      }

      // 方法2: 使用时间段的每小时价格
      if (slot.pricePerHour && slot.pricePerHour > 0) {
        return parseFloat(slot.pricePerHour)
      }

      // 方法3: 使用场馆价格（每小时）
      const venuePrice = this.venue?.price || 0
      if (venuePrice > 0) {
        // 场馆价格是每小时价格，时间段是30分钟，所以除以2
        return parseFloat(venuePrice) / 2
      }

      // 方法4: 使用默认价格
      return 60 // 默认每个时间段60元（30分钟）
    },
    
    // 获取时间段状态文本
    getSlotStatusText(status) {
      const statusMap = {
        'AVAILABLE': '可预约',
        'RESERVED': '已预约',
        'OCCUPIED': '已占用',
        'MAINTENANCE': '维护中',
        'BOOKED': '已预订',
        'SHARING': '拼场中',
        'EXPIRED': '已过期'
      }
      return statusMap[status] || status
    },
    
    // 🚀 优化的确认预约方法
    async confirmBooking() {
      // 🔒 并发控制：防止重复提交
      if (this.isConfirmingBooking) {
        return
      }
      
      // 📊 性能监控：开始预约确认流程
      const startTime = Date.now()

      // 📋 基础验证
      if (!this.canConfirm) {
        return
      }

      // 🎯 用户体验优化：显示预约确认对话框
      try {
        const confirmResult = await this.showConfirmationDialog()
        if (!confirmResult) {
          return
        }
      } catch (error) {
        console.error('[BookingCreate] ❌ 确认对话框异常:', error)
        return
      }



      // 🔍 表单验证
      if (!this.validateForm()) {
        return
      }

      // 🔒 设置并发锁
      this.isConfirmingBooking = true

      try {
        // 🎯 用户体验优化：显示加载状态
        uni.showLoading({ title: '创建中...' })
        
        // 📊 性能监控：记录预约开始
        
        let result

        // 📋 数据压缩：优化请求参数
        const compressedData = this.compressBookingData()


        // 处理多个时间段的情况 - 只创建一个订单
        if (this.selectedSlots && this.selectedSlots.length > 0) {
          // 按时间排序时间段，确保正确的开始和结束时间
          const sortedSlots = [...this.selectedSlots].sort((a, b) => {
            // 比较时间字符串 (格式: "HH:MM")
            const timeA = a.startTime.split(':').map(Number);
            const timeB = b.startTime.split(':').map(Number);
            
            // 先比较小时，再比较分钟
            if (timeA[0] !== timeB[0]) {
              return timeA[0] - timeB[0];
            }
            return timeA[1] - timeB[1];
          });
          
          
          // 获取排序后的第一个和最后一个时间段
          const firstSlot = sortedSlots[0];
          const lastSlot = sortedSlots[sortedSlots.length - 1];

          if (this.bookingForm.bookingType === 'SHARED') {
            // ===== 多时间段拼场预约价格计算 =====
            // 方案一：前端精确计算价格，后端优先使用前端价格

            // 1. 计算所有选中时间段的总价格
            const totalPrice = sortedSlots.reduce((total, slot) => {
              return total + this.getSlotPrice(slot)
            }, 0)

            // 2. 计算每队需要支付的价格（总价格的一半）
            // 拼场模式：两队共享场地费用，每队支付一半
            const pricePerTeam = Math.round((totalPrice / 2) * 100) / 100


            // ===== 构建拼场预约数据 =====
            // 🔧 关键修复：使用时间段的实际日期，而不是URL参数的日期
            const actualDate = firstSlot.date || this.selectedDate

            const sharedBookingData = {
              venueId: parseInt(this.venueId),
              date: actualDate, // 使用时间段的实际日期
              startTime: firstSlot.startTime,                                    // 最早时间段的开始时间
              endTime: lastSlot.endTime,                                         // 最晚时间段的结束时间
              teamName: this.bookingForm.teamName || '',
              contactInfo: this.bookingForm.contactInfo || '',
              maxParticipants: 2,                                               // 拼场固定2队
              description: this.bookingForm.description || '',
              slotIds: sortedSlots.map(slot => slot.id),                        // 按时间排序的时间段ID
              price: pricePerTeam                                               // 🔑 关键：传递每队价格给后端
            }


            // ===== 调用后端API创建拼场预约 =====
            result = await this.bookingStore.createSharedBooking(sharedBookingData)
          } else {
            // 多时间段独享预约
            const totalPrice = sortedSlots.reduce((total, slot) => {
              return total + this.getSlotPrice(slot)
            }, 0)

            const multiSlotBookingData = {
              venueId: parseInt(this.venueId),
              date: this.selectedDate,
              startTime: firstSlot.startTime,
              endTime: lastSlot.endTime,
              slotIds: sortedSlots.map(slot => slot.id),
              bookingType: this.bookingForm.bookingType,
              description: this.bookingForm.description || '',
              price: totalPrice || sortedSlots.length * 60, // 备用价格
              // 🔧 修复：添加fieldName字段确保数据库字段统一
              fieldName: this.venue?.name || this.venue?.fieldName || '主场地'
            }

            result = await this.bookingStore.createBooking(multiSlotBookingData)


          }
          
        } else {
          // 简化单时间段预约逻辑

          // 🔧 修复：优先使用selectedSlots数组构建预约数据
          
          let bookingData
          
          if (this.selectedSlots && this.selectedSlots.length > 0) {
            // 多时间段情况：使用selectedSlots数组
            const sortedSlots = [...this.selectedSlots].sort((a, b) => {
              const timeA = a.startTime.split(':').map(Number)
              const timeB = b.startTime.split(':').map(Number)
              if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0]
              return timeA[1] - timeB[1]
            })
            
            const firstSlot = sortedSlots[0]
            const lastSlot = sortedSlots[sortedSlots.length - 1]
            const totalPrice = sortedSlots.reduce((sum, slot) => sum + this.getSlotPrice(slot), 0)

            // 🔧 关键修复：使用时间段的实际日期，而不是URL参数的日期
            const actualDate = firstSlot.date || this.selectedDate

            bookingData = {
              venueId: parseInt(this.venueId),
              date: actualDate, // 使用时间段的实际日期
              startTime: firstSlot.startTime,
              endTime: lastSlot.endTime,
              slotId: firstSlot.id, // 主要时间段ID
              slotIds: sortedSlots.map(slot => slot.id), // 所有时间段ID
              bookingType: this.bookingForm.bookingType,
              description: this.bookingForm.description || '',
              price: totalPrice,
              fieldName: this.venueDetail?.name || this.venueDetail?.fieldName || '主场地'
            }
          } else if (this.selectedSlot) {
            // 单时间段情况：兼容原有逻辑

            // 🔧 关键修复：使用时间段的实际日期，而不是URL参数的日期
            const actualDate = this.selectedSlot.date || this.selectedDate

            bookingData = {
              venueId: parseInt(this.venueId),
              date: actualDate, // 使用时间段的实际日期
              startTime: this.selectedSlot.startTime,
              endTime: this.selectedSlot.endTime,
              slotId: this.selectedSlot.id,
              bookingType: this.bookingForm.bookingType,
              description: this.bookingForm.description || '',
              price: this.getSlotPrice(this.selectedSlot),
              fieldName: this.venueDetail?.name || this.venueDetail?.fieldName || '主场地'
            }
          } else {
            throw new Error('没有选择时间段')
          }
          

          // 简单验证
          if (!bookingData.venueId || !bookingData.date || !bookingData.startTime || !bookingData.price) {
            throw new Error('预约数据不完整')
          }
          
          try {
             // 根据预约类型选择合适的API
             if (this.bookingForm.bookingType === 'SHARED') {
               // 🔧 修复：拼场预约也使用正确的时间段数据
               const pricePerTeam = Math.round((bookingData.price / 2) * 100) / 100


               // 🔧 关键修复：拼场预约也使用时间段的实际日期
               const actualDate = bookingData.date // bookingData 已经包含了正确的日期

               const sharedBookingData = {
                 venueId: parseInt(this.venueId),
                 date: actualDate, // 使用时间段的实际日期
                 startTime: bookingData.startTime, // 使用已计算好的开始时间
                 endTime: bookingData.endTime,     // 使用已计算好的结束时间
                 teamName: this.bookingForm.teamName || '',
                 contactInfo: this.bookingForm.contactInfo || '',
                 maxParticipants: 2,
                 description: this.bookingForm.description || '',
                 price: pricePerTeam,
                 slotIds: bookingData.slotIds || [bookingData.slotId], // 使用所有时间段ID
                 fieldName: this.venueDetail?.name || this.venueDetail?.fieldName || '主场地'
               }
               

               result = await this.bookingStore.createSharedBooking(sharedBookingData)
             } else {
               result = await this.bookingStore.createBooking(bookingData)
             }
           } catch (error) {
              console.error('预约创建失败:', error)
              // 不再使用模拟响应，而是抛出错误以便上层捕获
              throw error
            }
          }
        
        // 🔥 修复：使用增强的预约成功状态同步
        try {

          // 🔧 构建完整的预约数据用于状态同步
          // 根据预约类型使用不同的数据源
          let syncData
          if (this.bookingForm.bookingType === 'SHARED') {
            // 拼场预约：重新计算时间段信息
            const sortedSlots = [...this.selectedSlots].sort((a, b) => {
              const timeA = a.startTime.split(':').map(Number)
              const timeB = b.startTime.split(':').map(Number)
              if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0]
              return timeA[1] - timeB[1]
            })
            const firstSlot = sortedSlots[0]
            const lastSlot = sortedSlots[sortedSlots.length - 1]
            const actualDate = firstSlot.date || this.selectedDate

            syncData = {
              venueId: parseInt(this.venueId),
              venue_id: parseInt(this.venueId),
              date: actualDate, // 使用修复后的日期
              booking_date: actualDate,
              bookingType: this.bookingForm.bookingType,
              booking_type: this.bookingForm.bookingType,
              slotIds: sortedSlots.map(slot => slot.id),
              startTime: firstSlot.startTime,
              endTime: lastSlot.endTime
            }
          } else {
            // 独享预约使用 bookingData（这个变量在独享预约路径中存在）
            syncData = {
              venueId: parseInt(this.venueId),
              venue_id: parseInt(this.venueId),
              date: this.selectedDate, // 使用页面的选中日期
              booking_date: this.selectedDate,
              bookingType: this.bookingForm.bookingType,
              booking_type: this.bookingForm.bookingType,
              slotIds: this.selectedSlots.length > 0 ? this.selectedSlots.map(slot => slot.id) : [this.selectedSlot?.id],
              startTime: this.selectedSlots.length > 0 ? this.selectedSlots[0].startTime : this.selectedSlot?.startTime,
              endTime: this.selectedSlots.length > 0 ? this.selectedSlots[this.selectedSlots.length - 1].endTime : this.selectedSlot?.endTime
            }
          }

          const bookingSuccessData = syncData

          // 添加时间段相关信息
          if (this.selectedSlots && this.selectedSlots.length > 0) {
            // 多时间段情况
            const sortedSlots = [...this.selectedSlots].sort((a, b) => {
              const timeA = a.startTime.split(':').map(Number)
              const timeB = b.startTime.split(':').map(Number)
              if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0]
              return timeA[1] - timeB[1]
            })
            
            const firstSlot = sortedSlots[0]
            const lastSlot = sortedSlots[sortedSlots.length - 1]
            
            // 添加时间信息
            bookingSuccessData.startTime = firstSlot.startTime
            bookingSuccessData.start_time = firstSlot.startTime
            bookingSuccessData.bookingStartTime = firstSlot.startTime
            bookingSuccessData.endTime = lastSlot.endTime
            bookingSuccessData.end_time = lastSlot.endTime
            bookingSuccessData.bookingEndTime = lastSlot.endTime
            
            // 添加时间段ID信息（支持多种格式）
            bookingSuccessData.timeSlotIds = sortedSlots.map(slot => slot.id)
            bookingSuccessData.time_slot_ids = sortedSlots.map(slot => slot.id)
            bookingSuccessData.slotIds = sortedSlots.map(slot => slot.id)
            
            // 如果只有一个时间段，也添加单个ID字段
            if (sortedSlots.length === 1) {
              bookingSuccessData.timeSlotId = sortedSlots[0].id
              bookingSuccessData.time_slot_id = sortedSlots[0].id
              bookingSuccessData.slotId = sortedSlots[0].id
            }
          } else if (this.selectedSlot) {
            // 单时间段情况
            bookingSuccessData.startTime = this.selectedSlot.startTime
            bookingSuccessData.start_time = this.selectedSlot.startTime
            bookingSuccessData.bookingStartTime = this.selectedSlot.startTime
            bookingSuccessData.endTime = this.selectedSlot.endTime
            bookingSuccessData.end_time = this.selectedSlot.endTime
            bookingSuccessData.bookingEndTime = this.selectedSlot.endTime
            
            // 添加时间段ID（支持多种格式）
            bookingSuccessData.timeSlotId = this.selectedSlot.id
            bookingSuccessData.time_slot_id = this.selectedSlot.id
            bookingSuccessData.slotId = this.selectedSlot.id
            bookingSuccessData.timeSlotIds = [this.selectedSlot.id]
            bookingSuccessData.time_slot_ids = [this.selectedSlot.id]
            bookingSuccessData.slotIds = [this.selectedSlot.id]
          }

          // 添加后端返回的预约ID（如果有）
          if (result && result.data) {
            bookingSuccessData.bookingId = result.data.id || result.data.bookingId
            bookingSuccessData.booking_id = result.data.id || result.data.bookingId
          }


          // 🎯 调用增强的预约成功状态同步方法
          await this.venueStore.onBookingSuccess(bookingSuccessData)

          // 清除选中状态
          this.selectedSlots = []
          this.selectedSlot = null

          // 强制更新页面
          this.$forceUpdate()
        } catch (error) {
          console.error('❌ 时间段同步修复失败:', error)
          // 最简单的备用方案
          this.selectedSlots = []
          this.selectedSlot = null
          this.$forceUpdate()
        }
        
        uni.hideLoading()

        // 🔥 修复问题1: 在跳转前清除预约列表缓存,确保返回时刷新
        try {
          const bookingStore = this.bookingStore || useBookingStore()
          if (bookingStore && typeof bookingStore.clearCache === 'function') {
            bookingStore.clearCache('bookingList')
          }
        } catch (error) {
        }

        // 🔔 通知预约列表刷新数据
        try {
          uni.$emit('bookingCreated', {
            type: 'booking-created',
            bookingId: result?.data?.id,
            timestamp: Date.now()
          })
        } catch (error) {
        }

        // 🎯 使用增强版用户反馈显示成功信息
        this.$showUserFeedback('success', '预约创建成功！正在跳转到支付页面...', {
          duration: 2000,
          vibrate: true
        })


        // 获取订单ID，支持多种返回格式

        // 更全面的订单ID提取逻辑
        let orderId = null

        // 检查 result 是否存在
        if (!result) {
          console.error('❌ 预约创建结果为空')
        } else {
          // 尝试多种可能的订单ID字段
          if (result.id) {
            orderId = result.id
          } else if (result.orderId) {
            orderId = result.orderId
          } else if (result.data && result.data.id) {
            orderId = result.data.id
          } else if (result.data && result.data.orderId) {
            orderId = result.data.orderId
          } else if (typeof result === 'number') {
            orderId = result
          }
        }


        // 验证订单ID有效性
        if (orderId && (typeof orderId === 'number' || typeof orderId === 'string')) {

          // 立即跳转，不延迟
          uni.redirectTo({
            url: `/pages/payment/index?orderId=${orderId}&type=booking&from=create`,
            success: () => {
            },
            fail: (error) => {
              console.error('❌ 跳转支付页面失败:', error)
              // 如果跳转失败，尝试导航到支付页面
              uni.navigateTo({
                url: `/pages/payment/index?orderId=${orderId}&type=booking&from=create`
              })
            }
          })
        } else {
          console.error('❌ 无法获取有效的订单ID，跳转到预约列表')
          console.error('❌ 原始结果:', result)

          // 🎯 使用增强版用户反馈显示警告信息
        this.$showUserFeedback('confirm', '预约创建成功，但无法获取订单信息。请到"我的预约"中查看。', {
          confirmText: '查看预约',
          cancelText: '稍后查看',
          onConfirm: () => {
            uni.redirectTo({
              url: '/pages/booking/list'
            })
          }
        })
        }
        
      } catch (error) {
        uni.hideLoading()
        console.error('创建预约失败:', error)
        
        // 🎯 使用增强版用户反馈显示错误信息
        const errorMessage = error.message || '创建预约失败，请稍后重试'
        this.showUserFeedback('error', errorMessage, {
          duration: 3000,
          vibrate: true,
          showModal: errorMessage.length > 20
        })
        
        // 📊 性能监控：记录错误
        this.recordPerformanceMetric('booking-creation-error', {
          error: error.message || 'unknown',
          timestamp: Date.now()
        })
      } finally {
        // 🔓 重置并发锁，允许下次预约
        this.isConfirmingBooking = false
      }
    },
    
    // 验证表单
    validateForm() {
      try {
        // 📊 性能监控：开始表单验证
        this.recordPerformanceMetric('form-validation-start', {
          bookingType: this.bookingForm.bookingType,
          hasSelectedSlots: !!(this.selectedSlots && this.selectedSlots.length > 0),
          hasSelectedSlot: !!this.selectedSlot
        })
        
        
        // 基础验证：预约类型
        if (!this.bookingForm.bookingType) {
          // 📊 性能监控：验证失败
          this.recordPerformanceMetric('form-validation-error', { 
            field: 'bookingType',
            error: 'missing' 
          })
          
          this.$showUserFeedback('error', '请选择预约类型')
          return false
        }
        
        // 基础验证：时间段选择
        const hasTimeSlots = (this.selectedSlots && this.selectedSlots.length > 0) || this.selectedSlot
        if (!hasTimeSlots) {
          // 📊 性能监控：验证失败
          this.recordPerformanceMetric('form-validation-error', { 
            field: 'timeSlots',
            error: 'missing' 
          })
          
          this.showUserFeedback('error', '请选择预约时间段')
          return false
        }
        
        // 基础验证：场馆信息
        if (!this.venueId || !this.venue) {
          // 📊 性能监控：验证失败
          this.recordPerformanceMetric('form-validation-error', { 
            field: 'venue',
            error: 'missing' 
          })
          
          this.$showUserFeedback('error', '场馆信息缺失，请重新选择')
          return false
        }
        
        // 基础验证：预约日期
        if (!this.selectedDate) {
          // 📊 性能监控：验证失败
          this.recordPerformanceMetric('form-validation-error', { 
            field: 'date',
            error: 'missing' 
          })
          
          this.$showUserFeedback('error', '请选择预约日期')
          return false
        }
        
        // 拼场预约特殊验证
        if (this.bookingForm.bookingType === 'SHARED') {
          
          if (!this.bookingForm.teamName || !this.bookingForm.teamName.trim()) {
            // 📊 性能监控：验证失败
            this.recordPerformanceMetric('form-validation-error', { 
              field: 'teamName',
              error: 'empty',
              bookingType: 'SHARED'
            })
            
            this.$showUserFeedback('error', '请输入队伍名称')
            return false
          }
          
          if (!this.bookingForm.contactInfo || !this.bookingForm.contactInfo.trim()) {
            // 📊 性能监控：验证失败
            this.recordPerformanceMetric('form-validation-error', { 
              field: 'contactInfo',
              error: 'empty',
              bookingType: 'SHARED'
            })
            
            this.$showUserFeedback('error', '请输入联系方式')
            return false
          }
          
          // 验证联系方式格式（手机号或微信号）
          const contactInfo = this.bookingForm.contactInfo.trim()
          const phoneRegex = /^1[3-9]\d{9}$/
          const wechatRegex = /^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/
          
          if (!phoneRegex.test(contactInfo) && !wechatRegex.test(contactInfo)) {
            // 📊 性能监控：验证失败
            this.recordPerformanceMetric('form-validation-error', { 
              field: 'contactInfo',
              error: 'invalid_format',
              bookingType: 'SHARED'
            })
            
            this.showUserFeedback('error', '请输入有效的手机号或微信号')
            return false
          }
          
          // 验证队伍名称长度
          if (this.bookingForm.teamName.trim().length > 20) {
            // 📊 性能监控：验证失败
            this.recordPerformanceMetric('form-validation-error', { 
              field: 'teamName',
              error: 'too_long',
              bookingType: 'SHARED'
            })
            
            this.showUserFeedback('error', '队伍名称不能超过20个字符')
            return false
          }
        }
        
        // 验证预约描述长度（可选字段）
        if (this.bookingForm.description && this.bookingForm.description.length > 200) {
          // 📊 性能监控：验证失败
          this.recordPerformanceMetric('form-validation-error', { 
            field: 'description',
            error: 'too_long'
          })
          
          this.showUserFeedback('error', '预约描述不能超过200个字符')
          return false
        }
        
        // 验证时间段状态
        if (this.selectedSlots && this.selectedSlots.length > 0) {
          const unavailableSlots = this.selectedSlots.filter(slot => slot.status !== 'AVAILABLE')
          if (unavailableSlots.length > 0) {
            // 📊 性能监控：验证失败
            this.recordPerformanceMetric('form-validation-error', { 
              field: 'slotStatus',
              error: 'unavailable',
              unavailableCount: unavailableSlots.length
            })
            
            // 🎯 使用增强版错误提示
            const errorMessage = unavailableSlots.length === 1 
              ? `时间段 ${unavailableSlots[0].startTime}-${unavailableSlots[0].endTime} 已不可用，请重新选择`
              : `有 ${unavailableSlots.length} 个时间段已不可用，请重新选择`
            
            this.showUserFeedback('error', errorMessage, {
              showModal: true,
              vibrate: true,
              confirmText: '重新选择',
              onConfirm: () => {
                // 刷新时间段列表
                this.loadTimeSlots()
                // 滚动到时间段选择区域
                this.$nextTick(() => {
                  uni.pageScrollTo({
                    selector: '.time-slots-container',
                    duration: 300
                  })
                })
              }
            })
            return false
          }
        } else if (this.selectedSlot && this.selectedSlot.status !== 'AVAILABLE') {
          // 📊 性能监控：验证失败
          this.recordPerformanceMetric('form-validation-error', { 
            field: 'slotStatus',
            error: 'unavailable',
            slotId: this.selectedSlot.id
          })
          
          // 🎯 使用增强版错误提示
          const errorMessage = `时间段 ${this.selectedSlot.startTime}-${this.selectedSlot.endTime} 已不可用，请重新选择`
          this.showUserFeedback('error', errorMessage, {
            showModal: true,
            vibrate: true,
            confirmText: '重新选择',
            onConfirm: () => {
              // 刷新时间段列表
              this.loadTimeSlots()
              // 滚动到时间段选择区域
              this.$nextTick(() => {
                uni.pageScrollTo({
                  selector: '.time-slots-container',
                  duration: 300
                })
              })
            }
          })
          return false
        }
        
        
        // 📊 性能监控：验证成功
        this.recordPerformanceMetric('form-validation-success', {
          bookingType: this.bookingForm.bookingType,
          slotsCount: this.selectedSlots ? this.selectedSlots.length : (this.selectedSlot ? 1 : 0),
          hasDescription: !!this.bookingForm.description
        })
        
        return true
        
      } catch (error) {
        console.error('[BookingCreate] ❌ 表单验证异常:', error)
        
        // 📊 性能监控：验证异常
        this.recordPerformanceMetric('form-validation-exception', { 
          error: error.message,
          stack: error.stack 
        })
        
        this.showUserFeedback('error', '表单验证失败，请检查输入信息')
        return false
      }
    },
    
    // 🗜️ 数据压缩方法
    compressBookingData() {
      try {
        const baseData = {
          venueId: parseInt(this.venueId),
          date: this.selectedDate,
          bookingType: this.bookingForm.bookingType,
          description: this.bookingForm.description || ''
        }

        // 添加时间段信息
        if (this.selectedSlots && this.selectedSlots.length > 0) {
          const sortedSlots = [...this.selectedSlots].sort((a, b) => {
            const timeA = a.startTime.split(':').map(Number)
            const timeB = b.startTime.split(':').map(Number)
            if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0]
            return timeA[1] - timeB[1]
          })
          
          baseData.startTime = sortedSlots[0].startTime
          baseData.endTime = sortedSlots[sortedSlots.length - 1].endTime
          baseData.slotIds = sortedSlots.map(slot => slot.id)
        } else if (this.selectedSlot) {
          baseData.startTime = this.selectedSlot.startTime
          baseData.endTime = this.selectedSlot.endTime
          baseData.slotId = this.selectedSlot.id
        }

        // 添加拼场特有字段
        if (this.bookingForm.bookingType === 'SHARED') {
          baseData.teamName = this.bookingForm.teamName
          baseData.contactInfo = this.bookingForm.contactInfo
          baseData.maxParticipants = 2
        }

        // 🗜️ 数据压缩：移除空值和优化字段
        const compressedData = {}
        Object.keys(baseData).forEach(key => {
          const value = baseData[key]
          if (value !== null && value !== undefined && value !== '') {
            compressedData[key] = value
          }
        })

        return compressedData
      } catch (error) {
        console.error('[BookingCreate] ❌ 数据压缩失败:', error)
        return {}
      }
    },



    // 返回
    goBack() {
      uni.navigateBack()
    },

    async validateSelectedSlotsAfterUpdate(latestSlots) {
      if (!this.selectedSlots || this.selectedSlots.length === 0) {
        return;
      }
      
      if (!latestSlots) {
          console.error('[BookingCreate] ❌ validateSelectedSlotsAfterUpdate 调用时未提供 latestSlots');
          return;
      }

      const unavailableSlots = [];

      for (const selectedSlot of this.selectedSlots) {
        const latestSlot = latestSlots.find(s => s.id.toString() === selectedSlot.id.toString());
        
        if (!latestSlot) {
          // 详细分析时间段不存在的原因
          const analysisResult = {
            selectedSlot: selectedSlot,
            searchId: selectedSlot.id,
            searchTime: `${selectedSlot.startTime}-${selectedSlot.endTime}`,
            totalAvailableSlots: latestSlots.length,
            availableIds: latestSlots.map(s => s.id),
            availableTimes: latestSlots.map(s => `${s.startTime}-${s.endTime}`),
            possibleMatches: [],
            analysisDetails: {
              hasId: !!selectedSlot.id,
              hasTime: !!(selectedSlot.startTime && selectedSlot.endTime),
              idExistsInApi: selectedSlot.id ? latestSlots.some(s => s.id && s.id.toString() === selectedSlot.id.toString()) : false,
              timeExistsInApi: (selectedSlot.startTime && selectedSlot.endTime) ? latestSlots.some(s => s.startTime === selectedSlot.startTime && s.endTime === selectedSlot.endTime) : false
            }
          }
          
          // 查找可能的相似时间段
          if (selectedSlot.startTime && selectedSlot.endTime) {
            const similarSlots = latestSlots.filter(slot => {
              const startMatch = slot.startTime && slot.startTime.includes(selectedSlot.startTime.split(':')[0])
              const endMatch = slot.endTime && slot.endTime.includes(selectedSlot.endTime.split(':')[0])
              return startMatch || endMatch
            })
            analysisResult.possibleMatches = similarSlots.map(s => ({
              id: s.id,
              time: `${s.startTime}-${s.endTime}`,
              status: s.status
            }))
          }
          
          
          // 尝试智能修复：查找最接近的可用时间段
          let suggestedSlot = null
          if (selectedSlot.startTime && latestSlots.length > 0) {
            // 按开始时间查找最接近的时间段
            const targetHour = parseInt(selectedSlot.startTime.split(':')[0])
            suggestedSlot = latestSlots
              .filter(s => s.status === 'AVAILABLE')
              .sort((a, b) => {
                const aHour = parseInt(a.startTime.split(':')[0])
                const bHour = parseInt(b.startTime.split(':')[0])
                return Math.abs(aHour - targetHour) - Math.abs(bHour - targetHour)
              })[0]
          }

          unavailableSlots.push({
            ...selectedSlot,
            reason: '时间段不存在',
            newStatus: 'NOT_FOUND',
            analysis: analysisResult,
            suggestedAlternative: suggestedSlot
          })
        } else if (latestSlot.status !== 'AVAILABLE') {
          // 🔧 修复：检查是否为错误的EXPIRED状态
          const statusChangeTime = new Date()
          const slotTimeInfo = {
            date: this.selectedDate,
            startTime: latestSlot.startTime,
            endTime: latestSlot.endTime,
            timeRange: `${latestSlot.startTime}-${latestSlot.endTime}`
          }

          // 计算时间段的具体时间
          let slotStartDateTime = null
          let slotEndDateTime = null
          let shouldBeExpired = false

          // 🔧 修复：在外层定义日期比较变量
          const currentDateStr = statusChangeTime.toISOString().split('T')[0]
          const isToday = this.selectedDate === currentDateStr
          const isFutureDate = this.selectedDate > currentDateStr

          try {
            const [startHour, startMinute] = latestSlot.startTime.split(':').map(Number)
            const [endHour, endMinute] = latestSlot.endTime.split(':').map(Number)
            const [year, month, day] = this.selectedDate.split('-').map(Number)

            // 🔧 修复：正确处理时区，使用本地时间而不是UTC时间
            slotStartDateTime = new Date()
            slotEndDateTime = new Date()

            slotStartDateTime.setFullYear(year, month - 1, day)
            slotStartDateTime.setHours(startHour, startMinute, 0, 0)

            slotEndDateTime.setFullYear(year, month - 1, day)
            slotEndDateTime.setHours(endHour, endMinute, 0, 0)

            // 🔧 修复：只有当前时间超过结束时间才应该是EXPIRED
            // 重要：必须考虑日期！
            shouldBeExpired = statusChangeTime > slotEndDateTime

            // 🔧 额外检查：如果是未来日期，绝对不应该过期
            if (isFutureDate) {
              shouldBeExpired = false // 未来日期的时间段绝对不应该过期
            }
          } catch (timeError) {
            console.error('[BookingCreate] ❌ 时间计算错误:', timeError)
          }

          // 🔧 强制修正：如果是未来日期的EXPIRED状态，直接跳过
          if (isFutureDate && latestSlot.status === 'EXPIRED') {
            console.error('[BookingCreate] 🚨 强制修正未来日期的错误EXPIRED状态:', {
              slotId: latestSlot.id,
              timeRange: `${latestSlot.startTime}-${latestSlot.endTime}`,
              selectedDate: this.selectedDate,
              currentDate: currentDateStr
            })
            // 直接跳过，不加入不可用列表
            continue
          }

          // 🔧 修复：如果是今日时间段但错误的EXPIRED状态，尝试修正
          if (isToday && latestSlot.status === 'EXPIRED' && !shouldBeExpired) {
            // 直接跳过，不加入不可用列表
            continue
          }

          // 真正不可用的时间段
          if (latestSlot.status !== 'AVAILABLE') {
            unavailableSlots.push({
              ...latestSlot,
              reason: latestSlot.status === 'BOOKED' ? '已被预约' :
                     latestSlot.status === 'MAINTENANCE' ? '维护中' :
                     latestSlot.status === 'EXPIRED' ? '已过期' : '不可用',
              newStatus: latestSlot.status
            })
          }
        }
      }

      this.showUserFeedback('hide-loading')
      
      // 如果有不可用的时间段
      if (unavailableSlots.length > 0) {
        console.error('[BookingCreate] ❌ 发现不可用时间段:', unavailableSlots.map(slot => ({
          id: slot.id,
          timeRange: `${slot.startTime}-${slot.endTime}`,
          reason: slot.reason,
          status: slot.newStatus
        })))

        // 🔧 关键信息：检查选择的日期
        console.error('[BookingCreate] 🚨 关键问题分析:', {
          selectedDate: this.selectedDate,
          currentDate: new Date().toISOString().split('T')[0],
          isToday: this.selectedDate === new Date().toISOString().split('T')[0],
          isTomorrow: this.selectedDate === new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0],
          unavailableSlots: unavailableSlots.map(s => s.timeRange)
        })

        // 记录性能指标
        this.recordPerformanceMetric('realtime-validation-failed', {
          unavailableCount: unavailableSlots.length,
          reasons: unavailableSlots.map(slot => slot.reason),
          statuses: unavailableSlots.map(slot => slot.newStatus)
        })
        
        // 更新本地时间段状态
        try {
          this.venueStore.updateTimeSlotsStatus(this.venueId, this.selectedDate, latestSlots)
        } catch (updateError) {
        }
        
        // 清除不可用的选中状态
        this.clearUnavailableSelections(unavailableSlots)
        
        // 生成详细的错误提示
        const errorDetails = this.generateValidationErrorMessage(unavailableSlots)
        
        // 使用模态框显示详细错误信息
        this.$showUserFeedback('error', errorDetails, { 
          useModal: true,
          confirmText: '重新选择',
          onConfirm: () => {
            // 触发时间段列表刷新
            this.$emit('refresh-timeslots')
            // 滚动到时间段选择区域
            this.$nextTick(() => {
              uni.pageScrollTo({
                selector: '.time-slots-container',
                duration: 300
              })
            })
          }
        })
        
        // 触发时间段列表刷新
        this.$emit('refresh-timeslots')
        
        return false
      }
      
      // 所有时间段都可用
      this.recordPerformanceMetric('realtime-validation-success')
      return true
    },

    // 🎧 设置事件监听器
    setupEventListeners() {
      
      // 监听时间段状态更新事件
      if (typeof uni !== 'undefined' && uni.$on) {
        uni.$on('timeslots-status-updated', this.handleTimeSlotsStatusUpdated)
        uni.$on('timeslots-refreshed', this.handleTimeSlotsRefreshed)
        uni.$on('booking-status-changed', this.handleBookingStatusChanged)
        uni.$on('orderCancelled', this.handleOrderCancelled)
        uni.$on('timeslot-updated', this.handleTimeslotUpdated)
        uni.$on('force-refresh-timeslots', this.handleForceRefreshTimeslots)

      }
    },

    // 🎧 移除事件监听器
    removeEventListeners() {
      
      if (typeof uni !== 'undefined' && uni.$off) {
        uni.$off('timeslots-status-updated', this.handleTimeSlotsStatusUpdated)
        uni.$off('timeslots-refreshed', this.handleTimeSlotsRefreshed)
        uni.$off('booking-status-changed', this.handleBookingStatusChanged)
        uni.$off('orderCancelled', this.handleOrderCancelled)
        uni.$off('timeslot-updated', this.handleTimeslotUpdated)
        uni.$off('force-refresh-timeslots', this.handleForceRefreshTimeslots)

      }
    },

    // 🔄 处理时间段状态更新事件
    handleTimeSlotsStatusUpdated(eventData) {
      
      try {
        // 只处理当前场馆和日期的更新
        if (eventData.venueId === this.venueId && eventData.date === this.selectedDate) {
          
          // 检查当前选中的时间段是否受影响
          this.validateSelectedSlotsAfterUpdate(eventData.timeSlots)
          
          // 记录性能指标
          this.recordPerformanceMetric('timeslots-auto-updated', {
            source: eventData.source || 'unknown',
            slotsCount: eventData.timeSlots?.length || 0
          })
          
          // 用户反馈
          this.showUserFeedback('success', '时间段状态已更新', { duration: 2000 })
        }
      } catch (error) {
        console.error('[BookingCreate] ❌ 处理时间段状态更新失败:', error)
      }
    },

    // 🔄 处理时间段刷新事件
    handleTimeSlotsRefreshed(eventData) {
      
      try {
        if (eventData.venueId === this.venueId && eventData.date === this.selectedDate) {
          
          // 重新验证选中的时间段
          this.validateSelectedSlotsAfterUpdate(eventData.timeSlots)
          
          this.recordPerformanceMetric('timeslots-refreshed', {
            trigger: eventData.trigger || 'unknown'
          })
        }
      } catch (error) {
        console.error('[BookingCreate] ❌ 处理时间段刷新失败:', error)
      }
    },

    // 🔄 处理预约状态变更事件
    handleBookingStatusChanged(eventData) {
      try {
        if (eventData.venueId === this.venueId && eventData.date === this.selectedDate) {
          const { status } = eventData

          // 🎯 关键修复：当订单被取消或支付失败时，强制刷新整个时间段列表
          if (status === 'CANCELLED' || status === 'PAYMENT_FAILED') {
            this.refreshTimeSlotStatusSafe(true) // 强制刷新
          } else {
            // 对于其他状态变更，执行标准刷新
            this.refreshTimeSlotStatusSafe()
          }
          
          this.recordPerformanceMetric('booking-status-changed', {
            bookingId: eventData.bookingId,
            status: eventData.status
          })
        }
      } catch (error) {
        console.error('[BookingCreate] ❌ 处理预约状态变更失败:', error)
      }
    },

    // 🔄 处理订单取消事件
    handleOrderCancelled(eventData) {

      try {
        // 🎯 关键修复：清空用户当前选中的时间段，避免UI状态不一致
        this.selectedSlots = []
        this.selectedSlot = null

        // 立即强制刷新时间段状态，因为取消预约会释放时间段
        this.refreshTimeSlotStatusSafe(true) // Force refresh

        // 延迟再次刷新，确保状态同步
        setTimeout(() => {
          this.refreshTimeSlotStatusSafe(true)
        }, 500)

        // 记录性能指标
        this.recordPerformanceMetric('order-cancelled', {
          orderId: eventData.orderId,
          type: eventData.type
        })

        // 显示提示信息
        this.$showUserFeedback('info', '时间段已释放，可重新预约', {
          duration: 2500
        })

      } catch (error) {
        console.error('[BookingCreate] ❌ 处理订单取消事件失败:', error)
      }
    },

    // 🔄 处理时间段更新事件
    handleTimeslotUpdated(eventData) {
      try {
        // 检查是否是当前页面相关的事件
        if (eventData.venueId == this.venueId && eventData.date === this.selectedDate) {

          // 特别处理立即更新事件（从详情页面发送的）
          if (eventData.immediate || eventData.action === 'booking-cancelled-immediate') {

            // 🎯 关键修复：使用统一时间段管理器立即释放时间段
            if (eventData.startTime && eventData.endTime) {
              this.useUnifiedTimeSlotManager(eventData)
            }

            // 立即强制刷新
            this.refreshTimeSlotStatusSafe(true)

            // 再次刷新确保状态同步
            setTimeout(() => {
              this.refreshTimeSlotStatusSafe(true)
            }, 500)
          }
          // 特别处理拼场订单取消的情况
          else if (eventData.action === 'booking-cancelled' && eventData.bookingType === 'SHARED') {

            // 🎯 关键修复：使用统一时间段管理器立即释放时间段
            if (eventData.startTime && eventData.endTime) {
              this.useUnifiedTimeSlotManager(eventData)
            }

            // 立即强制刷新
            this.refreshTimeSlotStatusSafe(true)

            // 延迟再次刷新，确保状态同步
            setTimeout(() => {
              this.refreshTimeSlotStatusSafe(true)
            }, 500)

            // 最后一次刷新，确保万无一失
            setTimeout(() => {
              this.refreshTimeSlotStatusSafe(true)
            }, 1500)
          } else {
            // 普通的时间段更新
            this.refreshTimeSlotStatusSafe()
          }

          // 记录性能指标
          this.recordPerformanceMetric('timeslot-updated', {
            action: eventData.action,
            slotIds: eventData.slotIds,
            bookingType: eventData.bookingType
          })

          // 显示提示信息
          if (eventData.action === 'booking-cancelled') {
            const message = eventData.bookingType === 'SHARED' ?
              '拼场订单已取消，时间段状态已更新' :
              '预约已取消，时间段状态已更新'

            this.showUserFeedback('info', message, {
              duration: 2000
            })
          }
        }

      } catch (error) {
        console.error('[BookingCreate] ❌ 处理时间段更新事件失败:', error)
      }
    },

    // 🎯 使用统一时间段管理器立即释放时间段
    async useUnifiedTimeSlotManager(eventData) {
      try {

        // 动态导入统一时间段管理器
        const { default: unifiedTimeSlotManager } = await import('@/utils/unified-timeslot-manager.js')

        if (unifiedTimeSlotManager && typeof unifiedTimeSlotManager.immediateReleaseTimeSlots === 'function') {
          await unifiedTimeSlotManager.immediateReleaseTimeSlots(
            eventData.venueId,
            eventData.date,
            eventData.startTime,
            eventData.endTime,
            eventData.bookingType || 'EXCLUSIVE'
          )
        } else {
        }

      } catch (error) {
        console.error('[BookingCreate] 使用统一时间段管理器失败:', error)
      }
    },

    // 🚨 处理强制刷新时间段事件
    handleForceRefreshTimeslots(eventData) {

      try {
        // 检查是否是当前页面相关的事件
        if (eventData.venueId == this.venueId && eventData.date === this.selectedDate) {

          // 立即强制刷新，清除所有缓存
          this.refreshTimeSlotStatusSafe(true)

          // 多次刷新确保状态同步
          setTimeout(() => {
            this.refreshTimeSlotStatusSafe(true)
          }, 200)

          setTimeout(() => {
            this.refreshTimeSlotStatusSafe(true)
          }, 800)

          // 记录性能指标
          this.recordPerformanceMetric('force-refresh-timeslots', {
            reason: eventData.reason,
            venueId: eventData.venueId,
            date: eventData.date
          })

          // 显示提示信息
          this.showUserFeedback('info', '时间段状态已强制更新', {
            duration: 2000
          })
        } else {
        }

      } catch (error) {
        console.error('[BookingCreate] ❌ 处理强制刷新时间段事件失败:', error)
      }
    },

    // ✅ 验证更新后的选中时间段
    validateSelectedSlotsAfterUpdate(latestSlots) {
      try {
        
        if (!latestSlots || !Array.isArray(latestSlots)) {
          return
        }
        
        const selectedSlots = this.isMultiSlot ? this.selectedSlots : [this.selectedSlot]
        if (!selectedSlots || selectedSlots.length === 0) {
          return // 没有选中的时间段，无需验证
        }
        
        const invalidSlots = []
        
        for (const selectedSlot of selectedSlots) {
          if (!selectedSlot) continue
          
          const latestSlot = latestSlots.find(slot => 
            slot.id === selectedSlot.id || 
            (slot.startTime === selectedSlot.startTime && slot.endTime === selectedSlot.endTime)
          )
          
          if (!latestSlot || latestSlot.status !== 'AVAILABLE') {
            invalidSlots.push({
              ...selectedSlot,
              newStatus: latestSlot?.status || 'NOT_FOUND',
              reason: !latestSlot ? '时间段已删除' : 
                     latestSlot.status === 'BOOKED' ? '已被其他用户预约' :
                     latestSlot.status === 'MAINTENANCE' ? '进入维护状态' : '状态异常'
            })
          }
        }
        
        // 如果有无效的时间段
        if (invalidSlots.length > 0) {
          
          // 清除无效的选中状态
          if (this.isMultiSlot) {
            this.selectedSlots = this.selectedSlots.filter(slot => 
              !invalidSlots.some(invalid => invalid.id === slot.id)
            )
          } else {
            const isCurrentSlotInvalid = invalidSlots.some(invalid => 
              invalid.id === this.selectedSlot?.id
            )
            if (isCurrentSlotInvalid) {
              this.selectedSlot = null
            }
          }
          
          // 生成用户提示
          const message = invalidSlots.length === 1 
            ? `时间段${invalidSlots[0].startTime}-${invalidSlots[0].endTime}${invalidSlots[0].reason}，请重新选择`
            : `有${invalidSlots.length}个时间段状态已变更，请重新选择`
          
          this.$showUserFeedback('warning', message, { duration: 4000 })
          
          // 记录性能指标
          this.recordPerformanceMetric('selected-slots-invalidated', {
            invalidCount: invalidSlots.length,
            reasons: invalidSlots.map(slot => slot.reason)
          })
        } else {
        }
        
      } catch (error) {
        console.error('[BookingCreate] ❌ 验证选中时间段失败:', error)
      }
    },

    // 🎯 显示预约确认对话框
    async showConfirmationDialog() {
      try {
        // 防止重复显示
        if (this.showConfirmDialog) {
          return false
        }
        
        // 构建确认信息
        const confirmInfo = this.buildConfirmationInfo()
        
        // 设置弹窗数据并显示自定义确认弹窗
        this.confirmDialogData = confirmInfo
        this.showConfirmDialog = true
        
        // 等待用户操作
        const result = await new Promise((resolve) => {
          this.confirmDialogResolve = resolve
        })
        
        return result
      } catch (error) {
        console.error('[BookingCreate] ❌ 显示确认对话框异常:', error)
        // 重置弹窗状态
        this.showConfirmDialog = false
        this.confirmDialogData = null
        this.confirmDialogResolve = null
        return false
      }
    },

    // 🏗️ 构建确认信息
    buildConfirmationInfo() {
      try {

        const venue = this.venue || {}
        const isShared = this.bookingForm.bookingType === 'SHARED'
        const isMulti = this.isMultiSlot

        let timeInfo = ''
        let timeDetails = []
        let totalPrice = 0
        let actualPrice = 0

        if (isMulti && this.selectedSlots?.length > 0) {
          // 多时间段预约 - 修复时间段显示逻辑

          const sortedSlots = [...this.selectedSlots].sort((a, b) => {
            const timeA = a.startTime.split(':').map(Number)
            const timeB = b.startTime.split(':').map(Number)
            return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1])
          })

          // 显示所有选中的时间段
          timeDetails = sortedSlots.map(slot => `${slot.startTime}-${slot.endTime}`)

          // 修复:对于多时间段,显示完整的时间范围
          const firstSlot = sortedSlots[0]
          const lastSlot = sortedSlots[sortedSlots.length - 1]
          timeInfo = `${this.selectedDate} ${firstSlot.startTime}-${lastSlot.endTime}`

          totalPrice = this.totalCost
          actualPrice = isShared ? (totalPrice / 2) : totalPrice
        } else if (this.selectedSlot) {
          // 单时间段预约

          timeDetails = [`${this.selectedSlot.startTime}-${this.selectedSlot.endTime}`]
          timeInfo = `${this.selectedDate} ${timeDetails[0]}`

          totalPrice = this.totalCost
          actualPrice = isShared ? (totalPrice / 2) : totalPrice
        }

        // 格式化价格,保留两位小数
        totalPrice = parseFloat(totalPrice.toFixed(2))
        actualPrice = parseFloat(actualPrice.toFixed(2))

        const result = {
          venueName: venue.name || '未知场馆',
          timeInfo,
          timeDetails,
          bookingType: isShared ? '拼场预约' : '包场预约',
          totalPrice,
          actualPrice,
          isShared,
          teamName: this.bookingForm.teamName,
          contactInfo: this.bookingForm.contactInfo,
          description: this.bookingForm.description
        }

        return result
      } catch (error) {
        console.error('[BookingCreate] ❌ 构建确认信息失败:', error)
        return {
          venueName: '未知场馆',
          timeInfo: '',
          timeDetails: [],
          bookingType: '包场预约',
          totalPrice: 0,
          actualPrice: 0,
          isShared: false,
          teamName: '',
          contactInfo: '',
          description: ''
        };
      }
    },

    // 🎯 取消确认弹窗
    cancelConfirmDialog() {
      try {
        if (this.confirmDialogResolve) {
          this.confirmDialogResolve(false)
        }
      } catch (error) {
        console.error('[BookingCreate] ❌ 取消确认弹窗异常:', error)
      } finally {
        // 重置弹窗状态
        this.showConfirmDialog = false
        this.confirmDialogData = null
        this.confirmDialogResolve = null
      }
    },

    // 🎯 确认弹窗操作
    confirmDialogAction() {
      try {
        if (this.confirmDialogResolve) {
          this.confirmDialogResolve(true)
        }
      } catch (error) {
        console.error('[BookingCreate] ❌ 确认弹窗操作异常:', error)
      } finally {
        // 重置弹窗状态
        this.showConfirmDialog = false
        this.confirmDialogData = null
        this.confirmDialogResolve = null
      }
    },

    // 📊 性能监控方法
    recordPerformanceMetric(metricName, metricData = {}) {
      try {
        // 简单的性能监控实现,记录到控制台
        const timestamp = new Date().toISOString()
        // 可以在这里添加更复杂的性能监控逻辑
        // 例如:发送到分析服务器、存储到本地等
      } catch (error) {
        // 性能监控不应该影响主流程,静默处理错误
      }
    },

    // 🔄 安全的刷新时间段状态方法
    async refreshTimeSlotStatusSafe(force = false) {
      try {
        await this.refreshTimeSlotStatus(force)
      } catch (error) {
        console.error('[BookingCreate] ❌ 刷新时间段状态失败:', error)
        // 静默处理错误,不影响主流程
      }
    },

    // 🎯 用户反馈方法
    showUserFeedback(type, message, options = {}) {
      try {

        // 根据类型显示不同的反馈
        switch (type) {
          case 'success':
            uni.showToast({
              title: message,
              icon: 'success',
              duration: options.duration || 2000
            })
            break

          case 'error':
            if (options.showModal || options.useModal) {
              uni.showModal({
                title: '错误',
                content: message,
                showCancel: false,
                confirmText: options.confirmText || '确定',
                success: (res) => {
                  if (res.confirm && options.onConfirm) {
                    options.onConfirm()
                  }
                }
              })
            } else {
              uni.showToast({
                title: message,
                icon: 'none',
                duration: options.duration || 3000
              })
            }
            break

          case 'warning':
            uni.showToast({
              title: message,
              icon: 'none',
              duration: options.duration || 3000
            })
            break

          case 'info':
            uni.showToast({
              title: message,
              icon: 'none',
              duration: options.duration || 2000
            })
            break

          case 'confirm':
            uni.showModal({
              title: '提示',
              content: message,
              confirmText: options.confirmText || '确定',
              cancelText: options.cancelText || '取消',
              success: (res) => {
                if (res.confirm && options.onConfirm) {
                  options.onConfirm()
                } else if (res.cancel && options.onCancel) {
                  options.onCancel()
                }
              }
            })
            break

          case 'hide-loading':
            uni.hideLoading()
            break

          default:
            uni.showToast({
              title: message,
              icon: 'none',
              duration: options.duration || 2000
            })
        }

        // 如果需要震动反馈
        if (options.vibrate) {
          uni.vibrateShort()
        }
      } catch (error) {
        console.error('[BookingCreate] ❌ 显示用户反馈失败:', error)
        // 降级处理:使用最基本的提示
        try {
          uni.showToast({
            title: message,
            icon: 'none',
            duration: 2000
          })
        } catch (e) {
          console.error('[BookingCreate] ❌ 降级提示也失败:', e)
        }
      }
    }
  },
  
  watch: {
    // 移除了showTimeSelector的watch监听器，因为该变量未在data中定义
    // 这可能是导致弹窗自动打开的原因
  },
  
  mounted() {
    // 重置弹窗状态
    this.showConfirmDialog = false
    this.confirmDialogData = null
    this.confirmDialogResolve = null
    
    // 初始化Store
    this.venueStore = useVenueStore()
    this.bookingStore = useBookingStore()
    this.userStore = useUserStore()
    
    // 获取场馆ID
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    this.venueId = currentPage.options.id || currentPage.options.venueId
    
    if (!this.venueId) {
      console.error('未获取到场馆ID')
      uni.showToast({
        title: '参数错误',
        icon: 'error'
      })
      return
    }
    
    // 初始化日期为今天
    this.selectedDate = new Date().toISOString().split('T')[0]
    
    // 加载场馆详情和时间段
    this.loadVenueDetail()
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 600rpx; // 增加底部空间，确保内容不被遮挡
}

.main-scroll-view {
  height: 100vh;
  box-sizing: border-box;
}

// 场馆信息
.venue-summary {
  display: flex;
  background-color: #ffffff;
  padding: 30rpx;
  margin-bottom: 20rpx;
  
  .venue-image {
    width: 120rpx;
    height: 120rpx;
    border-radius: 12rpx;
    margin-right: 24rpx;
  }
  
  .venue-info {
    flex: 1;
    
    .venue-name {
      display: block;
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
      margin-bottom: 8rpx;
    }
    
    .venue-location {
      display: block;
      font-size: 26rpx;
      color: #666666;
      margin-bottom: 8rpx;
    }
    
    .venue-price {
      display: block;
      font-size: 28rpx;
      color: #ff6b35;
      font-weight: 600;
    }
  }
}

// 预约表单
.booking-form {
  .form-section {
    background-color: #ffffff;
    margin-bottom: 20rpx;
    padding: 30rpx;
    
    .section-title {
      display: block;
      font-size: 28rpx;
      font-weight: 600;
      color: #333333;
      margin-bottom: 24rpx;
    }
    
    // 预约类型显示
    .booking-type-display {
      padding: 24rpx;
      background: #f8f9fa;
      border-radius: 12rpx;
      border: 2rpx solid #e9ecef;
      
      .booking-type-text {
        font-size: 30rpx;
        font-weight: 600;
        color: #ff6b35;
      }
    }
    
    // 时间信息
    .time-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20rpx 0;
      
      .time-text {
        font-size: 28rpx;
        color: #333333;
      }
      
      .change-time-btn {
        padding: 8rpx 16rpx;
        background-color: #ff6b35;
        color: #ffffff;
        border: none;
        border-radius: 6rpx;
        font-size: 24rpx;
      }
    }
    
    // 表单项
    .form-item {
      margin-bottom: 30rpx;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .item-label {
        display: block;
        font-size: 26rpx;
        color: #333333;
        margin-bottom: 12rpx;
        
        .required {
          color: #ff4d4f;
        }
      }
      
      .form-input {
        width: 100%;
        padding: 24rpx;
        border: 2rpx solid #e8e8e8;
        border-radius: 12rpx;
        font-size: 28rpx;
        color: #333333;
        background-color: #ffffff;
        
        &:focus {
          border-color: #1890ff;
          background-color: #f6ffed;
        }
        
        &::placeholder {
          color: #cccccc;
        }
      }
      
      .form-picker {
        width: 100%;
        
        .picker-text {
          padding: 24rpx;
          border: 2rpx solid #e8e8e8;
          border-radius: 12rpx;
          font-size: 28rpx;
          color: #333333;
          background-color: #ffffff;
          text-align: left;
          
          &::after {
            content: '';
            position: absolute;
            right: 24rpx;
            top: 50%;
            transform: translateY(-50%);
            width: 0;
            height: 0;
            border-left: 8rpx solid #999999;
            border-top: 6rpx solid transparent;
            border-bottom: 6rpx solid transparent;
          }
        }
      }
      
      .form-textarea {
        width: 100%;
        min-height: 120rpx;
        padding: 20rpx;
        background-color: #f8f8f8;
        border: 1rpx solid #e8e8e8;
        border-radius: 8rpx;
        font-size: 28rpx;
        color: #333333;
        resize: none;
      }
      
      .picker-text {
        padding: 20rpx;
        background-color: #f8f8f8;
        border: 1rpx solid #e8e8e8;
        border-radius: 8rpx;
        font-size: 28rpx;
        color: #333333;
      }
    }
  }
}

// 费用明细
.cost-summary {
  background-color: #ffffff;
  padding: 30rpx;
  margin-bottom: 20rpx; // 恢复到合理值
  
  .summary-title {
    display: block;
    font-size: 28rpx;
    font-weight: 600;
    color: #333333;
    margin-bottom: 24rpx;
  }
  
  .cost-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16rpx 0;
    font-size: 26rpx;
    color: #666666;
  }
  
  .cost-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 20rpx;
    padding: 20rpx 0;
    border-top: 1px solid #f5f5f5;
    font-size: 28rpx;
    
    .total-amount {
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
    }
  }
  
  .shared-price {
    color: #ff6b00 !important;
    font-weight: bold;
    font-size: 36rpx !important;
  }
  
  .info-tip {
    font-size: 24rpx;
    color: #999;
    margin-top: 10rpx;
    line-height: 1.4;
  }
}

// 底部操作
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  padding: 20rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
  z-index: 999; // 确保底部操作栏在最上层
  
  .bottom-cost {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #f0f0f0;
    margin-bottom: 16rpx;
    
    .cost-label {
      font-size: 28rpx;
      color: #333333;
      font-weight: 600;
    }
    
    .cost-value {
      font-size: 32rpx;
      color: #ff6b35;
      font-weight: 700;
    }
  }
  
  .action-buttons {
    display: flex;
    
    .cancel-btn {
      flex: 1;
      height: 80rpx;
      background-color: #f5f5f5;
      color: #666666;
      border: none;
      border-radius: 8rpx;
      font-size: 28rpx;
      margin-right: 20rpx;
    }
    
    .confirm-btn {
      flex: 2;
      height: 80rpx;
      background-color: #ff6b35;
      color: #ffffff;
      border: none;
      border-radius: 8rpx;
      font-size: 28rpx;
      font-weight: 600;
      
      &[disabled] {
        background-color: #cccccc;
        color: #ffffff;
      }
    }
  }
}

// 时间选择弹窗
.time-selector {
  background-color: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
  
  .selector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #f0f0f0;
    
    .selector-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
    }
    
    .close-btn {
      font-size: 32rpx;
      color: #999999;
      padding: 8rpx;
    }
  }
  
  .slots-container {
    padding: 30rpx;
    
    .slots-title {
      display: block;
      font-size: 28rpx;
      font-weight: 600;
      color: #333333;
      margin-bottom: 20rpx;
    }
    
    .slots-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20rpx;
      
      .slot-item {
        padding: 20rpx;
        border-radius: 8rpx;
        text-align: center;
        border: 2rpx solid #e8e8e8;
        transition: all 0.3s;
        position: relative;
        
        &.available {
          background: #f6ffed;
          border-color: #b7eb8f;
          
          &:active {
            background: #d9f7be;
          }
        }
        
        &.reserved {
          background: #fff2f0;
          border-color: #ffccc7;
          opacity: 0.6;
          cursor: not-allowed;
          
          .slot-time {
            color: #999999;
          }
          
          .slot-status {
            color: #ff4d4f;
            font-weight: 500;
          }
        }
        
        &.maintenance {
          background: #fff7e6;
          border-color: #ffd591;
          opacity: 0.6;
          cursor: not-allowed;
          
          .slot-time {
            color: #999999;
          }
          
          .slot-status {
            color: #ff9500;
            font-weight: 500;
          }
        }
        
        &.disabled {
          pointer-events: none;
          position: relative;
          
          &::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(255, 255, 255, 0.3);
            border-radius: 12rpx;
          }
        }
        
        &.time-restricted {
          background: #fff1f0;
          border-color: #ffccc7;
          opacity: 0.7;
          cursor: not-allowed;
          
          .slot-time {
            color: #999999;
          }
          
          .slot-status {
            color: #ff4d4f;
            font-weight: 500;
          }
        }
        
        &.selected {
          background: #e6f7ff;
          border-color: #91d5ff;
          box-shadow: 0 0 0 4rpx rgba(24, 144, 255, 0.2);
        }
        
        .slot-time {
          display: block;
          font-size: 26rpx;
          font-weight: 600;
          color: #333333;
          margin-bottom: 8rpx;
        }
        
        .slot-status {
          display: block;
          font-size: 22rpx;
          color: #999999;
        }
      }
    }
  }
  
  .selector-actions {
    display: flex;
    padding: 30rpx;
    border-top: 1rpx solid #f0f0f0;
    
    .selector-cancel {
      flex: 1;
      height: 80rpx;
      background-color: #f5f5f5;
      color: #666666;
      border: none;
      border-radius: 8rpx;
      font-size: 28rpx;
      margin-right: 20rpx;
    }
    
    .selector-confirm {
      flex: 2;
      height: 80rpx;
      background-color: #ff6b35;
      color: #ffffff;
      border: none;
      border-radius: 8rpx;
      font-size: 28rpx;
      font-weight: 600;
      
      &[disabled] {
        background-color: #cccccc;
        color: #ffffff;
      }
    }
  }
}

// 拼场说明
.shared-info {
  background-color: #e6f7ff;
  border: 1rpx solid #91d5ff;
  border-radius: 8rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  
  .info-title {
    display: flex;
    align-items: center;
    font-size: 26rpx;
    font-weight: 600;
    color: #1890ff;
    margin-bottom: 16rpx;
    
    &::before {
      content: 'ℹ';
      margin-right: 8rpx;
      font-size: 28rpx;
    }
  }
  
  .info-list {
    .info-item {
      display: flex;
      align-items: flex-start;
      font-size: 24rpx;
      color: #666666;
      margin-bottom: 8rpx;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      &::before {
        content: '•';
        margin-right: 8rpx;
        color: #1890ff;
        font-weight: bold;
      }
    }
  }
}

// 时间限制提示
.time-restriction-tip {
  background-color: #fff7e6;
  border: 1rpx solid #ffd591;
  border-radius: 8rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  
  .tip-content {
    display: flex;
    align-items: center;
    font-size: 24rpx;
    color: #d46b08;
    
    &::before {
      content: '⚠';
      margin-right: 8rpx;
      font-size: 26rpx;
      color: #fa8c16;
    }
  }
}

// 拼场说明
.sharing-notice {
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
  border: 2rpx solid #40a9ff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-top: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.1);
  
  .notice-header {
    display: flex;
    align-items: center;
    margin-bottom: 24rpx;
    
    .notice-icon {
      font-size: 32rpx;
      margin-right: 12rpx;
    }
    
    .notice-title {
      font-size: 30rpx;
      font-weight: 700;
      color: #1890ff;
      letter-spacing: 1rpx;
    }
  }
  
  .notice-content {
    .notice-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 16rpx;
      padding: 12rpx 0;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .item-icon {
        font-size: 24rpx;
        margin-right: 12rpx;
        margin-top: 2rpx;
        flex-shrink: 0;
      }
      
      .item-text {
        font-size: 26rpx;
        color: #333333;
        line-height: 1.6;
        flex: 1;
      }
    }
  }
}

// 时间限制提示
.time-notice {
  background-color: #fff7e6;
  border: 1rpx solid #ffd591;
  border-radius: 8rpx;
  padding: 20rpx;
  margin-top: 16rpx;
  
  .notice-text {
    display: block;
    font-size: 24rpx;
    color: #d46b08;
    line-height: 1.5;
  }
}

// 自定义确认弹窗样式
.confirm-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 40rpx;
}

.confirm-dialog {
  background-color: #ffffff;
  border-radius: 16rpx;
  width: 100%;
  max-width: 600rpx;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.2);
}

.dialog-header {
  padding: 32rpx 32rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
  text-align: center;
  
  .dialog-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
  }
}

.dialog-content {
  padding: 32rpx;
  max-height: 60vh;
  overflow-y: auto;
  
  .info-row {
    display: flex;
    align-items: flex-start;
    margin-bottom: 24rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .info-label {
      font-size: 28rpx;
      color: #666666;
      width: 120rpx;
      flex-shrink: 0;
      line-height: 1.5;
    }
    
    .info-value {
      font-size: 28rpx;
      color: #333333;
      flex: 1;
      line-height: 1.5;
      word-break: break-all;
    }
    
    .info-value-column {
      flex: 1;
      
      .info-value {
        display: block;
        margin-bottom: 8rpx;
      }
      
      .time-details {
        .time-detail-item {
          display: block;
          font-size: 26rpx;
          color: #666666;
          margin-bottom: 4rpx;
          padding-left: 16rpx;
          position: relative;
          
          &:before {
            content: '•';
            position: absolute;
            left: 0;
            color: #ff6b35;
          }
          
          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }
    
    &.price-row {
      margin-top: 32rpx;
      padding-top: 24rpx;
      border-top: 1rpx solid #f0f0f0;
      
      .info-label {
        font-weight: 600;
        color: #333333;
      }
      
      .price-value {
        font-size: 32rpx;
        font-weight: 600;
        color: #ff6b35;
      }
    }
  }
  
  .price-note {
    margin-top: 8rpx;
    padding: 16rpx;
    background-color: #f8f9fa;
    border-radius: 8rpx;
    
    text {
      font-size: 24rpx;
      color: #666666;
      line-height: 1.4;
    }
  }
}

.dialog-actions {
  display: flex;
  padding: 24rpx 32rpx 32rpx;
  gap: 16rpx;
  
  .dialog-btn {
    flex: 1;
    height: 80rpx;
    border: none;
    border-radius: 8rpx;
    font-size: 28rpx;
    font-weight: 600;
    
    &.cancel-btn {
      background-color: #f5f5f5;
      color: #666666;
      
      &:active {
        background-color: #e8e8e8;
      }
    }
    
    &.confirm-btn {
      background-color: #ff6b35;
      color: #ffffff;
      
      &:active {
        background-color: #e55a2b;
      }
    }
  }
}
</style>