/**
 * createQiankunApp - Qiankun 子应用工厂函数
 *
 * 简化子应用的创建和生命周期管理
 */
import { createApp, type App, type Component } from 'vue'
import { createPinia } from 'pinia'

// ── 工厂函数 ──

export interface CreateQiankunAppOptions {
  /** 应用名称 */
  name: string
  /** 根组件 */
  rootComponent: Component
  /** 额外的插件 */
  plugins?: Array<{ install: (app: App) => void }>
  /** Token 提供者 */
  getToken?: () => string | null
  /** 额外的 setup 回调（在插件注册后执行） */
  extraSetup?: (app: App) => void
}

/**
 * 创建 Qiankun 子应用
 */
export function createQiankunApp(options: CreateQiankunAppOptions) {
  const {
    name,
    rootComponent,
    plugins = [],
    getToken,
    extraSetup,
  } = options

  let app: App | null = null

  function render(props: { container?: HTMLElement } = {}) {
    const { container } = props

    console.log(`[${name}] render() called`, { hasContainer: !!container })

    // 注入 token
    if (getToken) {
      const token = getToken()
      if (token) {
        localStorage.setItem('sfp_access_token', token)
      }
    }

    app = createApp(rootComponent)

    // 注册 Pinia
    app.use(createPinia())

    // 注册额外插件
    for (const plugin of plugins) {
      app.use(plugin)
    }

    // 额外 setup 回调（用于注册 Element Plus 等组件库）
    if (extraSetup) {
      extraSetup(app)
    }

    // 挂载到指定容器或默认容器
    const mountEl = container
      ? container.querySelector('#app') || container
      : document.getElementById('app')

    console.log(`[${name}] mountEl`, { found: !!mountEl, id: mountEl?.id })

    if (!mountEl) {
      console.error(`[${name}] #app element not found, cannot mount`)
      return
    }

    app.mount(mountEl)
    console.log(`[${name}] app mounted successfully`)
  }

  // 独立运行时直接渲染
  if (!window.__POWERED_BY_QIANKUN__) {
    console.log(`[${name}] standalone mode, calling render()`)
    render()
    console.log(`[${name}] render() completed`)
  }

  // Qiankun 生命周期钩子
  return {
    async bootstrap() {
      console.log(`[${name}] bootstrap`)
    },

    async mount(props: { container?: HTMLElement }) {
      console.log(`[${name}] mount`, {
        container: props.container,
        containerId: props.container?.id,
        poweredByQiankun: !!window.__POWERED_BY_QIANKUN__,
      })
      render(props)
    },

    async unmount() {
      console.log(`[${name}] unmount`)
      if (app) {
        app.unmount()
        app = null
      }
    },
  }
}
