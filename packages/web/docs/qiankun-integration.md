# qiankun 微前端集成

## 概述

本项目（`@schema-form/web`）作为 qiankun 微前端架构中的**子应用**运行，由主应用统一调度和加载。子应用在独立运行和 qiankun 模式下共享同一套代码，通过 `vite-plugin-qiankun` 实现生命周期钩子注册和运行时环境检测。

核心能力：
- 主应用通过 Props 注入用户身份、请求配置、全局状态
- 路由自动适配 `/child/schemaForm/` 前缀，与主应用路由互不冲突
- 支持全局状态双向通信（`onGlobalStateChange` / `setGlobalState`）

## Props 接口

主应用在 mount 阶段向子应用传递 `SchemaFormQiankunProps`：

```typescript
interface SchemaFormQiankunProps {
  /** 用户信息 */
  user?: {
    id?: string
    name?: string
    deptId?: string
    deptName?: string
    roles?: string[]
  }

  /** 请求配置 */
  request?: {
    token?: string
    headers?: Record<string, string>
    baseUrl?: string
  }

  /** 全局配置（字典表、业务配置等） */
  global?: {
    dictMap?: Record<string, DictItem[]>
    config?: Record<string, unknown>
  }

  /** Cookie 字符串（兼容 Sinosoft-Auth 模式，子应用自动提取 token） */
  cookie?: string

  /** 路由基础路径 */
  routerBase?: string

  /** 公共方法（主应用暴露给子应用调用） */
  commonFun?: Record<string, (...args: unknown[]) => unknown>

  /** localforage 实例 */
  localforage?: unknown

  /** 成功状态码 */
  success_status?: string

  /** 全局状态变更监听（qiankun initGlobalState 返回的方法） */
  onGlobalStateChange?: (
    callback: (state: Record<string, unknown>) => void,
    immediate?: boolean
  ) => void

  /** 设置全局状态 */
  setGlobalState?: (state: Record<string, unknown>) => void
}
```

子应用在 `mount` 生命周期中通过 `useAppStore().setQiankunProps(props)` 接收并解析这些 Props，将 `user`、`request`、`global` 三层上下文写入 Pinia Store。

## 路由配置

子应用路由基础路径根据运行环境自动切换：

```typescript
// packages/web/src/router/index.ts
const routerBase = qiankunWindow.__POWERED_BY_QIANKUN__
  ? '/child/schemaForm/'   // qiankun 模式
  : import.meta.env.BASE_URL  // 独立运行模式
```

qiankun 模式下，所有页面路由都挂在 `/child/schemaForm/` 前缀下：

| 路由 | 页面 |
|---|---|
| `/child/schemaForm/instances` | 实例列表 |
| `/child/schemaForm/editor` | 表单编辑器 |
| `/child/schemaForm/preview` | 预览渲染 |
| `/child/schemaForm/view?id=xxx` | 已发布表单查看 |
| `/child/schemaForm/docs` | 组件文档 |

主应用需注册子应用时配置 `activeRule` 匹配此前缀。

## 生命周期

通过 `renderWithQiankun` 注册四个标准钩子：

```typescript
// packages/web/src/main.ts
renderWithQiankun({
  async bootstrap() {
    // 子应用初始化（仅执行一次）
    console.log('[schema-form] bootstrap')
  },

  async mount(props: QiankunProps) {
    // 创建 Vue 应用、挂载 DOM
    render(props)
    // 从 props 初始化 Store
    const appStore = useAppStore(pinia!)
    appStore.setQiankunProps(props)
    // 初始化 HTTP 请求实例（axios + apiClient）
    createRequestInstance({ baseUrl, token, headers })
    configureApiClient({ baseUrl, getToken })
  },

  async unmount() {
    // 卸载 Vue 应用、清理资源
    app?.unmount()
    app = null
    pinia = null
  },

  async update() {
    // Props 变更时触发（可选）
  }
})
```

独立运行时（非 qiankun 环境），直接调用 `render()` 挂载到 `#app`。

## 全局状态通信

子应用通过 Props 中的 `onGlobalStateChange` 和 `setGlobalState` 与主应用进行全局状态通信。

### 监听全局状态变更

在 `setQiankunProps` 内部自动注册监听：

```typescript
// packages/web/src/stores/app.ts
if (props.onGlobalStateChange) {
  props.onGlobalStateChange((state) => {
    if (state.user) Object.assign(userContext.value, state.user)
    if (state.request) Object.assign(requestContext.value, state.request)
    if (state.global) Object.assign(globalContext.value, state.global)
  })
}
```

当主应用调用 `setGlobalState()` 更新状态时，子应用自动同步到本地 Store。

### 向主应用发送状态

子应用可通过 Props 中的 `setGlobalState` 向主应用推送状态变更：

```typescript
const props = useAppStore().qiankunProps
props.setGlobalState?.({ key: 'value' })
```

## 主应用注册示例

```javascript
// 主应用中注册子应用
import { registerMicroApps, start } from 'qiankun'

registerMicroApps([
  {
    name: 'schema-form',
    entry: '//localhost:5173',  // 开发环境
    // entry: '//schema-form.example.com',  // 生产环境
    container: '#subapp-container',
    activeRule: '/child/schemaForm',
    props: {
      user: {
        id: '1001',
        name: '张三',
        deptId: 'D001',
        deptName: '研发部',
        roles: ['admin'],
      },
      request: {
        baseUrl: 'https://api.example.com',
        headers: { 'X-Tenant-Id': 'tenant001' },
      },
      global: {
        dictMap: {
          status: [
            { label: '启用', value: '1' },
            { label: '禁用', value: '0' },
          ],
        },
      },
    },
  },
])

start()
```

## 注意事项

1. **Cookie 兼容**：如果主应用通过 Cookie 传递认证信息（Sinosoft-Auth 模式），子应用会自动从 `props.cookie` 中提取 token 并写入请求头。

2. **Store 隔离**：每次 `mount` 都会创建全新的 Pinia 实例，`unmount` 时彻底销毁，避免多个子应用实例之间的状态污染。

3. **API 客户端初始化**：`configureApiClient` 在 `mount` 中调用，确保 token getter 指向最新的 Store 状态。主应用注入的 `request.baseUrl` 和 `request.token` 优先级高于环境变量。

4. **路由历史模式**：子应用使用 `createWebHistory`，qiankun 模式下基础路径为 `/child/schemaForm/`。主应用需确保该路径下的所有请求都路由到子应用容器。
