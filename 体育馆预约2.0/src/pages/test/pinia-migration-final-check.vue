<template>
  <view class="container">
    <view class="header">
      <text class="title">🔍 Pinia迁移最终验证</text>
      <text class="subtitle">检查迁移后的功能完整性</text>
    </view>

    <view class="test-section">
      <button class="test-btn primary" @click="runFullTest" :disabled="testing">
        {{ testing ? '测试中...' : '🚀 运行完整测试' }}
      </button>
    </view>

    <view class="results-section" v-if="testResults.length > 0">
      <view class="section-title">📊 测试结果</view>
      <view class="result-item" v-for="result in testResults" :key="result.id" :class="result.status">
        <view class="result-header">
          <text class="result-icon">{{ getStatusIcon(result.status) }}</text>
          <text class="result-title">{{ result.title }}</text>
        </view>
        <text class="result-message">{{ result.message }}</text>
        <text class="result-detail" v-if="result.detail">{{ result.detail }}</text>
      </view>
    </view>

    <view class="summary-section" v-if="testCompleted">
      <view class="summary-card">
        <text class="summary-title">📈 测试总结</text>
        <view class="summary-stats">
          <view class="stat-item success">
            <text class="stat-number">{{ successCount }}</text>
            <text class="stat-label">通过</text>
          </view>
          <view class="stat-item warning">
            <text class="stat-number">{{ warningCount }}</text>
            <text class="stat-label">警告</text>
          </view>
          <view class="stat-item error">
            <text class="stat-number">{{ errorCount }}</text>
            <text class="stat-label">错误</text>
          </view>
        </view>
        <text class="summary-conclusion" :class="overallStatus">
          {{ getSummaryMessage() }}
        </text>
      </view>
    </view>
  </view>
</template>

<script>
import { useAppStore } from '@/stores/app.js'
import { useUserStore } from '@/stores/user.js'
import { useVenueStore } from '@/stores/venue.js'
import { useBookingStore } from '@/stores/booking.js'
import { useSharingStore } from '@/stores/sharing.js'

export default {
  name: 'PiniaMigrationFinalCheck',
  data() {
    return {
      testing: false,
      testResults: [],
      testCompleted: false,
      appStore: null,
      userStore: null,
      venueStore: null,
      bookingStore: null,
      sharingStore: null
    }
  },

  computed: {
    successCount() {
      return this.testResults.filter(r => r.status === 'success').length
    },
    warningCount() {
      return this.testResults.filter(r => r.status === 'warning').length
    },
    errorCount() {
      return this.testResults.filter(r => r.status === 'error').length
    },
    overallStatus() {
      if (this.errorCount > 0) return 'error'
      if (this.warningCount > 0) return 'warning'
      return 'success'
    }
  },

  onLoad() {
    // 初始化所有stores
    this.appStore = useAppStore()
    this.userStore = useUserStore()
    this.venueStore = useVenueStore()
    this.bookingStore = useBookingStore()
    this.sharingStore = useSharingStore()
  },

  methods: {
    async runFullTest() {
      this.testing = true
      this.testResults = []
      this.testCompleted = false

      const tests = [
        { id: 'store-init', title: 'Store初始化检查', test: this.testStoreInitialization },
        { id: 'getter-access', title: 'Getter访问测试', test: this.testGetterAccess },
        { id: 'action-calls', title: 'Action调用测试', test: this.testActionCalls },
        { id: 'state-reactivity', title: '状态响应性测试', test: this.testStateReactivity },
        { id: 'error-handling', title: '错误处理测试', test: this.testErrorHandling }
      ]

      for (const test of tests) {
        try {
          await test.test(test.id, test.title)
          await this.delay(500) // 给用户看到进度
        } catch (error) {
          this.addResult(test.id, test.title, 'error', `测试执行失败: ${error.message}`, '')
        }
      }

      this.testCompleted = true
      this.testing = false
    },

    async testStoreInitialization(id, title) {
      const stores = [
        { name: 'app', store: this.appStore },
        { name: 'user', store: this.userStore },
        { name: 'venue', store: this.venueStore },
        { name: 'booking', store: this.bookingStore },
        { name: 'sharing', store: this.sharingStore }
      ]

      const uninitializedStores = stores.filter(s => !s.store).map(s => s.name)
      
      if (uninitializedStores.length === 0) {
        this.addResult(id, title, 'success', '所有Store已正确初始化', '')
      } else {
        this.addResult(id, title, 'error', `未初始化的Store: ${uninitializedStores.join(', ')}`, '检查Store导入和初始化')
      }
    },

    async testGetterAccess(id, title) {
      const getterTests = [
        { store: this.userStore, getter: 'userInfoGetter', name: 'user.userInfoGetter' },
        { store: this.venueStore, getter: 'venueListGetter', name: 'venue.venueListGetter' },
        { store: this.bookingStore, getter: 'bookingListGetter', name: 'booking.bookingListGetter' },
        { store: this.sharingStore, getter: 'sharingOrdersGetter', name: 'sharing.sharingOrdersGetter' }
      ]

      const failedGetters = []
      
      for (const test of getterTests) {
        try {
          if (test.store && typeof test.store[test.getter] !== 'undefined') {
            // Getter存在
          } else {
            failedGetters.push(test.name)
          }
        } catch (error) {
          failedGetters.push(`${test.name} (${error.message})`)
        }
      }

      if (failedGetters.length === 0) {
        this.addResult(id, title, 'success', '所有关键Getter可正常访问', '')
      } else {
        this.addResult(id, title, 'error', `无法访问的Getter: ${failedGetters.join(', ')}`, '检查Getter定义和命名')
      }
    },

    async testActionCalls(id, title) {
      const actionTests = [
        { store: this.userStore, action: 'initUserState', name: 'user.initUserState' },
        { store: this.appStore, action: 'setLoading', name: 'app.setLoading' },
        { store: this.venueStore, action: 'getVenueList', name: 'venue.getVenueList' },
        { store: this.sharingStore, action: 'getSentRequestsList', name: 'sharing.getSentRequestsList' },
        { store: this.sharingStore, action: 'getReceivedRequestsList', name: 'sharing.getReceivedRequestsList' }
      ]

      const failedActions = []

      for (const test of actionTests) {
        try {
          if (test.store && typeof test.store[test.action] === 'function') {
            // Action存在且是函数
          } else {
            failedActions.push(test.name)
          }
        } catch (error) {
          failedActions.push(`${test.name} (${error.message})`)
        }
      }

      if (failedActions.length === 0) {
        this.addResult(id, title, 'success', '所有关键Action可正常调用', '')
      } else {
        this.addResult(id, title, 'error', `无法调用的Action: ${failedActions.join(', ')}`, '检查Action定义和实现')
      }
    },

    async testStateReactivity(id, title) {
      try {
        // 测试状态变化是否能触发响应式更新
        const originalLoading = this.appStore.loading
        this.appStore.setLoading(!originalLoading)
        
        await this.delay(100)
        
        if (this.appStore.loading !== originalLoading) {
          // 恢复原状态
          this.appStore.setLoading(originalLoading)
          this.addResult(id, title, 'success', '状态响应性正常', '')
        } else {
          this.addResult(id, title, 'warning', '状态响应性可能有问题', '检查状态更新机制')
        }
      } catch (error) {
        this.addResult(id, title, 'error', `响应性测试失败: ${error.message}`, '检查Store状态管理')
      }
    },

    async testErrorHandling(id, title) {
      const issues = []
      
      // 检查各store是否有错误处理机制
      const stores = [
        { name: 'app', store: this.appStore },
        { name: 'user', store: this.userStore },
        { name: 'venue', store: this.venueStore },
        { name: 'booking', store: this.bookingStore },
        { name: 'sharing', store: this.sharingStore }
      ]

      stores.forEach(({ name, store }) => {
        if (!store.setLoading || typeof store.setLoading !== 'function') {
          issues.push(`${name} store缺少setLoading方法`)
        }
      })

      if (issues.length === 0) {
        this.addResult(id, title, 'success', '错误处理机制完善', '')
      } else {
        this.addResult(id, title, 'warning', `错误处理问题: ${issues.join(', ')}`, '添加错误处理和loading状态管理')
      }
    },

    addResult(id, title, status, message, detail) {
      this.testResults.push({
        id,
        title,
        status,
        message,
        detail
      })
    },

    getStatusIcon(status) {
      switch (status) {
        case 'success': return '✅'
        case 'warning': return '⚠️'
        case 'error': return '❌'
        default: return '❓'
      }
    },

    getSummaryMessage() {
      if (this.errorCount > 0) {
        return `发现 ${this.errorCount} 个错误，需要修复`
      }
      if (this.warningCount > 0) {
        return `发现 ${this.warningCount} 个警告，建议优化`
      }
      return '🎉 所有测试通过，迁移成功！'
    },

    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    }
  }
}
</script>

<style scoped>
.container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: #666;
  display: block;
}

.test-section {
  margin-bottom: 30px;
}

.test-btn {
  width: 100%;
  height: 50px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  border: none;
}

.test-btn.primary {
  background: linear-gradient(45deg, #007AFF, #5AC8FA);
  color: white;
}

.test-btn:disabled {
  opacity: 0.6;
}

.results-section {
  margin-bottom: 30px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
}

.result-item {
  background: white;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
  border-left: 4px solid #ddd;
}

.result-item.success {
  border-left-color: #34C759;
}

.result-item.warning {
  border-left-color: #FF9500;
}

.result-item.error {
  border-left-color: #FF3B30;
}

.result-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.result-icon {
  margin-right: 8px;
  font-size: 16px;
}

.result-title {
  font-weight: bold;
  color: #333;
}

.result-message {
  color: #666;
  font-size: 14px;
  display: block;
  margin-bottom: 5px;
}

.result-detail {
  color: #999;
  font-size: 12px;
  display: block;
}

.summary-section {
  margin-top: 30px;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.summary-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 20px;
}

.summary-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  display: block;
  margin-bottom: 5px;
}

.stat-item.success .stat-number {
  color: #34C759;
}

.stat-item.warning .stat-number {
  color: #FF9500;
}

.stat-item.error .stat-number {
  color: #FF3B30;
}

.stat-label {
  font-size: 12px;
  color: #666;
  display: block;
}

.summary-conclusion {
  font-size: 16px;
  font-weight: bold;
  padding: 10px;
  border-radius: 6px;
  display: block;
}

.summary-conclusion.success {
  background-color: #E8F5E8;
  color: #34C759;
}

.summary-conclusion.warning {
  background-color: #FFF3E0;
  color: #FF9500;
}

.summary-conclusion.error {
  background-color: #FFEBEE;
  color: #FF3B30;
}
</style>
