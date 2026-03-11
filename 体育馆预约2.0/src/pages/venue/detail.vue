<template>
  <view class="container">
    <!-- 简化的加载状态指示器 -->
    <view v-if="loading" class="loading-container">
      <view class="main-loading">
        <view class="loading-spinner"></view>
        <text class="loading-text">正在加载...</text>
      </view>
    </view>
    
    <!-- 场馆详情内容 -->
    <view v-else-if="venueDetail" class="detail-content">
      <!-- 场馆图片轮播 -->
      <view class="image-section">
        <swiper class="venue-swiper" indicator-dots circular>
          <swiper-item v-for="(image, index) in venueImages" :key="index">
            <image :src="image" class="venue-image" mode="aspectFill" />
          </swiper-item>
        </swiper>
        <view class="back-btn" @click="goBack">
          <text>←</text>
        </view>
      </view>
    
      <!-- 场馆基本信息 -->
    <view class="info-section">
      <view class="venue-header">
        <text class="venue-name">{{ venueDetail.name }}</text>
        <view class="venue-rating">
          <text class="rating-score">{{ venueDetail.rating || '暂无评分' }}</text>
          <text class="rating-star" v-if="venueDetail.rating">⭐</text>
          <text class="rating-count" v-if="venueDetail.reviewCount">({{ venueDetail.reviewCount }}条评价)</text>
        </view>
      </view>

      <view class="venue-location">
        <text class="location-icon">📍</text>
        <text class="location-text">{{ venueDetail.location }}</text>
        <text class="distance-text" v-if="venueDetail.distance">距离{{ venueDetail.distance }}km</text>
      </view>
      
      <view class="venue-price">
        <text class="price-label">价格：</text>
        <text class="price-value">¥{{ venueDetail.price }}</text>
        <text class="price-unit">/小时</text>
      </view>
      
      <view class="venue-tags">
        <text class="venue-tag">{{ venueDetail.type }}</text>
        <text v-if="venueDetail.supportSharing" class="venue-tag">支持拼场</text>
        <text class="venue-tag">{{ venueDetail.status === 'ACTIVE' ? '营业中' : '暂停营业' }}</text>
      </view>
    </view>
    
    <!-- 场馆描述 -->
    <view class="description-section">
      <view class="section-title">场馆介绍</view>
      <text class="description-text">{{ venueDetail.description }}</text>
    </view>
    
    <!-- 设施信息 -->
    <view class="facilities-section">
      <view class="section-title">设施服务</view>
      <view class="facilities-grid">
        <view
          v-for="facility in facilitiesList"
          :key="facility"
          class="facility-item"
        >
          <text class="facility-icon">🏃</text>
          <text class="facility-name">{{ facility }}</text>
        </view>
      </view>
    </view>

    <!-- 营业时间 -->
    <view class="hours-section">
      <view class="section-title">营业时间</view>
      <view class="hours-info">
        <text class="hours-text">{{ formatOpeningHours }}</text>
      </view>
    </view>
    
      <!-- 预约类型选择 -->
      <view class="booking-type-section" v-if="venueDetail.supportSharing">
        <view class="section-title">预约类型</view>
        <view class="booking-type-buttons">
          <view class="booking-type-btn-wrapper">
            <button 
              class="booking-type-btn" 
              :class="{ active: bookingType === 'EXCLUSIVE' }"
              @click="onBookingTypeChange('EXCLUSIVE')"
            >
              <text class="btn-text">包场</text>
            </button>
            <view class="help-icon" @click="showBookingTypeHelp('EXCLUSIVE')">
              <text class="help-text">?</text>
            </view>
          </view>
          
          <view class="booking-type-btn-wrapper">
            <button 
              class="booking-type-btn" 
              :class="{ active: bookingType === 'SHARED' }"
              @click="onBookingTypeChange('SHARED')"
            >
              <text class="btn-text">拼场</text>
            </button>
            <view class="help-icon" @click="showBookingTypeHelp('SHARED')">
              <text class="help-text">?</text>
            </view>
          </view>
        </view>
        
        <!-- 拼场提示信息 -->
        <view class="shared-notice" v-if="bookingType === 'SHARED'">
          <!-- 拼场说明 -->
          <view class="sharing-notice">
            <text class="notice-title">拼场说明：</text>
            <text class="notice-text">• 拼场预约需要等待其他用户加入</text>
            <text class="notice-text">• 如果预约时间前2小时内无人加入，系统将自动退款</text>
            <text class="notice-text">• 请确保联系方式准确，便于其他用户联系</text>
          </view>
          
          <!-- 时间限制提示 -->
          <view class="time-notice">
            <text class="notice-text">⏰ 拼场预约需要提前3小时预约</text>
          </view>
        </view>
      </view>
      
      <!-- 时间段选择 -->
      <view class="timeslot-section">
        <view class="section-header">
          <view class="section-title">选择时间</view>
          <button class="refresh-btn" @click="forceRefreshTimeSlots">
            <text class="refresh-icon">🔄</text>
            <text class="refresh-text">刷新</text>
          </button>
        </view>
      
      <!-- 日期选择 -->
      <view class="date-selector">
        <scroll-view class="date-scroll" scroll-x>
          <view 
            v-for="(date, index) in availableDates" 
            :key="index" 
            class="date-item"
            :class="{ active: selectedDate === date.value }"
            @click="selectDate(date.value)"
          >
            <text class="date-day">{{ date.day }}</text>
            <text class="date-date">{{ date.date }}</text>
          </view>
        </scroll-view>
      </view>
      
      <!-- 时间段列表 -->
      <view class="timeslot-list">
        <view 
          v-for="slot in filteredTimeSlots" 
          :key="slot.id" 
          :class="getSlotClass(slot)"
          @click="selectTimeSlot(slot)"
        >
          <view class="slot-time">
            <text>{{ slot.startTime }} - {{ slot.endTime }}</text>
          </view>
          <view class="slot-price">
            <text>¥{{ slot.price }}</text>
          </view>
          <view class="slot-status">
            <text>{{ getSlotStatusText(slot.status) }}</text>
          </view>
        </view>

        <!-- 无时间段提示 -->
        <view v-if="filteredTimeSlots.length === 0" class="no-timeslots">
          <text class="no-timeslots-text">该日期暂无可预约时间段</text>
          <text class="no-timeslots-tip">请选择其他日期或联系场馆咨询</text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-actions">
      <!-- 选中时间段信息 -->
      <view class="selected-info" v-if="selectedTimeSlots.length > 0">
        <view class="selected-time">
          <text class="time-text">已选择 {{ selectedTimeSlots.length }} 个时间段</text>
          <text class="price-text">总计：¥{{ getTotalPrice() }}</text>
        </view>
      </view>
      
      <!-- 操作按钮区域 -->
      <view class="action-buttons">
        <view class="contact-btn" @click="contactVenue">
          <text class="contact-icon">📞</text>
          <text class="contact-text">联系场馆</text>
        </view>
        
        <button 
          class="book-btn" 
          :class="{ 'book-btn-active': selectedTimeSlots.length > 0 }"
          :disabled="selectedTimeSlots.length === 0"
          @click="bookVenue"
        >
          <text class="book-btn-text">{{ getBookButtonText() }}</text>
        </button>
      </view>
    </view>
    
    <!-- 预约确认弹窗已移除，统一使用booking/create页面进行预约 -->
    </view>
    
    <!-- 错误状态 -->
    <view v-else class="error-container">
      <text>加载失败，请重试</text>
      <button @click="initData" class="retry-btn">重试</button>
    </view>
    
    <!-- 帮助说明弹窗 -->
    <view v-if="showHelpModal" class="help-modal-overlay" @click="closeHelpModal">
      <view class="help-modal" @click.stop>
        <view class="help-header">
          <text class="help-title">{{ helpContent.title }}</text>
          <view class="help-close" @click="closeHelpModal">
            <text class="close-icon">×</text>
          </view>
        </view>
        <view class="help-body">
          <text class="help-description">{{ helpContent.description }}</text>
        </view>
        <view class="help-footer">
          <button class="help-confirm-btn" @click="closeHelpModal">
            <text class="confirm-text">我知道了</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useVenueStore } from '@/stores/venue.js'
import { useBookingStore } from '@/stores/booking.js'
import { formatDate } from '@/utils/helpers.js'

export default {
  name: 'VenueDetail',

  data() {
    return {
      venueStore: null,
      bookingStore: null,
      venueId: '',
      selectedDate: '',
      selectedTimeSlots: [], // 改为数组以支持多时间段选择
      availableDates: [],
      bookingType: 'EXCLUSIVE', // 预约类型：EXCLUSIVE(独享) 或 SHARED(拼场)
      // 简化的状态管理
      isRefreshing: false,
      lastRefreshTime: 0,
      loading: false, // 将loading移到data中
      // 帮助说明相关
      showHelpModal: false,
      helpContent: {
        title: '',
        description: ''
      }
    }
  },
  
  computed: {
    venueDetail() {
      return this.venueStore?.venueDetailGetter || {}
    },

    timeSlots() {
      // timeSlotsGetter是一个getter，直接访问state.timeSlots
      const slots = this.venueStore?.timeSlots || [];
      console.log('timeSlots computed - venueStore:', this.venueStore);
      console.log('timeSlots computed - timeSlots:', this.venueStore?.timeSlots);
      console.log('timeSlots computed - 返回值:', slots);
      return slots;
    },


    


    // 处理场馆图片
    venueImages() {
      if (this.venueDetail.image) {
        // 如果image是字符串，转换为数组
        if (typeof this.venueDetail.image === 'string') {
          return [this.venueDetail.image]
        }
        // 如果已经是数组，直接返回
        if (Array.isArray(this.venueDetail.image)) {
          return this.venueDetail.image
        }
      }
      // 默认图片 - 使用网络图片或者移除默认图片
      return ['https://via.placeholder.com/400x200?text=场馆图片']
    },

    // 处理设施列表
    facilitiesList() {
      if (this.venueDetail.facilities) {
        // 如果facilities是字符串，按逗号分割
        if (typeof this.venueDetail.facilities === 'string') {
          return this.venueDetail.facilities.split(',').map(f => f.trim()).filter(f => f)
        }
        // 如果已经是数组，直接返回
        if (Array.isArray(this.venueDetail.facilities)) {
          return this.venueDetail.facilities
        }
      }
      return []
    },

    // 格式化营业时间
    formatOpeningHours() {
      if (this.venueDetail.openTime && this.venueDetail.closeTime) {
        return `${this.venueDetail.openTime} - ${this.venueDetail.closeTime}`
      }
      return '营业时间待更新'
    },

    // 过滤掉已过期的时间段
    filteredTimeSlots() {
      console.log('[DEBUG] filteredTimeSlots 计算开始')
      console.log('[DEBUG] 原始时间段数据:', this.timeSlots)
      console.log('[DEBUG] 当前选择的日期:', this.selectedDate)

      // 确保timeSlots是数组
      if (!Array.isArray(this.timeSlots)) {
        console.warn('[DEBUG] timeSlots不是数组:', this.timeSlots)
        return []
      }

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes(); // 当前时间转换为分钟
      const selectedDate = this.selectedDate;
      const today = new Date().toISOString().split('T')[0]; // 今天的日期 YYYY-MM-DD

      const slots = this.timeSlots.filter(slot => {
        // 确保slot是对象且有必要的属性
        if (!slot || typeof slot !== 'object') {
          return false
        }

        // 如果选择的是今天，才进行过期检查
        if (selectedDate === today) {
          // 过滤掉状态为EXPIRED的时间段（仅限今日）
          if (slot.status === 'EXPIRED') {
            return false
          }

          // 过滤掉已经过去的时间段（仅限今日）
          if (slot.startTime) {
            const slotStartTime = this.getMinutesFromTimeString(slot.startTime);
            if (slotStartTime <= currentTime) {
              return false // 已经过去的时间段不显示
            }
          }
        }

        return true
      })
      
      return slots
    }
  },
  
  async onLoad(options) {
    // 初始化Pinia stores
    this.venueStore = useVenueStore();
    this.bookingStore = useBookingStore();

    this.venueId = options.id;
    
    await this.initData();
  },
  
  async onShow() {
    // 设置全局事件监听
    this.setupGlobalEventListeners();

    try {
      // 🔍 检查是否存在跨页的“最近一次取消”标记（防止事件丢失）
      const storeFlag = this.bookingStore && this.bookingStore.lastCancelled
      let persistedFlag = null
      try { persistedFlag = uni.getStorageSync && uni.getStorageSync('lastCancelledTimeslot') } catch (_) {}
      const flag = storeFlag || persistedFlag

      if (flag && String(flag.venueId) === String(this.venueId)) {
        // 如果当前页面还没有选中日期，但标记里有日期，则采用标记日期
        if (!this.selectedDate && flag.date) {
          this.selectedDate = flag.date
          console.log('[VenueDetail] onShow: 根据最近一次取消记录设置 selectedDate =', this.selectedDate)
        }

        if (this.selectedDate === flag.date) {
          console.log('[VenueDetail] onShow: 检测到最近一次取消匹配当前页面，强制刷新时间段')
          await this.loadTimeSlots(true)
          // 清理标记，避免重复刷新
          if (this.bookingStore) this.bookingStore.lastCancelled = null
          try { uni.removeStorageSync && uni.removeStorageSync('lastCancelledTimeslot') } catch (_) {}
          return
        }
      }

      // 常规加载逻辑
      if (this.venueId && this.selectedDate) {
        console.log('[VenueDetail] onShow: 常规重新加载时间段数据')
        this.loadTimeSlots(false) // 不强制刷新，但会检查缓存是否有效
      } else {
        console.log('[VenueDetail] onShow: 缺少 venueId 或 selectedDate，跳过加载')
      }
    } catch (e) {
      console.warn('[VenueDetail] onShow 处理异常:', e)
    }
  },
  
  onHide() {
    console.log('[VenueDetail] 页面隐藏');
    // 移除全局事件监听
    this.removeGlobalEventListeners();
  },
  
  onPullDownRefresh() {
    this.refreshData();
  },
  
  methods: {
    
    /**
     * 检查网络状态
     */
    async checkNetworkStatus() {
      try {
        const networkInfo = await uni.getNetworkType();
        return {
          isConnected: networkInfo.networkType !== 'none',
          networkType: networkInfo.networkType
        };
      } catch (error) {
        console.error('[VenueDetail] 网络状态检查失败:', error);
        return {
          isConnected: false,
          networkType: 'unknown'
        };
      }
    },
    
    // 🚀 ===== 原有方法（已优化） =====

    // 简化的时间段刷新
    async refreshTimeSlotsWithCache() {
      if (this.loading) {
        console.log('[VenueDetail] 正在加载中，跳过重复请求');
        return;
      }

      try {
        this.loading = true;
        console.log('[VenueDetail] 开始刷新时间段');
        
        // 直接重新加载时间段
        await this.loadTimeSlots();
        
        // 更新刷新时间
        this.lastRefreshTime = Date.now();
        
        console.log('[VenueDetail] 时间段刷新完成');
      } catch (error) {
        console.error('[VenueDetail] 刷新时间段失败:', error);
        uni.showToast({
          title: '刷新失败',
          icon: 'error'
        });
      } finally {
        this.loading = false;
      }
    },

    // 将时间字符串转换为分钟数（用于比较）
    getMinutesFromTimeString(timeStr) {
      if (!timeStr || typeof timeStr !== 'string') {
        console.warn('getMinutesFromTimeString: 无效的时间字符串:', timeStr);
        return 0;
      }

      try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
          console.warn('getMinutesFromTimeString: 时间格式错误:', timeStr);
          return 0;
        }
        return hours * 60 + minutes;
      } catch (error) {
        console.error('getMinutesFromTimeString: 解析时间失败:', timeStr, error);
        return 0;
      }
    },

    // 简化的初始化数据方法
    async initData() {
      try {
        console.log(`[VenueDetail] 开始初始化数据，场馆ID: ${this.venueId}`);
        
        if (!this.venueId) {
          console.error('[VenueDetail] 场馆ID为空');
          uni.showToast({
            title: '参数错误',
            icon: 'error'
          });
          return;
        }
        
        this.loading = true;
        
        this.loading = true;
        
        // 🔥 性能优化：先初始化日期获取 selectedDate，让详情和时间段接口并行请求
        this.initDates();
        
        const requests = [
          this.venueStore.getVenueDetail(this.venueId)
            .then(() => console.log('[VenueDetail] 获取场馆详情成功'))
            .catch(e => console.error('[VenueDetail] 获取详情失败:', e))
        ];

        if (this.selectedDate) {
          requests.push(
            this.loadTimeSlots().catch(e => console.error('[VenueDetail] 获取时间段失败:', e))
          );
        }

        await Promise.all(requests);
        
        console.log('[VenueDetail] 数据初始化完成');
        
      } catch (error) {
        console.error('[VenueDetail] 初始化数据失败:', error);
        uni.showToast({
          title: '加载失败',
          icon: 'error'
        });
      } finally {
        this.loading = false;
      }
    },
    

     

     

     
    // 简化的数据刷新方法
    async refreshData() {
      try {
        console.log('[VenueDetail] 🔄 开始刷新数据');
        this.loading = true;
        
        // 重新初始化数据
        await this.initData();
        
        uni.showToast({
          title: '刷新成功',
          icon: 'success'
        });
        
        uni.stopPullDownRefresh();
        
      } catch (error) {
        console.error('[VenueDetail] ❌ 数据刷新失败:', error);
        
        uni.showToast({
          title: '刷新失败',
          icon: 'error'
        });
        
        uni.stopPullDownRefresh();
      } finally {
        this.loading = false;
      }
    },

    // 初始化可选日期
    initDates() {
      const dates = [];
      const today = new Date();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const day = i === 0 ? '今天' : i === 1 ? '明天' : dayNames[date.getDay()];
        
        dates.push({
          value: formatDate(date, 'YYYY-MM-DD'),
          day: day,
          date: formatDate(date, 'MM/DD')
        });
      }
      
      this.availableDates = dates;
      this.selectedDate = dates[0].value;
    },
    
    // 简化的日期选择方法
    async selectDate(date) {
      try {
        console.log('[VenueDetail] 🗓️ 选择日期:', date);
        
        this.selectedDate = date;
        this.selectedTimeSlots = [];
        this.loading = true;
        
        // 加载该日期的时间段数据
        await this.venueStore.getVenueTimeSlots({
          venueId: this.venueId,
          date: date,
          forceRefresh: false
        });
        
        console.log('[VenueDetail] ✅ 日期选择完成');
        
      } catch (error) {
        console.error('[VenueDetail] ❌ 日期选择失败:', error);
        
        uni.showToast({
          title: '加载失败',
          icon: 'error'
        });
        
      } finally {
        this.loading = false;
      }
    },
    
    // 预约类型变化
    onBookingTypeChange(type) {
      this.bookingType = type;
      
      // 清空已选择的时间段，因为过滤条件可能发生变化
      this.selectedTimeSlots = [];
    },



    // 判断是否需要刷新时间段
    shouldRefreshTimeSlots() {
      if (!this.timeSlots || this.timeSlots.length === 0) {
        return true;
      }
      return false;
    },

    // 加载时间段
    async loadTimeSlots(forceRefresh = false) {
      console.log('[VenueDetail] 🚨🚨🚨 开始加载时间段 🚨🚨🚨', {
        venueId: this.venueId,
        date: this.selectedDate,
        forceRefresh
      });

      if (this.isRefreshing) {
        console.log('[VenueDetail] 正在刷新中，跳过重复加载');
        return;
      }

      this.isRefreshing = true;

      try {
        uni.showLoading({ title: '加载时间段...' });

        // 🗑️ 如果是强制刷新，先清除所有缓存
        if (forceRefresh) {
          console.log('[VenueDetail] 🗑️ 强制刷新，清除所有缓存');

          // 清除 venue store 缓存
          if (this.venueStore && this.venueStore.cache && this.venueStore.cache.timeSlots) {
            const cacheKey = `${this.venueId}_${this.selectedDate}`;
            this.venueStore.cache.timeSlots.delete(cacheKey);
            this.venueStore.cache.timeSlots.clear(); // 清除所有时间段缓存
            console.log('[VenueDetail] ✅ 已清除 venue store 缓存');
          }

          // 清除缓存管理器缓存
          try {
            const { default: cacheManager } = await import('@/utils/cache-manager.js');
            if (cacheManager) {
              cacheManager.clearTimeSlotCache(this.venueId, this.selectedDate);
              cacheManager.clear(); // 清除所有缓存
              console.log('[VenueDetail] ✅ 已清除缓存管理器缓存');
            }
          } catch (importError) {
            console.warn('[VenueDetail] 导入缓存管理器失败:', importError);
          }

          // 清除统一时间段管理器缓存
          try {
            const { default: unifiedTimeSlotManager } = await import('@/utils/unified-timeslot-manager.js');
            if (unifiedTimeSlotManager) {
              unifiedTimeSlotManager.clearCache(this.venueId, this.selectedDate);
              console.log('[VenueDetail] ✅ 已清除统一时间段管理器缓存');
            }
          } catch (importError) {
            console.warn('[VenueDetail] 导入统一时间段管理器失败:', importError);
          }
        }

        console.log('[VenueDetail] 🔄 从后端获取时间段数据');
        console.log('[VenueDetail] 🔥 调用getVenueTimeSlots，参数:', {
          venueId: this.venueId,
          date: this.selectedDate,
          forceRefresh: forceRefresh,
          loading: false,
          timestamp: Date.now()
        });

        const result = await this.venueStore.getVenueTimeSlots(
          this.venueId,
          this.selectedDate,
          forceRefresh,
          false
        );

        let timeSlots = this.timeSlots || [];
        console.log(`[VenueDetail] 🎉 获取到 ${timeSlots.length} 个时间段`);

        // 🎯 关键修复：强制修正时间段状态
        if (timeSlots.length > 0) {
          console.log('[VenueDetail] 🔧 开始修正时间段状态');
          timeSlots = timeSlots.map(slot => {
            const originalStatus = slot.status;

            // 如果后端返回的是 AVAILABLE，但前端显示为其他状态，强制修正
            if (originalStatus === 'AVAILABLE') {
              console.log(`[VenueDetail] 🔧 修正时间段 ${slot.id} (${slot.startTime}-${slot.endTime}) 状态: ${originalStatus} -> AVAILABLE`);
              return {
                ...slot,
                status: 'AVAILABLE',
                isBooked: false,
                isAvailable: true
              };
            }

            return slot;
          });

          // 更新到 store
          this.venueStore.setTimeSlots(timeSlots);
          console.log('[VenueDetail] 🎉 时间段状态修正完成');
        }

        console.log('[VenueDetail] 修正后时间段数量:', timeSlots.length);

        if (forceRefresh) {
          uni.showToast({
            title: `刷新成功，获取到${timeSlots.length}个时间段`,
            icon: 'success',
            duration: 2000
          });
        }

        console.log('[VenueDetail] 🎉 时间段加载完成');
        
      } catch (error) {
        console.error('[VenueDetail] 加载时间段失败:', error);
        uni.showToast({
          title: '加载时间段失败，请重试',
          icon: 'error',
          duration: 2000
        });
      } finally {
        uni.hideLoading();
        this.isRefreshing = false;
      }
    },

    // 处理初始化数据失败
    handleInitDataFailure() {
      uni.showModal({
        title: '提示',
        content: '场馆信息加载失败，请检查网络后重试',
        showCancel: false,
        success: () => {
          uni.navigateBack()
        }
      })
    },
    
    // 时间段选择方法
    selectTimeSlot(slot) {
      try {
        console.log('[VenueDetail] 点击时间段:', slot)
        console.log('[VenueDetail] 时间段状态:', slot.status)
        console.log('[VenueDetail] 当前预约类型:', this.bookingType)
        console.log('[VenueDetail] 当前已选时间段:', this.selectedTimeSlots)
        
        // 首先检查时间段状态
        if (slot.status === 'OCCUPIED' || slot.status === 'RESERVED') {
          uni.showToast({
            title: '该时间段已被预约',
            icon: 'none',
            duration: 2000
          })
          return
        } else if (slot.status === 'MAINTENANCE') {
          uni.showToast({
            title: '该时间段维护中',
            icon: 'none',
            duration: 2000
          })
          return
        } else if (slot.status === 'EXPIRED') {
          // 检查是否为未来日期的EXPIRED状态
          const today = new Date().toISOString().split('T')[0] // 今天的日期 YYYY-MM-DD
          const selectedDate = this.selectedDate
          
          // 只有今天或过去日期的EXPIRED状态才阻止选择
          if (selectedDate <= today) {
            uni.showToast({
              title: '该时间段已过期，无法预约',
              icon: 'none',
              duration: 2000
            });
            return;
          } else {
            // 未来日期的EXPIRED状态，当作AVAILABLE处理
            console.log('[VenueDetail] 未来日期EXPIRED状态允许选择:', {
              selectedDate,
              today,
              isFutureDate: selectedDate > today
            });
            // 继续执行下面的AVAILABLE逻辑
          }
        }
        
        // 处理AVAILABLE状态或未来日期的EXPIRED状态
        if (slot.status === 'AVAILABLE' || (slot.status === 'EXPIRED' && this.selectedDate > new Date().toISOString().split('T')[0])) {
        // 如果是拼场预约，检查时间限制
        if (this.bookingType === 'SHARED') {
          if (!this.isTimeSlotValidForSharing(slot)) {
            uni.showToast({
              title: '拼场预约请选择三个小时以后的时间段',
              icon: 'none',
              duration: 3000
            });
            return;
          }
        }
        // 检查时间段是否已被选中
        const existingIndex = this.selectedTimeSlots.findIndex(item => 
          (item.id && item.id === slot.id) || 
          (item.startTime === slot.startTime && item.endTime === slot.endTime)
        );
        
        // 如果已选中，则取消选择
        if (existingIndex !== -1) {
          this.selectedTimeSlots.splice(existingIndex, 1);
          console.log('取消选择时间段:', slot);
          uni.showToast({
            title: '已取消选择',
            icon: 'success',
            duration: 1000
          });
          return;
        }
        
        // 如果已有选择的时间段，检查是否连续
        if (this.selectedTimeSlots.length > 0) {
          // 检查与已选时间段是否有连续的
          const hasConsecutive = this.selectedTimeSlots.some(selectedSlot => 
            this.isConsecutiveTimeSlot(selectedSlot, slot)
          );
          
          if (!hasConsecutive) {
            // 禁止选择不连续的时间段
            uni.showToast({
              title: '只能选择连续的时间段',
              icon: 'none',
              duration: 2000
            });
            return;
          }
        }
        
        // 添加到已选时间段
        this.selectedTimeSlots.push(slot);
        console.log('已选择时间段:', this.selectedTimeSlots);
        
        uni.showToast({
          title: '已选择时间段',
          icon: 'success',
          duration: 1000
        })
      } else {
        // 处理未知状态
        uni.showToast({
          title: '该时间段不可用',
          icon: 'none',
          duration: 2000
        })
      }
      
      } catch (error) {
        console.error('[VenueDetail] 时间段选择失败:', error)
        
        uni.showToast({
          title: '选择时间段时出现问题，请重试',
          icon: 'none',
          duration: 2000
        })
      }
    },
    
    // 检查两个时间段是否连续
    isConsecutiveTimeSlot(slot1, slot2) {
      // 使用已定义的方法将时间转换为分钟数
      const slot1End = this.getMinutesFromTimeString(slot1.endTime)
      const slot2Start = this.getMinutesFromTimeString(slot2.startTime)
      const slot1Start = this.getMinutesFromTimeString(slot1.startTime)
      const slot2End = this.getMinutesFromTimeString(slot2.endTime)
      
      // 检查两个时间段是否相邻
      return slot1End === slot2Start || slot2End === slot1Start
    },
    
    // 获取时间段样式类
    getSlotClass(slot) {
      const classes = ['timeslot-item']
      
      if (slot.status === 'OCCUPIED') {
        classes.push('occupied')
        classes.push('disabled') // 已预约的时间段添加禁用样式
      } else if (slot.status === 'RESERVED') {
        classes.push('occupied')
        classes.push('disabled') // 已预约的时间段添加禁用样式
      } else if (slot.status === 'MAINTENANCE') {
        classes.push('maintenance')
        classes.push('disabled') // 维护中的时间段添加禁用样式
      } else if (slot.status === 'EXPIRED') {
        // 🔥 修复：对于未来日期的EXPIRED状态，不添加expired和disabled样式
        const today = new Date().toISOString().split('T')[0] // 今天的日期 YYYY-MM-DD
        const selectedDate = this.selectedDate
        
        // 只有今天或过去日期的EXPIRED状态才添加expired和disabled样式
        if (selectedDate <= today) {
          classes.push('expired')
          classes.push('disabled') // 已过期的时间段添加禁用样式
          console.log('[VenueDetail] 🔧 今日EXPIRED状态添加expired和disabled样式:', {
            selectedDate,
            today,
            isPastOrToday: selectedDate <= today
          })
        } else {
          console.log('[VenueDetail] 🔧 未来日期EXPIRED状态不添加expired和disabled样式:', {
            selectedDate,
            today,
            isFutureDate: selectedDate > today
          });
        }
      } 
      
      // 检查是否是选中的时间段
      const isSelected = this.selectedTimeSlots.some(selectedSlot => 
        (slot.id && selectedSlot.id === slot.id) || 
        (slot.startTime === selectedSlot.startTime && slot.endTime === selectedSlot.endTime)
      );
      
      if (isSelected) {
        classes.push('selected');
        console.log('添加选中样式:', slot);
      }
      
      return classes.join(' ');
    },
    
    // 获取第一个时间段（按开始时间排序）
    getFirstTimeSlot() {
      if (this.selectedTimeSlots.length === 0) return null;
      
      return this.selectedTimeSlots.reduce((earliest, current) => {
        const earliestTime = this.getMinutesFromTimeString(earliest.startTime);
        const currentTime = this.getMinutesFromTimeString(current.startTime);
        return currentTime < earliestTime ? current : earliest;
      }, this.selectedTimeSlots[0]);
    },
    
    // 获取最后一个时间段（按结束时间排序）
    getLastTimeSlot() {
      if (this.selectedTimeSlots.length === 0) return null;
      
      return this.selectedTimeSlots.reduce((latest, current) => {
        const latestTime = this.getMinutesFromTimeString(latest.endTime);
        const currentTime = this.getMinutesFromTimeString(current.endTime);
        return currentTime > latestTime ? current : latest;
      }, this.selectedTimeSlots[0]);
    },

    
    // 检查时间段是否满足拼场预约的时间限制（需要提前3小时）
    isTimeSlotValidForSharing(slot) {
      try {
        const now = new Date();
        
        // 🔧 修复iOS日期兼容性问题：将"YYYY-MM-DD HH:mm"格式转换为iOS兼容格式
        // iOS支持的格式：YYYY/MM/DD HH:mm:ss 或 YYYY-MM-DDTHH:mm:ss
        const dateStr = this.selectedDate.replace(/-/g, '/'); // 将2025-08-07转换为2025/08/07
        const timeStr = slot.startTime + ':00'; // 将20:30转换为20:30:00
        const selectedDateTime = new Date(`${dateStr} ${timeStr}`);
        
        // 验证日期是否有效
        if (isNaN(selectedDateTime.getTime())) {
          console.warn('[VenueDetail] 无效的日期时间:', `${dateStr} ${timeStr}`);
          return false;
        }
        
        // 计算时间差（毫秒）
        const timeDiff = selectedDateTime.getTime() - now.getTime();
        
        // 转换为小时
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        console.log('[VenueDetail] 拼场时间检查:', {
          now: now.toISOString(),
          selectedDateTime: selectedDateTime.toISOString(),
          hoursDiff: hoursDiff.toFixed(2),
          isValid: hoursDiff >= 3
        });
        
        // 需要提前3小时以上
        return hoursDiff >= 3;
      } catch (error) {
        console.error('[VenueDetail] 拼场时间检查失败:', error);
        return false;
      }
    },
    
    // 计算总价格
    getTotalPrice() {
      if (this.selectedTimeSlots.length === 0) return 0;
      
      return this.selectedTimeSlots.reduce((total, slot) => {
        return total + (slot.price || 0);
      }, 0);
    },
    
    // 获取时间段状态文本
    getSlotStatusText(status) {
      const statusMap = {
        'AVAILABLE': '可预约',
        'OCCUPIED': '已预约',
        'RESERVED': '已预约',
        'MAINTENANCE': '维护中',
        'EXPIRED': '已过期'
      }
      
      // 🔥 修复：对于未来日期的EXPIRED状态，显示为"可预约"
      if (status === 'EXPIRED') {
        const today = new Date().toISOString().split('T')[0] // 今天的日期 YYYY-MM-DD
        const selectedDate = this.selectedDate
        
        // 如果选择的是未来日期，EXPIRED状态应该显示为"可预约"
        if (selectedDate > today) {
          console.log('[VenueDetail] 🔧 未来日期EXPIRED状态修正为可预约:', {
            selectedDate,
            today,
            isFutureDate: selectedDate > today
          })
          return '可预约'
        }
      }
      
      return statusMap[status] || '可预约'
    },
    
    // 获取预约按钮文本
    getBookButtonText() {
      if (this.selectedTimeSlots.length === 0) {
        return '请选择时间段'
      }
      
      return `预约 ${this.selectedTimeSlots.length} 个时间段`
    },
    
    // 预约场馆
    bookVenue() {
      console.log('[VenueDetail] 🎯 预约按钮被点击')

      // 🔧 关键调试：检查当前选择的日期
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]

      console.log('[VenueDetail] 🚨 关键日期调试:', {
        selectedDate: this.selectedDate,
        today: today,
        tomorrow: tomorrow,
        isToday: this.selectedDate === today,
        isTomorrow: this.selectedDate === tomorrow,
        availableDates: this.availableDates.map(d => ({value: d.value, day: d.day}))
      })

      console.log('[VenueDetail] 📊 当前状态:', {
        selectedTimeSlots: this.selectedTimeSlots,
        selectedTimeSlotsLength: this.selectedTimeSlots.length,
        bookingType: this.bookingType,
        venueId: this.venueDetail.id,
        selectedDate: this.selectedDate
      })
      
      if (this.selectedTimeSlots.length === 0) {
        console.warn('[VenueDetail] ❌ 未选择时间段')
        uni.showToast({
          title: '请选择时间段',
          icon: 'none'
        })
        return
      }
      
      // 传递所有选中的时间段信息
      const selectedSlotsData = JSON.stringify(this.selectedTimeSlots)
      const targetUrl = `/pages/booking/create?venueId=${this.venueDetail.id}&date=${this.selectedDate}&bookingType=${this.bookingType}&selectedSlots=${encodeURIComponent(selectedSlotsData)}`

      // 🔥 修复问题1: 将 console.error 改为 console.log，避免误导性错误提示
      console.log('[VenueDetail] 📋 跳转参数:', {
        venueId: this.venueDetail.id,
        selectedDate: this.selectedDate,
        bookingType: this.bookingType,
        selectedTimeSlots: this.selectedTimeSlots,
        targetUrl: targetUrl
      })

      console.log('[VenueDetail] 🚀 准备跳转到预约页面')
      console.log('[VenueDetail] 📋 跳转URL:', targetUrl)
      console.log('[VenueDetail] 📦 传递的时间段数据:', this.selectedTimeSlots)
      
      // 跳转到预约页面，传递预约类型参数和所有选中的时间段
      uni.navigateTo({
        url: targetUrl,
        success: () => {
          console.log('[VenueDetail] ✅ 成功跳转到预约页面')
        },
        fail: (error) => {
          console.error('[VenueDetail] ❌ 跳转预约页面失败:', error)
          uni.showToast({
            title: '跳转失败，请重试',
            icon: 'none'
          })
        }
      })
    },
    
    // 弹窗相关方法已移除，统一使用跳转到booking/create页面的预约流程
    
    // 联系场馆
    contactVenue() {
      if (this.venueDetail.phone) {
        uni.makePhoneCall({
          phoneNumber: this.venueDetail.phone
        })
      } else {
        uni.showToast({
          title: '暂无联系方式',
          icon: 'none'
        })
      }
    },
    
    // 返回上一页
    goBack() {
      uni.navigateBack()
    },
    
    // 格式化选中日期
    formatSelectedDate() {
      const selectedDateObj = this.availableDates.find(d => d.value === this.selectedDate)
      return selectedDateObj ? `${selectedDateObj.day} ${selectedDateObj.date}` : this.selectedDate
    },
    
    // 计算预约时长
    getBookingDuration() {
      if (this.selectedTimeSlots.length === 0) {
        return '0小时'
      }
      
      if (this.selectedTimeSlots.length === 1) {
        const slot = this.selectedTimeSlots[0]
        const startMinutes = this.getMinutesFromTimeString(slot.startTime)
        const endMinutes = this.getMinutesFromTimeString(slot.endTime)
        const durationMinutes = endMinutes - startMinutes
        const hours = Math.floor(durationMinutes / 60)
        const minutes = durationMinutes % 60
        
        if (minutes === 0) {
          return `${hours}小时`
        } else {
          return `${hours}小时${minutes}分钟`
        }
      } else {
        // 多个时间段的情况
        const firstSlot = this.getFirstTimeSlot()
        const lastSlot = this.getLastTimeSlot()
        
        if (firstSlot && lastSlot) {
          const startMinutes = this.getMinutesFromTimeString(firstSlot.startTime)
          const endMinutes = this.getMinutesFromTimeString(lastSlot.endTime)
          const durationMinutes = endMinutes - startMinutes
          const hours = Math.floor(durationMinutes / 60)
          const minutes = durationMinutes % 60
          
          if (minutes === 0) {
            return `${hours}小时`
          } else {
            return `${hours}小时${minutes}分钟`
          }
        }
        
        return '0小时'
      }
    },
    
    // 强制刷新时间段数据
    async forceRefreshTimeSlots() {
      try {
        console.log('[VenueDetail] 🔄 用户手动触发强制刷新时间段')

        // 清空选中的时间段
        this.selectedTimeSlots = []
        
        // 强制刷新时间段数据
        await this.loadTimeSlots(true)

        uni.showToast({
          title: '刷新成功',
          icon: 'success',
          duration: 1500
        })
        
        console.log('[VenueDetail] ✅ 手动刷新完成')
        
      } catch (error) {
        console.error('[VenueDetail] ❌ 手动刷新失败:', error)
        
        uni.showToast({
          title: '刷新失败，请重试',
          icon: 'none',
          duration: 2000
        })
      }
    },

    // 设置全局事件监听
    setupGlobalEventListeners() {
      console.log('[VenueDetail] 🚨🚨🚨 设置全局事件监听 🚨🚨🚨')

      // 🔥 关键修复：监听订单过期事件
      uni.$on('order-expired', this.onOrderExpiredEvent)

      // 监听预约成功事件
      uni.$on('booking-success', this.onBookingSuccessEvent)

      // 监听时间段状态更新事件
      uni.$on('timeslot-status-updated', this.onTimeSlotStatusUpdated)

      // 🎯 关键修复：监听预约取消后的时间段更新事件
      uni.$on('timeslot-updated', this.onTimeSlotUpdated)

      // 🎯 关键修复：监听强制刷新事件
      uni.$on('force-refresh-timeslots', this.onForceRefreshTimeslots)

      console.log('[VenueDetail] ✅ 全局事件监听设置完成')
    },

    // 移除全局事件监听
    removeGlobalEventListeners() {
      console.log('[VenueDetail] 移除全局事件监听')

      // 移除事件监听
      uni.$off('order-expired', this.onOrderExpiredEvent)
      uni.$off('booking-success', this.onBookingSuccessEvent)
      uni.$off('timeslot-status-updated', this.onTimeSlotStatusUpdated)
      uni.$off('timeslot-updated', this.onTimeSlotUpdated)
      uni.$off('force-refresh-timeslots', this.onForceRefreshTimeslots)

      console.log('[VenueDetail] 全局事件监听移除完成')
    },

    // 🔥 处理订单过期事件
    async onOrderExpiredEvent(eventData) {
      console.log('[VenueDetail] 🚨🚨🚨 收到订单过期事件 🚨🚨🚨')
      console.log('[VenueDetail] 订单过期事件数据:', eventData)
      
      // 检查是否是当前场馆和日期的订单
      if (eventData && 
          eventData.venueId == this.venueId && 
          eventData.date === this.selectedDate) {
        
        console.log('[VenueDetail] 🎯 订单过期事件匹配当前页面，立即释放时间段并刷新')
        
        try {
          // 🗑️ 清除缓存
          console.log('[VenueDetail] 🗑️ 清除相关缓存')
          
          // 清除 venue store 缓存
          if (this.venueStore && this.venueStore.cache && this.venueStore.cache.timeSlots) {
            const cacheKey = `${this.venueId}_${this.selectedDate}`
            this.venueStore.cache.timeSlots.delete(cacheKey)
            console.log('[VenueDetail] ✅ 已清除 venue store 缓存')
          }
          
          // 清除缓存管理器缓存
          try {
            const { default: cacheManager } = await import('@/utils/cache-manager.js')
            if (cacheManager) {
              cacheManager.clearTimeSlotCache(this.venueId, this.selectedDate)
              console.log('[VenueDetail] ✅ 已清除缓存管理器缓存')
            }
          } catch (importError) {
            console.warn('[VenueDetail] 导入缓存管理器失败:', importError)
          }
          
          // 🔄 立即刷新时间段数据
          console.log('[VenueDetail] 🔄 立即刷新时间段数据')
          await this.loadTimeSlots(true)
          console.log('[VenueDetail] 🎉 订单过期后时间段刷新完成')
          
          // 显示友好提示
          uni.showToast({
            title: '订单已过期，时间段已释放',
            icon: 'none',
            duration: 3000
          })
          
        } catch (error) {
          console.error('[VenueDetail] ❌ 处理订单过期事件失败:', error)
        }
        
      } else {
        console.log('[VenueDetail] 🔍 订单过期事件不匹配当前页面，忽略')
        console.log('[VenueDetail] 当前页面:', { venueId: this.venueId, date: this.selectedDate })
        console.log('[VenueDetail] 事件数据:', { venueId: eventData?.venueId, date: eventData?.date })
      }
    },

    // 处理预约成功事件
    async onBookingSuccessEvent(eventData) {
      console.log('[VenueDetail] 收到预约成功事件:', eventData)
      
      // 检查是否是当前场馆和日期的预约
      if (eventData && 
          eventData.venueId === this.venueId && 
          eventData.date === this.selectedDate) {
        
        console.log('[VenueDetail] 预约成功事件匹配当前页面，刷新时间段数据')
        
        // 延迟刷新时间段数据
        setTimeout(async () => {
          try {
            await this.loadTimeSlots(true)
          } catch (error) {
            console.error('[VenueDetail] 刷新时间段数据失败:', error)
          }
        }, 1000)
        
      } else {
        console.log('[VenueDetail] 预约成功事件不匹配当前页面，忽略')
      }
    },

    // 显示预约类型帮助说明
    showBookingTypeHelp(type) {
      console.log('[VenueDetail] 显示预约类型帮助:', type)
      
      if (type === 'EXCLUSIVE') {
        this.helpContent = {
          title: '包场预约',
          description: '包场预约是指您独享整个场地，不与其他用户共享。适合团队训练、比赛或私人活动。价格相对较高，但享有完全的场地使用权。'
        }
      } else if (type === 'SHARED') {
        this.helpContent = {
          title: '拼场预约',
          description: '拼场预约是指与其他用户共享场地，适合个人或小组活动。价格相对优惠，但需要与其他用户协调使用场地。系统会自动匹配合适的拼场伙伴。'
        }
      }
      
      this.showHelpModal = true
    },

    // 关闭帮助说明弹窗
    closeHelpModal() {
      this.showHelpModal = false
      this.helpContent = {
        title: '',
        description: ''
      }
    },

    // 处理时间段状态更新事件
    async onTimeSlotStatusUpdated(eventData) {
      console.log('[VenueDetail] 收到时间段状态更新事件:', eventData)

      // 检查是否是当前场馆和日期
      if (eventData &&
          eventData.venueId === this.venueId &&
          eventData.date === this.selectedDate) {

        console.log('[VenueDetail] 时间段状态更新事件匹配当前页面，刷新数据')

        // 刷新时间段数据
        setTimeout(async () => {
          try {
            await this.loadTimeSlots(true)
            console.log('[VenueDetail] 时间段状态更新后刷新完成')
          } catch (error) {
            console.error('[VenueDetail] 时间段状态更新后刷新失败:', error)
          }
        }, 500)
      }
    },

    // 🎯 处理时间段更新事件（预约取消后）
    async onTimeSlotUpdated(eventData) {
      console.log('[VenueDetail] 🚨🚨🚨 收到时间段更新事件（预约取消后）🚨🚨🚨')
      console.log('[VenueDetail] 事件数据:', eventData)

      // 检查是否是当前场馆和日期
      if (eventData &&
          eventData.venueId == this.venueId &&
          eventData.date === this.selectedDate) {

        console.log('[VenueDetail] 🎯 时间段更新事件匹配当前页面，清除缓存并立即刷新数据')

        try {
          // 🔥 修复：对于booking-cancelled事件，立即清除缓存
          if (eventData.action === 'booking-cancelled' || eventData.immediate) {
            console.log('[VenueDetail] 🗑️ 检测到立即更新事件，立即清除缓存')

            // 清除 venue store 缓存
            if (this.venueStore && this.venueStore.cache && this.venueStore.cache.timeSlots) {
              const cacheKey = `${this.venueId}_${this.selectedDate}`
              this.venueStore.cache.timeSlots.delete(cacheKey)
              console.log('[VenueDetail] ✅ 已清除 venue store 缓存:', cacheKey)
            }

            // 清除缓存管理器缓存
            try {
              const { default: cacheManager } = await import('@/utils/cache-manager.js')
              if (cacheManager) {
                cacheManager.clearTimeSlotCache(this.venueId, this.selectedDate)
                console.log('[VenueDetail] ✅ 已清除缓存管理器缓存')
              }
            } catch (importError) {
              console.warn('[VenueDetail] 导入缓存管理器失败:', importError)
            }
          }

          // 立即刷新时间段数据，不延迟
          console.log('[VenueDetail] 🔄 立即从后端重新获取时间段数据')
          await this.loadTimeSlots(true)
          console.log('[VenueDetail] 🎉 时间段立即刷新完成')

          // 显示提示
          uni.showToast({
            title: '时间段状态已更新',
            icon: 'success',
            duration: 2000
          })

        } catch (error) {
          console.error('[VenueDetail] ❌ 时间段立即刷新失败:', error)
        }
      } else {
        console.log('[VenueDetail] 🔍 时间段更新事件不匹配当前页面，忽略')
        console.log('[VenueDetail] 当前页面:', { venueId: this.venueId, date: this.selectedDate })
        console.log('[VenueDetail] 事件数据:', { venueId: eventData?.venueId, date: eventData?.date })
      }
    },

    // 🎯 处理强制刷新时间段事件
    async onForceRefreshTimeslots(eventData) {
      console.log('[VenueDetail] 🚨🚨🚨 收到强制刷新时间段事件 🚨🚨🚨')
      console.log('[VenueDetail] 强制刷新事件数据:', eventData)

      // 检查是否是当前场馆和日期
      if (eventData &&
          eventData.venueId == this.venueId &&
          eventData.date === this.selectedDate) {

        console.log('[VenueDetail] 🎯 强制刷新事件匹配当前页面，执行强制清除缓存并刷新')

        try {
          // 🗑️ 强制清除所有缓存
          console.log('[VenueDetail] 🗑️ 强制清除所有缓存')

          // 清除 venue store 缓存
          if (this.venueStore && this.venueStore.cache && this.venueStore.cache.timeSlots) {
            const cacheKey = `${this.venueId}_${this.selectedDate}`
            this.venueStore.cache.timeSlots.delete(cacheKey)
            this.venueStore.cache.timeSlots.clear() // 清除所有时间段缓存
            console.log('[VenueDetail] ✅ 已清除 venue store 缓存')
          }

          // 清除缓存管理器缓存
          try {
            const { default: cacheManager } = await import('@/utils/cache-manager.js')
            if (cacheManager) {
              cacheManager.clearTimeSlotCache(this.venueId, this.selectedDate)

              // 清除API层缓存
              const timeSlotKey = cacheManager.generateTimeSlotKey ? cacheManager.generateTimeSlotKey(this.venueId, this.selectedDate) : `timeslots_${this.venueId}_${this.selectedDate}`
              cacheManager.delete(timeSlotKey)

              // 清除所有相关缓存
              cacheManager.clear()
              console.log('[VenueDetail] ✅ 已清除缓存管理器缓存')
            }
          } catch (importError) {
            console.warn('[VenueDetail] 导入缓存管理器失败:', importError)
          }

          // 清除本地存储缓存
          try {
            const storageKeys = [
              `gym_booking_timeslots_${this.venueId}_${this.selectedDate}`,
              `timeslots_${this.venueId}_${this.selectedDate}`,
              `venue_${this.venueId}_${this.selectedDate}`,
              `cache_timeslots_${this.venueId}_${this.selectedDate}`
            ]

            storageKeys.forEach(key => {
              try {
                uni.removeStorageSync(key)
              } catch (e) {
                // 忽略删除失败
              }
            })
            console.log('[VenueDetail] ✅ 已清除本地存储缓存')
          } catch (storageError) {
            console.warn('[VenueDetail] 清除本地存储缓存失败:', storageError)
          }

          // 清空选中的时间段
          this.selectedTimeSlots = []

          // 强制刷新时间段数据（绕过所有缓存）
          console.log('[VenueDetail] 🔄 强制从后端重新获取时间段数据')
          await this.loadTimeSlots(true)

          console.log('[VenueDetail] 🎉 强制清除缓存并刷新完成')

          // 显示提示
          uni.showToast({
            title: '时间段已强制刷新',
            icon: 'success',
            duration: 2000
          })

        } catch (error) {
          console.error('[VenueDetail] ❌ 强制清除缓存并刷新失败:', error)

          // 显示错误提示
          uni.showToast({
            title: '刷新失败，请重试',
            icon: 'error',
            duration: 2000
          })
        }
      } else {
        console.log('[VenueDetail] 🔍 强制刷新事件不匹配当前页面，忽略')
        console.log('[VenueDetail] 当前:', { venueId: this.venueId, date: this.selectedDate })
        console.log('[VenueDetail] 事件:', { venueId: eventData?.venueId, date: eventData?.date })
      }
    }

  },
  
  // 监听器
  watch: {
    // 监听venueStore的isLoading状态变化
    'venueStore.isLoading'(newVal) {
      if (newVal !== undefined) {
        this.loading = newVal;
      }
    },
    
    // 监听bookingStore的isLoading状态变化
    'bookingStore.isLoading'(newVal) {
      if (newVal !== undefined) {
        this.loading = this.loading || newVal;
      }
    }
  },
  
  // 页面销毁时清理资源
  onUnload() {
    console.log('[VenueDetail] 📱 页面即将销毁，开始清理资源')
    
    try {
      // 移除全局事件监听
      this.removeGlobalEventListeners()
      
      // 清理定时器
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
      }
      
      console.log('[VenueDetail] ✅ 页面资源清理完成')
      
    } catch (error) {
      console.error('[VenueDetail] 页面资源清理失败:', error)
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

// 图片轮播
.image-section {
  position: relative;
  height: 500rpx;
  
  .venue-swiper {
    height: 100%;
    
    .venue-image {
      width: 100%;
      height: 100%;
    }
  }
  
  .back-btn {
    position: absolute;
    top: 60rpx;
    left: 30rpx;
    width: 60rpx;
    height: 60rpx;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 32rpx;
    z-index: 10;
  }
}

// 基本信息
.info-section {
  background-color: #ffffff;
  padding: 30rpx;
  margin-bottom: 20rpx;
  
  .venue-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20rpx;
    
    .venue-name {
      flex: 1;
      font-size: 36rpx;
      font-weight: 600;
      color: #333333;
      margin-right: 20rpx;
    }
    
    .venue-rating {
      display: flex;
      align-items: center;
      
      .rating-score {
        font-size: 28rpx;
        color: #ff6b35;
        margin-right: 8rpx;
      }
      
      .rating-star {
        font-size: 24rpx;
        margin-right: 8rpx;
      }
      
      .rating-count {
        font-size: 24rpx;
        color: #999999;
      }
    }
  }
  
  .venue-location {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;
    
    .location-icon {
      font-size: 24rpx;
      margin-right: 8rpx;
    }
    
    .location-text {
      flex: 1;
      font-size: 28rpx;
      color: #666666;
    }
    
    .distance-text {
      font-size: 24rpx;
      color: #999999;
    }
  }
  
  .venue-price {
    display: flex;
    align-items: baseline;
    margin-bottom: 20rpx;
    
    .price-label {
      font-size: 28rpx;
      color: #333333;
    }
    
    .price-value {
      font-size: 36rpx;
      font-weight: 600;
      color: #ff6b35;
      margin: 0 8rpx;
    }
    
    .price-unit {
      font-size: 24rpx;
      color: #999999;
    }
  }
  
  .venue-tags {
    display: flex;
    flex-wrap: wrap;
    
    .venue-tag {
      font-size: 22rpx;
      color: #666666;
      background-color: #f0f0f0;
      padding: 8rpx 16rpx;
      border-radius: 16rpx;
      margin-right: 16rpx;
      margin-bottom: 12rpx;
    }
  }
}

// 通用区块样式
.description-section,
.facilities-section,
.hours-section {
  background-color: #ffffff;
  padding: 30rpx;
  margin-bottom: 20rpx;
  
  .section-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
    margin-bottom: 20rpx;
  }
}

// 描述
.description-text {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
}

// 设施
.facilities-grid {
  display: flex;
  flex-wrap: wrap;
  
  .facility-item {
    width: 25%;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 30rpx;
    
    .facility-icon {
      font-size: 40rpx;
      margin-bottom: 12rpx;
    }
    
    .facility-name {
      font-size: 24rpx;
      color: #666666;
      text-align: center;
    }
  }
}

// 营业时间
.hours-info {
  .hours-text {
    font-size: 28rpx;
    color: #666666;
  }
}

// 时间段选择
.timeslot-section {
  background-color: #ffffff;
  padding: 30rpx;
  margin-bottom: 20rpx;
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
    
    .section-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
    }
    
    .refresh-btn {
      display: flex;
      align-items: center;
      padding: 12rpx 20rpx;
      background-color: #f8f8f8;
      border: 1rpx solid #e0e0e0;
      border-radius: 20rpx;
      font-size: 24rpx;
      color: #666666;
      
      &:active {
        background-color: #e8e8e8;
      }
      
      .refresh-icon {
        margin-right: 8rpx;
        font-size: 28rpx;
      }
      
      .refresh-text {
        font-size: 24rpx;
      }
    }
  }
  
  // 日期选择
  .date-selector {
    margin-bottom: 30rpx;
    
    .date-scroll {
      white-space: nowrap;
      
      .date-item {
        display: inline-block;
        text-align: center;
        padding: 20rpx 30rpx;
        margin-right: 20rpx;
        background-color: #f5f5f5;
        border-radius: 12rpx;
        min-width: 120rpx;
        
        &.active {
          background-color: #ff6b35;
          color: #ffffff;
        }
        
        .date-day {
          display: block;
          font-size: 24rpx;
          margin-bottom: 8rpx;
        }
        
        .date-date {
          display: block;
          font-size: 28rpx;
          font-weight: 600;
        }
      }
    }
  }
  
  // 时间段列表
  .timeslot-list {
    .timeslot-item {
      display: flex;
      align-items: center;
      padding: 24rpx;
      margin-bottom: 16rpx;
      background-color: #f8f8f8;
      border-radius: 12rpx;
      border: 2rpx solid transparent;
      position: relative; // 为禁用遮罩层提供定位基准
      
      &.selected {
        background-color: #fff7f0;
        border-color: #ff6b35;
      }
      
      &.occupied {
        background-color: #f5f5f5;
        opacity: 0.6;
        cursor: not-allowed;
        
        .slot-status {
          color: #999999;
          font-weight: 500;
        }
        
        .slot-time {
          color: #999999;
        }
        
        .slot-price {
          color: #cccccc;
        }
      }
      
      &.maintenance {
        background-color: #fff7e6;
        opacity: 0.8;
        cursor: not-allowed;
        
        .slot-status {
          color: #ff9500;
          font-weight: 500;
        }
      }
      
      &.expired {
        background-color: #f0f0f0;
        opacity: 0.5;
        cursor: not-allowed;
        
        .slot-status {
          color: #999999;
          font-weight: 500;
        }
        
        .slot-time {
          color: #cccccc;
          text-decoration: line-through;
        }
        
        .slot-price {
          color: #cccccc;
          text-decoration: line-through;
        }
      }
      
      &.disabled {
        pointer-events: none; // 禁用点击事件
        
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
      
      .slot-time {
        flex: 1;
        font-size: 28rpx;
        color: #333333;
        font-weight: 500;
      }
      
      .slot-price {
        margin-right: 30rpx;
        font-size: 28rpx;
        color: #ff6b35;
        font-weight: 600;
      }
      
      .slot-status {
        font-size: 24rpx;
        color: #666666;
      }
    }
  }
  
  // 预约类型选择
  .booking-type-section {
    margin-bottom: 32rpx;
    
    .booking-type-options {
      margin-top: 24rpx;
    }
    
    .radio-item {
      display: block;
      margin-bottom: 24rpx;
      
      .radio-wrapper {
        display: flex;
        align-items: flex-start;
        padding: 24rpx;
        background-color: #f8f8f8;
        border-radius: 12rpx;
        border: 2rpx solid transparent;
        transition: all 0.3s ease;
        
        &:active {
          background-color: #f0f0f0;
        }
      }
      
      .radio-circle {
        width: 40rpx;
        height: 40rpx;
        border: 2rpx solid #ddd;
        border-radius: 50%;
        margin-right: 24rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 4rpx;
        
        &.active {
          border-color: #ff6b35;
          background-color: #ff6b35;
        }
        
        .radio-dot {
          width: 16rpx;
          height: 16rpx;
          background-color: white;
          border-radius: 50%;
        }
      }
      
      .radio-content {
        flex: 1;
        
        .radio-title {
          display: block;
          font-size: 32rpx;
          font-weight: 600;
          color: #333;
          margin-bottom: 8rpx;
        }
        
        .radio-desc {
          display: block;
          font-size: 26rpx;
          color: #666;
          line-height: 1.4;
        }
      }
    }
    
    // 拼场表单
    .shared-form {
      margin-top: 32rpx;
      padding: 32rpx;
      background-color: #f8f9fa;
      border-radius: 16rpx;
      
      .form-item {
        margin-bottom: 32rpx;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        .item-label {
          display: block;
          font-size: 28rpx;
          color: #333;
          margin-bottom: 16rpx;
          font-weight: 500;
        }
        
        .form-input {
          width: 100%;
          padding: 24rpx;
          background-color: white;
          border: 2rpx solid #e0e0e0;
          border-radius: 12rpx;
          font-size: 28rpx;
          color: #333;
          
          &:focus {
            border-color: #ff6b35;
          }
        }
        
        .picker-text {
          padding: 24rpx;
          background-color: white;
          border: 2rpx solid #e0e0e0;
          border-radius: 12rpx;
          font-size: 28rpx;
          color: #333;
          display: flex;
          align-items: center;
          justify-content: space-between;

          &::after {
            content: '›';
            color: #999;
            font-size: 24rpx;
          }
        }
      }
      
      // 拼场说明
      .sharing-notice {
        background-color: #fff3e0;
        border: 2rpx solid #ffcc80;
        border-radius: 12rpx;
        padding: 24rpx;
        margin-bottom: 24rpx;
        
        .notice-title {
          display: block;
          font-size: 28rpx;
          font-weight: 600;
          color: #e65100;
          margin-bottom: 16rpx;
        }
        
        .notice-text {
          display: block;
          font-size: 26rpx;
          color: #bf360c;
          line-height: 1.5;
          margin-bottom: 8rpx;
          
          &:last-child {
            margin-bottom: 0;
          }
        }
      }
      
      // 时间限制提示
      .time-notice {
        background-color: #e3f2fd;
        border: 2rpx solid #90caf9;
        border-radius: 12rpx;
        padding: 20rpx 24rpx;
        
        .notice-text {
          font-size: 26rpx;
          color: #1565c0;
          line-height: 1.4;
        }
      }
    }
  }
}

// 底部操作栏
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  border-top: 1rpx solid #f0f0f0;
  z-index: 100;
  
  // 选中时间段信息
  .selected-info {
    padding: 20rpx 30rpx 10rpx;
    border-bottom: 1rpx solid #f5f5f5;
    
    .selected-time {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .time-text {
        font-size: 26rpx;
        color: #666666;
      }
      
      .price-text {
        font-size: 28rpx;
        color: #ff6b35;
        font-weight: 600;
      }
    }
  }
  
  // 操作按钮区域
  .action-buttons {
    display: flex;
    padding: 20rpx 30rpx;
    align-items: center;
    
    .contact-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16rpx 20rpx;
      margin-right: 20rpx;
      border-radius: 8rpx;
      background-color: #f8f8f8;
      
      .contact-icon {
        font-size: 28rpx;
        margin-bottom: 6rpx;
      }
      
      .contact-text {
        font-size: 20rpx;
        color: #666666;
      }
    }
    
    .book-btn {
      flex: 1;
      height: 88rpx;
      background-color: #cccccc;
      color: #999999;
      border: none;
      border-radius: 12rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      
      .book-btn-icon {
        font-size: 32rpx;
        margin-right: 12rpx;
      }
      
      .book-btn-text {
        font-size: 32rpx;
        font-weight: 600;
      }
      
      &.book-btn-active {
        background-color: #ff6b35;
        color: #ffffff;
        box-shadow: 0 4rpx 12rpx rgba(255, 107, 53, 0.3);
        
        &:active {
          transform: scale(0.98);
        }
      }
      
      &:disabled {
        background-color: #cccccc;
        color: #999999;
        box-shadow: none;
        transform: none;
      }
    }
  }
}

// 预约弹窗
.booking-modal {
  width: 600rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  
  .modal-header {
    padding: 30rpx;
    text-align: center;
    border-bottom: 1rpx solid #f0f0f0;
    
    .modal-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
    }
  }
  
  .booking-info {
    padding: 30rpx;
    
    .info-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20rpx;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .info-label {
        font-size: 28rpx;
        color: #666666;
      }
      
      .info-value {
        font-size: 28rpx;
        color: #333333;
        
        &.price {
          color: #ff6b35;
          font-weight: 600;
        }
      }
    }
  }
  
  .modal-actions {
    display: flex;
    border-top: 1rpx solid #f0f0f0;
    
    .cancel-btn,
    .confirm-btn {
      flex: 1;
      height: 100rpx;
      border: none;
      font-size: 28rpx;
    }
    
    .cancel-btn {
      background-color: #f5f5f5;
      color: #666666;
    }
    
    .confirm-btn {
      background-color: #ff6b35;
      color: #ffffff;
    }
  }
}

/* 加载状态样式 */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400rpx;
  font-size: 32rpx;
  color: #666666;
}

/* 无时间段提示样式 */
.no-timeslots {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 80rpx 40rpx;

  .no-timeslots-text {
    font-size: 32rpx;
    color: #666666;
    margin-bottom: 20rpx;
  }

  .no-timeslots-tip {
    font-size: 28rpx;
    color: #999999;
  }
}

/* 错误状态样式 */
.error-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 400rpx;
  
  .retry-btn {
    margin-top: 20rpx;
    padding: 16rpx 32rpx;
    background-color: #ff6b35;
    color: #ffffff;
    border: none;
    border-radius: 8rpx;
    font-size: 28rpx;
  }
}

/* 预约类型按钮样式 */
.booking-type-buttons {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
  justify-content: center;
  
  .booking-type-btn-wrapper {
    position: relative;
    flex: 0 0 auto;
    max-width: 200rpx;
    
    .booking-type-btn {
      width: 160rpx;
      height: 80rpx;
      background-color: #f8f8f8;
      border: 2rpx solid #e0e0e0;
      border-radius: 12rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      
      .btn-text {
        font-size: 28rpx;
        color: #666666;
        font-weight: 500;
      }
      
      &.active {
        background-color: #ff6b35;
        border-color: #ff6b35;
        
        .btn-text {
          color: #ffffff;
          font-weight: 600;
        }
      }
      
      &:active {
        transform: scale(0.98);
      }
    }
    
    .help-icon {
      position: absolute;
      top: -8rpx;
      right: -8rpx;
      width: 32rpx;
      height: 32rpx;
      background-color: #ff6b35;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2rpx 8rpx rgba(255, 107, 53, 0.3);
      
      .help-text {
        font-size: 20rpx;
        color: #ffffff;
        font-weight: 600;
      }
      
      &:active {
        transform: scale(0.9);
      }
    }
  }
}

/* 帮助说明弹窗样式 */
.help-modal-overlay {
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
  
  .help-modal {
    width: 600rpx;
    background-color: #ffffff;
    border-radius: 16rpx;
    overflow: hidden;
    margin: 0 40rpx;
    
    .help-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 30rpx;
      border-bottom: 1rpx solid #f0f0f0;
      
      .help-title {
        font-size: 32rpx;
        font-weight: 600;
        color: #333333;
      }
      
      .help-close {
        width: 48rpx;
        height: 48rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background-color: #f5f5f5;
        
        .close-icon {
          font-size: 32rpx;
          color: #666666;
          line-height: 1;
        }
        
        &:active {
          background-color: #e0e0e0;
        }
      }
    }
    
    .help-body {
      padding: 30rpx;
      
      .help-description {
        font-size: 28rpx;
        color: #666666;
        line-height: 1.6;
      }
    }
    
    .help-footer {
      padding: 20rpx 30rpx 30rpx;
      
      .help-confirm-btn {
        width: 100%;
        height: 80rpx;
        background-color: #ff6b35;
        border: none;
        border-radius: 12rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        
        .confirm-text {
          font-size: 28rpx;
          color: #ffffff;
          font-weight: 600;
        }
        
        &:active {
          background-color: #e55a2b;
          transform: scale(0.98);
        }
      }
    }
  }
}
</style>
