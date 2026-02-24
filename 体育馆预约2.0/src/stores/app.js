import { defineStore } from 'pinia'

// 迁移全局状态到Pinia - 这是最独立的模块，先迁移
export const useAppStore = defineStore('app', {
  state: () => ({
    loading: false,
    networkStatus: true
  }),
  
  actions: {
    setLoading(loading) {
      this.loading = loading
    },
    
    setNetworkStatus(status) {
      this.networkStatus = status
    }
  },
  
  getters: {
    isLoading: state => state.loading,
    isOnline: state => state.networkStatus
  }
})
