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

const MICRO_APP_TOKEN_KEY = 'sfp_access_token'
const MICRO_APP_REFRESH_KEY = 'sfp_refresh_token'
const MICRO_APP_USER_KEY = 'sfp_user_key'

/**
 * 宿主传递给子应用的认证数据格式
 *
 * 宿主通过 `<micro-app :data="{ token, refreshToken, userKey }">` 传递，
 * 子应用通过 `window.microApp.getData()` 读取。
 */
export interface MicroAppAuthData {
  token: string | null
  refreshToken: string | null
  userKey: string | null
}

/**
 * 从宿主传递的 micro-app data 中获取认证数据
 *
 * 宿主通过 `<micro-app :data="{ token, refreshToken, userKey }">` 将认证数据传给子应用，
 * 子应用通过 `window.microApp.getData()` 读取。
 *
 * @returns 认证数据对象，微前端环境外或读取失败时返回全 null 对象
 */
export function getMicroAppAuthData(): MicroAppAuthData {
  const empty: MicroAppAuthData = { token: null, refreshToken: null, userKey: null }
  if (!window.__MICRO_APP_ENVIRONMENT__) return empty
  try {
    const data = window.microApp?.getData()
    if (!data) return empty
    const token = data.token
    const refreshToken = data.refreshToken
    const userKey = data.userKey
    return {
      token: typeof token === 'string' && token.length > 0 ? token : null,
      refreshToken: typeof refreshToken === 'string' && refreshToken.length > 0 ? refreshToken : null,
      userKey: typeof userKey === 'string' && userKey.length > 0 ? userKey : null,
    }
  } catch {
    return empty
  }
}

/**
 * 从宿主传递的 micro-app data 中获取 token（向后兼容）
 *
 * @deprecated 使用 getMicroAppAuthData() 替代，可同时获取 refreshToken 和 userKey
 * @returns token 字符串，未获取到时返回 null
 */
export function getMicroAppToken(): string | null {
  return getMicroAppAuthData().token
}

/**
 * 统一 token 解析：优先 localStorage（standalone），其次 micro-app data（微前端）
 *
 * 子应用 apiClient 的 tokenProvider 应使用此函数。
 * 两种模式下 token 来源不同：
 * - standalone: 子应用自身登录后写入 localStorage
 * - 微前端: 宿主登录后通过 micro-app data 属性传递，同时同步到统一 localStorage key
 *
 * @param localStorageKey - localStorage 中存储 token 的 key（默认 'sfp_access_token'）
 * @returns token 字符串，未获取到时返回 null
 */
export function resolveToken(localStorageKey = MICRO_APP_TOKEN_KEY): string | null {
  // 微前端模式：优先从宿主获取
  if (window.__MICRO_APP_ENVIRONMENT__) {
    const authData = getMicroAppAuthData()
    if (authData.token) {
      // 同步所有认证数据到统一的 localStorage key
      syncAuthDataToLocalStorage(authData)
      return authData.token
    }
  }

  // standalone 模式：从 localStorage 获取
  try {
    return localStorage.getItem(localStorageKey)
  } catch {
    return null
  }
}

/**
 * 将微前端认证数据同步到统一的 localStorage key
 *
 * 确保子应用在微前端模式下也能通过统一的 key 访问 refreshToken 和 userKey。
 * 这些数据由宿主通过 micro-app data 属性传递。
 *
 * @param authData - 从宿主获取的认证数据
 */
function syncAuthDataToLocalStorage(authData: MicroAppAuthData): void {
  try {
    if (authData.token) {
      localStorage.setItem(MICRO_APP_TOKEN_KEY, authData.token)
    }
    if (authData.refreshToken) {
      localStorage.setItem(MICRO_APP_REFRESH_KEY, authData.refreshToken)
    }
    if (authData.userKey) {
      localStorage.setItem(MICRO_APP_USER_KEY, authData.userKey)
    }
  } catch {
    // localStorage 写入失败时静默处理（如隐私模式）
  }
}

/**
 * 解析完整的微前端认证数据
 *
 * 微前端模式：从宿主 micro-app data 获取 { token, refreshToken, userKey }
 * standalone 模式：从 localStorage 获取 token，refreshToken 和 userKey 为 null
 *
 * @param localStorageKey - localStorage 中存储 token 的 key（默认 'sfp_access_token'）
 * @returns 认证数据对象
 */
export function resolveMicroAppAuthData(localStorageKey = MICRO_APP_TOKEN_KEY): MicroAppAuthData {
  // 微前端模式：优先从宿主获取
  if (window.__MICRO_APP_ENVIRONMENT__) {
    const authData = getMicroAppAuthData()
    if (authData.token) return authData
  }

  // standalone 模式：从 localStorage 获取 token
  try {
    const localToken = localStorage.getItem(localStorageKey)
    return {
      token: localToken,
      refreshToken: null,
      userKey: null,
    }
  } catch {
    return { token: null, refreshToken: null, userKey: null }
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
