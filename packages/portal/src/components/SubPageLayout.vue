<script setup lang="ts">
/**
 * SubPageLayout — 子页面内容布局
 *
 * 职责：
 * - 提供子页面的标题和内容区域
 * - 由 AppLayout 统一提供顶部导航，此组件仅负责内容区布局
 */
defineProps<{
  title: string
}>()
</script>

<template>
  <div :class="$style.layout">
    <h1 :class="$style.title">{{ title }}</h1>
    <div :class="$style.content">
      <slot />
    </div>
  </div>
</template>

<style module>
.layout {
  padding: 24px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 20px;
}

.content {
  width: 100%;
}
</style>
