# Flow 审批系统设计

## 审批类型

### 1. 单一审批（single）
```
节点配置：
{
  approvalMode: 'single',
  assigneeType: 'user',  // 或 'role'
  assignee: 'user-123'   // 或 assigneeRole: 'manager'
}
```
- 只有一个审批人
- 审批后直接推进到下一个节点

### 2. 会签审批（countersign）
```
节点配置：
{
  approvalMode: 'countersign',
  assigneeType: 'role',
  assigneeRole: 'manager',
  multiInstance: true
}
```
- 所有审批人都要审批
- 全部审批通过后才推进
- 任一人拒绝则拒绝

### 3. 或签审批（or-sign）
```
节点配置：
{
  approvalMode: 'or-sign',
  assigneeType: 'role',
  assigneeRole: 'manager',
  multiInstance: true,
  completeCondition: 'any'  // 任一人完成即可
}
```
- 任一审批人审批即可
- 一人通过则推进
- 一人拒绝则拒绝

## 审批列表 API

### GET /api/flow-tasks/approval-list

根据流程实例 ID 查询审批列表

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
    "tasks": [
      {
        "taskId": "task-1",
        "nodeId": "node-1",
        "nodeName": "直属上级审批",
        "status": "completed",
        "assignee": {
          "id": "user-1",
          "name": "张三"
        },
        "outcome": "approved",
        "comment": "同意",
        "formData": { "days": 3 },
        "completedAt": "2026-06-12T10:00:00Z"
      },
      {
        "taskId": "task-2",
        "nodeId": "node-2",
        "nodeName": "部门经理审批",
        "status": "pending",
        "assignee": {
          "id": "user-2",
          "name": "李四"
        },
        "formSchemaId": "schema-123",
        "formPublishId": "publish-456"
      }
    ]
  }
}
```

## 审批列表 Schema（预设）

在 Editor 中预设一个审批列表部件，配置如下：

```json
{
  "type": "search-list",
  "props": {
    "api": {
      "url": "/api/flow-tasks/approval-list",
      "method": "get",
      "params": {
        "instanceId": "${instanceId}"
      }
    },
    "columns": [
      { "field": "nodeName", "label": "审批节点", "width": 150 },
      { "field": "assignee.name", "label": "审批人", "width": 100 },
      { "field": "status", "label": "状态", "width": 80,
        "template": "{{status === 'completed' ? '已审批' : '待审批'}}"
      },
      { "field": "outcome", "label": "结果", "width": 80,
        "template": "{{outcome === 'approved' ? '通过' : outcome === 'rejected' ? '拒绝' : '-'}}"
      },
      { "field": "comment", "label": "审批意见", "width": 200 },
      { "field": "completedAt", "label": "审批时间", "width": 150 }
    ]
  }
}
```

## 多级审批流程示例

```
请假审批流程：
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  开始   │ →  │  表单   │ →  │ 上级审批 │ →  │ 经理审批 │ →  │  结束   │
│ (列表)  │    │ (填写)  │    │ (单一)  │    │ (单一)  │    │ (更新)  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     ↓              ↓              ↓              ↓
  点击新建       填写请假单     审批通过        审批通过
     ↓              ↓              ↓              ↓
   Socket         Socket        Socket         Socket
```

### 节点配置

**开始节点：**
```json
{
  "bpmnType": "startEvent",
  "label": "请假申请列表",
  "formSchemaId": "leave-list-schema",
  "formPublishId": "leave-list-publish",
  "formMode": "view",
  "buttonEvents": {
    "createBtn": {
      "action": "next",
      "targetNodeId": "form-node"
    }
  }
}
```

**表单节点：**
```json
{
  "bpmnType": "userTask",
  "label": "请假申请单",
  "formSchemaId": "leave-form-schema",
  "formPublishId": "leave-form-publish",
  "formMode": "create",
  "buttonEvents": {
    "submitBtn": {
      "action": "completeTask"
    }
  }
}
```

**上级审批节点：**
```json
{
  "bpmnType": "userTask",
  "label": "直属上级审批",
  "formSchemaId": "leave-detail-schema",
  "formPublishId": "leave-detail-publish",
  "formMode": "approve",
  "assigneeType": "superior",
  "approvalMode": "single",
  "buttonEvents": {
    "approveBtn": {
      "action": "approveTask"
    },
    "rejectBtn": {
      "action": "rejectTask"
    }
  }
}
```

**经理审批节点：**
```json
{
  "bpmnType": "userTask",
  "label": "部门经理审批",
  "formSchemaId": "leave-detail-schema",
  "formPublishId": "leave-detail-publish",
  "formMode": "approve",
  "assigneeType": "role",
  "assigneeRole": "manager",
  "approvalMode": "single",
  "buttonEvents": {
    "approveBtn": {
      "action": "approveTask"
    },
    "rejectBtn": {
      "action": "rejectTask"
    }
  }
}
```
