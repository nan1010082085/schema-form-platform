# Schema 编写指南

## 一、Schema 结构

每个 FormGrid schema 是 `FormSchemaItem[]` 数组：

```typescript
interface FormSchemaItem {
  type: SchemaType          // 组件类型（必需）
  field?: string            // 绑定 formData 字段
  label?: string            // 显示标签
  hidden?: boolean          // 是否隐藏
  defaultValue?: unknown    // 默认值
  span?: number             // 栅格列宽（1-24，仅 grid-col）
  width?: string            // CSS 宽度
  children?: FormSchemaItem[] // 子组件（容器类型）
  // 组件特定 props 通过 props 传递
  props?: Record<string, unknown>
  // 联动/API/校验/选项配置
  linkages?: SchemaLinkage[]
  api?: SchemaApiConfig
  rules?: SchemaRules
  options?: DictItem[]
}
```

## 二、组件分类

### 布局组件（8 种）

| 类型 | 说明 | 子级 |
|------|------|------|
| `page` | 页面根容器 | ✅ |
| `toolbar` | 固定顶部工具栏 | ✅ |
| `card` | 白色卡片 | ✅ |
| `title` | 标题文字 | ❌ |
| `divider` | 分割线 | ❌ |
| `spacer` | 留白间距 | ❌ |
| `steps` | 步骤条 | ✅ |
| `tabs` | 标签页 | ✅ |

### 基础表单（9 种）

| 类型 | 说明 | 特点 |
|------|------|------|
| `input` | 文本输入 | placeholder/disabled/readonly |
| `number` | 数字输入 | min/max |
| `select` | 下拉选择 | options + api |
| `radio` | 单选按钮 | options |
| `checkbox` | 多选框 | 数组值 |
| `date` | 日期选择 | — |
| `date-range` | 日期范围 | 双字段绑定 |
| `textarea` | 多行文本 | rows |
| `richtext` | 富文本 | — |

### 业务组件（18 种）

| 类型 | 说明 |
|------|------|
| `search-list` | 搜索列表（搜索+表格+分页+操作） |
| `button-list` | 按钮组（8 种动作类型） |
| `table` | 可编辑表格 |
| `upload` | 文件上传 |
| `file-list` | 文件列表 |
| `file-preview` | 文件选择预览 |
| `pagination` | 分页器 |
| `person-select` | 人员选择器 |
| `dept-select` | 部门选择器 |
| `transfer` | 穿梭框 |
| `detail-form` | 详情表单 |
| `banner` | Banner 横幅 |
| `tree-layout` | 树形布局 |
| `date-time-slot` | 时间段选择 |
| `dialog` | 弹窗 |
| `toolbar-buttons` | 工具栏按钮组 |
| `steps` | 步骤条布局 |
| `tabs` | 标签页布局 |

## 三、栅格系统

24 列 flex 布局，`span` 控制列宽：

```json
{ "type": "grid-row", "children": [
  { "type": "grid-col", "span": 8, "label": "左（1/3）", "children": [...] },
  { "type": "grid-col", "span": 8, "label": "中（1/3）", "children": [...] },
  { "type": "grid-col", "span": 8, "label": "右（1/3）", "children": [...] }
]}
```

`grid-row` 自动 flex-wrap，`span` 总和可超过 24（自动换行）。

## 四、校验规则

使用 Element Plus `FormItemRule` 格式：

```json
{ "type": "input", "field": "email", "label": "邮箱",
  "rules": [
    { "required": true, "message": "请输入邮箱", "trigger": "blur" },
    { "type": "email", "message": "邮箱格式不正确", "trigger": "blur" }
  ]
}
```

## 五、默认值

```json
{ "type": "input", "field": "name", "label": "姓名", "defaultValue": "张三" }
{ "type": "date-range", "field": "dateRange", "label": "日期", "defaultValue": ["2026-01-01", "2026-12-31"] }
```

## 六、可见性控制

- `hidden: true` — 不渲染
- `visibleOn: "${field} === 'value'"` — 表达式控制
- `linkages: [{ type: "visible", ... }]` — 联动控制

优先级：hidden > visibleOn > linkage.visible
