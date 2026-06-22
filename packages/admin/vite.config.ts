import { createViteConfig } from '@schema-form/shared-config/vite'
import qiankun from 'vite-plugin-qiankun'

const isProd = process.env.NODE_ENV === 'production'

export default createViteConfig('admin', import.meta.url, {
  base: isProd ? '/schema-platform/admin/' : '/',
  // dev 模式不加载 qiankun 插件（避免注入代码导致独立运行白屏）
  // prod 模式加载（作为子应用被 shell 加载）
  plugins: isProd ? [qiankun('admin')] : [],
  server: {
    port: 5555,
  },
})
