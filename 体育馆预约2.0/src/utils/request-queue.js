import config from '@/config/index.js'

/**
 * 请求队列管理器
 * 用于控制并发请求数量，避免同时发起过多请求导致超时
 */
class RequestQueue {
  constructor() {
    this.queue = [] // 等待队列
    this.running = [] // 正在执行的请求
    this.maxConcurrent = config.maxConcurrentRequests || 3
  }

  /**
   * 添加请求到队列
   * @param {Function} requestFn 请求函数
   * @param {Object} options 选项
   * @returns {Promise} 请求结果
   */
  add(requestFn, options = {}) {
    return new Promise((resolve, reject) => {
      const task = {
        requestFn,
        resolve,
        reject,
        options,
        id: Date.now() + Math.random()
      }

      this.queue.push(task)
      this.process()
    })
  }

  /**
   * 处理队列
   */
  async process() {
    // 如果正在运行的请求数已达上限，或队列为空，则不处理
    if (this.running.length >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    const task = this.queue.shift()
    this.running.push(task)


    try {
      const result = await task.requestFn()
      task.resolve(result)
    } catch (error) {
      task.reject(error)
    } finally {
      // 从运行列表中移除
      const index = this.running.findIndex(t => t.id === task.id)
      if (index > -1) {
        this.running.splice(index, 1)
      }


      // 继续处理队列
      this.process()
    }
  }

  /**
   * 清空队列
   */
  clear() {
    this.queue.forEach(task => {
      task.reject(new Error('请求队列已清空'))
    })
    this.queue = []
  }

  /**
   * 获取队列状态
   */
  getStatus() {
    return {
      running: this.running.length,
      waiting: this.queue.length,
      maxConcurrent: this.maxConcurrent
    }
  }
}

// 创建全局请求队列实例
const requestQueue = new RequestQueue()

export default requestQueue