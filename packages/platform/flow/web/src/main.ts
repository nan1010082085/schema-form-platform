import 'element-plus/dist/index.css'
import '@schema-form/shared-styles/theme.scss'
import '@schema-form/shared-styles/css-variables.scss'
import './styles/variables.scss'
import './styles/theme.scss'
import { createQiankunApp } from '@schema-form/platform-shared/qiankun/createQiankunApp'
import { useQiankun } from '@schema-form/platform-shared/qiankun'
import { setupElementPlus } from '@schema-form/platform-shared/config/element'

import App from './App.vue'
import { createFlowRouter } from './router/index.js'
import { setTokenProvider } from './api/flowApi.js'

// 设置 token 提供者：从 qiankun 全局状态读取
const { getGlobalState } = useQiankun()
setTokenProvider(() => {
  const state = getGlobalState()
  return (state.token as string) || localStorage.getItem('sfp_access_token')
})

const router = createFlowRouter()

const { bootstrap, mount, unmount } = createQiankunApp({
  name: 'flow',
  rootComponent: App,
  plugins: [router, { install: (app) => setupElementPlus(app) }],
  getToken: () => {
    const state = getGlobalState()
    return (state.token as string) || null
  },
})

export { bootstrap, mount, unmount }
