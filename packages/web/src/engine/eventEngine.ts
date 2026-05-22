/**
 * eventEngine — 事件引擎
 *
 * 解析 WidgetEvent，执行 SchemaEventAction。
 * 纯逻辑层，不依赖 Vue 组件，仅操作 Store。
 */
import type { Widget, SchemaEventAction, FormFieldValue } from '../widgets/base/types'
import { useWidgetStore } from '../stores/widget'
import { useEditorStore } from '../stores/editor'
import { useLogger } from '@/composables/useLogger'
import { checkSecurity } from '@/utils/expression'

const logger = useLogger('EventEngine')

/**
 * 执行单个事件动作。
 *
 * @param action - 事件动作定义
 * @param context - 执行上下文（供条件表达式使用）
 */
export function executeEventAction(
  action: SchemaEventAction,
  _context: Record<string, unknown> = {},
): void {
  const widgetStore = useWidgetStore()
  const editorStore = useEditorStore()

  switch (action.type) {
    case 'show': {
      const target = widgetStore.findWidget(action.target)
      if (target) widgetStore.updateWidget(action.target, { hidden: false })
      break
    }
    case 'hide': {
      const target = widgetStore.findWidget(action.target)
      if (target) widgetStore.updateWidget(action.target, { hidden: true })
      break
    }
    case 'open-dialog': {
      editorStore.openDialogEditor(action.target)
      break
    }
    case 'close-dialog': {
      editorStore.closeDialogEditor()
      break
    }
    case 'switch-tab': {
      const target = widgetStore.findWidget(action.target)
      if (target && target.type === 'tabs') {
        widgetStore.updateWidget(action.target, {
          props: { ...target.props, activeKey: action.value },
        })
      }
      break
    }
    case 'set-value': {
      if (action.target) {
        const targetWidget = widgetStore.findWidget(action.target)
        if (targetWidget) {
          widgetStore.updateWidget(action.target, { defaultValue: action.value as FormFieldValue })
        }
      }
      break
    }
    case 'submit': {
      const formWidget = widgetStore.widgets.find((w: Widget) => w.type === 'form')
      if (formWidget) {
        const values = widgetStore.collectFormValues(formWidget.id)
        logger.event('Form submit:', values)
      }
      break
    }
    case 'reset': {
      const form = widgetStore.widgets.find((w: Widget) => w.type === 'form')
      if (form && form.children) {
        for (const child of form.children) {
          if (child.field) {
            widgetStore.updateWidget(child.id, { defaultValue: child.defaultValue })
          }
        }
      }
      break
    }
    case 'emit': {
      logger.event('Emit custom event:', action.value)
      break
    }
  }
}

/**
 * 触发 Widget 上匹配的事件，并依次执行其动作链。
 *
 * @param widget - 目标 Widget
 * @param trigger - 触发事件名（click / change / close 等）
 * @param context - 执行上下文
 */
export function triggerWidgetEvent(
  widget: Widget,
  trigger: string,
  context: Record<string, unknown> = {},
): void {
  if (!widget.events) return

  for (const event of widget.events) {
    if (event.trigger !== trigger) continue

    // 条件判断
    if (event.condition && !evaluateCondition(event.condition, context)) continue

    // 确认提示
    if (event.confirm) {
      const confirmed = window.confirm(event.confirm)
      if (!confirmed) continue
    }

    // 执行动作链
    for (const action of event.actions) {
      executeEventAction(action, context)
    }
  }
}

/**
 * 条件表达式求值 — 委托给 expression.ts 安全引擎。
 *
 * 复用 utils/expression 的安全检查（blocklist + 长度限制），
 * 保持原有 API：context 的 key 作为形参、expression 作为函数体。
 *
 * @param expression - 条件表达式字符串
 * @param context - 变量上下文
 * @returns 表达式求值结果
 */
export function evaluateCondition(
  expression: string,
  context: Record<string, unknown>,
): boolean {
  if (!expression || typeof expression !== 'string') return false
  if (expression.length > 500) return false

  const securityError = checkSecurity(expression)
  if (securityError) {
    logger.warn(`Blocked unsafe expression: ${expression} (${securityError})`)
    return false
  }

  try {
    const keys = Object.keys(context)
    const values = Object.values(context)
    const fn = new Function(...keys, `return (${expression})`)
    return Boolean(fn(...values))
  } catch {
    logger.warn(`Expression evaluation failed: ${expression}`)
    return false
  }
}
