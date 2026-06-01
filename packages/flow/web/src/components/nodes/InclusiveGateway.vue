<template>
  <div :class="[styles.wrapper, { [styles.selected]: props.selected }]">
    <Handle type="target" :position="Position.Top" :class="styles.handle" />
    <div :class="styles.diamond">
      <span :class="styles.symbol">○</span>
    </div>
    <Handle type="source" :position="Position.Bottom" :class="styles.handle" />
    <Handle type="source" :position="Position.Left" :class="styles.handle" id="left" />
    <Handle type="source" :position="Position.Right" :class="styles.handle" id="right" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import styles from './InclusiveGateway.module.scss'

const props = defineProps<{
  id: string
  data?: { label?: string; [key: string]: unknown }
  selected?: boolean
}>()
</script>
