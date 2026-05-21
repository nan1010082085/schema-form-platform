/** Microapp 加载配置 */
export interface MicroAppConfig {
  /** 已发布表单的 publishId */
  publishId: string
  /** 挂载容器 */
  container: string | HTMLElement
  /** 传入的初始数据 */
  props?: Record<string, unknown>
}

/** 加载的 Microapp 实例 */
export interface MicroAppInstance {
  /** 发送消息 */
  send: (action: string, data?: unknown) => void
  /** 销毁 */
  destroy: () => void
}

/** postMessage 消息格式 */
export interface PostMessagePayload {
  targetId: string
  action: string
  data?: unknown
}

/**
 * 加载已发布的表单作为 Microapp
 * 通过动态 script 加载独立构建产物
 */
export async function loadMicroApp(config: MicroAppConfig): Promise<MicroAppInstance> {
  const { publishId, container, props = {} } = config

  const scriptUrl = `/published-forms/${publishId}.js`

  await loadScript(scriptUrl)

  const mountFn = (window as unknown as Record<string, unknown>)[`__microapp_${publishId}__`] as
    | ((el: HTMLElement, props: Record<string, unknown>) => { unmount?: () => void })
    | undefined

  if (!mountFn) {
    throw new Error(`Microapp ${publishId} mount function not found`)
  }

  const containerEl = typeof container === 'string'
    ? document.querySelector(container) as HTMLElement
    : container

  if (!containerEl) {
    throw new Error(`Container not found: ${container}`)
  }

  const instance = mountFn(containerEl, props)

  return {
    send(action: string, data?: unknown) {
      const payload: PostMessagePayload = { targetId: publishId, action, data }
      const iframe = containerEl.querySelector('iframe')
      iframe?.contentWindow?.postMessage(payload, '*')
    },
    destroy() {
      instance?.unmount?.()
      containerEl.innerHTML = ''
    },
  }
}

/** 动态加载 script */
function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`))
    document.head.appendChild(script)
  })
}

/**
 * 顶层 postMessage 通信管理
 * 支持对指定 publishId 的已发布表单进行消息收发
 */
export class MicroAppMessenger {
  private handlers = new Map<string, (data: unknown) => void>()

  constructor() {
    window.addEventListener('message', this.handleMessage)
  }

  private handleMessage = (event: MessageEvent) => {
    const payload = event.data as PostMessagePayload
    if (!payload?.targetId) return

    const handler = this.handlers.get(payload.targetId)
    if (handler) {
      handler(payload.data)
    }
  }

  /** 注册消息处理器 */
  on(publishId: string, handler: (data: unknown) => void) {
    this.handlers.set(publishId, handler)
  }

  /** 移除消息处理器 */
  off(publishId: string) {
    this.handlers.delete(publishId)
  }

  /** 发送消息 */
  send(publishId: string, action: string, data?: unknown) {
    const payload: PostMessagePayload = { targetId: publishId, action, data }
    window.postMessage(payload, '*')
  }

  /** 销毁 */
  destroy() {
    window.removeEventListener('message', this.handleMessage)
    this.handlers.clear()
  }
}
