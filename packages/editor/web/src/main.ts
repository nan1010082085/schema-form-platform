import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '@/styles/variables.scss'
import '@/styles/theme.scss'
import { createChildApp } from '@schema-form/micro-app/child'
import { initMicroApp, installStyleGuard } from '@schema-form/micro-app/host'
import { applyThemeInline, installThemeWatchdog } from '@/microapp/themeGuard'

import App from './App.vue'
import router from './router'
import { configureApiClient } from './utils/apiClient'
import { registerAllWidgets } from './widgets'

// 独立运行时初始化 micro-app 引擎（作为子应用嵌入宿主时宿主已初始化）
if (window.__MICRO_APP_ENVIRONMENT__) {
  installStyleGuard()
  applyThemeInline()
  installThemeWatchdog()
} else {
  initMicroApp()
  applyThemeInline()
  installThemeWatchdog()
}

createChildApp({
  createApp: () => {
    const app = createApp(App)
    const pinia = createPinia()

    app.use(pinia)
    app.use(router)
    app.use(ElementPlus)
    registerAllWidgets()

    configureApiClient({
      baseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
      useMock: import.meta.env.VITE_USE_MOCK === 'true',
    })

    return app
  },
  router,
})
