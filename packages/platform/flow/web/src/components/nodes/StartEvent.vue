<template>
  <div :class="[styles.node, { [styles.selected]: props.selected }]">
    <AppIcon name="video-play" :class="styles.icon" :size="20" />
    <span :class="styles.label">{{ props.data?.label ?? '开始' }}</span>
    <Handle type="source" :position="Position.Bottom" :class="styles.handle" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import styles from './StartEvent.module.scss'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'

const props = defineProps<{
  id: string
  data?: { label?: string; [key: string]: unknown }
  selected?: boolean
}>()
</script>
