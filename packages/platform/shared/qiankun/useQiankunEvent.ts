/**
 * useQiankunEvent - Qiankun 事件通信组合函数
 *
 * 基于 qiankun globalState 机制实现父子应用事件通信。
 * 子应用通过 initQiankunLifecycle 注入 qiankun props 后，事件自动通过 globalState 通道传递。
 */
import type { QiankunEvent, QiankunProps } from './types'

type EventHandler = (payload: unknown) => void

const eventListeners = new Map<string, Set<EventHandler>>()
const EVENT_CHANNEL_KEY = '__qiankun_event__'

/** 存储 qiankun 注入的 props（子应用 mount 时设置） */
let qiankunSetGlobalState: QiankunProps['setGlobalState']

/**
 * 初始化 qiankun 生命周期连接
 *
 * 子应用在 mount 生命周期中调用，注入 qiankun props 以启用 globalState 事件通道。
 */
export function initQiankunLifecycle(props: QiankunProps): void {
  qiankunSetGlobalState = props.setGlobalState

  props.onGlobalStateChange?.((state) => {
    const event = state[EVENT_CHANNEL_KEY] as QiankunEvent | undefined
    if (!event?.type) return

    const handlers = eventListeners.get(event.type)
    if (handlers) {
      for (const h of handlers) {
        h(event.payload)
      }
    }
  })
}

function dispatchEvent(event: QiankunEvent): void {
  if (qiankunSetGlobalState) {
    qiankunSetGlobalState({ [EVENT_CHANNEL_KEY]: event })
  }
}

function registerListener(type: string, handler: EventHandler): () => void {
  if (!eventListeners.has(type)) {
    eventListeners.set(type, new Set())
  }

  const set = eventListeners.get(type)!
  set.add(handler)

  return () => {
    set.delete(handler)
  }
}

/**
 * 使用 Qiankun 事件通信
 */
export function useQiankunEvent() {
  /**
   * 发送事件到父应用（子应用调用，通过 globalState 传递）
   */
  function emitToParent(event: QiankunEvent): void {
    dispatchEvent(event)
  }

  /**
   * 监听来自父应用的事件（子应用调用）
   */
  function onParentEvent(type: string, handler: EventHandler): () => void {
    return registerListener(type, handler)
  }

  /**
   * 监听来自子应用的事件（父应用调用）
   */
  function onChildEvent(type: string, handler: EventHandler): () => void {
    return registerListener(type, handler)
  }

  /**
   * 发送事件到子应用（父应用调用，通过 globalState 广播）
   */
  function emitToChild(event: QiankunEvent): void {
    dispatchEvent(event)
  }

  return {
    emitToParent,
    onParentEvent,
    onChildEvent,
    emitToChild,
  }
}
