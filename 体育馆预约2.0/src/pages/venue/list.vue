<template>
  <view class="container">
    <!-- 搜索栏 -->
    <view class="search-section">
      <view class="search-bar">
        <input 
          v-model="searchKeyword" 
          placeholder="搜索场馆名称或地址" 
          class="search-input"
          @input="onSearchInput"
          @confirm="handleSearch"
          confirm-type="search"
        />
        <view class="search-icon" @click="handleSearch">
          <text>🔍</text>
        </view>
      </view>
    </view>
    
    <!-- 筛选栏 -->
    <view class="filter-section">
      <scroll-view class="filter-scroll" scroll-x>
        <view class="filter-item" 
              :class="{ active: selectedType === '' }" 
              @click="selectType('')">
          全部
        </view>
        <view 
          v-for="type in (venueTypes && Array.isArray(venueTypes) ? venueTypes : [])" 
          :key="type.id" 
          class="filter-item"
          :class="{ active: selectedType === type.id }"
          @click="selectType(type.id)"
        >
          {{ type.name }}
        </view>
      </scroll-view>
      <view class="filter-more" @click="showFilterModal">
        <text>筛选</text>
      </view>
    </view>
    
    <!-- 场馆列表 -->
    <view class="venue-list">
      <view 
        v-for="venue in (filteredVenues && Array.isArray(filteredVenues) ? filteredVenues : [])" 
        :key="venue.id" 
        class="venue-card"
        @click="navigateToDetail(venue.id)"
      >
        <image :src="(venue.image) || '/static/default-venue.jpg'" class="venue-image" mode="aspectFill" />
        <view class="venue-info">
          <view class="venue-header">
            <text class="venue-name">{{ venue.name || '未知场馆' }}</text>
            <view class="venue-rating">
              <text class="rating-score">{{ venue.rating || '4.5' }}</text>
              <text class="rating-star">⭐</text>
            </view>
          </view>
          <text class="venue-location">📍 {{ venue.location || '位置未知' }}</text>
          <view class="venue-tags">
            <text class="venue-tag">{{ venue.type || '运动场馆' }}</text>
            <text v-if="venue.supportSharing" class="venue-tag sharing-tag">支持拼场</text>
          </view>
          <view class="venue-footer">
            <view class="venue-price">
              <text class="price-text">¥{{ venue.price || 0 }}</text>
              <text class="price-unit">/小时</text>
            </view>
            <view class="venue-status" :class="getStatusClass(venue.status)">
              {{ getStatusText(venue.status) }}
            </view>
          </view>
        </view>
      </view>
      
      <!-- 无数据提示 -->
      <view v-if="(!filteredVenues || !Array.isArray(filteredVenues) || filteredVenues.length === 0) && !loading" class="no-data">
        <text class="no-data-text">{{ searchKeyword ? '未找到相关场馆' : '暂无场馆数据' }}</text>
      </view>
    </view>
    
    <!-- 加载更多 -->
    <view v-if="hasMore" class="load-more" @click="loadMore">
      <text>{{ loading ? '加载中...' : '加载更多' }}</text>
    </view>
    
    <!-- 筛选弹窗 -->
    <view class="popup-container" id="popup-wrapper">
      <!-- 使用更明确的ID和ref名称 -->
      <uni-popup 
        ref="filterPopup" 
        id="filter-popup-component"
        type="bottom" 
        :mask-click="false" 
        :safe-area="false"
        :animation="true"
        background-color="#fff"
        @change="popupChange"
        :custom-style="{position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999}"
      >
        <view class="filter-modal" v-show="internalPopupOpened">
          <view class="modal-header">
        <text class="modal-title">筛选条件</text>
        <text class="modal-close" @click="closeFilterModal">✕</text>
      </view>
      
          <view class="filter-content">
            <!-- 价格筛选 -->
            <view class="filter-group">
              <text class="group-title">价格范围</text>
              <view class="price-range">
                <input 
                  v-model="filterOptions.minPrice" 
                  type="number" 
                  placeholder="最低价格" 
                  class="price-input"
                />
                <text class="price-separator">-</text>
                <input 
                  v-model="filterOptions.maxPrice" 
                  type="number" 
                  placeholder="最高价格" 
                  class="price-input"
                />
              </view>
            </view>
            
            <!-- 距离筛选 -->
            <view class="filter-group">
              <text class="group-title">距离范围</text>
              <view class="distance-options">
                <view 
                  v-for="distance in (distanceOptions && Array.isArray(distanceOptions) ? distanceOptions : [])" 
                  :key="distance.value" 
                  class="distance-item"
                  :class="{ active: filterOptions.distance === distance.value }"
                  @click="selectDistance(distance.value)"
                >
                  {{ distance.label }}
                </view>
              </view>
            </view>
            
            <!-- 设施筛选 -->
            <view class="filter-group">
              <text class="group-title">设施要求</text>
              <view class="facility-options">
                <view 
                  v-for="facility in (facilityOptions && Array.isArray(facilityOptions) ? facilityOptions : [])" 
                  :key="facility.value" 
                  class="facility-item"
                  :class="{ active: (filterOptions.facilities && Array.isArray(filterOptions.facilities) ? filterOptions.facilities : []).includes(facility.value) }"
                  @click="toggleFacility(facility.value)"
                >
                  {{ facility.label }}
                </view>
              </view>
            </view>
          </view>
          
          <view class="modal-footer">
            <button class="reset-btn" @click="resetFilter">重置</button>
            <button class="confirm-btn" @click="applyFilter">确定</button>
          </view>
        </view>
      </uni-popup>
    </view>
  </view>
</template>

<script>
import { useVenueStore } from '@/stores/venue.js'
import { debounce } from '@/utils/helpers.js'

export default {
  name: 'VenueList',
  
  components: {
    // 使用easycom自动注册组件
  },
  
  data() {
    return {
      venueStore: null,
      searchKeyword: '',
      selectedType: '',
      searchInputTimer: null, // 搜索输入防抖定时器

      // 弹窗状态控制
      internalPopupOpened: false,
      popupPosition: null, // 存储弹窗位置信息
      _popupRef: null, // 缓存弹窗引用
      
      // 筛选选项
      filterOptions: {
        minPrice: '',
        maxPrice: '',
        distance: '',
        facilities: []
      },
      
      // 距离选项
      distanceOptions: [
        { label: '1km内', value: 1 },
        { label: '3km内', value: 3 },
        { label: '5km内', value: 5 },
        { label: '10km内', value: 10 }
      ],
      
      // 设施选项
      facilityOptions: [
        { label: '停车场', value: 'parking' },
        { label: '淋浴间', value: 'shower' },
        { label: '更衣室', value: 'locker' },
        { label: 'WiFi', value: 'wifi' },
        { label: '空调', value: 'ac' },
        { label: '器材租赁', value: 'equipment' }
      ],
      
      // 缓存相关
      lastRefreshTime: 0,
      cacheTimeout: 30000, // 30秒缓存
      isRefreshing: false
    }
  },
  
  computed: {
    venueList() {
      return this.venueStore?.venueListGetter || []
    },

    venueTypes() {
      return this.venueStore?.venueTypesGetter || []
    },

    searchResults() {
      return this.venueStore?.searchResultsGetter || []
    },

    loading() {
      return this.venueStore?.isLoading || false
    },

    pagination() {
      return this.venueStore?.getPagination || { current: 0, totalPages: 0 }
    },
    
    filteredVenues() {
      if (this.searchKeyword && this.searchKeyword.trim()) {

        // 如果后端搜索结果为空，使用前端过滤作为备用方案
        if (!Array.isArray(this.searchResults) || this.searchResults.length === 0) {
          const keyword = this.searchKeyword.trim().toLowerCase()
          const filtered = this.venueList.filter(venue => {
            if (!venue) return false

            // 搜索场馆名称
            const nameMatch = venue.name && venue.name.toLowerCase().includes(keyword)
            // 搜索场馆地址
            const locationMatch = venue.location && venue.location.toLowerCase().includes(keyword)
            // 搜索场馆类型
            const typeMatch = venue.type && venue.type.toLowerCase().includes(keyword)

            return nameMatch || locationMatch || typeMatch
          })

          return filtered
        }

        return Array.isArray(this.searchResults) ? this.searchResults : []
      }
      return Array.isArray(this.venueList) ? this.venueList : []
    },
    
    hasMore() {
      return this.pagination && this.pagination.current < this.pagination.totalPages
    }
  },
  
  onLoad() {
    
    // 初始化Pinia store
    this.venueStore = useVenueStore()

    // 确保store正确初始化
    if (!this.venueStore) {
      console.error('VenueStore初始化失败')
      uni.showToast({
        title: 'Store初始化失败',
        icon: 'error'
      })
      return
    }

    this.initData()
    
    // 预先初始化popup组件引用
    setTimeout(() => {
      if (this.$refs.filterPopup) {
        this._popupRef = this.$refs.filterPopup
      }
    }, 100)
  },
  
  onShow() {
    // 页面显示时使用缓存优化的刷新
    this.refreshDataWithCache()
  },
  
  onPullDownRefresh() {
    this.refreshData()
  },
  
  onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.loadMore()
    }
  },
  
  onUnload() {
    // 清理搜索输入定时器
    if (this.searchInputTimer) {
      clearTimeout(this.searchInputTimer)
      this.searchInputTimer = null
    }
  },
  
  onReady() {
    // 预先获取filterPopup的ref，确保组件已经完全加载
    this.$nextTick(() => {
      // 增加延迟时间，确保组件完全加载
      setTimeout(() => {
        let popup = this.$refs.filterPopup
        if (popup) {
          // 缓存组件引用
          this._popupRef = popup
        } else {
          // 再次尝试获取引用
          setTimeout(() => {
            let popup = this.$refs.filterPopup
            if (popup) {
              this._popupRef = popup
            } else {
              // 第三次尝试
              setTimeout(() => {
                let popup = this.$refs.filterPopup
                if (popup) {
                  this._popupRef = popup
                }
              }, 1000)
            }
          }, 500)
        }
      }, 500)
    })
  },
  
  // 添加onMounted生命周期钩子
  onMounted() {
    // 在组件挂载后尝试获取popup引用
    this.$nextTick(() => {
      const tryGetPopupRef = (attempt = 1) => {
        const popup = this.$refs.filterPopup
        if (popup) {
          this._popupRef = popup
          return true
        }
        return false
      }
      
      // 立即尝试
      if (!tryGetPopupRef(1)) {
        // 200ms后尝试
        setTimeout(() => {
          if (!tryGetPopupRef(2)) {
            // 500ms后尝试
            setTimeout(() => {
              if (!tryGetPopupRef(3)) {
                // 1000ms后尝试
                setTimeout(() => {
                  tryGetPopupRef(4)
                }, 1000)
              }
            }, 500)
          }
        }, 200)
      }
    })
  },
  
  mounted() {
    
    // 移除进入时强制close，交由显式状态控制
  },
  
  methods: {
    
    // 初始化数据
    async initData() {
      try {
        
        const results = await Promise.all([
          this.venueStore.getVenueList({ page: 1, pageSize: 50 }),
          this.venueStore.getVenueTypes()
        ])
        
        
        this.updatePagination()
        
      } catch (error) {
        console.error('初始化数据失败:', error)
        
        uni.showToast({
          title: '数据加载失败',
          icon: 'none'
        })
      }
    },
    
    // 刷新数据
    async refreshData() {
      try {
        await this.venueStore.getVenueList({ page: 1, pageSize: 50, refresh: true })
        this.updatePagination()
        uni.stopPullDownRefresh()
      } catch (error) {
        uni.stopPullDownRefresh()
        console.error('刷新数据失败:', error)
      }
    },
    
    // 加载更多
    async loadMore() {
      // 如果正在搜索状态，不允许加载更多
      if (this.searchKeyword && this.searchKeyword.trim()) {
        return
      }

      if (this.loading || !this.hasMore) return

      try {
        const nextPage = this.pagination.current + 1
        const params = {
          page: nextPage,
          pageSize: 50
        }

        // 只添加有值的参数
        if (this.selectedType) {
          params.type = this.selectedType
        }
        if (this.filterOptions.minPrice) {
          params.minPrice = Number(this.filterOptions.minPrice)
        }
        if (this.filterOptions.maxPrice) {
          params.maxPrice = Number(this.filterOptions.maxPrice)
        }
        if (this.filterOptions.distance) {
          params.distance = this.filterOptions.distance
        }
        if (this.filterOptions.facilities && Array.isArray(this.filterOptions.facilities) && this.filterOptions.facilities.length > 0) {
          params.facilities = this.filterOptions.facilities.join(',')
        }

        await this.venueStore.getVenueList(params)
        this.updatePagination()
        
      } catch (error) {
        console.error('加载更多失败:', error)
        
        uni.showToast({
          title: '加载更多失败',
          icon: 'error'
        })
      }
    },
    
    // 更新分页状态
    updatePagination() {
      // hasMore已经通过computed属性计算，这里不需要重复赋值
    },
    
    // 搜索输入处理
    onSearchInput() {
      // 使用防抖处理搜索输入
      if (this.searchInputTimer) {
        clearTimeout(this.searchInputTimer)
      }

      this.searchInputTimer = setTimeout(() => {
        try {
          // 如果搜索关键词为空，清空搜索结果
          if (!this.searchKeyword || !this.searchKeyword.trim()) {
            if (this.venueStore && this.venueStore.clearSearchResults) {
              this.venueStore.clearSearchResults()
            }
            return
          }

          // 自动触发搜索（用户体验更好）
          this.handleSearch()
        } catch (error) {
          console.error('[VenueList] 搜索输入处理失败:', error)
        }
      }, 800)
    },
    
    // 处理搜索
    async handleSearch() {
      const trimmedKeyword = this.searchKeyword ? this.searchKeyword.trim() : ''
      
      try {
        if (!trimmedKeyword) {
          // 如果搜索关键词为空，清空搜索结果并重新加载场馆列表
          this.venueStore.clearSearchResults()
          await this.venueStore.getVenueList({ page: 1, pageSize: 50, refresh: true })
          this.updatePagination()
          return
        }

        // 构建搜索参数
        const searchParams = {
          keyword: trimmedKeyword,
          page: 1,
          pageSize: 50
        }

        // 添加筛选条件
        if (this.selectedType) {
          searchParams.type = this.selectedType
        }
        if (this.filterOptions.minPrice) {
          searchParams.minPrice = Number(this.filterOptions.minPrice)
        }
        if (this.filterOptions.maxPrice) {
          searchParams.maxPrice = Number(this.filterOptions.maxPrice)
        }
        if (this.filterOptions.distance) {
          searchParams.distance = this.filterOptions.distance
        }
        if (this.filterOptions.facilities && Array.isArray(this.filterOptions.facilities) && this.filterOptions.facilities.length > 0) {
          searchParams.facilities = this.filterOptions.facilities.join(',')
        }

        const searchResult = await this.venueStore.searchVenues(searchParams)

      } catch (error) {
        console.error('搜索失败:', error)
        
        uni.showToast({
          title: '搜索失败，请重试',
          icon: 'error'
        })
      }
    },
    
    // 选择场馆类型
    async selectType(typeId) {
      this.selectedType = typeId
      
      // 如果选择"全部"，清空搜索关键词和重置筛选条件
      if (typeId === '') {
        this.searchKeyword = ''
        this.resetFilter()
        // 清空搜索结果
        this.venueStore.setSearchResults([])
      }
      
      try {
        const params = { 
          page: 1, 
          pageSize: 50, 
          refresh: true,
          ...this.filterOptions
        }
        
        // 只有当typeId不为空时才添加type参数
        if (typeId) {
          params.type = typeId
        }
        
        await this.venueStore.getVenueList(params)
        this.updatePagination()
      } catch (error) {
        console.error('筛选失败:', error)
      }
    },
    
    // 跳转到详情页
    navigateToDetail(venueId) {
      uni.navigateTo({
        url: `/pages/venue/detail?id=${venueId}`
      })
    },
    
    // 显示筛选弹窗
    showFilterModal() {
      // 调试开关 - 可以通过设置this.enablePopupDebug = true来启用详细调试
      const debugEnabled = this.enablePopupDebug || false
      
      if (debugEnabled) {
      }
      
      // 强制设置内部状态为true，确保模板显示
      this.internalPopupOpened = true
      
      // 使用新的API替代废弃的getSystemInfoSync
      const sysInfo = {
        ...uni.getWindowInfo(),
        ...uni.getDeviceInfo(),
        ...uni.getAppBaseInfo()
      }

      // 简化的弹窗打开逻辑
      const openPopup = () => {
        let popup = null
        
        // 1. 直接通过$refs获取弹窗组件实例
        popup = this.$refs.filterPopup
        
        // 处理数组情况
        if (Array.isArray(popup)) {
          popup = popup[0]
          if (debugEnabled) {
          }
        }
        
        // 2. 如果没有直接引用，尝试使用缓存的引用
        if (!popup && this._popupRef) {
          popup = this._popupRef
          if (debugEnabled) {
          }
        }
        
        // 3. 在微信小程序环境下，如果$refs失败，尝试使用$scope.selectComponent
        if (!popup && (sysInfo.platform === 'mp-weixin' || sysInfo.platform === 'devtools')) {
          try {
            if (this.$scope && typeof this.$scope.selectComponent === 'function') {
              const componentInstance = this.$scope.selectComponent('#filter-popup-component')

              // 检查是否有正确的方法
              if (componentInstance && typeof componentInstance.open === 'function') {
                popup = componentInstance
                if (debugEnabled) {
                }
              } else if (componentInstance) {
                // 尝试从组件实例中获取uni-popup子组件
                if (debugEnabled) {
                }
                
                // 方法1: 检查是否有$refs属性
                if (componentInstance.$refs && componentInstance.$refs.popup) {
                  popup = componentInstance.$refs.popup
                  if (debugEnabled) {
                  }
                } 
                // 方法2: 检查是否有selectComponent方法
                else if (typeof componentInstance.selectComponent === 'function') {
                  try {
                    popup = componentInstance.selectComponent('.uni-popup')
                    if (debugEnabled) {
                    }
                  } catch (e) {
                    if (debugEnabled) {
                    }
                  }
                }
                // 方法3: 检查组件实例本身是否就是uni-popup的包装
                else if (componentInstance.data && componentInstance.setData) {
                  // 这可能是微信小程序的组件实例，尝试调用其方法
                  if (debugEnabled) {
                  }
                  if (typeof componentInstance.open === 'function') {
                    popup = componentInstance
                  }
                }
              }
            }
          } catch (e) {
            if (debugEnabled) {
            }
          }
        }
        
        // 检查弹窗引用状态并尝试打开
        if (popup) {
          if (typeof popup.open === 'function') {
            try {
              popup.open('bottom')
              this._popupRef = popup // 缓存引用
              if (debugEnabled) {
              }
              
              // 微信小程序环境下，确保弹窗样式正确
              if (sysInfo.platform === 'mp-weixin' || sysInfo.platform === 'devtools') {
                setTimeout(() => {
                  this.applyPopupStyles()
                }, 50)
              }
              
              return true
            } catch (e) {
              if (debugEnabled) {
                console.error('打开弹窗时发生错误:', e)
              }
              return false
            }
          } else {
            if (debugEnabled) {
              console.error('组件实例没有open方法，尝试备选方案')
            }
            // 备选方案：直接设置内部状态并强制显示
            this.internalPopupOpened = true
            this.$forceUpdate()
            
            // 通过DOM操作显示弹窗
            setTimeout(() => {
              const popupEl = document.querySelector('#filter-popup-component')
              if (popupEl) {
                popupEl.style.display = 'block'
                popupEl.style.zIndex = '999'
                if (debugEnabled) {
                }
                return true
              }
            }, 100)
            
            return false
          }
        } else {
          if (debugEnabled) {
            console.error('filterPopup ref未找到或open未就绪(env: ' + sysInfo.platform + ',' + sysInfo.uniPlatform + ',' + sysInfo.SDKVersion + ')')
          }
          return false
        }
      }
      
      // 尝试打开弹窗，如果失败则进行简单重试
      if (!openPopup()) {
        // 延迟100ms后重试一次
        setTimeout(() => {
          if (!openPopup()) {
            if (debugEnabled) {
              console.error('弹窗打开失败，请检查组件是否正确渲染')
              uni.showToast({
                title: '弹窗打开失败',
                icon: 'none'
              })
            }
          }
        }, 100)
      }
    },
    

    
    // 强制创建弹窗
    forceCreatePopup() {
      // 调试开关 - 可以通过设置this.enablePopupDebug = true来启用详细调试
      const debugEnabled = this.enablePopupDebug || false
      
      if (debugEnabled) {
      }
      
      // 使用新的API替代废弃的getSystemInfoSync
      const sysInfo = {
        ...uni.getWindowInfo(),
        ...uni.getDeviceInfo(),
        ...uni.getAppBaseInfo()
      }
      
      // 通知用户
      uni.showToast({ 
        title: '正在准备筛选...', 
        icon: 'none',
        duration: 1500
      })
      
      // 强制重新渲染
      this.$forceUpdate()
      
      // 尝试通过选择器获取弹窗组件位置信息（仅用于调试）
      const query = uni.createSelectorQuery().in(this)
      query.select('#filter-popup-component').boundingClientRect(data => {
        if (debugEnabled) {
        }
        
        // 如果找到DOM元素，记录位置信息
        if (data) {
          this.popupPosition = {
            ...this.popupPosition,
            forceCreateRect: data,
            timestamp: Date.now()
          }
        }
      }).exec()
      
      // 延迟后尝试获取弹窗引用并打开
      setTimeout(() => {
        let popup = null
        
        // 1. 直接通过$refs获取弹窗组件实例
        popup = this.$refs.filterPopup
        
        // 处理数组情况
        if (Array.isArray(popup)) {
          popup = popup[0]
          if (debugEnabled) {
          }
        }
        
        // 2. 如果没有直接引用，尝试使用缓存的引用
        if (!popup && this._popupRef) {
          popup = this._popupRef
          if (debugEnabled) {
          }
        }
        
        // 3. 在微信小程序环境下，如果$refs失败，尝试使用$scope.selectComponent
        if (!popup && (sysInfo.platform === 'mp-weixin' || sysInfo.platform === 'devtools')) {
          try {
            if (this.$scope && typeof this.$scope.selectComponent === 'function') {
              popup = this.$scope.selectComponent('#filter-popup-component')
              if (debugEnabled) {
              }
            }
          } catch (e) {
            if (debugEnabled) {
            }
          }
        }
        
        // 检查弹窗引用状态并尝试打开
        if (popup && typeof popup.open === 'function') {
          try {
            popup.open('bottom')
            this._popupRef = popup
            this.internalPopupOpened = true
            if (debugEnabled) {
            }
            
            // 应用样式
            setTimeout(() => {
              this.applyPopupStyles()
              
              // 在微信小程序环境下创建样式元素强制修复弹窗位置
              if (sysInfo.platform === 'mp-weixin' || sysInfo.platform === 'devtools') {
                try {
                  const styleId = 'filter-popup-fix-style'
                  let styleEl = document.getElementById(styleId)
                  
                  // 如果样式元素不存在，则创建
                  if (!styleEl) {
                    styleEl = document.createElement('style')
                    styleEl.id = styleId
                    document.head.appendChild(styleEl)
                  }
                  
                  // 设置样式内容
                  styleEl.innerHTML = `
                    #uni-popup-bottom {
                      bottom: 0 !important;
                      left: 0 !important;
                      right: 0 !important;
                      position: fixed !important;
                      z-index: 999 !important;
                    }
                    .uni-popup-bottom {
                      bottom: 0 !important;
                      left: 0 !important;
                      right: 0 !important;
                      position: fixed !important;
                      z-index: 999 !important;
                    }
                  `
                } catch (styleError) {
                  if (debugEnabled) {
                    console.error('应用强制样式失败:', styleError)
                  }
                }
              }
            }, 100)
          } catch (e) {
            if (debugEnabled) {
              console.error('forceCreatePopup: 打开弹窗时发生错误:', e)
            }
            // 回退到fallbackToRefsMethod
            this.fallbackToRefsMethod()
          }
        } else {
          if (debugEnabled) {
          }
          // 回退到fallbackToRefsMethod
          this.fallbackToRefsMethod()
        }
      }, 200)
    },

    // 回退到$refs方式的方法
    fallbackToRefsMethod() {
      // 调试开关 - 可以通过设置this.enablePopupDebug = true来启用详细调试
      const debugEnabled = this.enablePopupDebug || false
      
      if (debugEnabled) {
      }
      let popup = null
      
      // 尝试使用缓存的引用
      if (this._popupRef && typeof this._popupRef.open === 'function') {
        popup = this._popupRef
        if (debugEnabled) {
        }
      } else if (this.$refs.filterPopup) {
        if (Array.isArray(this.$refs.filterPopup)) {
          popup = this.$refs.filterPopup[0]
          if (debugEnabled) {
          }
        } else {
          popup = this.$refs.filterPopup
          if (debugEnabled) {
          }
        }
      }
      
      if (popup && typeof popup.open === 'function') {
        popup.open('bottom')
        this._popupRef = popup
        this.internalPopupOpened = true
        if (debugEnabled) {
        }
        // 应用样式
        setTimeout(() => {
          this.applyPopupStyles()
        }, 50)
      } else {
        if (debugEnabled) {
          uni.showToast({
            title: '弹窗未就绪，请稍后再试',
            icon: 'none'
          })
        }
      }
    },

    closeFilterModal() {
      // 调试开关 - 可以通过设置this.enablePopupDebug = true来启用详细调试
      const debugEnabled = this.enablePopupDebug || false
      
      if (debugEnabled) {
      }
      
      // 立即更新内部状态，确保UI响应
      this.internalPopupOpened = false
      
      // 使用新的API替代废弃的getSystemInfoSync
      const sysInfo = {
        ...uni.getWindowInfo(),
        ...uni.getDeviceInfo(),
        ...uni.getAppBaseInfo()
      }

      const tryClosePopup = (retryCount = 0) => {
        let popup = null
        
        // 1. 直接通过$refs获取弹窗组件实例
        popup = this.$refs.filterPopup
        
        // 处理数组情况
        if (Array.isArray(popup)) {
          popup = popup[0]
          if (debugEnabled) {
          }
        }
        
        // 2. 如果没有直接引用，尝试使用缓存的引用
        if (!popup && this._popupRef) {
          popup = this._popupRef
          if (debugEnabled) {
          }
        }
        
        // 3. 在微信小程序环境下，如果$refs失败，尝试使用$scope.selectComponent
        if (!popup && (sysInfo.platform === 'mp-weixin' || sysInfo.platform === 'devtools')) {
          try {
            if (this.$scope && typeof this.$scope.selectComponent === 'function') {
              const componentInstance = this.$scope.selectComponent('#filter-popup-component')

              // 当组件实例为null时，直接跳过后续检查
              if (componentInstance === null) {
                if (debugEnabled) {
                }
                // 直接跳过，不继续处理
              } else if (componentInstance && typeof componentInstance.close === 'function') {
                popup = componentInstance
                if (debugEnabled) {
                }
              } else if (componentInstance) {
                // 只在调试模式下尝试查找子组件
                if (debugEnabled) {
                }
                
                // 方法1: 检查是否有$refs属性
                if (componentInstance.$refs && componentInstance.$refs.popup) {
                  popup = componentInstance.$refs.popup
                  if (debugEnabled) {
                  }
                } 
                // 方法2: 检查是否有selectComponent方法
                else if (typeof componentInstance.selectComponent === 'function') {
                  try {
                    popup = componentInstance.selectComponent('.uni-popup')
                    if (debugEnabled) {
                    }
                  } catch (e) {
                    if (debugEnabled) {
                    }
                  }
                }
              }
            }
          } catch (e) {
            if (debugEnabled) {
            }
          }
        }
        
        // 更新缓存
        if (popup) {
          this._popupRef = popup
        }

        if (popup && typeof popup.close === 'function') {
          try {
            popup.close()
            this.internalPopupOpened = false
            if (debugEnabled) {
            }
            return true
          } catch (e) {
            if (debugEnabled) {
              console.error('关闭弹窗失败:', e)
            }
            return false
          }
        } else if (popup) {
          if (debugEnabled) {
          }
          // 备选方案：直接设置内部状态并强制隐藏
          this.internalPopupOpened = false
          this.$forceUpdate()
          
          // 通过DOM操作隐藏弹窗
          setTimeout(() => {
            const popupEl = document.querySelector('#filter-popup-component')
            if (popupEl) {
              popupEl.style.display = 'none'
              if (debugEnabled) {
              }
            }
          }, 50)
          
          if (debugEnabled) {
          }
          return true
        } else {
          // 只在调试模式下输出错误信息
          if (debugEnabled) {
            console.error(`关闭弹窗失败: ref未找到或close方法未就绪 (尝试${retryCount + 1}次)(env: ${sysInfo.platform},${sysInfo.uniPlatform},${sysInfo.SDKVersion})`)
          }
          return false
        }
      }
      
      // 尝试关闭弹窗，如果失败则进行简单重试
      if (!tryClosePopup(0)) {
        // 延迟100ms后重试一次
        setTimeout(() => {
          if (!tryClosePopup(1)) {
            if (debugEnabled) {
              console.error('多次尝试关闭弹窗失败，强制更新内部状态')
            }
            // 无论成功与否，都确保内部状态为关闭
            this.internalPopupOpened = false
            
            // 在微信小程序环境中，尝试通过选择器查找并强制隐藏
            if (sysInfo.platform === 'mp-weixin' || sysInfo.platform === 'devtools') {
              const query = uni.createSelectorQuery().in(this)
              query.select('#filter-popup-component').boundingClientRect(data => {
                if (data) {
                  if (debugEnabled) {
                  }
                  // 强制重新渲染
                  this.$forceUpdate()
                }
              }).exec()
            }
            
            // 只在调试模式下通知用户
            if (debugEnabled) {
              uni.showToast({
                title: '关闭弹窗遇到问题',
                icon: 'none',
                duration: 1500
              })
            }
          }
        }, 100)
      }
    },
    
    // 应用弹窗样式，确保在微信小程序中正确显示
    applyPopupStyles() {
      // #ifdef MP-WEIXIN
      try {
        // 使用新的API替代废弃的getSystemInfoSync
        const sysInfo = {
          ...uni.getWindowInfo(),
          ...uni.getDeviceInfo(),
          ...uni.getAppBaseInfo()
        }
        
        // 记录弹窗位置信息
        this.popupPosition = {
          platform: sysInfo.platform,
          windowHeight: sysInfo.windowHeight,
          windowWidth: sysInfo.windowWidth,
          pixelRatio: sysInfo.pixelRatio,
          timestamp: Date.now()
        }
        
        // 使用选择器查询弹窗元素并应用样式
        setTimeout(() => {
          const query = uni.createSelectorQuery().in(this)
          query.select('.uni-popup').boundingClientRect(data => {
            if (data) {
              this.popupPosition.popupRect = data
            }
          }).exec()
        }, 100)
      } catch (e) {
        console.error('应用弹窗样式失败:', e)
      }
      // #endif
    },
    
    // 处理弹窗状态变化
    popupChange(e) {
      // 使用新的API替代废弃的getSystemInfoSync
      const sysInfo = {
        ...uni.getWindowInfo(),
        ...uni.getDeviceInfo(),
        ...uni.getAppBaseInfo()
      }
      
      
      if (e.show === false) {
        // 立即更新内部状态，避免状态不一致
        this.internalPopupOpened = false
      } else if (e.show === true) {
        this.internalPopupOpened = true
        
        // 缓存成功打开的弹窗引用
        let popup = this.$refs.filterPopup
        
        // 处理数组情况
        if (Array.isArray(popup)) popup = popup[0]

        if (popup) {
          this._popupRef = popup

          // 在微信小程序环境中，确保弹窗位置正确
          if (sysInfo.platform === 'devtools' || sysInfo.platform === 'mp-weixin') {
            this.applyPopupStyles()
          }
          
          // 确保弹窗位置正确
          setTimeout(() => {
            const popupWrapper = document.getElementById('popup-wrapper')
            if (popupWrapper) {
              // 在微信小程序环境中，使用样式类控制位置
              if (sysInfo.platform === 'mp-weixin') {
                // 通过类名控制样式
                this.applyPopupStyles()
              }
            }
          }, 50)
        } else {
          console.error('弹窗打开但无法获取引用')
          // 尝试延迟获取引用
          setTimeout(() => {
            const delayedPopup = this.$refs.filterPopup
            if (delayedPopup) {
              this._popupRef = delayedPopup
              this.applyPopupStyles()
            }
          }, 100)
        }
      }
    },
    
    // 应用弹窗样式（解决微信小程序中的定位问题）
    applyPopupStyles() {
      try {
        // 获取系统信息
        const sysInfo = {
          ...uni.getWindowInfo(),
          ...uni.getDeviceInfo(),
          ...uni.getAppBaseInfo()
        }
        
        
        // 如果不是微信小程序环境，则不需要特殊处理
        if (sysInfo.platform !== 'mp-weixin' && sysInfo.platform !== 'devtools') {
          return
        }
        
        // 记录弹窗位置信息
        this.popupPosition = {
          platform: sysInfo.platform,
          windowHeight: sysInfo.windowHeight,
          windowWidth: sysInfo.windowWidth,
          statusBarHeight: sysInfo.statusBarHeight,
          safeAreaInsets: sysInfo.safeAreaInsets || {}
        }
        
        // 在微信小程序环境中，延迟查询以确保DOM已渲染
        setTimeout(() => {
          // 使用选择器查询弹窗元素
          const query = uni.createSelectorQuery().in(this)
          query.select('#filter-popup-component').boundingClientRect(data => {
            if (data) {
              this.popupPosition.popupRect = data
              
              // 尝试获取弹窗引用
              let popup = this.$refs.filterPopup
              
              // 处理数组情况
              if (Array.isArray(popup)) {
                popup = popup[0]
              }
              
              // 如果没有直接引用，尝试使用缓存的引用
              if (!popup && this._popupRef) {
                popup = this._popupRef
              }
              
              // 检查弹窗引用状态
              const popupExists = !!popup
              const hasOpenMethod = popup && typeof popup.open === 'function'

              // 如果弹窗引用存在且可以打开，则应用样式
              if (popupExists && hasOpenMethod) {
              } else {
              }
            } else {
            }
          }).exec()
        }, 100)
      } catch (e) {
        console.error('应用弹窗样式失败:', e)
      }
    },
    
    // 选择距离
    selectDistance(distance) {
      this.filterOptions.distance = distance
    },
    
    // 切换设施选择
    toggleFacility(facility) {
      if (!Array.isArray(this.filterOptions.facilities)) {
        this.filterOptions.facilities = []
      }
      const index = this.filterOptions.facilities.indexOf(facility)
      if (index > -1) {
        this.filterOptions.facilities.splice(index, 1)
      } else {
        this.filterOptions.facilities.push(facility)
      }
    },
    
    // 重置筛选
    resetFilter() {
      this.filterOptions = {
        minPrice: '',
        maxPrice: '',
        distance: '',
        facilities: []
      }
    },
    
    // 应用筛选
    async applyFilter() {
      this.closeFilterModal()
      try {
        // 如果有搜索关键词，使用搜索接口
        if (this.searchKeyword && this.searchKeyword.trim()) {
          const params = {
            keyword: this.searchKeyword.trim()
          }
          
          // 添加类型筛选
          if (this.selectedType) {
            params.type = this.selectedType
          }
          
          // 添加价格筛选参数
          if (this.filterOptions.minPrice) {
            params.minPrice = Number(this.filterOptions.minPrice)
          }
          if (this.filterOptions.maxPrice) {
            params.maxPrice = Number(this.filterOptions.maxPrice)
          }
          
          // 添加其他筛选参数
          if (this.filterOptions.distance) {
            params.distance = this.filterOptions.distance
          }
          if (this.filterOptions.facilities && this.filterOptions.facilities.length > 0) {
            params.facilities = this.filterOptions.facilities.join(',')
          }
          
          await this.venueStore.searchVenues(params)
        } else {
          // 没有搜索关键词，使用场馆列表接口
          const params = { 
            page: 1, 
            pageSize: 50,
            refresh: true
          }
          
          // 只有当selectedType不为空时才添加type参数
          if (this.selectedType) {
            params.type = this.selectedType
          }
          
          // 添加价格筛选参数
          if (this.filterOptions.minPrice) {
            params.minPrice = Number(this.filterOptions.minPrice)
          }
          if (this.filterOptions.maxPrice) {
            params.maxPrice = Number(this.filterOptions.maxPrice)
          }
          
          // 添加其他筛选参数
          if (this.filterOptions.distance) {
            params.distance = this.filterOptions.distance
          }
          if (this.filterOptions.facilities && this.filterOptions.facilities.length > 0) {
            params.facilities = this.filterOptions.facilities.join(',')
          }
          
          await this.venueStore.getVenueList(params)
          this.updatePagination()
        }
      } catch (error) {
        console.error('应用筛选失败:', error)
        uni.showToast({
          title: '筛选失败，请重试',
          icon: 'error'
        })
      }
    },
    
    // 获取状态样式类
    getStatusClass(status) {
      const statusMap = {
        'AVAILABLE': 'status-available',
        'MAINTENANCE': 'status-maintenance',
        'OCCUPIED': 'status-occupied'
      }
      return statusMap[status] || 'status-available'
    },
    
    // 获取状态文本
    getStatusText(status) {
      const statusMap = {
        'AVAILABLE': '可预约',
        'MAINTENANCE': '维护中',
        'OCCUPIED': '已满'
      }
      return statusMap[status] || '可预约'
    },
    
    // 缓存优化的刷新方法
    async refreshDataWithCache() {
      const now = Date.now()
      
      // 如果距离上次刷新时间小于缓存超时时间，且不是强制刷新，则跳过
      if (now - this.lastRefreshTime < this.cacheTimeout && !this.isRefreshing) {
        return
      }
      
      // 如果正在刷新，避免重复请求
      if (this.isRefreshing) {
        return
      }
      
      try {
        this.isRefreshing = true
        
        
        // 智能缓存策略 - 更精细的刷新判断
        const shouldRefresh = !this.venueList.length || 
                             !this.venueTypes.length || 
                             (now - this.lastRefreshTime > this.cacheTimeout)
        
        if (shouldRefresh) {
          // 用户体验优化 - 显示刷新状态
          uni.showLoading({
            title: '正在刷新数据...'
          })
          
          // 数据压缩 - 优化刷新参数
          const refreshParams = { 
            page: 1, 
            pageSize: 50, 
            refresh: true,
            compress: true
          }
          
          // 数据压缩优化已移除，使用默认参数
          
          const refreshStartTime = Date.now()
          
          await Promise.all([
            this.venueStore.getVenueList(refreshParams),
            this.venueStore.getVenueTypes()
          ])
          
          const refreshDuration = Date.now() - refreshStartTime
          this.lastRefreshTime = now
          
          // 智能缓存 - 更新缓存时间戳
          try {
            uni.setStorageSync('venue_list_cache', {
              venueList: this.venueList,
              venueTypes: this.venueTypes,
              timestamp: now
            })
          } catch (e) {
          }
          
          
          // 用户体验优化 - 显示刷新成功反馈
          uni.hideLoading()
          uni.showToast({
            title: '数据刷新完成',
            icon: 'success',
            duration: 1500
          })
          
        } else {
        }
        
        this.updatePagination()
        
      } catch (error) {
        console.error('缓存刷新失败:', error)
        
        // 用户体验优化 - 显示错误信息
        uni.hideLoading()
        uni.showToast({
          title: '数据刷新失败',
          icon: 'error'
        })
        
      } finally {
        this.isRefreshing = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  background-color: #f5f5f5;
  min-height: 100vh;
}

/* 弹窗容器样式 */
.popup-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
}

/* 确保弹窗内容在底部 */
:deep(.uni-popup) {
  position: fixed !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 999 !important;
}

// 搜索栏
.search-section {
  background-color: #ffffff;
  padding: 20rpx 30rpx;
  
  .search-bar {
    display: flex;
    align-items: center;
    background-color: #f5f5f5;
    border-radius: 50rpx;
    padding: 0 30rpx;
    
    .search-input {
      flex: 1;
      height: 80rpx;
      font-size: 28rpx;
      border: none;
      background: transparent;
    }
    
    .search-icon {
      font-size: 32rpx;
      color: #666666;
    }
  }
}

// 筛选栏
.filter-section {
  display: flex;
  background-color: #ffffff;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  
  .filter-scroll {
    flex: 1;
    white-space: nowrap;
    
    .filter-item {
      display: inline-block;
      padding: 12rpx 24rpx;
      margin-right: 20rpx;
      background-color: #f5f5f5;
      border-radius: 30rpx;
      font-size: 24rpx;
      color: #666666;
      
      &.active {
        background-color: #ff6b35;
        color: #ffffff;
      }
    }
  }
  
  .filter-more {
    padding: 12rpx 24rpx;
    background-color: #f5f5f5;
    border-radius: 30rpx;
    font-size: 24rpx;
    color: #666666;
  }
}

// 场馆列表
.venue-list {
  padding: 20rpx 30rpx;
  
  .venue-card {
    display: flex;
    background-color: #ffffff;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
    
    .venue-image {
      width: 160rpx;
      height: 160rpx;
      border-radius: 12rpx;
      margin-right: 24rpx;
    }
    
    .venue-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      
      .venue-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12rpx;
        
        .venue-name {
          flex: 1;
          font-size: 32rpx;
          font-weight: 600;
          color: #333333;
          margin-right: 20rpx;
        }
        
        .venue-rating {
          display: flex;
          align-items: center;
          
          .rating-score {
            font-size: 24rpx;
            color: #ff6b35;
            margin-right: 4rpx;
          }
          
          .rating-star {
            font-size: 20rpx;
          }
        }
      }
      
      .venue-location {
        font-size: 24rpx;
        color: #666666;
        margin-bottom: 16rpx;
      }
      
      .venue-tags {
        display: flex;
        flex-wrap: wrap;
        margin-bottom: 16rpx;
        
        .venue-tag {
          font-size: 20rpx;
          color: #999999;
          background-color: #f0f0f0;
          padding: 4rpx 12rpx;
          border-radius: 12rpx;
          margin-right: 12rpx;
          margin-bottom: 8rpx;
        }
        
        .sharing-tag {
          background-color: #e8f5e8;
          color: #52c41a;
        }
      }
      
      .venue-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .venue-price {
          display: flex;
          align-items: baseline;
          
          .price-text {
            font-size: 32rpx;
            font-weight: 600;
            color: #ff6b35;
          }
          
          .price-unit {
            font-size: 24rpx;
            color: #999999;
            margin-left: 4rpx;
          }
        }
        
        .venue-status {
          font-size: 20rpx;
          padding: 6rpx 16rpx;
          border-radius: 16rpx;
          
          &.status-available {
            background-color: #e6f7ff;
            color: #1890ff;
          }
          
          &.status-maintenance {
            background-color: #fff7e6;
            color: #fa8c16;
          }
          
          &.status-occupied {
            background-color: #fff2f0;
            color: #ff4d4f;
          }
        }
      }
    }
  }
}

// 加载更多
.load-more {
  text-align: center;
  padding: 40rpx;
  font-size: 28rpx;
  color: #666666;
}

// 筛选弹窗
.filter-modal {
  background-color: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
  
  // 保证弹窗浮层位于上层
  position: relative;
  z-index: 1000;

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #f0f0f0;
    
    .modal-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #333333;
    }
    
    .modal-close {
      font-size: 32rpx;
      color: #999999;
    }
  }
  
  .filter-content {
    padding: 30rpx;
    max-height: 60vh;
    overflow-y: auto;
    
    .filter-group {
      margin-bottom: 40rpx;
      
      .group-title {
        font-size: 28rpx;
        font-weight: 600;
        color: #333333;
        margin-bottom: 20rpx;
        display: block;
      }
      
      // 价格范围
      .price-range {
        display: flex;
        align-items: center;
        
        .price-input {
          flex: 1;
          height: 80rpx;
          border: 1rpx solid #e0e0e0;
          border-radius: 8rpx;
          padding: 0 20rpx;
          font-size: 28rpx;
        }
        
        .price-separator {
          margin: 0 20rpx;
          color: #999999;
        }
      }
      
      // 距离选项
      .distance-options {
        display: flex;
        flex-wrap: wrap;
        
        .distance-item {
          padding: 16rpx 32rpx;
          margin-right: 20rpx;
          margin-bottom: 20rpx;
          background-color: #f5f5f5;
          border-radius: 30rpx;
          font-size: 24rpx;
          color: #666666;
          
          &.active {
            background-color: #ff6b35;
            color: #ffffff;
          }
        }
      }
      
      // 设施选项
      .facility-options {
        display: flex;
        flex-wrap: wrap;
        
        .facility-item {
          padding: 16rpx 32rpx;
          margin-right: 20rpx;
          margin-bottom: 20rpx;
          background-color: #f5f5f5;
          border-radius: 30rpx;
          font-size: 24rpx;
          color: #666666;
          
          &.active {
            background-color: #ff6b35;
            color: #ffffff;
          }
        }
      }
    }
  }
  
  .modal-footer {
    display: flex;
    padding: 30rpx;
    border-top: 1rpx solid #f0f0f0;
    
    .reset-btn {
      flex: 1;
      height: 80rpx;
      background-color: #f5f5f5;
      color: #666666;
      border: none;
      border-radius: 8rpx;
      margin-right: 20rpx;
      font-size: 28rpx;
    }
    
    .confirm-btn {
      flex: 2;
      height: 80rpx;
      background-color: #ff6b35;
      color: #ffffff;
      border: none;
      border-radius: 8rpx;
      font-size: 28rpx;
    }
  }
}
</style>