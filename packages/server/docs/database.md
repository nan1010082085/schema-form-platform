# FormGrid 数据库文档

## 环境

| 项目 | 值 |
|------|-----|
| 数据库 | MongoDB 8 (Atlas / Docker) |
| ORM | Mongoose 8.x |
| 容器 | Docker Compose |
| 端口 | 27017 |
| 数据库名 | `formgrid` |
| 用户名 | `formgrid` |
| 密码 | `formgrid` |

## 本地启动

```bash
cd packages/server
pnpm db:up          # 启动 MongoDB 容器
pnpm dev            # tsx watch 热重载开发
pnpm db:down        # 停止容器
```

## 集合结构

### form_schemas

Schema 定义主表。存储表单/列表的完整 JSON Schema。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `_id` | `String` | PK (UUID) | 主键，UUID 字符串（非 ObjectId） |
| `name` | `String` | required | Schema 名称 |
| `type` | `String` | enum: `form` / `search_list` | Schema 类型，默认 `form` |
| `status` | `String` | enum: `draft` / `published` | 发布状态，默认 `draft` |
| `publishId` | `String` | unique, sparse, nullable | 首次发布时分配的唯一 ID |
| `publishedAt` | `Date` | nullable | 发布时间 |
| `json` | `Mixed` | required | 完整 `FormSchemaItem[]` JSON |
| `createdAt` | `Date` | auto | 创建时间 |
| `updatedAt` | `Date` | auto | 更新时间 |

### Mongoose Schema 定义

```typescript
const formSchemaDef = new mongoose.Schema({
  _id:       { type: String, required: true },
  name:      { type: String, required: true },
  type:      { type: String, enum: ['form', 'search_list'], default: 'form' },
  status:    { type: String, enum: ['draft', 'published'], default: 'draft' },
  publishId: { type: String, default: null, unique: true, sparse: true },
  publishedAt: { type: Date, default: null },
  json:      { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true })
```

### 序列化

序列化时 `_id` 和 `__v` 被移除，`id` 别名指向 `_id`：

```typescript
toJSON: {
  transform(_doc, ret) {
    ret.id = ret._id
    delete ret._id
    delete ret.__v
  }
}
```

### users

用户表（模型已定义，认证路由待实现）。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `_id` | `String` | PK | 用户 ID |
| `username` | `String` | unique, required | 用户名 |
| `password` | `String` | required | bcrypt 加密密码 |
| `displayName` | `String` | required | 显示名称 |
| `role` | `String` | enum: `admin` / `editor` / `viewer` | 角色，默认 `viewer` |
| `createdAt` | `Date` | auto | 创建时间 |
| `updatedAt` | `Date` | auto | 更新时间 |

## 连接配置

```typescript
// 本地: mongodb://formgrid:formgrid@localhost:27017/formgrid
// 生产: 通过 MONGODB_URI 环境变量指定 (MongoDB Atlas)
await mongoose.connect(MONGODB_URI, {
  maxPoolSize: 5,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
})
```

## TypeScript 类型映射

```typescript
// 前端 API 响应类型 (packages/web/src/types/api.ts)
interface SchemaListItem {
  id: string
  name: string
  type: 'form' | 'search-list'
  status: 'draft' | 'published'
  publishId?: string | null
  publishedAt?: string | null
  json?: FormSchemaItem[]
  createdAt: string  // ISO 8601
  updatedAt: string
}

interface SchemaDetail extends SchemaListItem {
  json: FormSchemaItem[]  // 完整 schema JSON
}
```

## 查询示例

```javascript
// Mongoose 查询（后端 routes/schema.ts）
// 按名称模糊搜索 + 分页
FormSchemaModel.find({ name: { $regex: '审批', $options: 'i' } })
  .skip(0).limit(20)
  .sort({ updatedAt: -1 })

// 按发布 ID 查找
FormSchemaModel.findOne({ publishId: 'uuid' })

// 统计
FormSchemaModel.countDocuments({ type: 'form', status: 'published' })
```

## Vercel Serverless 注意事项

- handler 惰性连接 MongoDB，每次冷启动约 3-5 秒
- 连接断开时自动重连，失败返回 503
- `serverSelectionTimeoutMS: 5000` 保证超时不会过长
