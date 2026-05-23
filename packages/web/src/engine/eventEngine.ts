/**
 * eventEngine — 事件引擎
 *
 * 解析 WidgetEvent，执行 SchemaEventAction。
 * 纯逻辑层，不依赖 Vue 组件或 Store，通过 EventExecutionContext 注入运行时能力。
 */
import type { Widget, SchemaEventAction, FormFieldValue } from '../widgets/base/types'
import { useLogger } from '@/composables/useLogger'
import { checkSecurity } from '@/utils/expression'

const logger = useLogger('EventEngine')

/** 事件执行上下文 — 由编辑器或运行时提供 */
export interface EventExecutionContext {
  /** 查找 widget（编辑器用 widgetStore.findWidget，运行时用 schema 树查找） */
  findWidget: (id: string) => Widget | undefined
  /** 更新 widget 属性 */
  updateWidget: (id: string, patch: Partial<Widget>) => void
  /** 打开弹窗 */
  openDialog: (target: string) => void
  /** 关闭弹窗 */
  closeDialog: () => void
  /** 提交表单 */
  submitForm: () => void
  /** 重置表单 */
  resetForm: () => void
  /** 获取表单数据 */
  getFormData: () => Record<string, unknown>
  /** 自定义事件 emit */
  emit: (eventName: string, payload?: unknown) => void
  /** 确认对话框（返回 Promise，reject 表示取消） */
  confirm?: (message: string) => Promise<void>
  /** 变量上下文 */
  variables?: Record<string, unknown>
  /** 设置变量值 */
  setVariable?: (name: string, value: unknown) => void
  /** 获取变量值 */
  getVariable?: (name: string) => unknown
  /** 组件暴露值上下文 */
  exposed?: Record<string, Record<string, unknown>>
  /** 触发目标组件的指定事件 */
  triggerEvent?: (targetId: string, eventName: string) => void
}

/**
 * 执行单个事件动作。
 *
 * @param action - 事件动作定义
 * @param ctx - 执行上下文
 */
export function executeEventAction(
  action: SchemaEventAction,
  ctx: EventExecutionContext,
): void {
  switch (action.type) {
    case 'show': {
      if (!action.target) break
      const target = ctx.findWidget(action.target)
      if (target) ctx.updateWidget(action.target, { hidden: false })
      break
    }
    case 'hide': {
      if (!action.target) break
      const target = ctx.findWidget(action.target)
      if (target) ctx.updateWidget(action.target, { hidden: true })
      break
    }
    case 'open-dialog': {
      if (action.target) ctx.openDialog(action.target)
      break
    }
    case 'close-dialog': {
      ctx.closeDialog()
      break
    }
    case 'switch-tab': {
      if (!action.target) break
      const target = ctx.findWidget(action.target)
      if (target && target.type === 'tabs') {
        ctx.updateWidget(action.target, {
          props: { ...target.props, activeKey: action.value },
        })
      }
      break
    }
    case 'set-value': {
      if (action.target) {
        const targetWidget = ctx.findWidget(action.target)
        if (targetWidget) {
          ctx.updateWidget(action.target, { defaultValue: action.value as FormFieldValue })
        }
      }
      break
    }
    case 'submit': {
      ctx.submitForm()
      break
    }
    case 'reset': {
      ctx.resetForm()
      break
    }
    case 'emit': {
      ctx.emit('custom', action.value)
      break
    }
    case 'set-variable': {
      if (action.variable && ctx.setVariable) {
        ctx.setVariable(action.variable, action.value)
        logger.event(`set-variable: ${action.variable} =`, action.value)
      }
      break
    }
    case 'trigger-event': {
      if (action.target && action.event && ctx.triggerEvent) {
        ctx.triggerEvent(action.target, action.event)
        logger.event(`trigger-event: ${action.target}.${action.event}`)
      }
      break
    }
    case 'post-message': {
      if (action.message) {
        const data = resolveMessageData(action.message, ctx)
        window.parent.postMessage(data, '*')
        logger.event('post-message:', data)
      }
      break
    }
    case 'close-tab': {
      window.close()
      logger.event('close-tab')
      break
    }
    case 'copy': {
      if (action.text) {
        const text = resolveTextValue(action.text, ctx)
        navigator.clipboard.writeText(text).then(() => {
          logger.event('copy:', text)
        }).catch((err) => {
          logger.warn('copy failed:', err)
        })
      }
      break
    }
    case 'refresh': {
      if (action.target && ctx.triggerEvent) {
        ctx.triggerEvent(action.target, 'refresh')
        logger.event(`refresh: ${action.target}`)
      }
      break
    }
    case 'api': {
      if (action.apiUrl) {
        logger.event(`api: ${action.apiMethod ?? 'post'} ${action.apiUrl}`)
        // API 调用由上层实现（actionExecutor 或 WidgetRenderer）
        ctx.emit('api-call', {
          url: action.apiUrl,
          method: action.apiMethod ?? 'post',
          params: action.apiParams === 'formData' ? ctx.getFormData() : action.apiParams,
        })
      }
      break
    }
    case 'navigate': {
      if (action.navigatePath) {
        logger.event(`navigate: ${action.navigatePath}`)
        ctx.emit('navigate', {
          path: action.navigatePath,
          query: action.navigateQuery,
        })
      }
      break
    }
  }
}

/**
 * 解析消息数据中的 formData.xxx 引用
 */
function resolveMessageData(
  message: Record<string, unknown>,
  ctx: EventExecutionContext,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const formData = ctx.getFormData()
  for (const [key, value] of Object.entries(message)) {
    if (typeof value === 'string' && value.startsWith('formData.')) {
      const field = value.slice(9)
      result[key] = formData[field]
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * 解析文本中的 formData.xxx 引用
 */
function resolveTextValue(text: string, ctx: EventExecutionContext): string {
  if (text.startsWith('formData.')) {
    const field = text.slice(9)
    const value = ctx.getFormData()[field]
    return String(value ?? '')
  }
  return text
}

/**
 * 触发 Widget 上匹配的事件，并依次执行其动作链。
 *
 * @param widget - 目标 Widget
 * @param trigger - 触发事件名（click / change / close 等）
 * @param ctx - 执行上下文
 */
export async function triggerWidgetEvent(
  widget: Widget,
  trigger: string,
  ctx: EventExecutionContext,
): Promise<void> {
  if (!widget.events) return

  // 构建完整的表达式上下文
  const context: Record<string, unknown> = {
    ...ctx.getFormData(),
    ...(ctx.variables ?? {}),
  }

  for (const event of widget.events) {
    if (event.trigger !== trigger) continue

    // 条件判断
    if (event.condition && !evaluateCondition(event.condition, context, ctx.exposed)) continue

    // 确认提示（使用 UI 库的 confirm，而非浏览器原生）
    if (event.confirm) {
      if (!ctx.confirm) {
        logger.warn('confirm dialog requested but ctx.confirm is not provided')
        continue
      }
      try {
        await ctx.confirm(event.confirm)
      } catch {
        // 用户取消
        continue
      }
    }

    // 执行动作链
    for (const action of event.actions) {
      executeEventAction(action, ctx)
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
 * @param context - 变量上下文（formData + variables 展平）
 * @param exposed - 组件暴露值上下文
 * @returns 表达式求值结果
 */
export function evaluateCondition(
  expression: string,
  context: Record<string, unknown>,
  exposed?: Record<string, Record<string, unknown>>,
): boolean {
  if (!expression || typeof expression !== 'string') return false
  if (expression.length > 500) return false

  const securityError = checkSecurity(expression)
  if (securityError) {
    logger.warn(`Blocked unsafe expression: ${expression} (${securityError})`)
    return false
  }

  try {
    // 构建沙箱参数：
    // 1. values/variables: 上下文数据（formData + variables 展平）
    // 2. exposed: 组件暴露值
    // 3. 同时支持直接访问 context 中的 key（向后兼容）
    const keys = ['values', 'variables', 'exposed', ...Object.keys(context)]
    const args = [context, context, exposed ?? {}, ...Object.values(context)]
    const fn = new Function(...keys, `"use strict"; return (${expression})`)
    return Boolean(fn(...args))
  } catch {
    logger.warn(`Expression evaluation failed: ${expression}`)
    return false
  }
}
