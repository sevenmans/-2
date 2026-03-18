<template>
  <view class="container">
    <!-- 头像编辑 -->
    <view class="avatar-section">
      <view class="avatar-wrapper" @click="changeAvatar">
        <image 
          :src="avatarUrl" 
          class="avatar"
          mode="aspectFill"
        />
        <view class="avatar-edit">
          <text class="edit-icon">📷</text>
        </view>
      </view>
      <text class="avatar-tip">点击更换头像</text>
    </view>
    
    <!-- 基本信息表单 -->
    <view class="form-section">
      <view class="section-header">
        <text class="section-title">基本信息</text>
      </view>
      
      <!-- 昵称 -->
      <view class="form-item">
        <text class="item-label">昵称</text>
        <input 
          v-model="formData.nickname" 
          class="item-input" 
          placeholder="请输入昵称"
          maxlength="20"
        />
      </view>
      
      <!-- 手机号（只读） -->
      <view class="form-item">
        <text class="item-label">手机号</text>
        <view class="phone-wrapper">
          <text class="phone-text" v-if="userInfo?.phone">{{ formatPhone(userInfo.phone) }}</text>
          <text class="phone-text unbound" v-else>未绑定手机号</text>
        </view>
      </view>
      
      <!-- 邮箱 -->
      <view class="form-item">
        <text class="item-label">邮箱</text>
        <input 
          v-model="formData.email" 
          class="item-input" 
          placeholder="请输入邮箱"
          type="email"
        />
      </view>
    </view>
    
    <!-- 个人偏好（趣味字段，后端暂不存储） -->
    <view class="form-section">
      <view class="section-header">
        <text class="section-title">个人偏好</text>
        <text class="section-hint">仅本地保存</text>
      </view>
      
      <!-- 性别 -->
      <view class="form-item">
        <text class="item-label">性别</text>
        <picker 
          mode="selector" 
          :range="genderOptions" 
          :value="genderIndex"
          @change="onGenderChange"
        >
          <view class="picker-text">
            {{ formData.gender || '请选择性别' }}
          </view>
        </picker>
      </view>
      
      <!-- 生日 -->
      <view class="form-item">
        <text class="item-label">生日</text>
        <picker 
          mode="date" 
          :value="formData.birthday"
          @change="onBirthdayChange"
        >
          <view class="picker-text">
            {{ formData.birthday || '请选择生日' }}
          </view>
        </picker>
      </view>
      
      <!-- 运动偏好 -->
      <view class="form-item sports-item">
        <text class="item-label">运动偏好</text>
        <view class="sports-tags">
          <view 
            class="sport-tag"
            :class="{ active: formData.sportsPreferences.includes(sport) }"
            v-for="sport in sportsOptions"
            :key="sport"
            @click="toggleSport(sport)"
          >
            {{ sport }}
          </view>
        </view>
      </view>
    </view>
    
    <!-- 修改密码（仅账号密码登录用户显示） -->
    <view class="form-section" v-if="loginType === 'account'">
      <view class="form-item center-item">
        <button class="change-password-btn" @click="showPasswordDialog">修改密码</button>
      </view>
    </view>
    
    <!-- 底部操作 -->
    <view class="bottom-actions">
      <button class="cancel-btn" @click="goBack">取消</button>
      <button class="save-btn" @click="saveProfile">保存</button>
    </view>
    

    <!-- 修改密码弹窗（原生实现，彻底解决 uni-popup 引起的文档流穿透问题） -->
    <view class="custom-modal-mask" v-if="internalPasswordPopupOpened" @click.stop="closePasswordDialog">
      <view class="password-dialog" @click.stop="">
        <view class="dialog-header">
          <text class="dialog-title">修改密码</text>
          <text class="dialog-close" @click="closePasswordDialog">×</text>
        </view>
        
        <view class="dialog-content">
          <view class="password-item">
            <text class="password-label">当前密码</text>
            <input 
              v-model="passwordForm.oldPassword" 
              class="password-input" 
              placeholder="请输入当前密码"
              type="password"
            />
          </view>
          
          <view class="password-item">
            <text class="password-label">新密码</text>
            <input 
              v-model="passwordForm.newPassword" 
              class="password-input" 
              placeholder="请输入新密码"
              type="password"
            />
          </view>
          
          <view class="password-item">
            <text class="password-label">确认新密码</text>
            <input 
              v-model="passwordForm.confirmPassword" 
              class="password-input" 
              placeholder="请再次输入新密码"
              type="password"
            />
          </view>
        </view>
        
        <view class="dialog-actions">
          <button class="cancel-btn" @click="closePasswordDialog">取消</button>
          <button class="confirm-btn" @click="changePassword">确认</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useUserStore } from '@/stores/user.js'
import config from '@/config/index.js'


export default {
  name: 'EditProfile',
  
  components: {

  },

  data() {
    return {
      userStore: null,
      formData: {
        avatar: '',
        nickname: '',
        email: '',
        // 趣味字段（后端暂不存储，仅本地保留）
        gender: '',
        birthday: '',
        sportsPreferences: []
      },
      
      genderOptions: ['男', '女', '保密'],
      sportsOptions: ['篮球', '足球', '羽毛球', '乒乓球', '网球', '游泳', '健身', '瑜伽'],
      
      // 密码修改表单
      passwordForm: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      
      // 弹窗状态控制变量
      internalPasswordPopupOpened: false,
      
      // 缓存相关
      lastInitTime: 0,
      cacheTimeout: 60 * 1000, // 60秒缓存
      isInitializing: false
    }
  },
  
  computed: {
    avatarUrl() {
      const url = this.formData.avatar;
      if (!url) return '/static/images/default-avatar.svg';
      if (url.startsWith('http')) return url;
      if (url.startsWith('//')) return 'https:' + url;
      const host = config.baseURL.replace(/\/api\/?$/, '');
      return url.startsWith('/') ? host + url : host + '/' + url;
    },

    userInfo() {
      return this.userStore?.userInfoGetter || {}
    },
    
    genderIndex() {
      return this.genderOptions.indexOf(this.formData.gender)
    },
    
    // 登录方式：'wechat' 或 'account'
    loginType() {
      if (this.userInfo?.loginType) {
        return this.userInfo.loginType
      }
      return this.userInfo?.wechatOpenid ? 'wechat' : 'account'
    }
  },
  
  onLoad() {
    // 初始化Pinia store
    this.userStore = useUserStore()
    
    // 初始化弹窗状态
    this.internalPasswordPopupOpened = false

    this.initFormData()
  },
  
  onShow() {
    // 页面显示时使用缓存优化的数据初始化
    this.initFormDataWithCache()
  },
  
  onUnload() {
    // 无需清理组件引用

  },

  methods: {
    
    // 🚀 缓存优化的表单数据初始化
    async initFormDataWithCache() {
      // 检查缓存有效性
      const now = Date.now()
      if (this.lastInitTime && (now - this.lastInitTime) < this.cacheTimeout && this.formData.nickname) {
        return
      }

      // 防重复初始化
      if (this.isInitializing) {
        return
      }

      try {
        this.isInitializing = true
        await this.initFormData()
        this.lastInitTime = now
      } finally {
        this.isInitializing = false
      }
    },
    
    // 初始化表单数据
    async initFormData() {
      
      // 如果用户信息为空，尝试重新获取
      if (!this.userInfo || !this.userInfo.id) {
        try {
          const result = await this.userStore.getUserInfo()
        } catch (error) {
          console.error('[EditProfile] 获取用户信息失败:', error)
          uni.showToast({
            title: '获取用户信息失败',
            icon: 'error'
          })
          return
        }
      }
      
      if (this.userInfo) {
        this.formData = {
          avatar: this.userInfo.avatar || '',
          nickname: this.userInfo.nickname || this.userInfo.username || '未设置昵称',
          email: this.userInfo.email || '',
          // 趣味字段（从本地存储恢复）
          gender: this.userInfo.gender || uni.getStorageSync('user_gender_' + this.userInfo.id) || '',
          birthday: this.userInfo.birthday || uni.getStorageSync('user_birthday_' + this.userInfo.id) || '',
          sportsPreferences: this.userInfo.sportsPreferences || JSON.parse(uni.getStorageSync('user_sports_' + this.userInfo.id) || '[]')
        }
      } else {
        // 即使用户信息为空，也要初始化表单数据
        this.formData = {
          avatar: '',
          nickname: '未设置昵称',
          email: '',
          gender: '',
          birthday: '',
          sportsPreferences: []
        }
      }
    },
    
    // 格式化手机号
    formatPhone(phone) {
      if (!phone) return ''
      return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3')
    },
    
    // 更换头像
    changeAvatar() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0]
          this.uploadUserAvatar(tempFilePath)
        }
      })
    },
    
    // 上传头像
    async uploadUserAvatar(filePath) {
      try {
        uni.showLoading({ title: '上传中...' })
        
        const result = await this.userStore.uploadAvatar(filePath)
        
        // 后端返回 { success: true, avatarUrl: "/uploads/avatars/xxx.jpg" }
        if (result && result.avatarUrl) {
          this.formData.avatar = result.avatarUrl
        }
        
        uni.hideLoading()
        uni.showToast({
          title: '头像更新成功',
          icon: 'success'
        })
        
      } catch (error) {
        uni.hideLoading()
        console.error('[EditProfile] 上传头像失败:', error)
        uni.showToast({
          title: error.message || '上传失败',
          icon: 'error'
        })
      }
    },
    
    // 性别变化
    onGenderChange(e) {
      this.formData.gender = this.genderOptions[e.detail.value]
    },
    
    // 生日变化
    onBirthdayChange(e) {
      this.formData.birthday = e.detail.value
    },
    
    // 切换运动偏好
    toggleSport(sport) {
      const index = this.formData.sportsPreferences.indexOf(sport)
      if (index > -1) {
        this.formData.sportsPreferences.splice(index, 1)
      } else {
        this.formData.sportsPreferences.push(sport)
      }
    },
    
    // 保存个人资料
    async saveProfile() {
      // 验证表单
      if (!this.validateForm()) return
      
      let loadingShown = false
      
      try {
        uni.showLoading({ title: '保存中...' })
        loadingShown = true
        
        // 只发送后端支持的字段
        const cleanData = {
          nickname: this.formData.nickname?.trim() || '',
          email: this.formData.email?.trim() || ''
        }
        
        // 移除空字符串字段（email允许为空）
        if (!cleanData.nickname) {
          delete cleanData.nickname
        }
        
        await this.userStore.updateUserInfo(cleanData)
        
        // 保存趣味字段到本地存储
        if (this.userInfo?.id) {
          const userId = this.userInfo.id
          uni.setStorageSync('user_gender_' + userId, this.formData.gender || '')
          uni.setStorageSync('user_birthday_' + userId, this.formData.birthday || '')
          uni.setStorageSync('user_sports_' + userId, JSON.stringify(this.formData.sportsPreferences || []))
        }
        
        if (loadingShown) {
          uni.hideLoading()
          loadingShown = false
        }
        
        uni.showToast({
          title: '保存成功',
          icon: 'success'
        })
        
        // 返回上一页
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
        
      } catch (error) {
        if (loadingShown) {
          uni.hideLoading()
          loadingShown = false
        }
        console.error('[EditProfile] 保存失败:', error)
        uni.showToast({
          title: error.message || '保存失败',
          icon: 'error'
        })
      }
    },
    
    // 验证表单
    validateForm() {
      if (!this.formData.nickname.trim()) {
        uni.showToast({
          title: '请输入昵称',
          icon: 'error'
        })
        return false
      }
      
      if (this.formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formData.email)) {
        uni.showToast({
          title: '邮箱格式不正确',
          icon: 'error'
        })
        return false
      }
      
      return true
    },
    
    // 显示密码修改弹窗
    showPasswordDialog() {
      this.passwordForm = {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
      this.internalPasswordPopupOpened = true
    },
    
    // 关闭密码修改弹窗
    closePasswordDialog() {
      this.internalPasswordPopupOpened = false
    },
    
    // 修改密码
    async changePassword() {
      // 验证表单
      if (!this.passwordForm.oldPassword) {
        uni.showToast({
          title: '请输入当前密码',
          icon: 'error'
        })
        return
      }
      
      if (!this.passwordForm.newPassword) {
        uni.showToast({
          title: '请输入新密码',
          icon: 'error'
        })
        return
      }
      
      if (this.passwordForm.newPassword.length < 6) {
        uni.showToast({
          title: '新密码至少6位',
          icon: 'error'
        })
        return
      }
      
      if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
        uni.showToast({
          title: '两次密码输入不一致',
          icon: 'error'
        })
        return
      }
      
      try {
        uni.showLoading({ title: '修改中...' })
        
        await this.userStore.changePassword({
          oldPassword: this.passwordForm.oldPassword,
          newPassword: this.passwordForm.newPassword
        })
        
        uni.hideLoading()
        this.closePasswordDialog()
        
        uni.showToast({
          title: '密码修改成功',
          icon: 'success'
        })
        
      } catch (error) {
        uni.hideLoading()
        console.error('[EditProfile] 修改密码失败:', error)
        uni.showToast({
          title: error.message || '修改失败',
          icon: 'error'
        })
      }
    },
    
    // 返回
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

// 头像区域
.avatar-section {
  background-color: #ffffff;
  padding: 40rpx;
  text-align: center;
  margin-bottom: 20rpx;
  
  .avatar-wrapper {
    position: relative;
    display: inline-block;
    margin-bottom: 16rpx;
    
    .avatar {
      width: 160rpx;
      height: 160rpx;
      border-radius: 80rpx;
      border: 4rpx solid #f0f0f0;
    }
    
    .avatar-edit {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 48rpx;
      height: 48rpx;
      background-color: #ff6b35;
      border-radius: 24rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 4rpx solid #ffffff;
      
      .edit-icon {
        font-size: 24rpx;
        color: #ffffff;
      }
    }
  }
  
  .avatar-tip {
    font-size: 24rpx;
    color: #999999;
  }
}

// 表单区域
.form-section {
  background-color: #ffffff;
  margin-bottom: 20rpx;
  
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 30rpx 30rpx 10rpx;
    
    .section-title {
      font-size: 28rpx;
      font-weight: 600;
      color: #333333;
    }
    
    .section-hint {
      font-size: 22rpx;
      color: #999999;
      background-color: #f5f5f5;
      padding: 4rpx 12rpx;
      border-radius: 8rpx;
    }
  }
  
  .form-item {
    display: flex;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .item-label {
      width: 160rpx;
      font-size: 28rpx;
      color: #333333;
      flex-shrink: 0;
    }
    
    .item-input {
      flex: 1;
      font-size: 28rpx;
      color: #333333;
      text-align: right;
    }
    
    .picker-text {
      flex: 1;
      font-size: 28rpx;
      color: #333333;
      text-align: right;
    }
    
    .phone-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      
      .phone-text {
        font-size: 28rpx;
        color: #333333;
        
        &.unbound {
          color: #999999;
          font-style: italic;
        }
      }
    }
    
    .change-password-btn {
      flex: 1;
      padding: 16rpx 24rpx;
      background-color: #ff6b35;
      color: #ffffff;
      font-size: 28rpx;
      border-radius: 8rpx;
      border: none;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
    }
    
    // 运动标签
    .sports-tags {
      flex: 1;
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 12rpx;
      
      .sport-tag {
        padding: 8rpx 16rpx;
        background-color: #f5f5f5;
        color: #666666;
        border-radius: 20rpx;
        font-size: 24rpx;
        border: 2rpx solid transparent;
        transition: all 0.3s;
        
        &.active {
          background-color: #ff6b35;
          color: #ffffff;
          border-color: #ff6b35;
        }
      }
    }
  }

  // 修改密码按钮居中显示（无 label）
  .center-item {
    justify-content: center;
    
    .change-password-btn {
      flex: initial;
      width: 100%;
      height: 80rpx;
      line-height: 80rpx;
      padding: 0;
      background-color: #ff6b35;
      color: #ffffff;
      font-size: 28rpx;
      border-radius: 8rpx;
      border: none;
      text-align: center;
      display: block;
      margin: 0;
    }
  }
  
  // 运动偏好项特殊布局
  .sports-item {
    flex-wrap: wrap;
    
    .item-label {
      margin-bottom: 16rpx;
    }
  }
}

// 底部操作
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background-color: #ffffff;
  padding: 20rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
  
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
  
  .save-btn {
    flex: 2;
    height: 80rpx;
    background-color: #ff6b35;
    color: #ffffff;
    border: none;
    border-radius: 8rpx;
    font-size: 28rpx;
    font-weight: 600;
  }
}

// 密码修改弹窗样式
.password-dialog {
  width: 600rpx;
  background-color: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 32rpx;
    border-bottom: 1rpx solid #f0f0f0;
    
    .dialog-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
    }
    
    .dialog-close {
      font-size: 40rpx;
      color: #999999;
      width: 40rpx;
      height: 40rpx;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
  
  .dialog-content {
    padding: 32rpx;
    
    .password-item {
      margin-bottom: 32rpx;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .password-label {
        display: block;
        font-size: 28rpx;
        color: #333333;
        margin-bottom: 16rpx;
      }
      
      .password-input {
        width: 100%;
        padding: 20rpx;
        border: 1rpx solid #e0e0e0;
        border-radius: 8rpx;
        font-size: 28rpx;
        background-color: #fafafa;
        
        &:focus {
          border-color: #ff6b35;
          background-color: #ffffff;
        }
      }
    }
  }
  
  .dialog-actions {
    display: flex;
    border-top: 1rpx solid #f0f0f0;
    
    .cancel-btn,
    .confirm-btn {
      flex: 1;
      padding: 32rpx;
      font-size: 28rpx;
      border: none;
      background-color: transparent;
    }
    
    .cancel-btn {
      color: #666666;
      border-right: 1rpx solid #f0f0f0;
    }
    
    .confirm-btn {
      color: #ff6b35;
      font-weight: 600;
    }
  }
}

// 原生手搓弹窗遮罩层
.custom-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
