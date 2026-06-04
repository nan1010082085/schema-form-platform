<template>
  <div :class="[styles.wrapper, { [styles.selected]: props.selected }]">
    <Handle type="target" :position="Position.Top" :class="styles.handle" />
    <div :class="styles.diamond">
      <span :class="styles.symbol">X</span>
    </div>
    <Handle type="source" :position="Position.Bottom" :class="styles.handle" />
    <Handle type="source" :position="Position.Left" :class="styles.handle" id="left" />
    <Handle type="source" :position="Position.Right" :class="styles.handle" id="right" />

    <!-- Condition tags -->
    <div v-if="conditionEdges.length > 0" :class="styles.conditions">
      <div
        v-for="edge in conditionEdges"
        :key="edge.id"
        :class="[styles.condTag, { [styles.condDefault]: edge.data?.isDefault }]"
        :title="edge.data?.conditionExpression ?? '默认分支'"
      >
        <span v-if="edge.data?.isDefault" :class="styles.condLabel">默认</span>
        <span v-else :class="styles.condLabel">{{ truncate(edge.data?.conditionExpression ?? edge.label ?? '', 12) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useFlowGraphStore } from '@/stores/flowGraph.js'
import styles from './ExclusiveGateway.module.scss'

const props = defineProps<{
  id: string
  data?: { label?: string; [key: string]: unknown }
  selected?: boolean
}>()

const graphStore = useFlowGraphStore()

const conditionEdges = computed(() =>
  graphStore.edges.filter((e) => e.source === props.id),
)

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '...' : text
}
</script>
