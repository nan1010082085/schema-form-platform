<script setup lang="ts">
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
      <span :class="$style.title">{{ title }}</span>
      <span :class="$style.badge">{{ nodes.length }} nodes</span>
    </div>
    <div :class="$style.flowBody">
      <template v-for="(node, idx) in nodes" :key="idx">
        <span v-if="idx > 0" :class="$style.arrow">&rarr;</span>
        <span :class="[$style.node, $style[node.type]]">{{ node.label }}</span>
      </template>
    </div>
    <div v-if="primaryAction || secondaryAction" :class="$style.actions">
      <button
        v-if="primaryAction"
        :class="$style.btnPrimary"
        @click="emit('primary-action')"
      >
        {{ primaryAction }}
      </button>
      <button
        v-if="secondaryAction"
        :class="$style.btnGhost"
        @click="emit('secondary-action')"
      >
        {{ secondaryAction }}
      </button>
    </div>
  </div>
</template>

<style module src="./FlowCard.module.css" />
