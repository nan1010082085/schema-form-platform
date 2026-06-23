# Flow 文档

`@schema-form/flow-web` — BPMN 流程设计器

## 快速开始

```bash
pnpm dev:flow      # 启动开发服务器（端口 5200）
pnpm --filter @schema-form/flow-web build  # 构建
```

## 外部集成

参见 [平台集成指南](../../docs/integration-guide.md#二flow流程引擎)：
- qiankun 微前端接入
- 嵌入式预览（postMessage 协议）
- REST API（流程定义、实例、任务、模板）
- FlowGraph 数据结构
- 嵌入式路由（/embed/preview、/embed/task-list）

## 文档目录

- [流程节点](./flow-nodes.md) — 支持的 BPMN 节点类型
- [流程运行时](./flow-runtime.md) — 流程实例、任务、审批
- [流程配置](./flow-configuration.md) — 设计器配置项
