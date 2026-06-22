# Admin 重构方案：Editor 能力平台化

## 一、核心理念

**editor 和 flow 都是能力平台**，业务能力以 widget 形式沉淀在平台中。

**admin 管理页面的 Schema 渲染直接走 editor 的 PublishView**，admin 壳不做渲染。

```
菜单 routeType=schema → shell → /app/editor/view?id={schemaId}
                                    ↓
                              editor PublishView → WidgetRenderer 渲染

菜单 routeType=micro-app → shell → /app/{appName}/...
                                    ↓
                              子应用加载

菜单 routeType=link → shell → window.open / 当前页跳转
```

## 二、全局架构

```
┌─────────────────────────────────────────────────────────┐
│                     Shell (主宿主)                        │
│                                                          │
│  认证(登录/SSO/Token刷新) + 菜单系统 + 路由分发 + 布局     │
│                                                          │
│  菜单路由分发 (routeType):                                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ schema    → /app/editor/view?id=xxx → editor 渲染   │ │
│  │ micro-app → /app/{appName}/...      → 子应用         │ │
│  │ link      → window.open / 跳转      → 外部链接       │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
   │  Admin   │  │  Editor  │  │   Flow   │  │    AI    │
   │ 微应用宿主│  │ 设计+渲染 │  │ 设计+渲染 │  │ 子应用   │
   └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

## 三、各能力平台职责

### Editor（表单能力平台）

| 能力 | 路由 | 说明 |
|------|------|------|
| Schema 设计 | `/editor` | 可视化设计器 |
| Schema 渲染 | `/view?id=publishId` | PublishView，已发布 Schema 运行时渲染 |
| Schema 预览 | `/preview` | PreviewRenderView |
| 实例管理 | `/instances` | Schema 列表管理 |
| 提交数据管理 | `/submissions` | 表单提交数据 |

**PublishView 已有能力**：
- 通过 `publishId` 加载已发布 Schema
- WidgetRenderer 渲染（49 种 Widget）
- postMessage 通信（iframe 嵌入场景）
- 表单模式（edit/view/partial）
- 数据绑定（set-data/get-data/validate/submit）

### Flow（流程能力平台）

| 能力 | 说明 |
|------|------|
| 流程设计 | Vue Flow 可视化设计器 |
| 流程运行时 | token 推进引擎、审批、多实例 |
| 流程监控 | 实例列表、任务管理 |

### AI（智能能力平台）

| 能力 | 说明 |
|------|------|
| Schema 生成 | Editor Agent 生成表单 |
| 流程生成 | Flow Agent 生成流程 |
| 页面生成 | Page Agent 生成页面布局 |
| 需求分析 | RequirementAnalyzer |
| 任务规划 | TaskPlanner |

## 四、Menu Model 改造

### 新增字段（扩容，不改已有字段）

```typescript
interface IMenu {
  // ---- 现有字段不变 ----
  _id, tenantId, parentId, name, path, icon, type, permission,
  sort, status, component, microAppId, target

  // ---- 新增 ----
  routeType: 'schema' | 'micro-app' | 'link'  // 默认 'micro-app'
  schemaId: string | null     // routeType=schema 时关联 FormSchema._id
  url: string                 // routeType=link 时外部 URL
}
```

### 三种路由类型

| routeType | 必填字段 | Shell 行为 |
|-----------|---------|-----------|
| `schema` | schemaId | 路由到 `/app/editor/view?id={schemaId}` |
| `micro-app` | microAppId + path | 路由到子应用（现有逻辑不变） |
| `link` | url | `_blank` → window.open；`_self` → 当前页跳转 |

### 需要改动的文件

| 文件 | 改动 |
|------|------|
| `server/src/models/Menu.ts` | 增加 routeType/schemaId/url 字段 |
| `server/src/schemas/menuSchemas.ts` | Zod schema 同步 |
| `server/src/routes/menus.ts` | POST/PUT 处理新字段 |
| `shell/src/types/menu.ts` | MenuTreeNode 同步 |
| `shell/src/components/SideMenu.vue` | navigateTo() 扩容三种 routeType |

## 五、SSO 方案

SSO 回调在 Shell 处理（认证统一在 shell）。

**Shell 新增**：
- 路由 `/sso/callback` → `SSOCallbackView.vue`
- `useAuth.ts` 增加 `ssoLogin(code)` 方法

## 六、Admin 壳应用

### 定位

Admin 是**微前端宿主**，不做 Schema 渲染。

- Schema 页面 → shell 直接路由到 editor 的 PublishView
- 扩展子应用 → admin 从 MicroApp API 动态注册 qiankun 子应用

### 目录结构（已创建）

```
packages/admin/
├── src/
│   ├── main.ts              # 双模式入口（qiankun 子应用 + 独立运行）
│   ├── App.vue              # 根组件（含 #micro-app-container 挂载点）
│   ├── router/index.ts      # 路由（自动选择 history 模式）
│   └── views/HomeView.vue   # 首页空状态
├── package.json
├── vite.config.ts
└── index.html
```

### 运行模式

| 模式 | 条件 | History | 鉴权 |
|------|------|---------|------|
| qiankun 子应用 | `__POWERED_BY_QIANKUN__` | MemoryHistory | shell 处理 |
| 独立运行 | 非 qiankun | WebHistory | 自身登录 |

独立启动：`pnpm dev:admin`（端口 5555）

## 七、实施阶段

### Phase 1：删除旧 admin ✅
- 删除 packages/admin/ 目录
- 清理所有引用

### Phase 2：Menu Model 扩容 ✅
- Menu model 增加 routeType/schemaId/url 字段
- Zod schema 同步
- 路由接口返回新字段

### Phase 3：Shell 路由分发改造 ✅
- MenuTreeNode 类型同步
- SideMenu navigateTo() 扩容三种 routeType
- schema → /app/editor/view?id=xxx

### Phase 4：Shell SSO 回调 ✅
- /sso/callback 路由
- SSOCallbackView.vue
- useAuth.ts ssoLogin()

### Phase 5：新建 Admin 壳应用 ✅
- 最小骨架：微前端宿主 + 动态注册扩展子应用
- 构建通过

### Phase 5.1：代码审查 + 问题修复 ✅

审查发现并修复 9 个问题：

| 严重级别 | 问题 | 修复 |
|---------|------|------|
| CRITICAL | SSO redirect_uri 不匹配 | seedClients.ts 补充 shell 的 SSO callback URL |
| BUG | admin App.vue 缺少 #micro-app-container | 添加 DOM 元素 |
| BUG | deploy/pack.sh 缺少 admin | 构建和打包循环加入 admin |
| BUG | SideMenu isActive() 路径不匹配 | 匹配 /app/editor/view?id=xxx |
| INCOMPLETE | nginx 配置缺少 admin | 补充 location 块 |
| MINOR | SSOCallbackView 图标用法 | 改用正确的 Element Plus 图标组件 |
| MINOR | seedMenus 接口不同步 | 补充 routeType/schemaId/url |
| MINOR | README 未记录 admin | 补充项目结构和服务表 |
| MINOR | admin router 注释不一致 | 清理注释 |

### Phase 6：用 editor 搭建菜单管理页面（验证链路）
- 用 editor 设计菜单管理 Schema
- 发布后配置到菜单
- 验证：菜单 schemaId → shell 路由 → editor PublishView 渲染

### Phase 7：链路验证 + 问题修复

### Phase 8：逐个搭建剩余 admin 页面

### Phase 9：收尾
