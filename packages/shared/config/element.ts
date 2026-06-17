/**
 * Element Plus 全局设置
 *
 * 注册 Element Plus 组件和图标到 Vue 应用实例。
 * 各子应用在 main.ts 中调用 setupElementPlus(app) 即可。
 */
import type { App } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

export function setupElementPlus(app: App): void {
  app.use(ElementPlus, {
    locale: zhCn,
    size: 'default',
    zIndex: 3000,
  })

  // 注册所有图标组件
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }
}
