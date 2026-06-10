import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '@/styles/variables.scss'
import '@/styles/theme.scss'
import { createChildApp } from '@schema-form/micro-app/child'
import { initMicroApp, installStyleGuard } from '@schema-form/micro-app/host'
import { applyThemeInline, installThemeWatchdog, EDITOR_THEME_VARS } from '@schema-form/micro-app'

import App from './App.vue'
import { createEditorRouter } from './router'
import { configureApiClient } from './utils/apiClient'
import { registerAllWidgets } from './widgets'
import { permissionDirective } from './directives/permission'

// 独立运行时初始化 micro-app 引擎（作为子应用嵌入宿主时宿主已初始化）
if (window.__MICRO_APP_ENVIRONMENT__) {
  installStyleGuard()
} else {
  initMicroApp()
}
applyThemeInline(EDITOR_THEME_VARS)
installThemeWatchdog(EDITOR_THEME_VARS)

let router: ReturnType<typeof createEditorRouter>

createChildApp({
  createApp: () => {
    router = createEditorRouter()
    const app = createApp(App)
    const pinia = createPinia()

    // 全局错误边界：捕获未被 ErrorBoundary 组件处理的运行时错误
    app.config.errorHandler = (err, _instance, info) => {
      console.error('[GlobalError]', err, info)
      // 后续可接入错误上报服务
    }

    app.use(pinia)
    app.use(router)
    app.use(ElementPlus)
    app.directive('permission', permissionDirective)
    registerAllWidgets()

    configureApiClient({
      baseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
      useMock: import.meta.env.VITE_USE_MOCK === 'true',
    })

    return app
  },
  getRouter: () => router,
})
