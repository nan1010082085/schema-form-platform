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
</style>
