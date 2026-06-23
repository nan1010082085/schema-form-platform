# 组件架构

## 分层结构

```
src/
├── views/           # 页面视图（EditorView、InstancesView 等）
├── components/      # 通用组件
│   ├── Editor/      # 编辑器子模块（35 个）
│   └── WidgetRenderer/  # Schema 渲染引擎
├── widgets/         # Widget 定义（49 个组件）
│   ├── base/        # 类型定义、公共 schema
│   ├── layout/      # 布局组件
│   ├── container/   # 容器组件
│   ├── form/        # 表单组件
│   ├── table/       # 表格组件
│   ├── action/      # 操作组件
│   ├── static/      # 静态组件
│   ├── business/    # 业务组件
│   └── chart/       # 图表组件
├── composables/     # 组合式 API（32 个）
├── stores/          # Pinia Store（7 个）
├── engine/          # 事件引擎
└── utils/           # 工具函数
```

## Widget 系统

Widget 是核心抽象。每个 Widget 由 `widgets/` 下的目录定义，通过 `registry.ts` 注册。

### Widget 接口

```ts
interface Widget {
  id: string          // {type}_{5位随机hash}
  name: string        // 组件名（如 'FgInput'）
  type: SchemaType    // 类型（49 种）
  label?: string      // 标签
  field?: string      // 表单字段名
  position: { x, y, w, h, zIndex? }  // 绝对定位
  style: Record<string, unknown>      // 样式
  props: Record<string, unknown>      // 属性
  options: DictItem[]                 // 选项
  children: Widget[]                  // 子组件
  events: WidgetEvent[]               // 事件配置
  variables: Variable[]               // 变量
  rules: Rule[]                       // 联动规则
  validationRules: ValidationRule[]   // 校验规则
}
```

### Widget ID 格式

`{type}_{5位随机hash}`，如 `input_a3b2c`、`table_x9y8z`。

### 注册表

`widgets/registry.ts`：`Map<SchemaType, WidgetRegistryItem>`

```ts
registerWidget(type, config, create)  // 注册
getWidget(type)                       // 获取
createWidget(type, id)                // 创建实例
generateWidgetId(type)                // 生成 ID
getComponentMap()                     // 获取组件映射（渲染用）
```

## 渲染引擎

`components/WidgetRenderer/` — Schema 驱动的动态渲染。

- `SchemaRender.vue` — 顶层入口，遍历 Widget 数组
- `SchemaNode.vue` — 单个 Widget 渲染，递归处理 children
- `WidgetNode.vue` — Widget 组件包装器，处理定位和事件

渲染流程：
```
Schema[] → SchemaRender → SchemaNode* → WidgetNode* → 实际组件
```

## 事件引擎

`engine/eventEngine.ts` — 14 种事件动作类型：

| 动作 | 说明 |
|------|------|
| `set-value` | 设置字段值 |
| `show-message` | 显示消息 |
| `navigate` | 路由跳转 |
| `request` | 发起请求 |
| `open-dialog` | 打开弹窗 |
| `close-dialog` | 关闭弹窗 |
| `set-visible` | 控制显隐 |
| `set-disabled` | 控制禁用 |
| `validate` | 触发校验 |
| `reset` | 重置表单 |
| `refresh` | 刷新数据 |
| `custom` | 自定义脚本 |
| `linkage` | 联动赋值 |
| `emit` | 发送事件 |
