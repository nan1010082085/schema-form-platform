import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createChildApp } from '@schema-form/micro-app/child'
import { initMicroApp, installStyleGuard } from '@schema-form/micro-app/host'
import { applyThemeInline, installThemeWatchdog, AI_THEME_VARS } from '@schema-form/micro-app'

import App from './App.vue'
import { createAiRouter } from './router'

// 独立运行时初始化 micro-app 引擎（作为子应用嵌入宿主时宿主已初始化）
if (window.__MICRO_APP_ENVIRONMENT__) {
  installStyleGuard()
} else {
  initMicroApp()
}

applyThemeInline(AI_THEME_VARS)
installThemeWatchdog(AI_THEME_VARS)

let router: ReturnType<typeof createAiRouter>

createChildApp({
  createApp: () => {
    router = createAiRouter()
    const app = createApp(App)
    app.use(createPinia())
    app.use(router)
    app.use(ElementPlus)
    return app
  },
  getRouter: () => router,
})
