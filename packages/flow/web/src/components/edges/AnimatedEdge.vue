<script setup lang="ts">
import { computed } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@vue-flow/core'
import styles from './AnimatedEdge.module.scss'

const props = defineProps<EdgeProps>()

const isAnimated = computed(() => props.data?.animated !== false)

const path = computed(() => {
  return getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  })
})

const labelX = computed(() => path.value[1])
const labelY = computed(() => path.value[2])
</script>

<template>
  <BaseEdge
    :id="id"
    :path="path[0]"
    :marker-end="markerEnd"
    :class="isAnimated ? styles.edgeAnimated : styles.edgeStatic"
    :style="{ ...style, strokeWidth: 2 }"
  />
  <EdgeLabelRenderer v-if="data?.conditionExpression || data?.isDefault">
    <div
      :class="styles.label"
      :style="{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        pointerEvents: 'all',
      }"
    >
      <span v-if="data?.isDefault" :class="styles.defaultTag">默认</span>
      <span v-else :class="styles.conditionText">{{ data?.conditionExpression }}</span>
    </div>
  </EdgeLabelRenderer>
</template>
