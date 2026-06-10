<script setup lang="ts">
/**
 * App.vue -- shell root component
 *
 * Minimal root that just renders the router view.
 * Global styles and resets are applied here.
 */
</script>

<template>
  <div class="shell-root">
    <router-view />
  </div>
</template>

<style>
/* Shell global base reset */
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #303133;
  background: #f5f7fa;
  -webkit-font-smoothing: antialiased;
}

#app {
  height: 100%;
}

.shell-root {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Element Plus overrides scoped to shell */
.shell-root .el-input,
.shell-root .el-select,
.shell-root .el-date-editor,
.shell-root .el-input-number {
  width: 100%;
}

.shell-root .el-form-item {
  margin-bottom: 0;
}
</style>
