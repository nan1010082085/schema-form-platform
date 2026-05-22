/**
 * useWidgetRenderState — Widget 渲染状态消费
 *
 * 供 Widget 组件注入规则引擎计算的渲染状态，
 * 并将静态 props 与动态规则输出合并。
 *
 * 用法：
 * ```ts
 * const { isDisabled, isRequired } = useWidgetRenderState()
 * // 在模板中：:disabled="isDisabled"
 * ```
 */
import { inject, computed } from 'vue'
import { widgetDataKey, widgetRenderStateKey } from '../widgets/base/types'
import type { WidgetRenderState } from '../widgets/base/types'

/** 默认渲染状态（Widget 不在 SchemaNode 中渲染时的兜底） */
const DEFAULT_STATE: WidgetRenderState = {
  visible: true,
  disabled: false,
  required: false,
}

export function useWidgetRenderState() {
  const widgetData = inject(widgetDataKey)!
  const renderState = inject(widgetRenderStateKey, computed(() => DEFAULT_STATE))

  /** 最终 disabled = 静态 props.disabled OR 规则引擎 disabled */
  const isDisabled = computed(() =>
    ((widgetData.value.props?.disabled as boolean) ?? false) || renderState.value.disabled,
  )

  /** 最终 required = 静态 validationRules.required OR 规则引擎 required */
  const isRequired = computed(() => renderState.value.required)

  return {
    renderState,
    isDisabled,
    isRequired,
  }
}
