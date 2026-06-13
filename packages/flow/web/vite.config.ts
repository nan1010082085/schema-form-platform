import { createViteConfig } from '@schema-form/shared-config/vite'
import { APP_CONFIGS } from '@schema-form/shared-qiankun/config'
import qiankun from 'vite-plugin-qiankun'

const appConfig = APP_CONFIGS.flow

export default createViteConfig('flow', import.meta.url, {
  plugins: [
    qiankun('flow', { useDevMode: true }),
    {
      name: 'root-redirect',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/') {
            res.writeHead(302, { Location: appConfig.basePath })
            res.end()
            return
          }
          next()
        })
      },
    },
  ],
})
