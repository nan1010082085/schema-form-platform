/**
 * createQiankunApp - Qiankun 子应用工厂函数
 *
 * 简化子应用的创建和生命周期管理
 */
import { createApp, type App, type Component } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

export interface CreateQiankunAppOptions {
  /** 应用名称 */
  name: string
  /** 根组件 */
  rootComponent: Component
  /** Element Plus 配置 */
  elementPlusConfig?: Record<string, unknown>
  /** 额外的插件 */
  plugins?: Array<{ install: (app: App) => void }>
  /** Token 提供者 */
  getToken?: () => string | null
}

/**
 * 创建 Qiankun 子应用
 */
export function createQiankunApp(options: CreateQiankunAppOptions) {
  const {
    name,
    rootComponent,
    elementPlusConfig = {},
    plugins = [],
    getToken,
  } = options

  let app: App | null = null

  function render(props: { container?: HTMLElement } = {}) {
    const { container } = props

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

    // 注册 Element Plus
    app.use(ElementPlus, elementPlusConfig)

    // 注册额外插件
    for (const plugin of plugins) {
      app.use(plugin)
    }

    // 挂载到指定容器或默认容器
    const mountEl = container
      ? container.querySelector('#app') || container
      : document.getElementById('app')!

    app.mount(mountEl)
  }

  // 独立运行时直接渲染
  if (!window.__POWERED_BY_QIANKUN__) {
    render()
  }

  // Qiankun 生命周期钩子
  return {
    async bootstrap() {
      console.log(`[${name}] bootstrap`)
    },

    async mount(props: { container?: HTMLElement }) {
      console.log(`[${name}] mount`, props)
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
