/**
 * useVariableDefinitions — composable that extracts variable tree from flow definition.
 *
 * Builds a grouped variable tree from three sources:
 * 1. Environment variables (flow-level global variables)
 * 2. Form fields (from nodes that bind a form schema)
 * 3. Upstream node outputs (nodes that produce result variables)
 *
 * Returns a tree structure consumable by VariableSelector.
 */

import { computed, type Ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import type { BpmnNodeConfig } from '@schema-form/flow-shared'

export type VariableSource = 'env' | 'form' | 'node'

export interface VariableLeaf {
  key: string
  label: string
  /** Full expression path, e.g. "nodeId.fieldName" */
  path: string
  source: VariableSource
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array'
}

export interface VariableGroup {
  source: VariableSource
  label: string
  children: VariableLeaf[]
}

/**
 * Known environment variables for flow-level context.
 */
const ENV_VARIABLES: VariableLeaf[] = [
  { key: 'flowId', label: '流程 ID', path: 'env.flowId', source: 'env', type: 'string' },
  { key: 'flowName', label: '流程名称', path: 'env.flowName', source: 'env', type: 'string' },
  { key: 'initiator', label: '发起人 ID', path: 'env.initiator', source: 'env', type: 'string' },
  { key: 'initiatorName', label: '发起人姓名', path: 'env.initiatorName', source: 'env', type: 'string' },
  { key: 'startTime', label: '流程启动时间', path: 'env.startTime', source: 'env', type: 'string' },
]

/**
 * Extract form field names from a widget tree (editor Schema format).
 * Walks the tree looking for `field` properties on widgets.
 */
function extractFormFields(widgets: Array<Record<string, unknown>>): string[] {
  const fields: string[] = []
  for (const w of widgets) {
    if (typeof w.field === 'string' && w.field) {
      fields.push(w.field)
    }
    if (Array.isArray(w.children)) {
      fields.push(...extractFormFields(w.children as Array<Record<string, unknown>>))
    }
  }
  return fields
}

/**
 * Build upstream node output variables.
 * For nodes with formVariable (UserTask), produce field-level references.
 * For nodes with resultVariable (ServiceTask/ScriptTask), produce a single result ref.
 */
function buildNodeVariables(
  nodes: Node[],
  edges: Edge[],
  currentNodeId: string,
): VariableLeaf[] {
  const vars: VariableLeaf[] = []

  // Find all upstream nodes via BFS on edges
  const upstreamIds = new Set<string>()
  const queue: string[] = []

  // Get direct predecessors
  for (const edge of edges) {
    if (edge.target === currentNodeId) {
      queue.push(edge.source)
    }
  }

  // BFS to find all ancestors
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

  for (const node of nodes) {
    if (!upstreamIds.has(node.id)) continue
    const data = node.data as BpmnNodeConfig | undefined
    if (!data) continue

    const label = (data.label as string) || node.id

    // UserTask with formVariable → exposes form fields
    if (data.formVariable && data.formSchemaId) {
      // We don't have the actual form schema tree here at runtime,
      // but we know the variable name. Provide it as a single object reference.
      vars.push({
        key: data.formVariable,
        label: `${label} 表单数据`,
        path: `${node.id}.${data.formVariable}`,
        source: 'node',
        type: 'object',
      })
    }

    // Any task with resultVariable
    if (data.resultVariable) {
      vars.push({
        key: data.resultVariable,
        label: `${label} 输出`,
        path: `${node.id}.${data.resultVariable}`,
        source: 'node',
        type: 'object',
      })
    }

    // ServiceTask with apiConfig.dataPath → output reference
    if (data.apiConfig?.dataPath) {
      vars.push({
        key: `${node.id}_result`,
        label: `${label} API 结果`,
        path: `${node.id}._result`,
        source: 'node',
        type: 'object',
      })
    }

    // Generic node output (all task nodes can produce variables via nodeId)
    if (!data.formVariable && !data.resultVariable && !data.apiConfig?.dataPath) {
      // Only include if it's a task type (not gateways/events)
      const taskTypes = ['user-task', 'service-task', 'script-task', 'send-task', 'receive-task']
      if (taskTypes.includes(node.type ?? '')) {
        vars.push({
          key: node.id,
          label: `${label} 数据`,
          path: `${node.id}._data`,
          source: 'node',
          type: 'object',
        })
      }
    }
  }

  return vars
}

/**
 * Build form field variables from the current node's bound form.
 * Requires the form schema widget tree to be loaded.
 */
function buildFormVariables(
  currentNodeData: BpmnNodeConfig | undefined,
  formWidgetTree?: Array<Record<string, unknown>>,
): VariableLeaf[] {
  if (!currentNodeData?.formSchemaId || !formWidgetTree) return []

  const fields = extractFormFields(formWidgetTree)
  return fields.map((field) => ({
    key: field,
    label: field,
    path: `form.${field}`,
    source: 'form' as VariableSource,
    type: 'string' as const,
  }))
}

export function useVariableDefinitions(
  nodes: Ref<Node[]>,
  edges: Ref<Edge[]>,
  currentNodeId: Ref<string>,
  formWidgetTree?: Ref<Array<Record<string, unknown>> | undefined>,
) {
  const envVariables = computed<VariableGroup>(() => ({
    source: 'env',
    label: '环境变量',
    children: ENV_VARIABLES,
  }))

  const nodeVariables = computed<VariableGroup>(() => {
    const children = buildNodeVariables(
      nodes.value,
      edges.value,
      currentNodeId.value,
    )
    return {
      source: 'node',
      label: '上游节点输出',
      children,
    }
  })

  const formVariables = computed<VariableGroup>(() => {
    const currentNode = nodes.value.find((n) => n.id === currentNodeId.value)
    const data = currentNode?.data as BpmnNodeConfig | undefined
    const children = buildFormVariables(data, formWidgetTree?.value)
    return {
      source: 'form',
      label: '表单字段',
      children,
    }
  })

  const variableTree = computed<VariableGroup[]>(() => {
    const groups: VariableGroup[] = []
    groups.push(envVariables.value)
    if (formVariables.value.children.length > 0) {
      groups.push(formVariables.value)
    }
    if (nodeVariables.value.children.length > 0) {
      groups.push(nodeVariables.value)
    }
    return groups
  })

  const allVariables = computed<VariableLeaf[]>(() =>
    variableTree.value.flatMap((g) => g.children),
  )

  return {
    variableTree,
    allVariables,
    envVariables,
    nodeVariables,
    formVariables,
  }
}
