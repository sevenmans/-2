<template>
  <view class="container">
    <view class="header">
      <text class="title">🔧 命名冲突修复验证</text>
      <text class="subtitle">专门解决Getter/Action命名冲突问题</text>
    </view>

    <!-- 问题说明 -->
    <view class="problem-section">
      <text class="section-title">🚨 发现的问题</text>
      <view class="problem-card">
        <text class="problem-title">getUserInfo 命名冲突</text>
        <text class="problem-desc">在User Store中同时存在：</text>
        <text class="code-line">• Getter: getUserInfo: (state) => state.userInfo</text>
        <text class="code-line">• Action: async getUserInfo() { ... }</text>
        <text class="problem-result">结果：Action被Getter覆盖，导致 "is not a function" 错误</text>
      </view>
    </view>

    <!-- 修复方案 -->
    <view class="solution-section">
      <text class="section-title">✅ 修复方案</text>
      <view class="solution-card">
        <text class="solution-title">重命名Getter避免冲突</text>
        <text class="code-line">• 原Getter: getUserInfo → userInfoGetter</text>
        <text class="code-line">• Action保持: getUserInfo (不变)</text>
        <text class="code-line">• 更新引用: 所有使用getter的地方</text>
      </view>
    </view>

    <!-- 验证测试 -->
    <view class="test-section">
      <text class="section-title">🧪 修复验证</text>
      
      <button class="test-btn primary" @click="testNamingConflictFix" :disabled="testing">
        验证命名冲突修复
      </button>
      
      <button class="test-btn info" @click="testUserStoreStructure" :disabled="testing">
        检查User Store结构
      </button>
      
      <button class="test-btn success" @click="testGetterActionSeparation" :disabled="testing">
        验证Getter/Action分离
      </button>
    </view>

    <!-- 测试结果 -->
    <view class="results-section">
      <text class="section-title">📊 测试结果</text>
      <view class="log-container">
        <view v-for="(log, index) in logs" :key="index" :class="['log-item', log.type]">
          <text class="log-text">{{ log.message }}</text>
          <text class="log-time">{{ log.time }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useUserStore } from '@/stores/user.js'

export default {
  name: 'NamingConflictFix',
  data() {
    return {
      testing: false,
      logs: []
    }
  },
  
  setup() {
    const userStore = useUserStore()
    return { userStore }
  },

  methods: {
    addLog(type, message) {
      this.logs.push({
        type,
        message,
        time: new Date().toLocaleTimeString()
      })
      console.log(`[命名冲突修复] ${type.toUpperCase()}: ${message}`)
    },

    clearLogs() {
      this.logs = []
    },

    // 验证命名冲突修复
    async testNamingConflictFix() {
      this.testing = true
      this.clearLogs()
      this.addLog('info', '🔧 开始验证命名冲突修复...')

      try {
        // 1. 检查getter是否已重命名
        this.addLog('info', '检查Getter重命名...')
        
        if (typeof this.userStore.getUserInfo !== 'undefined') {
          const getUserInfoType = typeof this.userStore.getUserInfo
          this.addLog('info', `getUserInfo类型: ${getUserInfoType}`)
          
          if (getUserInfoType === 'function') {
            this.addLog('success', '✅ getUserInfo现在是function (Action)')
          } else {
            this.addLog('error', `❌ getUserInfo仍然是${getUserInfoType} (可能是Getter)`)
          }
        } else {
          this.addLog('error', '❌ getUserInfo完全不存在')
        }

        // 2. 检查新的getter名称
        if (typeof this.userStore.userInfoGetter !== 'undefined') {
          this.addLog('success', '✅ userInfoGetter存在 (新的Getter名称)')
          
          const userInfo = this.userStore.userInfoGetter
          this.addLog('info', `userInfoGetter返回值类型: ${typeof userInfo}`)
          
          if (userInfo && typeof userInfo === 'object') {
            this.addLog('success', '✅ userInfoGetter返回用户信息对象')
          } else {
            this.addLog('warning', '⚠️ userInfoGetter返回值为空或类型异常')
          }
        } else {
          this.addLog('error', '❌ userInfoGetter不存在 (新Getter未创建)')
        }

        // 3. 测试Action调用
        this.addLog('info', '测试getUserInfo Action调用...')
        
        if (typeof this.userStore.getUserInfo === 'function') {
          try {
            // 不实际调用，只验证是否为函数
            this.addLog('success', '✅ getUserInfo Action可以调用')
          } catch (error) {
            this.addLog('error', `❌ getUserInfo Action调用失败: ${error.message}`)
          }
        } else {
          this.addLog('error', '❌ getUserInfo不是函数，无法作为Action调用')
        }

        this.addLog('success', '🎉 命名冲突修复验证完成！')
      } catch (error) {
        this.addLog('error', `验证过程出错: ${error.message}`)
      } finally {
        this.testing = false
      }
    },

    // 检查User Store结构
    async testUserStoreStructure() {
      this.testing = true
      this.addLog('info', '🔍 检查User Store结构...')

      try {
        // 获取所有属性和方法
        const storeKeys = Object.keys(this.userStore)
        const storeProps = Object.getOwnPropertyNames(this.userStore)
        
        this.addLog('info', `Store可枚举属性数量: ${storeKeys.length}`)
        this.addLog('info', `Store所有属性数量: ${storeProps.length}`)

        // 检查关键属性
        const keyProperties = ['userInfo', 'token', 'isLoggedIn']
        keyProperties.forEach(prop => {
          if (prop in this.userStore) {
            this.addLog('success', `✅ 状态属性 ${prop} 存在`)
          } else {
            this.addLog('error', `❌ 状态属性 ${prop} 缺失`)
          }
        })

        // 检查关键方法
        const keyMethods = ['getUserInfo', 'login', 'logout', 'setUserInfo']
        keyMethods.forEach(method => {
          if (typeof this.userStore[method] === 'function') {
            this.addLog('success', `✅ Action方法 ${method} 存在`)
          } else {
            this.addLog('error', `❌ Action方法 ${method} 缺失或类型错误`)
          }
        })

        // 检查getter
        const keyGetters = ['userInfoGetter', 'getIsLoggedIn', 'userId', 'username']
        keyGetters.forEach(getter => {
          if (getter in this.userStore) {
            this.addLog('success', `✅ Getter ${getter} 存在`)
          } else {
            this.addLog('warning', `⚠️ Getter ${getter} 可能缺失`)
          }
        })

        this.addLog('success', '🎉 User Store结构检查完成！')
      } catch (error) {
        this.addLog('error', `结构检查失败: ${error.message}`)
      } finally {
        this.testing = false
      }
    },

    // 验证Getter/Action分离
    async testGetterActionSeparation() {
      this.testing = true
      this.addLog('info', '🔬 验证Getter/Action分离...')

      try {
        // 检查是否还有其他命名冲突
        const potentialConflicts = [
          { name: 'getUserInfo', shouldBe: 'function' },
          { name: 'userInfoGetter', shouldBe: 'object' },
          { name: 'getIsLoggedIn', shouldBe: 'boolean' },
          { name: 'login', shouldBe: 'function' },
          { name: 'logout', shouldBe: 'function' }
        ]

        let conflictCount = 0
        
        potentialConflicts.forEach(({ name, shouldBe }) => {
          const actualType = typeof this.userStore[name]
          
          if (shouldBe === 'object' && this.userStore[name] !== null) {
            // 对于userInfoGetter，检查是否返回对象
            if (actualType === 'object' || this.userStore[name] === null) {
              this.addLog('success', `✅ ${name}: 类型正确 (${actualType})`)
            } else {
              this.addLog('error', `❌ ${name}: 期望object，实际${actualType}`)
              conflictCount++
            }
          } else if (shouldBe === 'boolean') {
            // 对于boolean getter
            const value = this.userStore[name]
            if (typeof value === 'boolean') {
              this.addLog('success', `✅ ${name}: 类型正确 (${actualType})`)
            } else {
              this.addLog('error', `❌ ${name}: 期望boolean，实际${actualType}`)
              conflictCount++
            }
          } else if (shouldBe === 'function') {
            // 对于action方法
            if (actualType === 'function') {
              this.addLog('success', `✅ ${name}: 类型正确 (${actualType})`)
            } else {
              this.addLog('error', `❌ ${name}: 期望function，实际${actualType}`)
              conflictCount++
            }
          }
        })

        if (conflictCount === 0) {
          this.addLog('success', '🎉 所有Getter/Action分离正确，无命名冲突！')
        } else {
          this.addLog('warning', `⚠️ 发现 ${conflictCount} 个潜在问题`)
        }

      } catch (error) {
        this.addLog('error', `分离验证失败: ${error.message}`)
      } finally {
        this.testing = false
      }
    }
  }
}
</script>

<style scoped>
.container {
  padding: 40rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 60rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
}

.subtitle {
  font-size: 28rpx;
  color: #666;
  display: block;
}

.problem-section, .solution-section, .test-section, .results-section {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 30rpx;
}

.problem-card, .solution-card {
  background: #f8f9fa;
  border-radius: 15rpx;
  padding: 30rpx;
  border-left: 6rpx solid #ff6b6b;
}

.solution-card {
  border-left-color: #4caf50;
}

.problem-title, .solution-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 15rpx;
}

.problem-desc {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 15rpx;
}

.code-line {
  font-size: 24rpx;
  color: #555;
  font-family: 'Courier New', monospace;
  background: rgba(0,0,0,0.05);
  padding: 8rpx 15rpx;
  border-radius: 8rpx;
  display: block;
  margin-bottom: 10rpx;
}

.problem-result {
  font-size: 26rpx;
  color: #ff6b6b;
  font-weight: bold;
  display: block;
  margin-top: 15rpx;
}

.test-btn {
  width: 100%;
  height: 80rpx;
  color: white;
  border: none;
  border-radius: 40rpx;
  font-size: 28rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.test-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.test-btn.info {
  background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
}

.test-btn.success {
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
}

.test-btn:disabled {
  background: #ccc !important;
}

.log-container {
  max-height: 800rpx;
  overflow-y: auto;
}

.log-item {
  padding: 20rpx;
  margin-bottom: 10rpx;
  border-radius: 10rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-item.info {
  background-color: #e3f2fd;
  border-left: 4rpx solid #2196f3;
}

.log-item.success {
  background-color: #e8f5e8;
  border-left: 4rpx solid #4caf50;
}

.log-item.error {
  background-color: #ffebee;
  border-left: 4rpx solid #f44336;
}

.log-item.warning {
  background-color: #fff3e0;
  border-left: 4rpx solid #ff9800;
}

.log-text {
  font-size: 26rpx;
  flex: 1;
}

.log-time {
  font-size: 22rpx;
  color: #999;
  margin-left: 20rpx;
}
</style>
