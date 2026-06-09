/**
 * AI 侧边栏通信桥
 *
 * 支持两种模式：
 * 1. micro-app 模式：通过 window.microApp.dispatch/getData 通信
 * 2. standalone 模式：通过 postMessage 通信（开发调试用）
 *
 * 发送事件（ai-app -> 宿主）：
 *   ai:preview-schema  — 请求宿主预览 Schema
 *   ai:preview-flow    — 请求宿主预览 Flow
 *   ai:published       — 通知宿主发布完成
 *   ai:open-in-editor  — 请求宿主在编辑器中打开
 *
 * 接收事件（宿主 -> ai-app）：
 *   ai:set-context     — 宿主设置上下文
 *   ai:current-schema  — 宿主传入当前 Schema
 */

import type { Widget, FlowGraph, ChatContext } from '@/types'

// ---- 发送事件类型 ----

interface BridgeOutgoingEvents {
  'ai:preview-schema': { payload: Widget[] }
  'ai:preview-flow': { payload: FlowGraph }
  'ai:published': { payload: { id: string; publishId?: string; type: 'schema' | 'flow' } }
  'ai:open-in-editor': { payload: { schema?: Widget[] | null; flow?: FlowGraph | null; id?: string; publishId?: string; type?: 'schema' | 'flow'; widgetIds?: string[] } }
}

// ---- 接收事件类型 ----

interface BridgeIncomingEvents {
  'ai:set-context': { payload: Partial<ChatContext> }
  'ai:current-schema': { payload: Widget[] }
}

type BridgeEventHandler<T> = (payload: T) => void

// ---- 事件监听器注册表 ----

const listeners = new Map<string, Set<BridgeEventHandler<unknown>>>()

// ---- micro-app 类型声明 ----

declare global {
  interface Window {
    __MICRO_APP_ENVIRONMENT__?: boolean
    microApp?: MicroAppInstance
  }
}

interface MicroAppInstance {
  dispatch(data: Record<string, unknown>): void
  getData(): Record<string, unknown> | undefined
  addDataListener(handler: (data: Record<string, unknown>) => void): void
  removeDataListener(handler: (data: Record<string, unknown>) => void): void
  addEventListener(event: string, callback: (data: Record<string, unknown>) => void): void
  removeEventListener(event: string, callback: (data: Record<string, unknown>) => void): void
}

// Lazy getter: sandbox 模式下 __MICRO_APP_ENVIRONMENT__ 在脚本执行前才设置，
// 模块加载时求值会拿到 false，必须延迟到调用时读取。
const isMicroApp = () => !!window.__MICRO_APP_ENVIRONMENT__

/**
 * 向宿主发送消息。
 *
 * micro-app 模式：通过 window.microApp.dispatch()
 * standalone 模式：通过 window.parent.postMessage()
 */
function send<K extends keyof BridgeOutgoingEvents>(
  type: K,
  payload: BridgeOutgoingEvents[K]['payload'],
): void {
  if (isMicroApp() && window.microApp) {
    window.microApp.dispatch({ type, payload })
  } else {
    window.parent.postMessage({ type, payload }, '*')
  }
}

/**
 * 监听宿主发来的消息。
 * 返回取消监听函数。
 *
 * micro-app 模式：监听 datachange 事件
 * standalone 模式：监听 postMessage
 */
function on<K extends keyof BridgeIncomingEvents>(
  type: K,
  handler: BridgeEventHandler<BridgeIncomingEvents[K]['payload']>,
): () => void {
  if (!listeners.has(type)) {
    listeners.set(type, new Set())

    if (isMicroApp() && window.microApp) {
      // micro-app 模式：通过 addDataListener 监听宿主数据变化
      const dataChangeHandler = (data: Record<string, unknown>) => {
        if (data?.type && typeof data.type === 'string') {
          const handlers = listeners.get(data.type)
          if (handlers) {
            for (const h of handlers) {
              h(data.payload)
            }
          }
        }
      }
      if (typeof window.microApp.addEventListener === 'function') {
        window.microApp.addEventListener('datachange', dataChangeHandler)
      } else if (typeof window.microApp.addDataListener === 'function') {
        window.microApp.addDataListener(dataChangeHandler)
      }
    } else {
      // standalone 模式：监听 postMessage
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
  }

  const set = listeners.get(type)!
  set.add(handler as BridgeEventHandler<unknown>)

  return () => {
    set.delete(handler as BridgeEventHandler<unknown>)
  }
}

export const bridge = { send, on }
