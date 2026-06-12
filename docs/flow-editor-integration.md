# Flow + Editor 业务级编排架构

## 核心理念

```
┌─────────────────────────────────────────────────────────────────┐
│                    Editor（可视化编辑器）= 前台                    │
├─────────────────────────────────────────────────────────────────┤
│  四大配置系统：                                                  │
│  1. 组件属性配置 - 每个组件的属性                                │
│  2. 事件系统 - 按钮点击、表单提交等事件                           │
│  3. 联动系统 - 组件之间的联动关系                                │
│  4. 变量系统 - 数据绑定和变量传递                                │
├─────────────────────────────────────────────────────────────────┤
│  事件动作类型（与 Flow 集成）：                                   │
│  - startFlow: 发起流程                                          │
│  - completeTask: 完成当前任务                                    │
│  - approveTask: 审批通过                                         │
│  - rejectTask: 审批拒绝                                          │
│  - claimTask: 认领任务                                           │
│  - delegateTask: 委派任务                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Schema 绑定
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Flow（流程编排）= 后台                         │
├─────────────────────────────────────────────────────────────────┤
│  节点类型：                                                      │
│  - StartEvent: 起点，绑定业务列表 Schema                         │
│  - UserTask: 审批节点，绑定表单 Schema + 审批人配置               │
│  - ServiceTask: 自动任务                                         │
│  - ExclusiveGateway: 条件分支                                    │
│  - EndEvent: 终点                                                │
├─────────────────────────────────────────────────────────────────┤
│  节点配置：                                                      │
│  - formSchemaId: 绑定的 Schema ID                               │
│  - formPublishId: 绑定的 Schema 发布 ID                         │
│  - formMode: 表单模式（create/view/edit/approve）                │
│  - approvalMode: 审批类型（single/countersign/or-sign）          │
│  - assigneeType: 审批人类型                                      │
│  - assigneeId: 审批人 ID                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 运行时渲染
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FlowFormRenderer（运行时）                     │
├─────────────────────────────────────────────────────────────────┤
│  1. 加载 Editor 的 Schema                                       │
│  2. 渲染表单（使用 SchemaRender）                                │
│  3. 监听按钮事件                                                │
│  4. 根据事件类型调用 Flow API                                   │
│  5. Socket 实时通知                                             │
└─────────────────────────────────────────────────────────────────┘
```

## 审批类型

### 1. 单一审批（single）
- 只有一个审批人
- 审批后直接推进到下一个节点

### 2. 会签审批（countersign）
- 所有审批人都要审批
- 全部审批通过后才推进
- 任一人拒绝则拒绝

### 3. 或签审批（or-sign）
- 任一审批人审批即可
- 一人通过则推进
- 一人拒绝则拒绝

## 使用流程

### 1. Editor 中配置表单和按钮事件

```typescript
// 按钮的 events 配置
{
  trigger: 'click',
  actions: [
    {
      type: 'approveTask',
      comment: '审批通过',
    }
  ]
}
```

### 2. Flow 中配置节点 Schema 绑定

```typescript
// 节点的 data 配置
{
  formSchemaId: 'schema-123',
  formPublishId: 'publish-456',
  formMode: 'approve',
  approvalMode: 'single',
  assigneeType: 'role',
  assigneeRole: 'manager',
}
```

### 3. 运行时渲染

```vue
<FlowFormRenderer
  :schema-id="task.formSchemaId"
  :publish-id="task.formPublishId"
  :form-mode="task.formMode"
  :initial-data="task.formData"
  :instance-id="task.instanceId"
  :task-id="task._id"
  @flow-action="handleFlowAction"
/>
```

## API 接口

### GET /api/flow-tasks/approval-list

查询流程实例的审批列表

**参数：**
- `instanceId` - 流程实例 ID
- `status` - 状态筛选（pending/completed/all）

**返回：**
```json
{
  "success": true,
  "data": {
    "instanceId": "xxx",
    "definitionName": "请假审批流程",
    "status": "running",
    "tasks": [
      {
        "taskId": "task-1",
        "nodeId": "node-1",
        "nodeName": "直属上级审批",
        "status": "completed",
        "assignee": "user-1",
        "outcome": "approved",
        "createdAt": "2026-06-12T10:00:00Z",
        "updatedAt": "2026-06-12T10:05:00Z"
      },
      {
        "taskId": "task-2",
        "nodeId": "node-2",
        "nodeName": "部门经理审批",
        "status": "pending",
        "assignee": "user-2",
        "formSchemaId": "schema-123",
        "formPublishId": "publish-456"
      }
    ]
  }
}
```

### POST /api/flow-actions/submit

提交表单并推进流程

```json
{
  "instanceId": "xxx",
  "taskId": "xxx",
  "formData": { "field1": "value1" }
}
```

### POST /api/flow-actions/approve

审批通过

```json
{
  "instanceId": "xxx",
  "taskId": "xxx",
  "formData": { "comment": "同意" },
  "comment": "审批通过"
}
```

### POST /api/flow-actions/reject

审批拒绝

```json
{
  "instanceId": "xxx",
  "taskId": "xxx",
  "comment": "不符合要求"
}
```

## 组件清单

### Flow 侧组件

| 组件 | 说明 |
|------|------|
| `UserTaskPanel` | 用户任务节点属性面板 |
| `SchemaBindingPanel` | Schema 绑定配置面板 |
| `SchemaSelector` | Schema 选择器 |
| `ApprovalList` | 审批记录列表 |
| `FlowFormRenderer` | 流程表单渲染器 |
| `AgentNode` | Agent 节点组件 |

### Editor 侧事件动作

| 动作类型 | 说明 |
|----------|------|
| `startFlow` | 发起流程 |
| `completeTask` | 完成任务 |
| `approveTask` | 审批通过 |
| `rejectTask` | 审批拒绝 |
| `claimTask` | 认领任务 |
| `delegateTask` | 委派任务 |

## 请假审批流程示例

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  开始   │ →  │  表单   │ →  │ 上级审批 │ →  │ 经理审批 │ →  │  结束   │
│ (列表)  │    │ (填写)  │    │ (单一)  │    │ (单一)  │    │ (更新)  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     ↓              ↓              ↓              ↓
  点击新建       填写请假单     审批通过        审批通过
     ↓              ↓              ↓              ↓
   Socket         Socket        Socket         Socket
```
