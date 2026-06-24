/**
 * Admin 壳应用入口
 *
 * 定位：微前端宿主 + 扩展子应用管理
 * Schema 页面渲染由 editor 的 PublishView 完成，admin 不做渲染。
 */
import 'element-plus/dist/index.css'
import '@schema-form/platform-shared/styles/tokens.css'
import '@schema-form/platform-shared/styles/design-tokens.css'
import '@schema-form/platform-shared/styles/theme.scss'
import '@schema-form/platform-shared/styles/css-variables.scss'

import { createQiankunApp } from '@schema-form/platform-shared/qiankun/createQiankunApp'
import { useQiankun } from '@schema-form/platform-shared/qiankun'
import { setupElementPlus } from '@schema-form/platform-shared/config/element'
import { registerMicroApps, start } from 'qiankun'
import { apiClient } from '@schema-form/platform-shared/utils/apiClient'
import { APP_CONFIGS } from '@schema-form/platform-shared/qiankun/config'

import App from './App.vue'
import { createAdminRouter } from './router'

// ============================================================
// 动态注册扩展子应用
// ============================================================
const BUILTIN_APPS = new Set(Object.keys(APP_CONFIGS))

async function loadAndRegisterMicroApps(router: ReturnType<typeof createAdminRouter>): Promise<void> {
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

  // 启动 qiankun（用于扩展子应用）
  await router.isReady()
  try {
    start({
      sandbox: {
        strictStyleIsolation: true,
        experimentalStyleIsolation: false,
      },
    })
    console.log('[admin] qiankun started')
  } catch (err: unknown) {
    console.error('[admin] qiankun start failed:', err)
  }
}

// ============================================================
// createQiankunApp 统一注册
// ============================================================
const { getGlobalState } = useQiankun()
const router = createAdminRouter()

const { bootstrap, mount, unmount } = createQiankunApp({
  name: 'admin',
  rootComponent: App,
  plugins: [router],
  getToken: () => {
    const state = getGlobalState()
    return (state.token as string) || null
  },
  extraSetup: (app) => {
    setupElementPlus(app)
    // 加载扩展微应用并启动 qiankun
    loadAndRegisterMicroApps(router)
  },
})

export { bootstrap, mount, unmount }
