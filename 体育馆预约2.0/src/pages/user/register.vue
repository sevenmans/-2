<template>
  <view class="container">
    <!-- 头部 -->
    <view class="header">
      <text class="title">注册账号</text>
      <text class="subtitle">加入我们，开启运动之旅</text>
    </view>
    
    <!-- 注册表单 -->
    <view class="register-form">
      <!-- 手机号 -->
      <view class="form-item">
        <text class="item-label">手机号 <text class="required">*</text></text>
        <view class="input-wrapper">
          <text class="input-icon">📱</text>
          <input 
            v-model="formData.phone" 
            class="input-field" 
            type="number"
            placeholder="请输入手机号"
            maxlength="11"
          />
        </view>
      </view>
      
      <!-- 验证码 -->
      <view class="form-item">
        <text class="item-label">验证码 <text class="required">*</text></text>
        <view class="input-wrapper">
          <text class="input-icon">💬</text>
          <input 
            v-model="formData.smsCode" 
            class="input-field" 
            type="number"
            placeholder="请输入验证码"
            maxlength="6"
          />
          <button 
            class="sms-btn" 
            :disabled="!canSendSms || smsCountdown > 0"
            @click="sendSmsCode"
          >
            {{ smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码' }}
          </button>
        </view>
      </view>
      
      <!-- 密码 -->
      <view class="form-item">
        <text class="item-label">密码 <text class="required">*</text></text>
        <view class="input-wrapper">
          <text class="input-icon">🔒</text>
          <input 
            v-model="formData.password" 
            class="input-field" 
            :password="!showPassword"
            placeholder="请设置密码（6-20位）"
            maxlength="20"
          />
          <text 
            class="password-toggle" 
            @click="togglePassword"
          >
            {{ showPassword ? '🙈' : '👁️' }}
          </text>
        </view>
        <view class="password-tips">
          <text class="tip-item" :class="{ valid: passwordValidation.length }">• 长度6-20位</text>
          <text class="tip-item" :class="{ valid: passwordValidation.hasLetter }">• 包含字母</text>
          <text class="tip-item" :class="{ valid: passwordValidation.hasNumber }">• 包含数字</text>
        </view>
      </view>
      
      <!-- 确认密码 -->
      <view class="form-item">
        <text class="item-label">确认密码 <text class="required">*</text></text>
        <view class="input-wrapper">
          <text class="input-icon">🔒</text>
          <input 
            v-model="formData.confirmPassword" 
            class="input-field" 
            :password="!showConfirmPassword"
            placeholder="请再次输入密码"
            maxlength="20"
          />
          <text 
            class="password-toggle" 
            @click="toggleConfirmPassword"
          >
            {{ showConfirmPassword ? '🙈' : '👁️' }}
          </text>
        </view>
        <view v-if="formData.confirmPassword && !passwordMatch" class="error-tip">
          两次输入的密码不一致
        </view>
      </view>
      
      <!-- 昵称 -->
      <view class="form-item">
        <text class="item-label">昵称</text>
        <view class="input-wrapper">
          <text class="input-icon">👤</text>
          <input 
            v-model="formData.nickname" 
            class="input-field" 
            placeholder="请输入昵称（选填）"
            maxlength="20"
          />
        </view>
      </view>
      
      <!-- 邀请码 -->
      <view class="form-item">
        <text class="item-label">邀请码</text>
        <view class="input-wrapper">
          <text class="input-icon">🎁</text>
          <input 
            v-model="formData.inviteCode" 
            class="input-field" 
            placeholder="请输入邀请码（选填）"
            maxlength="10"
          />
        </view>
      </view>
      
      <!-- 协议同意 -->
      <view class="agreement-section">
        <view class="agreement-item" @click="toggleAgreement">
          <view class="checkbox" :class="{ checked: agreedToTerms }">
            <text v-if="agreedToTerms" class="check-icon">✓</text>
          </view>
          <text class="agreement-text">
            我已阅读并同意
            <text class="agreement-link" @click.stop="showUserAgreement">《用户协议》</text>
            和
            <text class="agreement-link" @click.stop="showPrivacyPolicy">《隐私政策》</text>
          </text>
        </view>
      </view>
      
      <!-- 注册按钮 -->
      <button 
        class="register-btn" 
        :disabled="!canRegister"
        @click="handleRegister"
      >
        注册
      </button>
    </view>
    
    <!-- 底部链接 -->
    <view class="footer">
      <text class="footer-text">已有账号？</text>
      <text class="footer-link" @click="navigateToLogin">立即登录</text>
    </view>
  </view>
</template>

<script>
import { useUserStore } from '@/stores/user.js'

export default {
  name: 'UserRegister',
  
  data() {
    return {
      userStore: null,
      showPassword: false,
      showConfirmPassword: false,
      smsCountdown: 0,
      smsTimer: null,
      agreedToTerms: false,
      
      formData: {
        phone: '',
        smsCode: '',
        password: '',
        confirmPassword: '',
        nickname: '',
        inviteCode: ''
      }
    }
  },
  
  computed: {
    loading() {
      return this.userStore?.isLoading || false
    },
    
    // 是否可以发送短信
    canSendSms() {
      return this.formData.phone.length === 11 && /^1[3-9]\d{9}$/.test(this.formData.phone)
    },
    
    // 密码验证
    passwordValidation() {
      const password = this.formData.password
      return {
        length: password.length >= 6 && password.length <= 20,
        hasLetter: /[a-zA-Z]/.test(password),
        hasNumber: /\d/.test(password)
      }
    },
    
    // 密码是否有效
    isPasswordValid() {
      return this.passwordValidation.length && 
             this.passwordValidation.hasLetter && 
             this.passwordValidation.hasNumber
    },
    
    // 密码是否匹配
    passwordMatch() {
      return this.formData.password === this.formData.confirmPassword
    },
    
    // 是否可以注册
    canRegister() {
      return this.canSendSms && 
             this.formData.smsCode.length === 6 &&
             this.isPasswordValid &&
             this.passwordMatch &&
             this.agreedToTerms
    }
  },
  
  onUnload() {
    // 清除定时器
    if (this.smsTimer) {
      clearInterval(this.smsTimer)
    }
  },

  onLoad() {
    // 初始化Pinia store
    this.userStore = useUserStore()
  },

  methods: {
    
    // 切换密码显示
    togglePassword() {
      this.showPassword = !this.showPassword
    },
    
    // 切换确认密码显示
    toggleConfirmPassword() {
      this.showConfirmPassword = !this.showConfirmPassword
    },
    
    // 切换协议同意状态
    toggleAgreement() {
      this.agreedToTerms = !this.agreedToTerms
    },
    
    // 发送短信验证码
    async sendSmsCode() {
      if (!this.canSendSms || this.smsCountdown > 0) return
      
      try {
        uni.showLoading({ title: '发送中...' })
        
        await this.userStore.getSmsCode({
          phone: this.formData.phone,
          type: 'register'
        })
        
        uni.hideLoading()
        uni.showToast({
          title: '验证码已发送',
          icon: 'success'
        })
        
        // 开始倒计时
        this.startCountdown()
        
      } catch (error) {
        uni.hideLoading()
        console.error('发送验证码失败:', error)
        uni.showToast({
          title: error.message || '发送失败',
          icon: 'error'
        })
      }
    },
    
    // 开始倒计时
    startCountdown() {
      this.smsCountdown = 60
      this.smsTimer = setInterval(() => {
        this.smsCountdown--
        if (this.smsCountdown <= 0) {
          clearInterval(this.smsTimer)
          this.smsTimer = null
        }
      }, 1000)
    },
    
    // 处理注册
    async handleRegister() {
      if (!this.canRegister) return
      
      // 验证表单
      if (!this.validateForm()) return
      
      try {
        await this.userStore.register({
          username: this.formData.phone, // 使用手机号作为用户名
          phone: this.formData.phone,
          code: this.formData.smsCode, // 后端期望的字段名是code
          password: this.formData.password,
          nickname: this.formData.nickname || this.formData.phone, // 如果没有昵称，使用手机号
          inviteCode: this.formData.inviteCode || undefined
        })
        
        uni.showToast({
          title: '注册成功',
          icon: 'success'
        })
        
        // 注册成功后跳转到登录页
        setTimeout(() => {
          uni.redirectTo({
            url: '/pages/user/login'
          })
        }, 1500)
        
      } catch (error) {
        console.error('注册失败:', error)
        // request.js已经处理了错误提示，这里不需要重复显示
      }
    },
    
    // 验证表单
    validateForm() {
      // 验证手机号
      if (!this.formData.phone) {
        uni.showToast({
          title: '请输入手机号',
          icon: 'error'
        })
        return false
      }
      
      if (!/^1[3-9]\d{9}$/.test(this.formData.phone)) {
        uni.showToast({
          title: '手机号格式不正确',
          icon: 'error'
        })
        return false
      }
      
      // 验证验证码
      if (!this.formData.smsCode) {
        uni.showToast({
          title: '请输入验证码',
          icon: 'error'
        })
        return false
      }
      
      if (this.formData.smsCode.length !== 6) {
        uni.showToast({
          title: '验证码格式不正确',
          icon: 'error'
        })
        return false
      }
      
      // 验证密码
      if (!this.formData.password) {
        uni.showToast({
          title: '请设置密码',
          icon: 'error'
        })
        return false
      }
      
      if (!this.isPasswordValid) {
        uni.showToast({
          title: '密码格式不符合要求',
          icon: 'error'
        })
        return false
      }
      
      // 验证确认密码
      if (!this.passwordMatch) {
        uni.showToast({
          title: '两次输入的密码不一致',
          icon: 'error'
        })
        return false
      }
      
      // 验证协议同意
      if (!this.agreedToTerms) {
        uni.showToast({
          title: '请同意用户协议和隐私政策',
          icon: 'error'
        })
        return false
      }
      
      return true
    },
    
    // 跳转到登录页
    navigateToLogin() {
      uni.navigateBack()
    },
    
    // 显示用户协议
    showUserAgreement() {
      uni.navigateTo({
        url: '/pages/user/agreement?type=user'
      })
    },
    
    // 显示隐私政策
    showPrivacyPolicy() {
      uni.navigateTo({
        url: '/pages/user/agreement?type=privacy'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8f65 100%);
  padding: 60rpx 60rpx 40rpx;
}

// 头部
.header {
  text-align: center;
  margin-bottom: 60rpx;
  
  .title {
    display: block;
    font-size: 48rpx;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 16rpx;
  }
  
  .subtitle {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.8);
  }
}

// 注册表单
.register-form {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx;
  margin-bottom: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
  
  // 表单项
  .form-item {
    margin-bottom: 30rpx;
    
    .item-label {
      display: block;
      font-size: 28rpx;
      color: #333333;
      margin-bottom: 16rpx;
      
      .required {
        color: #ff4d4f;
      }
    }
    
    .input-wrapper {
      display: flex;
      align-items: center;
      background-color: #f8f8f8;
      border-radius: 12rpx;
      padding: 0 20rpx;
      height: 88rpx;
      
      .input-icon {
        font-size: 32rpx;
        margin-right: 16rpx;
        opacity: 0.6;
      }
      
      .input-field {
        flex: 1;
        font-size: 28rpx;
        color: #333333;
        background: transparent;
        border: none;
      }
      
      .password-toggle {
        font-size: 32rpx;
        opacity: 0.6;
        padding: 8rpx;
      }
      
      .sms-btn {
        padding: 12rpx 24rpx;
        background-color: #ff6b35;
        color: #ffffff;
        border: none;
        border-radius: 8rpx;
        font-size: 24rpx;
        
        &[disabled] {
          background-color: #cccccc;
          color: #ffffff;
        }
      }
    }
    
    // 密码提示
    .password-tips {
      display: flex;
      flex-wrap: wrap;
      margin-top: 12rpx;
      
      .tip-item {
        font-size: 22rpx;
        color: #999999;
        margin-right: 20rpx;
        margin-bottom: 8rpx;
        
        &.valid {
          color: #52c41a;
        }
      }
    }
    
    // 错误提示
    .error-tip {
      font-size: 22rpx;
      color: #ff4d4f;
      margin-top: 8rpx;
    }
  }
  
  // 协议区域
  .agreement-section {
    margin-bottom: 40rpx;
    
    .agreement-item {
      display: flex;
      align-items: flex-start;
      
      .checkbox {
        width: 32rpx;
        height: 32rpx;
        border: 2rpx solid #cccccc;
        border-radius: 6rpx;
        margin-right: 16rpx;
        margin-top: 4rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        
        &.checked {
          background-color: #ff6b35;
          border-color: #ff6b35;
          
          .check-icon {
            color: #ffffff;
            font-size: 20rpx;
          }
        }
      }
      
      .agreement-text {
        flex: 1;
        font-size: 24rpx;
        color: #666666;
        line-height: 1.4;
        
        .agreement-link {
          color: #ff6b35;
          text-decoration: underline;
        }
      }
    }
  }
  
  // 注册按钮
  .register-btn {
    width: 100%;
    height: 88rpx;
    background-color: #ff6b35;
    color: #ffffff;
    border: none;
    border-radius: 12rpx;
    font-size: 32rpx;
    font-weight: 600;
    
    &[disabled] {
      background-color: #cccccc;
      color: #ffffff;
    }
  }
}

// 底部链接
.footer {
  text-align: center;
  
  .footer-text {
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .footer-link {
    font-size: 26rpx;
    color: #ffffff;
    font-weight: 600;
    margin-left: 8rpx;
  }
}
</style>