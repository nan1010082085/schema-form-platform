/**
 * useWidgetLifecycle — Widget 生命周期管理（最小实现）
 *
 * 为所有 Widget 提供 onInit / onMount / onUnmount / onDataChange / onVisibleChange 钩子。
 * 钩子支持函数引用模式；字符串表达式模式待 ExpressionRuntime 完成后启用。
 */
import { ref, toValue, type Ref, type MaybeRefOrGetter } from 'vue'
import type { Widget, WidgetLifecycleConfig } from '@/widgets/base/types'
import { useLogger } from './useLogger'

export interface WidgetLifecycleAPI {
  trigger: (hookName: keyof WidgetLifecycleConfig, extra?: Record<string, unknown>) => Promise<void>
  isRunning: Readonly<Ref<boolean>>
  lastError: Readonly<Ref<Error | null>>
}

export function useWidgetLifecycle(
  widget: MaybeRefOrGetter<Widget>,
  formData: MaybeRefOrGetter<Record<string, unknown>>,
): WidgetLifecycleAPI {
  const isRunning = ref(false)
  const lastError = ref<Error | null>(null)
  const currentWidget = toValue(widget)
  const logger = useLogger(`Widget:${currentWidget.type}:${currentWidget.field ?? currentWidget.id}`)

  async function trigger(
    hookName: keyof WidgetLifecycleConfig,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    const w = toValue(widget)
    const hook = w.lifecycle?.[hookName]
    if (!hook) return

    isRunning.value = true
    lastError.value = null

    try {
      if (typeof hook === 'function') {
        await hook({
          widget: w,
          formData: toValue(formData),
          scopes: [],
          logger,
          ...extra,
        })
      }
      // 字符串表达式模式待 ExpressionRuntime 完成后启用
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      lastError.value = error
      logger.error(`${hookName} failed:`, error.message)
    } finally {
      isRunning.value = false
    }
  }

  return { trigger, isRunning, lastError }
}
