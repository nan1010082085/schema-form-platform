import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createChildApp } from '@schema-form/micro-app/child'

import App from './App.vue'
import router from './router'

createChildApp({
  createApp: () => {
    const app = createApp(App)
    app.use(createPinia())
    app.use(router)
    app.use(ElementPlus)
    return app
  },
  router,
})
