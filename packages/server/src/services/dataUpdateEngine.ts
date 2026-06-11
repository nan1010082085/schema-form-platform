import { WorkflowModel, type IDataUpdateRule } from '../models/Workflow.js'
import { FormSubmissionModel } from '../models/FormSubmission.js'
import type { IFlowInstance } from '../flow-models/FlowInstance.js'
import type { SubmissionStatus } from '../models/FormSubmission.js'

/**
 * Supported trigger types for data update rules.
 */
type DataUpdateTrigger = 'on-approved' | 'on-rejected' | 'on-completed'

/**
 * Determine which trigger applies given the task outcomes.
 *
 * - If all tasks approved -> 'on-approved'
 * - If all tasks rejected -> 'on-rejected'
 * - Mixed or no outcomes -> 'on-completed'
 */
function resolveTrigger(taskOutcomes: string[]): DataUpdateTrigger {
  if (taskOutcomes.length > 0 && taskOutcomes.every(o => o === 'rejected')) {
    return 'on-rejected'
  }
  if (taskOutcomes.length > 0 && taskOutcomes.every(o => o !== 'rejected')) {
    return 'on-approved'
  }
  return 'on-completed'
}

/**
 * Map trigger to submission status.
 */
const TRIGGER_STATUS_MAP: Record<DataUpdateTrigger, SubmissionStatus> = {
  'on-approved': 'approved',
  'on-rejected': 'rejected',
  'on-completed': 'approved',
}

/**
 * Execute data update rules defined on the Workflow when a flow instance
 * reaches a terminal state (completed).
 *
 * - Reads `Workflow.dataUpdateRules`
 * - Filters by trigger (on-approved / on-rejected / on-completed)
 * - Applies field mappings: submission.data[sourceField] -> targetField
 * - Updates FormSubmission status based on the outcome
 */
export async function executeDataUpdateRules(
  instance: IFlowInstance,
): Promise<{ submissionId: string | null; rulesApplied: number }> {
  const submissionId = instance.variables?.submissionId as string | undefined
  if (!submissionId) {
    return { submissionId: null, rulesApplied: 0 }
  }

  const submission = await FormSubmissionModel.findById(submissionId)
  if (!submission) {
    return { submissionId, rulesApplied: 0 }
  }

  if (!submission.workflowId) {
    return { submissionId, rulesApplied: 0 }
  }

  // Collect task outcomes once (used for both trigger resolution and status update)
  const taskOutcomes = await collectTaskOutcomes(instance._id)
  const trigger = resolveTrigger(taskOutcomes)
  const newStatus = TRIGGER_STATUS_MAP[trigger]

  const workflow = await WorkflowModel.findById(submission.workflowId)
  if (!workflow || workflow.dataUpdateRules.length === 0) {
    // No rules defined — just update submission status
    if (submission.status !== newStatus) {
      await FormSubmissionModel.findByIdAndUpdate(submissionId, { $set: { status: newStatus } })
    }
    return { submissionId, rulesApplied: 0 }
  }

  // Filter rules matching this trigger
  const matchingRules = workflow.dataUpdateRules.filter(
    (rule: IDataUpdateRule) => rule.trigger === trigger,
  )

  if (matchingRules.length === 0) {
    if (submission.status !== newStatus) {
      await FormSubmissionModel.findByIdAndUpdate(submissionId, { $set: { status: newStatus } })
    }
    return { submissionId, rulesApplied: 0 }
  }

  // Apply field mappings: submission.data[sourceField] -> targetField
  const data = { ...submission.data } as Record<string, unknown>
  let applied = 0

  for (const rule of matchingRules) {
    const sourceValue = resolveFieldValue(data, rule.sourceField)
    if (sourceValue !== undefined) {
      data[rule.targetField] = rule.transform
        ? applyTransform(sourceValue, rule.transform)
        : sourceValue
      applied++
    }
  }

  // Update submission data and status in one save
  submission.data = data
  if (submission.status !== newStatus) {
    submission.status = newStatus
  }
  await submission.save()

  return { submissionId, rulesApplied: applied }
}

/**
 * Collect task outcomes from all completed tasks in the instance.
 */
async function collectTaskOutcomes(instanceId: string): Promise<string[]> {
  const { TaskInstanceModel } = await import('../flow-models/TaskInstance.js')
  const tasks = await TaskInstanceModel.find({
    instanceId,
    status: 'completed',
    outcome: { $ne: null },
  }).select('outcome').lean()

  return tasks.map(t => (t as unknown as { outcome: string }).outcome).filter(Boolean)
}

/**
 * Resolve a dot-notation field path from the data object.
 * e.g. "address.city" -> data.address.city
 */
function resolveFieldValue(data: Record<string, unknown>, fieldPath: string): unknown {
  const segments = fieldPath.split('.')
  let value: unknown = data
  for (const seg of segments) {
    if (value == null || typeof value !== 'object') return undefined
    value = (value as Record<string, unknown>)[seg]
  }
  return value
}

/**
 * Apply a simple transform expression to a value.
 * Supported transforms:
 *   - "uppercase" -> String(value).toUpperCase()
 *   - "lowercase" -> String(value).toLowerCase()
 *   - "number" -> Number(value)
 *   - "boolean" -> Boolean(value)
 *   - "trim" -> String(value).trim()
 */
function applyTransform(value: unknown, transform: string): unknown {
  switch (transform) {
    case 'uppercase':
      return String(value).toUpperCase()
    case 'lowercase':
      return String(value).toLowerCase()
    case 'number':
      return Number(value)
    case 'boolean':
      return Boolean(value)
    case 'trim':
      return String(value).trim()
    default:
      return value
  }
}
