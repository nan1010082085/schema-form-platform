/**
 * ruleEngine — 规则引擎
 *
 * 解析 WidgetRule：监听 watches、判断 condition、执行 actions。
 * 与 eventEngine 的区别：规则引擎面向数据驱动的业务逻辑（fetch、set-value、submit 等），
 * 事件引擎面向 UI 交互动作（show、hide、open-dialog 等）。
 */
import type { Widget, WidgetRuleAction, FormFieldValue, WidgetRenderState } from '../widgets/base/types'
import { useWidgetStore } from '../stores/widget'
import { executeEventAction, evaluateCondition } from './eventEngine'

/** 规则执行上下文 */
interface RuleContext {
  /** 当前表单数据（field → value 映射） */
  formData: Record<string, unknown>
  /** 触发规则的 Widget ID */
  widgetId: string
}

/**
 * 执行单个规则动作。
 * fetch-data 为异步操作，其余为同步。
 *
 * @param action - 规则动作定义
 * @param context - 规则上下文
 */
export async function executeRuleAction(
  action: WidgetRuleAction,
  _context: RuleContext,
): Promise<void> {
  const widgetStore = useWidgetStore()

  switch (action.type) {
    case 'fetch-data': {
      const { url, method = 'GET', params, dataPath } = action.config as {
        url: string
        method?: string
        params?: Record<string, unknown>
        dataPath?: string
      }

      try {
        const queryStr = params
          ? '?' + new URLSearchParams(params as Record<string, string>).toString()
          : ''
        const response = await fetch(url + queryStr, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: method !== 'GET' ? JSON.stringify(params) : undefined,
        })
        const data: unknown = await response.json()
        const result = dataPath
          ? dataPath.split('.').reduce((obj: Record<string, unknown>, key: string) => {
              return (obj as Record<string, unknown>)?.[key] as Record<string, unknown>
            }, data as Record<string, unknown>)
          : data

        // 执行成功回调
        if (action.onSuccess) {
          for (const successAction of action.onSuccess) {
            executeEventAction(successAction, { data: result })
          }
        }
      } catch (error) {
        // 执行失败回调
        if (action.onError) {
          for (const errorAction of action.onError) {
            executeEventAction(errorAction, { error })
          }
        }
      }
      break
    }
    case 'set-value': {
      const { targetField, value } = action.config as { targetField: string; value: unknown }
      const target = findWidgetByField(widgetStore.widgets, targetField)
      if (target) {
        widgetStore.updateWidget(target.id, { defaultValue: value as FormFieldValue })
      }
      break
    }
    case 'submit': {
      const { formId } = action.config as { formId?: string }
      if (formId) {
        const values = widgetStore.collectFormValues(formId)
        console.log('[RuleEngine] Form submit:', values)
      }
      break
    }
    case 'validate': {
      console.log('[RuleEngine] Validate triggered')
      break
    }
    case 'reset': {
      const { formId } = action.config as { formId?: string }
      if (formId) {
        resetFormWidgets(widgetStore.widgets, formId)
      }
      break
    }
    // 渲染状态动作 — 由 computeWidgetRenderState 处理，此处无副作用
    case 'hide':
    case 'visible':
    case 'disabled':
      break
  }
}

/**
 * 根据 field 属性递归查找 Widget。
 */
function findWidgetByField(widgets: Widget[], field: string): Widget | null {
  for (const w of widgets) {
    if (w.field === field) return w
    if (w.children) {
      const found = findWidgetByField(w.children, field)
      if (found) return found
    }
  }
  return null
}

/**
 * 重置指定表单容器下所有 Widget 的值为其 defaultValue。
 */
function resetFormWidgets(widgets: Widget[], formId: string): void {
  const widgetStore = useWidgetStore()
  for (const w of widgets) {
    if (w.formId === formId && w.defaultValue !== undefined) {
      widgetStore.updateWidget(w.id, { defaultValue: w.defaultValue })
    }
    if (w.children) {
      resetFormWidgets(w.children, formId)
    }
  }
}

/**
 * 检查并执行 Widget 的所有规则。
 *
 * 遍历 widget.rules，对每条规则：
 * 1. 检查 watches 中是否有匹配的字段变化
 * 2. 评估 condition 表达式
 * 3. 满足条件则执行 actions
 *
 * @param widget - 目标 Widget
 * @param context - 规则上下文
 */
export function evaluateWidgetRules(widget: Widget, context: RuleContext): void {
  if (!widget.rules) return

  for (const rule of widget.rules) {
    // 检查是否满足监听条件
    const shouldExecute = rule.watches.some((watch) => {
      if (watch.type === 'field') {
        return watch.source in context.formData
      }
      return false
    })

    if (!shouldExecute) continue

    // 条件判断
    if (!evaluateCondition(rule.condition, context.formData)) continue

    // 执行动作
    for (const action of rule.actions) {
      executeRuleAction(action, context)
    }
  }
}

/**
 * 计算 Widget 的渲染状态（visible / disabled / required）。
 *
 * 供 SchemaNode 在渲染管线中调用，将规则引擎的输出
 * 直接映射到组件的 v-if / :disabled / required 控制。
 *
 * 评估逻辑：
 * 1. visible: widget.hidden 静态属性 OR 规则中存在 hide/visible 动作
 * 2. disabled: widget.props.disabled OR 规则中存在 disabled 动作
 * 3. required: validationRules 中存在 required: true
 *
 * 此函数只做同步状态计算，不执行规则的副作用动作。
 * 副作用（fetch-data、set-value 等）由 evaluateWidgetRules 负责。
 *
 * @param widget - 目标 Widget
 * @param formData - 当前表单数据（field → value）
 * @returns 渲染状态
 */
export function computeWidgetRenderState(
  widget: Widget,
  formData: Record<string, unknown>,
): WidgetRenderState {
  // 静态 disabled
  const staticDisabled = (widget.props?.disabled as boolean) ?? false

  // 静态 required（validationRules 中是否有 required: true）
  const staticRequired = widget.validationRules?.some((r) => r.required) ?? false

  // 无规则时直接返回静态状态
  if (!widget.rules?.length) {
    return {
      visible: !widget.hidden,
      disabled: staticDisabled,
      required: staticRequired,
    }
  }

  let visible = !widget.hidden
  let disabled = staticDisabled

  for (const rule of widget.rules) {
    // 检查是否满足监听条件
    const shouldExecute = rule.watches.some((watch) => {
      if (watch.type === 'field') {
        return watch.source in formData
      }
      return false
    })
    if (!shouldExecute) continue

    // 条件判断
    if (!evaluateCondition(rule.condition, formData)) continue

    // 从动作中提取渲染状态
    for (const action of rule.actions) {
      switch (action.type) {
        case 'hide':
          visible = false
          break
        case 'visible':
          visible = true
          break
        case 'disabled':
          disabled = true
          break
      }
    }
  }

  return {
    visible,
    disabled,
    required: staticRequired,
  }
}
