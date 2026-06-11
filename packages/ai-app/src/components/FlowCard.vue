<script setup lang="ts">
import { ElButton } from 'element-plus'

export interface FlowNode {
  label: string
  type: 'start' | 'task' | 'end'
}

export interface FlowCardProps {
  title: string
  nodes: FlowNode[]
  /** primary action label, e.g. "应用到画布" */
  primaryAction?: string
  /** secondary action label, e.g. "修改" */
  secondaryAction?: string
  /** compact mode for inline message cards */
  compact?: boolean
}

defineProps<FlowCardProps>()

const emit = defineEmits<{
  'primary-action': []
  'secondary-action': []
}>()
</script>

<template>
  <div :class="[$style.card, { [$style.compact]: compact }]">
    <div :class="$style.head">
      <div :class="$style.headLeft">
        <div :class="$style.headIcon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <span :class="$style.title">{{ title }}</span>
      </div>
      <span :class="$style.badge">{{ nodes.length }} 个节点</span>
    </div>
    <div :class="$style.flowBody">
      <template v-for="(node, idx) in nodes" :key="idx">
        <div v-if="idx > 0" :class="$style.arrow">
          <div :class="$style.arrowLine" />
        </div>
        <div :class="[$style.node, $style[node.type]]">
          <!-- Start icon -->
          <svg v-if="node.type === 'start'" :class="$style.nodeIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10 8 16 12 10 16 10 8" />
          </svg>
          <!-- Task icon -->
          <svg v-else-if="node.type === 'task'" :class="$style.nodeIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
          <!-- End icon -->
          <svg v-else-if="node.type === 'end'" :class="$style.nodeIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="16 12 12 12 12 8" />
            <line x1="12" y1="16" x2="12" y2="12" />
          </svg>
          <span>{{ node.label }}</span>
        </div>
      </template>
    </div>
    <div v-if="!compact && (primaryAction || secondaryAction)" :class="$style.actions">
      <ElButton
        v-if="secondaryAction"
        :class="$style.btnGhost"
        @click="emit('secondary-action')"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        {{ secondaryAction }}
      </ElButton>
      <ElButton
        v-if="primaryAction"
        :class="$style.btnPrimary"
        type="primary"
        @click="emit('primary-action')"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {{ primaryAction }}
      </ElButton>
    </div>
  </div>
</template>

<style module src="./FlowCard.module.css" />
