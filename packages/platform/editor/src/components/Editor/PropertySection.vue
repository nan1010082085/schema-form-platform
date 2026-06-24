<script setup lang="ts">
/**
 * PropertySection -- Collapsible panel section for the property panel.
 * Wraps content in an el-collapse-item.
 */
import { ref, watch } from 'vue'
import styles from './PropertySection.module.scss'

const props = withDefaults(defineProps<{
  title: string
  defaultOpen?: boolean
}>(), {
  defaultOpen: true,
})

const activeNames = ref<string[]>(props.defaultOpen ? ['section'] : [])

watch(() => props.defaultOpen, (val) => {
  activeNames.value = val ? ['section'] : []
})
</script>

<template>
  <el-collapse v-model="activeNames" :class="styles['property-section']">
    <el-collapse-item name="section">
      <template #title>
        <span :class="styles['property-section__title']">{{ title }}</span>
      </template>
      <div :class="styles['property-section__body']">
        <slot />
      </div>
    </el-collapse-item>
  </el-collapse>
</template>
