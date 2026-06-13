<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div style="height: 100%">
    <RouterView />
  </div>
</template>

<style>
:root {
  /* 全局令牌 - 科技感深色主题 */
  --color-primary: #00d4ff;
  --color-primary-hover: #33ddff;
  --color-primary-bg: rgba(0, 212, 255, 0.1);
  --color-success: #00e676;
  --color-success-bg: rgba(0, 230, 118, 0.1);
  --color-info: #00d4ff;
  --color-info-bg: rgba(0, 212, 255, 0.08);
  --color-warning: #ffab40;
  --color-danger: #ff5252;
  --text-primary: rgba(255, 255, 255, 0.95);
  --text-secondary: rgba(255, 255, 255, 0.65);
  --text-hint: rgba(255, 255, 255, 0.4);
  --text-disabled: rgba(255, 255, 255, 0.2);
  --text-inverse: #0a0e14;
  --border-base: rgba(0, 212, 255, 0.15);
  --border-light: rgba(0, 212, 255, 0.08);
  --bg-white: #111820;
  --bg-page: #0a0e14;
  --bg-gray: #161d26;
  --bg-gray-light: #1a2230;
  --bg-hover: rgba(0, 212, 255, 0.06);
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --radius-sm: 4px;
  --radius-md: 8px;

  /* TDesign 主题覆盖 */
  --td-brand-color: #00d4ff;
  --td-brand-color-light: rgba(0, 212, 255, 0.1);
  --td-brand-color-focus: #00b8e6;
  --td-warning-color: #ffab40;
  --td-error-color: #ff5252;
  --td-success-color: #00e676;
  --td-text-color-primary: rgba(255, 255, 255, 0.95);
  --td-text-color-secondary: rgba(255, 255, 255, 0.65);
  --td-text-color-placeholder: rgba(255, 255, 255, 0.35);
  --td-border-level-1-color: rgba(0, 212, 255, 0.15);
  --td-border-level-2-color: rgba(0, 212, 255, 0.08);
  --td-radius-default: 8px;
  --td-radius-small: 4px;
  --td-font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  /* 组件层令牌（--ai- 前缀） - 科技感深色主题 */
  --ai-color-primary: #00d4ff;
  --ai-color-primary-hover: #33ddff;
  --ai-color-primary-bg: rgba(0, 212, 255, 0.1);
  --ai-color-success: #00e676;
  --ai-color-success-bg: rgba(0, 230, 118, 0.1);
  --ai-color-info: #00d4ff;
  --ai-color-info-bg: rgba(0, 212, 255, 0.08);
  --ai-color-danger: #ff5252;
  --ai-color-danger-bg: rgba(255, 82, 82, 0.1);
  --ai-color-purple: #bb86fc;
  --ai-color-purple-bg: rgba(187, 134, 252, 0.1);
  --ai-color-warning: #ffab40;
  --ai-color-warning-bg: rgba(255, 171, 64, 0.1);
  --ai-color-primary-light: rgba(0, 212, 255, 0.08);
  --ai-text-primary: rgba(255, 255, 255, 0.95);
  --ai-text-secondary: rgba(255, 255, 255, 0.65);
  --ai-text-hint: rgba(255, 255, 255, 0.4);
  --ai-text-disabled: rgba(255, 255, 255, 0.2);
  --ai-text-inverse: #0a0e14;
  --ai-border-base: rgba(0, 212, 255, 0.15);
  --ai-border-light: rgba(0, 212, 255, 0.08);
  --ai-bg-white: #111820;
  --ai-bg-page: #0a0e14;
  --ai-bg-gray: #161d26;
  --ai-bg-gray-light: #1a2230;
  --ai-bg-hover: rgba(0, 212, 255, 0.06);
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

  /* 阴影 - 霓虹发光 */
  --ai-shadow-sm: 0 0 8px rgba(0, 212, 255, 0.08);
  --ai-shadow-md: 0 0 15px rgba(0, 212, 255, 0.12), 0 0 30px rgba(0, 212, 255, 0.06);
  --ai-shadow-lg: 0 0 20px rgba(0, 212, 255, 0.18), 0 0 40px rgba(0, 212, 255, 0.08);
  --ai-shadow-card: 0 0 12px rgba(0, 212, 255, 0.1), 0 0 1px rgba(0, 212, 255, 0.15);
  --ai-shadow-float: 0 0 30px rgba(0, 212, 255, 0.15), 0 0 60px rgba(0, 212, 255, 0.08);

  /* 毛玻璃 - 深色玻璃拟态 */
  --ai-glass-bg: rgba(17, 24, 32, 0.85);
  --ai-glass-blur: blur(20px);
  --ai-glass-border: rgba(0, 212, 255, 0.1);

  /* 渐变 */
  --ai-gradient-primary: linear-gradient(135deg, #00d4ff 0%, #009fcc 100%);
  --ai-gradient-user: linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 212, 255, 0.1) 100%);
  --ai-gradient-subtle: linear-gradient(135deg, rgba(0, 212, 255, 0.04) 0%, rgba(0, 212, 255, 0.02) 100%);
  --ai-gradient-card-header: linear-gradient(180deg, rgba(22, 29, 38, 0.8) 0%, rgba(22, 29, 38, 0.4) 100%);
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

/* RouterView 的直接父容器必须撑满 */
#app > :first-child {
  height: 100%;
}

</style>
