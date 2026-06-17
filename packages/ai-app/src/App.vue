<script setup lang="ts">
import { RouterView } from 'vue-router'
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
    <div style="height: 100%">
      <RouterView />
    </div>
  </ElConfigProvider>
</template>

<style>
/* AI 项目特殊主题覆盖 */
:root {
  --el-color-primary: #00d4ff;
  --el-color-primary-light-3: #33ddff;
  --el-color-primary-light-5: #66e5ff;
  --el-color-primary-light-7: #99eeff;
  --el-color-primary-light-8: #b3f2ff;
  --el-color-primary-light-9: #ccf7ff;
  --el-color-primary-dark-2: #00b8e6;
  --el-color-success: #00e676;
  --el-color-warning: #ffab40;
  --el-color-danger: #ff5252;
  --el-color-info: #00d4ff;
}

html,
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* RouterView 的直接父容器必须撑满 */
#app > :first-child {
  height: 100%;
}
</style>
