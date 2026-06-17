/**
 * AI 侧边栏通信桥
 *
 * 统一使用 postMessage 通信，支持 qiankun 和 standalone 两种模式。
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

/**
 * 向宿主发送消息（统一 postMessage）。
 */
function send<K extends keyof BridgeOutgoingEvents>(
  type: K,
  payload: BridgeOutgoingEvents[K]['payload'],
): void {
  window.parent.postMessage({ type, payload }, '*')
}

/**
 * 监听宿主发来的消息（统一 postMessage）。
 * 返回取消监听函数。
 */
function on<K extends keyof BridgeIncomingEvents>(
  type: K,
  handler: BridgeEventHandler<BridgeIncomingEvents[K]['payload']>,
): () => void {
  if (!listeners.has(type)) {
    listeners.set(type, new Set())

    // 注册全局消息监听（只注册一次）
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

  const set = listeners.get(type)!
  set.add(handler as BridgeEventHandler<unknown>)

  return () => {
    set.delete(handler as BridgeEventHandler<unknown>)
  }
}

export const bridge = { send, on }
