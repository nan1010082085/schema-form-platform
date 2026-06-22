# 平台集成指南

> schema-form-platform 三大基础能力平台的外部集成说明

## 平台总览

| 平台 | 包名 | 能力 | 端口 |
|------|------|------|------|
| **Editor** | `@schema-form/editor-web` | Schema 驱动的可视化表单设计器与渲染器 | 5100 |
| **Flow** | `@schema-form/flow-web` | BPMN 2.0 流程设计器、流程管理、任务审批 | 5200 |
| **AI** | `@schema-form/ai-app` | AI 对话式 Schema/Flow 生成、多 Agent 协作 | 5300 |

---

## 一、Editor（表单设计器）

### 1.1 能力概述

- 可视化拖拽设计表单（49 种 Widget，8 个分组）
- Schema JSON 驱动渲染，支持自由布局
- 事件引擎（14 种动作类型）、联动系统、数据绑定
- 表单预览、发布、数据收集

### 1.2 集成方式

#### 方式一：qiankun 微前端子应用

```js
// 宿主应用注册
import { registerMicroApps } from 'qiankun'

registerMicroApps([{
  name: 'editor',
  entry: '//localhost:5100',
  container: '#micro-app-container',
  activeRule: '/editor',
  props: { getToken: () => localStorage.getItem('token') },
}])
```

子应用自动检测运行环境：
- qiankun 环境 → 使用 `qiankun` 生命周期
- 独立环境 → 直接挂载

#### 方式二：Micro-app 容器

```html
<micro-app name="editor" url="http://localhost:5100" />
```

#### 方式三：API 集成

后端 REST API（端口 3001）：

```
GET    /api/schemas          # 列表
POST   /api/schemas          # 创建
GET    /api/schemas/:id      # 详情
PUT    /api/schemas/:id      # 更新
DELETE /api/schemas/:id      # 删除
POST   /api/schemas/:id/publish  # 发布
```

Schema 数据结构：

```typescript
interface FormSchema {
  _id: string           // UUID
  name: string
  type: 'form' | 'search_list'
  status: 'draft' | 'published'
  json: Widget[]        // Widget 树结构
  publishId?: string
}
```

### 1.3 Widget 渲染

外部项目可独立使用渲染器（不依赖编辑器）：

```vue
<WidgetRenderer :widgets="schema.json" :data="formData" />
```

### 1.4 详细文档

- [组件架构](../packages/editor/docs/architecture.md)
- [Widget 开发](../packages/editor/docs/widget-development.md)
- [属性面板](../packages/editor/docs/property-panel.md)
- [Store 设计](../packages/editor/docs/store-design.md)
- [微前端集成](../packages/editor/docs/qiankun-integration.md)

---

## 二、Flow（流程引擎）

### 2.1 能力概述

- BPMN 2.0 可视化流程设计器（25 种节点）
- 流程定义、版本管理、发布
- 流程实例、任务收件箱、审批操作
- 流程监控、数据统计
- BPMN XML 导入/导出
- 流程模板库

### 2.2 集成方式

#### 方式一：qiankun 微前端子应用

```js
registerMicroApps([{
  name: 'flow',
  entry: '//localhost:5200',
  container: '#micro-app-container',
  activeRule: '/flow',
}])
```

#### 方式二：嵌入式预览（postMessage 协议）

在 Editor 宿主中嵌入流程预览：

```html
<iframe src="/flow/embed/preview?instanceId=xxx" />
```

通过 postMessage 控制高亮节点：

```js
iframe.contentWindow.postMessage({
  type: 'highlight-node',
  nodeId: 'task-1',
}, '*')
```

#### 方式三：API 集成

后端 REST API：

```
# 流程定义
GET    /api/flows            # 列表
POST   /api/flows            # 创建
PUT    /api/flows/:id        # 更新（含缩略图）
POST   /api/flows/:id/versions  # 保存版本

# 流程实例
POST   /api/flow-instances           # 发起流程
GET    /api/flow-instances/:id       # 实例详情
GET    /api/flow-instances/:id/graph # 流程图数据
GET    /api/flow-instances/:id/state # 执行状态

# 任务
GET    /api/flow-tasks               # 我的任务
POST   /api/flow-tasks/:id/complete  # 完成任务
POST   /api/flow-tasks/:id/delegate  # 委派
POST   /api/flow-tasks/:id/reject    # 驳回

# 模板
GET    /api/flow-templates           # 模板列表
POST   /api/flow-templates/seed      # 初始化内置模板
POST   /api/flow-templates/from-flow/:id  # 保存为模板
POST   /api/flow-templates/:id/apply      # 从模板创建
```

### 2.3 FlowGraph 数据结构

```typescript
interface FlowGraph {
  nodes: FlowNodeData[]
  edges: FlowEdgeData[]
}

interface FlowNodeData {
  id: string
  shape: 'bpmn-start-event' | 'bpmn-user-task' | 'bpmn-exclusive-gateway' | ...
  x: number; y: number; width: number; height: number
  data: {
    bpmnType: BpmnElementType
    label: string
    assigneeType?: 'user' | 'role' | 'expression'
    assignee?: string
    // ... 其他节点配置
  }
}

interface FlowEdgeData {
  id: string
  source: { cell: string }
  target: { cell: string }
  data: { label?: string; conditionExpression?: string }
}
```

### 2.4 嵌入式路由

| 路由 | 用途 | 参数 |
|------|------|------|
| `/embed/preview` | 流程图预览 | `?instanceId=xxx` |
| `/embed/task-list` | 任务列表 | — |
| `/embed/approval-log` | 审批日志 | `?instanceId=xxx` |

### 2.5 详细文档

- [流程节点](../packages/flow/docs/flow-nodes.md)
- [流程运行时](../packages/flow/docs/flow-runtime.md)
- [流程配置](../packages/flow/docs/flow-configuration.md)

---

## 三、AI（智能助手）

### 3.1 能力概述

- 对话式 Schema/Flow 生成
- 多 Agent 协作（Router/Editor/Flow/Page/General）
- SSE 流式输出
- MCP 协议（3 个 MCP Server）
- RAG 检索增强
- 图片上传识别生成表单

### 3.2 集成方式

#### 方式一：qiankun 微前端子应用

```js
registerMicroApps([{
  name: 'ai',
  entry: '//localhost:5300',
  container: '#micro-app-container',
  activeRule: '/ai',
}])
```

#### 方式二：SSE 流式 API

```js
const eventSource = new EventSource('/api/ai/chat/stream', {
  // POST body 通过其他方式传递
})

eventSource.addEventListener('text_delta', (e) => {
  const { delta } = JSON.parse(e.data)
  // 追加文本
})

eventSource.addEventListener('schema_update', (e) => {
  const { schema } = JSON.parse(e.data)
  // 更新 Schema 预览
})

eventSource.addEventListener('done', () => {
  eventSource.close()
})
```

#### 方式三：MCP 协议

AI 平台暴露 3 个 MCP Server，可供外部 Agent 调用：

| Server | 命名空间 | 能力 |
|--------|---------|------|
| Schema Server | `schema__*` | CRUD Schema、搜索、验证 |
| Flow Server | `flow__*` | CRUD 流程定义、发起实例、完成任务 |
| Widget Server | `widget__*` | 查询 Widget、获取配置、预览 |

```typescript
// MCP Client 调用示例
const result = await mcpClient.callTool('schema__search_schemas', {
  query: '用户注册',
  limit: 5,
})
```

#### 方式四：SDK 集成

独立使用 AI Agent SDK：

```typescript
import { BaseAgent, ToolRegistry } from '@schema-form/ai-sdk'

const agent = new BaseAgent({
  name: 'my-agent',
  llm: { provider: 'openai', model: 'gpt-4' },
  tools: myTools,
})

const result = await agent.run('创建一个用户注册表单')
```

### 3.3 事件协议

SSE 流式输出的事件类型：

| 事件 | 说明 | 数据 |
|------|------|------|
| `text_delta` | 文本增量 | `{ delta: string }` |
| `thinking_delta` | 思考过程 | `{ delta: string }` |
| `schema_update` | Schema 更新 | `{ schema: Widget[] }` |
| `flow_update` | 流程图更新 | `{ graph: FlowGraph }` |
| `tool_call` | 工具调用 | `{ name, args }` |
| `tool_result` | 工具结果 | `{ name, result }` |
| `agent_switch` | Agent 切换 | `{ from, to }` |
| `interrupt` | 需要确认 | `{ question, options }` |
| `done` | 完成 | `{ summary }` |
| `error` | 错误 | `{ message, code }` |

### 3.4 详细文档

- [架构总览](../packages/ai/docs/architecture.md)
- [Agent 系统](../packages/ai/docs/agent.md)
- [工具系统](../packages/ai/docs/tool.md)
- [MCP 协议](../packages/ai/docs/mcp.md)
- [事件协议](../packages/ai/docs/events.md)

---

## 四、跨平台协作

### 4.1 AI + Editor

AI 生成 Schema → Editor 渲染预览 → 用户调整 → 保存

```
用户对话 → AI Agent → schema_create tool → Schema JSON → Editor 预览
```

### 4.2 AI + Flow

AI 生成流程图 → Flow 设计器预览 → 用户调整 → 保存

```
用户对话 → AI Agent → flow_create_definition tool → FlowGraph → Flow 预览
```

### 4.3 Editor + Flow

表单绑定到流程节点 → 流程中嵌入表单填写

```
流程节点配置 formSchemaId → 运行时加载 Schema → MicroFormEmbed 渲染表单
```

### 4.4 三平台联调

```bash
pnpm dev  # 同时启动三个平台
# Editor: http://localhost:5100
# Flow:   http://localhost:5200
# AI:     http://localhost:5300
# Server: http://localhost:3001
```

---

## 五、共享资源

| 包名 | 用途 |
|------|------|
| `@schema-form/shared-components` | 公共 UI 组件（AppIcon、AppDialog 等） |
| `@schema-form/shared-styles` | 设计令牌、全局样式 |
| `@schema-form/shared-stores` | 跨项目共享 Store |
| `@schema-form/shared-utils` | 公共工具函数 |
| `@schema-form/socket` | WebSocket 通信（AI 实时同步） |
| `@schema-form/flow-shared` | Flow 类型定义、BPMN 引擎 |
