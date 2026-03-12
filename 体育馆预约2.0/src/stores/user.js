import { defineStore } from 'pinia'
import * as authApi from '@/api/auth.js'
import { userApi } from '@/api/user.js'
import { setToken, removeToken, setUserInfo, removeUserInfo, getUserInfo, getToken } from '@/utils/auth.js'
import { showSuccess, showError } from '@/utils/ui.js'
import { clearAuthCache, updateAuthCache } from '@/utils/router-guard-new.js'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    userInfo: getUserInfo(),
    userStats: {
      totalBookings: 0,
      totalSharings: 0
    },
    isLoggedIn: !!(getToken() && getUserInfo()),
    loginChecking: false // 是否正在检查登录状态
  }),

  getters: {
    // Token相关
    getToken: (state) => state.token,

    // 用户信息相关
    userInfoGetter: (state) => state.userInfo,
    getIsLoggedIn: (state) => state.isLoggedIn,
    userId: (state) => state.userInfo?.id,
    username: (state) => state.userInfo?.username,
    nickname: (state) => state.userInfo?.nickname || state.userInfo?.username,
    avatar: (state) => state.userInfo?.avatar,
    phone: (state) => state.userInfo?.phone,
    email: (state) => state.userInfo?.email,

    // 统计信息
    totalBookings: (state) => state.userStats.totalBookings,
    totalSharings: (state) => state.userStats.totalSharings,

    // 状态检查
    isLoginChecking: (state) => state.loginChecking
  },

  actions: {
    // 初始化用户状态（从本地存储恢复）
    initUserState() {
      const token = getToken()
      const userInfo = getUserInfo()

      if (token && userInfo) {
        this.token = token
        this.userInfo = userInfo
        this.isLoggedIn = true
      } else {
        this.logout()
      }
    },

    // 设置token
    setToken(token) {
      this.token = token
      setToken(token)
    },
    
    // 设置用户信息
    setUserInfo(userInfo) {
      this.userInfo = userInfo
      setUserInfo(userInfo)
    },
    
    // 设置登录状态
    setLoginStatus(status) {
      this.isLoggedIn = status
      // 同步更新路由守卫缓存
      updateAuthCache(status)
    },
    
    // 设置登录检查状态
    setLoginChecking(checking) {
      this.loginChecking = checking
    },
    
    // 设置用户统计
    setUserStats(stats) {
      this.userStats = stats
    },
    
    // 清除用户数据
    clearUserData() {
      this.token = ''
      this.userInfo = null
      this.userStats = {
        totalBookings: 0,
        totalSharings: 0
      }
      this.isLoggedIn = false
      this.loginChecking = false
      removeToken()
      removeUserInfo()
      // 清除路由守卫缓存
      clearAuthCache()
    },

    // 用户登录
    async login(loginData) {
      try {
        const response = await authApi.login(loginData)
        
        if (!response) {
          throw new Error('登录响应为空')
        }
        
        const responseData = response.data || response
        const token = responseData.accessToken || responseData.token
        
        if (!token) {
          console.error('[UserStore] 响应数据:', responseData)
          throw new Error('未获取到登录令牌')
        }
        
        const user = {
          id: responseData.id,
          username: responseData.username,
          email: responseData.email,
          phone: responseData.phone,
          nickname: responseData.nickname,
          avatar: responseData.avatar,
          roles: responseData.roles,
          loginType: responseData.loginType || 'account'
        }
        
        // 更新状态
        this.setToken(token)
        this.setUserInfo(user)
        this.setLoginStatus(true)
        
        return response
      } catch (error) {
        console.error('[UserStore] 登录错误:', error)
        this.setLoginStatus(false)
        throw error
      }
    },

    async loginByWechat() {
      try {
        const loginRes = await new Promise((resolve, reject) => {
          uni.login({
            provider: 'weixin',
            success: resolve,
            fail: reject
          })
        })

        if (!loginRes || !loginRes.code) {
          throw new Error('获取微信登录凭证失败')
        }

        const response = await authApi.wechatLogin({ code: loginRes.code })
        const responseData = response.data || response
        const token = responseData.accessToken || responseData.token

        if (!token) {
          throw new Error('未获取到登录令牌')
        }

        const user = {
          id: responseData.id,
          username: responseData.username,
          email: responseData.email,
          phone: responseData.phone,
          nickname: responseData.nickname || responseData.username,
          avatar: responseData.avatar,
          roles: responseData.roles,
          loginType: responseData.loginType || 'wechat'
        }

        this.setToken(token)
        this.setUserInfo(user)
        this.setLoginStatus(true)
        return response
      } catch (error) {
        this.setLoginStatus(false)
        throw error
      }
    },

    // 获取用户信息
    async getUserInfo() {
      try {

        if (!this.token) {
          throw new Error('用户未登录')
        }

        const response = await userApi.getUserInfo()

        const userInfo = response.data || response
        this.setUserInfo(userInfo)

        return userInfo
      } catch (error) {
        console.error('[UserStore] 获取用户信息失败:', error)
        // 如果是认证错误，清除用户数据
        if (error.message?.includes('401') || error.message?.includes('未登录')) {
          this.clearUserData()
        }
        throw error
      }
    },

    // 更新用户信息
    async updateUserInfo(updateData) {
      try {

        const response = await userApi.updateUserInfo(updateData)

        const updatedUserInfo = response.data || response
        this.setUserInfo({
          ...this.userInfo,
          ...updatedUserInfo
        })

        showSuccess('用户信息更新成功')
        return updatedUserInfo
      } catch (error) {
        console.error('[UserStore] 更新用户信息失败:', error)
        showError(error.message || '更新用户信息失败')
        throw error
      }
    },

    // 用户注册
    async register(registerData) {
      try {
        const response = await authApi.register(registerData)
        
        showSuccess('注册成功')
        return response
      } catch (error) {
        console.error('[UserStore] 注册错误:', error)
        showError(error.message || '注册失败')
        throw error
      }
    },

    // 用户退出
    async logout() {
      try {
        
        // 调用后端退出接口
        try {
          await authApi.logout()
        } catch (error) {
          // 即使后端接口失败，也继续清除本地数据
        }
        
        // 清除本地数据
        this.clearUserData()
        
        showSuccess('退出成功')
        
        // 跳转到登录页
        uni.reLaunch({
          url: '/pages/user/login'
        })
        
      } catch (error) {
        console.error('[UserStore] 退出登录错误:', error)
        // 即使出错也要清除本地数据
        this.clearUserData()
        throw error
      }
    },

    // 检查登录状态
    async checkLoginStatus() {
      if (this.loginChecking) {
        return this.isLoggedIn
      }
      
      this.setLoginChecking(true)
      
      try {
        
        const token = getToken()
        const userInfo = getUserInfo()
        
        if (!token || !userInfo) {
          this.setLoginStatus(false)
          return false
        }
        
        // 验证token有效性
        try {
          const response = await userApi.getCurrentUser()
          
          // 更新用户信息
          if (response && response.data) {
            this.setUserInfo(response.data)
          }
          
          this.setLoginStatus(true)
          return true
        } catch (error) {
          console.error('[UserStore] Token验证失败:', error)
          // Token无效，清除本地数据
          this.clearUserData()
          return false
        }
        
      } catch (error) {
        console.error('[UserStore] 检查登录状态错误:', error)
        this.setLoginStatus(false)
        return false
      } finally {
        this.setLoginChecking(false)
      }
    },

    // 获取用户统计信息
    async getUserStats() {
      try {
        const response = await userApi.getUserStats()
        
        if (response && response.data) {
          this.setUserStats(response.data)
        }
        
        return response
      } catch (error) {
        console.error('[UserStore] 获取用户统计信息失败:', error)
        throw error
      }
    },

    // 更新用户信息
    async updateProfile(profileData) {
      try {
        const response = await userApi.updateProfile(profileData)
        
        if (response && response.data) {
          // 更新本地用户信息
          this.setUserInfo({
            ...this.userInfo,
            ...response.data
          })
          showSuccess('信息更新成功')
        }
        
        return response
      } catch (error) {
        console.error('[UserStore] 更新用户信息失败:', error)
        showError(error.message || '更新失败')
        throw error
      }
    },

    // 上传头像
    async uploadAvatar(filePath) {
      try {
        const result = await userApi.uploadAvatar(filePath)
        // 上传成功后更新本地用户信息中的 avatar
        if (result && result.avatarUrl) {
          this.setUserInfo({
            ...this.userInfo,
            avatar: result.avatarUrl
          })
        }
        return result
      } catch (error) {
        console.error('[UserStore] 上传头像失败:', error)
        throw error
      }
    },

    // 修改密码
    async changePassword(passwordData) {
      try {
        const response = await userApi.changePassword(passwordData)
        
        showSuccess('密码修改成功')
        
        return response
      } catch (error) {
        console.error('[UserStore] 修改密码失败:', error)
        showError(error.message || '密码修改失败')
        throw error
      }
    }
  }
})
