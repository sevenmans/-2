// 环境配置
const config = {
  development: {
    baseURL: 'http://localhost:8080/api',
    timeout: 10000, // 减少到10秒超时，避免过长等待
    debug: true,
    cache: true, // 启用缓存
    retryTimes: 1, // 减少重试次数，避免重复请求
    retryDelay: 500, // 减少重试延迟
    // 针对profile页面的特殊配置
    profileTimeout: 8000, // profile页面专用超时时间
    maxConcurrentRequests: 2 // 最大并发请求数
  },
  
  production: {
    baseURL: 'https://api.example.com/api',
    timeout: 15000, // 生产环境适中的超时时间
    debug: false,
    cache: true,
    retryTimes: 2,
    retryDelay: 800,
    profileTimeout: 12000,
    maxConcurrentRequests: 3
  }
}

export default config[process.env.NODE_ENV || 'development']