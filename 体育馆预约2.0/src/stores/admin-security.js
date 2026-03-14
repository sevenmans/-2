import { defineStore } from 'pinia'
import { useUserStore } from './user.js'

export const useAdminSecurityStore = defineStore('adminSecurity', {
  state: () => ({
    submitting: false
  }),

  actions: {
    async changePassword(oldPassword, newPassword) {
      this.submitting = true
      try {
        const userStore = useUserStore()
        await userStore.changePassword({ oldPassword, newPassword })
        return true
      } catch (e) {
        console.error('[AdminSecurity] changePassword error:', e)
        throw e
      } finally {
        this.submitting = false
      }
    }
  }
})
