# FormGrid Server API 文档

**Base URL**: `http://localhost:3001/api`
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

健康检查

**响应**:
```json
{
  "status": "ok",
  "timestamp": 1715700000000,
  "uptime": 123.456,
  "database": "connected"
}
```

---

### GET /api/schemas

获取 Schema 列表（分页+搜索）

**Query 参数**:

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| search | string | — | 按 name 模糊搜索 |
| page | number | 1 | 页码 |
| pageSize | number | 20 | 每页条数（最大100） |

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "审批表单",
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

创建新 Schema

**Body**:
```json
{
  "name": "审批表单",
  "json": { "type": "page", "children": [...] }
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| name | string | ✅ | Schema 名称（非空） |
| json | object | ✅ | 完整 FormSchemaItem[] JSON |

**响应**: `201 Created`
```json
{ "success": true, "data": { "id": "uuid", ... } }
```

---

### GET /api/schemas/:id

获取单个 Schema

**路径参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| id | UUID | Schema ID |

**响应**: `200 OK` | `404 Not Found`

---

### PUT /api/schemas/:id

更新 Schema

**Body** (至少一个字段):
```json
{
  "name": "新名称",
  "json": { ... }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 新名称（非空） |
| json | object | 新 JSON 内容（非 null） |

**响应**: `200 OK` | `400 Bad Request` | `404 Not Found`

---

### DELETE /api/schemas/:id

删除 Schema

**响应**: `200 OK` | `404 Not Found`
```json
{ "success": true, "data": null }
```

---

## 错误码

| HTTP 状态码 | 场景 |
|------------|------|
| 400 | 参数校验失败（缺少必填字段、UUID 格式无效） |
| 404 | Schema 不存在 |
| 500 | 服务器内部错误 |

## 前端集成

```typescript
// 在前端中调用 API
const API_BASE = 'http://localhost:3001/api'

async function getSchemas(search?: string, page = 1) {
  const params = new URLSearchParams({ page: String(page) })
  if (search) params.set('search', search)
  const res = await fetch(`${API_BASE}/schemas?${params}`)
  return res.json()
}

async function createSchema(name: string, json: object) {
  const res = await fetch(`${API_BASE}/schemas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, json })
  })
  return res.json()
}
```
