import { fileURLToPath } from 'node:url'
import { createViteConfig } from '@schema-form/shared-config/vite'
import qiankun from 'vite-plugin-qiankun'

export default createViteConfig('ai', import.meta.url, {
  plugins: [
    qiankun('ai', { useDevMode: true }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        sidebar: fileURLToPath(new URL('./index-sidebar.html', import.meta.url)),
      },
    },
  },
})
