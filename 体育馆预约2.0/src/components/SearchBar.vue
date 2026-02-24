<template>
  <view class="search-bar" :class="{ 'focused': isFocused, 'has-value': searchValue }">
    <!-- 搜索输入框 -->
    <view class="search-input-container">
      <!-- 搜索图标 -->
      <view class="search-icon">
        <text class="icon-search">🔍</text>
      </view>
      
      <!-- 输入框 -->
      <input 
        class="search-input"
        type="text"
        :placeholder="placeholder"
        :value="searchValue"
        :focus="autoFocus"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @confirm="handleConfirm"
        confirm-type="search"
      />
      
      <!-- 清除按钮 -->
      <view 
        class="clear-btn"
        v-if="searchValue && showClearButton"
        @click="clearSearch"
      >
        <text class="icon-clear">✕</text>
      </view>
      
      <!-- 语音搜索按钮 -->
      <view 
        class="voice-btn"
        v-if="showVoiceButton && !searchValue"
        @click="startVoiceSearch"
      >
        <text class="icon-voice">🎤</text>
      </view>
    </view>
    
    <!-- 搜索按钮 -->
    <view 
      class="search-btn"
      v-if="showSearchButton"
      @click="handleSearch"
    >
      <text class="search-btn-text">{{ searchButtonText }}</text>
    </view>
    
    <!-- 取消按钮 -->
    <view 
      class="cancel-btn"
      v-if="showCancelButton && isFocused"
      @click="handleCancel"
    >
      <text class="cancel-btn-text">取消</text>
    </view>
  </view>
  
  <!-- 搜索建议 -->
  <view class="search-suggestions" v-if="showSuggestions && suggestions.length">
    <view 
      class="suggestion-item"
      v-for="(suggestion, index) in suggestions"
      :key="index"
      @click="selectSuggestion(suggestion)"
    >
      <!-- 建议图标 -->
      <view class="suggestion-icon">
        <text class="icon">{{ getSuggestionIcon(suggestion.type) }}</text>
      </view>
      
      <!-- 建议内容 -->
      <view class="suggestion-content">
        <text class="suggestion-text">{{ suggestion.text }}</text>
        <text class="suggestion-desc" v-if="suggestion.desc">{{ suggestion.desc }}</text>
      </view>
      
      <!-- 操作按钮 -->
      <view class="suggestion-actions">
        <!-- 填入按钮 -->
        <view 
          class="action-btn fill-btn"
          @click.stop="fillSuggestion(suggestion)"
        >
          <text class="action-icon">↖</text>
        </view>
        
        <!-- 删除按钮 -->
        <view 
          class="action-btn delete-btn"
          v-if="suggestion.type === 'history'"
          @click.stop="deleteSuggestion(suggestion, index)"
        >
          <text class="action-icon">✕</text>
        </view>
      </view>
    </view>
    
    <!-- 清空历史 -->
    <view 
      class="clear-history"
      v-if="hasHistorySuggestions"
      @click="clearHistory"
    >
      <text class="clear-history-text">清空搜索历史</text>
    </view>
  </view>
  
  <!-- 热门搜索 -->
  <view class="hot-searches" v-if="showHotSearches && hotSearches.length && !isFocused">
    <view class="hot-header">
      <text class="hot-title">热门搜索</text>
      <view class="hot-refresh" @click="refreshHotSearches">
        <text class="refresh-icon">🔄</text>
      </view>
    </view>
    
    <view class="hot-tags">
      <view 
        class="hot-tag"
        :class="{ 'hot-rank': index < 3 }"
        v-for="(item, index) in hotSearches"
        :key="index"
        @click="selectHotSearch(item)"
      >
        <text class="hot-rank-number" v-if="index < 3">{{ index + 1 }}</text>
        <text class="hot-tag-text">{{ item.text }}</text>
        <text class="hot-tag-count" v-if="item.count">{{ formatCount(item.count) }}</text>
      </view>
    </view>
  </view>
  
  <!-- 搜索历史 -->
  <view class="search-history" v-if="showSearchHistory && searchHistory.length && !isFocused">
    <view class="history-header">
      <text class="history-title">搜索历史</text>
      <view class="history-clear" @click="clearSearchHistory">
        <text class="clear-icon">🗑</text>
      </view>
    </view>
    
    <view class="history-tags">
      <view 
        class="history-tag"
        v-for="(item, index) in searchHistory.slice(0, maxHistoryCount)"
        :key="index"
        @click="selectHistory(item)"
      >
        <text class="history-tag-text">{{ item }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'SearchBar',
  
  props: {
    // 搜索值
    value: {
      type: String,
      default: ''
    },
    
    // 占位符
    placeholder: {
      type: String,
      default: '搜索场馆、运动项目...'
    },
    
    // 自动聚焦
    autoFocus: {
      type: Boolean,
      default: false
    },
    
    // 是否显示清除按钮
    showClearButton: {
      type: Boolean,
      default: true
    },
    
    // 是否显示语音按钮
    showVoiceButton: {
      type: Boolean,
      default: true
    },
    
    // 是否显示搜索按钮
    showSearchButton: {
      type: Boolean,
      default: false
    },
    
    // 搜索按钮文本
    searchButtonText: {
      type: String,
      default: '搜索'
    },
    
    // 是否显示取消按钮
    showCancelButton: {
      type: Boolean,
      default: true
    },
    
    // 是否显示搜索建议
    showSuggestions: {
      type: Boolean,
      default: true
    },
    
    // 搜索建议列表
    suggestions: {
      type: Array,
      default: () => []
    },
    
    // 是否显示热门搜索
    showHotSearches: {
      type: Boolean,
      default: true
    },
    
    // 热门搜索列表
    hotSearches: {
      type: Array,
      default: () => []
    },
    
    // 是否显示搜索历史
    showSearchHistory: {
      type: Boolean,
      default: true
    },
    
    // 搜索历史列表
    searchHistory: {
      type: Array,
      default: () => []
    },
    
    // 最大历史记录数量
    maxHistoryCount: {
      type: Number,
      default: 10
    },
    
    // 防抖延迟（毫秒）
    debounceDelay: {
      type: Number,
      default: 300
    }
  },
  
  data() {
    return {
      searchValue: this.value,
      isFocused: false,
      debounceTimer: null
    }
  },
  
  computed: {
    // 是否有历史建议
    hasHistorySuggestions() {
      return this.suggestions.some(item => item.type === 'history')
    }
  },
  
  watch: {
    value(newVal) {
      this.searchValue = newVal
    }
  },
  
  methods: {
    // 输入处理
    handleInput(e) {
      this.searchValue = e.detail.value
      this.$emit('input', this.searchValue)
      
      // 防抖处理搜索建议
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }
      
      this.debounceTimer = setTimeout(() => {
        this.$emit('search-input', this.searchValue)
      }, this.debounceDelay)
    },
    
    // 聚焦处理
    handleFocus() {
      this.isFocused = true
      this.$emit('focus')
    },
    
    // 失焦处理
    handleBlur() {
      // 延迟失焦，避免点击建议时立即隐藏
      setTimeout(() => {
        this.isFocused = false
        this.$emit('blur')
      }, 200)
    },
    
    // 确认搜索
    handleConfirm() {
      this.handleSearch()
    },
    
    // 执行搜索
    handleSearch() {
      if (this.searchValue.trim()) {
        this.$emit('search', this.searchValue.trim())
        this.addToHistory(this.searchValue.trim())
      }
    },
    
    // 取消搜索
    handleCancel() {
      this.searchValue = ''
      this.isFocused = false
      this.$emit('input', '')
      this.$emit('cancel')
    },
    
    // 清除搜索
    clearSearch() {
      this.searchValue = ''
      this.$emit('input', '')
      this.$emit('clear')
    },
    
    // 开始语音搜索
    startVoiceSearch() {
      // #ifdef APP-PLUS
      uni.startSoterAuthentication({
        requestAuthModes: ['speech'],
        challenge: '语音搜索',
        authContent: '请说出要搜索的内容',
        success: (res) => {
          if (res.authMode === 'speech' && res.resultJSON) {
            const result = JSON.parse(res.resultJSON)
            if (result.text) {
              this.searchValue = result.text
              this.$emit('input', this.searchValue)
              this.handleSearch()
            }
          }
        },
        fail: (err) => {
          console.log('语音搜索失败:', err)
        }
      })
      // #endif
      
      // #ifndef APP-PLUS
      uni.showToast({
        title: '语音搜索仅在App中支持',
        icon: 'none'
      })
      // #endif
      
      this.$emit('voice-search')
    },
    
    // 选择搜索建议
    selectSuggestion(suggestion) {
      this.searchValue = suggestion.text
      this.$emit('input', this.searchValue)
      this.$emit('suggestion-select', suggestion)
      this.handleSearch()
    },
    
    // 填入搜索建议
    fillSuggestion(suggestion) {
      this.searchValue = suggestion.text
      this.$emit('input', this.searchValue)
    },
    
    // 删除搜索建议
    deleteSuggestion(suggestion, index) {
      this.$emit('suggestion-delete', { suggestion, index })
    },
    
    // 清空历史建议
    clearHistory() {
      this.$emit('clear-suggestions')
    },
    
    // 选择热门搜索
    selectHotSearch(item) {
      this.searchValue = item.text
      this.$emit('input', this.searchValue)
      this.$emit('hot-search-select', item)
      this.handleSearch()
    },
    
    // 刷新热门搜索
    refreshHotSearches() {
      this.$emit('refresh-hot-searches')
    },
    
    // 选择搜索历史
    selectHistory(item) {
      this.searchValue = item
      this.$emit('input', this.searchValue)
      this.$emit('history-select', item)
      this.handleSearch()
    },
    
    // 清空搜索历史
    clearSearchHistory() {
      this.$emit('clear-history')
    },
    
    // 添加到历史记录
    addToHistory(text) {
      this.$emit('add-history', text)
    },
    
    // 获取建议图标
    getSuggestionIcon(type) {
      const iconMap = {
        'history': '🕐',
        'venue': '🏟',
        'sport': '⚽',
        'location': '📍',
        'user': '👤',
        'default': '🔍'
      }
      return iconMap[type] || iconMap.default
    },
    
    // 格式化数量
    formatCount(count) {
      if (count < 1000) {
        return count.toString()
      } else if (count < 10000) {
        return (count / 1000).toFixed(1) + 'k'
      } else {
        return (count / 10000).toFixed(1) + 'w'
      }
    }
  },
  
  beforeDestroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
  }
}
</script>

<style lang="scss" scoped>
.search-bar {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: #ffffff;
  
  &.focused {
    .search-input-container {
      border-color: #ff6b35;
      box-shadow: 0 0 0 2rpx rgba(255, 107, 53, 0.2);
    }
  }
  
  &.has-value {
    .search-input {
      color: #333333;
    }
  }
}

// 搜索输入容器
.search-input-container {
  flex: 1;
  display: flex;
  align-items: center;
  background-color: #f8f8f8;
  border: 1rpx solid #e8e8e8;
  border-radius: 24rpx;
  padding: 0 24rpx;
  height: 72rpx;
  transition: all 0.3s;
  
  .search-icon {
    margin-right: 16rpx;
    
    .icon-search {
      font-size: 32rpx;
      color: #999999;
    }
  }
  
  .search-input {
    flex: 1;
    font-size: 28rpx;
    color: #666666;
    background-color: transparent;
    border: none;
    outline: none;
    
    &::placeholder {
      color: #cccccc;
    }
  }
  
  .clear-btn,
  .voice-btn {
    margin-left: 16rpx;
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    
    &:active {
      background-color: rgba(0, 0, 0, 0.1);
    }
    
    .icon-clear,
    .icon-voice {
      font-size: 28rpx;
      color: #999999;
    }
  }
}

// 搜索按钮
.search-btn {
  margin-left: 20rpx;
  padding: 16rpx 32rpx;
  background-color: #ff6b35;
  border-radius: 24rpx;
  
  .search-btn-text {
    font-size: 28rpx;
    color: #ffffff;
    font-weight: 600;
  }
}

// 取消按钮
.cancel-btn {
  margin-left: 20rpx;
  padding: 16rpx 24rpx;
  
  .cancel-btn-text {
    font-size: 28rpx;
    color: #666666;
  }
}

// 搜索建议
.search-suggestions {
  background-color: #ffffff;
  border-top: 1rpx solid #f0f0f0;
  max-height: 60vh;
  overflow-y: auto;
  
  .suggestion-item {
    display: flex;
    align-items: center;
    padding: 24rpx 30rpx;
    border-bottom: 1rpx solid #f8f8f8;
    
    &:active {
      background-color: #f8f8f8;
    }
    
    .suggestion-icon {
      margin-right: 20rpx;
      
      .icon {
        font-size: 32rpx;
      }
    }
    
    .suggestion-content {
      flex: 1;
      
      .suggestion-text {
        font-size: 28rpx;
        color: #333333;
        margin-bottom: 4rpx;
      }
      
      .suggestion-desc {
        font-size: 24rpx;
        color: #999999;
      }
    }
    
    .suggestion-actions {
      display: flex;
      align-items: center;
      gap: 16rpx;
      
      .action-btn {
        width: 48rpx;
        height: 48rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background-color: #f0f0f0;
        
        &:active {
          background-color: #e0e0e0;
        }
        
        .action-icon {
          font-size: 24rpx;
          color: #666666;
        }
        
        &.delete-btn {
          .action-icon {
            color: #ff4d4f;
          }
        }
      }
    }
  }
  
  .clear-history {
    padding: 24rpx 30rpx;
    text-align: center;
    border-top: 1rpx solid #f0f0f0;
    
    .clear-history-text {
      font-size: 26rpx;
      color: #999999;
    }
  }
}

// 热门搜索
.hot-searches {
  background-color: #ffffff;
  padding: 30rpx;
  border-top: 1rpx solid #f0f0f0;
  
  .hot-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    
    .hot-title {
      font-size: 28rpx;
      font-weight: 600;
      color: #333333;
    }
    
    .hot-refresh {
      padding: 8rpx;
      
      .refresh-icon {
        font-size: 28rpx;
        color: #999999;
      }
    }
  }
  
  .hot-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    
    .hot-tag {
      display: flex;
      align-items: center;
      padding: 12rpx 20rpx;
      background-color: #f8f8f8;
      border-radius: 20rpx;
      border: 1rpx solid transparent;
      
      &.hot-rank {
        background: linear-gradient(135deg, #ff6b35, #f7931e);
        
        .hot-rank-number,
        .hot-tag-text {
          color: #ffffff;
        }
      }
      
      &:active {
        background-color: #e8e8e8;
        
        &.hot-rank {
          opacity: 0.8;
        }
      }
      
      .hot-rank-number {
        font-size: 20rpx;
        font-weight: 600;
        margin-right: 8rpx;
        min-width: 24rpx;
        text-align: center;
      }
      
      .hot-tag-text {
        font-size: 26rpx;
        color: #666666;
      }
      
      .hot-tag-count {
        font-size: 20rpx;
        color: #999999;
        margin-left: 8rpx;
      }
    }
  }
}

// 搜索历史
.search-history {
  background-color: #ffffff;
  padding: 30rpx;
  border-top: 1rpx solid #f0f0f0;
  
  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    
    .history-title {
      font-size: 28rpx;
      font-weight: 600;
      color: #333333;
    }
    
    .history-clear {
      padding: 8rpx;
      
      .clear-icon {
        font-size: 28rpx;
        color: #999999;
      }
    }
  }
  
  .history-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    
    .history-tag {
      padding: 12rpx 20rpx;
      background-color: #f8f8f8;
      border-radius: 20rpx;
      
      &:active {
        background-color: #e8e8e8;
      }
      
      .history-tag-text {
        font-size: 26rpx;
        color: #666666;
      }
    }
  }
}
</style>