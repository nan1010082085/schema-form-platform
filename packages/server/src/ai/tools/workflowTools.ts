/**
 * Workflow Agent tools — LangGraph StructuredTool format.
 *
 * Provides AI-driven workflow creation capabilities:
 * - create_workflow: Create a new Workflow
 * - link_schema: Associate a form Schema with a Workflow
 * - link_flow: Associate a flow definition with a Workflow
 * - configure_rules: Configure data update rules for a Workflow
 */

import { tool } from '@langchain/core/tools'
import { v4 as uuidv4 } from 'uuid'
import { WorkflowModel } from '../../models/Workflow.js'
import { FormSchemaModel } from '../../models/FormSchema.js'
import { FlowDefinitionModel } from '../../flow-models/FlowDefinition.js'
import { z } from 'zod'
import type { ToolResult } from './types.js'

// ────────────────────────────────────────────
// Tool: create_workflow
// ────────────────────────────────────────────

export const createWorkflowTool = tool(
  async ({ name, description, formSchemaId, flowDefinitionId, dataUpdateRules, publishConfig }): Promise<string> => {
    try {
      // Validate form schema exists
      if (formSchemaId) {
        const schema = await FormSchemaModel.findById(formSchemaId).select('_id name').lean()
        if (!schema) {
          return JSON.stringify({
            success: false,
            error: `Form schema ${formSchemaId} not found`,
          } satisfies ToolResult)
        }
      }

      // Validate flow definition exists
      if (flowDefinitionId) {
        const flowDef = await FlowDefinitionModel.findById(flowDefinitionId).select('_id name').lean()
        if (!flowDef) {
          return JSON.stringify({
            success: false,
            error: `Flow definition ${flowDefinitionId} not found`,
          } satisfies ToolResult)
        }
      }

      const workflow = await WorkflowModel.create({
        _id: uuidv4(),
        name,
        description: description ?? '',
        status: 'draft',
        formSchemaId: formSchemaId ?? '',
        flowDefinitionId: flowDefinitionId ?? '',
        dataUpdateRules: dataUpdateRules ?? [],
        publishConfig: publishConfig ?? {},
        createdBy: 'ai-agent',
      })

      return JSON.stringify({
        success: true,
        data: {
          workflowId: workflow._id,
          name: workflow.name,
          status: workflow.status,
          formSchemaId: workflow.formSchemaId,
          flowDefinitionId: workflow.flowDefinitionId,
        },
        summary: `已创建 Workflow "${name}" (ID: ${workflow._id})`,
      } satisfies ToolResult)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return JSON.stringify({
        success: false,
        error: `创建 Workflow 失败: ${message}`,
      } satisfies ToolResult)
    }
  },
  {
    name: 'create_workflow',
    description: `创建一个新的 Workflow（工作流）。Workflow 是表单 Schema 和流程定义的组合，用于定义业务流程。

参数：
- name: Workflow 名称（必填）
- description: 描述（可选）
- formSchemaId: 关联的表单 Schema ID（可选，后续可用 link_schema 关联）
- flowDefinitionId: 关联的流程定义 ID（可选，后续可用 link_flow 关联）
- dataUpdateRules: 数据更新规则数组（可选）
- publishConfig: 发布配置（可选）

返回创建的 Workflow ID 和摘要信息。`,
    schema: z.object({
      name: z.string().min(1).max(200).describe('Workflow 名称'),
      description: z.string().max(2000).optional().describe('Workflow 描述'),
      formSchemaId: z.string().uuid().optional().describe('关联的表单 Schema ID'),
      flowDefinitionId: z.string().uuid().optional().describe('关联的流程定义 ID'),
      dataUpdateRules: z.array(z.object({
        trigger: z.string().min(1).describe('触发条件（如 form_submitted, flow_completed）'),
        targetField: z.string().min(1).describe('目标字段'),
        sourceField: z.string().min(1).describe('来源字段'),
        transform: z.string().optional().describe('转换规则（可选）'),
      })).optional().describe('数据更新规则'),
      publishConfig: z.object({
        entryUrl: z.string().optional().describe('入口 URL'),
        permissions: z.object({
          launchers: z.array(z.string()).optional().describe('可发起人 ID 列表'),
          viewers: z.array(z.string()).optional().describe('可查看人 ID 列表'),
        }).optional(),
      }).optional().describe('发布配置'),
    }),
  },
)

// ────────────────────────────────────────────
// Tool: link_schema
// ────────────────────────────────────────────

export const linkSchemaTool = tool(
  async ({ workflowId, formSchemaId }): Promise<string> => {
    try {
      // Validate workflow exists
      const workflow = await WorkflowModel.findById(workflowId)
      if (!workflow) {
        return JSON.stringify({
          success: false,
          error: `Workflow ${workflowId} not found`,
        } satisfies ToolResult)
      }

      // Validate form schema exists
      const schema = await FormSchemaModel.findById(formSchemaId).select('_id name').lean() as Record<string, unknown> | null
      if (!schema) {
        return JSON.stringify({
          success: false,
          error: `Form schema ${formSchemaId} not found`,
        } satisfies ToolResult)
      }

      workflow.formSchemaId = formSchemaId
      await workflow.save()

      return JSON.stringify({
        success: true,
        data: {
          workflowId: workflow._id,
          formSchemaId,
          schemaName: schema.name as string,
        },
        summary: `已将表单 Schema "${schema.name as string}" 关联到 Workflow "${workflow.name}"`,
      } satisfies ToolResult)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return JSON.stringify({
        success: false,
        error: `关联表单 Schema 失败: ${message}`,
      } satisfies ToolResult)
    }
  },
  {
    name: 'link_schema',
    description: `将表单 Schema 关联到 Workflow。Workflow 必须关联一个表单 Schema 用于数据采集。

参数：
- workflowId: Workflow ID（必填）
- formSchemaId: 表单 Schema ID（必填）

返回关联结果。`,
    schema: z.object({
      workflowId: z.string().uuid().describe('Workflow ID'),
      formSchemaId: z.string().uuid().describe('表单 Schema ID'),
    }),
  },
)

// ────────────────────────────────────────────
// Tool: link_flow
// ────────────────────────────────────────────

export const linkFlowTool = tool(
  async ({ workflowId, flowDefinitionId }): Promise<string> => {
    try {
      // Validate workflow exists
      const workflow = await WorkflowModel.findById(workflowId)
      if (!workflow) {
        return JSON.stringify({
          success: false,
          error: `Workflow ${workflowId} not found`,
        } satisfies ToolResult)
      }

      // Validate flow definition exists
      const flowDef = await FlowDefinitionModel.findById(flowDefinitionId).select('_id name').lean() as Record<string, unknown> | null
      if (!flowDef) {
        return JSON.stringify({
          success: false,
          error: `Flow definition ${flowDefinitionId} not found`,
        } satisfies ToolResult)
      }

      workflow.flowDefinitionId = flowDefinitionId
      await workflow.save()

      return JSON.stringify({
        success: true,
        data: {
          workflowId: workflow._id,
          flowDefinitionId,
          flowName: flowDef.name as string,
        },
        summary: `已将流程定义 "${flowDef.name as string}" 关联到 Workflow "${workflow.name}"`,
      } satisfies ToolResult)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return JSON.stringify({
        success: false,
        error: `关联流程定义失败: ${message}`,
      } satisfies ToolResult)
    }
  },
  {
    name: 'link_flow',
    description: `将流程定义关联到 Workflow。Workflow 必须关联一个流程定义用于审批流转。

参数：
- workflowId: Workflow ID（必填）
- flowDefinitionId: 流程定义 ID（必填）

返回关联结果。`,
    schema: z.object({
      workflowId: z.string().uuid().describe('Workflow ID'),
      flowDefinitionId: z.string().uuid().describe('流程定义 ID'),
    }),
  },
)

// ────────────────────────────────────────────
// Tool: configure_rules
// ────────────────────────────────────────────

export const configureRulesTool = tool(
  async ({ workflowId, rules }): Promise<string> => {
    try {
      // Validate workflow exists
      const workflow = await WorkflowModel.findById(workflowId)
      if (!workflow) {
        return JSON.stringify({
          success: false,
          error: `Workflow ${workflowId} not found`,
        } satisfies ToolResult)
      }

      workflow.dataUpdateRules = rules
      await workflow.save()

      return JSON.stringify({
        success: true,
        data: {
          workflowId: workflow._id,
          rulesCount: rules.length,
          rules: rules.map(r => `${r.trigger}: ${r.sourceField} -> ${r.targetField}`),
        },
        summary: `已为 Workflow "${workflow.name}" 配置 ${rules.length} 条数据更新规则`,
      } satisfies ToolResult)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return JSON.stringify({
        success: false,
        error: `配置数据更新规则失败: ${message}`,
      } satisfies ToolResult)
    }
  },
  {
    name: 'configure_rules',
    description: `为 Workflow 配置数据更新规则。规则定义了在特定触发条件下，如何将数据从源字段映射到目标字段。

参数：
- workflowId: Workflow ID（必填）
- rules: 数据更新规则数组（必填）

每条规则包含：
- trigger: 触发条件（如 form_submitted, flow_completed, task_approved）
- sourceField: 来源字段
- targetField: 目标字段
- transform: 转换规则（可选，如 JSONPath 表达式）

返回配置结果。`,
    schema: z.object({
      workflowId: z.string().uuid().describe('Workflow ID'),
      rules: z.array(z.object({
        trigger: z.string().min(1).describe('触发条件（如 form_submitted, flow_completed, task_approved）'),
        sourceField: z.string().min(1).describe('来源字段'),
        targetField: z.string().min(1).describe('目标字段'),
        transform: z.string().optional().describe('转换规则（可选）'),
      })).describe('数据更新规则数组'),
    }),
  },
)

// ────────────────────────────────────────────
// Tool: search_workflows
// ────────────────────────────────────────────

export const searchWorkflowsTool = tool(
  async ({ keyword, status, limit }): Promise<string> => {
    try {
      const filter: Record<string, unknown> = {}

      if (status && ['draft', 'published', 'archived'].includes(status)) {
        filter.status = status
      }

      if (keyword) {
        filter.$or = [
          { name: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
        ]
      }

      const workflows = await WorkflowModel.find(filter)
        .select('_id name description status formSchemaId flowDefinitionId createdAt')
        .sort({ createdAt: -1 })
        .limit(limit ?? 10)
        .lean()

      return JSON.stringify({
        success: true,
        data: {
          workflows: workflows.map(w => ({
            id: w._id,
            name: w.name,
            description: w.description,
            status: w.status,
            formSchemaId: w.formSchemaId,
            flowDefinitionId: w.flowDefinitionId,
            createdAt: w.createdAt,
          })),
          total: workflows.length,
        },
        summary: `找到 ${workflows.length} 个 Workflow`,
      } satisfies ToolResult)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return JSON.stringify({
        success: false,
        error: `搜索 Workflow 失败: ${message}`,
      } satisfies ToolResult)
    }
  },
  {
    name: 'search_workflows',
    description: `搜索已有的 Workflow。支持按关键词和状态筛选。

参数：
- keyword: 按名称/描述模糊搜索（可选）
- status: 按状态筛选（可选，draft/published/archived）
- limit: 返回数量上限（可选，默认 10）

返回 Workflow 列表。`,
    schema: z.object({
      keyword: z.string().optional().describe('按名称/描述模糊搜索'),
      status: z.enum(['draft', 'published', 'archived']).optional().describe('按状态筛选'),
      limit: z.number().optional().default(10).describe('返回数量上限'),
    }),
  },
)

// ────────────────────────────────────────────
// Tool: get_workflow_detail
// ────────────────────────────────────────────

export const getWorkflowDetailTool = tool(
  async ({ workflowId }): Promise<string> => {
    try {
      const workflow = await WorkflowModel.findById(workflowId).lean() as Record<string, unknown> | null
      if (!workflow) {
        return JSON.stringify({
          success: false,
          error: `Workflow ${workflowId} not found`,
        } satisfies ToolResult)
      }

      return JSON.stringify({
        success: true,
        data: {
          id: workflow._id as string,
          name: workflow.name as string,
          description: workflow.description as string,
          status: workflow.status as string,
          formSchemaId: workflow.formSchemaId as string,
          flowDefinitionId: workflow.flowDefinitionId as string,
          dataUpdateRules: workflow.dataUpdateRules as unknown[],
          publishConfig: workflow.publishConfig as Record<string, unknown>,
          createdBy: workflow.createdBy as string,
          createdAt: workflow.createdAt as Date,
          updatedAt: workflow.updatedAt as Date,
        },
        summary: `Workflow "${workflow.name as string}" 详情`,
      } satisfies ToolResult)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return JSON.stringify({
        success: false,
        error: `获取 Workflow 详情失败: ${message}`,
      } satisfies ToolResult)
    }
  },
  {
    name: 'get_workflow_detail',
    description: `获取 Workflow 详情，包括关联的表单 Schema、流程定义、数据更新规则等。

参数：
- workflowId: Workflow ID（必填）

返回 Workflow 完整信息。`,
    schema: z.object({
      workflowId: z.string().uuid().describe('Workflow ID'),
    }),
  },
)

// ────────────────────────────────────────────
// Export all workflow tools
// ────────────────────────────────────────────

export const workflowTools = [
  createWorkflowTool,
  linkSchemaTool,
  linkFlowTool,
  configureRulesTool,
  searchWorkflowsTool,
  getWorkflowDetailTool,
]
