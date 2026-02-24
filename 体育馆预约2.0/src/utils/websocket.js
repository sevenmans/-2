/**
 * WebSocket服务 - 已禁用
 * 该文件已被禁用，不再提供WebSocket功能
 * 项目现在完全依赖HTTP API进行数据交互
 */

// WebSocket功能已被移除
// 如需实时通信功能，请考虑使用HTTP轮询或其他替代方案

class WebSocketService {
  constructor() {
  }
  
  // 所有方法都返回空实现，确保不会影响现有代码
  connect() {
  }
  
  disconnect() {
  }
  
  send() {
    return false
  }
  
  subscribe() {
  }
  
  setServerIP() {
  }
  
  initStores() {
  }
}

// 创建空的实例，保持接口兼容性
const webSocketService = new WebSocketService()

export default webSocketService