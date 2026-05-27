/**
 * Action 执行器
 * 顺序执行按钮动作链，支持确认、API 调用、路由跳转等
 */
import { ElMessage, ElMessageBox } from 'element-plus'
import type { SchemaAction, FormData } from '@/components/WidgetRenderer/types'
import { getRequestInstance } from './request'
import { useLogger } from '@/composables/useLogger'

const logger = useLogger('ActionExecutor')

/** Action 执行上下文 */
export interface ActionContext {
  emit: (event: string, payload?: unknown) => void
  validate: () => Promise<boolean>
  getFormData: () => FormData
  resetFields: () => void
  router?: { push: (to: { path: string; query?: Record<string, string> }) => void }
  openDialog?: (config: { title: string; width?: string; schema?: SchemaAction['dialogSchema'] }) => void
  triggerUpload?: () => void
}

/** 执行动作链 */
export async function executeActions(
  actions: SchemaAction[],
  context: ActionContext,
): Promise<void> {
  for (const action of actions) {
    if (action.disabled) continue

    // 确认提示
    if (action.confirm) {
      try {
        await ElMessageBox.confirm(action.confirm, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        })
      } catch {
        return // 用户取消，中断整个链
      }
    }

    try {
      await executeAction(action, context)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '操作失败'
      ElMessage.error(message)
      return // 出错中断
    }
  }
}

/** 执行单个动作 */
async function executeAction(action: SchemaAction, context: ActionContext): Promise<void> {
  switch (action.type) {
    case 'emit':
      context.emit(action.eventName ?? 'action', action.eventPayload)
      break

    case 'validate':
      await context.validate()
      break

    case 'submit':
      await context.validate()
      context.emit('submit', context.getFormData())
      break

    case 'reset':
      context.resetFields()
      break

    case 'dialog':
      context.openDialog?.({
        title: action.dialogTitle ?? '',
        width: action.dialogWidth,
        schema: action.dialogSchema,
      })
      break

    case 'upload':
      context.triggerUpload?.()
      break

    case 'navigate':
      if (action.navigatePath) {
        context.router?.push({
          path: action.navigatePath,
          query: action.navigateQuery,
        })
      }
      break

    case 'api': {
      if (!action.apiUrl) throw new Error('API 地址未配置')
      const http = getRequestInstance()
      const method = action.apiMethod ?? 'post'
      const params = action.apiParams === 'formData'
        ? context.getFormData()
        : action.apiParams
      const res: unknown = method === 'get'
        ? await http.get(action.apiUrl, { params })
        : await http.post(action.apiUrl, params)
      context.emit('api-response', res)
      break
    }

    default:
      logger.warn('未知动作类型:', (action as { type: string }).type)
  }
}
