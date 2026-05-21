/**
 * Microapp PostMessage 通信层
 *
 * 双向 postMessage 协议，用于宿主页面与 microapp 之间的通信。
 *
 * 通信方向：
 * - Host -> Guest: 命令 (setValues, getValues, validate, submit, destroy)
 * - Guest -> Host: 事件 (ready, valueChange, submitSuccess, submitError, validationError)
 *
 * 协议格式：
 * 所有消息都包含 schemaFormMicroapp: true 标识，避免与其他 postMessage 冲突。
 * 请求-响应通过 requestId 关联。
 */

// ============================================================
// 消息类型定义
// ============================================================

/** 基础消息结构 */
interface BaseMessage {
  schemaFormMicroapp: true
  type: 'command' | 'event'
  action: string
  payload?: unknown
  requestId?: string
}

/** 命令消息 (Host -> Guest) */
export interface CommandMessage extends BaseMessage {
  type: 'command'
  action: 'setValues' | 'getValues' | 'validate' | 'submit' | 'destroy'
}

/** 事件消息 (Guest -> Host) */
export interface EventMessage extends BaseMessage {
  type: 'event'
  action: 'ready' | 'valueChange' | 'submitSuccess' | 'submitError' | 'validationError' | 'error'
}

export type MicroappMessage = CommandMessage | EventMessage

/** 表单 API 接口（与 loadMicroapp 返回值一致） */
interface FormApiLike {
  getValues(): Record<string, unknown>
  setValues(values: Record<string, unknown>): void
  validate(): Promise<boolean>
  submit(): Promise<void>
  destroy(): void
}

// ============================================================
// 工具函数
// ============================================================

/** 检测消息是否为本协议消息 */
function isMicroappMessage(data: unknown): data is MicroappMessage {
  return (
    typeof data === 'object'
    && data !== null
    && 'schemaFormMicroapp' in data
    && (data as Record<string, unknown>).schemaFormMicroapp === true
  )
}

/** 生成请求 ID */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================
// Host 端 (宿主页面)
// ============================================================

/** Host 端 API */
export interface MicroappHostApi {
  /** 发送命令到 microapp，返回 Promise（仅 getValues/validate 有返回值） */
  sendCommand(action: 'getValues'): Promise<Record<string, unknown>>
  sendCommand(action: 'validate'): Promise<boolean>
  sendCommand(action: 'setValues', payload: Record<string, unknown>): Promise<void>
  sendCommand(action: 'submit'): Promise<void>
  sendCommand(action: 'destroy'): Promise<void>
  /** 注册事件监听器 */
  on(event: 'ready', handler: () => void): void
  on(event: 'valueChange', handler: (values: Record<string, unknown>) => void): void
  on(event: 'submitSuccess', handler: (data: unknown) => void): void
  on(event: 'submitError', handler: (error: string) => void): void
  on(event: 'validationError', handler: (errors: unknown) => void): void
  on(event: 'error', handler: (error: string) => void): void
  /** 销毁 host，移除所有监听器 */
  destroy(): void
}

/**
 * 创建 microapp 宿主通信层。
 *
 * @param iframe - microapp 所在的 iframe 元素
 * @returns MicroappHostApi
 */
export function createMicroappHost(iframe: HTMLIFrameElement): MicroappHostApi {
  const pendingRequests = new Map<string, {
    resolve: (value: unknown) => void
    reject: (reason: unknown) => void
  }>()
  const eventHandlers = new Map<string, Set<(payload: unknown) => void>>()

  function handleMessage(event: MessageEvent): void {
    const data = event.data
    if (!isMicroappMessage(data)) return
    if (data.type !== 'event') return

    // 处理带 requestId 的响应
    if (data.requestId) {
      const pending = pendingRequests.get(data.requestId)
      if (pending) {
        pendingRequests.delete(data.requestId)
        if (data.action === 'error') {
          pending.reject(new Error(String(data.payload ?? 'Unknown error')))
        } else {
          pending.resolve(data.payload)
        }
        return
      }
    }

    // 处理普通事件
    const handlers = eventHandlers.get(data.action)
    if (handlers) {
      for (const handler of handlers) {
        handler(data.payload)
      }
    }
  }

  window.addEventListener('message', handleMessage)

  function sendCommand(action: string, payload?: unknown): Promise<unknown> {
    const requestId = generateRequestId()

    return new Promise((resolve, reject) => {
      pendingRequests.set(requestId, { resolve, reject })

      const message: CommandMessage = {
        schemaFormMicroapp: true,
        type: 'command',
        action: action as CommandMessage['action'],
        payload,
        requestId,
      }

      iframe.contentWindow?.postMessage(message, '*')

      // 超时保护：10 秒无响应则 reject
      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId)
          reject(new Error(`Command "${action}" timed out after 10s`))
        }
      }, 10_000)
    })
  }

  return {
    sendCommand: sendCommand as MicroappHostApi['sendCommand'],
    on(event: string, handler: (...args: unknown[]) => void) {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set())
      }
      eventHandlers.get(event)!.add(handler as (payload: unknown) => void)
    },
    destroy() {
      window.removeEventListener('message', handleMessage)
      pendingRequests.clear()
      eventHandlers.clear()
    },
  } as MicroappHostApi
}

// ============================================================
// Guest 端 (microapp 内部)
// ============================================================

/**
 * 初始化 microapp guest 端通信。
 * 监听来自宿主的命令，调用 formApi 执行，并发送响应。
 *
 * @param formApi - 表单 API 实例
 */
export function initMicroappGuest(formApi: FormApiLike): void {
  function sendEvent(action: string, payload?: unknown, requestId?: string): void {
    const message: EventMessage = {
      schemaFormMicroapp: true,
      type: 'event',
      action: action as EventMessage['action'],
      payload,
      requestId,
    }
    window.parent.postMessage(message, '*')
  }

  window.addEventListener('message', async (event: MessageEvent) => {
    const data = event.data
    if (!isMicroappMessage(data)) return
    if (data.type !== 'command') return

    const { action, requestId } = data

    try {
      switch (action) {
        case 'getValues': {
          const values = formApi.getValues()
          sendEvent('getValues', values, requestId)
          break
        }
        case 'setValues': {
          formApi.setValues(data.payload as Record<string, unknown>)
          sendEvent('setValues', undefined, requestId)
          break
        }
        case 'validate': {
          const valid = await formApi.validate()
          sendEvent('validate', valid, requestId)
          break
        }
        case 'submit': {
          await formApi.submit()
          sendEvent('submit', undefined, requestId)
          break
        }
        case 'destroy': {
          formApi.destroy()
          sendEvent('destroy', undefined, requestId)
          break
        }
      }
    } catch (err) {
      sendEvent('error', err instanceof Error ? err.message : String(err), requestId)
    }
  })

  // 通知宿主：microapp 就绪
  sendEvent('ready')
}

/**
 * 从 guest 端发送事件到 host。
 * 供 microapp 内部在特定时机调用。
 *
 * @param action - 事件名
 * @param payload - 事件数据
 */
export function emitToHost(action: EventMessage['action'], payload?: unknown): void {
  const message: EventMessage = {
    schemaFormMicroapp: true,
    type: 'event',
    action,
    payload,
  }
  window.parent.postMessage(message, '*')
}
