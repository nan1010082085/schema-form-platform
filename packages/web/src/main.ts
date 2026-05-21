import { createApp, type App as VueApp } from 'vue'
import { createPinia, type Pinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '@/styles/variables.scss'
import '@/styles/theme.scss'
import { renderWithQiankun, qiankunWindow, type QiankunProps } from 'vite-plugin-qiankun/dist/helper'

import App from './App.vue'
import router from './router'
import { useAppStore } from './stores/app'
import { createRequestInstance, setTokenGetter } from './utils/request'
import { configureApiClient } from './utils/apiClient'
import { registerAllWidgets } from './widgets'

let app: VueApp | null = null
let pinia: Pinia | null = null

function render(props: QiankunProps = {}) {
  const { container } = props
  app = createApp(App)
  pinia = createPinia()

  app.use(pinia)
  app.use(router)
  app.use(ElementPlus)
  registerAllWidgets()

  // 初始化 Schema API 客户端（qiankun 和 standalone 都需要）
  configureApiClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
    getToken: () => useAppStore(pinia!).requestContext.token,
    useMock: import.meta.env.VITE_USE_MOCK === 'true',
  })

  const mountEl = container
    ? (container.querySelector('#app') ?? container)
    : document.getElementById('app')!

  app.mount(mountEl)
}

renderWithQiankun({
  async bootstrap() {
    console.log('[schema-form] bootstrap')
  },
  async mount(props: QiankunProps) {
    console.log('[schema-form] mount', props)

    // 初始化 store 并接收主应用 props
    render(props)
    const appStore = useAppStore(pinia!)
    appStore.setQiankunProps(props)

    // 初始化 axios 请求实例
    const reqCtx = appStore.requestContext
    createRequestInstance({
      baseUrl: reqCtx.baseUrl,
      token: reqCtx.token,
      headers: reqCtx.headers
    })
    setTokenGetter(() => useAppStore(pinia!).requestContext.token)

    // 初始化 Schema API 客户端
    configureApiClient({
      baseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
      getToken: () => useAppStore(pinia!).requestContext.token,
      useMock: import.meta.env.VITE_USE_MOCK === 'true',
    })
  },
  async unmount() {
    console.log('[schema-form] unmount')
    app?.unmount()
    app = null
    pinia = null
  },
  async update() {
    console.log('[schema-form] update')
  }
})

// 独立运行模式
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render()
}
