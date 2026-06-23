<script setup lang="ts">
import type { NodePanelProps } from './types'
import styles from './DefaultNodePanel.module.scss'

defineProps<NodePanelProps>()
</script>

<template>
  <div :class="styles.hint">该节点类型无需额外配置</div>
</template>
