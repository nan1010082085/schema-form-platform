# 数据模型

## 核心概念

详见 [组件架构（Widget 体系）](./component-architecture.md) 中的 Board 和 Widget 数据结构定义。

## 组件类型分类

### 容器组件

可容纳基础组件，内部基础组件相对于容器定位。容器之间禁止互相嵌套。

| 类型 | 说明 |
|---|---|
| `form` | 表单容器 — 外层 el-form，支持提交/刷新配置，收集子组件值组合成对象 emit，校验 required 字段 |
| `card` | 卡片容器 — 仅一个容器包裹，无特殊行为 |
| `row-col` | 行列容器 — el-row + el-col 布局，支持 1/2/3/4 列图标选择 |
| `tabs` | 页签容器 — 动态添加标签，拖入组件绑定 tabKey，切换标签显示对应组件 |
| `dialog` | 弹窗容器 — el-dialog slot 结构（header/content/footer），支持编辑模式和微前端模式互斥 |

### 基础组件

叶子节点，不可嵌套。可独立存在于根级，也可放入容器内。

| 类型 | 说明 |
|---|---|
| `input` | 输入框 |
| `number` | 数字输入 |
| `select` | 下拉选择 |
| `radio` | 单选 |
| `checkbox` | 多选 |
| `date` | 日期选择 |
| `date-range` | 日期范围 |
| `textarea` | 文本域 |
| `richtext` | 富文本 |
| `button-list` | 按钮列表 |
| `upload` | 上传 |
| `table` | 表格 |
| `search-list` | 搜索列表 |
| `editable-table` | 可编辑表格 |
| `title` | 标题 |
| `divider` | 分割线 |
| `spacer` | 间距 |
| `toolbar-buttons` | 工具栏按钮 |
| `file-list` | 文件列表 |
| `person-select` | 人员选择 |
| `dept-select` | 部门选择 |
| `transfer` | 穿梭框 |
| `detail-form` | 详情表单 |
| `banner` | 横幅 |
| `tree-layout` | 树形布局 |
| `date-time-slot` | 时间段选择 |

## 事件结构

```typescript
interface WidgetEvent {
  trigger: string                    // 触发事件名（click / change / close 等）
  condition?: string                 // 执行条件表达式
  confirm?: string                   // 执行前确认提示
  actions: SchemaEventAction[]
}

interface SchemaEventAction {
  type: 'show' | 'hide' | 'open-dialog' | 'close-dialog' | 'switch-tab'
  target: string                     // 目标组件 ID 或弹窗 ID
  value?: unknown                    // 附带值（如切换到哪个标签）
}
```

事件控制目标组件的 UI 行为：显示/隐藏、打开/关闭弹框、切换标签。

## 规则结构

```typescript
interface WidgetRule {
  watches: WidgetRuleWatch[]         // 监听源列表
  condition: string                  // 判断条件表达式
  actions: WidgetRuleAction[]        // 执行动作列表
}

interface WidgetRuleWatch {
  type: 'field' | 'action' | 'dialog-callback'
  source: string                     // 字段名 / 动作名 / 弹窗ID
}

interface WidgetRuleAction {
  type: 'fetch-data' | 'set-value' | 'submit' | 'validate' | 'reset'
  config: Record<string, unknown>    // 动作配置（API地址、目标字段、参数等）
  onSuccess?: SchemaEventAction[]    // 成功回调
  onError?: SchemaEventAction[]      // 失败回调
}
```

规则监听字段值变化、动作执行、弹框回调结果，判断条件后执行数据获取、提交等业务逻辑。

## 可见性控制优先级

```
hidden = true     → 设计时强制隐藏，渲染器不渲染
rules.condition   → 运行时条件控制，根据规则动态显示/隐藏
events.hide       → 运行时事件触发，点击按钮后隐藏
```
