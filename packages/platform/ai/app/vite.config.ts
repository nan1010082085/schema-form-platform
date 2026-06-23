import { createViteConfig, fixQiankunLifecyclePlugin } from '@schema-form/platform-shared/config/vite'
import qiankun from 'vite-plugin-qiankun'

const isProd = process.env.NODE_ENV === 'production'

export default createViteConfig('ai', import.meta.url, {
  base: isProd ? '/schema-platform/ai/' : '/',
  plugins: [
    qiankun('ai', { useDevMode: true }),
    fixQiankunLifecyclePlugin(),
  ],
  server: {
    port: 5300,
  },
})
