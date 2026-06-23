/**
 * Admin 壳应用入口
 *
 * 运行模式：
 * 1. 独立运行（开发调试）— 直接挂载到 #app
 * 2. qiankun 子应用（嵌入 shell）— 由宿主调用 mount()
 */
import { createApp, type App } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'
import '@schema-form/platform-shared/styles/tokens.css'
import '@schema-form/platform-shared/styles/design-tokens.css'
import '@schema-form/platform-shared/styles/theme.scss'
import '@schema-form/platform-shared/styles/css-variables.scss'
import { setupElementPlus } from '@schema-form/platform-shared/config/element'

import AppRoot from './App.vue'
import { createAdminRouter } from './router'

let appInstance: App | null = null

function createAdminApp() {
  const router = createAdminRouter()
  const app = createApp(AppRoot)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
  setupElementPlus(app)

  return { app, router }
}

// 独立运行
if (!window.__POWERED_BY_QIANKUN__) {
  console.log('[admin] standalone mode')
  const { app } = createAdminApp()
  appInstance = app
  app.mount('#app')
}

// Qiankun 生命周期
export async function bootstrap() {
  console.log('[admin] bootstrap')
}

export async function mount(props?: { container?: Element }): Promise<void> {
  console.log('[admin] mount')

  if (appInstance) {
    console.warn('[admin] already mounted, skip')
    return
  }

  const { app } = createAdminApp()
  appInstance = app

  const hostContainer = props?.container
  if (hostContainer) {
    const mountEl = document.createElement('div')
    mountEl.id = 'admin-root'
    hostContainer.appendChild(mountEl)
    app.mount(mountEl)
  } else {
    app.mount('#app')
  }
}

export async function unmount(): Promise<void> {
  console.log('[admin] unmount')
  if (appInstance) {
    try {
      appInstance.unmount()
    } catch (e) {
      console.warn('[admin] unmount error:', e)
    }
    appInstance = null
  }
}
