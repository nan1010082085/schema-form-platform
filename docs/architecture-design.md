# 架构设计文档

> 最后更新：2026-06-24

---

## 一、微前端架构

### 1.1 核心原则

**全链路 qiankun，禁止 iframe。**

- qiankun 是本项目的微前端容器方案，所有子应用加载统一使用 qiankun `loadMicroApp`
- Shell 是唯一的业务容器，不需要 Admin 项目
- Shell 区分容器类型，根据菜单配置动态启动 qiankun 实例加载子应用

### 1.2 Shell 职责边界

Shell 只包含：
- 登录 / SSO 认证
- 顶层布局（侧边栏、顶部导航）
- 子应用注册管理（唯一内置页面）
- 子应用加载容器（区分容器类型，动态启动实例）

**所有业务页面（包括系统管理 RBAC 全部界面）都由 editorPlatform 动态搭建，Shell 不做业务渲染。**

### 1.3 子应用加载流程

```
1. Shell 启动 → 从 /api/micro-apps 拉取全量子应用配置 → 初始化注册
2. 用户点击菜单 → SideMenu 解析 routeType
3. 根据 target 选择容器类型（app 嵌入 / standalone 全屏）
4. 容器手动 start → 启动 qiankun 实例
5. 子应用加载 → 根据 activeRule 匹配 → 渲染对应路由地址的界面
```

### 1.4 子应用注册

子应用通过 `/api/micro-apps` 接口管理，支持 CRUD。

**注册方式**：
- Shell 提供子应用注册管理界面（唯一内置页面）
- 通过接口动态注册，不在 seed 或 shared 代码中硬编码

**接口必须返回全量数据**，每条记录包含：
- `name` — 注册名（如 `editorPlatform`、`flowPlatform`、`aiPlatform`）
- `activeRule` — 路径匹配规则（决定什么路径展示什么子应用）
- `url` — entry URL
- `layout` — 容器类型（`with-menu` 侧边菜单 / `without-menu` 全展示）
- `status` — 状态（active / inactive）

### 1.5 两种容器模式

| 模式 | URL 格式 | 容器 | 说明 |
|------|---------|------|------|
| 嵌入 | `/app/{appName}/{route}` | 侧边菜单布局 | Shell 侧边栏 + 子应用内容区 |
| 独立 | `/standalone/{appName}/{route}` | 全屏布局 | 无 Shell 侧边栏，子应用独占页面 |

容器选择由菜单配置的 `target` 字段决定：
- `target: '_self'` → 嵌入模式（`/app/...`）
- `target: '_blank'` → 独立模式（`/standalone/...`，新页签打开）

### 1.6 子应用命名规范

三大能力平台的注册名使用 `xxxPlatform` 格式：

| 应用 | 注册名 | activeRule | 说明 |
|------|--------|-----------|------|
| 表单设计器 | `editorPlatform` | `/editorPlatform` | 能力平台 |
| 流程设计器 | `flowPlatform` | `/flowPlatform` | 能力平台 |
| AI 应用 | `aiPlatform` | `/aiPlatform` | 能力平台 |

URL 示例：
- 嵌入：`/app/editorPlatform/view?id=xxx`
- 独立：`/standalone/flowPlatform/design`

第三方应用注册名由管理员在注册界面自定义。

### 1.7 各应用角色

| 应用 | 注册名 | 角色 |
|------|--------|------|
| Shell | — | 顶层容器（登录、布局、子应用管理、容器加载） |
| 表单设计器 | editorPlatform | 能力平台（设计 + 渲染） |
| 流程设计器 | flowPlatform | 能力平台（流程引擎） |
| AI 应用 | aiPlatform | 能力平台（智能助手） |
| 第三方 | 自定义 | 扩展应用 |

### 1.8 Shared 组件

| 组件 | 用途 | 位置 |
|------|------|------|
| `MicroAppContainer` | qiankun 子应用容器 | `shared/qiankun/MicroAppContainer.vue` |
| `useMicroApp` | 子应用加载 composable | `shared/qiankun/useMicroApp.ts` |
| `createQiankunApp` | 子应用生命周期工厂 | `shared/qiankun/createQiankunApp.ts` |

---

## 二、菜单路由分发

### 2.1 三种 routeType

| routeType | 必填字段 | Shell 行为 |
|-----------|---------|-----------|
| `schema` | schemaId | Shell 加载 editorPlatform → 渲染 schema |
| `micro-app` | microAppId + path | `_self` → 嵌入；`_blank` → 新页签 |
| `link` | url | `_blank` → window.open；`_self` → 当前页跳转 |

### 2.2 菜单数据结构

```typescript
interface MenuTreeNode {
  id: string
  name: string
  path: string
  icon: string
  routeType: 'schema' | 'micro-app' | 'link'
  schemaId: string | null      // routeType=schema 时关联的 publishId
  microAppId: string | null    // routeType=micro-app 时关联的子应用
  target: '_self' | '_blank'
  url: string                  // routeType=link 时外部 URL
  children: MenuTreeNode[]
}
```

### 2.3 路由 URL 结构

```
/{容器类型}/{子应用注册名}/{子应用内部路由}
```

| 段 | 说明 | 示例 |
|---|---|---|
| 容器类型 | `app`（嵌入）/ `standalone`（新页签） | `app`、`standalone` |
| 子应用注册名 | qiankun 注册名 | `editorPlatform`、`flowPlatform`、`aiPlatform` |
| 子应用内部路由 | 子应用自己的路由 | `view?id=xxx`、`design` |

### 2.4 路由分发流程

```
菜单点击 → SideMenu.navigateTo(node)

routeType=schema:
  Shell 加载 editorPlatform → /app/editorPlatform/view?id={schemaId}
  Editor PublishView 渲染 schema

routeType=micro-app, target=_self:
  Shell 嵌入子应用 → /app/{appName}/{path}

routeType=micro-app, target=_blank:
  新页签 → /standalone/{appName}/{subPath}

routeType=link:
  window.open 或跳转
```

### 2.5 页面来源

| 页面类型 | 来源 | 示例 |
|---------|------|------|
| 子应用管理 | Shell 唯一内置页面 | 子应用注册、编辑、启停 |
| 系统管理（RBAC） | editorPlatform 动态搭建 | 用户管理、角色管理、菜单管理 |
| 业务页面 | editorPlatform 动态搭建 | 业务表单、报表、数据看板 |
| 独立子应用 | Shell 加载 | flowPlatform、aiPlatform、第三方 |

---

## 三、可视化编辑器

### 3.1 搭建原则

**整个画布就是页面**，不是缩在容器部件内搭建。

- 使用画布全尺寸构建界面，不套布局容器部件包裹
- 现有架构已能满足：表单、表格、弹框、标签页、多列布局等交互搭建
- 只有当现有部件确实不满足时，才新增业务部件（widget）

### 3.2 画布尺寸模式

当前画布和部件使用固定 px 值。需要支持百分比配置。

| 尺寸模式 | 用途 | 示例 |
|---------|------|------|
| 固定 px | 精确控制 | 按钮 120px、弹框 600px |
| 百分比 % | 响应式适配 | 表格列 30%/70%、布局列 50%/50% |

需要支持百分比的部件：
- 画布整体宽度配置（固定 px / 百分比）
- 多列布局（single-col / double-col / triple-col / quad-col）的列宽
- 表格列宽
- 容器（card / tabs）内部子部件尺寸

### 3.3 页面类型与预览

每个页面应有明确的类型分类和对应展示图，不是所有页面都默认为表单。

| 页面类型 | 说明 | 展示 |
|---------|------|------|
| 表单 (form) | 数据录入 | 表单样式预览图 |
| 列表 (list) | 数据展示 | 表格样式预览图 |
| 详情 (detail) | 数据只读查看 | 详情样式预览图 |
| 看板 (dashboard) | 数据统计 | 图表样式预览图 |
| 自定义 (custom) | 特殊布局 | 自定义预览图 |

---

## 四、环境变量

| 变量 | 用途 | dev 值 | prod 值 |
|------|------|--------|---------|
| `VITE_BASE_PATH` | Shell 路由 base | `/` | `/schema-platform/` |
| `VITE_API_BASE_URL` | API 请求前缀 | `/api` | `/schema-platform/api` |

---

## 五、微前端技术栈

### 5.1 Shell：qiankun 容器

Shell 使用 qiankun `loadMicroApp` 加载子应用。不同容器在渲染时动态启动 qiankun 实例。

- 嵌入容器（`/app/...`）：侧边菜单布局，动态启动实例
- 独立容器（`/standalone/...`）：全屏布局，动态启动实例

### 5.2 Editor：micro-app 微应用部件

Editor 引入京东 `@micro-zoe/micro-app` 作为微应用部件（widget）。

**加载方式：**
- URL 加载：直接指定远程地址（如 `https://example.com/micro-app/`）
- 文件资源加载：指定实际文件资源地址（如 `/assets/micro-app/index.html`）

**属性配置：**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| name | string | — | 微应用名称 |
| url | string | — | 微应用地址（URL 或文件资源路径） |
| width | string | 100% | 宽度 |
| height | string | 100% | 高度 |
| props | object | — | 传递给微应用的数据 |

### 5.3 Editor：iframe 部件容器

Editor 新增 iframe 部件容器 widget，用于嵌入外部页面（第三方系统、报表等）。

**属性配置：**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| src | string | — | iframe URL |
| border | boolean | false | 是否显示边框 |
| width | string | 100% | 宽度（px / %） |
| height | string | 100% | 高度（px / %） |
| fullscreen | boolean | false | 全屏模式 |
| dialogMode | boolean | false | 弹框模式 |
| dialogTitle | string | — | 弹框标题（dialogMode=true 时） |

**弹框模式（dialogMode）：**
- div 包裹 iframe
- 非全屏时实现遮罩层（mask）
- 支持拖拽、关闭
- 全屏时去除遮罩，iframe 占满

**注意：iframe 仅用于 Editor 的 widget 部件，不用于 Shell 的子应用加载。**

### 5.4 postMessage 通信

Editor 的 micro-app 部件和 iframe 部件统一使用 postMessage 进行通信。

通信协议：
```typescript
interface MicroAppMessage {
  type: string        // 消息类型（如 'fg:set-data', 'fg:get-data'）
  id?: string         // 关联的 schemaId / publishId
  requestId?: string  // 请求-响应匹配 ID
  data?: unknown      // 消息数据
}
```

支持的消息类型：
- `fg:set-data` — 向子应用推送数据
- `fg:get-data` — 从子应用获取数据
- `fg:validate` — 触发子应用校验
- `fg:submit` — 触发子应用提交
- `fg:set-mode` — 设置子应用模式（edit/view/partial）

### 5.5 三层架构总结

| 层级 | 技术 | 用途 |
|------|------|------|
| Shell 子应用加载 | qiankun loadMicroApp | 应用级加载，动态启动实例 |
| Editor 微应用部件 | 京东 micro-app | 组件级嵌入，schema 内渲染 |
| Editor iframe 部件 | iframe + postMessage | 嵌入外部页面 |

---

## 六、设计约束

1. **Shell 只做容器** — 仅包含登录、布局、子应用注册管理，不做业务渲染
2. **所有业务页面由 editorPlatform 搭建** — 包括系统管理 RBAC 全部界面
3. **部件不够就扩展** — Editor widget 不满足时，新增业务部件（widget），不写 Vue 组件
4. **页面类型明确** — 每个页面有明确类型（form/list/detail/dashboard/custom）和对应展示图
5. **Shell 子应用加载禁止 iframe** — 统一走 qiankun `loadMicroApp`
6. **Editor widget 允许 iframe** — iframe 仅用于 iframe 部件容器 widget
7. **子应用注册动态化** — 通过接口 + 管理界面注册，不在 seed/shared 硬编码
8. **命名规范** — 三大能力平台：editorPlatform、flowPlatform、aiPlatform
9. **通信统一 postMessage** — Editor 的 micro-app 和 iframe 部件统一用 postMessage
10. **遇到问题解决，不绕道** — 微前端加载出错时排查根因解决，不用 iframe 兜底
