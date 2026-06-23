<script setup lang="ts">
</script>

<template>
  <div :class="$style.container">
    <div :class="$style.content">
      <h2 :class="$style.title">系统管理</h2>
      <p :class="$style.desc">请从左侧菜单选择管理页面</p>
    </div>
  </div>
</template>

<style module>
.container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  text-align: center;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 8px 0;
}

.desc {
  font-size: 14px;
  color: var(--text-color-secondary);
  margin: 0;
}
</style>
