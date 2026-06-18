/**
 * createQiankunApp - Qiankun 子应用工厂函数
 *
 * 简化子应用的创建和生命周期管理。
 * 支持两种运行模式：
 * - qiankun 模式：宿主调用 mount()/unmount() 生命周期
 * - 独立模式：模块加载时自动渲染到 #app
 *
 * 独立模式检测：
 * vite-plugin-qiankun 的 useDevMode 会在 dev 模式下设置 __POWERED_BY_QIANKUN__=true，
 * 即使实际是独立运行。因此设置 500ms 兜底——如果 qiankun 没有在 500ms 内调用 mount()，
 * 则视为独立模式，自动渲染。
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
  let standaloneFallbackTimer: ReturnType<typeof setTimeout> | null = null

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

  // 独立模式检测
  if (!window.__POWERED_BY_QIANKUN__) {
    // 明确不是 qiankun 模式，直接渲染
    console.log(`[${name}] standalone mode, calling render()`)
    render()
  } else {
    // __POWERED_BY_QIANKUN__ 为 true，可能是 qiankun 模式，
    // 也可能是 vite-plugin-qiankun 的 useDevMode 误设。
    // 设置 500ms 兜底：如果 qiankun 没有调用 mount()，自动渲染。
    standaloneFallbackTimer = setTimeout(() => {
      if (!app) {
        console.warn(`[${name}] qiankun mount() not called within 500ms, falling back to standalone render`)
        render()
      }
      standaloneFallbackTimer = null
    }, 500)
  }

  // Qiankun 生命周期钩子
  return {
    async bootstrap() {
      console.log(`[${name}] bootstrap`)
    },

    async mount(props: { container?: HTMLElement }) {
      // qiankun 调用了 mount()，取消 standalone fallback
      if (standaloneFallbackTimer) {
        clearTimeout(standaloneFallbackTimer)
        standaloneFallbackTimer = null
      }

      console.log(`[${name}] mount`, {
        container: props.container,
        containerId: props.container?.id,
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
