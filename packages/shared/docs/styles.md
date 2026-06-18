# 共享样式

`@schema-form/shared-styles`

## 文件结构

| 文件 | 说明 |
|------|------|
| `_variables.scss` | SCSS 变量（颜色、字体、间距） |
| `_theme.scss` | Element Plus 主题覆盖 |
| `_css-variables.scss` | CSS 自定义属性 |
| `design-tokens.css` | 设计令牌（CSS 变量） |
| `tokens.css` | 令牌（兼容层） |
| `component-styles.css` | 组件样式（sf-table 等） |

## 设计令牌

### 颜色

| 变量 | 值 | 说明 |
|------|------|------|
| `$color-primary` | `#0066CC` | 主色 |
| `$text-color-primary` | `#333333` | 主要文字 |
| `$text-color-secondary` | `#666666` | 次要文字 |
| `$bg-color-page` | `#F5F7FA` | 页面背景 |
| `$bg-color-white` | `#FFFFFF` | 白色背景 |
| `$bg-color-gray` | `#F5F7FA` | 灰色背景（表头） |
| `$border-color-base` | `#D5DDE3` | 边框色 |

### 字体

| 变量 | 值 | 说明 |
|------|------|------|
| `$font-family-base` | `system-ui, -apple-system, sans-serif` | 字体族 |
| `$font-size-12` | `12px` | 小号 |
| `$font-size-14` | `14px` | 正文 |
| `$font-size-16` | `16px` | 中号 |
| `$font-weight-medium` | `500` | 中等粗细 |

### 间距

| 变量 | 值 | 说明 |
|------|------|------|
| `$spacing-xs` | `4px` | 极小 |
| `$spacing-sm` | `8px` | 小 |
| `$spacing-md` | `16px` | 中 |
| `$spacing-lg` | `24px` | 大 |

## Element Plus 覆盖

`_theme.scss` 覆盖的组件：

- 表格表头（`th.el-table__cell` — 灰色底 + 加粗）
- 按钮高度和圆角
- 表单标签字体
- 弹窗头部（蓝底白字）
- 输入框宽度 100%
- 下拉选中色

## 使用方式

在项目的入口文件或样式文件中引用：

```ts
import '@schema-form/shared-styles/theme.scss'
import '@schema-form/shared-styles/css-variables.scss'
```
