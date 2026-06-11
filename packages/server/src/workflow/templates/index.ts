/**
 * 工作流模板索引
 *
 * 汇总所有内置工作流模板，供种子数据和 API 使用。
 */
import { leaveApprovalTemplate } from './leave-approval.js'
import { purchaseRequestTemplate } from './purchase-request.js'
import { expenseReportTemplate } from './expense-report.js'
import { onboardingTemplate } from './onboarding.js'

export interface WorkflowTemplateDefinition {
  name: string
  description: string
  category: '人事' | '财务' | '采购' | '行政' | 'IT' | '其他'
  tags: string[]
  formSchema: Record<string, unknown>[]
  flowDefinition: {
    nodes: Array<Record<string, unknown>>
    edges: Array<Record<string, unknown>>
  }
  dataUpdateRules: Record<string, unknown>[]
}

/**
 * 所有内置工作流模板
 */
export const BUILTIN_WORKFLOW_TEMPLATES: WorkflowTemplateDefinition[] = [
  leaveApprovalTemplate,
  purchaseRequestTemplate,
  expenseReportTemplate,
  onboardingTemplate,
]
