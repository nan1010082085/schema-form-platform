import { createViteConfig } from '@schema-form/platform-shared/config/vite'

export default createViteConfig('shell', import.meta.url, {
  server: {
    port: 5050,
  },
})
