/**
 * 统一通信 API
 *
 * 提供 Portal <-> 子应用的双向通信机制。
 * 支持：
 * 1. 类型安全的事件发送和监听
 * 2. 请求-响应模式（带超时）
 * 3. 错误处理和回调
 * 4. 调试日志
 */

import type {
  MicroAppEvents,
  EventType,
  EventMessage,
  EventHandler,
  CommunicationError,
  ErrorCallback,
  CommunicationOptions,
  ChildAppName,
} from './events.js'

// ---- 内部状态 ----

const listeners = new Map<string, Set<EventHandler<EventType>>>()
let messageHandlerAttached = false
let globalOptions: CommunicationOptions = {}
const pendingRequests = new Map<string, { resolve: (value: unknown) => void; reject: (reason: CommunicationError) => void; timer: ReturnType<typeof setTimeout> }>()

// ---- 工具函数 ----

function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function log(level: 'info' | 'warn' | 'error', ...args: unknown[]): void {
  if (!globalOptions.debug) return
  const prefix = '[micro-app communication]'
  if (level === 'info') console.log(prefix, ...args)
  else if (level === 'warn') console.warn(prefix, ...args)
  else console.error(prefix, ...args)
}

function reportError(error: CommunicationError): void {
  log('error', error)
  globalOptions.onError?.(error)
}

// ---- 消息处理器 ----

function ensureMessageHandler(): void {
  if (messageHandlerAttached) return
  messageHandlerAttached = true

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as EventMessage | undefined
    if (!data?.type || !data?.payload) return

    log('info', 'Received message:', data)

    // 处理请求-响应模式的响应
    if (data.messageId && pendingRequests.has(data.messageId)) {
      const pending = pendingRequests.get(data.messageId)!
      clearTimeout(pending.timer)
      pendingRequests.delete(data.messageId)
      pending.resolve(data.payload)
      return
    }

    // 分发事件到监听器
    const handlers = listeners.get(data.type)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data.payload)
        } catch (err) {
          reportError({
            code: 'HANDLER_ERROR',
            message: `Handler error for event ${data.type}`,
            cause: err instanceof Error ? err : new Error(String(err)),
            eventType: data.type,
            messageId: data.messageId,
          })
        }
      }
    }
  })

  log('info', 'Message handler attached')
}

// ---- 发送 API ----

/**
 * 发送事件到目标
 *
 * @param type - 事件类型
 * @param payload - 事件数据
 * @param target - 目标窗口（Portal 发送给子应用时需要）
 * @param source - 来源标识
 */
export function send<T extends EventType>(
  type: T,
  payload: MicroAppEvents[T],
  target?: Window,
  source: 'portal' | ChildAppName = 'portal',
): void {
  const message: EventMessage<T> = {
    type,
    payload,
    timestamp: Date.now(),
    source,
  }

  log('info', 'Sending message:', message)

  try {
    if (target) {
      target.postMessage(message, '*')
    } else {
      // 默认发送给父窗口（子应用 -> Portal）
      window.parent.postMessage(message, '*')
    }
  } catch (err) {
    reportError({
      code: 'SEND_FAILED',
      message: `Failed to send event ${type}`,
      cause: err instanceof Error ? err : new Error(String(err)),
      eventType: type,
    })
  }
}

/**
 * 发送请求并等待响应
 *
 * @param type - 事件类型
 * @param payload - 事件数据
 * @param target - 目标窗口
 * @param source - 来源标识
 * @param timeout - 超时时间（毫秒），默认使用全局配置
 * @returns Promise 响应数据
 */
export function request<T extends EventType>(
  type: T,
  payload: MicroAppEvents[T],
  target?: Window,
  source: 'portal' | ChildAppName = 'portal',
  timeout?: number,
): Promise<MicroAppEvents[T]> {
  return new Promise((resolve, reject) => {
    const messageId = generateMessageId()
    const timeoutMs = timeout ?? globalOptions.timeout ?? 5000

    const message: EventMessage<T> = {
      type,
      payload,
      timestamp: Date.now(),
      messageId,
      source,
    }

    log('info', 'Sending request:', message)

    const timer = setTimeout(() => {
      pendingRequests.delete(messageId)
      reject({
        code: 'TIMEOUT',
        message: `Request ${type} timed out after ${timeoutMs}ms`,
        eventType: type,
        messageId,
      } satisfies CommunicationError)
    }, timeoutMs)

    pendingRequests.set(messageId, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timer,
    })

    try {
      if (target) {
        target.postMessage(message, '*')
      } else {
        window.parent.postMessage(message, '*')
      }
    } catch (err) {
      clearTimeout(timer)
      pendingRequests.delete(messageId)
      reject({
        code: 'SEND_FAILED',
        message: `Failed to send request ${type}`,
        cause: err instanceof Error ? err : new Error(String(err)),
        eventType: type,
        messageId,
      } satisfies CommunicationError)
    }
  })
}

/**
 * 响应请求
 *
 * @param originalMessage - 原始请求消息
 * @param payload - 响应数据
 * @param target - 目标窗口
 * @param source - 来源标识
 */
export function respond<T extends EventType>(
  originalMessage: EventMessage<T>,
  payload: MicroAppEvents[T],
  target?: Window,
  source: 'portal' | ChildAppName = 'portal',
): void {
  if (!originalMessage.messageId) {
    reportError({
      code: 'INVALID_MESSAGE',
      message: 'Cannot respond to message without messageId',
      eventType: originalMessage.type,
    })
    return
  }

  const response: EventMessage<T> = {
    type: originalMessage.type,
    payload,
    timestamp: Date.now(),
    messageId: originalMessage.messageId,
    source,
  }

  log('info', 'Sending response:', response)

  try {
    if (target) {
      target.postMessage(response, '*')
    } else {
      window.parent.postMessage(response, '*')
    }
  } catch (err) {
    reportError({
      code: 'SEND_FAILED',
      message: `Failed to respond to ${originalMessage.type}`,
      cause: err instanceof Error ? err : new Error(String(err)),
      eventType: originalMessage.type,
      messageId: originalMessage.messageId,
    })
  }
}

// ---- 监听 API ----

/**
 * 监听事件
 *
 * @param type - 事件类型
 * @param handler - 事件处理器
 * @returns 取消监听函数
 */
export function on<T extends EventType>(
  type: T,
  handler: EventHandler<T>,
): () => void {
  ensureMessageHandler()

  if (!listeners.has(type)) {
    listeners.set(type, new Set())
  }

  const set = listeners.get(type)!
  set.add(handler as EventHandler<EventType>)

  log('info', `Listener added for ${type}`)

  return () => {
    set.delete(handler as EventHandler<EventType>)
    log('info', `Listener removed for ${type}`)
  }
}

/**
 * 监听事件（一次性）
 *
 * @param type - 事件类型
 * @param handler - 事件处理器
 * @returns 取消监听函数
 */
export function once<T extends EventType>(
  type: T,
  handler: EventHandler<T>,
): () => void {
  let unsubscribe: (() => void) | null = null

  const wrapper: EventHandler<T> = (payload) => {
    unsubscribe?.()
    handler(payload)
  }

  unsubscribe = on(type, wrapper)
  return () => unsubscribe?.()
}

/**
 * 移除指定类型的所有监听器
 *
 * @param type - 事件类型
 */
export function off(type: EventType): void {
  listeners.delete(type)
  log('info', `All listeners removed for ${type}`)
}

/**
 * 清理所有监听器和待处理请求
 */
export function destroy(): void {
  listeners.clear()

  // 清理所有待处理请求
  for (const [messageId, pending] of pendingRequests) {
    clearTimeout(pending.timer)
    pending.reject({
      code: 'SEND_FAILED',
      message: 'Communication destroyed',
      messageId,
    })
  }
  pendingRequests.clear()

  log('info', 'Communication destroyed')
}

// ---- 初始化 ----

/**
 * 初始化通信模块
 *
 * @param options - 配置选项
 */
export function initCommunication(options: CommunicationOptions = {}): void {
  globalOptions = options
  ensureMessageHandler()
  log('info', 'Communication initialized with options:', options)
}

// ---- 便捷 API（Portal 侧） ----

/**
 * Portal 向子应用发送指令
 *
 * @param appName - 子应用名称
 * @param type - 事件类型
 * @param payload - 事件数据
 * @param targetWindow - 子应用窗口（iframe 模式下需要）
 */
export function sendToChild<T extends EventType>(
  appName: ChildAppName,
  type: T,
  payload: MicroAppEvents[T],
  targetWindow?: Window,
): void {
  send(type, payload, targetWindow, 'portal')
  log('info', `Sent to ${appName}:`, type, payload)
}

/**
 * Portal 向子应用发送请求并等待响应
 *
 * @param appName - 子应用名称
 * @param type - 事件类型
 * @param payload - 事件数据
 * @param targetWindow - 子应用窗口
 * @param timeout - 超时时间
 * @returns Promise 响应数据
 */
export function requestFromChild<T extends EventType>(
  appName: ChildAppName,
  type: T,
  payload: MicroAppEvents[T],
  targetWindow?: Window,
  timeout?: number,
): Promise<MicroAppEvents[T]> {
  log('info', `Requesting from ${appName}:`, type, payload)
  return request(type, payload, targetWindow, 'portal', timeout)
}

// ---- 便捷 API（子应用侧） ----

/**
 * 子应用向 Portal 发送状态
 *
 * @param type - 事件类型
 * @param payload - 事件数据
 * @param appName - 子应用名称
 */
export function reportToPortal<T extends EventType>(
  type: T,
  payload: MicroAppEvents[T],
  appName: ChildAppName,
): void {
  send(type, payload, undefined, appName)
  log('info', `Reported to portal:`, type, payload)
}

/**
 * 子应用监听 Portal 指令
 *
 * @param type - 事件类型
 * @param handler - 事件处理器
 * @returns 取消监听函数
 */
export function listenFromPortal<T extends EventType>(
  type: T,
  handler: EventHandler<T>,
): () => void {
  log('info', `Listening from portal:`, type)
  return on(type, handler)
}

/**
 * 子应用响应 Portal 请求
 *
 * @param originalMessage - 原始请求消息
 * @param payload - 响应数据
 * @param appName - 子应用名称
 */
export function respondToPortal<T extends EventType>(
  originalMessage: EventMessage<T>,
  payload: MicroAppEvents[T],
  appName: ChildAppName,
): void {
  log('info', `Responding to portal:`, originalMessage.type, payload)
  respond(originalMessage, payload, undefined, appName)
}
