<template>
  <view class="page-container">
    <NavBar
      title="账号与安全"
      :showBack="false"
      backgroundColor="#ff6b35"
      titleColor="#ffffff"
      :showBorder="false"
    />
    <view class="page-body" :style="{ paddingTop: navBarHeight + 'px' }">
      <scroll-view scroll-y class="scroll-content">
        <!-- 账号信息 -->
        <view class="card info-card">
          <view class="avatar-area">
            <view class="avatar-circle">
              <image class="avatar-icon" src="/static/icons/admin/user-active.svg" mode="aspectFit" />
            </view>
            <view class="user-info">
              <text class="user-name">{{ nickname }}</text>
              <text class="user-role">场馆管理员</text>
            </view>
          </view>
        </view>

        <!-- 修改密码 -->
        <view class="card">
          <view class="card-head">
            <text class="card-title">修改密码</text>
          </view>
          <view class="form-group">
            <text class="form-label">旧密码</text>
            <input
              class="form-input"
              v-model="form.oldPassword"
              :password="true"
              placeholder="请输入旧密码"
            />
          </view>
          <view class="form-group">
            <text class="form-label">新密码</text>
            <input
              class="form-input"
              v-model="form.newPassword"
              :password="true"
              placeholder="请输入新密码（至少6位）"
            />
          </view>
          <view class="form-group">
            <text class="form-label">确认新密码</text>
            <input
              class="form-input"
              v-model="form.confirmPassword"
              :password="true"
              placeholder="请再次输入新密码"
            />
          </view>
          <view class="submit-btn" :class="{ disabled: submitting }" @click="handleChangePassword">
            <text class="submit-btn-text">{{ submitting ? '提交中...' : '确认修改' }}</text>
          </view>
        </view>

        <!-- 退出登录 -->
        <view class="card logout-card">
          <view class="logout-btn" @click="handleLogout">
            <text class="logout-btn-text">退出登录</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <AdminTabBar current="security" />
  </view>
</template>

<script>
import NavBar from '@/components/NavBar.vue'
import AdminTabBar from '@/components/admin/AdminTabBar.vue'
import { useUserStore } from '@/stores/user.js'
import { useAdminSecurityStore } from '@/stores/admin-security.js'

export default {
  components: { NavBar, AdminTabBar },

  data() {
    return {
      navBarHeight: 0,
      securityStore: null,
      userStore: null,
      form: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
    }
  },

  computed: {
    submitting() { return this.securityStore?.submitting },
    nickname() {
      return this.userStore?.nickname || this.userStore?.username || '管理员'
    }
  },

  onLoad() {
    this.securityStore = useAdminSecurityStore()
    this.userStore = useUserStore()
    this.calcNavBarHeight()
  },

  methods: {
    calcNavBarHeight() {
      const sys = uni.getSystemInfoSync()
      this.navBarHeight = (sys.statusBarHeight || 0) + 44
    },

    validate() {
      if (!this.form.oldPassword) {
        uni.showToast({ title: '请输入旧密码', icon: 'none' }); return false
      }
      if (!this.form.newPassword || this.form.newPassword.length < 6) {
        uni.showToast({ title: '新密码至少6位', icon: 'none' }); return false
      }
      if (this.form.newPassword !== this.form.confirmPassword) {
        uni.showToast({ title: '两次密码输入不一致', icon: 'none' }); return false
      }
      if (this.form.oldPassword === this.form.newPassword) {
        uni.showToast({ title: '新密码不能与旧密码相同', icon: 'none' }); return false
      }
      return true
    },

    async handleChangePassword() {
      if (this.submitting || !this.validate()) return

      try {
        await this.securityStore.changePassword(this.form.oldPassword, this.form.newPassword)
        uni.showToast({ title: '密码修改成功，请重新登录', icon: 'success' })
        this.form = { oldPassword: '', newPassword: '', confirmPassword: '' }
        setTimeout(() => {
          this.userStore.clearUserData()
          uni.reLaunch({ url: '/pages/user/login' })
        }, 1500)
      } catch (e) {
        uni.showToast({ title: e.message || '密码修改失败', icon: 'none' })
      }
    },

    handleLogout() {
      uni.showModal({
        title: '确认退出',
        content: '确定要退出登录吗？',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await this.userStore.logout()
          } catch {
            this.userStore.clearUserData()
            uni.reLaunch({ url: '/pages/user/login' })
          }
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: #f5f5f5;
  overflow-x: hidden;
}

.page-body {
  width: 100%;
  box-sizing: border-box;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
  overflow-x: hidden;
}

.scroll-content {
  width: 100%;
  box-sizing: border-box;
  padding: 24rpx;
}

.card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.info-card {
  padding: 40rpx 28rpx;
}

.avatar-area {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.avatar-circle {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8f65 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  width: 52rpx;
  height: 52rpx;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8rpx;
}

.user-role {
  font-size: 24rpx;
  color: #ff6b35;
  background: #fff0e6;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  align-self: flex-start;
}

.card-head {
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
}

.form-group {
  margin-bottom: 28rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #303133;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 16rpx;
  font-size: 28rpx;
  background: #ffffff;
  color: #303133;
  box-sizing: border-box;
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  background: #ff6b35;
  border-radius: 44rpx;
  margin-top: 8rpx;

  &.disabled { background: #cccccc; }
}

.submit-btn-text {
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
}

.logout-card {
  padding: 0;
}

.logout-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 24rpx;
}

.logout-btn-text {
  color: #fa3534;
  font-size: 32rpx;
  font-weight: 600;
}
</style>
