# 节点参考

## 1. startEvent — 开始事件

**图标/形状**：圆形，36×36，流程起点。

**配置字段**：

| 字段 | 必填 | 说明 |
|---|---|---|
| `label` | 是 | 节点名称，默认"开始" |

**执行行为**：引擎到达开始事件后，立即将 Token 移动到下一个节点（首条出线的目标节点）。

**使用场景**：每个流程有且仅有一个开始事件，作为流程的入口。

---

## 2. endEvent — 结束事件

**图标/形状**：粗边框圆形，36×36，流程终点。

**配置字段**：

| 字段 | 必填 | 说明 |
|---|---|---|
| `label` | 是 | 节点名称，默认"结束" |

**执行行为**：Token 标记为 `completed`。当所有 Token 都处于 `completed` 状态时，实例状态变为 `completed`。如果是子流程实例，会自动推进父流程。

**使用场景**：每个分支的终点，可有多个结束事件。

---

## 3. timerEvent — 定时事件

**图标/形状**：带时钟图标的圆形，36×36。

**配置字段**：

| 字段 | 必填 | 说明 |
|---|---|---|
| `label` | 是 | 节点名称，默认"定时事件" |
| `timerType` | 是 | `duration` / `date` / `cycle` |
| `timerValue` | 是 | ISO 8601 格式字符串 |

**执行行为**：

1. 引擎创建一个 `TimerJob`，记录触发时间（`fireAt`）
2. Token 进入 `waiting` 状态，暂停推进
3. 当 Vercel Cron 触发 `/api/flow-timers/check` 时，到期的 TimerJob 被触发
4. Token 从 `waiting` 变为 `active`，移动到下一个节点

**timerType 说明**：

- `duration`：从当前时间起延时触发，如 `PT30M`（30 分钟）
- `date`：在指定时间点触发，如 `2026-06-01T10:00:00Z`
- `cycle`：循环触发（当前按单次延时处理）

**使用场景**：流程超时处理、定时提醒、等待窗口。

---

## 4. userTask — 用户任务

**图标/形状**：圆角矩形，160×80，带人物图标。审批节点的核心。

**配置字段**：

| 字段 | 必填 | 说明 |
|---|---|---|
| `label` | 是 | 节点名称，默认"用户任务" |
| `assigneeType` | 否 | `user` / `role` / `expression`，默认 `user` |
| `assignee` | 否 | 表达式模式下的审批人表达式 |
| `candidateUsers` | 否 | 指定用户模式下的候选用户 ID 列表 |
| `candidateRoles` | 否 | 指定角色模式下的候选角色列表 |
| `assigneeCollection` | 否 | 变量名，指向 `variables` 中的用户 ID 数组 |
| `approvalMode` | 否 | `single` / `countersign` / `or-sign`，默认 `single` |
| `minApprovalCount` | 否 | 会签模式下的最少通过人数 |
| `rejectPolicy` | 否 | `reject-on-all` / `reject-on-any` / `follow-global` |
| `formSchemaId` | 否 | 绑定的表单 Schema ID |
| `formVersion` | 否 | 表单版本号 |
| `formMode` | 否 | `create` / `prefill` / `readonly` |
| `formVariable` | 否 | 表单数据写入实例变量的 key |
| `multiInstance` | 否 | 多实例配置（`type` + `collection`） |

**执行行为**：

1. 引擎创建 TaskInstance（单人或多人），Token 进入 `waiting` 状态
2. 审批人认领（claim）后状态变为 `claimed`
3. 审批人完成（complete）时提交 `outcome`（approved/rejected）
4. 根据审批模式判断是否满足推进条件：
   - `single`：一人完成即推进
   - `countersign`：已完成数 >= `minApprovalCount` 时推进，剩余待办自动取消
   - `or-sign`：一人通过即推进
5. 推进后 Token 变为 `active`，调用 `advance()` 继续

**使用场景**：审批节点、人工确认、任务分配。

---

## 5. serviceTask — 服务任务

**图标/形状**：圆角矩形，160×80，带齿轮图标。

**配置字段**：

| 字段 | 必填 | 说明 |
|---|---|---|
| `label` | 是 | 节点名称，默认"服务任务" |
| `serviceType` | 是 | `http` / `function` / `script`，默认 `http` |
| `serviceConfig` | 否 | 服务配置（结构由 `serviceType` 决定） |

**执行行为**：立即完成（当前为透传实现），产生新 Token 继续推进。

**使用场景**：调用外部 API、执行业务逻辑、数据转换。

---

## 6. scriptTask — 脚本任务

**图标/形状**：圆角矩形，160×80，带脚本图标。

**配置字段**：

| 字段 | 必填 | 说明 |
|---|---|---|
| `label` | 是 | 节点名称，默认"脚本任务" |
| `scriptLanguage` | 否 | 脚本语言标识 |
| `scriptContent` | 否 | 脚本内容 |

**执行行为**：当前为透传（TODO Phase 5），直接完成并推进。

**使用场景**：在流程中嵌入自定义脚本逻辑。

---

## 7. sendTask — 发送任务

**图标/形状**：圆角矩形，160×80，带发送图标。

**配置字段**：

| 字段 | 必填 | 说明 |
|---|---|---|
| `label` | 是 | 节点名称，默认"发送任务" |
| `serviceType` | 否 | `http` / `function` / `script`，默认 `http` |
| `serviceConfig` | 否 | 发送配置 |
| `messageRef` | 否 | 消息引用 |

**执行行为**：当前为透传（TODO Phase 5），直接完成并推进。

**使用场景**：发送邮件、通知、消息推送。

---

## 8. receiveTask — 接收任务

**图标/形状**：圆角矩形，160×80，带接收图标。

**配置字段**：

| 字段 | 必填 | 说明 |
|---|---|---|
| `label` | 是 | 节点名称，默认"接收任务" |
| `assignee` | 否 | 等待确认的用户 |
| `formSchemaId` | 否 | 绑定的表单 Schema ID |
| `formVersion` | 否 | 表单版本号 |

**执行行为**：创建 TaskInstance 等待外部确认，Token 进入 `waiting` 状态。接收方完成任务后 Token 恢复推进。

**使用场景**：等待外部系统回调、人工确认接收。

---

## 9. exclusiveGateway — 排他网关

**图标/形状**：菱形，40×40，带"X"标识。条件互斥路由。

**配置字段**：

| 字段 | 必填 | 说明 |
|---|---|---|
| `label` | 是 | 节点名称，默认"排他网关" |
| `gatewayDirection` | 否 | `diverging`（发散）/ `converging`（汇聚），默认 `diverging` |

**连线配置**：

| 字段 | 说明 |
|---|---|
| `conditionExpression` | 条件表达式，使用实例变量求值 |
| `isDefault` | 是否为默认流向（未命中任何条件时走此线） |

**执行行为**：

1. 按连线顺序评估条件表达式
2. 命中第一条即转向，跳过后续条件
3. 所有条件都不满足时走 `isDefault` 的连线
4. Token 移动到目标节点

**使用场景**：审批后的条件路由（金额 > 高管审批、金额 <= 主管审批）。

---

## 10. parallelGateway — 并行网关

**图标/形状**：菱形，40×40，带"+"标识。并行分叉/合并。

**配置字段**：

| 字段 | 必填 | 说明 |
|---|---|---|
| `label` | 是 | 节点名称，默认"并行网关" |
| `gatewayDirection` | 否 | `diverging`（发散）/ `converging`（汇聚），默认 `diverging` |

**执行行为**：

- **发散（diverging）**：将当前 Token 标记为 `completed`，为每条出线创建一个新的 `active` Token
- **汇聚（converging）**：等待所有入线的 Token 都到达后，将它们全部标记为 `completed`，产生一个新 `active` Token 按出线继续推进

**使用场景**：并行审批（多人同时审批，全部通过后合并）、并行执行多个任务。

---

## 11. inclusiveGateway — 包含网关

**图标/形状**：菱形，40×40，带圆圈标识。

**配置字段**：

| 字段 | 必填 | 说明 |
|---|---|---|
| `label` | 是 | 节点名称，默认"包含网关" |
| `gatewayDirection` | 否 | `diverging`（发散）/ `converging`（汇聚），默认 `diverging` |

**执行行为**：当前与排他网关逻辑一致（TODO Phase 5 支持多条件同时满足时并行分叉）。

**使用场景**：条件可同时满足的多路径路由（未来支持）。

---

## 12. subProcess — 子流程

**图标/形状**：双线边框矩形，300×200，表示嵌套流程。

**配置字段**：

| 字段 | 必填 | 说明 |
|---|---|---|
| `label` | 是 | 节点名称，默认"子流程" |
| `subProcessDefinitionId` | 否 | 引用的子流程定义 ID |

**执行行为**：

1. 若未配置 `subProcessDefinitionId`，直接跳过
2. 创建子流程实例（`startFlow`），子流程实例的 `parentInstanceId` 指向父流程
3. Token 进入 `waiting` 状态
4. 子流程完成后，其 `variables` 合并回父流程
5. 父流程 Token 恢复 `active`，继续推进

**使用场景**：流程复用、复杂子流程封装、模块化流程设计。
