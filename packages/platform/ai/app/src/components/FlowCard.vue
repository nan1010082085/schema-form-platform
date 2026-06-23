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
      <div :class="$style.headLeft">
        <div :class="$style.headIcon">
          <AppIcon name="connection" :size="14" />
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
          <AppIcon v-if="node.type === 'start'" name="video-play" :class="$style.nodeIcon" :size="16" />
          <!-- Task icon -->
          <AppIcon v-else-if="node.type === 'task'" name="document" :class="$style.nodeIcon" :size="16" />
          <!-- End icon -->
          <AppIcon v-else-if="node.type === 'end'" name="circle-close" :class="$style.nodeIcon" :size="16" />
          <span>{{ node.label }}</span>
        </div>
      </template>
    </div>
    <div v-if="!compact && (primaryAction || secondaryAction)" :class="$style.actions">
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

<style module src="./FlowCard.module.scss" />
