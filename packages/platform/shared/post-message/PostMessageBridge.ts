/**
 * PostMessageBridge — 跨窗口通信桥接类
 *
 * 纯逻辑，不依赖任何前端框架。
 * 用于 Editor ↔ Widget (iframe / micro-app) 之间的 postMessage 通信。
 */
import type {
  PostMessagePayload,
  PostMessageBridgeOptions,
  MessageHandler,
  PostMessageType,
} from './types'

/** 前缀常量，用于校验消息类型 */
const FG_PREFIX = 'fg:'

/** 校验消息是否为合法的 PostMessagePayload */
function isValidPayload(value: unknown): value is PostMessagePayload {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  if (typeof obj.type !== 'string') return false
  return obj.type.startsWith(FG_PREFIX)
}

export class PostMessageBridge {
  private handlers = new Map<string, Set<MessageHandler>>()
  private listener: ((event: MessageEvent) => void) | null = null
  private allowedOrigin: string | undefined
  private listenTarget: Window

  constructor(options?: PostMessageBridgeOptions) {
    this.allowedOrigin = options?.allowedOrigin
    this.listenTarget = options?.listenTarget ?? window
    this.setupListener()
  }

  // ── 公开方法 ──

  /**
   * 发送消息到目标窗口
   * @param target - 目标窗口（iframe.contentWindow 或 micro-app 的 window）
   * @param type - 消息类型
   * @param data - 消息数据
   * @param targetOrigin - 目标 origin（默认 '*'）
   */
  send(target: Window | HTMLElement, type: PostMessageType, data?: unknown, targetOrigin = '*'): void {
    const payload: PostMessagePayload = {
      type,
      data,
      timestamp: Date.now(),
    }

    if (isWindow(target)) {
      target.postMessage(payload, targetOrigin)
    } else {
      // HTMLElement — 尝试查找其内部的 contentWindow（iframe 场景）
      const iframe = target as HTMLIFrameElement
      iframe.contentWindow?.postMessage(payload, targetOrigin)
    }
  }

  /**
   * 监听指定类型的消息
   * @param type - 消息类型
   * @param handler - 回调函数
   */
  on(type: PostMessageType, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
  }

  /**
   * 移除指定类型的消息监听
   * @param type - 消息类型
   * @param handler - 要移除的回调函数
   */
  off(type: PostMessageType, handler: MessageHandler): void {
    this.handlers.get(type)?.delete(handler)
  }

  /**
   * 一次性监听指定类型的消息
   * @param type - 消息类型
   * @param handler - 回调函数（触发一次后自动移除）
   */
  once(type: PostMessageType, handler: MessageHandler): void {
    const wrapped: MessageHandler = (payload) => {
      handler(payload)
      this.off(type, wrapped)
    }
    this.on(type, wrapped)
  }

  /**
   * 销毁实例，移除所有监听
   */
  destroy(): void {
    if (this.listener) {
      this.listenTarget.removeEventListener('message', this.listener)
      this.listener = null
    }
    this.handlers.clear()
  }

  // ── 内部方法 ──

  private setupListener(): void {
    this.listener = (event: MessageEvent) => {
      // origin 校验
      if (this.allowedOrigin && event.origin !== this.allowedOrigin) return

      // 消息格式校验
      const payload = event.data
      if (!isValidPayload(payload)) return

      // 分发消息到对应的处理器
      const typeHandlers = this.handlers.get(payload.type)
      if (typeHandlers) {
        for (const handler of typeHandlers) {
          handler(payload)
        }
      }
    }
    this.listenTarget.addEventListener('message', this.listener)
  }
}

// ── 工具函数 ──

function isWindow(target: Window | HTMLElement): target is Window {
  return 'postMessage' in target && typeof (target as Window).postMessage === 'function'
}
