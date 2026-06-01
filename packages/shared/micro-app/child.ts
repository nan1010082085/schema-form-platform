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
  }
}

let app: VueApp | null = null

function unmountApp(router?: ChildAppOptions['router']): void {
  if (!app) return
  app.unmount()
  app = null
  router?.replace('/')
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
  const { createApp, selector = '#app', router, mount, unmount, bootstrap } = options

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
      unmountApp(router)
      await unmount?.()
    }

    return
  }

  // standalone 模式：直接渲染
  render()
}
