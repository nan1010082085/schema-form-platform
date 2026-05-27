# 流程配置指南

## 流程定义与版本管理

### 流程定义（FlowDefinition）

流程定义是流程配置的顶层资源，包含名称、描述、分类等元信息，以及当前发布版本的引用。

```typescript
interface FlowDefinition {
  _id: string           // UUID 主键
  name: string          // 流程名称
  description?: string  // 描述
  category?: string     // 分类
  status: 'draft' | 'published' | 'archived'
  currentVersionId?: string  // 当前发布版本 ID
  createdBy: string    // 创建人
  permissions: {
    editors: string[]   // 可编辑此流程的用户 ID 列表
    launchers: string[] // 可发起此流程的用户 ID 列表（空=所有人）
    viewers: string[]   // 可查看此流程的用户 ID 列表
  }
  createdAt: Date
  updatedAt: Date
}
```

状态流转：`draft` → `published` → `archived`

### 流程权限配置

通过设计器工具栏的「设置」按钮可配置流程级权限：

| 权限类型 | 说明 | 空列表行为 |
|---|---|---|
| 编辑权限（editors） | 可修改流程定义、保存版本、发布 | 空=所有已登录用户可编辑 |
| 发起权限（launchers） | 可发起此流程的新实例 | 空=所有已登录用户可发起 |
| 查看权限（viewers） | 可查看流程定义和实例详情 | 空=所有已登录用户可查看 |

创建人始终拥有全部权限，不受限制。

节点级人员配置通过属性面板的「指派方式」设置：

| 指派方式 | 说明 | 配置字段 |
|---|---|---|
| 指定用户 | 直接选择审批人列表 | `candidateUsers: string[]` |
| 指定角色 | 按角色分配任务 | `candidateRoles: string[]` |
| 表达式 | 通过表达式动态计算审批人 | `assignee: string` |

### 流程校验

保存和发布前自动执行校验，规则如下：

| 规则 | 级别 | 说明 |
|---|---|---|
| 开始事件唯一 | error | 必须有且仅有一个 startEvent |
| 结束事件存在 | error | 至少有一个 endEvent |
| 节点连通性 | error | 所有节点必须连接到至少一条连线 |
| 排他网关条件 | error | 出线 >= 2 时必须有默认连线或所有出线都有条件 |
| 用户任务审批人 | error | 必须配置 assigneeType + 对应的审批人 |
| 定时事件配置 | error | 必须配置 timerType + timerValue |
| 子流程关联 | error | 必须配置 subProcessDefinitionId |
| 网关出线数量 | warning | 出线少于 2 条时提示可能不需要网关 |

### 连线配置

排他网关的出线需要配置条件表达式或标记为默认连线：

| 字段 | 说明 |
|---|---|
| `label` | 连线标签（显示在画布上） |
| `conditionExpression` | 条件表达式，使用 `${expr}` 语法，引用实例变量 |
| `isDefault` | 默认连线，当所有条件都不匹配时走此线 |

### 版本管理（FlowVersion）

每次保存流程图都会创建新版本，版本号自动递增。发布时将最新版本设为当前版本。

```typescript
interface FlowVersion {
  _id: string
  definitionId: string   // 关联的流程定义 ID
  version: number        // 版本号（自动递增，从 1 开始）
  graph: FlowGraph       // 流程图数据（节点 + 连线）
  metadata?: FlowGraphMetadata  // 元数据（视口、全局驳回策略等）
  createdAt: Date
  updatedAt: Date
}
```

`FlowGraph` 结构：

```typescript
interface FlowGraph {
  nodes: FlowNodeData[]  // 节点列表
  edges: FlowEdgeData[]  // 连线列表
}

interface FlowNodeData {
  id: string
  shape: string
  x: number; y: number
  width: number; height: number
  data: BpmnNodeConfig   // 节点配置
}

interface FlowEdgeData {
  id: string
  shape: string
  source: { cell: string; port?: string }
  target: { cell: string; port?: string }
  data: {
    label?: string
    conditionExpression?: string  // 条件表达式
    isDefault?: boolean           // 是否为默认流向
  }
}
```

`FlowGraphMetadata`：

```typescript
interface FlowGraphMetadata {
  viewport?: { x: number; y: number; zoom: number }
  defaultRejectPolicy?: RejectPolicy  // 全局驳回策略
}
```

---

## 节点类型总览

`BpmnElementType` 枚举定义了所有支持的节点类型：

| 枚举值 | 说明 | 默认尺寸 |
|---|---|---|
| `startEvent` | 开始事件 | 36×36 |
| `endEvent` | 结束事件 | 36×36 |
| `timerEvent` | 定时事件 | 36×36 |
| `userTask` | 用户任务 | 160×80 |
| `serviceTask` | 服务任务 | 160×80 |
| `scriptTask` | 脚本任务 | 160×80 |
| `sendTask` | 发送任务 | 160×80 |
| `receiveTask` | 接收任务 | 160×80 |
| `exclusiveGateway` | 排他网关 | 40×40 |
| `parallelGateway` | 并行网关 | 40×40 |
| `inclusiveGateway` | 包含网关 | 40×40 |
| `subProcess` | 子流程 | 300×200 |

---

## 节点属性配置（BpmnNodeConfig）

每个节点的 `data` 字段为 `BpmnNodeConfig` 类型：

```typescript
interface BpmnNodeConfig {
  bpmnType: BpmnElementType
  label: string

  // 人员配置
  assigneeType?: 'user' | 'role' | 'expression'
  assignee?: string
  assigneeCollection?: string   // 变量名，存储多人列表

  // 审批配置
  approvalMode?: 'single' | 'countersign' | 'or-sign'
  minApprovalCount?: number     // 会签时的最少通过人数
  rejectPolicy?: 'reject-on-all' | 'reject-on-any' | 'follow-global'

  // 表单配置
  formSchemaId?: string
  formVersion?: string
  formMode?: 'create' | 'prefill' | 'readonly'
  formVariable?: string         // 表单数据写入实例变量的 key

  // 服务/脚本配置
  serviceType?: 'http' | 'function' | 'script'
  serviceConfig?: Record<string, unknown>

  // 网关配置
  gatewayDirection?: 'converging' | 'diverging'
  defaultFlow?: string          // 默认流向边 ID

  // 子流程
  subProcessDefinitionId?: string

  // 定时器
  timerType?: 'duration' | 'date' | 'cycle'
  timerValue?: string           // ISO 8601 格式

  // 脚本
  scriptLanguage?: string
  scriptContent?: string

  // 消息
  messageRef?: string

  // 多实例
  multiInstance?: MultiInstanceConfig

  // 文档
  documentation?: string
}
```

---

## 审批模式

`approvalMode` 仅对 `userTask` 节点生效，控制多人审批时的通过逻辑。

| 模式 | 说明 | 通过条件 |
|---|---|---|
| `single` | 单人审批（默认） | 认领人完成任务即通过 |
| `countersign` | 会签 | 已完成人数 >= `minApprovalCount`（默认等于总人数） |
| `or-sign` | 或签 | 任意一人审批通过即通过 |

**会签示例**：

- 5 人参与审批，`minApprovalCount = 3`
- 前 3 人通过后，剩余 2 人的待办自动取消

**或签示例**：

- 3 人参与审批，任意 1 人通过后，其余待办自动取消

---

## 驳回策略

`rejectPolicy` 控制审批被拒绝时的处理方式，适用于 `or-sign` 等多人审批场景。

| 策略 | 说明 |
|---|---|
| `reject-on-all` | 所有人都拒绝才驳回（默认） |
| `reject-on-any` | 任一人拒绝即驳回 |
| `follow-global` | 跟随流程级全局配置 |

**配置优先级**：

1. 节点级 `rejectPolicy`（`follow-global` 时回退到全局）
2. `FlowGraphMetadata.defaultRejectPolicy`（流程级，默认 `reject-on-all`）

---

## 表单集成

用户任务节点可绑定表单 Schema，驱动审批时的表单渲染。

| 字段 | 说明 |
|---|---|
| `formSchemaId` | 绑定的表单 Schema ID |
| `formVersion` | 表单版本号 |
| `formMode` | `create`（新建）/ `prefill`（预填充）/ `readonly`（只读） |
| `formVariable` | 审批提交的表单数据写入实例变量的 key |

`formVariable` 的作用：审批人提交表单后，表单数据（字段摘要）会以 `formVariable` 为 key 写入流程实例的 `variables`，后续节点可通过表达式引用。

---

## 人员配置

| 字段 | 说明 |
|---|---|
| `assigneeType` | `user`（指定用户）/ `role`（按角色）/ `expression`（表达式计算） |
| `assignee` | 指定的用户 ID 或角色 ID |
| `assigneeCollection` | 变量名，指向 `variables` 中的用户 ID 数组（用于多人审批） |

`assigneeCollection` 优先级高于 `assignee`。设置后，引擎从 `instance.variables[collection]` 读取用户列表。

---

## 网关配置

### 排他网关（exclusiveGateway）

条件路由，每条出线可配置条件表达式，命中第一条即转向，未命中则走 `defaultFlow`。

```typescript
// 连线配置
{
  conditionExpression: "amount > 10000",  // 条件表达式
  isDefault: false
}
```

`evaluateExpression` 使用实例变量进行求值。

### 并行网关（parallelGateway）

- **发散（diverging）**：将 Token 分裂为多条并行分支
- **汇聚（converging）**：等待所有分支 Token 到达后合并，产生新 Token 继续推进

### 包含网关（inclusiveGateway）

当前实现与排他网关逻辑一致（条件表达式 + 默认流向），未来将支持多条件同时满足时并行分叉。

---

## 子流程

`subProcess` 节点通过 `subProcessDefinitionId` 引用另一个已发布的流程定义，启动时创建子流程实例。

- 子流程实例的 `parentInstanceId` 指向父流程
- 子流程完成后，父流程 Token 自动推进
- 子流程的 `variables` 会合并回父流程

---

## 定时器

定时事件节点通过 `timerType` + `timerValue` 配置延时触发。

| timerType | timerValue 格式 | 说明 |
|---|---|---|
| `duration` | ISO 8601 Duration | 延时触发，如 `PT30M`（30 分钟）、`P1D`（1 天） |
| `date` | ISO 8601 DateTime | 定时触发，如 `2026-06-01T10:00:00Z` |
| `cycle` | ISO 8601 Duration | 循环触发（当前按单次延时处理） |

ISO 8601 Duration 格式：`P[nY][nM][nD][T[nH][nM][nS]]`

示例：
- `PT30M` — 30 分钟
- `PT1H` — 1 小时
- `P1D` — 1 天
- `P1DT12H` — 1 天 12 小时
- `PT1H30M` — 1 小时 30 分钟

---

## 服务任务

`serviceTask` 节点通过 `serviceType` 指定执行类型：

| serviceType | 说明 |
|---|---|
| `http` | HTTP 请求调用 |
| `function` | 函数调用 |
| `script` | 脚本执行 |

`serviceConfig` 存储具体配置（URL、参数、脚本内容等），结构由 `serviceType` 决定。

---

## 多实例配置

`multiInstance` 用于将单个任务节点展开为多个并行或串行实例：

```typescript
interface MultiInstanceConfig {
  type: 'sequential' | 'parallel'  // 串行或并行
  collection: string               // 变量名，指向实例列表
}
```
