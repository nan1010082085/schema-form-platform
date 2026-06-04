/**
 * Flow Agent tools — LangGraph StructuredTool format.
 *
 * Provides flow search, user/role lookup, schema binding, schema generation,
 * and validation capabilities for the Flow Agent to query real data during generation.
 */

import { tool } from '@langchain/core/tools'
import { FlowDefinitionModel } from '../../flow-models/FlowDefinition.js'
import { FlowVersionModel } from '../../flow-models/FlowVersion.js'
import { FormSchemaModel } from '../../models/FormSchema.js'
import { UserModel } from '../../models/User.js'
import { escapeRegex } from '../graph/agentBase.js'
import { generateSchemaFromPrompt } from './schemaGenerator.js'
import { z } from 'zod'

// ────────────────────────────────────────────
// Tool result type
// ────────────────────────────────────────────

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  summary?: string
}

// ────────────────────────────────────────────
// LangGraph tools
// ────────────────────────────────────────────

export const searchFlowsTool = tool(
  async ({ keyword, status, category, limit }): Promise<ToolResult> => {
    const filter: Record<string, unknown> = {}
    if (keyword) {
      filter.$or = [
        { name: { $regex: escapeRegex(keyword), $options: 'i' } },
        { description: { $regex: escapeRegex(keyword), $options: 'i' } },
      ]
    }
    if (status) filter.status = status
    if (category) filter.category = category

    const flows = await FlowDefinitionModel.find(filter)
      .select('_id name description category status currentVersionId createdBy createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean()

    const mapped = flows.map((f: Record<string, unknown>) => ({
      id: f._id,
      name: f.name,
      description: f.description,
      category: f.category,
      status: f.status,
      currentVersionId: f.currentVersionId,
      createdBy: f.createdBy,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }))

    const summary = flows.length === 0
      ? `没有找到${keyword ? `包含"${keyword}"的` : ''}流程`
      : `找到 ${flows.length} 个流程：${mapped.slice(0, 3).map((f: Record<string, unknown>) => `${f.name}（${f.status}）`).join('、')}${flows.length > 3 ? '等' : ''}`

    return {
      success: true,
      data: { total: flows.length, flows: mapped },
      summary,
    }
  },
  {
    name: 'search_flows',
    description: '搜索已有的流程定义。可查找现有流程作为参考或查找需要修改的流程。',
    schema: z.object({
      keyword: z.string().optional().describe('按名称/描述模糊搜索'),
      status: z.enum(['draft', 'published', 'archived']).optional().describe('按状态筛选'),
      category: z.string().optional().describe('按分类筛选'),
      limit: z.number().optional().default(10).describe('返回数量上限，默认 10'),
    }),
  },
)

export const getFlowDetailTool = tool(
  async ({ flowId }): Promise<ToolResult> => {
    const definition = await FlowDefinitionModel.findById(flowId).lean() as Record<string, unknown> | null
    if (!definition) {
      return { success: false, error: `Flow definition ${flowId} not found` }
    }

    let graph: Record<string, unknown> | null = null
    if (definition.currentVersionId) {
      const version = await FlowVersionModel.findById(definition.currentVersionId).lean() as Record<string, unknown> | null
      if (version) {
        graph = version.graph as Record<string, unknown>
      }
    }

    const nodeCount = graph ? ((graph as Record<string, unknown>).nodes as unknown[])?.length ?? 0 : 0
    const edgeCount = graph ? ((graph as Record<string, unknown>).edges as unknown[])?.length ?? 0 : 0

    return {
      success: true,
      data: {
        id: definition._id,
        name: definition.name,
        description: definition.description,
        category: definition.category,
        status: definition.status,
        createdBy: definition.createdBy,
        graph,
        createdAt: definition.createdAt,
        updatedAt: definition.updatedAt,
      },
      summary: `流程 "${definition.name}"（${definition.status}）包含 ${nodeCount} 个节点、${edgeCount} 条边`,
    }
  },
  {
    name: 'get_flow_detail',
    description: '获取流程定义详情，包括当前版本的完整 FlowGraph（节点和边）。用于深入了解现有流程结构。',
    schema: z.object({
      flowId: z.string().describe('流程定义的 _id'),
    }),
  },
)

export const searchUsersTool = tool(
  async ({ keyword, role, limit }): Promise<ToolResult> => {
    const filter: Record<string, unknown> = {}
    if (keyword) {
      filter.$or = [
        { username: { $regex: escapeRegex(keyword), $options: 'i' } },
        { displayName: { $regex: escapeRegex(keyword), $options: 'i' } },
      ]
    }
    if (role) {
      filter.roles = role
    }

    const users = await UserModel.find(filter)
      .select('_id username displayName roles')
      .sort({ username: 1 })
      .limit(limit)
      .lean()

    const mapped = users.map((u: Record<string, unknown>) => ({
      id: u._id,
      username: u.username,
      displayName: u.displayName,
      roles: u.roles,
    }))

    const summary = users.length === 0
      ? `没有找到${keyword ? `包含"${keyword}"的` : ''}用户`
      : `找到 ${users.length} 个用户：${mapped.slice(0, 5).map((u: Record<string, unknown>) => `${u.displayName || u.username}`).join('、')}${users.length > 5 ? '等' : ''}`

    return {
      success: true,
      data: { total: users.length, users: mapped },
      summary,
    }
  },
  {
    name: 'search_users',
    description: '搜索用户列表，用于设置审批节点的指派人（assignee/candidateUsers）。返回用户的 ID、姓名和角色。',
    schema: z.object({
      keyword: z.string().optional().describe('按用户名/显示名模糊搜索'),
      role: z.string().optional().describe('按角色 ID 筛选'),
      limit: z.number().optional().default(20).describe('返回数量上限，默认 20'),
    }),
  },
)

export const searchSchemasForFlowTool = tool(
  async ({ keyword, type, limit }): Promise<ToolResult> => {
    const filter: Record<string, unknown> = {}
    if (keyword) {
      filter.name = { $regex: escapeRegex(keyword), $options: 'i' }
    }
    if (type) {
      filter.type = type
    }

    const schemas = await FormSchemaModel.find(filter)
      .select('_id name type status version')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean()

    const mapped = schemas.map((s: Record<string, unknown>) => ({
      id: s._id,
      name: s.name,
      type: s.type,
      status: s.status,
      version: s.version,
    }))

    const summary = schemas.length === 0
      ? `没有找到${keyword ? `包含"${keyword}"的` : ''}表单`
      : `找到 ${schemas.length} 个表单：${mapped.slice(0, 3).map((s: Record<string, unknown>) => `${s.name}（${s.status}）`).join('、')}${schemas.length > 3 ? '等' : ''}`

    return {
      success: true,
      data: { total: schemas.length, schemas: mapped },
      summary,
    }
  },
  {
    name: 'search_schemas',
    description: '搜索表单 Schema，用于为 userTask 配置 formSchemaId 绑定表单。返回 Schema 的 ID、名称和类型。',
    schema: z.object({
      keyword: z.string().optional().describe('按名称模糊搜索'),
      type: z.enum(['form', 'search_list']).optional().describe('按类型筛选'),
      limit: z.number().optional().default(10).describe('返回数量上限，默认 10'),
    }),
  },
)

export const generateSchemaTool = tool(
  async ({ description }): Promise<ToolResult> => {
    try {
      const result = await generateSchemaFromPrompt(description)
      return {
        success: true,
        data: {
          schemaId: result.tempId,
          widgets: result.widgets,
          summary: result.summary,
        },
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: `Schema 生成失败: ${message}` }
    }
  },
  {
    name: 'generate_schema',
    description: '调用 Editor Agent 生成一个表单 Schema。用于为 userTask 创建关联的表单。返回生成的 Schema JSON 和临时 ID，可在 formSchemaId 中引用。',
    schema: z.object({
      description: z.string().describe('表单的自然语言描述，如"采购申请表单，包含物品名称、数量、金额、申请人"'),
    }),
  },
)

export const validateFlowTool = tool(
  async ({ flow }): Promise<ToolResult> => {
    const errors = validateFlowGraph(flow as FlowGraphInput)

    const summary = errors.length === 0
      ? `流程校验通过，${flow.nodes.length} 个节点、${flow.edges.length} 条边`
      : `流程校验失败，${errors.length} 个错误：${errors.slice(0, 3).join('；')}${errors.length > 3 ? '等' : ''}`

    return {
      success: true,
      data: { valid: errors.length === 0, errors },
      summary,
    }
  },
  {
    name: 'validate_flow',
    description: '校验 FlowGraph 的结构正确性。在生成流程后调用此工具确认无误再返回给用户。',
    schema: z.object({
      flow: z.object({
        nodes: z.array(z.record(z.unknown())).describe('流程节点数组'),
        edges: z.array(z.record(z.unknown())).describe('流程边数组'),
      }).describe('要校验的 FlowGraph，包含 nodes 和 edges 数组'),
    }),
  },
)

// ────────────────────────────────────────────
// Exported tool array for ToolNode
// ────────────────────────────────────────────

export const saveAndBindSchemaTool = tool(
  async ({ widgets, schemaName, flowId, nodeId }): Promise<ToolResult> => {
    const { v4: uuidv4 } = await import('uuid')

    const editId = uuidv4()
    const schemaId = uuidv4()
    const now = new Date()
    const version = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('')

    const name = schemaName || `AI Generated ${now.toISOString()}`

    // 1. 持久化 Schema 到 FormSchema 表
    const schema = await FormSchemaModel.create({
      _id: schemaId,
      editId,
      version,
      name,
      type: 'form',
      status: 'draft',
      json: widgets,
    })

    // 2. 同时发布到 PublishedSchema
    const { PublishedSchemaModel } = await import('../../models/PublishedSchema.js')
    const publishId = uuidv4()
    await PublishedSchemaModel.create({
      _id: uuidv4(),
      sourceId: editId,
      publishId,
      name: schema.name,
      type: schema.type,
      json: schema.json,
      version: schema.version,
      publishedAt: now,
    })

    // 3. 如果指定了 flowId 和 nodeId，绑定到流程节点
    let bindingResult: Record<string, unknown> | undefined
    if (flowId && nodeId) {
      const binding = await bindSchemaToFlowNode(flowId, nodeId, schemaId, publishId, version)
      bindingResult = binding
    }

    const summary = flowId && nodeId
      ? `已创建并持久化 Schema "${name}"（${schemaId}），并绑定到流程节点 ${nodeId}`
      : `已创建并持久化 Schema "${name}"（${schemaId}）`

    return {
      success: true,
      data: {
        schemaId,
        editId,
        publishId,
        name,
        version,
        binding: bindingResult,
      },
      summary,
    }
  },
  {
    name: 'save_and_bind_schema',
    description: `将生成的 Schema 持久化到数据库，并可选地绑定到流程节点。

执行以下操作：
1. 将 Schema 保存到 FormSchema 表
2. 同时创建 PublishedSchema 版本
3. 如果提供了 flowId 和 nodeId，自动将 formSchemaId 绑定到对应的 userTask 节点

用于 Flow Agent 在生成流程时自动关联表单。`,
    schema: z.object({
      widgets: z.array(z.record(z.unknown())).describe('要保存的 Widget Schema JSON 数组'),
      schemaName: z.string().optional().describe('Schema 名称，默认自动生成'),
      flowId: z.string().optional().describe('要绑定的流程定义 ID'),
      nodeId: z.string().optional().describe('要绑定的流程节点 ID（通常是 userTask）'),
    }),
  },
)

export const bindSchemaToFlowNodeTool = tool(
  async ({ flowId, nodeId, schemaId }): Promise<ToolResult> => {
    // 查找 Schema 获取 publishId 和 version
    const schema = await FormSchemaModel.findById(schemaId)
      .select('_id editId name version')
      .lean() as Record<string, unknown> | null

    if (!schema) {
      return { success: false, error: `Schema ${schemaId} not found` }
    }

    const { PublishedSchemaModel } = await import('../../models/PublishedSchema.js')
    const published = await PublishedSchemaModel.findOne({ sourceId: schema.editId })
      .sort({ publishedAt: -1 })
      .select('publishId version')
      .lean() as Record<string, unknown> | null

    const publishId = (published?.publishId as string) ?? ''
    const version = (published?.version as string) ?? (schema.version as string) ?? ''

    const binding = await bindSchemaToFlowNode(flowId, nodeId, schemaId, publishId, version)

    return {
      success: true,
      data: {
        ...binding,
        schemaName: schema.name,
      },
      summary: `已将 Schema "${schema.name}" 绑定到流程节点 ${nodeId}`,
    }
  },
  {
    name: 'bind_schema_to_flow_node',
    description: `将已有 Schema 绑定到流程的 userTask 节点。更新 FlowVersion 中该节点的 formSchemaId、formPublishId、formVersion 字段。

用于在生成流程后手动关联表单，或更新已有节点的表单引用。`,
    schema: z.object({
      flowId: z.string().describe('流程定义 ID（FlowDefinition._id）'),
      nodeId: z.string().describe('要绑定的节点 ID'),
      schemaId: z.string().describe('要绑定的 Schema ID（FormSchema._id）'),
    }),
  },
)

export const getFlowNodeSchemaTool = tool(
  async ({ flowId, nodeId }): Promise<ToolResult> => {
    const version = await FlowVersionModel.findOne({ definitionId: flowId })
      .sort({ version: -1 })
      .lean() as Record<string, unknown> | null

    if (!version?.graph) {
      return { success: false, error: `Flow ${flowId} has no version` }
    }

    const nodes = ((version.graph as Record<string, unknown>).nodes ?? []) as Array<Record<string, unknown>>
    const node = nodes.find((n) => n.id === nodeId)

    if (!node) {
      return { success: false, error: `Node ${nodeId} not found in flow ${flowId}` }
    }

    const data = node.data as Record<string, unknown> | undefined
    const formSchemaId = data?.formSchemaId as string | undefined

    if (!formSchemaId) {
      return {
        success: true,
        data: { nodeId, hasSchema: false },
        summary: `节点 ${nodeId} 未绑定表单`,
      }
    }

    // 获取绑定的 Schema 详情
    const schema = await FormSchemaModel.findById(formSchemaId)
      .select('_id name type version json')
      .lean() as Record<string, unknown> | null

    return {
      success: true,
      data: {
        nodeId,
        hasSchema: true,
        formSchemaId,
        formPublishId: data?.formPublishId,
        formVersion: data?.formVersion,
        formMode: data?.formMode,
        schemaName: schema?.name,
        schemaType: schema?.type,
        widgetCount: Array.isArray(schema?.json) ? (schema.json as unknown[]).length : 0,
      },
      summary: schema
        ? `节点 ${nodeId} 绑定了表单 "${schema.name}"（${formSchemaId}）`
        : `节点 ${nodeId} 引用了 Schema ${formSchemaId}，但该 Schema 已不存在`,
    }
  },
  {
    name: 'get_flow_node_schema',
    description: '获取流程节点绑定的表单 Schema 信息。用于查看某个 userTask 节点当前引用了哪个表单。',
    schema: z.object({
      flowId: z.string().describe('流程定义 ID'),
      nodeId: z.string().describe('节点 ID'),
    }),
  },
)

// ────────────────────────────────────────────
// Flow Diff Computation
// ────────────────────────────────────────────

interface FlowDiffEntry {
  type: 'add_node' | 'remove_node' | 'modify_node' | 'add_edge' | 'remove_edge' | 'modify_edge'
  elementId: string
  elementType: 'node' | 'edge'
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  summary: string
}

interface FlowDiff {
  changes: FlowDiffEntry[]
  nodesAdded: number
  nodesRemoved: number
  nodesModified: number
  edgesAdded: number
  edgesRemoved: number
  edgesModified: number
}

/**
 * Compute a structural diff between two FlowGraph structures.
 */
export function computeFlowDiff(
  oldFlow: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] },
  newFlow: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] },
): FlowDiff {
  const changes: FlowDiffEntry[] = []
  let nodesAdded = 0
  let nodesRemoved = 0
  let nodesModified = 0
  let edgesAdded = 0
  let edgesRemoved = 0
  let edgesModified = 0

  const oldNodeMap = new Map(oldFlow.nodes.map((n) => [n.id as string, n]))
  const newNodeMap = new Map(newFlow.nodes.map((n) => [n.id as string, n]))

  // Removed nodes
  for (const [id, node] of oldNodeMap) {
    if (!newNodeMap.has(id)) {
      nodesRemoved++
      const label = (node.data as Record<string, unknown>)?.label ?? id
      changes.push({
        type: 'remove_node',
        elementId: id,
        elementType: 'node',
        before: node,
        summary: `删除了节点 "${label}"`,
      })
    }
  }

  // Added and modified nodes
  for (const [id, node] of newNodeMap) {
    const oldNode = oldNodeMap.get(id)
    if (!oldNode) {
      nodesAdded++
      const label = (node.data as Record<string, unknown>)?.label ?? id
      changes.push({
        type: 'add_node',
        elementId: id,
        elementType: 'node',
        after: node,
        summary: `新增了节点 "${label}"`,
      })
    } else {
      const oldData = JSON.stringify(oldNode.data)
      const newData = JSON.stringify(node.data)
      if (oldData !== newData) {
        nodesModified++
        const label = (node.data as Record<string, unknown>)?.label ?? id
        const oldD = (oldNode.data ?? {}) as Record<string, unknown>
        const newD = (node.data ?? {}) as Record<string, unknown>
        const changedKeys = Object.keys({ ...oldD, ...newD }).filter(
          (k) => JSON.stringify(oldD[k]) !== JSON.stringify(newD[k]),
        )
        changes.push({
          type: 'modify_node',
          elementId: id,
          elementType: 'node',
          before: oldNode,
          after: node,
          summary: `修改了节点 "${label}" 的 ${changedKeys.join('、')} 属性`,
        })
      }
    }
  }

  // Edges
  const oldEdgeMap = new Map(oldFlow.edges.map((e) => [e.id as string, e]))
  const newEdgeMap = new Map(newFlow.edges.map((e) => [e.id as string, e]))

  for (const [id, edge] of oldEdgeMap) {
    if (!newEdgeMap.has(id)) {
      edgesRemoved++
      changes.push({
        type: 'remove_edge',
        elementId: id,
        elementType: 'edge',
        before: edge,
        summary: `删除了连线 ${id}`,
      })
    }
  }

  for (const [id, edge] of newEdgeMap) {
    const oldEdge = oldEdgeMap.get(id)
    if (!oldEdge) {
      edgesAdded++
      changes.push({
        type: 'add_edge',
        elementId: id,
        elementType: 'edge',
        after: edge,
        summary: `新增了连线 ${id}`,
      })
    } else if (JSON.stringify(oldEdge) !== JSON.stringify(edge)) {
      edgesModified++
      changes.push({
        type: 'modify_edge',
        elementId: id,
        elementType: 'edge',
        before: oldEdge,
        after: edge,
        summary: `修改了连线 ${id}`,
      })
    }
  }

  return {
    changes,
    nodesAdded,
    nodesRemoved,
    nodesModified,
    edgesAdded,
    edgesRemoved,
    edgesModified,
  }
}

// ────────────────────────────────────────────
// Update Flow Tool
// ────────────────────────────────────────────

export const updateFlowTool = tool(
  async ({ flow, flowId, description }): Promise<ToolResult> => {
    const flowGraph = flow as { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }

    // 1. Validate
    const errors = validateFlowGraph(flowGraph)
    if (errors.length > 0) {
      return {
        success: false,
        error: `流程校验失败，${errors.length} 个错误：${errors.slice(0, 3).join('；')}`,
      }
    }

    // 2. Compute diff against existing flow
    let diff: FlowDiff | null = null
    if (flowId) {
      const definition = await FlowDefinitionModel.findById(flowId)
        .select('currentVersionId')
        .lean() as Record<string, unknown> | null

      if (definition?.currentVersionId) {
        const currentVersion = await FlowVersionModel.findById(definition.currentVersionId)
          .select('graph')
          .lean() as Record<string, unknown> | null

        if (currentVersion?.graph) {
          const oldGraph = currentVersion.graph as { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }
          diff = computeFlowDiff(oldGraph, flowGraph)
        }
      }
    }

    // 3. Save as new version
    if (flowId) {
      const { v4: uuidv4 } = await import('uuid')
      const now = new Date()
      const pad = (n: number, len: number) => String(n).padStart(len, '0')
      const nextVersion = `v${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}`

      const newVersion = await FlowVersionModel.create({
        _id: uuidv4(),
        definitionId: flowId,
        version: nextVersion,
        graph: flowGraph,
      })

      await FlowDefinitionModel.findByIdAndUpdate(flowId, {
        currentVersionId: newVersion._id,
      })
    }

    const diffSummary = diff
      ? `变更：节点 +${diff.nodesAdded} -${diff.nodesRemoved} ~${diff.nodesModified}，连线 +${diff.edgesAdded} -${diff.edgesRemoved} ~${diff.edgesModified}`
      : `流程包含 ${flowGraph.nodes.length} 个节点、${flowGraph.edges.length} 条边`

    return {
      success: true,
      data: {
        flow: flowGraph,
        flowId,
        diff,
        description,
      },
      summary: diffSummary,
    }
  },
  {
    name: 'update_flow',
    description: `增量更新已有的流程。基于用户的反馈修改当前流程，只变更需要修改的部分。

使用场景：
- 用户说"加一个审批节点"、"把或签改成会签"、"修改审批人"
- 用户对已生成的流程提出修改意见
- 多轮迭代优化流程

工作流程：
1. 在上下文中获取当前流程
2. 理解用户的修改需求
3. 生成修改后的完整流程（保持未修改部分不变）
4. 调用此工具提交更新

工具会自动计算 diff 并保存版本历史。`,
    schema: z.object({
      flow: z.object({
        nodes: z.array(z.record(z.unknown())).describe('修改后的完整流程节点数组'),
        edges: z.array(z.record(z.unknown())).describe('修改后的完整流程边数组'),
      }).describe('修改后的完整 FlowGraph'),
      flowId: z.string().optional().describe('要更新的流程定义 ID。如果不提供则创建新流程'),
      description: z.string().describe('本次修改的自然语言描述，如"添加了财务审批节点"'),
    }),
  },
)

export const flowTools = [
  searchFlowsTool,
  getFlowDetailTool,
  searchUsersTool,
  searchSchemasForFlowTool,
  generateSchemaTool,
  validateFlowTool,
  saveAndBindSchemaTool,
  bindSchemaToFlowNodeTool,
  getFlowNodeSchemaTool,
  updateFlowTool,
]

// ────────────────────────────────────────────
// Shared validation logic (used by agent output validation)
// ────────────────────────────────────────────

interface FlowGraphInput {
  nodes: Record<string, unknown>[]
  edges: Record<string, unknown>[]
}

// ────────────────────────────────────────────
// Shared helper: bind schema to flow node
// ────────────────────────────────────────────

async function bindSchemaToFlowNode(
  flowId: string,
  nodeId: string,
  schemaId: string,
  publishId: string,
  version: string,
): Promise<Record<string, unknown>> {
  // 获取最新版本
  const flowVersion = await FlowVersionModel.findOne({ definitionId: flowId })
    .sort({ version: -1 })
    .lean() as Record<string, unknown> | null

  if (!flowVersion?.graph) {
    throw new Error(`Flow ${flowId} has no version`)
  }

  const graph = flowVersion.graph as Record<string, unknown>
  const nodes = (graph.nodes ?? []) as Array<Record<string, unknown>>
  const nodeIndex = nodes.findIndex((n) => n.id === nodeId)

  if (nodeIndex === -1) {
    throw new Error(`Node ${nodeId} not found in flow ${flowId}`)
  }

  const nodeData = nodes[nodeIndex].data as Record<string, unknown>
  if (nodeData.bpmnType !== 'userTask') {
    throw new Error(`Node ${nodeId} is not a userTask (type: ${nodeData.bpmnType})`)
  }

  // 更新节点的表单绑定字段
  const updatedNodes = [...nodes]
  updatedNodes[nodeIndex] = {
    ...updatedNodes[nodeIndex],
    data: {
      ...nodeData,
      formSchemaId: schemaId,
      formPublishId: publishId,
      formVersion: version,
      formMode: nodeData.formMode ?? 'edit',
    },
  }

  // 创建新版本
  const { FlowDefinitionModel } = await import('../../flow-models/FlowDefinition.js')
  const { v4: uuidv4 } = await import('uuid')

  const def = await FlowDefinitionModel.findById(flowId).lean()
  const now = new Date()
  const pad = (n: number, len: number) => String(n).padStart(len, '0')
  const nextVersion = `v${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}`

  const newVersion = await FlowVersionModel.create({
    _id: uuidv4(),
    definitionId: flowId,
    version: nextVersion,
    graph: {
      nodes: updatedNodes,
      edges: (graph.edges as unknown[]) ?? [],
    },
  })

  await FlowDefinitionModel.findByIdAndUpdate(flowId, {
    currentVersionId: newVersion._id,
  })

  return {
    flowId,
    nodeId,
    schemaId,
    publishId,
    flowVersionId: newVersion._id,
    flowVersion: nextVersion,
  }
}

/**
 * Core flow validation logic — shared between tool execution and agent output validation.
 */
export function validateFlowGraph(flow: FlowGraphInput): string[] {
  const errors: string[] = []
  const nodeIds = new Set(flow.nodes.map((n) => n.id))

  if (flow.nodes.length === 0) {
    errors.push('流程至少需要一个节点')
    return errors
  }

  const hasStart = flow.nodes.some((n) => (n.data as Record<string, unknown>)?.bpmnType === 'startEvent')
  const hasEnd = flow.nodes.some((n) => (n.data as Record<string, unknown>)?.bpmnType === 'endEvent')
  if (!hasStart) errors.push('缺少 startEvent 开始节点')
  if (!hasEnd) errors.push('缺少 endEvent 结束节点')

  for (const edge of flow.edges) {
    const source = edge.source as Record<string, unknown> | undefined
    const target = edge.target as Record<string, unknown> | undefined
    if (source?.cell && !nodeIds.has(source.cell)) errors.push(`边 ${edge.id} 的源节点 ${source.cell} 不存在`)
    if (target?.cell && !nodeIds.has(target.cell)) errors.push(`边 ${edge.id} 的目标节点 ${target.cell} 不存在`)
  }

  for (const node of flow.nodes) {
    const data = node.data as Record<string, unknown> | undefined
    if (data?.bpmnType === 'exclusiveGateway' && data.gatewayDirection === 'diverging') {
      const outEdges = flow.edges.filter((e) => {
        const source = e.source as Record<string, unknown> | undefined
        return source?.cell === node.id
      })
      if (outEdges.length >= 2) {
        const hasDefault = !!data.defaultFlow
        const allHaveConditions = outEdges.every((e) => {
          const edgeData = e.data as Record<string, unknown> | undefined
          return edgeData?.conditionExpression || edgeData?.isDefault
        })
        if (!hasDefault && !allHaveConditions) {
          errors.push(`排他网关 "${node.id}" 出边 >= 2 但缺少 defaultFlow 或条件表达式`)
        }
      }
    }

    if (data?.bpmnType === 'userTask') {
      const hasAssignee = data.candidateUsers || data.candidateRoles || data.assignee || data.assigneeCollection
      if (!hasAssignee) {
        errors.push(`用户任务 "${data.label || node.id}" 缺少指派人配置`)
      }
    }

    if (data?.bpmnType === 'timerEvent') {
      if (!data.timerType || !data.timerValue) {
        errors.push(`定时事件 "${data.label || node.id}" 缺少 timerType 或 timerValue`)
      }
    }
  }

  return errors
}
