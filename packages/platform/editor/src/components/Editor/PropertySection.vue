<script setup lang="ts">
/**
 * PropertySection -- Collapsible panel section for the property panel.
 * Wraps content in an el-collapse-item.
 */
import { ref, watch } from 'vue'

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
  <el-collapse v-model="activeNames" class="property-section">
    <el-collapse-item name="section">
      <template #title>
        <span class="property-section__title">{{ title }}</span>
      </template>
      <div class="property-section__body">
        <slot />
      </div>
    </el-collapse-item>
  </el-collapse>
</template>

<style scoped lang="scss">
.property-section {
  border: none;
  margin: 0 0 2px;
  background: transparent;
  border-radius: 6px;
  overflow: hidden;

  :deep(.el-collapse-item__header) {
    background: transparent;
    padding: 0 12px;
    font-size: 11px;
    height: 32px;
    line-height: 32px;
    border-bottom: 1px solid #f0f2f5;
    border-radius: 0;
    color: #606266;
    letter-spacing: 0.3px;
    transition: color 0.15s;

    &:hover { color: var(--el-color-primary); }
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
    background: transparent;
  }

  :deep(.el-collapse-item__content) {
    padding-bottom: 4px;
  }

  :deep(.el-collapse-item__arrow) {
    font-size: 11px;
    color: #c0c4cc;
  }

  &__title {
    font-weight: 600;
    color: inherit;
    font-size: 11px;
    text-transform: none;
  }

  &__body {
    padding: 8px 12px 4px;
  }
}
</style>
