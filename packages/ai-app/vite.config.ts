import { fileURLToPath } from 'node:url'
import { createViteConfig } from '@schema-form/shared-config/vite'

export default createViteConfig('ai', import.meta.url, {
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        sidebar: fileURLToPath(new URL('./index-sidebar.html', import.meta.url)),
      },
    },
  },
})
