/**
 * 子应用侧生命周期管理
 *
 * 封装 micro-app 子应用的 mount/unmount 生命周期，
 * 子应用 main.ts 调用 createChildApp 即可自动处理。
 */
import type { App as VueApp } from 'vue'
import type { ChildAppOptions } from './types.js'

declare global {
  interface Window {
    __MICRO_APP_ENVIRONMENT__?: boolean
    __MICRO_APP_NAME__?: string
    mount?: (data: unknown) => Promise<void>
    unmount?: () => Promise<void>
    microApp?: {
      getData: () => Record<string, unknown> | null
      addDataListener: (cb: (data: Record<string, unknown>) => void) => void
    }
  }
}

let app: VueApp | null = null

// ---- Token 获取 ----

const MICRO_APP_TOKEN_KEY = 'shell_access_token'

/**
 * 从宿主传递的 micro-app data 中获取 token
 *
 * 宿主通过 `<micro-app :data="{ token }">` 将 token 传给子应用，
 * 子应用通过 `window.microApp.getData()` 读取。
 *
 * @returns token 字符串，未获取到时返回 null
 */
export function getMicroAppToken(): string | null {
  if (!window.__MICRO_APP_ENVIRONMENT__) return null
  try {
    const data = window.microApp?.getData()
    const token = data?.token
    return typeof token === 'string' && token.length > 0 ? token : null
  } catch {
    return null
  }
}

/**
 * 统一 token 解析：优先 localStorage（standalone），其次 micro-app data（微前端）
 *
 * 子应用 apiClient 的 tokenProvider 应使用此函数。
 * 两种模式下 token 来源不同：
 * - standalone: 子应用自身登录后写入 localStorage
 * - 微前端: 宿主登录后通过 micro-app data 属性传递
 *
 * @param localStorageKey - localStorage 中存储 token 的 key（默认 'shell_access_token'）
 * @returns token 字符串，未获取到时返回 null
 */
export function resolveToken(localStorageKey = MICRO_APP_TOKEN_KEY): string | null {
  // 微前端模式：优先从宿主获取
  const microToken = getMicroAppToken()
  if (microToken) return microToken

  // standalone 模式：从 localStorage 获取
  try {
    return localStorage.getItem(localStorageKey)
  } catch {
    return null
  }
}

function unmountApp(router?: ChildAppOptions['router'], getRouter?: ChildAppOptions['getRouter']): void {
  if (!app) return
  const r = router ?? getRouter?.()
  app.unmount()
  app = null
  r?.replace('/')
}

/**
 * 获取 micro-app 内部的子应用容器。
 * 在 micro-app 元素内部查找 #app，避免选到宿主根元素。
 */
function getMicroAppContainer(appName: string): Element | null {
  const microAppEl = document.querySelector(`micro-app[name="${appName}"]`)
  if (!microAppEl) return null
  // 优先找子应用 HTML 中的 #app，找不到就用 micro-app 元素本身
  return microAppEl.querySelector('#app') ?? microAppEl
}

/**
 * 创建子应用，自动处理 micro-app / standalone 两种模式。
 *
 * @example
 * ```ts
 * // ai-app/src/main.ts
 * import { createChildApp } from '@schema-form/micro-app/child'
 * import App from './App.vue'
 * import router from './router'
 *
 * createChildApp({
 *   createApp: () => {
 *     const app = createApp(App)
 *     app.use(createPinia())
 *     app.use(router)
 *     app.use(ElementPlus)
 *     return app
 *   },
 *   router,
 * })
 * ```
 */
export function createChildApp(options: ChildAppOptions): void {
  const { createApp, selector = '#app', mount, unmount, bootstrap } = options

  function render(container?: Element | null) {
    app = createApp()
    app.mount(container ?? selector)
  }

  // micro-app 环境：注册 window.mount / window.unmount 生命周期钩子
  // micro-app 通过检测这两个全局函数判断子应用是否为 UMD 模式
  if (window.__MICRO_APP_ENVIRONMENT__ || window.__MICRO_APP_NAME__) {
    const appName = window.__MICRO_APP_NAME__ ?? ''

    window.mount = async (data: unknown) => {
      await bootstrap?.()
      await mount?.(data)
      const container = getMicroAppContainer(appName)
      render(container)
    }

    window.unmount = async () => {
      unmountApp(options.router, options.getRouter)
      await unmount?.()
    }

    return
  }

  // standalone 模式：直接渲染
  render()
}
