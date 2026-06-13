# TDesign 设计系统规范文档

> 基于 TDesign for Web (Community) 设计系统，适配 schema-form-platform 项目

## 1. 设计系统概览

**设计系统来源**: [TDesign for Web (Community)](https://www.figma.com/design/6gLYgutaFo0X7zoiRXS2hL/)

**核心原则**:
- 一致性：统一的视觉语言和交互模式
- 可复用：组件化设计，支持组合和扩展
- 可访问：支持多端适配和无障碍访问

---

## 2. 颜色系统 (Color System)

### 2.1 品牌色 (Brand Colors)

| Token | 值 | 用途 |
|-------|-----|------|
| `$td-brand-color` | `#0052D9` | 主品牌色、主要按钮、链接 |
| `$td-brand-color-hover` | `#266FE8` | 悬停状态 |
| `$td-brand-color-active` | `#0043B2` | 激活/按下状态 |
| `$td-brand-color-focus` | `#0052D9` | 聚焦状态 |
| `$td-brand-color-light` | `#E8F0FE` | 浅色背景、选中行 |
| `$td-brand-color-lighter` | `#F2F7FF` | 更浅背景 |

### 2.2 功能色 (Functional Colors)

#### 成功 (Success)
| Token | 值 | 用途 |
|-------|-----|------|
| `$td-success-color` | `#00A870` | 成功状态、完成提示 |
| `$td-success-color-hover` | `#23C48E` | 悬停 |
| `$td-success-color-active` | `#008C5E` | 激活 |
| `$td-success-color-light` | `#E8FFF5` | 浅色背景 |

#### 警告 (Warning)
| Token | 值 | 用途 |
|-------|-----|------|
| `$td-warning-color` | `#ED7B2F` | 警告状态、需注意 |
| `$td-warning-color-hover` | `#FF9A51` | 悬停 |
| `$td-warning-color-active` | `#DC6A1E` | 激活 |
| `$td-warning-color-light` | `#FFF3E8` | 浅色背景 |

#### 错误 (Error)
| Token | 值 | 用途 |
|-------|-----|------|
| `$td-error-color` | `#E34D59` | 错误状态、危险操作 |
| `$td-error-color-hover` | `#ED6B75` | 悬停 |
| `$td-error-color-active` | `#CD3A44` | 激活 |
| `$td-error-color-light` | `#FFF0F0` | 浅色背景 |

#### 信息 (Info)
| Token | 值 | 用途 |
|-------|-----|------|
| `$td-info-color` | `#0052D9` | 信息提示 |
| `$td-info-color-light` | `#E8F0FE` | 浅色背景 |

### 2.3 中性色 (Neutral Colors)

#### 文字颜色
| Token | 值 | 用途 |
|-------|-----|------|
| `$td-text-primary` | `#1A1A1A` | 主要文字、标题 |
| `$td-text-secondary` | `#555555` | 次要文字 |
| `$td-text-tertiary` | `#888888` | 辅助文字、说明 |
| `$td-text-disabled` | `#BBBBBB` | 禁用文字 |
| `$td-text-anti` | `#FFFFFF` | 反色文字（深色背景上） |

#### 背景颜色
| Token | 值 | 用途 |
|-------|-----|------|
| `$td-bg-primary` | `#FFFFFF` | 主背景 |
| `$td-bg-secondary` | `#F5F5F5` | 次级背景、卡片 |
| `$td-bg-tertiary` | `#EEEEEE` | 三级背景、分割 |
| `$td-bg-surface` | `#FAFAFA` | 表面背景 |
| `$td-bg-mask` | `rgba(0, 0, 0, 0.4)` | 遮罩层 |
| `$td-bg-hover` | `#F5F5F5` | 悬停背景 |

#### 边框颜色
| Token | 值 | 用途 |
|-------|-----|------|
| `$td-border-level-1` | `#E7E7E7` | 一级边框、默认 |
| `$td-border-level-2` | `#D9D9D9` | 二级边框、强调 |
| `$td-border-level-3` | `#BBBBBB` | 三级边框、聚焦 |

---

## 3. 字体系统 (Typography)

### 3.1 字体族 (Font Family)

| Token | 值 | 用途 |
|-------|-----|------|
| `$td-font-family` | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | 默认字体 |
| `$td-font-family-code` | `"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace` | 代码字体 |

### 3.2 字体大小 (Font Size)

| Token | 值 | 用途 |
|-------|-----|------|
| `$td-font-size-xs` | `12px` | 辅助文字、标签 |
| `$td-font-size-sm` | `12px` | 小号文字 |
| `$td-font-size-base` | `14px` | 正文（默认） |
| `$td-font-size-md` | `14px` | 中号（同 base） |
| `$td-font-size-lg` | `16px` | 大号文字 |
| `$td-font-size-xl` | `18px` | 标题 |
| `$td-font-size-xxl` | `20px` | 大标题 |
| `$td-font-size-display` | `24px` | 展示型标题 |

### 3.3 字重 (Font Weight)

| Token | 值 | 用途 |
|-------|-----|------|
| `$td-font-weight-regular` | `400` | 常规 |
| `$td-font-weight-medium` | `500` | 中等 |
| `$td-font-weight-semibold` | `600` | 半粗 |
| `$td-font-weight-bold` | `700` | 粗体 |

### 3.4 行高 (Line Height)

| Token | 值 | 用途 |
|-------|-----|------|
| `$td-line-height-xs` | `20px` | 紧凑行高 |
| `$td-line-height-sm` | `22px` | 小行高 |
| `$td-line-height-base` | `22px` | 默认行高 |
| `$td-line-height-lg` | `24px` | 大行高 |
| `$td-line-height-xl` | `28px` | 展示行高 |

---

## 4. 间距系统 (Spacing)

### 4.1 基础间距

| Token | 值 | 用途 |
|-------|-----|------|
| `$td-space-1` | `4px` | 最小间距 |
| `$td-space-2` | `8px` | 小间距 |
| `$td-space-3` | `12px` | 中小间距 |
| `$td-space-4` | `16px` | 中间距 |
| `$td-space-5` | `20px` | 中大间距 |
| `$td-space-6` | `24px` | 大间距 |
| `$td-space-8` | `32px` | 超大间距 |
| `$td-space-10` | `40px` | 特大间距 |
| `$td-space-12` | `48px` | 超特大间距 |

### 4.2 组件间距

| Token | 值 | 用途 |
|-------|-----|------|
| `$td-comp-margin-xs` | `4px` | 组件超小外间距 |
| `$td-comp-margin-s` | `8px` | 组件小外间距 |
| `$td-comp-margin-m` | `16px` | 组件中外间距 |
| `$td-comp-margin-l` | `24px` | 组件大外间距 |

---

## 5. 圆角系统 (Border Radius)

| Token | 值 | 用途 |
|-------|-----|------|
| `$td-radius-none` | `0` | 无圆角 |
| `$td-radius-small` | `2px` | 小圆角（标签） |
| `$td-radius-default` | `3px` | 默认圆角（按钮、输入框） |
| `$td-radius-medium` | `6px` | 中圆角（卡片、弹窗） |
| `$td-radius-large` | `9px` | 大圆角（大卡片） |
| `$td-radius-round` | `999px` | 全圆角（胶囊、圆形） |

---

## 6. 阴影系统 (Shadow)

| Token | 值 | 用途 |
|-------|-----|------|
| `$td-shadow-1` | `0 1px 10px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)` | 一级阴影（卡片） |
| `$td-shadow-2` | `0 3px 10px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.1)` | 二级阴影（下拉） |
| `$td-shadow-3` | `0 6px 30px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.1)` | 三级阴影（弹窗） |

---

## 7. 组件规范

### 7.1 按钮 (Button)

#### 尺寸
| 类型 | 高度 | 内边距 | 字号 |
|------|------|--------|------|
| Small | `24px` | `0 12px` | `12px` |
| Medium (默认) | `32px` | `0 16px` | `14px` |
| Large | `40px` | `0 24px` | `16px` |

#### 间距
- 按钮间距：`12px`
- 图标与文字间距：`8px`

### 7.2 输入框 (Input)

#### 尺寸
| 类型 | 高度 | 内边距 |
|------|------|--------|
| Small | `24px` | `0 8px` |
| Medium (默认) | `32px` | `0 12px` |
| Large | `40px` | `0 16px` |

### 7.3 表格 (Table)

- 表头背景：`#FAFAFA`
- 表头字重：`600`
- 行高：`48px`
- 单元格内边距：`12px 16px`
- 斑马纹背景：`#FAFAFA`

### 7.4 对话框 (Dialog)

- 最小宽度：`400px`
- 最大宽度：`800px`
- 头部高度：`56px`
- 内边距：`24px`
- 圆角：`6px`

---

## 8. 图标规范

### 8.1 图标尺寸

| Token | 值 | 用途 |
|-------|-----|------|
| `$td-icon-size-xs` | `12px` | 极小图标 |
| `$td-icon-size-sm` | `14px` | 小图标 |
| `$td-icon-size-default` | `16px` | 默认图标 |
| `$td-icon-size-md` | `20px` | 中图标 |
| `$td-icon-size-lg` | `24px` | 大图标 |

### 8.2 图标颜色

- 默认：继承文字颜色
- 禁用：`$td-text-disabled`
- 悬停：`$td-brand-color-hover`

---

## 9. 动画规范

### 9.1 过渡时间

| Token | 值 | 用途 |
|-------|-----|------|
| `$td-anim-duration-base` | `0.2s` | 默认过渡 |
| `$td-anim-duration-slow` | `0.3s` | 慢过渡 |
| `$td-anim-duration-fast` | `0.1s` | 快过渡 |

### 9.2 缓动函数

| Token | 值 | 用途 |
|-------|-----|------|
| `$td-anim-ease-default` | `cubic-bezier(0.2, 0, 0, 1)` | 默认缓动 |
| `$td-anim-ease-in` | `cubic-bezier(0.2, 0, 1, 0.8)` | 进入缓动 |
| `$td-anim-ease-out` | `cubic-bezier(0, 0.2, 0.8, 1)` | 退出缓动 |

---

## 10. 响应式断点

| Token | 值 | 用途 |
|-------|-----|------|
| `$td-breakpoint-xs` | `320px` | 超小屏（手机竖屏） |
| `$td-breakpoint-sm` | `576px` | 小屏（手机横屏） |
| `$td-breakpoint-md` | `768px` | 中屏（平板） |
| `$td-breakpoint-lg` | `992px` | 大屏（小桌面） |
| `$td-breakpoint-xl` | `1200px` | 超大屏（桌面） |
| `$td-breakpoint-xxl` | `1600px` | 特大屏（大桌面） |

---

## 11. 设计令牌映射

### 项目现有变量 → TDesign 令牌对照

| 项目现有变量 | TDesign 令牌 | 说明 |
|-------------|--------------|------|
| `$color-primary` | `$td-brand-color` | 主品牌色 |
| `$color-success` | `$td-success-color` | 成功色 |
| `$color-warning` | `$td-warning-color` | 警告色 |
| `$color-danger` | `$td-error-color` | 错误色 |
| `$text-color-primary` | `$td-text-primary` | 主文字色 |
| `$bg-color-page` | `$td-bg-secondary` | 页面背景 |
| `$border-color-base` | `$td-border-level-1` | 默认边框 |
| `$font-size-14` | `$td-font-size-base` | 正文字号 |
| `$spacing-md` | `$td-space-4` | 中间距 |
| `$border-radius-md` | `$td-radius-default` | 默认圆角 |

---

## 附录

### A. 设计资源

- **Figma 文件**: [TDesign for Web (Community)](https://www.figma.com/design/6gLYgutaFo0X7zoiRXS2hL/)
- **官方文档**: [TDesign 官网](https://tdesign.tencent.com/)
- **GitHub**: [TDesign GitHub](https://github.com/Tencent/tdesign)

### B. 版本信息

- **当前版本**: v1.0.0
- **更新日期**: 2026-06-13
- **基于**: TDesign for Web Community Edition
