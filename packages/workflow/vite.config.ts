import { createViteConfig } from '@schema-form/shared-config/vite'

export default createViteConfig('workflow', import.meta.url, {
  server: { port: 5500 },
})
