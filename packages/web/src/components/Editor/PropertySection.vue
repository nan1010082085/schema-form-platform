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

  :deep(.el-collapse-item__header) {
    background: #f5f7fa;
    padding: 0 12px;
    font-size: 13px;
    height: 36px;
    line-height: 36px;
    border-bottom: 1px solid #ebeef5;
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
  }

  :deep(.el-collapse-item__content) {
    padding-bottom: 0;
  }

  &__title {
    font-weight: 600;
    color: #303133;
  }

  &__body {
    padding: 12px;
  }
}
</style>
