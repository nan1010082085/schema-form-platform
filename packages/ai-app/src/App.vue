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
  --ai-color-danger-bg: rgba(229, 1, 19, 0.08);
  --ai-color-purple: #7C3AED;
  --ai-color-purple-bg: rgba(124, 58, 237, 0.08);
  --ai-color-warning: #E6A23C;
  --ai-color-warning-bg: rgba(230, 162, 60, 0.1);
  --ai-color-primary-light: rgba(0, 96, 162, 0.08);
  --ai-text-primary: #1A1A1A;
  --ai-text-secondary: #666666;
  --ai-text-hint: #999999;
  --ai-text-disabled: #C0C4CC;
  --ai-text-inverse: #FFFFFF;
  --ai-border-base: #E0E4EA;
  --ai-border-light: #F0F2F5;
  --ai-bg-white: #FFFFFF;
  --ai-bg-page: #F5F6FA;
  --ai-bg-gray: #F7F8FA;
  --ai-bg-gray-light: #FAFAFA;
  --ai-bg-hover: #F0F5FF;
  --ai-radius-sm: 6px;
  --ai-radius-md: 8px;
  --ai-radius-lg: 12px;
  --ai-radius-xl: 16px;
  --ai-radius-2xl: 20px;

  /* 间距 */
  --ai-spacing-xs: 6px;
  --ai-spacing-sm: 10px;
  --ai-spacing-md: 16px;
  --ai-spacing-lg: 24px;
  --ai-spacing-xl: 32px;

  /* 阴影 */
  --ai-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
  --ai-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04);
  --ai-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04);
  --ai-shadow-card: 0 2px 8px rgba(0, 0, 0, 0.04), 0 0 1px rgba(0, 0, 0, 0.06);
  --ai-shadow-float: 0 12px 32px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06);

  /* 毛玻璃 */
  --ai-glass-bg: rgba(255, 255, 255, 0.72);
  --ai-glass-blur: blur(16px);
  --ai-glass-border: rgba(255, 255, 255, 0.18);

  /* 渐变 */
  --ai-gradient-primary: linear-gradient(135deg, #0060A2 0%, #0078D4 100%);
  --ai-gradient-user: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --ai-gradient-subtle: linear-gradient(135deg, rgba(0, 96, 162, 0.04) 0%, rgba(0, 120, 212, 0.02) 100%);
  --ai-gradient-card-header: linear-gradient(180deg, rgba(245, 247, 250, 0.8) 0%, rgba(245, 247, 250, 0.4) 100%);
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
