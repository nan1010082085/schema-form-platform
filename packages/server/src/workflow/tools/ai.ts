/**
 * AI Tools — AI 生成工具集
 *
 * 提供 AI 驱动的 Schema 生成、流程生成和数据分析能力。
 */

import { v4 as uuidv4 } from 'uuid'
import { FormSchemaModel } from '../../models/FormSchema.js'
import { PublishedSchemaModel } from '../../models/PublishedSchema.js'
import { FlowDefinitionModel } from '../../flow-models/FlowDefinition.js'
import { FlowVersionModel } from '../../flow-models/FlowVersion.js'
import { toolRegistry, type ToolDefinition, type ToolResult } from '../toolRegistry.js'

// ─── Helper Functions ──────────────────────────────────────────

function generateVersion(): string {
  const now = new Date()
  const pad = (n: number, len: number) => String(n).padStart(len, '0')
  return (
    pad(now.getFullYear(), 4) +
    pad(now.getMonth() + 1, 2) +
    pad(now.getDate(), 2) +
    pad(now.getHours(), 2) +
    pad(now.getMinutes(), 2) +
    pad(now.getSeconds(), 2)
  )
}

function generateFlowVersion(): string {
  const now = new Date()
  const pad = (n: number, len: number) => String(n).padStart(len, '0')
  return `v${pad(now.getFullYear(), 4)}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}`
}

// ─── Tool Definitions ──────────────────────────────────────────

const generateSchema: ToolDefinition = {
  name: 'ai.generate_schema',
  description: '使用 AI 生成表单 Schema',
  parameters: [
    { name: 'description', type: 'string', description: '表单的自然语言描述', required: true },
    { name: 'name', type: 'string', description: 'Schema 名称' },
    { name: 'save', type: 'boolean', description: '是否保存到数据库', default: false },
  ],
  handler: async (params): Promise<ToolResult> => {
    const { description, name, save = false } = params as {
      description: string
      name?: string
      save?: boolean
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return { success: false, error: 'Field "description" is required and must be a non-empty string' }
    }

    // Import dynamically to avoid circular dependency
    const { generateSchemaFromPrompt } = await import('../../ai/tools/schemaGenerator.js')

    try {
      const generated = await generateSchemaFromPrompt(description)

      let savedSchema = null
      if (save) {
        const editId = uuidv4()
        const schemaId = uuidv4()
        const version = generateVersion()
        const schemaName = name || `AI Generated ${new Date().toISOString()}`

        savedSchema = await FormSchemaModel.create({
          _id: schemaId,
          editId,
          version,
          name: schemaName,
          type: 'form',
          status: 'draft',
          json: { widgets: generated.widgets },
        })

        // Auto-publish
        const publishId = uuidv4()
        await PublishedSchemaModel.create({
          _id: uuidv4(),
          sourceId: editId,
          publishId,
          name: schemaName,
          type: 'form',
          json: { widgets: generated.widgets },
          version,
          publishedAt: new Date(),
        })
      }

      return {
        success: true,
        data: {
          widgets: generated.widgets,
          summary: generated.summary,
          ...(savedSchema ? {
            schemaId: savedSchema._id,
            editId: savedSchema.editId,
            name: savedSchema.name,
          } : {}),
        },
        summary: save
          ? `Generated and saved schema "${savedSchema!.name}"`
          : `Generated schema with ${generated.widgets.length} widgets`,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: `Schema generation failed: ${message}` }
    }
  },
}

const generateFlow: ToolDefinition = {
  name: 'ai.generate_flow',
  description: '使用 AI 生成流程定义',
  parameters: [
    { name: 'description', type: 'string', description: '流程的自然语言描述', required: true },
    { name: 'name', type: 'string', description: '流程名称' },
    { name: 'save', type: 'boolean', description: '是否保存到数据库', default: false },
  ],
  handler: async (params): Promise<ToolResult> => {
    const { description, name, save = false } = params as {
      description: string
      name?: string
      save?: boolean
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return { success: false, error: 'Field "description" is required and must be a non-empty string' }
    }

    // For now, return a placeholder implementation
    // TODO: Implement actual AI flow generation
    const nodes = [
      { id: uuidv4(), type: 'start', label: 'Start', data: {} },
      { id: uuidv4(), type: 'end', label: 'End', data: {} },
    ]
    const edges = [
      { id: uuidv4(), source: nodes[0].id, target: nodes[1].id },
    ]

    let savedDefinition = null
    if (save) {
      const definitionId = uuidv4()
      const versionId = uuidv4()
      const version = generateFlowVersion()
      const flowName = name || `AI Generated Flow ${new Date().toISOString()}`

      await FlowVersionModel.create({
        _id: versionId,
        definitionId,
        version,
        graph: { nodes, edges },
      })

      savedDefinition = await FlowDefinitionModel.create({
        _id: definitionId,
        name: flowName,
        description,
        status: 'draft',
        currentVersionId: versionId,
        createdBy: 'system',
      })
    }

    return {
      success: true,
      data: {
        nodes,
        edges,
        ...(savedDefinition ? {
          definitionId: savedDefinition._id,
          name: savedDefinition.name,
        } : {}),
      },
      summary: save
        ? `Generated and saved flow "${savedDefinition!.name}"`
        : `Generated flow with ${nodes.length} nodes`,
    }
  },
}

const analyzeData: ToolDefinition = {
  name: 'ai.analyze_data',
  description: '使用 AI 分析数据',
  parameters: [
    { name: 'data', type: 'object', description: '要分析的数据', required: true },
    { name: 'question', type: 'string', description: '分析问题', required: true },
  ],
  handler: async (params): Promise<ToolResult> => {
    const { data, question } = params as {
      data: Record<string, unknown>
      question: string
    }

    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Field "data" is required and must be an object' }
    }

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return { success: false, error: 'Field "question" is required and must be a non-empty string' }
    }

    // For now, return a placeholder implementation
    // TODO: Implement actual AI data analysis
    const analysis = {
      summary: `Analyzed data for: ${question}`,
      keyFindings: [
        'Data structure is valid',
        'Contains nested objects and arrays',
      ],
      recommendations: [
        'Consider adding data validation',
        'Normalize nested structures if needed',
      ],
    }

    return {
      success: true,
      data: analysis,
      summary: `Completed data analysis for: ${question}`,
    }
  },
}

// ─── Register Tools ────────────────────────────────────────────

export function registerAITools(): void {
  toolRegistry.register(generateSchema)
  toolRegistry.register(generateFlow)
  toolRegistry.register(analyzeData)
}
