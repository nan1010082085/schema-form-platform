import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

/**
 * Widget 独立构建配置
 * 用于将每个 Widget 打包为独立的 JS 模块，支持 Microapp 按需加载。
 *
 * 用法：vite build --config vite.widget.config.ts
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
      entry: {
        // 公共基础（types + registry）
        base: resolve(__dirname, 'src/widgets/entries/base.ts'),
        // 渲染引擎
        renderer: resolve(__dirname, 'src/widgets/entries/renderer.ts'),
        // 各 Widget 独立入口
        'widgets/form': resolve(__dirname, 'src/widgets/entries/form.ts'),
        'widgets/card': resolve(__dirname, 'src/widgets/entries/card.ts'),
        'widgets/row-col': resolve(__dirname, 'src/widgets/entries/row-col.ts'),
        'widgets/tabs': resolve(__dirname, 'src/widgets/entries/tabs.ts'),
        'widgets/dialog': resolve(__dirname, 'src/widgets/entries/dialog.ts'),
        'widgets/input': resolve(__dirname, 'src/widgets/entries/input.ts'),
        'widgets/select': resolve(__dirname, 'src/widgets/entries/select.ts'),
        'widgets/number': resolve(__dirname, 'src/widgets/entries/number.ts'),
        'widgets/radio': resolve(__dirname, 'src/widgets/entries/radio.ts'),
        'widgets/checkbox': resolve(__dirname, 'src/widgets/entries/checkbox.ts'),
        'widgets/date': resolve(__dirname, 'src/widgets/entries/date.ts'),
        'widgets/textarea': resolve(__dirname, 'src/widgets/entries/textarea.ts'),
        'widgets/button-list': resolve(__dirname, 'src/widgets/entries/button-list.ts'),
        'widgets/title': resolve(__dirname, 'src/widgets/entries/title.ts'),
        'widgets/divider': resolve(__dirname, 'src/widgets/entries/divider.ts'),
        'widgets/spacer': resolve(__dirname, 'src/widgets/entries/spacer.ts'),
        'widgets/toolbar-buttons': resolve(__dirname, 'src/widgets/entries/toolbar-buttons.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      // 外部化 Vue 和 TDesign，避免重复打包
      external: ['vue', 'tdesign-vue-next'],
      output: {
        // 将外部依赖保留为 import 语句
        globals: {
          vue: 'Vue',
          'tdesign-vue-next': 'TDesign',
        },
        // 公共 chunk 分割：base 和 renderer 作为共享依赖
        manualChunks(id) {
          if (id.includes('widgets/base/') || id.includes('widgets/registry')) {
            return 'base'
          }
        },
      },
    },
    outDir: 'dist/widgets',
    emptyOutDir: true,
    sourcemap: true,
    // 库模式下保留 CSS Modules 类名
    cssCodeSplit: true,
  },
})
