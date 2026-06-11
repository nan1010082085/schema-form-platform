<script setup lang="ts">
/**
 * WorkflowView — 工作流子应用占位页
 *
 * workflow 子应用尚未开发，此页面显示占位信息。
 * 未来开发 workflow 子应用后，替换为 MicroAppLoader 即可。
 */
</script>

<template>
  <div :class="$style.placeholder">
    <div :class="$style.card">
      <h2 :class="$style.title">工作流</h2>
      <p :class="$style.desc">工作流子应用开发中，敬请期待</p>
      <router-link to="/" :class="$style.back">返回首页</router-link>
    </div>
  </div>
</template>

<style module>
.placeholder {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color-page);
}

.card {
  text-align: center;
  padding: 48px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-color-primary);
  margin: 0 0 8px;
}

.desc {
  font-size: 14px;
  color: var(--text-color-secondary);
  margin: 0 0 24px;
}

.back {
  font-size: 14px;
  color: var(--color-primary);
  text-decoration: none;
}

.back:hover {
  text-decoration: underline;
}
</style>
