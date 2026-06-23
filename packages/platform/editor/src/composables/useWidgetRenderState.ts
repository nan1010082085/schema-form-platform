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
import {
  FORM_GRID_READONLY_KEY,
  FORM_GRID_READONLY_FIELDS_KEY,
  FORM_GRID_EDITABLE_FIELDS_KEY,
} from '../components/WidgetRenderer/types'

/** 默认渲染状态（Widget 不在 SchemaNode 中渲染时的兜底） */
const DEFAULT_STATE: WidgetRenderState = {
  visible: true,
  disabled: false,
  required: false,
}

export function useWidgetRenderState() {
  const widgetData = inject(widgetDataKey)!
  const renderState = inject(widgetRenderStateKey, computed(() => DEFAULT_STATE))

  // 全局只读模式
  const globalReadonly = inject(FORM_GRID_READONLY_KEY, computed(() => false))

  // partial 模式：字段级只读控制
  const readonlyFields = inject(FORM_GRID_READONLY_FIELDS_KEY, computed(() => undefined))
  const editableFields = inject(FORM_GRID_EDITABLE_FIELDS_KEY, computed(() => undefined))

  /**
   * 判断当前字段是否因 partial 模式而只读
   *
   * 优先级：
   * 1. 全局 readonly → 全部只读
   * 2. editableFields 配置 → 未在列表中的字段只读
   * 3. readonlyFields 配置 → 在列表中的字段只读
   */
  const isPartialReadonly = computed(() => {
    if (globalReadonly.value) return true
    const field = widgetData.value.field
    if (!field) return false

    // editableFields 模式：只有列表中的字段可编辑
    if (editableFields.value !== undefined) {
      return !editableFields.value.includes(field)
    }
    // readonlyFields 模式：列表中的字段只读
    if (readonlyFields.value !== undefined) {
      return readonlyFields.value.includes(field)
    }
    return false
  })

  /** 最终 disabled = 静态 props.disabled OR 规则引擎 disabled OR partial 只读 */
  const isDisabled = computed(() =>
    ((widgetData.value.props?.disabled as boolean) ?? false)
    || renderState.value.disabled
    || isPartialReadonly.value,
  )

  /** 最终 required = 静态 validationRules.required OR 规则引擎 required */
  const isRequired = computed(() => renderState.value.required)

  return {
    renderState,
    isDisabled,
    isRequired,
  }
}
