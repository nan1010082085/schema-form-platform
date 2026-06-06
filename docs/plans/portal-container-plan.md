# Portal 多租户容器项目计划

> 状态：规划中（待实施）
> 创建日期：2026-06-04
> 预计工作量：~26 人天（约 4 周）

---

## 一、目标

将 Portal 从介绍界面改造为多租户容器项目：
- 支持多租户
- 支持角色权限管理（RBAC）
- 支持动态路由
- 支持动态布局
- 内部界面全部由可视化编辑器（Editor）搭建

## 二、核心洞察

Editor 的 WidgetRenderer 本身就是页面运行时引擎，无需重新造轮子。Portal 改造的核心是把渲染引擎从"表单渲染器"提升为"页面渲染器"。

## 三、架构设计

### 多租户方案
- 共享数据库 + tenantId 字段隔离
- 路径前缀：`/t/:tenantSlug/...`
- JWT payload 携带 tenantId

### 数据模型

```
Tenant (新增)
  ├── name, slug, status
  └── config: { maxPages, maxUsers, theme }

Page (新增)
  ├── tenantId, path, name, title
  ├── layout: LayoutTemplate ID
  ├── schema: Widget[]  ← Editor 产出
  └── permissions: string[]

LayoutTemplate (新增)
  ├── name, type: 'system' | 'custom'
  └── config: { header, sidebar, content }

Permission (新增)
  └── code: "page:dashboard:view"

User (改造) → 新增 tenantId
Role (改造) → 新增 tenantId + permissions[]
```

### 动态路由
- Page 模型存储路由配置
- 前端动态 addRoute()
- PageRenderer 集成 WidgetRenderer

### 渲染引擎复用
- 方案 A（推荐）：从 Editor 包导出 WidgetRenderer
- 方案 B（备选）：抽取为独立 @schema-form/renderer 包

## 四、实施路径

| 阶段 | 周期 | 交付 | 工作量 |
|------|------|------|--------|
| Phase 1 | 第 1-2 周 | 数据模型 + API + 动态路由 + PageRenderer | 15 天 |
| Phase 2 | 第 3 周 | RBAC 权限 + 路由守卫 + 菜单过滤 | 6 天 |
| Phase 3 | 第 4 周 | Editor 页面编辑模式 + 事件引擎 navigate | 5 天 |

## 五、优先级（MoSCoW）

**Must：**
- Page 模型 + 动态路由 + WidgetRenderer 页面渲染
- 租户模型 + tenantId 隔离
- RBAC 权限模型 + 菜单过滤
- 布局模板系统（内置 3 个）

**Should：**
- 事件引擎 navigate 动作
- 租户级主题令牌配置
- Editor 中新增"页面编辑"模式

**Could：**
- 自定义布局模板（通过 Editor 创建）
- 租户自助管理后台

**Won't：**
- 物理数据库隔离（当前阶段不需要）

## 六、关键风险

1. WidgetRenderer 体积：需要验证 tree-shaking 是否生效
2. 页面 Schema 复杂度：需关注首次渲染性能
3. 数据迁移：现有数据需补充 tenantId 字段
4. 编辑器改造范围：页面编辑模式是较大的 UX 改造

## 七、与现有系统的关系

- Editor 负责"建页面"，产出 Page Schema
- Portal 负责"跑页面"，通过 WidgetRenderer 渲染
- AI 可以通过对话生成 Page Schema
- Flow 通过 micro-app 嵌入 Portal

## 八、核心场景

> 用户登录 → 动态加载页面 → 侧边栏显示有权菜单 → 点击"仪表盘" → PageRenderer 渲染 Editor 搭建的仪表盘 Schema → 图表组件实时展示数据 → 点击"发起审批"按钮 → 跳转到审批页面 → 自动加载流程表单
