<script setup lang="ts">
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'

withDefaults(defineProps<{
  indent?: boolean
  /** popover 宽度 */
  width?: number | string
}>(), {
  indent: true,
  width: 240,
})
</script>

<template>
  <el-popover
    placement="top"
    :width="width"
    trigger="hover"
    :show-after="200"
    :popper-style="{ maxWidth: '320px' }"
  >
    <template #reference>
      <span :class="$style.trigger">
        <AppIcon name="question-filled" :size="14" />
      </span>
    </template>
    <div :class="$style.content">
      <slot />
    </div>
  </el-popover>
</template>

<style module>
.trigger {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  color: var(--text-color-placeholder);
  transition: color 0.15s;
  vertical-align: middle;
  margin-left: 4px;
}

.trigger:hover {
  color: var(--color-primary);
}

.content {
  font-size: 12px;
  color: var(--text-color-regular);
  line-height: 1.6;
  word-break: break-word;
}

.content code {
  font-family: var(--font-family), monospace;
  font-size: 11px;
  background: var(--bg-color-secondary);
  padding: 1px 4px;
  border-radius: 3px;
}
</style>
