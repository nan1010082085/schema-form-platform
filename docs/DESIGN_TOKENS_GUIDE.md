# TDesign 设计令牌使用指南

## 概述

本项目已集成 TDesign 设计系统令牌，提供统一的视觉语言和设计规范。所有设计令牌都以 SCSS 变量和 CSS 自定义属性两种形式提供，支持灵活使用。

## 文件结构

```
packages/editor/web/src/styles/
├── tdesign-tokens.scss          # TDesign SCSS 变量（源文件）
├── tdesign-css-variables.css    # CSS 自定义属性（运行时）
├── tdesign-migration.scss       # 迁移映射（兼容现有代码）
└── variables.scss               # 项目原有变量（逐步迁移中）
```

## 快速开始

### 1. 在 SCSS 中使用

```scss
@import '@/styles/tdesign-tokens';

.my-component {
  // 使用 TDesign 令牌
  color: $td-text-primary;
  background-color: $td-bg-primary;
  border: 1px solid $td-border-level-1;
  border-radius: $td-radius-default;
  padding: $td-space-4;
  font-size: $td-font-size-base;
  font-weight: $td-font-weight-regular;
  line-height: $td-line-height-base;
  transition: all $td-anim-duration-base $td-anim-ease-default;

  &:hover {
    background-color: $td-bg-hover;
    box-shadow: $td-shadow-1;
  }
}
```

### 2. 使用兼容 Mixin

```scss
@import '@/styles/tdesign-migration';

.my-button {
  @include td-button-md;
  @include td-button-primary;
}

.my-input {
  @include td-input-base;
  height: $td-input-height-md;
}

.my-card {
  @include td-card;
  padding: $td-space-6;
}
```

### 3. 在 CSS 中使用自定义属性

```css
.my-component {
  color: var(--td-text-primary);
  background-color: var(--td-bg-primary);
  border: 1px solid var(--td-border-level-1);
  border-radius: var(--td-radius-default);
  padding: var(--td-space-4);
  font-size: var(--td-font-size-base);
}

/* 支持主题切换 */
[data-theme="dark"] .my-component {
  /* CSS 变量会自动切换，无需手动覆盖 */
}
```

### 4. 在 Vue 组件中使用

```vue
<template>
  <div class="my-component">
    <slot />
  </div>
</template>

<style module>
.component {
  composes: card from '@/styles/tdesign-migration.scss';
  padding: var(--td-space-4);
  color: var(--td-text-primary);
}
</style>
```

## 设计令牌分类

### 颜色系统

| 类别 | SCSS 变量 | CSS 变量 | 用途 |
|------|-----------|----------|------|
| 品牌色 | `$td-brand-color` | `--td-brand-color` | 主按钮、链接 |
| 成功色 | `$td-success-color` | `--td-success-color` | 成功状态 |
| 警告色 | `$td-warning-color` | `--td-warning-color` | 警告状态 |
| 错误色 | `$td-error-color` | `--td-error-color` | 错误状态 |

### 字体系统

```scss
// 字体大小
$td-font-size-xs: 12px;   // 辅助文字
$td-font-size-sm: 12px;   // 小号文字
$td-font-size-base: 14px; // 正文（默认）
$td-font-size-lg: 16px;   // 大号文字
$td-font-size-xl: 18px;   // 标题
$td-font-size-xxl: 20px;  // 大标题

// 字重
$td-font-weight-regular: 400;
$td-font-weight-medium: 500;
$td-font-weight-semibold: 600;
$td-font-weight-bold: 700;
```

### 间距系统

```scss
// 基础间距（4px 为基准）
$td-space-1: 4px;   // 超小间距
$td-space-2: 8px;   // 小间距
$td-space-3: 12px;  // 中小间距
$td-space-4: 16px;  // 中间距
$td-space-6: 24px;  // 大间距
$td-space-8: 32px;  // 超大间距
```

### 圆角系统

```scss
$td-radius-small: 2px;    // 标签、小元素
$td-radius-default: 3px;  // 按钮、输入框（默认）
$td-radius-medium: 6px;   // 卡片、弹窗
$td-radius-large: 9px;    // 大卡片
$td-radius-round: 999px;  // 胶囊、圆形
```

### 阴影系统

```scss
$td-shadow-1: 0 1px 10px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1);  // 卡片
$td-shadow-2: 0 3px 10px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.1);   // 下拉
$td-shadow-3: 0 6px 30px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.1);   // 弹窗
```

## 组件规范

### 按钮尺寸

```scss
// 小按钮
@include td-button-sm;  // 24px 高度

// 中按钮（默认）
@include td-button-md;  // 32px 高度

// 大按钮
@include td-button-lg;  // 40px 高度
```

### 输入框尺寸

```scss
$input-height-sm: 24px;  // 小输入框
$input-height: 32px;     // 中输入框（默认）
$input-height-lg: 40px;  // 大输入框（通过 mixin）
```

### 表格规范

```scss
$table-header-bg: #FAFAFA;           // 表头背景
$table-header-font-weight: 600;      // 表头字重
$table-row-height: 48px;             // 行高
$table-cell-padding: 12px 16px;      // 单元格内边距
```

## 主题切换

### 暗色主题

项目支持通过 CSS 变量实现主题切换：

```scss
// 切换到暗色主题
[data-theme="dark"] {
  @include td-dark-theme;
}

// 或者使用 class
.theme-dark {
  @include td-dark-theme;
}
```

### 自定义主题

可以通过覆盖 CSS 变量实现自定义主题：

```css
:root {
  --td-brand-color: #你的品牌色;
  --td-brand-color-hover: #你的悬停色;
  /* ... */
}
```

## 迁移指南

### 从旧变量迁移

项目提供了兼容映射，旧变量会自动映射到 TDesign 令牌：

```scss
// 旧写法（仍然有效）
color: $color-primary;
background: $bg-color-page;

// 新写法（推荐）
color: $td-brand-color;
background: $td-bg-secondary;
```

### 迁移步骤

1. **新代码**：直接使用 TDesign 令牌
2. **修改旧代码**：将旧变量替换为 TDesign 令牌
3. **逐步迁移**：不需要一次性完成，兼容层会持续支持

## 最佳实践

1. **优先使用语义化令牌**：使用 `$td-brand-color` 而非具体色值
2. **保持一致性**：同一组件内使用统一的间距和圆角
3. **使用 Mixin**：复用预定义的样式组合
4. **支持主题**：使用 CSS 变量确保主题可切换
5. **遵循规范**：参考 `DESIGN_SYSTEM.md` 中的组件规范

## 相关文档

- [设计系统规范文档](../../DESIGN_SYSTEM.md)
- [TDesign 官方文档](https://tdesign.tencent.com/)
- [TDesign Figma 设计稿](https://www.figma.com/design/6gLYgutaFo0X7zoiRXS2hL/)
