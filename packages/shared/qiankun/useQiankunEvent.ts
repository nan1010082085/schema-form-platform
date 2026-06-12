/**
 * useQiankunEvent - Qiankun 事件通信组合函数
 *
 * 提供子应用之间的事件通信能力
 */
import { ref, onUnmounted } from 'vue'
import type { QiankunEvent } from './types'

type EventHandler = (payload: unknown) => void

const eventListeners = new Map<string, Set<EventHandler>>()

/**
 * 使用 Qiankun 事件通信
 */
export function useQiankunEvent() {
  /**
   * 发送事件到父应用
   */
  function emitToParent(event: QiankunEvent): void {
    window.parent.postMessage(event, '*')
  }

  /**
   * 监听来自父应用的事件
   */
  function onParentEvent(type: string, handler: EventHandler): () => void {
    if (!eventListeners.has(type)) {
      eventListeners.set(type, new Set())

      // 注册全局消息监听
      window.addEventListener('message', (event: MessageEvent) => {
        const data = event.data as QiankunEvent | undefined
        if (!data?.type) return

        const handlers = eventListeners.get(data.type)
        if (handlers) {
          for (const h of handlers) {
            h(data.payload)
          }
        }
      })
    }

    const set = eventListeners.get(type)!
    set.add(handler)

    // 返回取消监听函数
    return () => {
      set.delete(handler)
    }
  }

  /**
   * 监听来自子应用的事件
   */
  function onChildEvent(type: string, handler: EventHandler): () => void {
    return onParentEvent(type, handler)
  }

  /**
   * 发送事件到子应用
   */
  function emitToChild(event: QiankunEvent): void {
    // 通过 postMessage 发送到所有子应用
    const iframes = document.querySelectorAll('iframe')
    iframes.forEach(iframe => {
      iframe.contentWindow?.postMessage(event, '*')
    })
  }

  return {
    emitToParent,
    onParentEvent,
    onChildEvent,
    emitToChild,
  }
}
