import { createViteConfig, fixQiankunLifecyclePlugin } from '@schema-form/platform-shared/config/vite'
import qiankun from 'vite-plugin-qiankun'

const isProd = process.env.NODE_ENV === 'production'

export default createViteConfig('flow', import.meta.url, {
  base: isProd ? '/schema-platform/micro/flow/' : '/',
  plugins: [
    qiankun('flow', { useDevMode: true }),
    fixQiankunLifecyclePlugin(),
  ],
  server: {
    port: 5200,
  },
})
