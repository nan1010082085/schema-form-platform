/**
 * useExposeWidget — 将组件运行时状态注册到 exposed 系统
 *
 * 任何组件调用此 composable 后，其状态可通过条件表达式中的
 * `exposed.widgetId.key` 访问。
 *
 * 用法（表单组件）：
 * ```ts
 * useExposeWidget((wd) => ({
 *   get value() { return wd.value.defaultValue }
 * }))
 * ```
 *
 * 用法（非表单组件，getter 模式保持响应式）：
 * ```ts
 * useExposeWidget(() => ({
 *   get loading() { return loading.value },
 *   get tableData() { return tableData.value },
 * }))
 * ```
 */
import { inject, onMounted, onUnmounted, type ComputedRef } from 'vue'
import { widgetDataKey } from '@/widgets/base/types'
import type { Widget } from '@/widgets/base/types'
import { useLogger } from '@/composables/useLogger'

const logger = useLogger('Exposed')

type ExposeFactory = (widgetData: ComputedRef<Widget>) => Record<string, unknown>

export function useExposeWidget(stateFactory: ExposeFactory) {
  const widgetData = inject(widgetDataKey)
  const register = inject<((id: string, state: Record<string, unknown>) => void) | null>('registerExposed', null)
  const unregister = inject<((id: string) => void) | null>('unregisterExposed', null)

  if (!widgetData || !register || !unregister) return

  const state = stateFactory(widgetData)

  onMounted(() => {
    register(widgetData.value.id, state)
    logger.info(`registered: ${widgetData.value.id} (${widgetData.value.type})`, Object.keys(state))
  })

  onUnmounted(() => {
    logger.info(`unregistered: ${widgetData.value.id}`)
    unregister(widgetData.value.id)
  })
}
