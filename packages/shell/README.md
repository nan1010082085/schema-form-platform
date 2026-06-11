# @schema-form/shell

Shell 容器 -- 微前端宿主应用，承载导航、登录鉴权与子应用加载。

## 项目简介

Schema Form Platform 的主入口容器，负责：

- **登录鉴权** -- JWT 认证 + 全局路由守卫
- **微前端加载** -- 通过 @micro-zoe/micro-app 加载 Editor、Flow、AI、Admin 子应用
- **导航框架** -- 侧边菜单 + 面包屑 + 用户下拉
- **两种布局** -- 带侧边栏布局（管理页面）/ 全屏布局（子应用页面）

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Vue 3.5 + TypeScript 5.7 |
| UI | Element Plus 2.9 |
| 路由 | Vue Router 4 |
| 微前端 | @micro-zoe/micro-app |
| 构建 | Vite 6 |

## 端口配置

| 环境 | 端口 |
|---|---|
| 开发 | 4100 |

## 主要功能

- JWT 登录/登出 + 全局导航守卫
- 侧边栏菜单（可折叠）
- 面包屑导航
- 用户信息下拉菜单
- 子应用路由分发：`/editor/*`、`/flow/*`、`/ai/*`、`/admin/*`
- 全局样式重置 + Element Plus 覆盖

## 常用命令

```bash
pnpm dev:shell           # 启动开发服务器
pnpm build               # 构建所有包（含 shell）
```
