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
  margin: 0 8px 4px;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  :deep(.el-collapse-item__header) {
    background: #fafbfc;
    padding: 0 14px;
    font-size: 12px;
    height: 34px;
    line-height: 34px;
    border-bottom: 1px solid #f0f2f5;
    border-radius: 8px 8px 0 0;
    transition: background 0.15s;

    &:hover {
      background: #f0f3f8;
    }
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
    background: #fff;
  }

  :deep(.el-collapse-item__content) {
    padding-bottom: 0;
  }

  &__title {
    font-weight: 600;
    color: #303133;
    font-size: 12px;
  }

  &__body {
    padding: 10px 14px;
  }
}
</style>
