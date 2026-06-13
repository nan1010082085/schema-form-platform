/**
 * AI 抽屉独立入口
 *
 * 不走路由，直接挂载 AiSidebarView。
 * 供 Editor / Flow 通过 qiankun 或 iframe 嵌入。
 */

import { createQiankunApp } from '@schema-form/shared-qiankun/createQiankunApp'
import { useQiankun } from '@schema-form/shared-qiankun'
import zhCN from 'tdesign-vue-next/esm/locale/zh_CN'
import './styles/theme-tech.css'

import AiSidebarView from './views/AiSidebarView.vue'

const { getGlobalState } = useQiankun()

const { bootstrap, mount, unmount } = createQiankunApp({
  name: 'ai-sidebar',
  rootComponent: AiSidebarView,
  tdesignConfig: {
    locale: zhCN,
    globalConfig: { size: 'medium' },
  },
  getToken: () => {
    const state = getGlobalState()
    return (state.token as string) || null
  },
})

export { bootstrap, mount, unmount }
