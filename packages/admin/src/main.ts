/**
 * Admin 壳应用入口
 *
 * 运行模式：
 * 1. 独立运行（开发调试）— document 中已有 #app，直接挂载
 * 2. qiankun 子应用（嵌入 shell）— 由宿主调用 mount()
 */
import { createApp, type App } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'
import '@schema-form/shared-styles/tokens.css'
import '@schema-form/shared-styles/design-tokens.css'
import '@schema-form/shared-styles/theme.scss'
import '@schema-form/shared-styles/css-variables.scss'
import { setupElementPlus } from '@schema-form/shared-config/element'
import { registerMicroApps, start } from 'qiankun'
import { apiClient } from '@schema-form/shared-utils/apiClient'
import { APP_CONFIGS } from '@schema-form/shared-qiankun/config'

import AppRoot from './App.vue'
import { createAdminRouter } from './router'

// ============================================================
// 状态
// ============================================================
let appInstance: App | null = null
let qiankunStarted = false

// ============================================================
// Vue 应用工厂
// ============================================================
function createAdminApp() {
  const router = createAdminRouter()
  const app = createApp(AppRoot)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
  setupElementPlus(app)

  return { app, router }
}

// ============================================================
// 扩展子应用注册
// ============================================================
const BUILTIN_APPS = new Set(Object.keys(APP_CONFIGS))

async function loadAndRegisterMicroApps(): Promise<void> {
  try {
    const res = await apiClient.get<{ items: Array<{ name: string; url: string; activeRule: string; status: string }> }>('/micro-apps?status=active')
    const apps = res.items
      .filter(app => !BUILTIN_APPS.has(app.name) && app.url && app.activeRule)
      .map(app => ({
        name: app.name,
        entry: app.url,
        container: '#micro-app-container',
        activeRule: app.activeRule,
      }))

    if (apps.length > 0) {
      registerMicroApps(apps)
      console.log(`[admin] registered ${apps.length} extension micro-apps`)
    }
  } catch (err) {
    console.warn('[admin] failed to load micro-app configs:', err)
  }
}

// ============================================================
// 启动 qiankun（只执行一次）
// ============================================================
function startQiankunOnce(): void {
  if (qiankunStarted) return
  qiankunStarted = true

  loadAndRegisterMicroApps().then(() => {
    try {
      start({
        sandbox: {
          experimentalStyleIsolation: true,
        },
      })
      console.log('[admin] qiankun started')
    } catch (err: unknown) {
      console.error('[admin] qiankun start failed:', err)
    }
  })
}

// ============================================================
// 独立运行模式
// ============================================================
const isStandalone = !window.__POWERED_BY_QIANKUN__

if (isStandalone) {
  console.log('[admin] standalone mode')
  const { app, router } = createAdminApp()
  appInstance = app
  app.mount('#app')
  router.isReady().then(startQiankunOnce)
}

// ============================================================
// Qiankun 生命周期
// ============================================================
export async function bootstrap(): Promise<void> {
  console.log('[admin] bootstrap')
}

export async function mount(props?: { container?: Element }): Promise<void> {
  console.log('[admin] mount')

  if (appInstance) {
    console.warn('[admin] already mounted, skip')
    return
  }

  const { app, router } = createAdminApp()
  appInstance = app

  // 宿主提供的容器
  const hostContainer = props?.container
  if (hostContainer) {
    // 在宿主容器内创建挂载点
    const mountEl = document.createElement('div')
    mountEl.id = 'admin-root'
    hostContainer.appendChild(mountEl)
    app.mount(mountEl)
  } else {
    app.mount('#app')
  }

  router.isReady().then(startQiankunOnce)
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
    qiankunStarted = false
  }
}
