import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import qiankun from 'vite-plugin-qiankun'
import { fixQiankunLifecyclePlugin } from '@schema-form/platform-shared/config/vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

/**
 * admin Vite 配置
 *
 * 通过环境变量 ADMIN_BASE_URL 控制 base 路径：
 * - 本地独立运行：ADMIN_BASE_URL=/ （默认）
 * - 生产/嵌入 shell：ADMIN_BASE_URL=/schema-platform/admin/
 */
export default defineConfig({
  base: process.env.ADMIN_BASE_URL || '/',
  plugins: [vue(), qiankun('admin', { useDevMode: true }), fixQiankunLifecyclePlugin()],
  resolve: {
    alias: {
      '@': `${rootDir}src`,
    },
  },
  server: {
    port: 5555,
    strictPort: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    proxy: {
      '/schema-platform/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/schema-platform\/api/, '/api'),
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
