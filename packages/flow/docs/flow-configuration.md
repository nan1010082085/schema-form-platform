# 流程配置

## 设计器配置

### 画布设置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `layoutDirection` | 布局方向 | `horizontal` |
| `layoutNodeSep` | 节点间距 | 80 |
| `layoutRankSep` | 层级间距 | 100 |
| `snapToGrid` | 网格吸附 | true |
| `gridSize` | 网格大小 | 20 |

### 节点模板

支持从模板创建流程：

| 模板 | 说明 |
|------|------|
| 请假审批 | 员工 → 主管 → HR |
| 报销审批 | 员主 → 财务 → 总经理 |
| 采购审批 | 需求人 → 部门 → 采购 → 财务 |

## API 配置

流程设计器支持通过 API 配置数据源：

```json
{
  "url": "/api/flows",
  "method": "GET",
  "dataPath": "data.items",
  "params": { "status": "active" }
}
```

## 嵌入模式

### 在编辑器中嵌入

通过 `FlowNode` 工作流节点，在表单编辑器中嵌入流程：

```json
{
  "type": "flow-node",
  "props": {
    "flowId": "流程定义 ID",
    "triggerType": "on-submit"
  }
}
```

### 表单关联

流程节点可关联表单 Schema：

```json
{
  "formSchemaId": "表单 Schema ID",
  "formDataMapping": {
    "field1": "${processVariable1}",
    "field2": "${processVariable2}"
  }
}
```

## 本地开发

```bash
# 启动开发服务器
pnpm dev:flow

# 访问
http://localhost:5200/

# 流程设计器
http://localhost:5200/designer?id={flowId}

# 流程列表
http://localhost:5200/list
```
