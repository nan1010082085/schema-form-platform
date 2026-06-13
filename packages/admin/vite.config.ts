import { createViteConfig } from '@schema-form/shared-config/vite'
import qiankun from 'vite-plugin-qiankun'

export default createViteConfig('admin', import.meta.url, {
  plugins: [
    qiankun('admin', { useDevMode: true }),
  ],
})
