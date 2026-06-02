<script setup lang="ts">
import { RouterView } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
</script>

<template>
  <el-config-provider :locale="zhCn" size="default">
    <RouterView />
  </el-config-provider>
</template>

<style>
:root {
  /* 全局令牌（无前缀，供 view 层使用） */
  --color-primary: #0060A2;
  --color-primary-hover: #035B9C;
  --color-primary-bg: #EEF5FF;
  --color-success: #26A036;
  --color-success-bg: rgba(82, 196, 26, 0.1);
  --color-info: #4581E9;
  --color-info-bg: rgba(22, 119, 255, 0.08);
  --color-warning: #F09700;
  --color-danger: #E50113;
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-hint: #999999;
  --text-disabled: #C0C4CC;
  --text-inverse: #FFFFFF;
  --border-base: #D5DDE3;
  --border-light: #EBEDF3;
  --bg-white: #FFFFFF;
  --bg-page: #F5F6FA;
  --bg-gray: #F5F7FA;
  --bg-gray-light: #FAFAFA;
  --bg-hover: #E5EFF6;
  --font-family: 'Microsoft YaHei', '微软雅黑', 'PingFang SC', sans-serif;
  --radius-sm: 2px;
  --radius-md: 4px;

  /* Element Plus 主题覆盖 — 与 shared/styles/_theme.scss 保持一致 */
  --el-color-primary: #0060A2;
  --el-color-primary-light-3: #4d8fbe;
  --el-color-primary-light-5: #80b0d1;
  --el-color-primary-light-7: #b3d0e4;
  --el-color-primary-light-8: #cce0ee;
  --el-color-primary-light-9: #e6f0f7;
  --el-color-primary-dark-2: #004c82;
  --el-color-warning: #F09700;
  --el-color-danger: #E50113;
  --el-color-success: #26A036;
  --el-text-color-primary: #333333;
  --el-text-color-regular: #666666;
  --el-text-color-placeholder: #999999;
  --el-border-color: #D5DDE3;
  --el-border-color-light: #EBEDF3;
  --el-border-color-lighter: #EBEDF3;
  --el-border-color-extra-light: #EBEDF3;
  --el-border-radius-base: 2px;
  --el-border-radius-small: 2px;
  --el-font-family: 'Microsoft YaHei', '微软雅黑', 'PingFang SC', sans-serif;

  /* 组件层令牌（--ai- 前缀，与组件 fallback 值一致） */
  --ai-color-primary: #0060A2;
  --ai-color-primary-hover: #035B9C;
  --ai-color-primary-bg: #EEF5FF;
  --ai-color-success: #26A036;
  --ai-color-success-bg: rgba(82, 196, 26, 0.1);
  --ai-color-info: #4581E9;
  --ai-color-info-bg: rgba(22, 119, 255, 0.08);
  --ai-color-danger: #E50113;
  --ai-text-primary: #333333;
  --ai-text-secondary: #666666;
  --ai-text-hint: #999999;
  --ai-text-disabled: #C0C4CC;
  --ai-text-inverse: #FFFFFF;
  --ai-border-base: #D5DDE3;
  --ai-border-light: #EBEDF3;
  --ai-bg-white: #FFFFFF;
  --ai-bg-page: #F5F6FA;
  --ai-bg-gray: #F5F7FA;
  --ai-bg-gray-light: #FAFAFA;
  --ai-bg-hover: #E5EFF6;
  --ai-radius-sm: 2px;
  --ai-radius-md: 4px;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: var(--font-family);
}

#app {
  height: 100%;
}

/* el-config-provider 是 RouterView 的直接父容器，必须撑满 */
#app > :first-child {
  height: 100%;
}

</style>
