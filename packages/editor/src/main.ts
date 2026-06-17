import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'
import '@schema-form/shared-styles/css-variables.scss'

import { applyThemeInline, installThemeWatchdog, EDITOR_THEME_VARS, type ThemeVars } from '@schema-form/shared-qiankun/themeGuard'

import '@/styles/variables.scss'
import '@/styles/theme.scss'
import '@/styles/tech-theme.scss'

/** 科技感主题变量 — 覆盖 EDITOR_THEME_VARS 中的 Element Plus 变量 */
const TECH_THEME_VARS: ThemeVars = {
  ...EDITOR_THEME_VARS,
  '--el-color-primary': '#00d4ff',
  '--el-color-primary-light-3': '#33ddff',
  '--el-color-primary-light-5': '#66e3ff',
  '--el-color-primary-light-7': '#99ecff',
  '--el-color-primary-light-8': '#b3f0ff',
  '--el-color-primary-light-9': '#e6f9ff',
  '--el-color-primary-dark-2': '#00b8e6',
  '--el-color-warning': '#ffab40',
  '--el-color-danger': '#ff5252',
  '--el-color-success': '#00e676',
  '--el-text-color-primary': 'rgba(255, 255, 255, 0.95)',
  '--el-text-color-regular': 'rgba(255, 255, 255, 0.7)',
  '--el-text-color-placeholder': 'rgba(255, 255, 255, 0.35)',
  '--el-text-color-disabled': 'rgba(255, 255, 255, 0.2)',
  '--el-border-color': 'rgba(0, 212, 255, 0.12)',
  '--el-border-color-light': 'rgba(0, 212, 255, 0.08)',
  '--el-border-color-lighter': 'rgba(0, 212, 255, 0.06)',
  '--el-border-color-extra-light': 'rgba(0, 212, 255, 0.04)',
  '--el-border-color-dark': 'rgba(0, 212, 255, 0.15)',
  '--el-border-color-hover': '#00d4ff',
  '--el-border-color-focus': '#00d4ff',
  '--el-fill-color': 'rgba(0, 0, 0, 0.2)',
  '--el-fill-color-light': 'rgba(0, 0, 0, 0.15)',
  '--el-fill-color-lighter': 'rgba(0, 0, 0, 0.1)',
  '--el-fill-color-blank': '#111820',
  '--el-bg-color': '#111820',
  '--el-bg-color-page': '#0a0e14',
  '--el-bg-color-overlay': '#161d26',
  '--el-mask-color': 'rgba(0, 0, 0, 0.7)',
}

import App from './App.vue'
import { createEditorRouter } from './router'
import { configureApiClient } from './utils/apiClient'
import { registerAllWidgets } from './widgets'
import { permissionDirective } from './directives/permission'

// ============================================================
// 主题初始化
// ============================================================
applyThemeInline(TECH_THEME_VARS)
installThemeWatchdog(TECH_THEME_VARS)

// ============================================================
// Token 解析
// ============================================================
const TOKEN_KEY = 'sfp_access_token'

/** 统一 token 解析：优先 localStorage（standalone），其次 qiankun props（微前端） */
function resolveToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

// ============================================================
// Vue 应用工厂
// ============================================================
let router: ReturnType<typeof createEditorRouter>

function createEditorApp() {
  router = createEditorRouter()
  const app = createApp(App)
  const pinia = createPinia()

  // 全局错误边界：捕获未被 ErrorBoundary 组件处理的运行时错误
  app.config.errorHandler = (err, _instance, info) => {
    console.error('[GlobalError]', err, info)
    // 后续可接入错误上报服务
  }

  app.use(pinia)
  app.use(router)
  app.directive('permission', permissionDirective)
  registerAllWidgets()

  configureApiClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
    getToken: () => resolveToken() ?? '',
    useMock: import.meta.env.VITE_USE_MOCK === 'true',
  })

  return app
}

// ============================================================
// Qiankun 生命周期
// ============================================================
let app: ReturnType<typeof createApp> | null = null

declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean
  }
}

// 独立运行时直接挂载
if (!window.__POWERED_BY_QIANKUN__) {
  app = createEditorApp()
  app.mount('#app')
}

/** Qiankun 生命周期钩子 */
export async function bootstrap() {
  console.log('[editor-web] bootstrap')
}

export async function mount(props: { container?: HTMLElement }) {
  console.log('[editor-web] mount', props)
  app = createEditorApp()
  const container = props.container
  const mountEl = container?.querySelector('#app') ?? container ?? document.getElementById('app')!
  app.mount(mountEl)
}

export async function unmount() {
  console.log('[editor-web] unmount')
  if (app) {
    app.unmount()
    app = null
  }
  router?.replace('/')
}
