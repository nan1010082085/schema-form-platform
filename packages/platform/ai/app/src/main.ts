/**
 * AI 应用主入口
 *
 * 使用 createQiankunApp 统一注册，支持 qiankun 和 standalone 两种模式。
 */
import 'element-plus/dist/index.css'
import '@schema-form/platform-shared/styles/theme.scss'
import '@schema-form/platform-shared/styles/css-variables.scss'

import { createQiankunApp } from '@schema-form/platform-shared/qiankun/createQiankunApp'
import { useQiankun } from '@schema-form/platform-shared/qiankun'
import { setupElementPlus } from '@schema-form/platform-shared/config/element'

import App from './App.vue'
import { createAiRouter } from './router'
import { setTokenProvider } from './api/aiApi'

const { getGlobalState } = useQiankun()

// 设置 token 提供者：从 qiankun 全局状态读取
setTokenProvider(() => {
  const state = getGlobalState()
  return (state.token as string) || localStorage.getItem('sfp_access_token')
})

const router = createAiRouter()

const { bootstrap, mount, unmount } = createQiankunApp({
  name: 'ai',
  rootComponent: App,
  plugins: [router],
  getToken: () => {
    const state = getGlobalState()
    return (state.token as string) || null
  },
  extraSetup: (app) => {
    setupElementPlus(app)
  },
})

export { bootstrap, mount, unmount }
