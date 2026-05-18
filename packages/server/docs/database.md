# FormGrid 数据库文档

## 环境

| 项目 | 值 |
|------|-----|
| 数据库 | PostgreSQL 16 |
| 容器 | Docker Compose |
| ORM | Prisma 6.x |
| 端口 | 5432 |
| 数据库名 | `formgrid` |
| 用户名 | `formgrid` |
| 密码 | `formgrid` |

## 启动

```bash
cd packages/server
docker compose up -d          # 启动 PostgreSQL
npx prisma migrate dev        # 执行迁移
npx prisma studio             # 可视化浏览（http://localhost:5555）
```

## 表结构

### form_schemas

Schema 定义主表。存储表单/列表的完整 JSON Schema。

| 列 | 类型 | 约束 | 说明 |
|----|------|------|------|
| `id` | `UUID` | PK, `@default(uuid())` | 主键 |
| `name` | `VARCHAR` | NOT NULL | Schema 名称（用户可读） |
| `json` | `JSONB` | NOT NULL | 完整 `FormSchemaItem[]` JSON |
| `created_at` | `TIMESTAMPTZ` | `@default(now())` | 创建时间 |
| `updated_at` | `TIMESTAMPTZ` | `@updatedAt` | 更新时间（自动） |

### Prisma Schema

```prisma
model FormSchema {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  json      Json
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("form_schemas")
}
```

### 索引

| 索引 | 列 | 说明 |
|------|-----|------|
| `form_schemas_pkey` | id | 主键索引（自动） |
| `form_schemas_updated_at_idx` | updated_at DESC | 列表排序（建议手动添加） |

建议执行：
```sql
CREATE INDEX form_schemas_updated_at_idx ON form_schemas (updated_at DESC);
```

## TypeScript 类型映射

```typescript
// 对应后端 API 响应类型
interface SchemaListItem {
  id: string
  name: string
  createdAt: string  // ISO 8601
  updatedAt: string
}

interface SchemaDetail extends SchemaListItem {
  json: FormSchemaItem[]  // 完整 schema JSON
}
```

## 查询示例

```sql
-- 搜索 Schema（按名称）
SELECT * FROM form_schemas
WHERE name ILIKE '%审批%'
ORDER BY updated_at DESC
LIMIT 20 OFFSET 0;

-- 统计总数
SELECT COUNT(*) FROM form_schemas;
```
