# 流程运行时

## 流程生命周期

```
设计 → 发布 → 启动 → 运行中 → 完成/取消
         ↓
      版本管理（多版本并存）
```

## 流程实例

| 状态 | 说明 |
|------|------|
| `running` | 运行中 |
| `completed` | 已完成 |
| `cancelled` | 已取消 |
| `suspended` | 已挂起 |

## 任务

### 任务状态

| 状态 | 说明 |
|------|------|
| `pending` | 待处理 |
| `completed` | 已完成 |
| `rejected` | 已驳回 |
| `delegated` | 已委派 |

### 任务操作

- **完成** — 推进到下一个节点
- **驳回** — 退回到指定节点
- **委派** — 转给其他人处理
- **催办** — 发送提醒通知

## 审批日志

每次任务操作都记录审批日志（`ApprovalLog`）：

```json
{
  "instanceId": "流程实例 ID",
  "nodeId": "节点 ID",
  "nodeName": "节点名称",
  "action": "complete/reject/delegate",
  "operator": "操作人",
  "comment": "审批意见",
  "createdAt": "操作时间"
}
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/flows/:id/start` | 启动流程实例 |
| GET | `/flow-instances` | 实例列表 |
| GET | `/flow-instances/:id` | 实例详情 |
| POST | `/flow-instances/:id/complete` | 完成任务 |
| POST | `/flow-instances/:id/reject` | 驳回任务 |
| GET | `/flow-tasks` | 我的任务列表 |
| GET | `/flow-tasks/approval-list` | 审批日志 |
