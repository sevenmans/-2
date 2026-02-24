/**
 * WebSocket服务 - STOMP协议兼容
 * 用于与后端建立实时连接，接收订单和时间段状态更新通知
 * 支持微信小程序环境和STOMP协议
 */
import { useVenueStore } from '@/stores/venue'
import { useBookingStore } from '@/stores/booking'

class WebSocketService {
  constructor() {
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectInterval = 3000
    this.heartbeatInterval = 30000
    this.heartbeatTimer = null
    this.isConnecting = false
    this.isConnected = false
    this.messageQueue = []
    this.subscriptions = new Map() // 存储订阅信息
    this.messageId = 0 // STOMP消息ID计数器
    
    // 获取store实例
    this.venueStore = null
    this.bookingStore = null
  }
  
  /**
   * 初始化store引用
   */
  initStores() {
    try {
      this.venueStore = useVenueStore()
      this.bookingStore = useBookingStore()
      console.log('[WebSocket] Store初始化成功')
    } catch (error) {
      console.error('[WebSocket] Store初始化失败:', error)
    }
  }
  
  /**
   * 连接WebSocket - STOMP协议
   */
  connect() {
    if (this.isConnecting || this.isConnected) {
      console.log('[WebSocket] 连接已存在或正在连接中')
      return
    }
    
    this.isConnecting = true
    
    try {
      // 构建WebSocket URL - 连接到STOMP端点
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.hostname
      const port = '8080' // 后端端口
      const wsUrl = `${protocol}//${host}:${port}/ws`
      
      console.log('[WebSocket] 尝试连接:', wsUrl)
      
      // 检测环境并创建WebSocket连接
      if (typeof uni !== 'undefined' && uni.connectSocket) {
        // 微信小程序环境
        this.ws = uni.connectSocket({
          url: wsUrl,
          success: () => {
            console.log('[WebSocket] uni.connectSocket 创建成功')
          },
          fail: (error) => {
            console.error('[WebSocket] uni.connectSocket 创建失败:', error)
            this.isConnecting = false
            this.scheduleReconnect()
          }
        })
        
        // 设置事件监听器 - 微信小程序API
        this.ws.onOpen(this.onOpen.bind(this))
        this.ws.onMessage(this.onMessage.bind(this))
        this.ws.onClose(this.onClose.bind(this))
        this.ws.onError(this.onError.bind(this))
      } else if (typeof WebSocket !== 'undefined') {
        // 浏览器环境
        this.ws = new WebSocket(wsUrl)
        
        // 设置事件监听器 - 标准WebSocket API
        this.ws.onopen = this.onOpen.bind(this)
        this.ws.onmessage = this.onMessage.bind(this)
        this.ws.onclose = this.onClose.bind(this)
        this.ws.onerror = this.onError.bind(this)
      } else {
        throw new Error('当前环境不支持WebSocket')
      }
      
    } catch (error) {
      console.error('[WebSocket] 连接创建失败:', error)
      this.isConnecting = false
      this.scheduleReconnect()
    }
  }
  
  /**
   * 连接成功处理 - STOMP握手
   */
  onOpen(event) {
    console.log('[WebSocket] 连接成功，开始STOMP握手')
    
    // 发送STOMP CONNECT帧
    const connectFrame = this.buildStompFrame('CONNECT', {
      'accept-version': '1.0,1.1,1.2',
      'heart-beat': '10000,10000'
    })
    
    this.sendRawMessage(connectFrame)
  }
  
  /**
   * 接收消息处理 - STOMP协议解析
   */
  onMessage(event) {
    try {
      const rawMessage = event.data || event.detail?.data
      console.log('[WebSocket] 收到原始消息:', rawMessage)
      
      // 解析STOMP帧
      const frame = this.parseStompFrame(rawMessage)
      if (!frame) {
        console.error('[WebSocket] STOMP帧解析失败')
        return
      }
      
      console.log('[WebSocket] 解析STOMP帧:', frame)
      
      // 根据STOMP命令处理
      switch (frame.command) {
        case 'CONNECTED':
          this.handleStompConnected(frame)
          break
        case 'MESSAGE':
          this.handleStompMessage(frame)
          break
        case 'ERROR':
          this.handleStompError(frame)
          break
        case 'RECEIPT':
          console.log('[WebSocket] 收到STOMP回执:', frame.headers.receiptId)
          break
        default:
          console.log('[WebSocket] 未知STOMP命令:', frame.command)
      }
    } catch (error) {
      console.error('[WebSocket] 消息解析失败:', error)
    }
  }
  
  /**
   * 连接关闭处理
   */
  onClose(event) {
    console.log('[WebSocket] 连接关闭:', event.code, event.reason)
    this.isConnected = false
    this.isConnecting = false
    
    // 停止心跳
    this.stopHeartbeat()
    
    // 如果不是主动关闭，尝试重连
    if (event.code !== 1000) {
      this.scheduleReconnect()
    }
  }
  
  /**
   * 连接错误处理
   */
  onError(error) {
    console.error('[WebSocket] 连接错误:', error)
    this.isConnected = false
    this.isConnecting = false
  }
  
  /**
   * 构建STOMP帧
   */
  buildStompFrame(command, headers = {}, body = '') {
    let frame = command + '\n'
    
    // 添加头部
    for (const [key, value] of Object.entries(headers)) {
      frame += `${key}:${value}\n`
    }
    
    frame += '\n' + body + '\0'
    return frame
  }
  
  /**
   * 解析STOMP帧
   */
  parseStompFrame(data) {
    if (!data || typeof data !== 'string') {
      return null
    }
    
    const lines = data.split('\n')
    if (lines.length < 2) {
      return null
    }
    
    const command = lines[0]
    const headers = {}
    let bodyStartIndex = 1
    
    // 解析头部
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line === '') {
        bodyStartIndex = i + 1
        break
      }
      
      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex)
        const value = line.substring(colonIndex + 1)
        headers[key] = value
      }
    }
    
    // 解析消息体
    const bodyLines = lines.slice(bodyStartIndex)
    let body = bodyLines.join('\n')
    
    // 移除结尾的空字符
    if (body.endsWith('\0')) {
      body = body.slice(0, -1)
    }
    
    return {
      command,
      headers,
      body
    }
  }
  
  /**
   * 发送原始消息
   */
  sendRawMessage(message) {
    if (this.ws) {
      // 检查连接状态
      let isReady = false
      if (typeof uni !== 'undefined' && this.ws.send) {
        // 微信小程序环境 - 直接发送，uni.connectSocket没有readyState
        isReady = this.isConnected
      } else if (this.ws.readyState === WebSocket.OPEN) {
        // 浏览器环境
        isReady = true
      }
      
      if (isReady) {
        this.ws.send({
          data: message
        })
      } else {
        console.warn('[WebSocket] 连接未建立，无法发送消息')
      }
    } else {
      console.warn('[WebSocket] WebSocket实例不存在')
    }
  }
  
  /**
   * 处理STOMP连接成功
   */
  handleStompConnected(frame) {
    console.log('[WebSocket] STOMP连接成功')
    this.isConnected = true
    this.isConnecting = false
    this.reconnectAttempts = 0
    
    // 启动心跳
    this.startHeartbeat()
    
    // 发送队列中的消息
    this.flushMessageQueue()
    
    // 订阅主题
    this.subscribe()
  }
  
  /**
   * 处理STOMP消息
   */
  handleStompMessage(frame) {
    try {
      const data = JSON.parse(frame.body)
      console.log('[WebSocket] 收到业务消息:', data)
      
      // 根据消息类型处理
      switch (data.type) {
        case 'order-expired':
          this.handleOrderExpired(data)
          break
        case 'order-cancelled':
          this.handleOrderCancelled(data)
          break
        case 'booking-success':
          this.handleBookingSuccess(data)
          break
        case 'timeslot-status-updated':
          this.handleTimeslotStatusUpdated(data)
          break
        case 'heartbeat':
          console.log('[WebSocket] 心跳响应')
          break
        default:
          console.log('[WebSocket] 未知消息类型:', data.type)
      }
    } catch (error) {
      console.error('[WebSocket] 业务消息解析失败:', error)
    }
  }
  
  /**
   * 处理STOMP错误
   */
  handleStompError(frame) {
    console.error('[WebSocket] STOMP错误:', frame.body)
    this.disconnect()
    this.scheduleReconnect()
  }
  
  /**
   * 订阅主题
   */
  subscribe() {
    // 订阅订单状态更新
    this.subscribeToTopic('/topic/order-status')
    // 订阅时间段状态更新
    this.subscribeToTopic('/topic/timeslot-status')
  }
  
  /**
   * 订阅特定主题 - STOMP协议
   */
  subscribeToTopic(topic) {
    if (!this.isConnected) {
      console.log(`[WebSocket] 连接未建立，无法订阅主题: ${topic}`)
      return
    }
    
    const subscriptionId = `sub-${this.messageId++}`
    
    // 构建STOMP SUBSCRIBE帧
    const subscribeFrame = this.buildStompFrame('SUBSCRIBE', {
      'id': subscriptionId,
      'destination': topic
    })
    
    // 保存订阅信息
    this.subscriptions.set(subscriptionId, topic)
    
    this.sendRawMessage(subscribeFrame)
    console.log(`[WebSocket] 已订阅主题: ${topic}, 订阅ID: ${subscriptionId}`)
  }
  
  /**
   * 发送消息 - STOMP协议
   */
  send(message, destination = '/app/message') {
    if (!this.isConnected) {
      console.log('[WebSocket] 连接未建立，消息加入队列')
      this.messageQueue.push({ message, destination })
      return
    }
    
    try {
      // 构建STOMP SEND帧
      const sendFrame = this.buildStompFrame('SEND', {
        'destination': destination,
        'content-type': 'application/json'
      }, JSON.stringify(message))
      
      this.sendRawMessage(sendFrame)
      console.log('[WebSocket] 消息发送成功:', message)
    } catch (error) {
      console.error('[WebSocket] 消息发送失败:', error)
      // 发送失败时重新加入队列
      this.messageQueue.push({ message, destination })
    }
  }
  
  /**
   * 发送队列中的消息
   */
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const queueItem = this.messageQueue.shift()
      if (typeof queueItem === 'object' && queueItem.message) {
        // 新格式：包含message和destination
        this.send(queueItem.message, queueItem.destination)
      } else {
        // 兼容旧格式：直接是message
        this.send(queueItem)
      }
    }
  }
  
  /**
   * 启动心跳 - STOMP协议
   */
  startHeartbeat() {
    this.stopHeartbeat() // 先停止之前的心跳
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        // STOMP心跳：发送空行
        this.sendRawMessage('\n')
        console.log('[WebSocket] 发送STOMP心跳')
      }
    }, this.heartbeatInterval)
    
    console.log('[WebSocket] STOMP心跳已启动')
  }
  
  /**
   * 停止心跳
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
  
  /**
   * 安排重连
   */
  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`[WebSocket] ${this.reconnectInterval}ms后尝试第${this.reconnectAttempts}次重连`)
      
      setTimeout(() => {
        this.connect()
      }, this.reconnectInterval * this.reconnectAttempts)
    } else {
      console.error('[WebSocket] 重连失败，已达到最大重试次数')
    }
  }
  
  /**
   * 处理订单过期事件
   */
  handleOrderExpired(data) {
    console.log('[WebSocket] 处理订单过期事件:', data)
    
    // 触发全局事件
    uni.$emit('order-expired', {
      orderId: data.orderId,
      venueId: data.venueId,
      date: data.date,
      timeSlotIds: data.timeSlotIds
    })
    
    // 直接调用store方法
    if (this.venueStore && this.venueStore.onOrderExpired) {
      this.venueStore.onOrderExpired({
        orderId: data.orderId,
        venueId: data.venueId,
        date: data.date,
        timeSlotIds: data.timeSlotIds
      })
    }
    
    if (this.bookingStore && this.bookingStore.onOrderExpired) {
      this.bookingStore.onOrderExpired({
        orderId: data.orderId,
        venueId: data.venueId,
        date: data.date,
        timeSlotIds: data.timeSlotIds
      })
    }
  }
  
  /**
   * 处理订单取消事件
   */
  handleOrderCancelled(data) {
    console.log('[WebSocket] 处理订单取消事件:', data)
    
    // 触发全局事件
    uni.$emit('order-cancelled', {
      orderId: data.orderId,
      venueId: data.venueId,
      date: data.date,
      timeSlotIds: data.timeSlotIds
    })
  }
  
  /**
   * 处理预约成功事件
   */
  handleBookingSuccess(data) {
    console.log('[WebSocket] 处理预约成功事件:', data)
    
    // 触发全局事件
    uni.$emit('booking-success', {
      orderId: data.orderId,
      venueId: data.venueId,
      date: data.date,
      timeSlotIds: data.timeSlotIds
    })
  }
  
  /**
   * 处理时间段状态更新事件
   */
  handleTimeslotStatusUpdated(data) {
    console.log('[WebSocket] 处理时间段状态更新事件:', data)
    
    // 触发全局事件
    uni.$emit('timeslot-status-updated', {
      venueId: data.venueId,
      date: data.date,
      timeSlotIds: data.timeSlotIds
    })
    
    // 直接调用venue store方法
    if (this.venueStore && this.venueStore.onTimeSlotStatusUpdated) {
      this.venueStore.onTimeSlotStatusUpdated({
        venueId: data.venueId,
        date: data.date,
        timeSlotIds: data.timeSlotIds
      })
    }
  }
  
  /**
   * 断开连接 - STOMP协议
   */
  disconnect() {
    console.log('[WebSocket] 主动断开连接')
    
    // 发送STOMP DISCONNECT帧
    if (this.isConnected && this.ws) {
      const disconnectFrame = this.buildStompFrame('DISCONNECT', {
        'receipt': `disconnect-${this.messageId++}`
      })
      this.sendRawMessage(disconnectFrame)
    }
    
    this.isConnected = false
    this.isConnecting = false
    
    // 清空订阅
    this.subscriptions.clear()
    
    // 停止心跳
    this.stopHeartbeat()
    
    // 关闭连接
    if (this.ws) {
      if (typeof uni !== 'undefined' && this.ws.close) {
        // 微信小程序环境
        this.ws.close({
          success: () => {
            console.log('[WebSocket] 微信小程序连接已关闭')
          },
          fail: (error) => {
            console.error('[WebSocket] 微信小程序关闭连接失败:', error)
          }
        })
      } else {
        // 浏览器环境
        this.ws.close()
      }
      this.ws = null
    }
    
    // 清空重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
  
  /**
   * 获取连接状态
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts
    }
  }
}

// 创建全局实例
const webSocketService = new WebSocketService()

export default webSocketService