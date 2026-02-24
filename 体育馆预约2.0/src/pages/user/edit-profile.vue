<template>
  <view class="container">
    <!-- 头像编辑 -->
    <view class="avatar-section">
      <view class="avatar-wrapper" @click="changeAvatar">
        <image 
          :src="formData.avatar || '/static/images/default-avatar.svg'" 
          class="avatar"
          mode="aspectFill"
        />
        <view class="avatar-edit">
          <text class="edit-icon">📷</text>
        </view>
      </view>
      <text class="avatar-tip">点击更换头像</text>
    </view>
    
    <!-- 个人信息表单 -->
    <view class="form-section">
      <!-- 用户名 -->
      <view class="form-item">
        <text class="item-label">用户名</text>
        <input 
          v-model="formData.username" 
          class="item-input" 
          placeholder="请输入用户名"
          maxlength="20"
        />
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
      
      <!-- 手机号 -->
      <view class="form-item">
        <text class="item-label">手机号</text>
        <view class="phone-wrapper">
          <text class="phone-text">{{ formatPhone(userInfo?.phone || '') }}</text>
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
      
      <!-- 修改密码 -->
      <view class="form-item">
        <text class="item-label">修改密码</text>
        <button class="change-password-btn" @click="showPasswordDialog">修改密码</button>
      </view>
      
      <!-- 个人简介 -->
      <view class="form-item">
        <text class="item-label">个人简介</text>
        <textarea 
          v-model="formData.bio" 
          class="item-textarea" 
          placeholder="请输入个人简介"
          maxlength="200"
        />
      </view>
      
      <!-- 运动偏好 -->
      <view class="form-item">
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
      
      <!-- 所在城市 -->
      <view class="form-item">
        <text class="item-label">所在城市</text>
        <picker 
          mode="region" 
          :value="regionValue"
          @change="onRegionChange"
        >
          <view class="picker-text">
            {{ formData.city || '请选择城市' }}
          </view>
        </picker>
      </view>
    </view>
    
    <!-- 隐私设置 -->
    <view class="privacy-section">
      <text class="section-title">隐私设置</text>
      
      <view class="privacy-item">
        <text class="privacy-label">允许他人查看我的预约记录</text>
        <switch 
          :checked="formData.showBookingHistory"
          @change="onPrivacyChange('showBookingHistory', $event)"
        />
      </view>
      
      <view class="privacy-item">
        <text class="privacy-label">允许他人邀请我参与拼场</text>
        <switch 
          :checked="formData.allowSharingInvite"
          @change="onPrivacyChange('allowSharingInvite', $event)"
        />
      </view>
      
      <view class="privacy-item">
        <text class="privacy-label">接收系统通知</text>
        <switch 
          :checked="formData.receiveNotifications"
          @change="onPrivacyChange('receiveNotifications', $event)"
        />
      </view>
    </view>
    
    <!-- 底部操作 -->
    <view class="bottom-actions">
      <button class="cancel-btn" @click="goBack">取消</button>
      <button class="save-btn" @click="saveProfile">保存</button>
    </view>
    

    <!-- 修改密码弹窗 -->
    <uni-popup 
      ref="passwordPopup" 
      type="center" 
      :mask-click="false"
      v-show="internalPasswordPopupOpened"
      :class="passwordPopupPosition"
    >
      <view class="password-dialog">
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
    </uni-popup>
  </view>
</template>

<script>
import { useUserStore } from '@/stores/user.js'


export default {
  name: 'EditProfile',
  
  components: {

  },

  data() {
    return {
      userStore: null,
      formData: {
        avatar: '',
        username: '',
        nickname: '',
        gender: '',
        birthday: '',
        email: '',
        bio: '',
        sportsPreferences: [],
        city: '',
        showBookingHistory: true,
        allowSharingInvite: true,
        receiveNotifications: true
      },
      
      genderOptions: ['男', '女', '保密'],
      sportsOptions: ['篮球', '足球', '羽毛球', '乒乓球', '网球', '游泳', '健身', '瑜伽'],
      regionValue: [],
      
      // 密码修改表单
      passwordForm: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      
      // 弹窗状态控制变量
      internalPasswordPopupOpened: false,
      passwordPopupPosition: '',
      _passwordPopupRef: null,
      
      // 缓存相关
      lastInitTime: 0,
      cacheTimeout: 60 * 1000, // 60秒缓存
      isInitializing: false
    }
  },
  
  computed: {
    userInfo() {
      return this.userStore?.userInfoGetter || {}
    },
    
    genderIndex() {
      return this.genderOptions.indexOf(this.formData.gender)
    }
  },
  
  onLoad() {
    // 初始化Pinia store
    this.userStore = useUserStore()
    
    // 初始化弹窗状态
    this.internalPasswordPopupOpened = false
    
    // 缓存弹窗实例
    this.$nextTick(() => {
      try {
        this._passwordPopupRef = this.$refs.passwordPopup
        if (!this._passwordPopupRef) {
          // 延迟重试
          setTimeout(() => {
            this._passwordPopupRef = this.$refs.passwordPopup
          }, 100)
        }
      } catch (e) {
      }
    })

    this.initFormData()
  },
  
  onShow() {
    // 页面显示时使用缓存优化的数据初始化
    this.initFormDataWithCache()
  },
  
  onUnload() {
    // 清理弹窗缓存引用
    this._passwordPopupRef = null
  },

  methods: {
    
    // 🚀 缓存优化的表单数据初始化
    async initFormDataWithCache() {
      // 检查缓存有效性
      const now = Date.now()
      if (this.lastInitTime && (now - this.lastInitTime) < this.cacheTimeout && this.formData.username) {
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
          username: this.userInfo.username || '',
          nickname: this.userInfo.nickname || this.userInfo.username || '未设置昵称',
          gender: this.userInfo.gender || '',
          birthday: this.userInfo.birthday || '',
          email: this.userInfo.email || '',
          bio: this.userInfo.bio || '',
          sportsPreferences: this.userInfo.sportsPreferences || [],
          city: this.userInfo.city || '',
          showBookingHistory: this.userInfo.showBookingHistory !== false,
          allowSharingInvite: this.userInfo.allowSharingInvite !== false,
          receiveNotifications: this.userInfo.receiveNotifications !== false
        }
        
        // 设置城市选择器的值
        if (this.userInfo.city) {
          // 这里需要根据实际的城市数据结构来设置
          this.regionValue = this.userInfo.city.split(' ')
        }
      } else {
        // 即使用户信息为空，也要初始化表单数据
        this.formData = {
          avatar: '',
          username: '用户' + Date.now().toString().slice(-6), // 生成默认用户名
          nickname: '未设置昵称',
          gender: '',
          birthday: '',
          email: '',
          bio: '',
          sportsPreferences: [],
          city: '',
          showBookingHistory: true,
          allowSharingInvite: true,
          receiveNotifications: true
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
        this.formData.avatar = result.url
        
        uni.hideLoading()
        uni.showToast({
          title: '头像更新成功',
          icon: 'success'
        })
        
      } catch (error) {
        uni.hideLoading()
        console.error('上传头像失败:', error)
        uni.showToast({
          title: '上传失败',
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
    
    // 地区变化
    onRegionChange(e) {
      this.regionValue = e.detail.value
      this.formData.city = e.detail.value.join(' ')
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
    
    // 隐私设置变化
    onPrivacyChange(key, e) {
      this.formData[key] = e.detail.value
    },
    

    
    // 保存个人资料
    async saveProfile() {
      // 验证表单
      if (!this.validateForm()) return
      
      let loadingShown = false
      
      try {
        uni.showLoading({ title: '保存中...' })
        loadingShown = true
        
        
        // 过滤和清理数据，只发送必要的字段
        const cleanData = {
          username: this.formData.username?.trim() || '',
          nickname: this.formData.nickname?.trim() || '',
          gender: this.formData.gender || '',
          birthday: this.formData.birthday || '',
          email: this.formData.email?.trim() || '',
          bio: this.formData.bio?.trim() || '',
          city: this.formData.city?.trim() || '',
          sportsPreferences: this.formData.sportsPreferences || [],
          showBookingHistory: Boolean(this.formData.showBookingHistory),
          allowSharingInvite: Boolean(this.formData.allowSharingInvite),
          receiveNotifications: Boolean(this.formData.receiveNotifications)
        }
        
        // 移除空字符串字段
        Object.keys(cleanData).forEach(key => {
          if (cleanData[key] === '' && key !== 'bio') {
            delete cleanData[key]
          }
        })
        
        
        await this.userStore.updateUserInfo(cleanData)
        
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
        console.error('保存失败:', error)
        uni.showToast({
          title: error.message || '保存失败',
          icon: 'error'
        })
      }
    },
    
    // 验证表单
    validateForm() {
      if (!this.formData.username.trim()) {
        uni.showToast({
          title: '请输入用户名',
          icon: 'error'
        })
        return false
      }
      
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
      this.showPasswordPopup()
    },
    
    // 关闭密码修改弹窗
    closePasswordDialog() {
      this.closePasswordPopup()
    },
    
    // 显示密码修改弹窗（兼容微信小程序）
    showPasswordPopup() {
      const debugEnabled = false // 调试开关
      
      try {
        // 获取环境信息
        let windowInfo, deviceInfo, appBaseInfo
        try {
          windowInfo = uni.getWindowInfo()
          deviceInfo = uni.getDeviceInfo()
          appBaseInfo = uni.getAppBaseInfo()
        } catch (e) {
        }
        
        const platform = deviceInfo?.platform || appBaseInfo?.platform || 'unknown'
        const uniPlatform = appBaseInfo?.uniPlatform || 'unknown'
        
        if (debugEnabled) {
        }
        
        // 方法1: 优先使用 $refs
        if (this.$refs.passwordPopup) {
          if (Array.isArray(this.$refs.passwordPopup)) {
            const popup = this.$refs.passwordPopup[0]
            if (popup && typeof popup.open === 'function') {
              popup.open()
              this.internalPasswordPopupOpened = true
              return
            }
          } else if (typeof this.$refs.passwordPopup.open === 'function') {
            this.$refs.passwordPopup.open()
            this.internalPasswordPopupOpened = true
            return
          }
        }
        
        // 方法2: 使用缓存的引用
        if (this._passwordPopupRef && typeof this._passwordPopupRef.open === 'function') {
          this._passwordPopupRef.open()
          this.internalPasswordPopupOpened = true
          return
        }
        
        // 方法3: 微信小程序环境下使用 $scope.selectComponent
        if ((platform === 'devtools' || uniPlatform === 'mp-weixin') && this.$scope && typeof this.$scope.selectComponent === 'function') {
          try {
            const popup = this.$scope.selectComponent('#passwordPopup') || this.$scope.selectComponent('.password-popup')
            if (popup && typeof popup.open === 'function') {
              popup.open()
              this.internalPasswordPopupOpened = true
              return
            }
          } catch (e) {
            if (debugEnabled) console.error('showPasswordPopup - $scope.selectComponent异常:', e)
          }
        }
        
        // 方法4: 从组件实例中查找 uni-popup 子组件
        if (this.$children && this.$children.length > 0) {
          for (let child of this.$children) {
            if (child.$options && (child.$options.name === 'UniPopup' || child.$options._componentTag === 'uni-popup')) {
              if (typeof child.open === 'function') {
                child.open()
                this.internalPasswordPopupOpened = true
                return
              }
            }
          }
        }
        
        // 重试机制：延迟100ms后重试一次
        setTimeout(() => {
          
          // 重新尝试获取弹窗实例
          if (this.$refs.passwordPopup && typeof this.$refs.passwordPopup.open === 'function') {
            this.$refs.passwordPopup.open()
            this.internalPasswordPopupOpened = true
            return
          }
          
          // 备选方案：使用DOM操作强制显示
          try {
            this.passwordPopupPosition = 'force-show'
            this.internalPasswordPopupOpened = true
            this.$forceUpdate()
          } catch (e) {
            if (debugEnabled) console.error('showPasswordPopup - 备选方案失败:', e)
          }
        }, 100)
        
      } catch (error) {
        if (debugEnabled) console.error('showPasswordPopup - 显示密码修改弹窗失败:', error)
      }
    },
    
    // 关闭密码修改弹窗（兼容微信小程序）
    closePasswordPopup() {
      const debugEnabled = false // 调试开关
      
      try {
        // 获取环境信息
        let windowInfo, deviceInfo, appBaseInfo
        try {
          windowInfo = uni.getWindowInfo()
          deviceInfo = uni.getDeviceInfo()
          appBaseInfo = uni.getAppBaseInfo()
        } catch (e) {
        }
        
        const platform = deviceInfo?.platform || appBaseInfo?.platform || 'unknown'
        const uniPlatform = appBaseInfo?.uniPlatform || 'unknown'
        
        if (debugEnabled) {
        }
        
        // 方法1: 优先使用 $refs
        if (this.$refs.passwordPopup) {
          if (Array.isArray(this.$refs.passwordPopup)) {
            const popup = this.$refs.passwordPopup[0]
            if (popup && typeof popup.close === 'function') {
              popup.close()
              this.internalPasswordPopupOpened = false
              return
            }
          } else if (typeof this.$refs.passwordPopup.close === 'function') {
            this.$refs.passwordPopup.close()
            this.internalPasswordPopupOpened = false
            return
          }
        }
        
        // 方法2: 使用缓存的引用
        if (this._passwordPopupRef && typeof this._passwordPopupRef.close === 'function') {
          this._passwordPopupRef.close()
          this.internalPasswordPopupOpened = false
          return
        }
        
        // 方法3: 微信小程序环境下使用 $scope.selectComponent
        if ((platform === 'devtools' || uniPlatform === 'mp-weixin') && this.$scope && typeof this.$scope.selectComponent === 'function') {
          try {
            const popup = this.$scope.selectComponent('#passwordPopup') || this.$scope.selectComponent('.password-popup')
            if (popup && typeof popup.close === 'function') {
              popup.close()
              this.internalPasswordPopupOpened = false
              return
            }
          } catch (e) {
            if (debugEnabled) console.error('closePasswordPopup - $scope.selectComponent异常:', e)
          }
        }
        
        // 方法4: 从组件实例中查找 uni-popup 子组件
        if (this.$children && this.$children.length > 0) {
          for (let child of this.$children) {
            if (child.$options && (child.$options.name === 'UniPopup' || child.$options._componentTag === 'uni-popup')) {
              if (typeof child.close === 'function') {
                child.close()
                this.internalPasswordPopupOpened = false
                return
              }
            }
          }
        }
        
        // 重试机制：延迟100ms后重试一次
        setTimeout(() => {
          
          // 重新尝试获取弹窗实例
          if (this.$refs.passwordPopup && typeof this.$refs.passwordPopup.close === 'function') {
            this.$refs.passwordPopup.close()
            this.internalPasswordPopupOpened = false
            return
          }
          
          // 备选方案：使用DOM操作强制隐藏
          try {
            this.passwordPopupPosition = 'force-hide'
            this.internalPasswordPopupOpened = false
            this.$forceUpdate()
          } catch (e) {
            if (debugEnabled) console.error('closePasswordPopup - 备选方案失败:', e)
          }
        }, 100)
        
      } catch (error) {
        if (debugEnabled) console.error('closePasswordPopup - 关闭密码修改弹窗失败:', error)
      }
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
        
        await this.userStore.changeUserPassword({
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
        console.error('修改密码失败:', error)
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
    
    .item-textarea {
      flex: 1;
      min-height: 120rpx;
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
      justify-content: space-between;
      
      .phone-text {
        font-size: 28rpx;
        color: #333333;
      }
      
      .change-phone-btn {
        padding: 8rpx 16rpx;
        background-color: #ff6b35;
        color: #ffffff;
        font-size: 24rpx;
        border-radius: 8rpx;
        border: none;
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
}

// 隐私设置
.privacy-section {
  background-color: #ffffff;
  margin-bottom: 20rpx;
  
  .section-title {
    display: block;
    padding: 30rpx 30rpx 20rpx;
    font-size: 28rpx;
    font-weight: 600;
    color: #333333;
    border-bottom: 1rpx solid #f0f0f0;
  }
  
  .privacy-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 30rpx;
    border-bottom: 1rpx solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .privacy-label {
      font-size: 28rpx;
      color: #333333;
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
</style>