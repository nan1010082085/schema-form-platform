import { createViteConfig } from '@schema-form/shared-config/vite'

const isProd = process.env.NODE_ENV === 'production'

export default createViteConfig('admin', import.meta.url, {
  base: isProd ? '/schema-platform/admin/' : '/',
  server: {
    port: 5555,
  },
})
