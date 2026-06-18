<script setup lang="ts">
/**
 * WidgetDocsView -- 部件文档查看器（占位）
 *
 * 后续补充部件文档时再实现。
 */
</script>

<template>
  <div :class="$style.placeholder">
    <div :class="$style.content">
      <h2 :class="$style.title">部件文档</h2>
      <p :class="$style.desc">文档建设中...</p>
    </div>
  </div>
</template>

<style module>
.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color-page);
}

.content {
  text-align: center;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin-bottom: 8px;
}

.desc {
  font-size: 14px;
  color: var(--text-color-secondary);
}
</style>
