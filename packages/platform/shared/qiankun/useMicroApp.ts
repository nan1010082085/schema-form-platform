/**
 * useMicroApp — qiankun 微应用嵌入 Composable
 *
 * 通过 loadMicroApp 注入实现，避免直接依赖 qiankun 包。
 * 仅支持 qiankun 模式，iframe 模式已废弃（全链路 qiankun 架构要求）。
 */
import { ref, onUnmounted, watch, type Ref } from 'vue'
import { type AppName, APP_CONFIGS } from './config'

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
  /** 自定义 entry URL（覆盖默认地址） */
  src?: string | Ref<string>
  /** 附加到 props 的查询参数 */
  query?: Record<string, string> | Ref<Record<string, string>>
  /** 是否为开发环境（控制 entry 地址的 dev/prod 行为） */
  isDev?: boolean
  /** qiankun 模式的加载函数（从宿主注入，避免直接依赖 qiankun） */
  loadMicroApp: LoadMicroAppFn
}

export interface UseMicroAppReturn {
  /** 加载状态 */
  loading: Ref<boolean>
  /** 错误信息 */
  error: Ref<Error | null>
  /** 容器 DOM ref（绑定到目标元素，qiankun 挂载点） */
  containerRef: Ref<HTMLElement | null>
  /** 手动卸载 */
  unmount: () => Promise<void>
}

export function useMicroApp(options: UseMicroAppOptions): UseMicroAppReturn {
  const { appName, src, query, isDev = !import.meta.env.PROD, loadMicroApp } = options

  const loading = ref(false)
  const error = ref<Error | null>(null)
  const containerRef = ref<HTMLElement | null>(null)

  let microAppInstance: { mount: () => Promise<void>; unmount: () => Promise<void> } | null = null
  let mounted = false

  function resolveQuery(): Record<string, string> | undefined {
    if (!query) return undefined
    const q = typeof query === 'object' && 'value' in query ? query.value : query
    return Object.keys(q).length > 0 ? q : undefined
  }

  async function setup() {
    if (!containerRef.value) return

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
      const queryValue = resolveQuery()
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

  // 等待 containerRef 就绪后加载
  watch(containerRef, (el) => {
    if (el) setup()
  }, { immediate: true })

  // 清理
  onUnmounted(() => {
    unmount()
  })

  return {
    loading,
    error,
    containerRef,
    unmount,
  }
}
