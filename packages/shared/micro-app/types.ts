import type { App as VueApp, StyleValue } from 'vue'

// ---- 宿主侧 ----

/** micro-app 实例配置（useMicroApp composable 使用） */
export interface MicroAppConfig {
  /** 子应用名称（唯一标识） */
  name: string
  /** 子应用 URL */
  url: string
  /** 传递给子应用的数据 */
  data?: Record<string, unknown>
}

/** MicroApp 组件 Props */
export interface MicroAppProps {
  /** 子应用名称（唯一标识） */
  name: string
  /** 子应用 URL */
  url: string
  /** 传递给子应用的数据（默认 {}） */
  data?: Record<string, unknown>
  /** 是否使用 iframe 模式（默认 true） */
  iframe?: boolean
  /** 自定义容器样式 */
  style?: StyleValue
  /** 自定义 class */
  class?: string | Record<string, boolean> | Array<string | Record<string, boolean>>
}

/** micro-app 生命周期事件 */
export interface MicroAppLifecycleEvent {
  name: string
  appName: string
}

export interface MicroAppErrorEvent {
  name: string
  appName: string
  error: Error
}

// ---- 子应用侧 ----

/** 子应用生命周期钩子 */
export interface ChildAppHooks {
  /** 子应用 bootstrap 钩子 */
  bootstrap?: () => Promise<void>
  /** 子应用 mount 钩子（data 为宿主通过 micro-app data 属性传递的数据） */
  mount?: (data?: unknown) => Promise<void>
  /** 子应用 unmount 钩子 */
  unmount?: () => Promise<void>
}

/** 子应用创建选项 */
export interface ChildAppOptions extends ChildAppHooks {
  /** Vue 应用创建函数 */
  createApp: () => VueApp
  /** 挂载选择器（默认 '#app'） */
  selector?: string
  /** 路由实例（unmount 时重置） */
  router?: { replace: (path: string) => void }
}

// ---- Bridge 通信 ----

/** postMessage 消息格式 */
export interface BridgeMessage<T = unknown> {
  type: string
  payload: T
}
