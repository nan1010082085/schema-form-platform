/**
 * 宿主侧 micro-app 工具
 *
 * - initMicroApp(): 启动 micro-app 引擎（宿主 main.ts 调用一次）
 * - useMicroApp(): 封装子应用生命周期事件监听的 composable
 * - MicroApp.vue: 封装 <micro-app> 元素的组件（从 index.ts 导出）
 */
import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import microApp from '@micro-zoe/micro-app'
import type { MicroAppConfig, MicroAppLifecycleEvent, MicroAppErrorEvent } from './types.js'

let observerInstalled = false

/**
 * 安装样式防污染 MutationObserver
 *
 * 剥离子应用注入的 :root / html / body 规则，防止 Element Plus 默认主题覆盖宿主。
 * 幂等——多次调用只安装一次。
 */
export function installStyleGuard(): void {
  if (observerInstalled) return
  observerInstalled = true

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLStyleElement && node.textContent) {
          node.textContent = node.textContent.replace(
            /([^{}]+)\{[^}]*\}/g,
            (match, selectors: string) => {
              // 保留 :root 的 CSS 变量定义（不会影响宿主页面）
              if (/\b:root\b/.test(selectors) && !/\b(html|body)\b/.test(selectors)) {
                return match
              }
              // 删除 html / body 的视觉样式规则
              return /(?:^|[:,\s])\s*(?:html|body)\b/.test(selectors) ? '' : match
            },
          )
        }
      }
    }
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
}

/**
 * 启动 micro-app 引擎 + 样式防污染
 *
 * 宿主应用 main.ts 中调用一次即可，替代手动 `import microApp from '@micro-zoe/micro-app'` + `microApp.start()`。
 *
 * @example
 * ```ts
 * // portal/src/main.ts
 * import { initMicroApp } from '@schema-form/micro-app/host'
 * initMicroApp()
 * ```
 */
export function initMicroApp(): void {
  microApp.start()
  installStyleGuard()
}

/**
 * 预加载子应用
 *
 * 在宿主启动时调用，提前加载子应用的 HTML 和 JS，
 * 避免用户首次导航时白屏等待。
 *
 * @param apps - 预加载配置数组，每项包含 name 和 url
 *
 * @example
 * ```ts
 * import { preFetchApps } from '@schema-form/micro-app/host'
 * import { getAppUrl } from '@schema-form/micro-app/config'
 *
 * preFetchApps([
 *   { name: 'editor', url: getAppUrl('editor', import.meta.env.DEV) },
 *   { name: 'flow',   url: getAppUrl('flow',   import.meta.env.DEV) },
 *   { name: 'ai',     url: getAppUrl('ai',     import.meta.env.DEV) },
 * ])
 * ```
 */
export function preFetchApps(apps: Array<{ name: string; url: string; iframe?: boolean }>): void {
  microApp.preFetch(apps)
}

/** 子应用加载状态 */
export type MicroAppStatus = 'loading' | 'mounted' | 'error' | 'unmounted'

/**
 * 宿主侧 micro-app composable
 *
 * @example
 * ```vue
 * <script setup>
 * import { useMicroApp } from '@schema-form/micro-app/host'
 *
 * const { status, error } = useMicroApp({
 *   name: 'editor',
 *   url: 'http://localhost:5173/editor/',
 * })
 * </script>
 *
 * <template>
 *   <micro-app
 *     :name="config.name"
 *     :url="config.url"
 *     :data="config.data"
 *   />
 * </template>
 * ```
 */
export function useMicroApp(config: MicroAppConfig) {
  const status = ref<MicroAppStatus>('loading')
  const error = ref<Error | null>(null)

  function handleCreated(e: Event) {
    const ev = e as CustomEvent<MicroAppLifecycleEvent>
    if (ev.detail?.appName === config.name) {
      status.value = 'loading'
    }
  }

  function handleMounted(e: Event) {
    const ev = e as CustomEvent<MicroAppLifecycleEvent>
    if (ev.detail?.appName === config.name) {
      status.value = 'mounted'
      error.value = null
    }
  }

  function handleUnmount(e: Event) {
    const ev = e as CustomEvent<MicroAppLifecycleEvent>
    if (ev.detail?.appName === config.name) {
      status.value = 'unmounted'
    }
  }

  function handleError(e: Event) {
    const ev = e as CustomEvent<MicroAppErrorEvent>
    if (ev.detail?.appName === config.name) {
      status.value = 'error'
      error.value = ev.detail.error
    }
  }

  onMounted(() => {
    window.addEventListener('micro-app:created', handleCreated as EventListener)
    window.addEventListener('micro-app:mounted', handleMounted as EventListener)
    window.addEventListener('micro-app:unmount', handleUnmount as EventListener)
    window.addEventListener('micro-app:error', handleError as EventListener)
  })

  onUnmounted(() => {
    window.removeEventListener('micro-app:created', handleCreated as EventListener)
    window.removeEventListener('micro-app:mounted', handleMounted as EventListener)
    window.removeEventListener('micro-app:unmount', handleUnmount as EventListener)
    window.removeEventListener('micro-app:error', handleError as EventListener)
  })

  return {
    config,
    status: status as Ref<MicroAppStatus>,
    error,
  }
}
