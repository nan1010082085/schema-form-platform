# @schema-form/flow-web

流程引擎前端 -- BPMN 流程设计器、流程管理、任务收件箱。

## 项目简介

Schema Form Platform 的流程引擎前端，基于 Vue Flow 可视化编排 BPMN 流程图，提供流程定义管理、实例监控、任务审批收件箱、统计报表等能力。支持 SSO 单点登录和微前端嵌入两种访问模式。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Vue 3.5 + TypeScript 5.7 |
| UI | Element Plus 2.9 |
| 流程图 | Vue Flow + @dagrejs/dagre 布局 |
| 图表 | ECharts 6.1 |
| 路由 | Vue Router 4（支持 memory history 微前端模式） |
| 状态 | Pinia |
| 实时通信 | Socket.IO（@schema-form/socket） |
| 构建 | Vite 6 |

## 端口配置

| 环境 | 端口 |
|---|---|
| 开发 | 5200 |

## 主要功能

### 流程设计器

- Vue Flow 可视化画布
- 25 种 BPMN 标准节点
- 拖拽编排 + 自动布局（dagre）
- 节点属性配置面板
- 画布缩放/小地图/背景网格

### 流程管理

- 流程定义列表（创建/编辑/删除/发布）
- 流程实例列表 + 详情查看
- 流程监控仪表盘
- 流程统计报表

### 任务收件箱

- 待办任务列表
- 已办任务列表
- 审批操作（通过/驳回/委派）
- 批量审批

### 扩展

- SSO 单点登录（OAuth2 授权码模式）
- 微前端嵌入（qiankun memory history）

## 常用命令

```bash
pnpm dev:flow            # 启动开发服务器
pnpm build               # 构建所有包（含 flow-web）
pnpm --filter @schema-form/flow-web test         # 运行测试
pnpm --filter @schema-form/flow-web test -- --coverage  # 测试覆盖率
```
