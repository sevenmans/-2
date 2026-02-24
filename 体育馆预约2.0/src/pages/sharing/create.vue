<template>
  <view class="container">
    <!-- 导航栏 -->
    <view class="navbar">
      <view class="nav-left" @click="goBack">
        <text class="nav-icon">‹</text>
      </view>
      <text class="nav-title">创建拼场</text>
      <view class="nav-right"></view>
    </view>
    
    <!-- 表单内容 -->
    <view class="form-container">
      <!-- 选择预约 -->
      <view class="form-section">
        <view class="section-title">选择预约</view>
        <view class="booking-selector" @click="selectBooking">
          <view v-if="selectedBooking" class="booking-info">
            <view class="booking-venue">
              <text class="venue-name">{{ selectedBooking.venueName }}</text>
              <text class="booking-status">{{ getBookingStatusText(selectedBooking.status) }}</text>
            </view>
            <view class="booking-time">
              <text class="time-text">{{ formatBookingTime(selectedBooking) }}</text>
            </view>
            <view class="booking-price">
              <text class="price-text">总费用：¥{{ selectedBooking.totalPrice || 0 }}</text>
            </view>
          </view>
          <view v-else class="booking-placeholder">
            <text class="placeholder-icon">+</text>
            <text class="placeholder-text">点击选择已确认的预约</text>
          </view>
          <text class="selector-arrow">></text>
        </view>
      </view>
      
      <!-- 队伍信息 -->
      <view class="form-section">
        <view class="section-title">队伍信息</view>
        <view class="form-card">
          <!-- 队伍名称 -->
          <view class="form-item">
            <text class="form-label">队伍名称</text>
            <input 
              v-model="formData.teamName"
              class="form-input"
              placeholder="请输入队伍名称"
              maxlength="20"
            />
          </view>
          
          <!-- 拼场模式 -->
          <view class="form-item">
            <text class="form-label">拼场模式</text>
            <view class="mode-display">
              <text class="mode-text">两支球队对战</text>
              <text class="mode-desc">固定2支球队参与</text>
            </view>
          </view>
          
          <!-- 每队费用 -->
          <view class="form-item">
            <text class="form-label">每队费用</text>
            <view class="price-input-wrapper">
              <text class="price-symbol">¥</text>
              <input 
                v-model="formData.pricePerPerson"
                class="price-input"
                type="digit"
                placeholder="0"
              />
            </view>
          </view>
          
          <!-- 活动描述 -->
          <view class="form-item description-item">
            <text class="form-label">活动描述</text>
            <textarea 
              v-model="formData.description"
              class="form-textarea"
              placeholder="请描述活动内容、要求等（选填）"
              maxlength="200"
            />
            <view class="char-count">
              <text class="count-text">{{ formData.description.length }}/200</text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 联系方式 -->
      <view class="form-section">
        <view class="section-title">联系方式</view>
        <view class="form-card">
          <!-- 联系电话 -->
          <view class="form-item">
            <text class="form-label">联系电话</text>
            <input 
              v-model="formData.contactPhone"
              class="form-input"
              type="number"
              placeholder="请输入联系电话"
              maxlength="11"
            />
          </view>
          
          <!-- 微信号 -->
          <view class="form-item">
            <text class="form-label">微信号</text>
            <input 
              v-model="formData.contactWechat"
              class="form-input"
              placeholder="请输入微信号（选填）"
              maxlength="30"
            />
          </view>
        </view>
      </view>
      
      <!-- 拼场设置 -->
      <view class="form-section">
        <view class="section-title">拼场设置</view>
        <view class="form-card">
          <!-- 自动通过申请 -->
          <view class="form-item switch-item">
            <view class="switch-info">
              <text class="switch-label">自动通过申请</text>
              <text class="switch-desc">开启后，其他用户申请加入时将自动通过</text>
            </view>
            <switch 
              :checked="formData.autoApprove"
              @change="onAutoApproveChange"
              color="#ff6b35"
            />
          </view>
          
          <!-- 允许中途退出 -->
          <view class="form-item switch-item">
            <view class="switch-info">
              <text class="switch-label">允许中途退出</text>
              <text class="switch-desc">开启后，参与者可以在活动开始前退出</text>
            </view>
            <switch 
              :checked="formData.allowExit"
              @change="onAllowExitChange"
              color="#ff6b35"
            />
          </view>
        </view>
      </view>
    </view>
    
    <!-- 底部操作栏 -->
    <view class="bottom-actions">
      <view class="price-summary">
        <text class="summary-label">预计总费用</text>
        <text class="summary-price">¥{{ getTotalPrice() }}</text>
      </view>
      <button 
        class="create-btn"
        :class="{ disabled: !canCreate }"
        @click="createSharing"
      >
        创建拼场
      </button>
    </view>
    
    <!-- 选择预约弹窗 -->
    <uni-popup ref="bookingPopup" type="bottom" :mask-click="false">
      <view class="booking-modal">
        <view class="modal-header">
          <text class="modal-title">选择预约</text>
          <text class="modal-close" @click="closeBookingModal">×</text>
        </view>
        
        <view class="booking-list">
          <view v-if="loading" class="loading-state">
            <text>加载中...</text>
          </view>
          
          <view v-else-if="confirmedBookings.length === 0" class="empty-state">
            <text class="empty-icon">📅</text>
            <text class="empty-text">暂无可用的预约</text>
            <text class="empty-desc">请先预约场馆并确认后再创建拼场</text>
          </view>
          
          <view v-else>
            <view 
              v-for="booking in confirmedBookings" 
              :key="booking.id"
              class="booking-item"
              :class="{ selected: selectedBooking?.id === booking.id }"
              @click="selectBookingItem(booking)"
            >
              <view class="booking-content">
                <view class="booking-header">
                  <text class="venue-name">{{ booking.venueName }}</text>
                  <text class="booking-status">{{ getBookingStatusText(booking.status) }}</text>
                </view>
                <view class="booking-details">
                  <text class="time-info">{{ formatBookingTime(booking) }}</text>
                  <text class="price-info">¥{{ booking.totalPrice || 0 }}</text>
                </view>
              </view>
              <view v-if="selectedBooking?.id === booking.id" class="selected-icon">✓</view>
            </view>
          </view>
        </view>
        
        <view class="modal-actions">
          <button class="modal-btn cancel-btn" @click="closeBookingModal">
            取消
          </button>
          <button 
            class="modal-btn confirm-btn"
            :class="{ disabled: !selectedBooking }"
            @click="confirmBookingSelection"
          >
            确定
          </button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { useSharingStore } from '@/stores/sharing.js'
import { useBookingStore } from '@/stores/booking.js'
import { useUserStore } from '@/stores/user.js'
import { formatDate, formatTime } from '@/utils/helpers.js'

export default {
  name: 'SharingCreate',
  
  data() {
    return {
      sharingStore: null,
      bookingStore: null,
      userStore: null,
      formData: {
        teamName: '',
        maxParticipants: 2, // 固定为2支球队
        pricePerPerson: '',
        description: '',
        contactPhone: '',
        contactWechat: '',
        autoApprove: true,
        allowExit: true
      },
      selectedBooking: null,
      confirmedBookings: [],

    }
  },
  
  computed: {
    loading() {
      return this.sharingStore?.isLoading || false
    },

    userInfo() {
      return this.userStore?.userInfoGetter || {}
    },
    
    // 是否可以创建
    canCreate() {
      return this.selectedBooking &&
             this.formData.teamName.trim() &&
             this.formData.pricePerPerson &&
             parseFloat(this.formData.pricePerPerson) > 0 &&
             this.formData.contactPhone.trim()
    }
  },
  
  onLoad() {
    // 初始化Pinia stores
    this.sharingStore = useSharingStore()
    this.bookingStore = useBookingStore()
    this.userStore = useUserStore()

    this.loadConfirmedBookings()
    this.initUserInfo()
  },

  methods: {
    
    // 初始化用户信息
    initUserInfo() {
      if (this.userInfo?.phone) {
        this.formData.contactPhone = this.userInfo.phone
      }
    },
    
    // 加载已确认的预约
    async loadConfirmedBookings() {
      try {
        const bookings = await this.bookingStore.getMyBookings({ status: 'CONFIRMED' })
        this.confirmedBookings = bookings || []
      } catch (error) {
        console.error('拼场创建页面：加载预约失败:', error)
        this.confirmedBookings = []
      }
    },
    
    // 返回上一页
    goBack() {
      uni.navigateBack()
    },
    
    // 选择预约
    selectBooking() {
      this.loadConfirmedBookings()
      this.showBookingPopup()
    },
    
    // 显示预约选择弹窗（兼容微信小程序）
    showBookingPopup() {
      const debugEnabled = false // 调试开关
      
      try {
        // 优先使用 $refs
        if (this.$refs.bookingPopup) {
          this.$refs.bookingPopup.open()
          return
        }
        
        // 微信小程序环境下的备选方案
        if (typeof uni !== 'undefined' && uni.getSystemInfoSync) {
          try {
            const systemInfo = uni.getSystemInfoSync()
            if (systemInfo.platform === 'devtools' || systemInfo.uniPlatform === 'mp-weixin') {
              if (this.$scope && typeof this.$scope.selectComponent === 'function') {
                const popup = this.$scope.selectComponent('#bookingPopup')
                if (popup && typeof popup.open === 'function') {
                  popup.open()
                  return
                }
              }
            }
          } catch (e) {
            if (debugEnabled) console.error('showBookingPopup - $scope.selectComponent异常:', e)
          }
        }
        
      } catch (error) {
        if (debugEnabled) console.error('showBookingPopup - 显示预约选择弹窗失败:', error)
      }
    },
    
    // 选择预约项
    selectBookingItem(booking) {
      this.selectedBooking = booking
    },
    
    // 确认预约选择
    confirmBookingSelection() {
      if (!this.selectedBooking) {
        uni.showToast({
          title: '请选择预约',
          icon: 'none'
        })
        return
      }
      
      this.closeBookingModal()
      
      // 根据预约信息自动计算每队费用
      if (this.selectedBooking.totalPrice) {
        const teamPrice = Math.ceil(this.selectedBooking.totalPrice / 2)
        this.formData.pricePerPerson = teamPrice.toString()
      }
    },
    
    // 关闭预约选择弹窗
    closeBookingModal() {
      this.closeBookingPopup()
    },
    
    // 关闭预约选择弹窗（兼容微信小程序）
    closeBookingPopup() {
      const debugEnabled = false // 调试开关
      
      try {
        // 优先使用 $refs
        if (this.$refs.bookingPopup) {
          this.$refs.bookingPopup.close()
          return
        }
        
        // 微信小程序环境下的备选方案
        if (typeof uni !== 'undefined' && uni.getSystemInfoSync) {
          try {
            const systemInfo = uni.getSystemInfoSync()
            if (systemInfo.platform === 'devtools' || systemInfo.uniPlatform === 'mp-weixin') {
              if (this.$scope && typeof this.$scope.selectComponent === 'function') {
                const popup = this.$scope.selectComponent('#bookingPopup')
                if (popup && typeof popup.close === 'function') {
                  popup.close()
                  return
                }
              }
            }
          } catch (e) {
            if (debugEnabled) console.error('closeBookingPopup - $scope.selectComponent异常:', e)
          }
        }
        
      } catch (error) {
        if (debugEnabled) console.error('closeBookingPopup - 关闭预约选择弹窗失败:', error)
      }
    },
    
    // 注释：移除了改变参与人数的方法，因为现在是固定的两支球队模式
    
    // 自动通过申请开关
    onAutoApproveChange(e) {
      this.formData.autoApprove = e.detail.value
    },
    
    // 允许中途退出开关
    onAllowExitChange(e) {
      this.formData.allowExit = e.detail.value
    },
    
    // 创建拼场
    async createSharing() {
      if (!this.canCreate) {
        uni.showToast({
          title: '请完善必填信息',
          icon: 'none'
        })
        return
      }
      
      try {
        uni.showLoading({ title: '创建中...' })
        
        const sharingData = {
          orderId: this.selectedBooking.id,
          venueId: this.selectedBooking.venueId,
          venueName: this.selectedBooking.venueName,
          bookingDate: this.selectedBooking.bookingDate,
          startTime: this.selectedBooking.startTime,
          endTime: this.selectedBooking.endTime,
          teamName: this.formData.teamName.trim(),
          maxParticipants: this.formData.maxParticipants,
          pricePerPerson: parseFloat(this.formData.pricePerPerson),
          description: this.formData.description.trim(),
          contactInfo: {
            phone: this.formData.contactPhone.trim(),
            wechat: this.formData.contactWechat.trim()
          },
          autoApprove: this.formData.autoApprove,
          allowExit: this.formData.allowExit
        }
        
        const result = await this.sharingStore.createSharingOrder(sharingData)
        
        uni.hideLoading()
        
        uni.showToast({
          title: '创建成功',
          icon: 'success'
        })
        
        // 跳转到支付页面
        setTimeout(() => {
          const orderId = result.orderId || result.id
          if (orderId) {
            uni.redirectTo({
              url: `/pages/payment/index?orderId=${orderId}&type=sharing&from=create`
            })
          } else {
            console.error('无法获取订单ID，跳转到拼场列表')
            uni.redirectTo({
              url: '/pages/sharing/list'
            })
          }
        }, 1500)
        
      } catch (error) {
        uni.hideLoading()
        console.error('拼场创建页面：创建拼场失败:', error)
        uni.showToast({
          title: error.message || '创建失败',
          icon: 'error'
        })
      }
    },
    
    // 获取总费用
    getTotalPrice() {
      const pricePerPerson = parseFloat(this.formData.pricePerPerson) || 0
      const maxParticipants = this.formData.maxParticipants || 0
      return pricePerPerson * maxParticipants
    },
    
    // 格式化预约时间
    formatBookingTime(booking) {
      if (!booking) return '--'
      
      const date = this.formatDate(booking.bookingDate)
      const timeSlot = this.formatTimeSlot(booking.startTime, booking.endTime)
      
      return `${date} ${timeSlot}`
    },
    
    // 格式化日期
    formatDate(date) {
      if (!date) return '--'
      return formatDate(date, 'YYYY-MM-DD')
    },
    
    // 格式化时间段
    formatTimeSlot(startTime, endTime) {
      if (!startTime && !endTime) {
        return '时间未指定'
      }
      if (startTime && !endTime) {
        return startTime
      }
      if (!startTime && endTime) {
        return endTime
      }
      return `${startTime}-${endTime}`
    },
    
    // 获取预约状态文本
    getBookingStatusText(status) {
      const statusMap = {
        'PENDING': '待确认',
        'CONFIRMED': '已确认',
        'CANCELLED': '已取消',
        'COMPLETED': '已完成',
        'EXPIRED': '已过期'
      }
      return statusMap[status] || '未知状态'
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 140rpx;
}

// 导航栏
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
  
  .nav-left {
    width: 60rpx;
    
    .nav-icon {
      font-size: 40rpx;
      color: #333333;
    }
  }
  
  .nav-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333333;
  }
  
  .nav-right {
    width: 60rpx;
  }
}

// 表单容器
.form-container {
  padding: 20rpx;
}

// 表单区块
.form-section {
  margin-bottom: 30rpx;
  
  .section-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333333;
    margin-bottom: 16rpx;
    padding: 0 10rpx;
  }
}

// 预约选择器
.booking-selector {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  
  .booking-info {
    flex: 1;
    
    .booking-venue {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12rpx;
      
      .venue-name {
        font-size: 32rpx;
        font-weight: bold;
        color: #333333;
      }
      
      .booking-status {
        font-size: 24rpx;
        color: #52c41a;
        background-color: #f6ffed;
        padding: 4rpx 12rpx;
        border-radius: 12rpx;
      }
    }
    
    .booking-time {
      margin-bottom: 8rpx;
      
      .time-text {
        font-size: 26rpx;
        color: #666666;
      }
    }
    
    .booking-price {
      .price-text {
        font-size: 28rpx;
        color: #ff6b35;
        font-weight: bold;
      }
    }
  }
  
  .booking-placeholder {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40rpx 0;
    
    .placeholder-icon {
      font-size: 48rpx;
      color: #cccccc;
      margin-bottom: 16rpx;
    }
    
    .placeholder-text {
      font-size: 28rpx;
      color: #999999;
    }
  }
  
  .selector-arrow {
    font-size: 28rpx;
    color: #cccccc;
    margin-left: 20rpx;
  }
}

// 表单卡片
.form-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx 30rpx;
}

// 表单项
.form-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
  
  .form-label {
    font-size: 28rpx;
    color: #333333;
    min-width: 140rpx;
  }
  
  .form-input {
    flex: 1;
    font-size: 28rpx;
    color: #333333;
    text-align: right;
    
    &::placeholder {
      color: #cccccc;
    }
  }
}

// 数字选择器
.number-selector {
  display: flex;
  align-items: center;
  
  .number-btn {
    width: 60rpx;
    height: 60rpx;
    border: 2rpx solid #ff6b35;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    color: #ff6b35;
    
    &.disabled {
      border-color: #cccccc;
      color: #cccccc;
    }
  }
  
  .number-value {
    margin: 0 30rpx;
    font-size: 28rpx;
    color: #333333;
  }
}

// 模式显示
.mode-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  
  .mode-text {
    font-size: 28rpx;
    color: #333333;
    font-weight: 500;
  }
  
  .mode-desc {
    font-size: 24rpx;
    color: #999999;
    margin-top: 4rpx;
  }
}

// 价格输入
.price-input-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: flex-end;
  
  .price-symbol {
    font-size: 28rpx;
    color: #333333;
    margin-right: 8rpx;
  }
  
  .price-input {
    font-size: 28rpx;
    color: #333333;
    text-align: right;
    min-width: 120rpx;
    
    &::placeholder {
      color: #cccccc;
    }
  }
}

// 描述项
.description-item {
  flex-direction: column;
  align-items: flex-start;
  
  .form-label {
    margin-bottom: 16rpx;
  }
  
  .form-textarea {
    width: 100%;
    min-height: 120rpx;
    font-size: 28rpx;
    color: #333333;
    line-height: 1.5;
    
    &::placeholder {
      color: #cccccc;
    }
  }
  
  .char-count {
    align-self: flex-end;
    margin-top: 12rpx;
    
    .count-text {
      font-size: 24rpx;
      color: #999999;
    }
  }
}

// 开关项
.switch-item {
  align-items: flex-start;
  
  .switch-info {
    flex: 1;
    margin-right: 20rpx;
    
    .switch-label {
      font-size: 28rpx;
      color: #333333;
      display: block;
      margin-bottom: 8rpx;
    }
    
    .switch-desc {
      font-size: 24rpx;
      color: #999999;
      line-height: 1.4;
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
  padding: 20rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
  display: flex;
  align-items: center;
  
  .price-summary {
    flex: 1;
    
    .summary-label {
      font-size: 24rpx;
      color: #999999;
      display: block;
      margin-bottom: 4rpx;
    }
    
    .summary-price {
      font-size: 32rpx;
      color: #ff6b35;
      font-weight: bold;
    }
  }
  
  .create-btn {
    width: 200rpx;
    height: 80rpx;
    background-color: #ff6b35;
    color: #ffffff;
    border: none;
    border-radius: 12rpx;
    font-size: 28rpx;
    font-weight: bold;
    
    &.disabled {
      background-color: #cccccc;
      color: #ffffff;
    }
  }
}

// 预约选择弹窗
.booking-modal {
  background-color: #ffffff;
  border-radius: 20rpx 20rpx 0 0;
  max-height: 80vh;
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 30rpx;
    border-bottom: 1rpx solid #f0f0f0;
    
    .modal-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333333;
    }
    
    .modal-close {
      font-size: 40rpx;
      color: #999999;
    }
  }
  
  .booking-list {
    max-height: 60vh;
    overflow-y: auto;
    
    .loading-state {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 100rpx 0;
      
      text {
        font-size: 28rpx;
        color: #999999;
      }
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 100rpx 60rpx;
      
      .empty-icon {
        font-size: 120rpx;
        margin-bottom: 30rpx;
      }
      
      .empty-text {
        font-size: 28rpx;
        color: #333333;
        margin-bottom: 12rpx;
      }
      
      .empty-desc {
        font-size: 24rpx;
        color: #999999;
        text-align: center;
        line-height: 1.4;
      }
    }
    
    .booking-item {
      display: flex;
      align-items: center;
      padding: 30rpx;
      border-bottom: 1rpx solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      &.selected {
        background-color: #fff7f0;
      }
      
      .booking-content {
        flex: 1;
        
        .booking-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12rpx;
          
          .venue-name {
            font-size: 28rpx;
            font-weight: bold;
            color: #333333;
          }
          
          .booking-status {
            font-size: 22rpx;
            color: #52c41a;
            background-color: #f6ffed;
            padding: 4rpx 8rpx;
            border-radius: 8rpx;
          }
        }
        
        .booking-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          
          .time-info {
            font-size: 24rpx;
            color: #666666;
          }
          
          .price-info {
            font-size: 26rpx;
            color: #ff6b35;
            font-weight: bold;
          }
        }
      }
      
      .selected-icon {
        font-size: 32rpx;
        color: #ff6b35;
        margin-left: 20rpx;
      }
    }
  }
  
  .modal-actions {
    display: flex;
    padding: 30rpx;
    gap: 20rpx;
    border-top: 1rpx solid #f0f0f0;
    
    .modal-btn {
      flex: 1;
      height: 80rpx;
      border: none;
      border-radius: 12rpx;
      font-size: 28rpx;
      
      &.cancel-btn {
        background-color: #f5f5f5;
        color: #666666;
      }
      
      &.confirm-btn {
        background-color: #ff6b35;
        color: #ffffff;
        
        &.disabled {
          background-color: #cccccc;
        }
      }
    }
  }
}
</style>