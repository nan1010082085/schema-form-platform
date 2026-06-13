/**
 * eventEngine — 事件引擎
 *
 * 解析 WidgetEvent，执行 SchemaEventAction。
 * 纯逻辑层，不依赖 Vue 组件或 Store，通过 EventExecutionContext 注入运行时能力。
 */
import type { Widget, SchemaEventAction, FormFieldValue } from '../widgets/base/types'
import { getWidget } from '../widgets/registry'
import { useLogger } from '@/composables/useLogger'
import { checkSecurity } from '@/utils/expression'
import { apiClient } from '@/utils/apiClient'

const logger = useLogger('EventEngine')

/** 格式化部件名：按钮 #abc123 */
function formatWidget(widget: Widget): string {
  const reg = getWidget(widget.type)
  const name = reg?.displayName ?? widget.type
  return `${name} #${widget.id}`
}

function formatTarget(targetId: string, ctx: EventExecutionContext): string {
  const w = ctx.findWidget(targetId)
  return w ? formatWidget(w) : `#${targetId}`
}

const TRIGGER_LABELS: Record<string, string> = {
  click: '点击',
  change: '值变化',
  focus: '获得焦点',
  blur: '失去焦点',
  submit: '提交',
  close: '关闭',
  open: '打开',
  confirm: '确认',
  cancel: '取消',
  refresh: '刷新',
  'api-success': 'API 成功',
  'api-error': 'API 失败',
  mounted: '挂载完成',
}

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
export async function executeEventAction(
  action: SchemaEventAction,
  ctx: EventExecutionContext,
): Promise<void> {
  switch (action.type) {
    case 'show': {
      if (!action.target) break
      const target = ctx.findWidget(action.target)
      if (target) ctx.updateWidget(action.target, { hidden: false })
      logger.event(`显示: ${formatTarget(action.target, ctx)}`)
      break
    }
    case 'hide': {
      if (!action.target) break
      const target = ctx.findWidget(action.target)
      if (target) ctx.updateWidget(action.target, { hidden: true })
      logger.event(`隐藏: ${formatTarget(action.target, ctx)}`)
      break
    }
    case 'open-dialog': {
      if (action.target) {
        ctx.openDialog(action.target)
        logger.event(`打开弹窗: ${formatTarget(action.target, ctx)}`)
      }
      break
    }
    case 'close-dialog': {
      ctx.closeDialog()
      logger.event('关闭弹窗')
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
      logger.event(`切换页签: ${formatTarget(action.target, ctx)} → ${action.value}`)
      break
    }
    case 'set-value': {
      if (action.target) {
        const targetWidget = ctx.findWidget(action.target)
        if (targetWidget) {
          ctx.updateWidget(action.target, { defaultValue: action.value as FormFieldValue })
        }
        logger.event(`赋值: ${formatTarget(action.target, ctx)} = ${action.value}`)
      }
      break
    }
    case 'submit': {
      ctx.submitForm()
      logger.event('提交表单')
      break
    }
    case 'reset': {
      ctx.resetForm()
      logger.event('重置表单')
      break
    }
    case 'emit': {
      ctx.emit('custom', action.value)
      logger.event(`触发自定义事件: ${action.value}`)
      break
    }
    case 'set-variable': {
      if (action.variable && ctx.setVariable) {
        ctx.setVariable(action.variable, action.value)
        logger.event(`设置变量: ${action.variable} = ${action.value}`)
      }
      break
    }
    case 'trigger-event': {
      if (action.target && action.event && ctx.triggerEvent) {
        ctx.triggerEvent(action.target, action.event)
        logger.event(`触发组件事件: ${formatTarget(action.target, ctx)}.${action.event}`)
      }
      break
    }
    case 'post-message': {
      if (action.message) {
        const data = resolveMessageData(action.message, ctx)
        window.parent.postMessage(data, '*')
        logger.event('发送消息:', data)
      }
      break
    }
    case 'close-tab': {
      window.close()
      logger.event('关闭标签页')
      break
    }
    case 'copy': {
      if (action.text) {
        const text = resolveTextValue(action.text, ctx)
        await navigator.clipboard.writeText(text)
        logger.event(`复制到剪贴板: ${text}`)
      }
      break
    }
    case 'refresh': {
      if (action.target && ctx.triggerEvent) {
        ctx.triggerEvent(action.target, 'refresh')
        logger.event(`刷新: ${formatTarget(action.target, ctx)}`)
      }
      break
    }
    case 'api': {
      if (action.apiUrl) {
        const method = action.apiMethod ?? 'post'
        const params = action.apiParams === 'formData' ? ctx.getFormData() : action.apiParams
        logger.api(`请求: ${method} ${action.apiUrl}`)
        try {
          const response = await apiClient.requestUrl<unknown>(method, action.apiUrl, params)
          logger.api(`响应成功: ${action.apiUrl}`, response)
          ctx.emit('api-success', { url: action.apiUrl, response })
        } catch (err) {
          logger.warn(`响应失败: ${action.apiUrl}`, err)
          ctx.emit('api-error', { url: action.apiUrl, error: String(err) })
        }
      }
      break
    }
    case 'navigate': {
      if (action.navigatePath) {
        logger.event(`跳转: ${action.navigatePath}`)
        ctx.emit('navigate', {
          path: action.navigatePath,
          query: action.navigateQuery,
        })
      }
      break
    }
    case 'startFlow': {
      if (!action.definitionId) break
      logger.api(`发起流程: definitionId=${action.definitionId}`)
      try {
        const response = await apiClient.requestUrl<unknown>('post', '/flow-instances', {
          definitionId: action.definitionId,
          variables: action.variables ?? {},
        })
        logger.api('流程发起成功', response)
        ctx.emit('flow-started', { definitionId: action.definitionId, response })
      } catch (err) {
        logger.warn(`流程发起失败: definitionId=${action.definitionId}`, err)
        ctx.emit('flow-error', { action: 'startFlow', definitionId: action.definitionId, error: String(err) })
      }
      break
    }
    case 'endFlow': {
      if (!action.instanceId) break
      logger.api(`结束流程: instanceId=${action.instanceId}`)
      try {
        const response = await apiClient.requestUrl<unknown>(
          'post',
          `/flow-instances/${action.instanceId}/terminate`,
          action.reason ? { reason: action.reason } : undefined,
        )
        logger.api('流程结束成功', response)
        ctx.emit('flow-ended', { instanceId: action.instanceId, response })
      } catch (err) {
        logger.warn(`流程结束失败: instanceId=${action.instanceId}`, err)
        ctx.emit('flow-error', { action: 'endFlow', instanceId: action.instanceId, error: String(err) })
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
  eventTarget?: string,
): Promise<void> {
  if (!widget.events?.length) return
  const widgetLabel = formatWidget(widget)
  const triggerLabel = TRIGGER_LABELS[trigger] ?? trigger
  logger.event(`触发: ${widgetLabel} [${triggerLabel}]`)

  // 构建完整的表达式上下文
  const context: Record<string, unknown> = {
    ...ctx.getFormData(),
    ...(ctx.variables ?? {}),
  }

  for (const event of widget.events) {
    if (event.trigger !== trigger) continue
    // 匹配事件目标：事件未指定 target 则匹配所有，指定了则必须一致
    if (event.eventTarget && event.eventTarget !== eventTarget) continue

    // 条件判断
    if (event.condition) {
      const result = evaluateCondition(event.condition, context, ctx.exposed)
      logger.rule(`条件: "${event.condition}" → ${result ? '通过' : '不通过'}`)
      if (!result) continue
    }

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
      try {
        await executeEventAction(action, ctx)
      } catch (err) {
        logger.warn(`action "${action.type}" failed:`, err)
      }
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
    // 使用 with(env) 让表达式可以直接引用表单字段名（如 status、lock），
    // 同时支持 values.xxx、variables.xxx、exposed.xxx 命名空间访问。
    const env = { ...context, values: context, variables: context, exposed: exposed ?? {} }
    const fn = new Function(
      'env',
      `with(env) { return (${expression}) }`,
    )
    return Boolean(fn(env))
  } catch {
    logger.warn(`Expression evaluation failed: ${expression}`)
    return false
  }
}
