/**
 * Flow Tools — 流程操作工具集
 *
 * 提供流程定义的创建、实例启动和状态查询能力。
 */

import { v4 as uuidv4 } from 'uuid'
import { FlowDefinitionModel } from '../../flow-models/FlowDefinition.js'
import { FlowVersionModel } from '../../flow-models/FlowVersion.js'
import { FlowInstanceModel } from '../../flow-models/FlowInstance.js'
import { toolRegistry, type ToolDefinition, type ToolResult } from '../toolRegistry.js'

// ─── Helper Functions ──────────────────────────────────────────

function generateVersion(): string {
  const now = new Date()
  const pad = (n: number, len: number) => String(n).padStart(len, '0')
  return `v${pad(now.getFullYear(), 4)}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}`
}

// ─── Tool Definitions ──────────────────────────────────────────

const createDefinition: ToolDefinition = {
  name: 'flow.create_definition',
  description: '创建一个新的流程定义',
  parameters: [
    { name: 'name', type: 'string', description: '流程名称', required: true },
    { name: 'description', type: 'string', description: '流程描述' },
    { name: 'nodes', type: 'array', description: '流程节点数组', required: true },
    { name: 'edges', type: 'array', description: '流程边数组', required: true },
    { name: 'category', type: 'string', description: '流程分类' },
  ],
  handler: async (params): Promise<ToolResult> => {
    const { name, description = '', nodes, edges, category = '' } = params as {
      name: string
      description?: string
      nodes: Record<string, unknown>[]
      edges: Record<string, unknown>[]
      category?: string
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return { success: false, error: 'Field "name" is required and must be a non-empty string' }
    }

    if (!Array.isArray(nodes)) {
      return { success: false, error: 'Field "nodes" must be an array' }
    }

    if (!Array.isArray(edges)) {
      return { success: false, error: 'Field "edges" must be an array' }
    }

    const definitionId = uuidv4()
    const versionId = uuidv4()
    const version = generateVersion()

    // Create initial version
    await FlowVersionModel.create({
      _id: versionId,
      definitionId,
      version,
      graph: { nodes, edges },
    })

    // Create definition with reference to version
    const definition = await FlowDefinitionModel.create({
      _id: definitionId,
      name: name.trim(),
      description,
      category,
      status: 'draft',
      currentVersionId: versionId,
      createdBy: 'system', // TODO: get from auth context
    })

    return {
      success: true,
      data: {
        id: definition._id,
        name: definition.name,
        status: definition.status,
        versionId,
        version,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      },
      summary: `Created flow definition "${definition.name}" with ${nodes.length} nodes`,
    }
  },
}

const startInstance: ToolDefinition = {
  name: 'flow.start_instance',
  description: '启动一个流程实例',
  parameters: [
    { name: 'definitionId', type: 'string', description: '流程定义 ID', required: true },
    { name: 'variables', type: 'object', description: '初始变量' },
  ],
  handler: async (params): Promise<ToolResult> => {
    const { definitionId, variables = {} } = params as {
      definitionId: string
      variables?: Record<string, unknown>
    }

    if (!definitionId) {
      return { success: false, error: 'Field "definitionId" is required' }
    }

    const definition = await FlowDefinitionModel.findById(definitionId)
    if (!definition) {
      return { success: false, error: `Flow definition "${definitionId}" not found` }
    }

    if (definition.status !== 'published') {
      return { success: false, error: `Flow definition "${definitionId}" is not published (status: ${definition.status})` }
    }

    if (!definition.currentVersionId) {
      return { success: false, error: `Flow definition "${definitionId}" has no version` }
    }

    const version = await FlowVersionModel.findById(definition.currentVersionId)
    if (!version) {
      return { success: false, error: `Flow version "${definition.currentVersionId}" not found` }
    }

    const instanceId = uuidv4()

    const instance = await FlowInstanceModel.create({
      _id: instanceId,
      definitionId,
      versionId: version._id,
      version: version.version,
      status: 'running',
      variables,
      tokens: [],
      initiatedBy: 'system', // TODO: get from auth context
      startedAt: new Date(),
    })

    return {
      success: true,
      data: {
        instanceId: instance._id,
        definitionId,
        status: instance.status,
        version: instance.version,
        startedAt: instance.startedAt,
      },
      summary: `Started flow instance "${instance._id}" for definition "${definition.name}"`,
    }
  },
}

const getStatus: ToolDefinition = {
  name: 'flow.get_status',
  description: '获取流程实例状态',
  parameters: [
    { name: 'instanceId', type: 'string', description: '流程实例 ID', required: true },
  ],
  handler: async (params): Promise<ToolResult> => {
    const { instanceId } = params as { instanceId: string }

    if (!instanceId) {
      return { success: false, error: 'Field "instanceId" is required' }
    }

    const instance = await FlowInstanceModel.findById(instanceId)
    if (!instance) {
      return { success: false, error: `Flow instance "${instanceId}" not found` }
    }

    const definition = await FlowDefinitionModel.findById(instance.definitionId).select('name')

    return {
      success: true,
      data: {
        instanceId: instance._id,
        definitionId: instance.definitionId,
        definitionName: definition?.name,
        status: instance.status,
        version: instance.version,
        variables: instance.variables,
        tokens: instance.tokens,
        startedAt: instance.startedAt,
        completedAt: instance.completedAt,
      },
    }
  },
}

// ─── Register Tools ────────────────────────────────────────────

export function registerFlowTools(): void {
  toolRegistry.register(createDefinition)
  toolRegistry.register(startInstance)
  toolRegistry.register(getStatus)
}
