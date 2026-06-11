/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface Window {
  __MICRO_APP_ENVIRONMENT__?: boolean
}

/** Vue Router 路由 meta 类型扩展 */
declare module 'vue-router' {
  interface RouteMeta {
    /** 路由所需权限编码，任一匹配即可访问 */
    permissions?: string[]
    /** 是否为公开路由（不需要认证） */
    public?: boolean
  }
}
