# Editor 文档

`@schema-form/editor-web` — Vue 3 + Vite + Element Plus 可视化表单设计器

## 快速开始

```bash
pnpm dev:editor    # 启动开发服务器（端口 5100）
pnpm build:editor  # 构建
pnpm --filter @schema-form/editor-web test  # 运行测试
```

## 外部集成

参见 [平台集成指南](../../docs/integration-guide.md#一editor表单设计器)：
- qiankun / micro-app 微前端接入
- REST API 接口（Schema CRUD、发布）
- Widget 渲染器独立使用
- Schema JSON 数据结构

## 文档目录

- [组件架构](./architecture.md) — Widget 系统、渲染引擎、编辑器核心
- [Widget 开发](./widget-development.md) — 如何开发新的 Widget 组件
- [属性面板](./property-panel.md) — 右侧属性配置面板机制
- [Store 设计](./store-design.md) — 7 个 Pinia Store 的职责
- [微前端集成](./qiankun-integration.md) — qiankun 子应用集成方式
