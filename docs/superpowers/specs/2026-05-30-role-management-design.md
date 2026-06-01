# 角色管理系统设计文档

## 概述

为 Schema Form Platform 新增完整的角色管理系统，支持用户-角色关联，以及 flow 审批流中按角色配置审批人。

## 背景

### 现状
- User 模型有 `role: 'admin' | 'editor' | 'viewer'` 硬编码枚举
- portal/UserManageView 可以给用户分配角色，但无法管理角色本身
- flow 的 `BpmnNodeConfig` 已支持 `assigneeType: 'user' | 'role' | 'expression'`
- flow 的 UserPicker 组件只支持搜索用户，不支持选择角色

### 问题
1. 角色是硬编码的三个值，无法新增/修改/删除
2. flow 配置审批人时无法选择角色
3. 缺少角色管理界面和 API

## 设计方案

### 1. 数据模型

#### Role 模型

**文件**: `packages/server/src/models/Role.ts`

```typescript
interface IRole {
  _id: string        // UUID
  name: string       // 角色名称（中文），唯一索引
  description?: string
  createdAt: Date
  updatedAt: Date
}
```

**索引**:
- `_id`: 主键
- `name`: 唯一索引

#### User 模型更新

**文件**: `packages/server/src/models/User.ts`

```typescript
interface IUser {
  _id: string
  username: string
  password: string
  displayName: string
  roles: string[]    // 角色ID数组，替代原来的 role 枚举
  createdAt: Date
  updatedAt: Date
}
```

**变更**:
- 删除 `role: 'admin' | 'editor' | 'viewer'` 字段
- 新增 `roles: string[]` 字段（角色ID数组）
- 给 `roles` 字段添加索引，支持反向查询"某角色下有哪些用户"

### 2. API 接口

#### 角色管理 API

**文件**: `packages/server/src/routes/roles.ts`

| 方法 | 路径 | 说明 | 请求体 |
|------|------|------|--------|
| GET | `/api/roles?q=xxx&page=1&pageSize=20` | 角色列表（分页+搜索） | - |
| POST | `/api/roles` | 创建角色 | `{ name, description? }` |
| PUT | `/api/roles/:id` | 更新角色 | `{ name?, description? }` |
| DELETE | `/api/roles/:id` | 删除角色 | - |
| GET | `/api/roles/:id/users` | 获取角色下的用户 | - |

**响应格式**:
```typescript
// 列表响应
{
  success: true,
  data: {
    items: IRole[],
    total: number,
    page: number,
    pageSize: number
  }
}

// 单个响应
{
  success: true,
  data: IRole
}
```

#### 用户 API 更新

**文件**: `packages/server/src/routes/users.ts`

- `GET /api/users` 响应中 `role` 改为 `roles`（角色ID数组）
- `POST /api/users` 请求体中 `role` 改为 `roles`（角色ID数组）
- `PUT /api/users/:id` 请求体中 `role` 改为 `roles`（角色ID数组）

#### 验证 Schema 更新

**文件**: `packages/server/src/schemas/userSchemas.ts`

```typescript
// createUserSchema
{
  username: z.string().min(2).max(50),
  password: z.string().min(4).max(100),
  displayName: z.string().min(1).max(50),
  roles: z.array(z.string()).default([])  // 角色ID数组
}

// updateUserSchema
{
  displayName: z.string().min(1).max(50).optional(),
  roles: z.array(z.string()).optional()
}
```

### 3. Portal 前端

#### RoleManageView

**文件**: `packages/portal/src/views/RoleManageView.vue`

**功能**:
- 角色列表（表格）
- 搜索框
- 新增角色按钮
- 编辑/删除操作
- 查看角色成员

**交互**:
- 点击"新增"弹出对话框，填写角色名称和描述
- 点击"编辑"弹出对话框，修改角色信息
- 点击"删除"确认后删除
- 点击"查看成员"显示该角色下的用户列表

#### PortalView 更新

**文件**: `packages/portal/src/views/PortalView.vue`

在卡片列表中增加"角色管理"入口：
```typescript
{
  title: '角色管理',
  desc: '管理平台角色，配置角色成员',
  icon: UserFilled,  // 或其他合适的图标
  route: '/roles',
  gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
}
```

#### Router 更新

**文件**: `packages/portal/src/router/index.ts`

```typescript
{
  path: '/roles',
  name: 'roles',
  component: () => import('@/views/RoleManageView.vue'),
}
```

#### UserManageView 更新

**文件**: `packages/portal/src/views/UserManageView.vue`

**变更**:
- 用户编辑对话框中，"角色"字段改为多选下拉框
- 从 `/api/roles` 获取角色列表
- 用户列表中显示角色标签（遍历 roles 数组，显示角色名称）

```vue
<el-form-item label="角色">
  <el-select v-model="form.roles" multiple placeholder="选择角色">
    <el-option
      v-for="role in roleOptions"
      :key="role.id"
      :label="role.name"
      :value="role.id"
    />
  </el-select>
</el-form-item>
```

### 4. Flow 集成

#### UserPicker 改造

**文件**: `packages/flow/web/src/components/UserPicker.vue`

**功能**:
- 单个 el-select 下拉框
- 分两组显示：用户组、角色组
- 支持搜索（远程搜索）
- 虚拟列表（el-select-v2）
- 滚动到底加载更多（分页请求）

**交互流程**:
1. 组件初始化时，加载第一页用户和角色
2. 用户输入搜索关键词，触发远程搜索
3. 滚动到底部，加载下一页
4. 选择的值格式：`user:用户ID` 或 `role:角色ID`（带前缀区分类型）

**API 调用**:
```typescript
// 获取用户列表
GET /api/users?page=1&pageSize=20&q=xxx

// 获取角色列表
GET /api/roles?page=1&pageSize=20&q=xxx
```

**值格式**:
```typescript
// 选择用户
{ type: 'user', id: '用户ID', label: '张三 (zhangsan)' }

// 选择角色
{ type: 'role', id: '角色ID', label: '管理员 (3人)' }
```

#### flowApi 更新

**文件**: `packages/flow/web/src/api/flowApi.ts`

```typescript
// 新增角色搜索
searchRoles: (q: string, page?: number, pageSize?: number) => {
  const params = new URLSearchParams({ q })
  if (page) params.set('page', String(page))
  if (pageSize) params.set('pageSize', String(pageSize))
  return request<{ items: Role[], total: number }>(`/roles?${params}`)
}

// 用户搜索支持分页
searchUsers: (q: string, page?: number, pageSize?: number) => {
  const params = new URLSearchParams({ q })
  if (page) params.set('page', String(page))
  if (pageSize) params.set('pageSize', String(pageSize))
  return request<{ items: User[], total: number }>(`/users?${params}`)
}
```

#### FlowSettingsDialog 更新

**文件**: `packages/flow/web/src/components/FlowSettingsDialog.vue`

- `permissions.editors` 改为支持用户和角色混合选择
- `permissions.launchers` 改为支持用户和角色混合选择
- `permissions.viewers` 改为支持用户和角色混合选择

**新的 FlowPermissions 类型**:
```typescript
interface FlowPermissionItem {
  type: 'user' | 'role'
  id: string
}

interface FlowPermissions {
  editors?: FlowPermissionItem[]
  launchers?: FlowPermissionItem[]
  viewers?: FlowPermissionItem[]
}
```

### 5. Shared 类型更新

**文件**: `packages/flow/shared/src/types/graph.ts`

```typescript
export interface FlowPermissionItem {
  type: 'user' | 'role'
  id: string
}

export interface FlowPermissions {
  editors?: FlowPermissionItem[]
  launchers?: FlowPermissionItem[]
  viewers?: FlowPermissionItem[]
}
```

### 6. 数据迁移

**文件**: `packages/server/src/migrations/migrateRoles.ts`

**迁移逻辑**:
1. 创建三个默认角色：管理员、编辑者、查看者
2. 遍历所有用户，根据原 `role` 字段设置 `roles` 数组
3. 删除 User 模型的 `role` 字段（可选，或保留兼容）

```typescript
async function migrateRoles() {
  // 1. 创建默认角色
  const adminRole = await RoleModel.create({ name: '管理员', description: '系统管理员' })
  const editorRole = await RoleModel.create({ name: '编辑者', description: '内容编辑者' })
  const viewerRole = await RoleModel.create({ name: '查看者', description: '只读用户' })

  // 2. 迁移用户角色
  const roleMap = {
    admin: adminRole._id,
    editor: editorRole._id,
    viewer: viewerRole._id,
  }

  const users = await UserModel.find()
  for (const user of users) {
    if (user.role && roleMap[user.role]) {
      user.roles = [roleMap[user.role]]
      await user.save()
    }
  }
}
```

### 7. 测试计划

#### 单元测试
- Role 模型 CRUD
- User 模型 roles 字段验证
- 角色搜索 API

#### 集成测试
- 创建角色 → 分配用户 → 查询角色成员
- 删除角色 → 检查用户 roles 字段更新
- flow UserPicker 选择用户/角色

#### E2E 测试
- Portal 角色管理完整流程
- Flow 配置审批人选择角色

## 实施顺序

1. **Phase 1: 后端基础**
   - Role 模型
   - Role API
   - User 模型更新
   - 数据迁移脚本

2. **Phase 2: Portal 前端**
   - RoleManageView
   - UserManageView 更新
   - PortalView 入口

3. **Phase 3: Flow 集成**
   - UserPicker 改造
   - FlowSettingsDialog 更新
   - FlowPermissions 类型更新

4. **Phase 4: 测试与优化**
   - 单元测试
   - 集成测试
   - 性能优化（虚拟列表）

## 风险与注意事项

1. **数据迁移**：需要备份数据库，迁移脚本支持回滚
2. **向后兼容**：flow 的 FlowPermissions 类型变更可能影响已有流程定义
3. **性能**：虚拟列表 + 分页加载确保大数据量下的性能
4. **权限校验**：删除角色时需要检查是否有关联的流程配置
