import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'path'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    uni()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@uni_modules': fileURLToPath(new URL('./uni_modules', import.meta.url))
    }
  },
  server: {
    port: 5180,
    host: '0.0.0.0'
  },
  define: {
    __UNI_FEATURE_VUE3__: true
  }
})