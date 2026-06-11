import type mongoose from 'mongoose'
import { WorkflowModel, type IWorkflow } from '../models/Workflow.js'
import { FormSubmissionModel, type IFormSubmission } from '../models/FormSubmission.js'
import { flowEngine } from '../flow-services/FlowEngine.js'

/**
 * Find a published Workflow that is bound to the given schemaId.
 * Returns null if no published workflow exists for this form.
 */
export async function findWorkflowBySchemaId(schemaId: string): Promise<IWorkflow | null> {
  return WorkflowModel.findOne({
    formSchemaId: schemaId,
    status: 'published',
  })
}

/**
 * Start a FlowInstance triggered by a form submission.
 *
 * - Injects submission data as `formData` into the flow variables
 * - Links the submission record to the workflow and flow instance
 * - Returns the created FlowInstance
 */
export async function startFlowFromSubmission(
  workflow: IWorkflow,
  submission: mongoose.HydratedDocument<IFormSubmission>,
  userId: string,
) {
  const variables: Record<string, unknown> = {
    submissionId: submission._id,
    formSchemaId: workflow.formSchemaId,
    formData: submission.data,
    submitterId: submission.submitterId,
  }

  const instance = await flowEngine.startFlow(
    workflow.flowDefinitionId,
    variables,
    userId,
  )

  // Link submission back to the workflow and instance
  submission.workflowId = workflow._id
  submission.flowInstanceId = instance._id
  await submission.save()

  return instance
}
