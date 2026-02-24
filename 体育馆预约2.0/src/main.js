import App from './App.vue'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
import { pinia } from './stores/index.js'
import feedback from './utils/feedback.js' // 导入新的 feedback 模块

export function createApp() {
  const app = createSSRApp(App)
  app.use(pinia) // 只使用Pinia
  app.use(feedback) // 使用 feedback 插件
  return {
    app
  }
}
// #endif