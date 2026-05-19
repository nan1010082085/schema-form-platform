import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import qiankun from 'vite-plugin-qiankun'

export default defineConfig({
  plugins: [
    vue(),
    qiankun('schema-form', { useDevMode: true })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    cors: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
    proxy: {
      '/api': {
        target: 'https://schema-form-platform.vercel.app',
        changeOrigin: true,
      }
    }
  }
})
