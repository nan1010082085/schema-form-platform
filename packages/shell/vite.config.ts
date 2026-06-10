import { createViteConfig } from '@schema-form/shared-config/vite'

export default createViteConfig('portal', import.meta.url, {
  server: {
    port: 4100,
  },
})
