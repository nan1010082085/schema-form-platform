/**
 * Qiankun 类型定义
 */

/** Qiankun 生命周期钩子 */
export interface QiankunLifecycle {
  bootstrap: () => Promise<void>
  mount: (props: QiankunProps) => Promise<void>
  unmount: () => Promise<void>
}

/** Qiankun 传递的 props */
export interface QiankunProps {
  container?: HTMLElement
  onGlobalStateChange?: (state: Record<string, unknown>, prev: Record<string, unknown>) => void
  setGlobalState?: (state: Record<string, unknown>) => boolean
}

/** Qiankun 事件 */
export interface QiankunEvent {
  type: string
  payload?: unknown
}
