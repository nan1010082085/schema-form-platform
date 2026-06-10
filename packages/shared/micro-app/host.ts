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
 * 剥离子应用注入的 html / body 视觉样式规则，防止子应用覆盖宿主页面样式。
 * 仅在非 iframe 模式下需要（iframe 有天然的 CSS 隔离边界）。
 * 幂等——多次调用只安装一次。
 */
export function installStyleGuard(): void {
  if (observerInstalled) return
  observerInstalled = true

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLStyleElement) || !node.textContent) continue

        const original = node.textContent
        // 移除以 html 或 body 开头的选择器规则（含逗号分隔的复合选择器）
        // 保留 :root CSS 变量定义和不涉及 html/body 的规则
        const sanitized = original.replace(
          /([^{}]+)\{([^}]*)\}/g,
          (match, selectors: string, _declarations: string) => {
            // 保留 :root 纯 CSS 变量定义
            if (/^\s*:root\s*$/.test(selectors)) return match
            // 移除选择器列表中包含 html 或 body 的规则
            const hasHtmlBody = selectors.split(',').some(
              (s) => /(?:^|[:,\s])\s*(?:html|body)\b/.test(s.trim()),
            )
            return hasHtmlBody ? '' : match
          },
        )
        if (sanitized !== original) {
          node.textContent = sanitized
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
    if (ev.detail?.name === config.name) {
      status.value = 'loading'
    }
  }

  function handleMounted(e: Event) {
    const ev = e as CustomEvent<MicroAppLifecycleEvent>
    if (ev.detail?.name === config.name) {
      status.value = 'mounted'
      error.value = null
    }
  }

  function handleUnmount(e: Event) {
    const ev = e as CustomEvent<MicroAppLifecycleEvent>
    if (ev.detail?.name === config.name) {
      status.value = 'unmounted'
    }
  }

  function handleError(e: Event) {
    const ev = e as CustomEvent<MicroAppErrorEvent>
    if (ev.detail?.name === config.name) {
      status.value = 'error'
      error.value = ev.detail.error
    }
  }

  onMounted(() => {
    // micro-app 事件分发到 micro-app 元素上，需要在 nextTick 后监听
    setTimeout(() => {
      const microAppEl = document.querySelector(`micro-app[name="${config.name}"]`)
      if (microAppEl) {
        microAppEl.addEventListener('created', handleCreated as EventListener)
        microAppEl.addEventListener('mounted', handleMounted as EventListener)
        microAppEl.addEventListener('unmount', handleUnmount as EventListener)
        microAppEl.addEventListener('error', handleError as EventListener)
      }
    }, 0)
  })

  onUnmounted(() => {
    const microAppEl = document.querySelector(`micro-app[name="${config.name}"]`)
    if (microAppEl) {
      microAppEl.removeEventListener('created', handleCreated as EventListener)
      microAppEl.removeEventListener('mounted', handleMounted as EventListener)
      microAppEl.removeEventListener('unmount', handleUnmount as EventListener)
      microAppEl.removeEventListener('error', handleError as EventListener)
    }
  })

  return {
    config,
    status: status as Ref<MicroAppStatus>,
    error,
  }
}
