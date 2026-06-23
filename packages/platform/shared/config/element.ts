/**
 * Element Plus 全局设置
 *
 * 注册 Element Plus 插件和图标到 Vue 应用实例。
 * locale / size / z-index 由各 App.vue 的 ElConfigProvider 单独配置，此处不重复设置。
 */
import type { App } from 'vue'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

export function setupElementPlus(app: App): void {
  app.use(ElementPlus)

  // 注册所有图标组件
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }
}
