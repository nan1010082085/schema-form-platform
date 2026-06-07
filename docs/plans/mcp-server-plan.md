# MCP Server 实现计划

> 创建时间：2026-06-05
> 状态：✅ 已完成

---

## 一、架构设计

### 1.1 目标

将 Schema Form 的查询和操作能力封装为 MCP (Model Context Protocol) 服务器，使 LangGraph 和其他 AI 工具可以通过标准协议调用。

### 1.2 架构图

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Server Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ Schema MCP  │  │  Flow MCP   │  │ Widget MCP  │      │
│  │   Server    │  │   Server    │  │   Server    │      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │
│         │                │                │              │
│  ┌──────┴────────────────┴────────────────┴──────┐      │
│  │              Shared Services                   │      │
│  │  (Mongoose Models, Validation, Auth)          │      │
│  └───────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  MCP Clients                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │  LangGraph  │  │   Claude    │  │   Other AI  │      │
│  │   Agent     │  │   Code      │  │   Tools     │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────┘
```

---

## 二、工具清单

### 2.1 Schema MCP Server

| 工具名 | 描述 | 参数 | 返回 |
|--------|------|------|------|
| `search_schemas` | 搜索 Schema 列表 | keyword, type?, limit? | Schema 摘要列表 |
| `get_schema_detail` | 获取 Schema 详情 | schemaId | Schema 完整定义 |
| `validate_schema` | 验证 Schema 结构 | schema | 验证结果 |
| `search_published_schemas` | 搜索已发布 Schema | keyword, type?, limit? | 已发布 Schema 列表 |

### 2.2 Flow MCP Server

| 工具名 | 描述 | 参数 | 返回 |
|--------|------|------|------|
| `search_flows` | 搜索流程列表 | keyword, limit? | 流程摘要列表 |
| `get_flow_detail` | 获取流程详情 | flowId | 流程完整定义 |
| `validate_flow` | 验证流程结构 | flow | 验证结果 |

### 2.3 Widget MCP Server

| 工具名 | 描述 | 参数 | 返回 |
|--------|------|------|------|
| `query_widgets` | 查询组件列表 | type?, category? | 组件列表 |
| `get_widget_catalogue` | 获取组件目录 | 无 | 组件分类目录 |

---

## 三、目录结构

```
packages/server/src/ai/mcp/
├── index.ts           # MCP 服务器入口，统一注册
├── schemaServer.ts    # Schema 相关工具
├── flowServer.ts      # Flow 相关工具
├── widgetServer.ts    # Widget 相关工具
└── transport.ts       # 传输层配置 (SSE)

packages/server/src/routes/
└── mcp.ts             # MCP HTTP 路由
```

---

## 四、API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/mcp/schema/sse` | GET | Schema MCP SSE 连接 |
| `/api/mcp/schema/messages` | POST | Schema MCP 消息 |
| `/api/mcp/flow/sse` | GET | Flow MCP SSE 连接 |
| `/api/mcp/flow/messages` | POST | Flow MCP 消息 |
| `/api/mcp/widget/sse` | GET | Widget MCP SSE 连接 |
| `/api/mcp/widget/messages` | POST | Widget MCP 消息 |

---

## 五、依赖

```json
{
  "@modelcontextprotocol/sdk": "^1.0.0"
}
```

---

## 六、执行阶段

| 阶段 | 任务 | 预估 | 状态 |
|------|------|------|------|
| 1 | 安装 MCP SDK，创建目录结构 | 0.5h | ✅ 完成 |
| 2 | 实现 Schema MCP Server | 1h | ✅ 完成 |
| 3 | 实现 Flow MCP Server | 1h | ✅ 完成 |
| 4 | 实现 Widget MCP Server | 0.5h | ✅ 完成 |
| 5 | 集成到 Koa 路由 | 0.5h | ✅ 完成 |
| 6 | LangGraph MCP Client 集成 | 1h | 待执行 |
| 7 | 测试验证 | 1h | ✅ 完成（16 个测试） |

**总计**：5.5 小时

---

## 七、验证标准

- [ ] MCP 服务器可独立启动
- [ ] 所有工具可通过 MCP 协议调用
- [ ] LangGraph 可通过 MCP Client 调用工具
- [ ] 测试覆盖核心工具
- [ ] 文档完整
