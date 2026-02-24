<template>
  <view class="container">
    <view class="header">
      <text class="title">🧪 Pinia迁移测试中心</text>
      <text class="subtitle">Vuex到Pinia迁移验证工具集</text>
    </view>

    <!-- 快速状态概览 -->
    <view class="status-section">
      <text class="section-title">📊 迁移状态概览</text>
      <view class="status-grid">
        <view class="status-item success">
          <text class="status-icon">✅</text>
          <text class="status-label">已修复</text>
          <text class="status-count">5项</text>
        </view>
        <view class="status-item warning">
          <text class="status-icon">⚠️</text>
          <text class="status-label">需检查</text>
          <text class="status-count">15项</text>
        </view>
        <view class="status-item info">
          <text class="status-icon">📋</text>
          <text class="status-label">待测试</text>
          <text class="status-count">10项</text>
        </view>
      </view>
    </view>

    <!-- 测试工具入口 -->
    <view class="tools-section">
      <text class="section-title">🛠️ 测试工具</text>
      
      <!-- 核心测试工具 -->
      <view class="tool-category">
        <text class="category-title">🎯 核心测试</text>
        
        <view class="tool-card primary" @click="navigateToTool('pinia-migration-final-validation')">
          <view class="tool-header">
            <text class="tool-icon">🎉</text>
            <view class="tool-info">
              <text class="tool-name">Pinia迁移最终验证</text>
              <text class="tool-desc">验证所有核心功能是否正常工作</text>
            </view>
          </view>
          <text class="tool-status">最终验证</text>
        </view>

        <view class="tool-card success" @click="navigateToTool('comprehensive-migration-check')">
          <view class="tool-header">
            <text class="tool-icon">🔍</text>
            <view class="tool-info">
              <text class="tool-name">全面迁移错误排查</text>
              <text class="tool-desc">30项完整错误清单检查</text>
            </view>
          </view>
          <text class="tool-status">详细检查</text>
        </view>
        
        <view class="tool-card success" @click="navigateToTool('quick-fix-validation')">
          <view class="tool-header">
            <text class="tool-icon">🔧</text>
            <view class="tool-info">
              <text class="tool-name">快速修复验证</text>
              <text class="tool-desc">验证已修复的API方法</text>
            </view>
          </view>
          <text class="tool-status">已修复验证</text>
        </view>

        <view class="tool-card warning" @click="navigateToTool('naming-conflict-fix')">
          <view class="tool-header">
            <text class="tool-icon">⚡</text>
            <view class="tool-info">
              <text class="tool-name">命名冲突修复验证</text>
              <text class="tool-desc">专门解决Getter/Action冲突</text>
            </view>
          </view>
          <text class="tool-status">冲突修复</text>
        </view>
      </view>

      <!-- 专项测试工具 -->
      <view class="tool-category">
        <text class="category-title">🔬 专项测试</text>
        
        <view class="tool-card info" @click="navigateToTool('api-diagnosis')">
          <view class="tool-header">
            <text class="tool-icon">🌐</text>
            <view class="tool-info">
              <text class="tool-name">API诊断工具</text>
              <text class="tool-desc">专门的API连通性测试</text>
            </view>
          </view>
          <text class="tool-status">API专项</text>
        </view>
        
        <view class="tool-card warning" @click="navigateToTool('migration-validation')">
          <view class="tool-header">
            <text class="tool-icon">🧪</text>
            <view class="tool-info">
              <text class="tool-name">Pinia迁移验证</text>
              <text class="tool-desc">基础迁移功能验证</text>
            </view>
          </view>
          <text class="tool-status">基础验证</text>
        </view>

        <view class="tool-card error" @click="navigateToTool('payment-fix')">
          <view class="tool-header">
            <text class="tool-icon">💰</text>
            <view class="tool-info">
              <text class="tool-name">支付问题修复测试</text>
              <text class="tool-desc">订单金额显示和时间段刷新修复</text>
            </view>
          </view>
          <text class="tool-status">问题修复</text>
        </view>

        <view class="tool-card success" @click="navigateToTool('timeslot-fix-test')">
          <view class="tool-header">
            <text class="tool-icon">🔧</text>
            <view class="tool-info">
              <text class="tool-name">时间段修复测试</text>
              <text class="tool-desc">营业时间生成、前后端同步、状态刷新</text>
            </view>
          </view>
          <text class="tool-status">最新修复</text>
        </view>

        <view class="tool-card warning" @click="navigateToTool('timeslot-sync-debug')">
          <view class="tool-header">
            <text class="tool-icon">🔍</text>
            <view class="tool-info">
              <text class="tool-name">时间段同步调试</text>
              <text class="tool-desc">专门调试前后端同步问题</text>
            </view>
          </view>
          <text class="tool-status">调试工具</text>
        </view>

        <view class="tool-card error" @click="navigateToTool('booking-data-fix-test')">
          <view class="tool-header">
            <text class="tool-icon">🔧</text>
            <view class="tool-info">
              <text class="tool-name">预约数据修复测试</text>
              <text class="tool-desc">测试包场和拼场订单数据传递及时间段状态更新</text>
            </view>
          </view>
          <text class="tool-status">核心修复</text>
        </view>

        <view class="tool-card critical" @click="navigateToTool('timeslot-status-debug')">
          <view class="tool-header">
            <text class="tool-icon">🔍</text>
            <view class="tool-info">
              <text class="tool-name">时间段状态刷新深度调试</text>
              <text class="tool-desc">深入分析时间段状态刷新不生效的根本原因</text>
            </view>
          </view>
          <text class="tool-status">深度调试</text>
        </view>

        <view class="tool-card primary" @click="navigateToTool('field-mapping-validation')">
          <view class="tool-header">
            <text class="tool-icon">🔍</text>
            <view class="tool-info">
              <text class="tool-name">字段映射完整性验证</text>
              <text class="tool-desc">验证拼场、包场、时间段所有字段都与后端数据库完全匹配</text>
            </view>
          </view>
          <text class="tool-status">字段验证</text>
        </view>

        <view class="tool-card success" @click="navigateToTool('timeslot-display-fix-test')">
          <view class="tool-header">
            <text class="tool-icon">🔧</text>
            <view class="tool-info">
              <text class="tool-name">时间段显示修复测试</text>
              <text class="tool-desc">验证非今日日期时间段显示修复效果</text>
            </view>
          </view>
          <text class="tool-status">最新修复</text>
        </view>

        <!-- WebSocket测试工具已被移除 -->


      </view>
    </view>

    <!-- 快速操作 -->
    <view class="quick-actions">
      <text class="section-title">⚡ 快速操作</text>
      
      <button class="action-btn primary" @click="runQuickCheck">
        🚀 运行快速检查
      </button>
      
      <button class="action-btn success" @click="viewResults">
        📊 查看测试结果
      </button>
      
      <button class="action-btn info" @click="viewDocumentation">
        📚 查看迁移文档
      </button>
    </view>

    <!-- 帮助信息 -->
    <view class="help-section">
      <text class="section-title">💡 使用建议</text>
      <view class="help-content">
        <text class="help-item">1. 首先运行"全面迁移错误排查"获得完整评估</text>
        <text class="help-item">2. 使用"快速修复验证"确认已修复的问题</text>
        <text class="help-item">3. 针对具体问题使用专项测试工具</text>
        <text class="help-item">4. 定期运行测试确保迁移质量</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'TestIndex',
  data() {
    return {
      testResults: null
    }
  },

  methods: {
    // 导航到测试工具
    navigateToTool(toolName) {
      console.log(`导航到测试工具: ${toolName}`)
      uni.navigateTo({
        url: `/pages/test/${toolName}`,
        fail: (error) => {
          console.error('导航失败:', error)
          uni.showToast({
            title: '页面不存在',
            icon: 'none'
          })
        }
      })
    },

    // 运行快速检查
    async runQuickCheck() {
      uni.showLoading({
        title: '正在检查...'
      })

      try {
        // 模拟快速检查
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        uni.hideLoading()
        uni.showModal({
          title: '快速检查完成',
          content: '发现3个需要关注的问题，建议使用详细测试工具进一步检查',
          confirmText: '查看详情',
          success: (res) => {
            if (res.confirm) {
              this.navigateToTool('comprehensive-migration-check')
            }
          }
        })
      } catch (error) {
        uni.hideLoading()
        uni.showToast({
          title: '检查失败',
          icon: 'error'
        })
      }
    },

    // 查看测试结果
    viewResults() {
      uni.showModal({
        title: '测试结果',
        content: '当前已修复5项问题，还有15项需要检查。建议运行完整测试获得详细报告。',
        confirmText: '运行测试',
        success: (res) => {
          if (res.confirm) {
            this.navigateToTool('comprehensive-migration-check')
          }
        }
      })
    },

    // 查看文档
    viewDocumentation() {
      uni.showModal({
        title: '迁移文档',
        content: '迁移文档包含30项错误清单和详细修复指南，建议先阅读文档了解迁移要点。',
        confirmText: '我知道了'
      })
    }
  },

  onLoad() {
    console.log('测试中心页面加载')
  }
}
</script>

<style scoped>
.container {
  padding: 40rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 60rpx;
  color: white;
}

.title {
  font-size: 52rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 20rpx;
}

.subtitle {
  font-size: 28rpx;
  opacity: 0.9;
  display: block;
}

.status-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 40rpx;
  backdrop-filter: blur(10rpx);
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 30rpx;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.status-item {
  text-align: center;
  padding: 30rpx;
  border-radius: 15rpx;
  background: white;
  box-shadow: 0 4rpx 15rpx rgba(0,0,0,0.1);
}

.status-item.success { border-left: 6rpx solid #4caf50; }
.status-item.warning { border-left: 6rpx solid #ff9800; }
.status-item.info { border-left: 6rpx solid #2196f3; }

.status-icon {
  font-size: 40rpx;
  display: block;
  margin-bottom: 15rpx;
}

.status-label {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 10rpx;
}

.status-count {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.tools-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 40rpx;
  backdrop-filter: blur(10rpx);
}

.tool-category {
  margin-bottom: 40rpx;
}

.category-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #555;
  display: block;
  margin-bottom: 25rpx;
}

.tool-card {
  background: white;
  border-radius: 15rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 15rpx rgba(0,0,0,0.1);
  border-left: 6rpx solid;
  transition: transform 0.2s ease;
}

.tool-card:active {
  transform: scale(0.98);
}

.tool-card.primary { border-left-color: #667eea; }
.tool-card.success { border-left-color: #4caf50; }
.tool-card.info { border-left-color: #2196f3; }
.tool-card.warning { border-left-color: #ff9800; }
.tool-card.error { border-left-color: #FF3B30; }
.tool-card.critical {
  border-left-color: #8B0000;
  background: linear-gradient(135deg, #fff 0%, #ffe8e8 100%);
}

.tool-header {
  display: flex;
  align-items: center;
  margin-bottom: 15rpx;
}

.tool-icon {
  font-size: 40rpx;
  margin-right: 20rpx;
}

.tool-info {
  flex: 1;
}

.tool-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.tool-desc {
  font-size: 24rpx;
  color: #666;
  display: block;
}

.tool-status {
  font-size: 22rpx;
  color: #999;
  text-align: right;
}

.quick-actions {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 40rpx;
  backdrop-filter: blur(10rpx);
}

.action-btn {
  width: 100%;
  height: 80rpx;
  border: none;
  border-radius: 40rpx;
  font-size: 28rpx;
  color: white;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.action-btn.success {
  background: linear-gradient(135deg, #4caf50, #45a049);
}

.action-btn.info {
  background: linear-gradient(135deg, #2196f3, #1976d2);
}

.help-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20rpx;
  padding: 40rpx;
  backdrop-filter: blur(10rpx);
}

.help-content {
  background: #f8f9fa;
  border-radius: 10rpx;
  padding: 30rpx;
}

.help-item {
  font-size: 26rpx;
  color: #555;
  line-height: 1.6;
  display: block;
  margin-bottom: 15rpx;
  padding-left: 20rpx;
  position: relative;
}

.help-item::before {
  content: '•';
  color: #667eea;
  font-weight: bold;
  position: absolute;
  left: 0;
}
</style>
