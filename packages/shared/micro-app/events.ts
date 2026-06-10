/**
 * 统一事件类型定义
 *
 * Portal <-> 子应用通信的标准事件协议。
 * 所有事件类型在此集中定义，确保类型安全。
 */

// ---- 事件方向标识 ----

/** Portal -> 子应用 的指令事件 */
export interface PortalToChildEvents {
  /** 设置上下文数据 */
  'portal:set-context': { context: Record<string, unknown> }
  /** 通知 Schema 已更新 */
  'portal:schema-updated': { schemaId: string; schema: unknown }
  /** 通知流程已更新 */
  'portal:flow-updated': { flowId: string; flow: unknown }
  /** 请求子应用执行动作 */
  'portal:execute-action': { action: string; params?: Record<string, unknown> }
  /** 通知主题变更 */
  'portal:theme-changed': { theme: string; vars: Record<string, string> }
  /** 通知语言变更 */
  'portal:locale-changed': { locale: string }
}

/** 子应用 -> Portal 的状态上报事件 */
export interface ChildToPortalEvents {
  /** 子应用就绪 */
  'child:ready': { appName: string; version?: string }
  /** 子应用状态变更 */
  'child:status-changed': { status: 'loading' | 'mounted' | 'error' | 'unmounted'; error?: string }
  /** 子应用请求预览 Schema */
  'child:preview-schema': { payload: unknown }
  /** 子应用请求预览流程 */
  'child:preview-flow': { payload: unknown }
  /** 子应用通知发布完成 */
  'child:published': { id: string; publishId?: string; type: 'schema' | 'flow' }
  /** 子应用请求在编辑器中打开 */
  'child:open-in-editor': { payload: unknown }
  /** 子应用上报错误 */
  'child:error': { code: string; message: string; details?: unknown }
  /** 子应用上报数据变更 */
  'child:data-changed': { key: string; value: unknown }
}

/** 所有事件的联合类型 */
export type MicroAppEvents = PortalToChildEvents & ChildToPortalEvents

/** 事件类型键 */
export type EventType = keyof MicroAppEvents

/** 事件消息格式 */
export interface EventMessage<T extends EventType = EventType> {
  /** 事件类型 */
  type: T
  /** 事件数据 */
  payload: MicroAppEvents[T]
  /** 时间戳 */
  timestamp: number
  /** 消息 ID（用于请求-响应模式） */
  messageId?: string
  /** 来源标识 */
  source: 'portal' | ChildAppName
}

/** 子应用名称类型 */
export type ChildAppName = 'editor' | 'flow' | 'ai'

/** 事件处理器类型 */
export type EventHandler<T extends EventType> = (payload: MicroAppEvents[T]) => void

/** 错误回调类型 */
export type ErrorCallback = (error: CommunicationError) => void

/** 通信错误类型 */
export interface CommunicationError {
  /** 错误码 */
  code: 'TIMEOUT' | 'SEND_FAILED' | 'INVALID_MESSAGE' | 'HANDLER_ERROR' | 'TARGET_NOT_FOUND'
  /** 错误消息 */
  message: string
  /** 原始错误 */
  cause?: Error
  /** 相关事件类型 */
  eventType?: string
  /** 相关消息 ID */
  messageId?: string
}

/** 通信配置选项 */
export interface CommunicationOptions {
  /** 消息超时时间（毫秒），默认 5000 */
  timeout?: number
  /** 是否启用调试日志，默认 false */
  debug?: boolean
  /** 错误回调 */
  onError?: ErrorCallback
}
