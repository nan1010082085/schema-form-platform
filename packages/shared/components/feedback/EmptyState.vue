<script setup lang="ts">
/**
 * EmptyState -- 空状态占位组件（共享组件）
 *
 * 用于列表为空、搜索无结果等场景。
 * 支持自定义图标、标题、描述和操作按钮。
 */
import styles from './EmptyState.module.scss'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

withDefaults(defineProps<{
  /** 标题文本 */
  title?: string
  /** 描述文本 */
  description?: string
}>(), {
  title: '暂无数据',
})
</script>

<template>
  <div :class="styles.empty">
    <div :class="styles.icon">
      <slot name="icon">
        <AppIcon name="info-filled" />
      </slot>
    </div>
    <div :class="styles.title">{{ title }}</div>
    <div v-if="description || $slots.description" :class="styles.description">
      <slot name="description">{{ description }}</slot>
    </div>
    <slot name="action" />
  </div>
</template>
