# 流程节点

## 节点类型

| 节点 | 说明 | 图标 |
|------|------|------|
| 开始事件 | 流程起点 | ○ |
| 结束事件 | 流程终点 | ◉ |
| 用户任务 | 需要人工处理的任务 | ▭ |
| 审批任务 | 需要审批的节点 | ▭ |
| 服务任务 | 自动执行的系统任务 | ▭ |
| 排他网关 | 条件分支（互斥） | ◇ |
| 并行网关 | 并行分支（同时执行） | ◇ |
| 包含网关 | 条件分支（可多选） | ◇ |

## 节点配置

### 用户任务 / 审批任务

```json
{
  "assignee": "处理人",
  "candidateGroups": ["角色组"],
  "formSchemaId": "关联表单 Schema ID",
  "dueDate": "截止时间",
  "priority": 1
}
```

### 排他网关

条件表达式：
```json
{
  "conditions": [
    { "sequenceFlow": "flow_1", "expression": "${amount > 10000}" },
    { "sequenceFlow": "flow_2", "expression": "${amount <= 10000}" }
  ]
}
```

### 服务任务

```json
{
  "delegateExpression": "${httpServiceTask}",
  "url": "/api/external",
  "method": "POST"
}
```

## 自定义节点

编辑器支持通过 `FlowNode.vue` 和 `WorkflowNodes/` 注册自定义工作流节点：

- `FlowNode` — 流程操作节点
- `EditorNode` — 编辑器跳转节点
- `AIServiceNode` — AI 服务节点
