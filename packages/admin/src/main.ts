/**
 * Admin 壳应用入口
 *
 * 定位：微前端宿主 + 扩展子应用管理
 * Schema 页面渲染由 editor 的 PublishView 完成，admin 不做渲染。
 *
 * 支持两种运行模式：
 * 1. qiankun 子应用模式（嵌入 shell）— 等待宿主调用 mount()
 * 2. 独立运行模式（开发调试）— 直接挂载
 */
import { createApp } from 'vue'
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

import App from './App.vue'
import { createAdminRouter } from './router'

declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean
  }
}

// ============================================================
// Vue 应用工厂
// ============================================================
function createAdminApp() {
  const router = createAdminRouter()
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
  setupElementPlus(app)

  return { app, router }
}

// ============================================================
// 动态注册扩展子应用
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
// 启动
// ============================================================
let appInstance: ReturnType<typeof createApp> | null = null

// 独立运行时直接挂载
if (!window.__POWERED_BY_QIANKUN__) {
  const { app, router } = createAdminApp()
  appInstance = app
  app.mount('#app')

  // 独立模式下也加载扩展微应用
  loadAndRegisterMicroApps().then(() => {
    router.isReady().then(() => {
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
  })
}

// ============================================================
// Qiankun 生命周期钩子
// ============================================================
export async function bootstrap(): Promise<void> {
  console.log('[admin] bootstrap')
}

export async function mount(props?: { container?: Element }): Promise<void> {
  console.log('[admin] mount', props)
  if (!appInstance) {
    const { app, router } = createAdminApp()
    appInstance = app

    // qiankun 子应用模式：挂载到宿主提供的容器
    // 独立模式：挂载到自身的 #app
    const container = props?.container
    const mountEl = container
      ? (() => {
          // 宿主容器内没有 #app，需要创建一个
          let el = container.querySelector('#app')
          if (!el) {
            el = document.createElement('div')
            el.id = 'app'
            container.appendChild(el)
          }
          return el
        })()
      : '#app'

    app.mount(mountEl)

    loadAndRegisterMicroApps().then(() => {
      router.isReady().then(() => {
        try {
          start({
            sandbox: {
              strictStyleIsolation: true,
            },
          })
          console.log('[admin] qiankun started')
        } catch (err: unknown) {
          console.error('[admin] qiankun start failed:', err)
        }
      })
    })
  }
}

export async function unmount(): Promise<void> {
  console.log('[admin] unmount')
  if (appInstance) {
    appInstance.unmount()
    appInstance = null
  }
}
