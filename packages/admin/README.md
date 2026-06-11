# @schema-form/admin

后台管理 -- 用户、角色、部门、菜单、字典等系统管理。

## 项目简介

Schema Form Platform 的后台管理系统，提供 RBAC 权限管理、组织架构管理、系统配置等能力。支持 SSO 单点登录，可通过微前端嵌入 Shell 容器或独立访问。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Vue 3.5 + TypeScript 5.7 |
| UI | Element Plus 2.9 |
| 路由 | Vue Router 4（支持 memory history 微前端模式） |
| 状态 | Pinia |
| 构建 | Vite 6 |

## 端口配置

| 环境 | 端口 |
|---|---|
| 开发 | 5400 |

## 主要功能

| 模块 | 路由 | 说明 |
|---|---|---|
| 微应用管理 | `/admin/micro-apps` | 子应用配置与状态 |
| 菜单管理 | `/admin/menus` | 系统菜单树维护 |
| 用户管理 | `/admin/users` | 用户 CRUD + 分配角色 |
| 角色管理 | `/admin/roles` | 角色 CRUD + 权限分配 |
| 部门管理 | `/admin/depts` | 组织架构树维护 |
| 岗位管理 | `/admin/posts` | 岗位 CRUD |
| 字典管理 | `/admin/dict` | 数据字典维护 |
| 参数设置 | `/admin/config` | 系统参数配置 |
| 操作日志 | `/admin/logs` | 操作审计日志 |

## 常用命令

```bash
pnpm dev:admin            # 启动开发服务器
pnpm build                # 构建所有包（含 admin）
pnpm --filter @schema-form/admin test         # 运行测试
pnpm --filter @schema-form/admin test -- --coverage  # 测试覆盖率
```
