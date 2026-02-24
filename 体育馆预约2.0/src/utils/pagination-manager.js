/**
 * 分页加载管理器
 * 用于优化微信小程序中时间段数据的分页加载和虚拟滚动
 * 
 * 功能：
 * 1. 按时间段分页 - 智能分页策略，减少单次加载数据量
 * 2. 虚拟滚动 - 只渲染可见区域的数据，提升性能
 * 3. 懒加载 - 按需加载数据，减少初始加载时间
 * 4. 预加载 - 智能预加载下一页数据，提升用户体验
 * 5. 缓存管理 - 分页数据缓存，避免重复请求
 */

import DataCompressor from './data-compressor.js'

class PaginationManager {
  constructor(options = {}) {
    // 分页配置
    this.pageSize = options.pageSize || 20 // 每页数据量
    this.preloadThreshold = options.preloadThreshold || 5 // 预加载阈值
    this.maxCachePages = options.maxCachePages || 10 // 最大缓存页数
    this.virtualScrollHeight = options.virtualScrollHeight || 60 // 虚拟滚动项高度
    
    // 状态管理
    this.currentPage = 0
    this.totalPages = 0
    this.totalItems = 0
    this.isLoading = false
    this.hasMore = true
    
    // 数据缓存
    this.pageCache = new Map() // 页面数据缓存
    this.loadedPages = new Set() // 已加载页面集合
    this.loadingPages = new Set() // 正在加载页面集合
    
    // 虚拟滚动状态
    this.scrollTop = 0
    this.containerHeight = 0
    this.visibleStartIndex = 0
    this.visibleEndIndex = 0
    this.renderBuffer = options.renderBuffer || 5 // 渲染缓冲区
    
    // 回调函数
    this.onDataLoad = options.onDataLoad || null
    this.onPageChange = options.onPageChange || null
    this.onError = options.onError || null
    
      pageSize: this.pageSize,
      preloadThreshold: this.preloadThreshold,
      maxCachePages: this.maxCachePages,
      virtualScrollHeight: this.virtualScrollHeight
    })
  }
  
  /**
   * 初始化分页数据
   * @param {Object} options - 初始化选项
   */
  async initialize(options = {}) {
    
    try {
      this.reset()
      
      // 加载第一页数据
      const firstPageData = await this.loadPage(0, options)
      
      if (firstPageData && firstPageData.length > 0) {
        return firstPageData
      } else {
        return []
      }
    } catch (error) {
      console.error('[PaginationManager] ❌ 初始化失败:', error)
      this.handleError('初始化失败', error)
      throw error
    }
  }
  
  /**
   * 加载指定页面数据
   * @param {number} pageIndex - 页面索引
   * @param {Object} options - 加载选项
   * @returns {Array} 页面数据
   */
  async loadPage(pageIndex, options = {}) {
    // 防止重复加载
    if (this.loadingPages.has(pageIndex)) {
      return this.waitForPageLoad(pageIndex)
    }
    
    // 检查缓存
    if (this.pageCache.has(pageIndex) && !options.forceRefresh) {
      return this.pageCache.get(pageIndex)
    }
    
    this.loadingPages.add(pageIndex)
    
    try {
      // 计算分页参数
      const offset = pageIndex * this.pageSize
      const limit = this.pageSize
      
      // 调用数据加载回调
      let pageData = []
      if (this.onDataLoad) {
        pageData = await this.onDataLoad({
          page: pageIndex,
          offset,
          limit,
          ...options
        })
      }
      
      // 数据压缩处理
      if (pageData && pageData.length > 0) {
        const compressedData = DataCompressor.compressBatch(pageData)
        this.pageCache.set(pageIndex, pageData)
        this.loadedPages.add(pageIndex)
        
        // 更新分页状态
        this.updatePaginationState(pageIndex, pageData.length)
        
      } else {
        this.hasMore = false
      }
      
      // 清理缓存
      this.cleanupCache()
      
      // 触发页面变化回调
      if (this.onPageChange) {
        this.onPageChange(pageIndex, pageData)
      }
      
      return pageData
    } catch (error) {
      console.error(`[PaginationManager] ❌ 页面 ${pageIndex} 加载失败:`, error)
      this.handleError(`页面 ${pageIndex} 加载失败`, error)
      throw error
    } finally {
      this.loadingPages.delete(pageIndex)
    }
  }
  
  /**
   * 等待页面加载完成
   * @param {number} pageIndex - 页面索引
   * @returns {Promise<Array>} 页面数据
   */
  async waitForPageLoad(pageIndex) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.loadingPages.has(pageIndex)) {
          clearInterval(checkInterval)
          resolve(this.pageCache.get(pageIndex) || [])
        }
      }, 100)
      
      // 超时处理
      setTimeout(() => {
        clearInterval(checkInterval)
        resolve([])
      }, 10000)
    })
  }
  
  /**
   * 加载下一页数据
   * @param {Object} options - 加载选项
   * @returns {Array} 下一页数据
   */
  async loadNextPage(options = {}) {
    if (!this.hasMore) {
      return []
    }
    
    const nextPage = this.currentPage + 1
    const pageData = await this.loadPage(nextPage, options)
    
    if (pageData && pageData.length > 0) {
      this.currentPage = nextPage
    }
    
    return pageData
  }
  
  /**
   * 预加载下一页数据
   * @param {Object} options - 预加载选项
   */
  async preloadNextPage(options = {}) {
    if (!this.hasMore || this.loadingPages.size > 0) {
      return
    }
    
    const nextPage = this.currentPage + 1
    if (!this.loadedPages.has(nextPage)) {
      try {
        await this.loadPage(nextPage, { ...options, preload: true })
      } catch (error) {
      }
    }
  }
  
  /**
   * 获取虚拟滚动数据
   * @param {number} scrollTop - 滚动位置
   * @param {number} containerHeight - 容器高度
   * @returns {Object} 虚拟滚动数据
   */
  getVirtualScrollData(scrollTop, containerHeight) {
    this.scrollTop = scrollTop
    this.containerHeight = containerHeight
    
    // 计算可见区域
    const startIndex = Math.floor(scrollTop / this.virtualScrollHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / this.virtualScrollHeight) + this.renderBuffer,
      this.totalItems - 1
    )
    
    this.visibleStartIndex = Math.max(0, startIndex - this.renderBuffer)
    this.visibleEndIndex = endIndex
    
    // 获取可见数据
    const visibleData = this.getVisibleData()
    
    // 检查是否需要预加载
    this.checkPreloadTrigger()
    
    return {
      visibleData,
      startIndex: this.visibleStartIndex,
      endIndex: this.visibleEndIndex,
      totalHeight: this.totalItems * this.virtualScrollHeight,
      offsetY: this.visibleStartIndex * this.virtualScrollHeight
    }
  }
  
  /**
   * 获取可见区域数据
   * @returns {Array} 可见数据
   */
  getVisibleData() {
    const visibleData = []
    
    for (let i = this.visibleStartIndex; i <= this.visibleEndIndex; i++) {
      const pageIndex = Math.floor(i / this.pageSize)
      const itemIndex = i % this.pageSize
      
      if (this.pageCache.has(pageIndex)) {
        const pageData = this.pageCache.get(pageIndex)
        if (pageData[itemIndex]) {
          visibleData.push({
            ...pageData[itemIndex],
            virtualIndex: i
          })
        }
      }
    }
    
    return visibleData
  }
  
  /**
   * 检查预加载触发条件
   */
  checkPreloadTrigger() {
    const currentPageIndex = Math.floor(this.visibleEndIndex / this.pageSize)
    const itemsFromPageEnd = this.pageSize - (this.visibleEndIndex % this.pageSize)
    
    // 当接近页面末尾时触发预加载
    if (itemsFromPageEnd <= this.preloadThreshold) {
      this.preloadNextPage()
    }
  }
  
  /**
   * 更新分页状态
   * @param {number} pageIndex - 页面索引
   * @param {number} dataLength - 数据长度
   */
  updatePaginationState(pageIndex, dataLength) {
    // 更新总数据量
    this.totalItems = Math.max(this.totalItems, (pageIndex * this.pageSize) + dataLength)
    
    // 更新总页数
    this.totalPages = Math.ceil(this.totalItems / this.pageSize)
    
    // 检查是否还有更多数据
    if (dataLength < this.pageSize) {
      this.hasMore = false
    }
  }
  
  /**
   * 清理缓存
   */
  cleanupCache() {
    if (this.pageCache.size > this.maxCachePages) {
      // 删除最旧的缓存页面
      const sortedPages = Array.from(this.pageCache.keys()).sort((a, b) => a - b)
      const pagesToDelete = sortedPages.slice(0, sortedPages.length - this.maxCachePages)
      
      pagesToDelete.forEach(pageIndex => {
        this.pageCache.delete(pageIndex)
        this.loadedPages.delete(pageIndex)
      })
      
    }
  }
  
  /**
   * 重置分页状态
   */
  reset() {
    
    this.currentPage = 0
    this.totalPages = 0
    this.totalItems = 0
    this.hasMore = true
    this.isLoading = false
    
    this.pageCache.clear()
    this.loadedPages.clear()
    this.loadingPages.clear()
    
    this.scrollTop = 0
    this.visibleStartIndex = 0
    this.visibleEndIndex = 0
  }
  
  /**
   * 刷新指定页面
   * @param {number} pageIndex - 页面索引
   * @returns {Array} 刷新后的数据
   */
  async refreshPage(pageIndex) {
    
    // 清除缓存
    this.pageCache.delete(pageIndex)
    this.loadedPages.delete(pageIndex)
    
    // 重新加载
    return await this.loadPage(pageIndex, { forceRefresh: true })
  }
  
  /**
   * 刷新当前页面
   * @returns {Array} 刷新后的数据
   */
  async refreshCurrentPage() {
    return await this.refreshPage(this.currentPage)
  }
  
  /**
   * 刷新所有已加载页面
   */
  async refreshAllPages() {
    
    const loadedPageIndexes = Array.from(this.loadedPages)
    const refreshPromises = loadedPageIndexes.map(pageIndex => 
      this.refreshPage(pageIndex).catch(error => {
        return []
      })
    )
    
    await Promise.all(refreshPromises)
  }
  
  /**
   * 获取分页统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      totalItems: this.totalItems,
      pageSize: this.pageSize,
      hasMore: this.hasMore,
      isLoading: this.isLoading,
      cachedPages: this.pageCache.size,
      loadedPages: this.loadedPages.size,
      loadingPages: this.loadingPages.size,
      visibleRange: {
        start: this.visibleStartIndex,
        end: this.visibleEndIndex
      },
      cacheHitRate: this.loadedPages.size > 0 ? 
        (this.pageCache.size / this.loadedPages.size * 100).toFixed(2) + '%' : '0%'
    }
  }
  
  /**
   * 处理错误
   * @param {string} message - 错误消息
   * @param {Error} error - 错误对象
   */
  handleError(message, error) {
    console.error(`[PaginationManager] ❌ ${message}:`, error)
    
    if (this.onError) {
      this.onError(message, error)
    }
  }
  
  /**
   * 销毁分页管理器
   */
  destroy() {
    
    this.reset()
    this.onDataLoad = null
    this.onPageChange = null
    this.onError = null
  }
}

// 导出分页管理器
export default PaginationManager
export { PaginationManager }

// 兼容CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaginationManager
  module.exports.PaginationManager = PaginationManager
  module.exports.default = PaginationManager
}

// 兼容全局变量
if (typeof global !== 'undefined') {
  global.PaginationManager = PaginationManager
}

// 兼容微信小程序环境
if (typeof window !== 'undefined') {
  window.PaginationManager = PaginationManager
}

  default: typeof PaginationManager,
  named: typeof PaginationManager,
  global: typeof global !== 'undefined' ? typeof global.PaginationManager : 'undefined',
  window: typeof window !== 'undefined' ? typeof window.PaginationManager : 'undefined'
})