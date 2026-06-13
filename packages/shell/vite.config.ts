import { createViteConfig } from '@schema-form/shared-config/vite'

export default createViteConfig('shell', import.meta.url, {
  server: {
    port: 5000,
  },
})
