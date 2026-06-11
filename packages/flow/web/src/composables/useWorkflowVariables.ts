/**
 * useWorkflowVariables — Workflow 变量提取与分组
 *
 * 从 Workflow 节点图中提取变量，按节点类型分组：
 * 1. 触发器 (startEvent) — 流程启动参数
 * 2. Editor 输出 — 用户任务表单数据
 * 3. Flow 输出 — 服务任务/脚本任务结果
 * 4. AI 输出 — AI 节点生成内容
 * 5. 系统 — 环境变量 (flowId, initiator 等)
 *
 * 支持变量引用解析：{{nodeId.field}} 语法
 */

import { computed, type Ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import type { BpmnNodeConfig } from '@schema-form/flow-shared'
import { BpmnElementType } from '@schema-form/flow-shared'

export type WorkflowVariableSource = 'trigger' | 'editor' | 'flow' | 'ai' | 'system'

export interface WorkflowVariableLeaf {
  key: string
  label: string
  /** Full expression path, e.g. "nodeId.fieldName" */
  path: string
  source: WorkflowVariableSource
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array'
  nodeId?: string
  icon?: string
}

export interface WorkflowVariableGroup {
  source: WorkflowVariableSource
  label: string
  icon: string
  children: WorkflowVariableLeaf[]
}

/** Source display config */
const SOURCE_CONFIG: Record<WorkflowVariableSource, { label: string; icon: string; color: string }> = {
  trigger: { label: '触发器', icon: '⚡', color: 'var(--node-accent-trigger, #f59e0b)' },
  editor: { label: 'Editor 输出', icon: '📝', color: 'var(--node-accent-editor, #10b981)' },
  flow: { label: 'Flow 输出', icon: '🔄', color: 'var(--node-accent-flow, #6366f1)' },
  ai: { label: 'AI 输出', icon: '🤖', color: 'var(--node-accent-ai, #8b5cf6)' },
  system: { label: '系统', icon: '⚙️', color: 'var(--node-accent-system, #64748b)' },
}

/** System variables (always available) */
const SYSTEM_VARIABLES: WorkflowVariableLeaf[] = [
  { key: 'flowId', label: '流程 ID', path: 'system.flowId', source: 'system', type: 'string' },
  { key: 'flowName', label: '流程名称', path: 'system.flowName', source: 'system', type: 'string' },
  { key: 'initiator', label: '发起人 ID', path: 'system.initiator', source: 'system', type: 'string' },
  { key: 'initiatorName', label: '发起人姓名', path: 'system.initiatorName', source: 'system', type: 'string' },
  { key: 'startTime', label: '启动时间', path: 'system.startTime', source: 'system', type: 'string' },
  { key: 'currentTime', label: '当前时间', path: 'system.currentTime', source: 'system', type: 'string' },
]

/** Classify node output source */
function classifyNodeSource(nodeType: string | undefined, data: BpmnNodeConfig): WorkflowVariableSource {
  // AI 节点：通过 serviceType 或特定标识判断
  if (data.serviceType === 'ai' || nodeType?.includes('ai')) {
    return 'ai'
  }

  switch (nodeType) {
    case 'start-event':
    case 'timer-event':
    case 'message-event':
      return 'trigger'

    case 'user-task':
      return 'editor'

    case 'service-task':
    case 'script-task':
    case 'send-task':
    case 'receive-task':
    case 'business-rule-task':
      return 'flow'

    default:
      return 'flow'
  }
}

/** Extract upstream node IDs via BFS */
function findUpstreamNodeIds(edges: Edge[], currentNodeId: string): Set<string> {
  const upstreamIds = new Set<string>()
  const queue: string[] = []

  for (const edge of edges) {
    if (edge.target === currentNodeId) {
      queue.push(edge.source)
    }
  }

  while (queue.length > 0) {
    const id = queue.shift()!
    if (upstreamIds.has(id)) continue
    upstreamIds.add(id)
    for (const edge of edges) {
      if (edge.target === id) {
        queue.push(edge.source)
      }
    }
  }

  return upstreamIds
}

/** Build variables from a single node */
function buildNodeVariables(node: Node, data: BpmnNodeConfig): WorkflowVariableLeaf[] {
  const vars: WorkflowVariableLeaf[] = []
  const label = data.label || node.id
  const source = classifyNodeSource(node.type, data)

  // UserTask with formVariable → exposes form fields
  if (data.formVariable && data.formSchemaId) {
    vars.push({
      key: data.formVariable,
      label: `${label} 表单数据`,
      path: `${node.id}.${data.formVariable}`,
      source,
      type: 'object',
      nodeId: node.id,
    })
  }

  // Any task with resultVariable
  if (data.resultVariable) {
    vars.push({
      key: data.resultVariable,
      label: `${label} 输出`,
      path: `${node.id}.${data.resultVariable}`,
      source,
      type: 'object',
      nodeId: node.id,
    })
  }

  // ServiceTask with apiConfig.dataPath
  if (data.apiConfig?.dataPath) {
    vars.push({
      key: `${node.id}_result`,
      label: `${label} API 结果`,
      path: `${node.id}._result`,
      source,
      type: 'object',
      nodeId: node.id,
    })
  }

  // Generic task node output
  if (!data.formVariable && !data.resultVariable && !data.apiConfig?.dataPath) {
    const taskTypes = [
      'user-task', 'service-task', 'script-task', 'send-task',
      'receive-task', 'business-rule-task',
    ]
    if (taskTypes.includes(node.type ?? '')) {
      vars.push({
        key: node.id,
        label: `${label} 数据`,
        path: `${node.id}._data`,
        source,
        type: 'object',
        nodeId: node.id,
      })
    }
  }

  return vars
}

/**
 * Build all upstream node variables grouped by source
 */
function buildUpstreamVariables(
  nodes: Node[],
  edges: Edge[],
  currentNodeId: string,
): WorkflowVariableLeaf[] {
  const upstreamIds = findUpstreamNodeIds(edges, currentNodeId)
  const vars: WorkflowVariableLeaf[] = []

  for (const node of nodes) {
    if (!upstreamIds.has(node.id)) continue
    const data = node.data as BpmnNodeConfig | undefined
    if (!data) continue
    vars.push(...buildNodeVariables(node, data))
  }

  return vars
}

export function useWorkflowVariables(
  nodes: Ref<Node[]>,
  edges: Ref<Edge[]>,
  currentNodeId: Ref<string>,
) {
  /** All upstream variables */
  const upstreamVariables = computed(() =>
    buildUpstreamVariables(nodes.value, edges.value, currentNodeId.value),
  )

  /** Trigger variables (startEvent outputs) */
  const triggerVariables = computed<WorkflowVariableGroup>(() => {
    const children = upstreamVariables.value.filter(v => v.source === 'trigger')
    return {
      source: 'trigger',
      label: SOURCE_CONFIG.trigger.label,
      icon: SOURCE_CONFIG.trigger.icon,
      children,
    }
  })

  /** Editor variables (userTask outputs) */
  const editorVariables = computed<WorkflowVariableGroup>(() => {
    const children = upstreamVariables.value.filter(v => v.source === 'editor')
    return {
      source: 'editor',
      label: SOURCE_CONFIG.editor.label,
      icon: SOURCE_CONFIG.editor.icon,
      children,
    }
  })

  /** Flow variables (serviceTask/scriptTask outputs) */
  const flowVariables = computed<WorkflowVariableGroup>(() => {
    const children = upstreamVariables.value.filter(v => v.source === 'flow')
    return {
      source: 'flow',
      label: SOURCE_CONFIG.flow.label,
      icon: SOURCE_CONFIG.flow.icon,
      children,
    }
  })

  /** AI variables (AI node outputs) */
  const aiVariables = computed<WorkflowVariableGroup>(() => {
    const children = upstreamVariables.value.filter(v => v.source === 'ai')
    return {
      source: 'ai',
      label: SOURCE_CONFIG.ai.label,
      icon: SOURCE_CONFIG.ai.icon,
      children,
    }
  })

  /** System variables */
  const systemVariables = computed<WorkflowVariableGroup>(() => ({
    source: 'system',
    label: SOURCE_CONFIG.system.label,
    icon: SOURCE_CONFIG.system.icon,
    children: SYSTEM_VARIABLES,
  }))

  /** Complete variable tree grouped by source */
  const workflowVariableTree = computed<WorkflowVariableGroup[]>(() => {
    const groups: WorkflowVariableGroup[] = []

    // Order: trigger → editor → flow → ai → system
    if (triggerVariables.value.children.length > 0) {
      groups.push(triggerVariables.value)
    }
    if (editorVariables.value.children.length > 0) {
      groups.push(editorVariables.value)
    }
    if (flowVariables.value.children.length > 0) {
      groups.push(flowVariables.value)
    }
    if (aiVariables.value.children.length > 0) {
      groups.push(aiVariables.value)
    }
    groups.push(systemVariables.value)

    return groups
  })

  /** Flat list of all variables */
  const allWorkflowVariables = computed(() =>
    workflowVariableTree.value.flatMap(g => g.children),
  )

  /**
   * Parse variable reference string (e.g. "{{nodeId.field}}") into variable info
   */
  function parseVariableRef(ref: string): { nodeId: string; field: string } | null {
    const match = ref.match(/^\{\{(\w+)\.(\w+)\}\}$/)
    if (!match) return null
    return { nodeId: match[1], field: match[2] }
  }

  /**
   * Resolve variable path to human-readable label
   */
  function resolveVariableLabel(path: string): string {
    const parsed = parseVariableRef(`{{${path}}}`)
    if (!parsed) return path

    const variable = allWorkflowVariables.value.find(v => v.path === path)
    return variable?.label || parsed.field
  }

  /**
   * Get source config for display
   */
  function getSourceConfig(source: WorkflowVariableSource) {
    return SOURCE_CONFIG[source]
  }

  return {
    workflowVariableTree,
    allWorkflowVariables,
    triggerVariables,
    editorVariables,
    flowVariables,
    aiVariables,
    systemVariables,
    parseVariableRef,
    resolveVariableLabel,
    getSourceConfig,
  }
}
