/**
 * useMicroApp — 统一微应用嵌入 Composable
 *
 * 支持两种嵌入模式：
 * - iframe: 轻量级嵌入，postMessage 通信
 * - qiankun: 完整生命周期、沙箱隔离、全局状态同步
 *
 * qiankun 模式通过 loadMicroApp 注入实现，避免直接依赖 qiankun 包。
 */
import { ref, onUnmounted, watch, type Ref } from 'vue'
import { type AppName, APP_CONFIGS, getAppUrl } from './config'

export type MicroAppMode = 'iframe' | 'qiankun'

/** qiankun loadMicroApp 的函数签名 */
export type LoadMicroAppFn = (app: {
  name: string
  entry: string
  container: HTMLElement
  props?: Record<string, unknown>
}) => { mount: () => Promise<void>; unmount: () => Promise<void> }

export interface UseMicroAppOptions {
  /** 子应用名称 */
  appName: AppName
  /** 嵌入模式 */
  mode: MicroAppMode
  /** 自定义 URL（覆盖默认 entry 地址） */
  src?: string | Ref<string>
  /** 附加到 URL 的查询参数 */
  query?: Record<string, string> | Ref<Record<string, string>>
  /** 是否为开发环境（控制 getAppUrl 的 dev/prod 行为） */
  isDev?: boolean
  /** qiankun 模式的加载函数（从宿主注入，避免直接依赖 qiankun） */
  loadMicroApp?: LoadMicroAppFn
}

export interface UseMicroAppReturn {
  /** iframe 模式的 URL（仅 iframe 模式有值） */
  iframeUrl: Ref<string>
  /** 加载状态 */
  loading: Ref<boolean>
  /** 错误信息 */
  error: Ref<Error | null>
  /** 容器 DOM ref（qiankun 模式需要绑定到目标元素） */
  containerRef: Ref<HTMLElement | null>
  /** 手动卸载（qiankun 模式） */
  unmount: () => Promise<void>
  /** 向 iframe 发送消息（仅 iframe 模式） */
  postMessage: (data: unknown, targetOrigin?: string) => void
}

export function useMicroApp(options: UseMicroAppOptions): UseMicroAppReturn {
  const { appName, mode, src, query, isDev = !import.meta.env.PROD, loadMicroApp } = options

  const iframeUrl = ref('')
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const containerRef = ref<HTMLElement | null>(null)

  let microAppInstance: { mount: () => Promise<void>; unmount: () => Promise<void> } | null = null
  let mounted = false

  // ---- iframe URL 计算 ----
  function buildUrl(): string {
    const customSrc = typeof src === 'string' ? src : src?.value
    if (customSrc) {
      return appendQuery(customSrc, query)
    }

    const base = getAppUrl(appName, isDev)
    return appendQuery(base, query)
  }

  function appendQuery(base: string, q?: Record<string, string> | Ref<Record<string, string>>): string {
    const params = typeof q === 'object' && q !== null && 'value' in q ? q.value : q
    if (!params || Object.keys(params).length === 0) return base

    const url = new URL(base, window.location.origin)
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
    return url.pathname + url.search + url.hash
  }

  // ---- iframe 模式 ----
  function setupIframe() {
    iframeUrl.value = buildUrl()
  }

  // ---- qiankun 模式 ----
  async function setupQiankun() {
    if (!containerRef.value) return
    if (!loadMicroApp) {
      error.value = new Error('qiankun 模式需要提供 loadMicroApp 函数')
      return
    }

    loading.value = true
    error.value = null

    try {
      const config = APP_CONFIGS[appName]
      const customSrc = typeof src === 'string' ? src : src?.value
      const entry = customSrc
        || (isDev
            ? `//localhost:${config.devPort}${config.basePath}`
            : `//${window.location.host}${config.basePath}`)

      const props: Record<string, unknown> = {}
      const queryValue = typeof query === 'object' && query !== null && 'value' in query ? query.value : query
      if (queryValue) {
        props.query = queryValue
      }

      microAppInstance = loadMicroApp({
        name: appName,
        entry,
        container: containerRef.value,
        props,
      })

      await microAppInstance.mount()
      mounted = true
      loading.value = false
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      loading.value = false
    }
  }

  // ---- 公共方法 ----
  async function unmount() {
    if (microAppInstance && mounted) {
      try {
        await microAppInstance.unmount()
      } catch {
        // 忽略卸载错误
      }
      mounted = false
      microAppInstance = null
    }
  }

  function postMessage(data: unknown, targetOrigin = '*') {
    const iframe = containerRef.value?.querySelector('iframe')
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(data, targetOrigin)
    }
  }

  // ---- 初始化 ----
  if (mode === 'iframe') {
    setupIframe()
    // 监听 src/query 变化
    watch(
      [
        () => typeof src === 'string' ? src : src?.value,
        () => typeof query === 'object' && query !== null && 'value' in query ? query.value : query,
      ],
      () => { iframeUrl.value = buildUrl() },
      { deep: true },
    )
  }

  // qiankun 模式：等待 containerRef 就绪后加载
  if (mode === 'qiankun') {
    watch(containerRef, (el) => {
      if (el) setupQiankun()
    }, { immediate: true })
  }

  // ---- 清理 ----
  onUnmounted(() => {
    unmount()
  })

  return {
    iframeUrl,
    loading,
    error,
    containerRef,
    unmount,
    postMessage,
  }
}
