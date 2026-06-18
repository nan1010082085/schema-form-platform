# qiankun 共享模块

`@schema-form/shared-qiankun`

## 导出

| 导出 | 类型 | 说明 |
|------|------|------|
| `createQiankunApp` | 函数 | 子应用工厂（Vue + Pinia + 生命周期） |
| `useQiankun` | Composable | 全局状态管理 |
| `useQiankunEvent` | Composable | 跨应用事件通信 |
| `useMicroApp` | Composable | 统一微应用嵌入（iframe/qiankun） |
| `MicroAppContainer` | 组件 | 统一微应用容器组件 |
| `APP_CONFIGS` | 常量 | 所有子应用配置表 |
| `getAppUrl` | 函数 | 生成子应用 URL |

## createQiankunApp

子应用工厂函数，支持独立运行和 qiankun 模式。

```ts
const { bootstrap, mount, unmount } = createQiankunApp({
  name: 'admin',
  rootComponent: App,
  plugins: [router],
  extraSetup: (app) => setupElementPlus(app),
})
```

**独立模式检测**：
- `__POWERED_BY_QIANKUN__` 为 false → 直接 render()
- `__POWERED_BY_QIANKUN__` 为 true → 等 500ms，qiankun 未调用 mount() 则自动 render()

## APP_CONFIGS

```ts
{
  shell:  { basePath: '/schema-platform/',          devPort: 5050 },
  editor: { basePath: '/schema-platform/editor/',   devPort: 5100 },
  flow:   { basePath: '/schema-platform/flow/',     devPort: 5200 },
  ai:     { basePath: '/schema-platform/ai/',       devPort: 5300 },
  admin:  { basePath: '/schema-platform/admin/',    devPort: 5555 },
}
```

## useMicroApp

统一嵌入 Composable，支持 iframe 和 qiankun 两种模式。

```ts
const { iframeUrl, loading, error, containerRef } = useMicroApp({
  appName: 'editor',
  mode: 'iframe',       // 或 'qiankun'
  src: 'http://...',    // 自定义 URL（可选）
  query: { id: 'xxx' }, // 查询参数（可选）
  loadMicroApp,         // qiankun 模式需要注入
})
```
