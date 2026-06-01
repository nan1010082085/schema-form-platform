/**
 * 宿主 <-> 子应用 postMessage 通信桥
 *
 * 提供类型安全的消息发送和监听接口。
 * 宿主和子应用都可以使用。
 */

type EventHandler<T> = (payload: T) => void

const listeners = new Map<string, Set<EventHandler<unknown>>>()

let messageHandlerAttached = false

function ensureMessageHandler(): void {
  if (messageHandlerAttached) return
  messageHandlerAttached = true

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as { type?: string; payload?: unknown } | undefined
    if (!data?.type) return

    const handlers = listeners.get(data.type)
    if (handlers) {
      for (const handler of handlers) {
        handler(data.payload)
      }
    }
  })
}

/**
 * 发送消息
 *
 * - 子应用调用：发送给宿主（window.parent.postMessage）
 * - 宿主调用：发送给指定子应用（通过 micro-app data 或 contentWindow）
 */
export function bridgeSend<T>(type: string, payload: T, target?: Window): void {
  const message = { type, payload }
  if (target) {
    target.postMessage(message, '*')
  } else {
    // 默认发送给父窗口（子应用 -> 宿主）
    window.parent.postMessage(message, '*')
  }
}

/**
 * 监听消息，返回取消监听函数
 */
export function bridgeOn<T>(type: string, handler: EventHandler<T>): () => void {
  ensureMessageHandler()

  if (!listeners.has(type)) {
    listeners.set(type, new Set())
  }

  const set = listeners.get(type)!
  set.add(handler as EventHandler<unknown>)

  return () => {
    set.delete(handler as EventHandler<unknown>)
  }
}

/**
 * 移除指定类型的所有监听器
 */
export function bridgeOff(type: string): void {
  listeners.delete(type)
}

/**
 * 清理所有监听器
 */
export function bridgeDestroy(): void {
  listeners.clear()
}
