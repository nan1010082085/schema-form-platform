<template>
  <div :class="[styles.wrapper, { [styles.selected]: selected }]">
    <Handle type="target" :position="Position.Top" :class="styles.handle" />
    <div :class="styles.diamond">
      <div :class="styles.inner">
        <span :class="styles.expression">{{ expression }}</span>
      </div>
    </div>
    <Handle type="source" :position="Position.Bottom" :class="styles.handle" />
    <Handle type="source" :position="Position.Left" :class="styles.handle" id="left" />
    <Handle type="source" :position="Position.Right" :class="styles.handle" id="right" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import styles from './ConditionNode.module.scss'

export interface ConditionNodeData {
  name?: string
  condition?: string
  [key: string]: unknown
}

const props = defineProps<{
  id: string
  data?: ConditionNodeData
  selected?: boolean
}>()

const expression = computed(() => {
  const expr = props.data?.condition ?? ''
  return expr.length > 16 ? expr.slice(0, 16) + '...' : expr || '条件'
})
</script>
