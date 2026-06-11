# @schema-form/portal

门户入口 -- 平台首页、仪表盘与快捷导航。

## 项目简介

Schema Form Platform 的门户首页，提供数据概览、功能导航和最近对话列表。用户登录后首先看到此页面，可快速跳转到编辑器、流程、AI 助手等子应用。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Vue 3.5 + TypeScript 5.7 |
| UI | Element Plus 2.9 |
| 图表 | ECharts 6.1 |
| 路由 | Vue Router 4 |
| 状态 | Pinia |
| 构建 | Vite 6 |

## 端口配置

| 环境 | 端口 |
|---|---|
| 开发 | 4000 |

## 主要功能

- 平台首页 Hero 区域
- 快捷操作面板
- 统计卡片（表单/流程/AI 对话数量）
- 趋势图表 + 数据概览
- 功能导航卡片（编辑器/流程/AI/文档）
- 系统公告面板
- 最新 AI 对话列表
- 登录页 + 路由鉴权守卫

## 常用命令

```bash
pnpm dev:portal          # 启动开发服务器
pnpm --filter @schema-form/portal test         # 运行测试
pnpm --filter @schema-form/portal test -- --coverage  # 测试覆盖率
```
