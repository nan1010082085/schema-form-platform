<script setup lang="ts">
import { ref } from 'vue'
import { ArrowDown, ArrowRight } from '@element-plus/icons-vue'
import styles from './SectionToggle.module.scss'

const props = withDefaults(defineProps<{
  title: string
  count?: number
  defaultOpen?: boolean
}>(), {
  defaultOpen: true,
})

const isOpen = ref(props.defaultOpen)

function toggle() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <div :class="styles.section">
    <div :class="styles.header" @click="toggle">
      <el-icon :size="12" :class="styles.arrow">
        <ArrowDown v-if="isOpen" />
        <ArrowRight v-else />
      </el-icon>
      <span :class="styles.label">{{ title }}</span>
      <span v-if="count !== undefined" :class="styles.count">{{ count }}</span>
    </div>
    <div v-show="isOpen" :class="styles.body">
      <slot />
    </div>
  </div>
</template>
