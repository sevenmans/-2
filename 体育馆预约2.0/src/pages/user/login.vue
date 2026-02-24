<template>
  <view class="container">
    <!-- 头部logo -->
    <view class="header">
      <image src="/static/logo.png" class="logo" mode="aspectFit" />
      <text class="app-name">体育馆预约</text>
      <text class="app-slogan">让运动更简单</text>
    </view>
    
    <!-- 登录表单 -->
    <view class="login-form">
      <!-- 标签切换 -->
      <view class="tab-bar">
        <view 
          class="tab-item" 
          :class="{ active: loginType === 'password' }"
          @click="switchLoginType('password')"
        >
          密码登录
        </view>
        <view 
          class="tab-item" 
          :class="{ active: loginType === 'sms' }"
          @click="switchLoginType('sms')"
        >
          验证码登录
        </view>
      </view>
      
      <!-- 手机号输入 -->
      <view class="form-item">
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
      
      <!-- 密码登录 -->
      <view v-if="loginType === 'password'" class="form-item">
        <view class="input-wrapper">
          <text class="input-icon">🔒</text>
          <input 
            v-model="formData.password" 
            class="input-field" 
            :password="!showPassword"
            placeholder="请输入密码"
          />
          <text 
            class="password-toggle" 
            @click="togglePassword"
          >
            {{ showPassword ? '🙈' : '👁️' }}
          </text>
        </view>
      </view>
      
      <!-- 验证码登录 -->
      <view v-if="loginType === 'sms'" class="form-item">
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
      
      <!-- 登录按钮 -->
      <button 
        class="login-btn" 
        :disabled="!canLogin"
        @click="handleLogin"
      >
        登录
      </button>
      
      <!-- 忘记密码 -->
      <view v-if="loginType === 'password'" class="forgot-password">
        <text @click="navigateToReset">忘记密码？</text>
      </view>
    </view>
    
    <!-- 其他登录方式 -->
    <view class="other-login">
      <view class="divider">
        <text class="divider-text">其他登录方式</text>
      </view>
      
      <view class="social-login">
        <view class="social-item" @click="wechatLogin">
          <text class="social-icon">💬</text>
          <text class="social-text">微信登录</text>
        </view>
        
        <view class="social-item" @click="appleLogin">
          <text class="social-icon">🍎</text>
          <text class="social-text">Apple登录</text>
        </view>
      </view>
    </view>
    
    <!-- 底部链接 -->
    <view class="footer">
      <text class="footer-text">还没有账号？</text>
      <text class="footer-link" @click="navigateToRegister">立即注册</text>
    </view>
    
    <!-- 协议提示 -->
    <view class="agreement">
      <text class="agreement-text">登录即表示同意</text>
      <text class="agreement-link" @click="showUserAgreement">《用户协议》</text>
      <text class="agreement-text">和</text>
      <text class="agreement-link" @click="showPrivacyPolicy">《隐私政策》</text>
    </view>
  </view>
</template>

<script>
import { useUserStore } from '@/stores/user.js'

export default {
  name: 'UserLogin',

  data() {
    return {
      userStore: null,
      loginType: 'password', // 'password' | 'sms'
      showPassword: false,
      smsCountdown: 0,
      smsTimer: null,

      formData: {
        phone: '13402838501',  // 默认手机号
        password: 'yangyu123..',  // 默认密码
        smsCode: ''
      }
    }
  },

  computed: {
    loading() {
      return this.userStore?.loading || false
    },
    
    // 是否可以发送短信
    canSendSms() {
      return this.formData.phone.length === 11 && /^1[3-9]\d{9}$/.test(this.formData.phone)
    },
    
    // 是否可以登录
    canLogin() {
      if (this.loginType === 'password') {
        return this.canSendSms && this.formData.password.length >= 6
      } else {
        return this.canSendSms && this.formData.smsCode.length === 6
      }
    }
  },
  
  onLoad(options) {
    // 初始化Pinia store
    this.userStore = useUserStore()

    // 如果有重定向页面，保存起来
    if (options.redirect) {
      this.redirectUrl = decodeURIComponent(options.redirect)
    }
  },
  
  onUnload() {
    // 清除定时器
    if (this.smsTimer) {
      clearInterval(this.smsTimer)
    }
  },
  
  methods: {
    
    // 切换登录方式
    switchLoginType(type) {
      this.loginType = type
      // 清空表单
      this.formData.password = ''
      this.formData.smsCode = ''
    },
    
    // 切换密码显示
    togglePassword() {
      this.showPassword = !this.showPassword
    },
    
    // 发送短信验证码
    async sendSmsCode() {
      if (!this.canSendSms || this.smsCountdown > 0) return
      
      try {
        await this.userStore.getSmsCode({
          phone: this.formData.phone,
          type: 'login'
        })
        uni.showToast({
          title: '验证码已发送',
          icon: 'success'
        })
        
        // 开始倒计时
        this.startCountdown()
        
      } catch (error) {
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
    
    // 处理登录
    async handleLogin() {
      if (!this.canLogin) return
      
      // 验证手机号
      if (!this.validatePhone()) return
      
      try {
        let result
        if (this.loginType === 'password') {
          // 密码登录
          result = await this.userStore.login({
            username: this.formData.phone,
            password: this.formData.password
          })
        } else {
          // 验证码登录
          result = await this.userStore.smsLogin({
            phone: this.formData.phone,
            smsCode: this.formData.smsCode
          })
        }

        // 登录成功，用户信息已在登录API中返回并设置
        
        uni.showToast({
          title: '登录成功',
          icon: 'success'
        })
        
        // 登录成功后跳转
        setTimeout(() => {
          this.handleLoginSuccess()
        }, 1500)
        
      } catch (error) {
        console.error('登录失败:', error)
        // 根据错误类型显示不同的提示信息
        let errorMessage = '登录失败'
        if (error.message) {
          if (error.message.includes('用户名或密码错误') || error.message.includes('账号或密码错误')) {
            errorMessage = '账号或密码错误，请重新输入'
          } else if (error.message.includes('用户不存在')) {
            errorMessage = '账号不存在，请先注册'
          } else if (error.message.includes('密码错误')) {
            errorMessage = '密码错误，请重新输入'
          } else if (error.message.includes('验证码错误') || error.message.includes('验证码不正确')) {
            errorMessage = '验证码错误，请重新输入'
          } else if (error.message.includes('验证码已过期')) {
            errorMessage = '验证码已过期，请重新获取'
          } else if (error.message.includes('网络')) {
            errorMessage = '网络连接失败，请检查网络'
          } else {
            errorMessage = error.message
          }
        }
        uni.showToast({
          title: errorMessage,
          icon: 'error',
          duration: 3000
        })
      }
    },
    
    // 处理登录成功
    handleLoginSuccess() {
      
      // 清除路由守卫缓存，确保登录状态更新
      this.userStore.setLoginStatus(true)
      
      if (this.redirectUrl) {
        try {
          // 解码重定向URL
          const decodedUrl = decodeURIComponent(this.redirectUrl)
          
          // 检查是否是tabBar页面
          const tabBarPages = [
            '/pages/index/index',
            '/pages/venue/list', 
            '/pages/sharing/list',
            '/pages/booking/list',
            '/pages/user/profile'
          ]
          
          const pagePath = decodedUrl.split('?')[0]
          const isTabBarPage = tabBarPages.includes(pagePath)
          
          if (isTabBarPage) {
            uni.switchTab({
              url: pagePath,
              fail: (err) => {
                console.error('[Login] switchTab失败:', err)
                // 失败时跳转到首页
                uni.switchTab({ url: '/pages/index/index' })
              }
            })
          } else {
            uni.redirectTo({
              url: decodedUrl,
              fail: (err) => {
                console.error('[Login] redirectTo失败:', err)
                // 失败时跳转到首页
                uni.switchTab({ url: '/pages/index/index' })
              }
            })
          }
        } catch (error) {
          console.error('[Login] 处理重定向URL失败:', error)
          // 出错时跳转到首页
          uni.switchTab({ url: '/pages/index/index' })
        }
      } else {
        // 没有重定向页面，跳转到首页
        uni.switchTab({
          url: '/pages/index/index',
          fail: (err) => {
            console.error('[Login] 跳转首页失败:', err)
          }
        })
      }
    },
    
    // 验证手机号
    validatePhone() {
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
      
      return true
    },
    
    // 微信登录
    wechatLogin() {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    },
    
    // Apple登录
    appleLogin() {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    },
    
    // 跳转到注册页
    navigateToRegister() {
      uni.navigateTo({
        url: '/pages/user/register'
      })
    },
    
    // 跳转到重置密码页
    navigateToReset() {
      uni.navigateTo({
        url: '/pages/user/reset-password'
      })
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
  display: flex;
  flex-direction: column;
}

// 头部
.header {
  text-align: center;
  margin-bottom: 80rpx;
  
  .logo {
    width: 120rpx;
    height: 120rpx;
    margin-bottom: 30rpx;
  }
  
  .app-name {
    display: block;
    font-size: 48rpx;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 16rpx;
  }
  
  .app-slogan {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.8);
  }
}

// 登录表单
.login-form {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx;
  margin-bottom: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
  
  // 标签栏
  .tab-bar {
    display: flex;
    background-color: #f5f5f5;
    border-radius: 12rpx;
    padding: 8rpx;
    margin-bottom: 40rpx;
    
    .tab-item {
      flex: 1;
      text-align: center;
      padding: 16rpx;
      font-size: 28rpx;
      color: #666666;
      border-radius: 8rpx;
      transition: all 0.3s ease;
      
      &.active {
        background-color: #ffffff;
        color: #ff6b35;
        font-weight: 600;
        box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
      }
    }
  }
  
  // 表单项
  .form-item {
    margin-bottom: 30rpx;
    
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
  }
  
  // 登录按钮
  .login-btn {
    width: 100%;
    height: 88rpx;
    background-color: #ff6b35;
    color: #ffffff;
    border: none;
    border-radius: 12rpx;
    font-size: 32rpx;
    font-weight: 600;
    margin-bottom: 30rpx;
    
    &[disabled] {
      background-color: #cccccc;
      color: #ffffff;
    }
  }
  
  // 忘记密码
  .forgot-password {
    text-align: right;
    
    text {
      font-size: 26rpx;
      color: #ff6b35;
    }
  }
}

// 其他登录方式
.other-login {
  margin-bottom: 40rpx;
  
  .divider {
    position: relative;
    text-align: center;
    margin-bottom: 30rpx;
    
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1rpx;
      background-color: rgba(255, 255, 255, 0.3);
    }
    
    .divider-text {
      background: linear-gradient(135deg, #ff6b35 0%, #ff8f65 100%);
      padding: 0 20rpx;
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.8);
      position: relative;
      z-index: 1;
    }
  }
  
  .social-login {
    display: flex;
    justify-content: center;
    gap: 60rpx;
    
    .social-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      
      .social-icon {
        width: 80rpx;
        height: 80rpx;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 36rpx;
        margin-bottom: 12rpx;
      }
      
      .social-text {
        font-size: 24rpx;
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }
}

// 底部链接
.footer {
  text-align: center;
  margin-bottom: 30rpx;
  
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

// 协议提示
.agreement {
  text-align: center;
  
  .agreement-text {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .agreement-link {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.8);
    text-decoration: underline;
  }
}
</style>