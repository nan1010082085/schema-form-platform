# FormGrid Server API 文档

**Base URL**: `http://localhost:3001/api`（开发）| `https://<domain>/api`（Vercel 生产）
**Content-Type**: `application/json`

---

## 通用响应格式

### 成功

```json
{ "success": true, "data": { ... } }
```

### 失败

```json
{ "success": false, "error": { "message": "描述信息" } }
```

---

## 端点列表

### GET /api/health

健康检查（含 MongoDB ping）。

**响应**:
```json
{
  "status": "ok",
  "timestamp": 1715700000000,
  "uptime": 123.456,
  "database": "connected"
}
```

`database` 可能为 `"connected"` 或 `"disconnected"`。

---

### GET /api/schemas

获取 Schema 列表（分页 + 搜索 + 筛选）。

**Query 参数**:

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| search | string | — | 按 name 模糊搜索（$regex, 不区分大小写） |
| type | string | — | 筛选类型：`form` / `search_list` |
| status | string | — | 筛选状态：`draft` / `published` |
| publishId | string | — | 按发布 ID 精确查找 |
| page | number | 1 | 页码（最小 1） |
| pageSize | number | 20 | 每页条数（最小 1，最大 100） |

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "审批表单",
        "type": "form",
        "status": "draft",
        "publishId": null,
        "publishedAt": null,
        "json": { ... },
        "createdAt": "2026-05-15T10:00:00.000Z",
        "updatedAt": "2026-05-15T10:00:00.000Z"
      }
    ],
    "total": 42,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

---

### POST /api/schemas

创建新 Schema。

**Body**:
```json
{
  "name": "审批表单",
  "type": "form",
  "json": { ... }
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| name | string | ✅ | Schema 名称（非空） |
| json | object | ✅ | 完整 FormSchemaItem[] JSON（非 null） |
| type | string | — | `form`（默认）或 `search_list`（也接受 `search-list`，自动转换为 `search_list`） |

**响应**: `201 Created`
```json
{ "success": true, "data": { "id": "uuid", "type": "form", "status": "draft", ... } }
```

---

### GET /api/schemas/:id

获取单个 Schema。

**路径参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| id | UUID | Schema ID |

**响应**: `200 OK` | `400 Bad Request`（UUID 格式无效）| `404 Not Found`

---

### PUT /api/schemas/:id

更新 Schema（部分更新）。

**Body**（至少一个字段）:
```json
{
  "name": "新名称",
  "json": { ... },
  "type": "search_list",
  "status": "published"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 新名称（非空） |
| json | object | 新 JSON 内容（非 null） |
| type | string | `form` / `search_list` |
| status | string | `draft` / `published` |

**发布逻辑**: 当 `status` 改为 `published` 时，若无 `publishId` 则自动分配 UUID，并设置 `publishedAt` 为当前时间。

**响应**: `200 OK` | `400 Bad Request` | `404 Not Found`

---

### DELETE /api/schemas/:id

删除 Schema。

**响应**: `200 OK` | `400 Bad Request` | `404 Not Found`
```json
{ "success": true, "data": null }
```

---

## 错误码

| HTTP 状态码 | 场景 |
|------------|------|
| 400 | 参数校验失败（缺少必填字段、UUID 格式无效、字段值不合法） |
| 404 | Schema 不存在 |
| 500 | 服务器内部错误 |
| 503 | 数据库不可用（Serverless 模式下 MongoDB 连接失败） |

---

## Vercel Serverless 部署

### 架构

```
浏览器请求 /api/schemas
       │
       ▼
  vercel.json rewrites → /api/index
       │
       ▼
  api/index.ts (root) → packages/server/dist/handler.js
       │
       ▼
  handler.ts: connectDatabase() → app.callback()(req, res)
```

- 生产环境通过 `MONGODB_URI` 环境变量连接 MongoDB Atlas
- 每次 cold start 惰性连接，约 3-5 秒
- 连接断开时自动重连，失败返回 503 + `{ "error": { "message": "Database unavailable..." } }`
- 函数配置: 512MB 内存, 30s 超时（需 Pro 计划，Hobby 上限 10s）

## 前端集成

```typescript
// 开发环境: Vite proxy /api → localhost:3001
// 生产环境: VITE_API_BASE_URL=/api（同源部署）

import { fetchSchemas, createSchema, updateSchema, deleteSchema } from '@/utils/apiClient'

// 获取列表（分页 + 搜索）
const result = await fetchSchemas({ search: '审批', page: 1, pageSize: 20 })

// 创建
const schema = await createSchema({ name: '新表单', type: 'form', json: [...] })

// 更新
await updateSchema('uuid', { name: '已改名', status: 'published' })

// 删除
await deleteSchema('uuid')
```
