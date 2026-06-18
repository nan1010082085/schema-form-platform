# 微前端容器

Shell 提供两种微应用容器模式。

## 带菜单容器

微应用嵌入在侧边栏布局内，共享导航菜单。

**路由模式**：`/app/{appName}/*`

```
URL: /schema-platform/app/editor/instances
     ├─ 模式: 带菜单
     ├─ 微应用: editor
     └─ 路由: /instances
```

**布局**：
```
┌──────────┬──────────────────────────┐
│ SideMenu │ Header (面包屑/搜索/用户) │
│          ├──────────────────────────┤
│          │ 微应用内容               │
│          │                          │
└──────────┴──────────────────────────┘
```

## 独立页签容器

完全无壳，适用于新标签页打开或外部嵌入。

**路由模式**：`/standalone/{appName}/*` 或 `/standalone?entry=url`

```
URL: /schema-platform/standalone/editor/instances
     ├─ 模式: 独立页签
     ├─ 微应用: editor（已注册，qiankun 加载）
     └─ 路由: /instances

URL: /schema-platform/standalone?entry=http://localhost:5100/
     ├─ 模式: 独立页签
     └─ 未注册应用，iframe 直接加载 entry 地址
```

**布局**：
```
┌────────────────────────────────────┐
│ 微应用内容（无侧边栏、无顶部导航）  │
│                                    │
└────────────────────────────────────┘
```

## qiankun 激活规则

每个微应用使用函数匹配，同时响应两种模式：

```ts
function makeActiveRule(appName: string) {
  return (location: Location) => {
    const path = location.pathname
    if (path.startsWith(`${shellBase}app/${appName}/`)) return true
    if (path.startsWith(`${shellBase}standalone/${appName}/`)) return true
    return false
  }
}
```

## 全局状态同步

Shell 通过 `initGlobalState({ token })` 向所有子应用同步认证 token。

```ts
// Shell
const actions = initGlobalState({ token: localStorage.getItem('sfp_access_token') })
authStore.$subscribe((_, state) => actions.setGlobalState({ token: state.token }))

// 子应用
const { getGlobalState } = useQiankun()
const token = getGlobalState().token
```
