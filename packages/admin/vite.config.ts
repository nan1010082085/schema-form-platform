import { createViteConfig } from '@schema-form/shared-config/vite'
import qiankun from 'vite-plugin-qiankun'

const isProd = process.env.NODE_ENV === 'production'

export default createViteConfig('admin', import.meta.url, {
  base: isProd ? '/schema-platform/admin/' : '/',
  plugins: [
    qiankun('admin', { useDevMode: true }),
  ],
  server: {
    port: 5400,
  },
})
