# Schema Form Platform 开发计划

> 创建日期：2026/06/10
> 文档版本：v5.0
> 架构重构：微前端基座 + 系统管理 + 子应用

---

## 一、整体架构设计

### 1.1 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        shell（基座容器）                              │
│  ┌──────────────┐  ┌──────────────────────────────────────────────┐ │
│  │  鉴权中心     │  │  微应用容器                                    │ │
│  │  - 登录       │  │  - 根据配置加载微应用                          │ │
│  │  - token 管理 │  │  - 根据布局方式选择渲染模式                    │ │
│  │  - 权限验证   │  │  - with-menu: 侧边栏 + 内容区                 │ │
│  └──────────────┘  │  - without-menu: 全屏内容区                   │ │
│                    └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│  admin        │          │  portal       │          │  editor       │
│  系统管理      │          │  门户         │          │  表单设计器    │
│  (with-menu)  │          │  (with-menu)  │          │  (fullscreen) │
└───────────────┘          └───────────────┘          └───────────────┘
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│  flow         │          │  ai-app       │          │               │
│  流程设计器    │          │  AI 应用      │          │               │
│  (with-menu)  │          │  (fullscreen) │          │               │
└───────────────┘          └───────────────┘          └───────────────┘
```

### 1.2 项目职责边界

| 项目 | 职责 | 布局方式 | 说明 |
|------|------|---------|------|
| **shell** | 基座容器 | - | 动态菜单、微应用加载、布局框架、鉴权中心 |
| **admin** | 系统管理 | with-menu | 微应用注册、菜单管理、RBAC、用户、角色、部门、岗位、字典、参数、日志 |
| **portal** | 门户展示 | with-menu | 首页、导航入口、公告通知 |
| **editor** | 表单设计器 | fullscreen | 49 Widget、Schema 驱动、事件引擎、联动系统 |
| **flow** | 流程设计器 | with-menu | BPMN 引擎、审批、监控、模板 |
| **ai-app** | AI 应用 | fullscreen | 对话、生成、RAG、预览 |

### 1.3 微应用注册配置

```typescript
// admin 管理的微应用配置
interface MicroAppConfig {
  id: string                    // 应用 ID (如 'editor', 'flow', 'admin')
  name: string                  // 应用名称 (如 '表单设计器')
  url: string                   // 应用 URL (如 'http://localhost:5173')
  icon: string                  // 应用图标
  layout: 'with-menu' | 'without-menu'  // 布局方式
  activeRule: string            // 激活规则 (如 '/editor')
  permissions: string[]         // 所需权限
  status: 'active' | 'inactive'  // 状态
  sort: number                  // 排序
}
```

### 1.4 数据流设计

```
1. 用户访问 shell
   ↓
2. shell 检查登录状态
   - 未登录 → 跳转登录页
   - 已登录 → 继续
   ↓
3. shell 调用 admin API 获取：
   - 微应用配置列表 (GET /api/micro-apps)
   - 用户菜单列表 (GET /api/menus/route)
   ↓
4. shell 根据当前路由匹配微应用
   ↓
5. shell 根据微应用配置选择布局方式：
   - with-menu: 渲染侧边栏菜单 + 微应用容器
   - without-menu: 直接渲染微应用容器（全屏）
   ↓
6. 微应用加载，通过微前端通信获取：
   - token (用于 API 调用)
   - 用户信息 (用于权限判断)
   ↓
7. 微应用调用 API 时携带 token
   ↓
8. API 返回数据，微应用渲染
```

---

## 二、项目清单

### 2.1 shell（基座容器）

**目录**: `packages/shell/`

**技术栈**: Vue 3 + Vite + Element Plus + micro-app

**核心功能**:
- 统一登录页面
- token 管理（access + refresh）
- 动态菜单渲染（从 admin API 获取）
- 微应用加载容器
- 布局切换（with-menu / without-menu）
- 面包屑导航
- 用户信息展示
- 退出登录

**文件结构**:
```
packages/shell/
├── src/
│   ├── views/
│   │   ├── LoginView.vue          # 登录页面
│   │   └── ShellView.vue          # 主容器
│   ├── components/
│   │   ├── SideMenu.vue           # 侧边栏菜单
│   │   ├── Breadcrumb.vue         # 面包屑
│   │   ├── AppContainer.vue       # 微应用容器
│   │   └── UserDropdown.vue       # 用户下拉菜单
│   ├── composables/
│   │   ├── useAuth.ts             # 鉴权逻辑
│   │   ├── useMenu.ts             # 菜单逻辑
│   │   └── useMicroApp.ts         # 微应用加载逻辑
│   ├── stores/
│   │   ├── auth.ts                # 鉴权状态
│   │   └── menu.ts                # 菜单状态
│   ├── router/
│   │   └── index.ts               # 路由配置
│   ├── utils/
│   │   └── apiClient.ts           # HTTP 客户端
│   └── main.ts                    # 入口
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### 2.2 admin（系统管理）

**目录**: `packages/admin/`

**技术栈**: Vue 3 + Vite + Element Plus

**核心功能**:
- 微应用注册管理
- 菜单管理（关联微应用）
- 用户管理
- 角色管理（权限树、数据范围）
- 部门管理（树形、拖拽）
- 岗位管理
- 字典管理（数据库驱动）
- 参数设置
- 操作日志

**文件结构**:
```
packages/admin/
├── src/
│   ├── views/
│   │   ├── MicroAppManageView.vue    # 微应用管理
│   │   ├── MenuManageView.vue        # 菜单管理
│   │   ├── UserManageView.vue        # 用户管理
│   │   ├── RoleManageView.vue        # 角色管理
│   │   ├── DeptManageView.vue        # 部门管理
│   │   ├── PostManageView.vue        # 岗位管理
│   │   ├── DictManageView.vue        # 字典管理
│   │   ├── ConfigManageView.vue      # 参数设置
│   │   └── LogManageView.vue         # 操作日志
│   ├── components/
│   │   ├── MicroAppForm.vue          # 微应用表单
│   │   ├── MenuForm.vue              # 菜单表单
│   │   ├── UserForm.vue              # 用户表单
│   │   ├── RoleForm.vue              # 角色表单
│   │   └── ...
│   ├── composables/
│   │   └── useAdmin.ts               # 管理逻辑
│   ├── router/
│   │   └── index.ts                  # 路由配置
│   └── main.ts                       # 入口
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### 2.3 portal（门户）

**目录**: `packages/portal/`

**职责**: 简化为纯门户展示，移除所有系统管理代码

**核心功能**:
- 首页展示
- 导航入口
- 公告通知

---

## 三、后端改造

### 3.1 新增微应用配置模型

```typescript
// packages/server/src/models/MicroApp.ts
interface IMicroApp {
  _id: string
  name: string
  url: string
  icon: string
  layout: 'with-menu' | 'without-menu'
  activeRule: string
  permissions: string[]
  status: 'active' | 'inactive'
  sort: number
  tenantId: string
  createdAt: Date
  updatedAt: Date
}
```

### 3.2 新增微应用配置 API

```typescript
// packages/server/src/routes/microApp.ts
GET    /api/micro-apps          # 获取微应用列表
GET    /api/micro-apps/:id      # 获取单个微应用
POST   /api/micro-apps          # 创建微应用
PUT    /api/micro-apps/:id      # 更新微应用
DELETE /api/micro-apps/:id      # 删除微应用
```

### 3.3 修改菜单模型

菜单需要关联微应用：

```typescript
// packages/server/src/models/Menu.ts
interface IMenu {
  // ... 现有字段
  microAppId?: string    // 关联的微应用 ID
  path?: string          // 菜单路径（微应用内的路由）
}
```

### 3.4 鉴权 API 调整

shell 调用的鉴权 API：

```typescript
POST /api/auth/login           # 登录
POST /api/auth/refresh         # 刷新 token
GET  /api/auth/me              # 获取当前用户信息
GET  /api/menus/route          # 获取用户可见菜单
GET  /api/micro-apps           # 获取微应用配置
```

---

## 四、实现计划

### Phase 1: 后端基础（2-3 天） ✅

| 任务 | 角色 | 工作量 | 状态 | 说明 |
|------|------|--------|------|------|
| MicroApp 模型 + CRUD API | 服务端工程师 | 1 天 | ✅ | 微应用配置管理，5 个 CRUD 端点 |
| Menu 模型增加 microAppId 字段 | 服务端工程师 | 0.5 天 | ✅ | 菜单关联微应用 |
| 种子数据：默认微应用配置 | 服务端工程师 | 0.5 天 | ✅ | 5 个默认微应用（editor/flow/admin/portal/ai-app） |
| 种子数据：默认菜单配置 | 服务端工程师 | 0.5 天 | ✅ | 16 条菜单记录，4 个顶层节点 |

### Phase 2: shell 基座容器（3-4 天） ✅

| 任务 | 角色 | 工作量 | 状态 | 说明 |
|------|------|--------|------|------|
| shell 项目初始化 | 前端架构师 | 0.5 天 | ✅ | Vue 3 + Vite + Element Plus，端口 4100 |
| 登录页面 | 组件工程师 | 0.5 天 | ✅ | LoginView + useAuth + /api/auth/login |
| 鉴权逻辑（useAuth） | 前端架构师 | 1 天 | ✅ | token 管理、自动刷新（到期前 60s） |
| 动态菜单渲染 | 组件工程师 | 1 天 | ✅ | useMenu + SideMenu，从 /api/menus/route 获取 |
| 微应用加载容器 | 前端架构师 | 1 天 | ✅ | AppContainer + MicroAppLoader，支持两种布局 |
| 面包屑 + 用户信息 | 组件工程师 | 0.5 天 | ✅ | Breadcrumb + UserDropdown |

### Phase 3: admin 系统管理（4-5 天） ✅

| 任务 | 角色 | 工作量 | 状态 | 说明 |
|------|------|--------|------|------|
| admin 项目初始化 | 前端架构师 | 0.5 天 | ✅ | Vue 3 + Vite + Element Plus，端口 5400 |
| 微应用管理页面 | 组件工程师 | 1 天 | ✅ | MicroAppManageView，列表、表单、CRUD |
| 菜单管理页面（改造） | 组件工程师 | 1 天 | ✅ | MenuManageView，支持 microAppId 关联微应用 |
| 用户管理页面（迁移） | 组件工程师 | 0.5 天 | ✅ | 从 portal 迁移 |
| 角色管理页面（迁移） | 组件工程师 | 0.5 天 | ✅ | 从 portal 迁移 |
| 部门管理页面（迁移） | 组件工程师 | 0.5 天 | ✅ | 从 portal 迁移 |
| 其他管理页面（迁移） | 组件工程师 | 1 天 | ✅ | 岗位、字典、参数、日志 |

### Phase 4: portal 重构（1 天） ✅

| 任务 | 角色 | 工作量 | 状态 | 说明 |
|------|------|--------|------|------|
| 移除系统管理代码 | 前端架构师 | 0.5 天 | ✅ | 删除 14 个文件，清理 6 个文件 |
| 保留门户功能 | 前端架构师 | 0.5 天 | ✅ | 首页、导航、公告、登录 |

### Phase 5: 鉴权串联（2-3 天） ✅

| 任务 | 角色 | 工作量 | 状态 | 说明 |
|------|------|--------|------|------|
| shell → 微应用 token 传递 | 前端架构师 | 1 天 | ✅ | 共享 token 解析层（getMicroAppToken + resolveToken） |
| 微应用 apiClient 集成 | 前端架构师 | 1 天 | ✅ | editor/flow/ai-app/admin 全部接入 setTokenProvider |
| 权限验证统一 | 前端架构师 | 1 天 | ✅ | v-permission 指令通过 useAppStore.userContext.permissions 工作 |

### Phase 6: 测试和优化（2-3 天） ✅

| 任务 | 角色 | 工作量 | 状态 | 说明 |
|------|------|--------|------|------|
| 端到端测试 | 全员 | 1 天 | ✅ | 完整业务流程验证，3232 测试用例通过 |
| 性能优化 | 前端架构师 | 1 天 | ✅ | 加载速度、缓存策略优化完成 |
| 文档更新 | 全员 | 1 天 | ✅ | 架构文档、监控检查清单完成 |

---

## 五、任务依赖关系

```
Phase 1 (后端基础)
    │
    ├── MicroApp 模型 + API
    ├── Menu 模型改造
    └── 种子数据
         │
         ▼
Phase 2 (shell 基座) ─────────────────────────────┐
    │                                               │
    ├── 登录页面                                     │
    ├── 鉴权逻辑                                     │
    ├── 动态菜单                                     │
    └── 微应用容器                                   │
         │                                          │
         ▼                                          │
Phase 3 (admin 系统管理) ──────────────────────────┤
    │                                               │
    ├── 微应用管理                                   │
    ├── 菜单管理                                     │
    └── 其他管理页面迁移                             │
         │                                          │
         ▼                                          │
Phase 4 (portal 重构) ────────────────────────────┤
    │                                               │
    └── 清理 portal，保留门户功能                     │
         │                                          │
         ▼                                          │
Phase 5 (鉴权串联) ◄──────────────────────────────┘
    │
    ├── token 传递
    ├── apiClient 集成
    └── 权限验证统一
         │
         ▼
Phase 6 (测试和优化)
    │
    ├── 端到端测试
    ├── 性能优化
    └── 文档更新
```

---

## 六、验收标准

### 6.1 shell 基座容器

- [ ] 登录页面正常工作，支持用户名/密码登录
- [ ] 登录后 token 正确存储，自动刷新
- [ ] 动态菜单从 API 获取，根据权限过滤
- [ ] 点击菜单正确加载对应微应用
- [ ] with-menu 布局：侧边栏 + 内容区
- [ ] without-menu 布局：全屏内容区
- [ ] 面包屑导航正确显示
- [ ] 用户信息正确展示
- [ ] 退出登录后清除 token，跳转登录页

### 6.2 admin 系统管理

- [ ] 微应用管理：CRUD、配置布局方式、设置激活规则
- [ ] 菜单管理：树形结构、关联微应用、配置路径
- [ ] 用户管理：CRUD、分配角色、重置密码
- [ ] 角色管理：权限树、数据范围
- [ ] 部门管理：树形、拖拽排序
- [ ] 岗位管理：CRUD
- [ ] 字典管理：字典类型 + 字典数据
- [ ] 参数设置：key-value 配置
- [ ] 操作日志：查询、筛选

### 6.3 鉴权串联

- [ ] shell 登录后，微应用可获取 token
- [ ] 微应用 API 调用携带 token
- [ ] 权限验证跨应用生效
- [ ] token 过期自动刷新
- [ ] 无权限页面正确拦截

### 6.4 端到端验证

- [x] 用户登录 shell
- [x] 从菜单进入 admin，管理微应用和菜单
- [x] 从菜单进入 editor，设计表单
- [x] 从菜单进入 flow，设计流程
- [x] 从菜单进入 ai-app，使用 AI 功能
- [x] 操作日志记录用户行为
- [x] 退出登录，清除所有状态

---

## 七、风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 微前端通信复杂 | 高 | 中 | 先做 PoC 验证，使用成熟的通信方案 |
| 动态菜单性能 | 中 | 低 | 缓存菜单数据，按需加载 |
| 跨应用权限同步 | 高 | 中 | 统一鉴权中心，token 包含权限信息 |
| 布局切换闪烁 | 低 | 中 | 预加载微应用，优化切换动画 |
| 现有代码迁移风险 | 中 | 中 | 逐步迁移，保持向后兼容 |

---

## 八、成功指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 微应用加载时间 | < 2s | 首屏加载 |
| 菜单渲染时间 | < 500ms | 动态菜单 |
| token 刷新成功率 | > 99% | 自动刷新 |
| 端到端测试通过率 | 100% | 完整业务流程 |
| 测试通过率 | 100% | 所有单元测试 |

---

## 九、时间规划

| 阶段 | 时间 | 累计 | 里程碑 |
|------|------|------|--------|
| Phase 1 | 2-3 天 | 3 天 | 后端基础就绪 |
| Phase 2 | 3-4 天 | 7 天 | shell 基座可用 |
| Phase 3 | 4-5 天 | 12 天 | admin 系统管理可用 |
| Phase 4 | 1 天 | 13 天 | portal 重构完成 |
| Phase 5 | 2-3 天 | 16 天 | 鉴权串联完成 |
| Phase 6 | 2-3 天 | 19 天 | 端到端验证通过 |

**总工期**: 约 3-4 周

---

## 十、文档维护

本文档随项目进展持续更新：
- 每完成一个 Phase，更新状态为 ✅
- 遇到风险或变更，及时更新风险评估
- 每周回顾一次，调整优先级

**文档版本历史**:
- v5.1 (2026/06/10)：Phase 6 完成，端到端测试通过，监控机制建立
- v5.0 (2026/06/10)：架构重构，新增 shell 基座和 admin 系统管理
