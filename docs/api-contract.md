# API 接口契约

> 前后端共同参考，所有接口统一 Response Envelope 格式。

## Response Envelope

```ts
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string        // 可选错误码
    details?: Array<{    // 校验错误时返回具体字段路径
      path: string
      message: string
    }>
  }
}
```

## 认证

所有接口通过 `Authorization: Bearer <token>` 头传递 JWT。qiankun 模式下 token 由宿主应用注入。

---

## 1. Schema CRUD

### 1.1 获取 Schema 列表

```
GET /api/schemas?page=1&pageSize=20&search=&type=
```

**Query:**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| page | number | 1 | 页码 |
| pageSize | number | 20 | 每页条数（max 100）|
| search | string | - | 按 name 模糊搜索 |
| type | string | - | `form` 或 `search_list` |

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "editId": "uuid",
        "version": "20260523143000",
        "name": "表单名称",
        "type": "form",
        "status": "draft",
        "createdAt": "2026-05-23T14:30:00.000Z",
        "updatedAt": "2026-05-23T14:30:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### 1.2 创建 Schema（首次保存 / 追加版本）

```
POST /api/schemas
```

**Body:**

```json
{
  "name": "表单名称",
  "type": "form",
  "json": [],
  "editId": "可选，有则追加版本，无则新建"
}
```

**逻辑：**
- 无 `editId`：生成新 `editId` + 当前时间戳 `version`，创建新文档
- 有 `editId`：在该 `editId` 下创建新版本，`version` 为当前时间戳

**Response:** `201` + 完整 SchemaDetail

### 1.3 获取单个 Schema

```
GET /api/schemas/:id
```

**Response:** SchemaDetail（含 `editId`, `version`）

### 1.4 更新 Schema

```
PUT /api/schemas/:id
```

**Body:** `{ name?, json?, type? }` — 部分更新

**注意：** 不允许通过此接口设置 `status: 'published'`，必须用发布接口。

### 1.5 删除 Schema

```
DELETE /api/schemas/:id
```

同时删除关联的 PublishedSchema。

### 1.6 发布 Schema

```
POST /api/schemas/:id/publish
```

**Body:** `{ version?: "20260523143000" }` — 可选指定版本号

**逻辑：**
- 有 `version`：发布该版本
- 无 `version`：发布 `:id` 对应的文档
- 同一 `editId` 只保留最新发布，`publishId` 首次生成后不变

**Response:** PublishedSchema

### 1.7 获取发布版本

```
GET /api/schemas/published/:editId
```

**Response:** PublishedSchema 或 404

---

## 2. 版本管理

### 2.1 版本列表

```
GET /api/schemas/:editId/versions
```

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "version": "20260523150000",
        "createdAt": "2026-05-23T15:00:00.000Z",
        "published": true
      },
      {
        "id": "uuid",
        "version": "20260523143000",
        "createdAt": "2026-05-23T14:30:00.000Z",
        "published": false
      }
    ],
    "total": 2
  }
}
```

按 `version` 降序排列。`published` 标记该版本是否为当前发布版本。

### 2.2 获取指定版本

```
GET /api/schemas/:editId/versions/:version
```

**Response:** 完整 SchemaDetail

---

## 3. 数据源

### 3.1 字典数据

```
GET /api/dict/:code
```

**内置测试字典 code：**

| code | 说明 |
|------|------|
| `city` | 城市列表 |
| `gender` | 性别 |
| `status` | 状态 |
| `department` | 部门 |

**Response:**

```json
{
  "success": true,
  "data": [
    { "label": "北京", "value": "beijing" },
    { "label": "上海", "value": "shanghai" }
  ]
}
```

### 3.2 通用列表查询

```
GET /api/data/list?page=1&pageSize=10&field=value
```

**Query:** `page`, `pageSize` + 任意筛选字段

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [{ "id": "1", "name": "张三", "age": 28 }],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  }
}
```

### 3.3 单条数据查询

```
GET /api/data/:id
```

**Response:**

```json
{
  "success": true,
  "data": { "id": "1", "name": "张三", "age": 28 }
}
```

---

## 4. Mock 数据

```
GET /api/mock/:schemaId
```

加载 schema，遍历 widget 树，按字段类型生成 mock 数据。

**Response:**

```json
{
  "success": true,
  "data": {
    "name": "张三",
    "age": 28,
    "city": "beijing"
  }
}
```

---

## 5. 认证

### 5.1 登录

```
POST /api/auth/login
```

**Body:** `{ "username": "admin", "password": "123456" }`

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "jwt-token-string",
    "user": {
      "id": "uuid",
      "username": "admin",
      "displayName": "管理员",
      "role": "admin"
    }
  }
}
```

### 5.2 登出

```
POST /api/auth/logout
```

**Response:** `{ "success": true, "data": null }`

### 5.3 获取当前用户

```
GET /api/auth/me
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "admin",
    "displayName": "管理员",
    "role": "admin"
  }
}
```

---

## 6. 导入

```
POST /api/schemas/import
```

**Body:**

```json
{
  "name": "导入的表单",
  "type": "form",
  "json": []
}
```

**校验流程：**
1. Zod 校验基本结构（name 必填非空，type 枚举，json 数组）
2. 深度遍历 json 树，校验每个 widget 的 `type` 是否合法
3. 校验失败返回 400 + 具体字段路径

**处理：**
1. 重新生成所有 widget `id`（UUID）
2. 生成新 `editId` + 当前时间戳 `version`
3. 创建 FormSchema 文档

**校验失败 Response:**

```json
{
  "success": false,
  "error": {
    "message": "Schema validation failed",
    "details": [
      { "path": "json[0].children[2].type", "message": "Invalid widget type: unknown_type" }
    ]
  }
}
```

---

## 7. 健康检查

```
GET /api/health
```

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-05-23T14:30:00.000Z",
    "uptime": 3600,
    "database": "connected"
  }
}
```

---

## 8. 限流

所有接口统一限流：100 次 / 15 分钟 / IP。

超限返回 `429`:

```json
{
  "success": false,
  "error": {
    "message": "Rate limit exceeded",
    "code": "RATE_LIMIT"
  }
}
```
