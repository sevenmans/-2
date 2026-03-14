import { defineStore } from 'pinia'
import { getOrderByVerifyCode, verifyByCode } from '@/api/verification.js'
import { adaptAdminOrder } from '@/utils/admin-adapter.js'

const HISTORY_KEY = 'admin_verify_history'
const MAX_HISTORY = 5

function loadHistory() {
  try {
    return JSON.parse(uni.getStorageSync(HISTORY_KEY) || '[]')
  } catch { return [] }
}

function saveHistory(list) {
  uni.setStorageSync(HISTORY_KEY, JSON.stringify(list))
}

export const useAdminVerificationStore = defineStore('adminVerification', {
  state: () => ({
    currentCode: '',
    verifyResult: null,
    verifying: false,
    querying: false,
    history: loadHistory()
  }),

  actions: {
    setCode(code) {
      this.currentCode = code.trim()
    },

    async queryByCode(code) {
      this.querying = true
      this.verifyResult = null
      try {
        const res = await getOrderByVerifyCode(code)
        const raw = res.data || res
        this.verifyResult = adaptAdminOrder(raw)
        return this.verifyResult
      } catch (e) {
        console.error('[AdminVerify] queryByCode error:', e)
        throw e
      } finally {
        this.querying = false
      }
    },

    async executeVerify(code) {
      this.verifying = true
      try {
        const res = await verifyByCode(code)
        this.addToHistory(code, this.verifyResult)
        return res
      } catch (e) {
        console.error('[AdminVerify] executeVerify error:', e)
        throw e
      } finally {
        this.verifying = false
      }
    },

    addToHistory(code, order) {
      const record = {
        code,
        time: new Date().toLocaleString(),
        venueName: order?.venueName || '',
        userName: order?.userName || ''
      }
      this.history.unshift(record)
      if (this.history.length > MAX_HISTORY) this.history.pop()
      saveHistory(this.history)
    },

    clearResult() {
      this.verifyResult = null
      this.currentCode = ''
    }
  }
})
