import { createViteConfig } from '@schema-form/shared-config/vite'
import qiankun from 'vite-plugin-qiankun'

export default createViteConfig('editor', import.meta.url, {
  plugins: [
    qiankun('editor', { useDevMode: true }),
  ],
})
