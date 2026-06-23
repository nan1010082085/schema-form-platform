<script setup lang="ts">
import { computed, watch, nextTick } from 'vue'
import { VueFlow, useVueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import type { FlowGraph, FlowNodeData } from '@/types'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'
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
</script>

<template>
  <div :class="[$style.card, { [$style.compact]: compact }]">
    <!-- Header -->
    <div :class="$style.head">
      <div :class="$style.headLeft">
        <div :class="$style.headIcon">
          <AppIcon name="connection" :size="14" />
        </div>
        <span :class="$style.title">{{ title }}</span>
      </div>
      <div :class="$style.headRight">
        <span :class="$style.badge">{{ nodeCount }} 节点 / {{ edgeCount }} 连线</span>
        <el-button :class="$style.fitBtn" title="适配画布" text @click="handleFitView">
          <AppIcon name="full-screen" />
        </el-button>
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
      <el-button
        v-if="secondaryAction"
        :class="$style.btnGhost"
        @click="emit('secondary-action')"
      >
        <AppIcon name="edit" :size="12" />
        {{ secondaryAction }}
      </el-button>
      <el-button
        v-if="primaryAction"
        :class="$style.btnPrimary"
        type="primary"
        @click="emit('primary-action')"
      >
        <AppIcon name="check" :size="12" />
        {{ primaryAction }}
      </el-button>
    </div>
  </div>
</template>

<style module src="./FlowPreviewCard.module.scss" />
