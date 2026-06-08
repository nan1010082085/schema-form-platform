/**
 * Flow Agent tools — LangGraph StructuredTool format.
 *
 * Provides flow search, user/role lookup, schema binding, schema generation,
 * and validation capabilities for the Flow Agent to query real data during generation.
 */

import { tool } from '@langchain/core/tools'
import { interrupt } from '@langchain/langgraph'
import { FlowDefinitionModel } from '../../flow-models/FlowDefinition.js'
import { FlowVersionModel } from '../../flow-models/FlowVersion.js'
import { FormSchemaModel } from '../../models/FormSchema.js'
import { UserModel } from '../../models/User.js'
import { escapeRegex } from '../graph/agentBase.js'
import { generateSchemaFromPrompt } from './schemaGenerator.js'
import { searchFlows as searchFlowsService, getFlowDetail as getFlowDetailService, searchUsers as searchUsersService, validateFlowGraph as validateFlowGraphService } from '../services/flowService.js'
import { z } from 'zod'
import type { ToolResult } from './types.js'

// ────────────────────────────────────────────
// LangGraph tools
// ────────────────────────────────────────────

export const searchFlowsTool = tool(
  async ({ keyword, status, category, limit }): Promise<string> => {
    const result = await searchFlowsService({ keyword, status, category, limit })
    return JSON.stringify(result satisfies ToolResult)
  },
  {
    name: 'search_flows',
    description: `搜索已有的流程定义。可查找现有流程作为参考或查找需要修改的流程。

参数：keyword — 按名称/描述模糊搜索；status — 按状态筛选（draft/published/archived）；category — 按分类筛选；limit — 返回数量上限，默认 10。
返回 JSON 包含 total 数量和 flows 数组（含 id、name、description、category、status 等）。`,
    schema: z.object({
      keyword: z.string().optional().describe('按名称/描述模糊搜索'),
      status: z.enum(['draft', 'published', 'archived']).optional().describe('按状态筛选'),
      category: z.string().optional().describe('按分类筛选'),
      limit: z.number().optional().default(10).describe('返回数量上限，默认 10'),
    }),
  },
)

export const getFlowDetailTool = tool(
  async ({ flowId }): Promise<string> => {
    const result = await getFlowDetailService(flowId)
    return JSON.stringify(result satisfies ToolResult)
  },
  {
    name: 'get_flow_detail',
    description: `获取流程定义详情，包括当前版本的完整 FlowGraph（节点和边）。用于深入了解现有流程结构。

参数：flowId — 流程定义的 _id。
返回 JSON 包含流程完整信息：id、name、description、category、status、graph（含 nodes 和 edges 数组）。`,
    schema: z.object({
      flowId: z.string().describe('流程定义的 _id'),
    }),
  },
)

export const searchUsersTool = tool(
  async ({ keyword, role, limit }): Promise<string> => {
    const result = await searchUsersService({ keyword, role, limit })
    return JSON.stringify(result satisfies ToolResult)
  },
  {
    name: 'search_users',
    description: `搜索用户列表，用于设置审批节点的指派人（assignee/candidateUsers）。返回用户的 ID、姓名和角色。

参数：keyword — 按用户名/显示名模糊搜索；role — 按角色 ID 筛选；limit — 返回数量上限，默认 20。
返回 JSON 包含 users 数组，每项含 id、username、displayName、roles。`,
    schema: z.object({
      keyword: z.string().optional().describe('按用户名/显示名模糊搜索'),
      role: z.string().optional().describe('按角色 ID 筛选'),
      limit: z.number().optional().default(20).describe('返回数量上限，默认 20'),
    }),
  },
)

export const generateSchemaTool = tool(
  async ({ description }): Promise<string> => {
    try {
      const generated = await generateSchemaFromPrompt(description)
      const result: ToolResult = {
        success: true,
        data: {
          schemaId: generated.tempId,
          widgets: generated.widgets,
          summary: generated.summary,
        },
      }
      return JSON.stringify(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return JSON.stringify({ success: false, error: `Schema 生成失败: ${message}` } satisfies ToolResult)
    }
  },
  {
    name: 'generate_schema',
    description: `调用 Editor Agent 生成一个表单 Schema。用于为 userTask 创建关联的表单。

参数：description — 表单的自然语言描述，如"采购申请表单，包含物品名称、数量、金额、申请人"。
返回 JSON 包含 schemaId（临时 ID）、widgets（Widget 数组）、summary（生成摘要）。`,
    schema: z.object({
      description: z.string().describe('表单的自然语言描述，如"采购申请表单，包含物品名称、数量、金额、申请人"'),
    }),
  },
)

export const validateFlowTool = tool(
  async ({ flow }): Promise<string> => {
    const result = validateFlowGraphService(flow as { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] })
    const summary = result.valid
      ? `流程校验通过，${flow.nodes.length} 个节点、${flow.edges.length} 条边`
      : `流程校验失败，${result.errors.length} 个错误：${result.errors.slice(0, 3).join('；')}${result.errors.length > 3 ? '等' : ''}`
    return JSON.stringify({ success: true, data: { valid: result.valid, errors: result.errors }, summary } satisfies ToolResult)
  },
  {
    name: 'validate_flow',
    description: `校验 FlowGraph 的结构正确性。检查 startEvent/endEvent 存在性、边引用合法性、userTask 指派人配置、排他网关条件等。在生成流程后调用此工具确认无误再返回给用户。

参数：flow — 包含 nodes 和 edges 数组的 FlowGraph 对象。
返回 JSON 包含 valid 布尔值和 errors 错误列表。`,
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
  async ({ widgets, schemaName, flowId, nodeId }): Promise<string> => {
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

    const result: ToolResult = {
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
    return JSON.stringify(result)
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
  async ({ flowId, nodeId, schemaId }): Promise<string> => {
    // 查找 Schema 获取 publishId 和 version
    const schema = await FormSchemaModel.findById(schemaId)
      .select('_id editId name version')
      .lean() as Record<string, unknown> | null

    if (!schema) {
      return JSON.stringify({ success: false, error: `Schema ${schemaId} not found` } satisfies ToolResult)
    }

    const { PublishedSchemaModel } = await import('../../models/PublishedSchema.js')
    const published = await PublishedSchemaModel.findOne({ sourceId: schema.editId })
      .sort({ publishedAt: -1 })
      .select('publishId version')
      .lean() as Record<string, unknown> | null

    const publishId = (published?.publishId as string) ?? ''
    const version = (published?.version as string) ?? (schema.version as string) ?? ''

    const binding = await bindSchemaToFlowNode(flowId, nodeId, schemaId, publishId, version)

    const result: ToolResult = {
      success: true,
      data: {
        ...binding,
        schemaName: schema.name,
      },
      summary: `已将 Schema "${schema.name}" 绑定到流程节点 ${nodeId}`,
    }
    return JSON.stringify(result)
  },
  {
    name: 'bind_schema_to_flow_node',
    description: `将已有 Schema 绑定到流程的 userTask 节点。更新 FlowVersion 中该节点的 formSchemaId、formPublishId、formVersion 字段。

参数：flowId — 流程定义 ID；nodeId — 要绑定的节点 ID；schemaId — Schema ID。
返回 JSON 包含绑定结果：flowId、nodeId、schemaId、publishId、flowVersionId、schemaName。`,
    schema: z.object({
      flowId: z.string().describe('流程定义 ID（FlowDefinition._id）'),
      nodeId: z.string().describe('要绑定的节点 ID'),
      schemaId: z.string().describe('要绑定的 Schema ID（FormSchema._id）'),
    }),
  },
)

export const getFlowNodeSchemaTool = tool(
  async ({ flowId, nodeId }): Promise<string> => {
    const version = await FlowVersionModel.findOne({ definitionId: flowId })
      .sort({ version: -1 })
      .lean() as Record<string, unknown> | null

    if (!version?.graph) {
      return JSON.stringify({ success: false, error: `Flow ${flowId} has no version` } satisfies ToolResult)
    }

    const nodes = ((version.graph as Record<string, unknown>).nodes ?? []) as Array<Record<string, unknown>>
    const node = nodes.find((n) => n.id === nodeId)

    if (!node) {
      return JSON.stringify({ success: false, error: `Node ${nodeId} not found in flow ${flowId}` } satisfies ToolResult)
    }

    const data = node.data as Record<string, unknown> | undefined
    const formSchemaId = data?.formSchemaId as string | undefined

    if (!formSchemaId) {
      return JSON.stringify({
        success: true,
        data: { nodeId, hasSchema: false },
        summary: `节点 ${nodeId} 未绑定表单`,
      } satisfies ToolResult)
    }

    // 获取绑定的 Schema 详情
    const schema = await FormSchemaModel.findById(formSchemaId)
      .select('_id name type version json')
      .lean() as Record<string, unknown> | null

    const result: ToolResult = {
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
    return JSON.stringify(result)
  },
  {
    name: 'get_flow_node_schema',
    description: `获取流程节点绑定的表单 Schema 信息。用于查看某个 userTask 节点当前引用了哪个表单。

参数：flowId — 流程定义 ID；nodeId — 节点 ID。
返回 JSON 包含 hasSchema、formSchemaId、formPublishId、formVersion、schemaName、widgetCount 等。`,
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
  async ({ flow, flowId, description }): Promise<string> => {
    const flowGraph = flow as { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }

    // 1. Validate
    const errors = validateFlowGraph(flowGraph)
    if (errors.length > 0) {
      return JSON.stringify({
        success: false,
        error: `流程校验失败，${errors.length} 个错误：${errors.slice(0, 3).join('；')}`,
      } satisfies ToolResult)
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

    // 3. Human-in-the-Loop: confirm before write operation
    const diffSummary = diff
      ? `变更：节点 +${diff.nodesAdded} -${diff.nodesRemoved} ~${diff.nodesModified}，连线 +${diff.edgesAdded} -${diff.edgesRemoved} ~${diff.edgesModified}`
      : `流程包含 ${flowGraph.nodes.length} 个节点、${flowGraph.edges.length} 条边`

    const confirmed = interrupt({
      type: 'flow_update',
      message: `确认更新流程？${diffSummary}`,
      data: {
        flowId,
        description,
        diff: diff ? {
          nodesAdded: diff.nodesAdded,
          nodesRemoved: diff.nodesRemoved,
          nodesModified: diff.nodesModified,
          edgesAdded: diff.edgesAdded,
          edgesRemoved: diff.edgesRemoved,
          edgesModified: diff.edgesModified,
          changes: diff.changes.slice(0, 10),
        } : null,
        nodeCount: flowGraph.nodes.length,
        edgeCount: flowGraph.edges.length,
      },
    })

    if (!confirmed) {
      return JSON.stringify({
        success: false,
        error: '用户取消操作',
      } satisfies ToolResult)
    }

    // 4. Save as new version
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

    const result: ToolResult = {
      success: true,
      data: {
        flow: flowGraph,
        flowId,
        diff,
        description,
      },
      summary: diffSummary,
    }
    return JSON.stringify(result)
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

// validateFlowGraph 已迁移到 services/flowService.ts，此处保留导出兼容
export { validateFlowGraph } from '../services/flowService.js'
