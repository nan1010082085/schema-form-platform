/**
 * eventEngine — 事件引擎
 *
 * 解析 WidgetEvent，执行 SchemaEventAction。
 * 纯逻辑层，不依赖 Vue 组件，仅操作 Store。
 */
import type { Widget, SchemaEventAction } from '../widgets/base/types'
import { useWidgetStore } from '../stores/widget'
import { useEditorStore } from '../stores/editor'
import { useLogger } from '@/composables/useLogger'

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
 * 简单表达式求值。
 *
 * 将 context 的 key 作为形参、expression 作为函数体，
 * 通过 new Function 执行并返回布尔结果。
 *
 * @param expression - 条件表达式字符串
 * @param context - 变量上下文
 * @returns 表达式求值结果
 */
export function evaluateCondition(
  expression: string,
  context: Record<string, unknown>,
): boolean {
  try {
    const keys = Object.keys(context)
    const values = Object.values(context)
    const fn = new Function(...keys, `return ${expression}`)
    return Boolean(fn(...values))
  } catch {
    logger.warn(`Expression evaluation failed: ${expression}`)
    return false
  }
}
