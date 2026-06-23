<template>
  <div :class="[styles.node, { [styles.selected]: props.selected }]">
    <Handle type="target" :position="Position.Top" :class="styles.handle" />
    <AppIcon name="bell" :class="styles.icon" :size="20" />
    <Handle type="source" :position="Position.Bottom" :class="styles.handle" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import styles from './SignalEvent.module.scss'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

const props = defineProps<{
  id: string
  data?: { label?: string; [key: string]: unknown }
  selected?: boolean
}>()
</script>
