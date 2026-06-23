<script setup lang="ts">
/**
 * StandaloneLayout — 独立页签布局
 *
 * 完全无壳容器：无侧边栏、无顶部导航、无面包屑。
 * 适用于新标签页打开微应用，或嵌入外部系统的场景。
 * 仅渲染 <router-view />，由 AppContainer 决定加载哪个微应用。
 */
</script>

<template>
  <div :class="$style.standalone">
    <router-view />
  </div>
</template>

<style module>
.standalone {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-color-page);
}
</style>
