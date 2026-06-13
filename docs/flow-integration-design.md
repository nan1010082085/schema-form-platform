> ⚠️ 状态：待实现设计方案

# Flow 审批 + Editor 集成设计

## 概述

本文档合并了原 `flow-approval-design.md` 和 `flow-editor-integration.md` 的内容。

## 一、审批系统设计

### 审批类型

1. **单一审批（single）** - 单人审批
2. **会签（countersign）** - 多人全部通过
3. **或签（or-sign）** - 一人通过即可

### API 端点（待实现）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/flow-tasks/approval-list` | GET | 审批列表 |
| `/api/flow-actions/submit` | POST | 发起审批 |
| `/api/flow-actions/approve` | POST | 通过 |
| `/api/flow-actions/reject` | POST | 驳回 |
| `/api/flow-actions/claim` | POST | 认领 |
| `/api/flow-actions/delegate` | POST | 委托 |

## 二、Editor 集成

### 事件动作类型（待实现）

- `startFlow` - 发起流程
- `completeTask` - 完成任务
- `approveTask` - 审批通过
- `rejectTask` - 审批驳回
- `claimTask` - 认领任务
- `delegateTask` - 委托任务

### 组件（待实现）

- `FlowFormRenderer` - 流程表单渲染器
- `UserTaskPanel` - 用户任务面板
- `SchemaBindingPanel` - Schema 绑定面板
- `SchemaSelector` - Schema 选择器

## 三、实现状态

- [ ] 后端 API (`flow-tasks.ts`, `flow-actions.ts`)
- [ ] 事件动作类型
- [ ] 前端组件
- [ ] 测试用例
