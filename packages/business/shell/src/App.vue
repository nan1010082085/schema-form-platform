<script setup lang="ts">
/**
 * App.vue -- shell root component
 *
 * Minimal root that just renders the router view.
 * Global styles and resets are applied here.
 */
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import '@schema-form/shared-styles/css-variables.scss'
</script>

<template>
  <ElConfigProvider
    :locale="zhCn"
    :size="'default'"
    :z-index="2000"
  >
    <div class="shell-root">
      <router-view />
    </div>
  </ElConfigProvider>
</template>

<style>
.shell-root {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
