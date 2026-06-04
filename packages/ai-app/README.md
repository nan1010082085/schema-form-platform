# @schema-form/ai-app

AI 智能助手应用，提供对话式 Schema 生成、流程编排、版本管理能力。

## 项目定位

Schema Form 平台的 AI 交互层，通过自然语言对话驱动表单 Schema 和流程图的生成，支持多 Agent 协作、RAG 检索、流式响应。

## 技术栈

- Vue 3.5 Composition API + `<script setup>`
- TypeScript 5.7
- Element Plus 2.9
- CSS Modules 样式隔离
- SSE 流式通信
- Micro-app 微前端嵌入

## 核心功能

### 多 Agent 对话

支持三种 Agent 角色：

| Agent | 用途 | 生成内容 |
|---|---|---|
| **Auto** | 自动路由 | 根据意图自动选择 Editor/Flow Agent |
| **Editor** | 表单设计 | 生成表单 Schema JSON |
| **Flow** | 流程设计 | 生成 BPMN 流程图 |

### 对话面板（AiChatPanel）

- 消息列表：支持 Markdown 渲染、代码高亮
- 流式输出：SSE 实时显示 Agent 响应
- 多模态输入：支持文件上传（图片、PDF、Word、TXT）
- @ 提及：支持 RAG 检索结果引用
- 任务链（TaskChainBar）：展示 Agent 执行步骤
- 连接状态：SSE 连接状态指示、自动重试
- 嵌入卡片：支持 Schema 预览卡片、操作按钮

### 对话管理（AiConversationList）

- 对话列表：创建、切换、删除对话
- 搜索过滤：按标题搜索对话
- Agent 筛选：按 Agent 类型筛选
- 对话标题：自动生成/手动编辑

### Schema 预览（AiPreviewPanel）

- 实时预览：AI 生成的 Schema 即时渲染
- Element Plus 渲染：使用平台渲染引擎
- 版本对比：支持 Schema 版本差异对比
- 版本列表：历史版本浏览、回滚

### 版本管理（AiVersionList / AiVersionCompare）

- 版本列表：展示 Schema 历史版本
- 版本对比：JSON Diff 对比，高亮变更
- 版本回滚：一键恢复历史版本

### RAG 检索（AiRagSearch）

- 语义搜索：基于向量检索相关 Schema
- 上下文注入：选中结果作为对话上下文
- 搜索建议：实时搜索建议

### 图片上传（AiImageUpload）

- 图片识别：上传设计稿，AI 生成对应 Schema
- 拖拽上传：支持拖拽上传
- 预览管理：上传前预览、删除

## 组件清单

| 组件 | 说明 |
|---|---|
| AiChatPanel | 对话面板主组件 |
| AiMessage | 消息渲染组件 |
| AiConversationList | 对话列表 |
| AiPreviewPanel | Schema 预览面板 |
| AiVersionList | 版本列表 |
| AiVersionCompare | 版本对比 |
| AiRagSearch | RAG 检索组件 |
| AiMentionInput | @ 提及输入框 |
| AiImageUpload | 图片上传组件 |
| TaskChainBar | 任务链进度条 |
| EmbeddedCard | 嵌入式卡片（Schema 预览/操作） |

## API 接口

### AI 对话

```
POST /api/ai/chat
  - message: 用户消息
  - agent: Agent 类型 (auto|editor|flow)
  - conversationId: 对话 ID
  - attachments: 附件列表
  - ragContext: RAG 上下文
```

### SSE 流式响应

```
GET /api/ai/chat/stream
  - Event: text_delta — 文本增量
  - Event: tool_call — 工具调用
  - Event: task_step — 任务步骤
  - Event: done — 完成
  - Event: error — 错误
```

### 对话管理

```
GET    /api/ai/conversations          — 对话列表
POST   /api/ai/conversations          — 创建对话
PUT    /api/ai/conversations/:id      — 更新对话
DELETE /api/ai/conversations/:id      — 删除对话
GET    /api/ai/conversations/:id/messages — 消息历史
```

### 版本管理

```
GET    /api/ai/versions/:schemaId     — 版本列表
GET    /api/ai/versions/:id           — 版本详情
POST   /api/ai/versions/:id/restore   — 版本回滚
```

### RAG 检索

```
POST   /api/ai/rag/search             — 语义搜索
```

## 状态管理（Pinia）

| Store | 说明 |
|---|---|
| `useAiStore` | AI 对话状态、消息列表、Agent 配置 |

## 数据结构

### AIMessage

```typescript
interface AIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  agent?: AgentType
  attachments?: Attachment[]
  toolCalls?: ToolCall[]
  embeddedCards?: EmbeddedCard[]
  timestamp: number
}
```

### AgentType

```typescript
type AgentType = 'auto' | 'editor' | 'flow'
```

### SSEConnectionStatus

```typescript
type SSEConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'
```

## 微前端集成

AI 应用支持两种嵌入模式：

1. **独立应用**：通过 `/ai/` 路径访问
2. **Micro-app 嵌入**：通过 `<micro-app>` 标签嵌入 Editor/Flow 侧边栏

```vue
<!-- 嵌入 Flow 侧边栏 -->
<micro-app
  name="ai-sidebar-flow"
  :url="aiBaseUrl + '?agent=flow'"
  :data="aiDrawerData"
  iframe
  @datachange="handleAiDataChange"
/>
```

## 开发

```bash
# 启动 AI 应用开发服务器
pnpm dev:ai

# 构建
pnpm build:ai

# 测试
pnpm --filter @schema-form/ai-app test
```

## 项目结构

```
packages/ai-app/
└── src/
    ├── api/
    │   └── aiApi.ts           # API 请求封装
    ├── components/
    │   ├── AiChatPanel.vue    # 对话面板
    │   ├── AiMessage.vue      # 消息渲染
    │   ├── AiConversationList.vue
    │   ├── AiPreviewPanel.vue
    │   ├── AiVersionList.vue
    │   ├── AiVersionCompare.vue
    │   ├── AiRagSearch.vue
    │   ├── AiMentionInput.vue
    │   ├── AiImageUpload.vue
    │   ├── TaskChainBar.vue
    │   └── EmbeddedCard.vue
    ├── composables/
    │   └── use*.vue           # 组合式函数
    ├── stores/
    │   └── ai.ts              # AI Store
    ├── types/
    │   └── index.ts           # 类型定义
    ├── utils/
    │   └── ...                # 工具函数
    └── views/
        └── AiChatView.vue     # 对话页面
```

## 与 Server 的关系

- AI 应用通过 API 调用 Server 端 LangGraph Agent
- Server 端 Agent 使用 @schema-form/shared-ai 元数据构建 prompt
- 流式响应通过 SSE 传输

## 访问地址

- 本地开发：http://localhost:5175/ai/
- 线上环境：http://***REMOVED***:8828/ai/
