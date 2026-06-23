# Server 层 RBAC 权限与多租户体系 — 功能清单

> 生成日期：2026-06-23
> 对标参考：RuoYi 权限管理体系

---

## 一、已实现且已应用

以下功能代码已编写，且在实际路由/中间件中生效。

### 1.1 认证体系

| 功能 | 文件 | 说明 |
|------|------|------|
| JWT 双 Token 认证 | `middleware/auth.ts` | access token 15min + refresh token 7d，JWT payload 携带 id/username/roles/tenantId/deptId |
| Token 刷新 | `routes/auth.ts` `POST /api/auth/refresh` | refresh token 换发新 access token |
| SSO 会话管理 | `routes/auth.ts` + `models/SSOSession.ts` | 登录创建 SSO session，cookie 持久化，退出删除 |
| 密码哈希 | `models/User.ts` | bcryptjs，salt rounds = 10 |
| 登录接口 | `routes/auth.ts` `POST /api/auth/login` | 支持 tenantCode 解析租户、用户名+密码校验 |
| 用户信息 | `routes/auth.ts` `GET /api/auth/me` | 返回用户信息 + 从 Role 表解析的权限码列表 |
| 修改密码 | `routes/auth.ts` `POST /api/auth/change-password` | 验证旧密码后更新 |
| 用户注册 | `routes/auth.ts` `POST /api/auth/register` | 开放接口，新用户无角色 |

### 1.2 权限中间件

| 功能 | 文件 | 说明 |
|------|------|------|
| 权限检查 | `middleware/permission.ts` `requirePermission(...)` | 查 Role 表获取用户权限集，任一匹配即通过 |
| 角色检查 | `middleware/permission.ts` `requireRole(...)` | 查 Role 表获取角色名，任一匹配即通过 |
| 开发环境跳过 | 环境变量 `SKIP_PERMISSION_CHECK=true` | 全局跳过权限和角色检查 |

### 1.3 路由级权限覆盖

以下路由的所有 CRUD 端点均绑定了 `requirePermission`：

| 路由模块 | 权限码前缀 | 端点数 |
|----------|-----------|--------|
| `routes/users.ts` | `user:view/create/edit/delete/reset-password` | 6 |
| `routes/roles.ts` | `role:view/create/edit/delete` | 7（含 permissions 列表、角色下用户） |
| `routes/tenant.ts` | `tenant:view/create/edit/delete` | 5 |
| `routes/depts.ts` | `dept:view/create/edit/delete` | 6（含 move） |
| `routes/menus.ts` | `menu:view/create/edit/delete` | 5（不含 /route） |
| `routes/dict.ts` | `dict:view/create/edit/delete` | 10（类型+数据各 5） |
| `routes/config.ts` | `config:view/create/edit/delete` | 5 |
| `routes/auditLog.ts` | `audit:view` | 3（列表+详情+模块列表） |
| `routes/schema.ts` | `schema:create/edit/delete/publish` | 6（写操作，读操作仅 requireAuth） |
| `routes/microApp.ts` | `microapp:view/create/edit/delete` | 5 |
| `routes/apiKey.ts` | `apikey:view/create/edit/delete` | 5 |
| `routes/webhook.ts` | `webhook:view/create/edit/delete` | 6（含日志） |
| `routes/credential.ts` | `credential:create/edit/delete` | 3（读操作仅 requireAuth） |
| `routes/modelConfig.ts` | `model_config:create/edit/delete` | 3 |
| `routes/posts.ts` | `post:view/create/edit/delete` | 6（含 all） |
| `flow-routes/flow.ts` | `flow:view/design` | 多个端点 |
| `flow-routes/flowInstance.ts` | `flow:view/start` | 多个端点 |
| `flow-routes/flowTask.ts` | `flow:approve` | 多个端点 |
| `flow-routes/flowMonitor.ts` | `flow:monitor` | 监控端点 |

### 1.4 数据权限（行级隔离）

| 功能 | 文件 | 已应用位置 |
|------|------|-----------|
| dataScopeMiddleware | `middleware/dataScope.ts` | `flow-routes/flowInstance.ts`（按 initiatedBy 过滤流程实例）、`flow-routes/flowTask.ts`（按 initiatedBy 过滤任务） |
| 4 种数据范围模式 | `models/Role.ts` | `all` / `dept` / `self` / `custom`，角色可配置 |
| 部门树递归查找 | `middleware/dataScope.ts` `findDescendantDepts` | `dept` 模式下自动包含子部门 |
| 自定义部门范围 | `models/Role.ts` `dept_ids` 字段 | `custom` 模式下指定部门列表 |

### 1.5 多租户隔离

| 功能 | 文件 | 说明 |
|------|------|------|
| 租户上下文传播 | `middleware/tenantContext.ts` | AsyncLocalStorage 存储 tenantId，优先级：X-Tenant-Id header → JWT tenantId → 默认 '000000' |
| Mongoose 租户插件 | `middleware/tenantPlugin.ts` | 自动注入 tenantId 到 find/findOne/update/delete/aggregate/save，覆盖 populate 路径 |
| 租户 CRUD | `routes/tenant.ts` | 完整的租户管理接口，绑定 `tenant:*` 权限 |
| 默认租户初始化 | `utils/initDefaultTenant.ts` | code='default', _id='000000', features=['*'] |
| 租户级用户名唯一 | `models/User.ts` | 复合唯一索引 `{ tenantId: 1, username: 1 }` |
| 已挂载 tenantPlugin 的模型 | 15 个 | User, Role, Permission, Menu, Dept, Post, FormSchema, PublishedSchema, DictType, DictData, Config, MicroApp, ApiKey, Webhook, FlowDefinition 等 |

### 1.6 审计日志

| 功能 | 文件 | 说明 |
|------|------|------|
| 自动记录写操作 | `middleware/auditLog.ts` | 记录 POST/PUT/PATCH/DELETE，GET/OPTIONS/HEAD 不记录 |
| 敏感字段脱敏 | `middleware/auditLog.ts` | password/token/secret 等字段自动替换为 ****** |
| 审计日志查询 | `routes/auditLog.ts` | 支持按模块、动作、用户、时间范围、状态筛选 |
| 审计日志模型 | `models/AuditLog.ts` | who/what/when/where/ip/userAgent/duration/errorMsg |

### 1.7 种子数据

| 种子 | 文件 | 内容 |
|------|------|------|
| 权限码 | `utils/seedPermissions.ts` | 56 个权限码，覆盖 schema/flow/tenant/user/role/menu/dept/post/dict/config/audit/microapp/apikey/webhook |
| 管理员角色 | `utils/seedRoles.ts` | 1 个角色"管理员"，拥有全部权限码，data_scope=all |
| 管理员用户 | `utils/seedAdmin.ts` | admin / admin123456，绑定管理员角色，默认租户 |
| 菜单树 | `utils/seedMenus.ts` | 4 个菜单：系统管理(目录)、菜单管理、表单设计器、流程管理 |
| 默认租户 | `utils/initDefaultTenant.ts` | _id='000000', code='default' |
| 角色迁移脚本 | `migrations/migrateRoles.ts` | 将旧 role 字段迁移为 roles 数组，定义管理员/编辑者/查看者 |

### 1.8 菜单权限路由

| 功能 | 文件 | 说明 |
|------|------|------|
| 动态菜单路由 | `routes/menus.ts` `GET /api/menus/route` | 根据用户角色权限过滤可见菜单，裁剪无子节点的空分支，支持 app 参数过滤 |

### 1.9 部门管理

| 功能 | 文件 | 说明 |
|------|------|------|
| 部门树 CRUD | `routes/depts.ts` | 创建/查询(支持 tree=true)/更新/删除 |
| 部门移动 | `routes/depts.ts` `PATCH /:id/move` | 支持移动到新父节点，含环检测 |
| 同名校验 | `routes/depts.ts` | 同级下不允许同名部门 |
| 删除保护 | `routes/depts.ts` | 有子部门或关联用户时禁止删除 |

---

## 二、已实现但未应用（代码存在但未在业务中生效）

### 2.1 数据权限工具未被使用

| 功能 | 文件 | 状态 |
|------|------|------|
| `getDataScopeFilter()` | `utils/dataScope.ts` | 仅在测试文件 `__tests__/role-data-scope.spec.ts` 中使用，无任何路由调用 |
| `buildDataScopeFilter()` | `middleware/dataScope.ts` | 仅被 `dataScopeMiddleware` 内部调用，未被路由直接使用 |
| `resolveAllowedDeptIds()` | `middleware/dataScope.ts` | 仅被 `buildDataScopeFilter` 内部调用 |

**说明**：`middleware/dataScope.ts` 和 `utils/dataScope.ts` 是两套功能重叠的实现。实际只有 `middleware/dataScope.ts` 的 `dataScopeMiddleware` 在 flowInstance 和 flowTask 中使用，`utils/dataScope.ts` 完全未接入业务。

### 2.2 按钮级权限定义了但未联动

| 功能 | 文件 | 状态 |
|------|------|------|
| Menu.type = 'button' | `models/Menu.ts` | 模型支持，但无路由使用此类型做权限拦截 |
| Menu.permission 字段 | `models/Menu.ts` | 菜单路由 `/route` 用它过滤可见菜单，但路由中间件本身不查 Menu 表 |

**说明**：当前权限检查是路由硬编码 `requirePermission('user:edit')`，而非从 Menu 表动态读取。Menu 的 `permission` 字段仅用于前端菜单可见性过滤。

### 2.3 角色迁移脚本中的角色未被种子数据创建

| 角色 | 文件 | 状态 |
|------|------|------|
| 编辑者 | `migrations/migrateRoles.ts` | 迁移脚本定义了，但 `seedRoles.ts` 不创建 |
| 查看者 | `migrations/migrateRoles.ts` | 迁移脚本定义了，但 `seedRoles.ts` 不创建 |

### 2.4 Post（岗位）模型有 RBAC 权限码但关联不足

| 功能 | 状态 |
|------|------|
| `post:view/create/edit/delete` 权限码 | 已在 seedPermissions 中定义 |
| `routes/posts.ts` 路由保护 | 已绑定 `requirePermission('post:*')` |
| Post 与 User 的关联 | **未建立** — User 模型没有 postId 字段，岗位仅是独立实体 |

---

## 三、未实现（对照 RuoYi 缺失）

### 3.1 登录日志

| 项目 | 说明 |
|------|------|
| RuoYi 对标 | `sys_logininfor` 表 |
| 当前状态 | 登录成功/失败无任何日志记录 |
| 需要做的 | 新建 LoginLog 模型，login 接口记录：用户名、登录状态、IP、User-Agent、登录时间、失败原因 |

### 3.2 Token 黑名单 / 强制下线

| 项目 | 说明 |
|------|------|
| RuoYi 对标 | 登出后 token 失效、管理员强制下线 |
| 当前状态 | logout 仅删除 SSO session cookie，refresh token 在 7d 内仍有效 |
| 需要做的 | 登出时将 token jti 写入黑名单（Redis 或 DB 集合），auth 中间件校验时检查 |

### 3.3 在线用户管理

| 项目 | 说明 |
|------|------|
| RuoYi 对标 | `sys_user_online` + 强制下线按钮 |
| 当前状态 | 无在线用户追踪机制 |
| 需要做的 | 基于 SSO session 或 token 活跃记录，提供在线用户列表 + 踢人接口 |

### 3.4 权限缓存

| 项目 | 说明 |
|------|------|
| RuoYi 对标 | Redis 缓存角色权限 |
| 当前状态 | `requirePermission` 每次请求都查 `RoleModel.find()`，无缓存 |
| 需要做的 | 内存 LRU 缓存（如 `lru-cache`），TTL 5-10 分钟，角色变更时主动清除 |

### 3.5 租户管理员角色隔离

| 项目 | 说明 |
|------|------|
| RuoYi 对标 | 租户管理员只能管理自己租户下的用户/角色/菜单 |
| 当前状态 | tenant 路由只有 `tenant:view/create/edit/delete` 权限控制，无"租户管理员"角色定义 |
| 需要做的 | 定义"租户管理员"角色模板，租户创建时自动初始化管理员角色和默认菜单 |

### 3.6 用户-岗位关联

| 项目 | 说明 |
|------|------|
| RuoYi 对标 | `sys_user_post` 关联表 |
| 当前状态 | User 模型无 postId 字段，Post 是独立实体 |
| 需要做的 | User 添加 postIds 字段，或建立 UserPost 关联集合 |

### 3.7 用户-角色分配接口

| 项目 | 说明 |
|------|------|
| RuoYi 对标 | 管理员可给用户分配/移除角色 |
| 当前状态 | 用户创建时 roles 在 body 中传入，PUT 更新也可改 roles，但无专用的角色分配接口 |
| 说明 | 当前通过 `PUT /api/users/:id` 更新 roles 字段可实现，但缺少"给用户批量分配角色"的专用接口 |

### 3.8 操作日志增强

| 项目 | 说明 |
|------|------|
| RuoYi 对标 | 记录方法名、请求参数、响应结果、异常堆栈 |
| 当前状态 | 记录 URL + body + status + duration，缺少方法级别的 trace 和完整的请求/响应链路 |
| 需要做的 | 扩展 AuditLog 模型添加 method、responseBody、stackTrace 字段 |

### 3.9 密码策略

| 项目 | 说明 |
|------|------|
| RuoYi 对标 | 密码复杂度校验 + 过期机制 + 历史密码检查 |
| 当前状态 | 仅检查密码长度 ≥ 8，无复杂度、无过期、无历史检查 |
| 需要做的 | 可配置的密码策略（大小写+数字+特殊字符）、密码过期天数、禁止重复使用最近 N 个密码 |

### 3.10 用户导入导出

| 项目 | 说明 |
|------|------|
| RuoYi 对标 | Excel 批量导入/导出用户 |
| 当前状态 | 无 |
| 需要做的 | 基于 xlsx 库的导入导出接口 |

### 3.11 无权限路由清单

以下路由只有 `requireAuth`（认证）但没有 `requirePermission`（授权），任何已登录用户均可访问：

| 路由 | 端点数 | 风险 |
|------|--------|------|
| `routes/schema.ts` 读操作 | 6 | `GET /`、`GET /published`、`GET /:id`、`GET /:param/versions` 等 — 任何登录用户可读所有 schema |
| `routes/flow.ts` | ~15 | 流程定义/实例/任务的全部端点 — 任何登录用户可操作流程 |
| `routes/stats.ts` | 多个 | 统计数据 — 任何登录用户可查看 |
| `routes/submission.ts` | 多个 | 表单提交数据 — 任何登录用户可读写 |
| `routes/template.ts` | 多个 | 模板管理 — 任何登录用户可操作 |
| `routes/credential.ts` 读操作 | 2 | `GET /`、`GET /:id` — 任何登录用户可查看凭证列表 |
| `flow-routes/flowAction.ts` | 多个 | 流程操作 — 任何登录用户可执行 |
| `flow-routes/flowApproval.ts` | 多个 | 审批操作 — 任何登录用户可审批 |
| `flow-routes/flowBatch.ts` | 多个 | 批量操作 — 任何登录用户可执行 |
| `flow-routes/flowExport.ts` | 多个 | 导出操作 — 任何登录用户可导出 |
| `flow-routes/flowMessage.ts` | 多个 | 消息操作 — 任何登录用户可操作 |
| `flow-routes/flowNotification.ts` | 多个 | 通知操作 — 任何登录用户可操作 |
| `flow-routes/flowTemplate.ts` | 多个 | 流程模板 — 任何登录用户可操作 |
| `flow-routes/flowVersion.ts` | 多个 | 版本管理 — 任何登录用户可操作 |

以下路由既无 auth 也无 permission（公开接口，部分合理）：

| 路由 | 说明 | 是否合理 |
|------|------|----------|
| `routes/health.ts` | 健康检查 | ✅ 合理 |
| `routes/docs.ts` | API 文档 | ✅ 合理 |
| `routes/data.ts` | 数据源 | ⚠️ 需评估 |
| `routes/mock.ts` | Mock 数据 | ⚠️ 需评估 |
| `routes/options.ts` | 选项配置 | ⚠️ 需评估 |
| `routes/sso.ts` | SSO 回调 | ✅ 合理（外部回调） |
| `routes/mcp.ts` | MCP 接口 | ⚠️ 需评估 |
| `routes/webhookTrigger.ts` | Webhook 触发 | ✅ 合理（外部调用） |
| `flow-routes/flowTimer.ts` | 定时任务 | ✅ 合理（内部调度） |

---

## 四、已知问题

| # | 问题 | 影响 | 位置 |
|---|------|------|------|
| 1 | 两套 dataScope 实现并存 | `middleware/dataScope.ts` 和 `utils/dataScope.ts` 功能重叠，逻辑不一致 | middleware/dataScope.ts vs utils/dataScope.ts |
| 2 | 租户解析可被 header 伪造 | tenantContextMiddleware 优先取 X-Tenant-Id header，客户端可伪造租户身份 | middleware/tenantContext.ts:42 |
| 3 | dev fallback 跳过权限检查 | 非生产环境 auth 中间件在无 token 时注入 dev 用户（roles=[]），但很多路由不检查权限 | middleware/auth.ts:32 |
| 4 | 注册用户无角色 | `POST /api/auth/register` 创建的用户 roles=[]，无法使用任何需要权限的功能 | routes/auth.ts:291 |
| 5 | credential 路由读写权限不一致 | GET 不需要权限，POST/PUT/DELETE 需要 | routes/credential.ts |
| 6 | schema 读操作无权限控制 | `GET /`、`GET /:id` 等只检查登录，不检查 `schema:view` | routes/schema.ts |
