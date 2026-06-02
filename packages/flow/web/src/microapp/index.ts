/**
 * Flow 子应用入口
 *
 * 将 flow 设计器打包为 micro-app 子应用，供 portal 嵌入。
 * 同时支持 standalone 模式独立运行。
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import { createChildApp } from '@schema-form/micro-app/child'
import { initMicroApp, installStyleGuard } from '@schema-form/micro-app/host'
import App from '../App.vue'
import { applyThemeInline, installThemeWatchdog } from './themeGuard.js'
import { createFlowRouter } from '../router/index.js'

/**
 * 初始化 flow 子应用
 *
 * - 子应用模式：仅安装样式守卫，引擎由宿主启动
 * - standalone 模式：启动 micro-app 引擎 + 样式守卫
 */
export function createFlowChildApp(): void {
  if (window.__MICRO_APP_ENVIRONMENT__) {
    installStyleGuard()
  } else {
    initMicroApp()
  }

  applyThemeInline()
  installThemeWatchdog()

  let router: ReturnType<typeof createFlowRouter>

  createChildApp({
    createApp: () => {
      router = createFlowRouter()
      const app = createApp(App)
      app.use(createPinia())
      app.use(router)
      app.use(ElementPlus)
      return app
    },
    getRouter: () => router,
  })
}
