import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * Microapp 独立构建配置
 *
 * 将 schema-form 渲染引擎打包为单个 UMD JS 文件，
 * 可通过 <script> 标签加载到任意宿主页面。
 *
 * 构建产物：dist-microapp/schema-form-microapp.umd.js
 *
 * 外部依赖（宿主页面需预先加载）：
 * - Vue 3 (window.Vue)
 * - Element Plus (window.ElementPlus)
 *
 * 用法：vite build --config vite.microapp.config.ts
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: new URL('./src/microapp/index.ts', import.meta.url).pathname,
      name: 'SchemaFormMicroapp',
      formats: ['umd'],
      fileName: () => 'schema-form-microapp.umd.js',
    },
    rollupOptions: {
      external: ['vue', 'element-plus', 'element-plus/es/locale/lang/zh-cn'],
      output: {
        globals: {
          vue: 'Vue',
          'element-plus': 'ElementPlus',
          'element-plus/es/locale/lang/zh-cn': 'ElementPlusLocaleZhCn',
        },
      },
    },
    outDir: 'dist-microapp',
    emptyOutDir: true,
    sourcemap: true,
    // 内联 CSS，使产物为单文件
    cssCodeSplit: false,
  },
})
