# 路由架构

## 路由表

| 路径 | 组件 | 说明 |
|------|------|------|
| `/login` | LoginView | 登录页（公开） |
| `/` | DynamicLayout | 带菜单布局 |
| `/` (children) | AppContainer | 首页 |
| `/app/:app/*` | AppContainer | 带菜单微应用 |
| `/standalone` | StandaloneLayout | 独立页签布局 |
| `/standalone/:app/*` | AppContainer | 注册微应用 |
| `/standalone?entry=url` | StandaloneEntry | 未注册应用（iframe） |
| `/:pathMatch(.*)*` | redirect → `/` | 兜底 |

## 动态菜单

侧边栏菜单从 API 动态加载：`GET /api/menus/route`

菜单数据结构：
```ts
interface MenuTreeNode {
  id: string
  name: string
  path: string           // 路由路径（如 '/app/editor/instances'）
  icon: string
  microAppId?: string    // 绑定的微应用 ID
  target?: '_self' | '_blank'
  children?: MenuTreeNode[]
}
```

`_blank` 目标的菜单项在新浏览器标签页打开。

## 鉴权

全局 `beforeEach` 守卫：

1. 无 token → 重定向到 `/login?redirect=...`
2. 有 token 但用户信息未加载 → `fetchUser()`
3. 已登录访问 `/login` → 重定向到 `/`

公开路由（`meta.public: true`）跳过鉴权：`/login`
