# @schema-form/flow

BPMN 2.0 流程设计器与引擎，支持可视化流程编排、BPMN XML 导入导出、流程监控。

## 项目定位

Schema Form 平台的流程引擎模块，提供企业级 BPMN 流程设计能力，与表单设计器深度集成，支持流程节点嵌入表单预览。

## 技术栈

### 共享层 (`packages/platform/flow/shared`)
- TypeScript 5.7
- BPMN 2.0 类型系统
- XML 解析/生成引擎

### 前端 (`packages/platform/flow/web`)
- Vue 3.5 Composition API + `<script setup>`
- Vue Flow（流程图画布）
- Element Plus 2.9
- Pinia 状态管理（nodes/edges 使用 shallowRef 优化性能）
- CSS Modules 样式隔离
- Socket 通信（@schema-form/platform-shared/socket）

## 核心功能

### BPMN 节点体系（25 种节点）

| 分类 | 节点类型 |
|---|---|
| **事件** | StartEvent, EndEvent, TimerEvent, MessageEvent, SignalEvent, ConditionalEvent, ErrorEvent, EscalationEvent, CompensationEvent |
| **任务** | UserTask, ServiceTask, ScriptTask, SendTask, ReceiveTask, ManualTask, BusinessRuleTask |
| **网关** | ExclusiveGateway, ParallelGateway, InclusiveGateway, EventBasedGateway, ComplexGateway |
| **子流程** | SubProcess, AdHocSubProcess, Transaction, CallActivity |

每个节点包含：
- Vue 组件实现（`.vue`）
- SCSS 样式模块（CSS Modules）
- 属性配置面板
- BPMN 类型映射

### 流程设计器

三栏布局：
- **左侧面板**（FlowPalette）：节点拖拽面板，按分类展示可用节点
- **中间画布**（FlowCanvas）：Vue Flow 流程图画布，支持拖拽、连线、缩放
- **右侧面板**（FlowPropertyPanel）：选中节点的属性配置

工具栏功能：
- 保存/发布
- 撤销/重做
- BPMN XML 导入/导出
- 流程校验
- 自动布局（dagre 算法）
- 预览模式切换
- AI 助手集成

### 流程监控

FlowMonitorDashboard 组件提供：
- 流程实例状态追踪
- 节点执行统计
- 异常告警通知（NotificationBell）

### 表单集成

MicroFormEmbed 组件支持在流程节点中嵌入表单预览：
- 通过 publishId 加载已发布表单
- 支持编辑/只读两种模式
- 表单数据与流程变量双向绑定

### BPMN XML 引擎

**BpmnXmlExporter** — 将 FlowGraph 导出为 BPMN 2.0 XML：
- 支持全部 25 种节点类型
- 自动映射到标准 BPMN 元素
- 扩展属性存储在 `<bpmn:extensionElements>`

**BpmnXmlImporter** — 解析 BPMN 2.0 XML 为 FlowGraph：
- 支持标准 BPMN 2.0 文件导入
- 自动识别节点类型
- 保留扩展属性

## 状态管理（Pinia）

| Store | 说明 |
|---|---|
| `useFlowStore` | 流程图数据、节点/边 CRUD、选中状态 |
| `useEditorStore` | 编辑器交互状态：模式切换、撤销/重做（shallowRef history） |
| `useFlowGraphStore` | nodes/edges 使用 shallowRef，避免深层响应式代理 |
| `useFlowInstanceStore` | 流程实例管理、任务收件箱 |
| `useNotificationStore` | Socket 实时通知 |

### 性能优化

- `nodes`、`edges` 使用 `shallowRef` 避免拖拽时深层响应式追踪
- `history` 使用 `shallowRef`，快照已通过 deepClone 保证不可变性
- Socket 监听器在 `onUnmounted` 中清理，避免资源泄漏

## 组件清单

### 核心组件

| 组件 | 说明 |
|---|---|
| FlowDesigner | 流程设计器主容器 |
| FlowCanvas | Vue Flow 画布 |
| FlowPalette | 节点拖拽面板 |
| FlowPropertyPanel | 属性配置面板 |
| FlowToolbar | 工具栏 |
| FlowSettingsDialog | 流程设置对话框 |
| FlowMonitorDashboard | 流程监控面板 |
| MicroFormEmbed | 表单嵌入组件 |
| NotificationBell | 通知铃铛 |
| UserPicker | 用户选择器 |

### 节点组件（25 个）

位于 `src/components/nodes/`，每个节点独立组件 + 样式模块。

### 边组件

位于 `src/components/edges/`，自定义连线样式。

## 数据结构

### FlowGraph

```typescript
interface FlowGraph {
  nodes: FlowNode[]
  edges: FlowEdge[]
  metadata?: FlowMetadata
}

interface FlowNode {
  id: string
  type: BpmnElementType
  position: { x: number; y: number }
  data: FlowNodeData
}

interface FlowEdge {
  id: string
  source: string
  target: string
  type?: string
  data?: FlowEdgeData
}
```

### BpmnElementType

25 种 BPMN 元素类型枚举，映射到标准 BPMN 2.0 XML 元素。

## 开发

```bash
# 启动 Flow 开发服务器
pnpm dev:flow

# 构建
pnpm build:flow

# 测试
pnpm --filter @schema-form/flow-web test
pnpm --filter @schema-form/flow-shared test
```

## 项目结构

```
packages/platform/flow/
├── shared/                    # @schema-form/flow-shared
│   └── src/
│       ├── types/             # BPMN 类型定义
│       │   ├── graph.ts       # FlowGraph 数据结构
│       │   └── bpmn.ts        # BpmnElementType 枚举
│       └── engine/            # BPMN XML 引擎
│           ├── BpmnXmlExporter.ts
│           └── BpmnXmlImporter.ts
│
├── web/                       # @schema-form/flow-web
│   └── src/
│       ├── api/               # API 聚合层（flowApi.ts）
│       ├── components/
│       │   ├── FlowDesigner.vue    # 主容器（Socket 生命周期管理）
│       │   ├── FlowCanvas.vue
│       │   ├── FlowPalette.vue
│       │   ├── FlowPropertyPanel.vue
│       │   ├── FlowToolbar.vue
│       │   ├── FlowMonitorDashboard.vue
│       │   ├── MicroFormEmbed.vue  # 表单嵌入（loadMicroApp）
│       │   ├── FlowFormRenderer.vue # 表单渲染
│       │   ├── NotificationBell.vue # 通知铃铛
│       │   ├── nodes/         # 25 个 BPMN 节点组件
│       │   ├── edges/         # 自定义边组件
│       │   ├── nodePanels/    # 节点属性面板
│       │   └── panels/        # 通用面板
│       ├── stores/            # Pinia 状态管理（shallowRef 优化）
│       └── views/             # 页面视图
│
└── docs/                      # 流程文档
```

## 与 Editor 的关系

- Flow 节点可嵌入 Editor 表单预览（MicroFormEmbed）
- 共享 @schema-form/shared-ai 元数据
- AI Agent 角色分离：Editor Agent 生成表单 Schema，Flow Agent 生成流程图

## 访问地址

- 本地开发：http://localhost:5174/flow/
- 线上环境：请查看部署配置或 `.env.production`
