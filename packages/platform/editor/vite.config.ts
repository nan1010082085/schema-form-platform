import { createViteConfig } from '@schema-form/platform-shared/config/vite'
import qiankun from 'vite-plugin-qiankun'

// dev 下 base 为 /（避免 qiankun 加载时路径重复 /schema-platform/schema-platform/）
// production 下 base 为 /schema-platform/editor/（匹配 nginx）
const isProd = process.env.NODE_ENV === 'production'

export default createViteConfig('editor', import.meta.url, {
  base: isProd ? '/schema-platform/editor/' : '/',
  plugins: [
    qiankun('editor', { useDevMode: true }),
  ],
  server: {
    port: 5100,
  },
})
