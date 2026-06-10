<script setup lang="ts">
import { computed, watch, nextTick, ref } from 'vue'
import { VueFlow, useVueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import type { FlowGraph, FlowNodeData } from '@/types'
import {
  PreviewStartEvent,
  PreviewEndEvent,
  PreviewTask,
  PreviewGateway,
} from './flow-preview'

export interface FlowPreviewCardProps {
  title: string
  graph: FlowGraph
  /** primary action label */
  primaryAction?: string
  /** secondary action label */
  secondaryAction?: string
  /** compact mode for inline message cards */
  compact?: boolean
}

const props = withDefaults(defineProps<FlowPreviewCardProps>(), {
  primaryAction: '确认发布',
  secondaryAction: '在编辑器中打开',
  compact: false,
})

const emit = defineEmits<{
  'primary-action': []
  'secondary-action': []
  'node-click': [nodeId: string, nodeData: FlowNodeData]
}>()

// ---- BPMN type -> Vue Flow preview node type ----

const BPMN_TO_VF_TYPE: Record<string, string> = {
  startEvent: 'start-event',
  endEvent: 'end-event',
  userTask: 'task',
  serviceTask: 'task',
  scriptTask: 'task',
  sendTask: 'task',
  receiveTask: 'task',
  exclusiveGateway: 'gateway',
  parallelGateway: 'gateway',
  inclusiveGateway: 'gateway',
}

function resolveNodeType(bpmnType: string): string {
  return BPMN_TO_VF_TYPE[bpmnType] ?? 'task'
}

// ---- Vue Flow data ----

const instanceId = `flow-preview-card-${Math.random().toString(36).slice(2, 8)}`

const nodes = computed(() => {
  if (!props.graph?.nodes) return []
  return props.graph.nodes.map((n) => ({
    id: n.id,
    type: resolveNodeType(n.data.bpmnType),
    position: n.position ?? { x: 0, y: 0 },
    data: {
      label: n.data.label ?? n.id,
      bpmnType: n.data.bpmnType,
    },
    draggable: true,
  }))
})

const edges = computed(() => {
  if (!props.graph?.edges) return []
  return props.graph.edges.map((e) => ({
    id: e.id,
    source: e.source.cell,
    target: e.target.cell,
    label: e.data?.label as string | undefined,
    type: 'smoothstep' as const,
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: 'var(--ai-color-info, #4581e9)', strokeWidth: 1.5 },
  }))
})

const nodeCount = computed(() => nodes.value.length)
const edgeCount = computed(() => edges.value.length)

// ---- Vue Flow instance ----

const { onNodeClick, fitView } = useVueFlow({ id: instanceId })

onNodeClick(({ node }) => {
  emit('node-click', node.id, node.data as FlowNodeData)
})

// Auto fitView when graph data changes
watch(
  () => props.graph,
  async (graph) => {
    if (graph) {
      await nextTick()
      setTimeout(() => fitView({ padding: 0.2 }), 100)
    }
  },
  { deep: true },
)

function handleFitView() {
  fitView({ padding: 0.2 })
}

// ---- Node type labels ----

const NODE_TYPE_LABELS: Record<string, string> = {
  startEvent: '开始事件',
  endEvent: '结束事件',
  userTask: '用户任务',
  serviceTask: '服务任务',
  scriptTask: '脚本任务',
  sendTask: '发送任务',
  receiveTask: '接收任务',
  exclusiveGateway: '排他网关',
  parallelGateway: '并行网关',
  inclusiveGateway: '包含网关',
}

function getNodeTypeLabel(bpmnType: string): string {
  return NODE_TYPE_LABELS[bpmnType] ?? bpmnType
}
</script>

<template>
  <div :class="[$style.card, { [$style.compact]: compact }]">
    <!-- Header -->
    <div :class="$style.head">
      <div :class="$style.headLeft">
        <div :class="$style.headIcon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <span :class="$style.title">{{ title }}</span>
      </div>
      <div :class="$style.headRight">
        <span :class="$style.badge">{{ nodeCount }} 节点 / {{ edgeCount }} 连线</span>
        <button :class="$style.fitBtn" title="适配画布" @click="handleFitView">
          &#x26F6;
        </button>
      </div>
    </div>

    <!-- Vue Flow canvas -->
    <div :class="$style.canvasWrapper">
      <VueFlow
        :id="instanceId"
        :nodes="nodes"
        :edges="edges"
        :nodes-draggable="true"
        :nodes-connectable="false"
        :edges-updatable="false"
        :elements-selectable="true"
        :default-viewport="{ zoom: 0.8, x: 0, y: 0 }"
        :min-zoom="0.2"
        :max-zoom="2"
        fit-view-on-init
      >
        <template #node-start-event="nodeProps">
          <PreviewStartEvent v-bind="nodeProps" />
        </template>
        <template #node-end-event="nodeProps">
          <PreviewEndEvent v-bind="nodeProps" />
        </template>
        <template #node-task="nodeProps">
          <PreviewTask v-bind="nodeProps" />
        </template>
        <template #node-gateway="nodeProps">
          <PreviewGateway v-bind="nodeProps" />
        </template>

        <Background :gap="16" :size="0.6" color="#e0e5ec" />
        <Controls :show-interactive="false" />
      </VueFlow>
    </div>

    <!-- Actions -->
    <div v-if="primaryAction || secondaryAction" :class="$style.actions">
      <button
        v-if="secondaryAction"
        :class="$style.btnGhost"
        @click="emit('secondary-action')"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        {{ secondaryAction }}
      </button>
      <button
        v-if="primaryAction"
        :class="$style.btnPrimary"
        @click="emit('primary-action')"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {{ primaryAction }}
      </button>
    </div>
  </div>
</template>

<style module src="./FlowPreviewCard.module.css" />
