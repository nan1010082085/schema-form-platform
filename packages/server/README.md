# @schema-form/server

表单 Schema 平台后端 API 服务。

## 技术栈

- Koa.js（ESM 模块）
- Mongoose ODM + MongoDB
- JWT + bcryptjs 认证
- Zod 请求校验

## API 路由

### Schema 管理

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| `GET` | `/api/schemas` | 列表（分页+搜索+筛选） | 否 |
| `POST` | `/api/schemas` | 创建 | 是 |
| `POST` | `/api/schemas/import` | 导入 | 是 |
| `GET` | `/api/schemas/:id` | 详情 | 否 |
| `PUT` | `/api/schemas/:id` | 更新 | 是 |
| `DELETE` | `/api/schemas/:id` | 删除 | 是 |
| `POST` | `/api/schemas/:id/publish` | 发布 | 是 |
| `GET` | `/api/schemas/published/:sourceId` | 获取已发布版本 | 否 |
| `GET` | `/api/schemas/:param/versions` | 版本列表 | 否 |
| `GET` | `/api/schemas/:param/versions/:version` | 指定版本 | 否 |

### 认证

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/auth/login` | 登录 |
| `POST` | `/api/auth/logout` | 登出 |
| `GET` | `/api/auth/me` | 当前用户 |

### 字典

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/dict/:code` | 按编码查询字典 |

### 选项

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/options/:category` | 按分类查询选项 |
| `GET` | `/api/options/tree/:category` | 树形选项 |

### 数据

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET/POST` | `/api/data/list` | 数据列表 |
| `GET` | `/api/data/:id` | 数据详情 |

### Mock

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/mock/:schemaId` | 生成 Mock 数据 |

### 系统

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/health` | 健康检查（含 DB ping） |
| `GET` | `/api/docs` | API 文档 |
| `GET` | `/api/docs.json` | OpenAPI JSON |

## 数据模型

### FormSchema

核心资源，存储表单 Schema 定义及发布版本。

| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | String (UUID) | 主键 |
| `name` | String | 名称 |
| `type` | String | `form` / `search_list` |
| `status` | String | `draft` / `published` |
| `json` | Mixed | Schema 树结构 |
| `publishId` | String | 发布版本标识 |
| `createdAt` | Date | 创建时间 |
| `updatedAt` | Date | 更新时间 |

### PublishedSchema

已发布的 Schema 版本快照。

### User

用户账户（JWT 认证）。

## 中间件栈

```
errorHandler → helmet → bodyParser → CORS → routes
```

- `errorHandler` — 统一错误处理
- `helmet` — 安全头
- `bodyParser` — JSON 请求体解析
- `CORS` — 通过 `CORS_ORIGINS` 环境变量控制

## 开发

```bash
pnpm dev:server          # 启动开发服务器 (localhost:3001，热重载)
pnpm build:server        # 编译 TypeScript → dist/
pnpm db:up               # 启动本地 MongoDB
pnpm db:seed             # 导入种子数据
```
