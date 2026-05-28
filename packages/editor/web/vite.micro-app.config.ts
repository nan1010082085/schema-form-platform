/**
 * micro-app 子应用构建配置
 *
 * 输出为 ESM 格式，由 micro-app 框架加载。
 * 入口文件导出 bootstrap/mount/unmount 生命周期。
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    lib: {
      entry: resolve(__dirname, 'src/microapp/lifecycle.ts'),
      formats: ['es'],
      fileName: () => 'schema-form-micro-app.js',
    },
    rollupOptions: {
      external: ['vue', 'vue-router', 'pinia', 'element-plus'],
      output: {
        globals: {
          vue: 'Vue',
          'vue-router': 'VueRouter',
          pinia: 'Pinia',
          'element-plus': 'ElementPlus',
        },
      },
    },
    outDir: 'dist/micro-app',
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
