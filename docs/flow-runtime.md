# 运行时手册

## 引擎核心架构

流程引擎由三个核心组件协作：

| 组件 | 职责 |
|---|---|
| `FlowEngine` | 引擎主控，负责 Token 推进、节点执行、状态流转 |
| `TaskService` | 任务管理，负责认领、委派、查询待办 |
| `TimerService` | 定时器解析，将 ISO 8601 转换为触发时间 |

`FlowEngine.advance()` 是核心推进循环：遍历所有 `active` 状态的 Token，根据节点类型执行对应逻辑，直到没有 Token 变化或达到最大迭代次数（100 次防死循环）。

---

## Token 模型

Token 是引擎推进的执行单元，每个 Token 代表流程图上的一条执行路径。

```typescript
interface FlowToken {
  tokenId: string
  nodeId: string         // 当前所在节点
  parentTokenId?: string // 父 Token（用于子流程）
  state: 'active' | 'waiting' | 'completed'
  createdAt: Date
}
```

| 状态 | 说明 |
|---|---|
| `active` | 可被引擎推进，到达节点后立即执行 |
| `waiting` | 等待外部事件（用户审批、定时器触发等），暂停推进 |
| `completed` | 已完成，不再参与推进 |

**Fork/Join 机制**：

- **并行网关（发散）**：一个 Token 产生多个 `active` Token，分别进入各分支
- **并行网关（汇聚）**：等待所有分支 Token 到达后合并，所有到达的 Token 变为 `completed`，产生一个新 `active` Token 继续推进

---

## 实例生命周期

```
start → running → completed
                   ↘ terminated
                   ↘ suspended → running（resume）
                   ↘ failed
```

| 状态 | 说明 |
|---|---|
| `running` | 流程正在执行 |
| `completed` | 所有 Token 都已到达结束节点 |
| `terminated` | 被手动终止，所有待办任务和定时器自动取消 |
| `suspended` | 挂起状态，不推进 Token，可恢复 |
| `failed` | 执行异常 |

启动实例时，引擎在 startEvent 创建一个 `active` Token，然后自动调用 `advance()` 推进。

---

## 节点执行行为

| 节点类型 | 执行逻辑 |
|---|---|
| `startEvent` | 将 Token 移动到下一个节点 |
| `endEvent` | Token 标记为 `completed`，若所有 Token 完成则实例结束 |
| `timerEvent` | 创建 TimerJob，Token 进入 `waiting` 状态，定时器到期后恢复 |
| `userTask` | 根据 `approvalMode` 创建 TaskInstance，Token 进入 `waiting` |
| `serviceTask` | 立即完成，产生新 Token 继续推进 |
| `scriptTask` | 当前为透传（TODO Phase 5），直接完成并推进 |
| `sendTask` | 当前为透传（TODO Phase 5），直接完成并推进 |
| `receiveTask` | 创建 TaskInstance 等待外部消息确认 |
| `exclusiveGateway` | 评估条件表达式，选择第一条匹配的出线，未匹配走默认流向 |
| `parallelGateway` | 发散：分裂 Token；汇聚：等待所有分支到达后合并 |
| `inclusiveGateway` | 当前与排他网关逻辑一致（TODO Phase 5 支持多条件并行） |
| `subProcess` | 启动子流程实例，等待子流程完成后推进父流程 |

---

## 审批流程

### 单人审批（single）

1. 引擎创建一个 `pending` 状态的 TaskInstance
2. 审批人调用 `POST /api/flow-tasks/:id/claim` 认领任务，状态变为 `claimed`
3. 审批人调用 `POST /api/flow-tasks/:id/complete` 完成任务，提交 `formData` 和 `outcome`
4. 引擎将对应 Token 从 `waiting` 变为 `active`，调用 `advance()` 继续推进

### 会签（countersign）

1. 引擎根据 `assigneeCollection` 或 `assignee` 创建多个 TaskInstance
2. 每个审批人独立认领和完成
3. 引擎在每次 `completeTask` 时检查：已完成数 >= `minApprovalCount` 时，取消剩余待办，Token 继续推进

### 或签（or-sign）

1. 引擎创建多个 TaskInstance
2. 任意一人完成且 outcome 为通过时，取消剩余待办，Token 继续推进
3. 如果 `rejectPolicy` 为 `reject-on-any`，一人拒绝即取消全部并推进

### 委派

审批人可调用 `POST /api/flow-tasks/:id/delegate` 将任务委派给其他人，任务的 `assignee` 变为目标用户，状态变为 `delegated`。

---

## 权限体系

### 流程级权限

FlowDefinition 的 `permissions` 字段控制谁能编辑、发起、查看流程：

| 权限类型 | 空列表行为 | 检查点 |
|---|---|---|
| `editors` | 所有已登录用户可编辑 | PUT/DELETE/publish 路由 |
| `launchers` | 所有已登录用户可发起 | POST /api/flow-instances |
| `viewers` | 所有已登录用户可查看 | GET /api/flow-instances |

创建人（`createdBy`）始终拥有编辑和查看权限，不受限制。

### 节点级人员配置

UserTask 节点通过 `assigneeType` 决定任务分配方式：

| assigneeType | 引擎行为 | 配置字段 |
|---|---|---|
| `user` | 使用 `candidateUsers` 作为候选用户列表 | `candidateUsers: string[]` |
| `role` | 使用 `candidateRoles` 作为候选角色列表 | `candidateRoles: string[]` |
| `expression` | 求值 `assignee` 表达式，结果作为候选用户 | `assignee: string` |
| 默认 | 使用 `assignee` 单值作为候选用户 | `assignee: string` |

### 任务操作权限

| 操作 | 权限检查 |
|---|---|
| claim | 用户必须在 `candidateUsers` 列表中 |
| complete | 用户必须是任务的 `assignee` |
| delegate | 用户必须是任务的 `assignee` |

---

## 审批日志

每次审批操作都会写入 `ApprovalLog`：

```typescript
interface ApprovalLogEntry {
  id: string
  instanceId: string
  nodeId: string
  nodeName: string
  taskId: string
  action: 'claim' | 'approve' | 'reject' | 'delegate' | 'comment'
  operator: string    // 操作人
  comment?: string
  outcome?: string    // approved / rejected
  createdAt: Date
}
```

通过 `GET /api/flow-approvals?instanceId=xxx` 查询审批轨迹。

---

## API 接口

### 流程定义 CRUD

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/flows` | 流程列表（支持 search、status、分页） |
| `POST` | `/api/flows` | 创建流程（需认证） |
| `GET` | `/api/flows/:id` | 流程详情 |
| `PUT` | `/api/flows/:id` | 更新流程 |
| `DELETE` | `/api/flows/:id` | 删除流程（级联删除版本、实例、任务） |
| `POST` | `/api/flows/:id/publish` | 发布最新版本（需认证） |

### 版本管理

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/flows/:definitionId/versions` | 版本列表（不含 graph 数据） |
| `POST` | `/api/flows/:definitionId/versions` | 保存新版本（需认证） |
| `GET` | `/api/flows/:definitionId/versions/latest` | 最新版本 |
| `GET` | `/api/flows/:definitionId/versions/:versionId` | 指定版本详情 |

### 流程实例

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/flow-instances` | 实例列表（支持 definitionId、status、分页） |
| `POST` | `/api/flow-instances` | 启动实例（需认证） |
| `GET` | `/api/flow-instances/:id` | 实例详情 |
| `POST` | `/api/flow-instances/:id/terminate` | 终止实例 |
| `POST` | `/api/flow-instances/:id/suspend` | 挂起实例 |
| `POST` | `/api/flow-instances/:id/resume` | 恢复实例 |

### 任务管理

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/flow-tasks/my` | 我的待办（分页） |
| `GET` | `/api/flow-tasks/:id` | 任务详情 |
| `POST` | `/api/flow-tasks/:id/claim` | 认领任务 |
| `POST` | `/api/flow-tasks/:id/complete` | 完成任务（body: `{ formData?, outcome? }`） |
| `POST` | `/api/flow-tasks/:id/delegate` | 委派任务（body: `{ targetUserId }`） |

### 审批轨迹

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/flow-approvals?instanceId=xxx` | 查询实例的审批日志 |

### 用户

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/users?q=xxx` | 搜索用户（按 username/displayName 匹配） |
| `GET` | `/api/users/:id` | 获取单个用户信息 |

### 定时器

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/flow-timers/check` | 检查并触发到期定时器（Vercel Cron 调用） |

---

## 数据模型

### FlowDefinition

| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | UUID 主键 |
| `name` | string | 流程名称 |
| `description` | string | 描述 |
| `category` | string | 分类 |
| `status` | enum | `draft` / `published` / `archived` |
| `currentVersionId` | string | 当前发布版本 ID |
| `createdBy` | string | 创建人 |
| `permissions` | object | `{ editors: string[], launchers: string[], viewers: string[] }` |

索引：`name`、`status`、`createdBy`

### FlowVersion

| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | UUID 主键 |
| `definitionId` | string | 关联流程定义 |
| `version` | number | 版本号 |
| `graph` | FlowGraph | 节点 + 连线数据 |
| `metadata` | FlowGraphMetadata | 视口、全局驳回策略等 |

索引：`definitionId + version`（唯一复合索引）

### FlowInstance

| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | UUID 主键 |
| `definitionId` | string | 流程定义 ID |
| `versionId` | string | 流程版本 ID |
| `version` | number | 版本号快照 |
| `status` | enum | `running` / `completed` / `terminated` / `suspended` / `failed` |
| `variables` | Record<string, unknown> | 流程变量 |
| `tokens` | FlowToken[] | Token 列表 |
| `initiatedBy` | string | 发起人 |
| `parentInstanceId` | string | 父流程实例 ID（子流程时有值） |
| `parentTokenId` | string | 父 Token ID |
| `startedAt` | Date | 启动时间 |
| `completedAt` | Date | 完成时间 |

索引：`definitionId`、`parentInstanceId`、`status + updatedAt`

### TaskInstance

| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | UUID 主键 |
| `instanceId` | string | 关联流程实例 |
| `nodeId` | string | 节点 ID |
| `nodeName` | string | 节点名称 |
| `status` | enum | `pending` / `claimed` / `completed` / `cancelled` / `delegated` |
| `assignee` | string | 认领人 |
| `candidateUsers` | string[] | 候选用户 |
| `candidateRoles` | string[] | 候选角色 |
| `formData` | Record<string, unknown> | 表单数据 |
| `formSchemaId` | string | 表单 Schema ID |
| `formVersion` | string | 表单版本 |
| `outcome` | string | 审批结果（approved / rejected） |
| `dueDate` | Date | 到期时间 |
| `priority` | number | 优先级（默认 1） |
| `multiInstanceIndex` | number | 多实例序号 |
| `multiInstanceItem` | unknown | 多实例项数据 |

索引：`assignee + status`、`candidateUsers + status`、`instanceId + nodeId + status`

### ApprovalLog

| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | UUID 主键 |
| `instanceId` | string | 流程实例 ID |
| `nodeId` | string | 节点 ID |
| `nodeName` | string | 节点名称 |
| `taskId` | string | 任务 ID |
| `action` | string | `claim` / `approve` / `reject` / `delegate` / `comment` |
| `operator` | string | 操作人 |
| `comment` | string | 评论 |
| `outcome` | string | 审批结果 |

索引：`instanceId + createdAt`

### TimerJob

| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | UUID 主键 |
| `instanceId` | string | 流程实例 ID |
| `tokenId` | string | 关联 Token ID |
| `nodeId` | string | 节点 ID |
| `fireAt` | Date | 触发时间 |
| `status` | enum | `pending` / `fired` / `cancelled` |
| `timerType` | string | 定时器类型 |
| `timerValue` | string | 定时器值 |

索引：`instanceId`、`status + fireAt`

---

## Vercel 部署

### Cron 配置

在 `vercel.json` 中配置定时任务，定期触发定时器检查：

```json
{
  "crons": [
    {
      "path": "/api/flow-timers/check",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

该端点幂等安全：重复调用不会产生副作用，因为已触发的 job 状态为 `fired`。

### 单 Serverless Function

所有 flow 路由挂载在同一个 Koa app 实例上，通过 Vercel Serverless Function 入口 `api/index.ts` 统一导出。路由前缀统一为 `/api/flow-*`。
