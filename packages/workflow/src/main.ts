import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '@schema-form/shared-styles/tokens.css'
import { elementPlusConfig, elementPlusSize } from '@schema-form/shared-config/elementPlus'
import { createChildApp, resolveToken } from '@schema-form/micro-app/child'
import { initMicroApp, installStyleGuard } from '@schema-form/micro-app/host'

import App from './App.vue'
import { createWorkflowRouter } from './router'
import { setTokenProvider } from '@schema-form/shared-utils/apiClient'

// 独立运行时初始化 micro-app 引擎
if (window.__MICRO_APP_ENVIRONMENT__) {
  installStyleGuard()
} else {
  initMicroApp()
}

// 设置 token 提供者
setTokenProvider(() => resolveToken())

let router: ReturnType<typeof createWorkflowRouter>

createChildApp({
  createApp: () => {
    router = createWorkflowRouter()
    const app = createApp(App)
    const pinia = createPinia()

    app.use(pinia)
    app.use(router)
    app.use(ElementPlus, { ...elementPlusConfig, size: elementPlusSize })

    return app
  },
  getRouter: () => router,
})
