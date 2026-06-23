# 系统管理界面设计文档

> 生成日期：2026-06-23
> 结合 Schema 驱动设计器 + 工作流编排能力平台

---

## 一、整体架构

### 1.1 设计原则

本平台的核心能力是 **Schema 驱动的可视化设计器**。系统管理界面应优先复用这一能力：

- **标准 CRUD 页面**（用户、角色、岗位、字典、配置、日志、租户）→ 用 Editor 设计 Schema，由渲染器动态渲染
- **特殊交互页面**（菜单权限树、角色权限分配）→ admin 壳应用内用 Vue 组件实现
- **业务流程**（用户审批、租户开通）→ 用 Flow 编排

### 1.2 页面清单

| 模块 | 页面 | 实现方式 | 路由路径 |
|------|------|----------|----------|
| 菜单管理 | 菜单树 + 按钮权限管理 | ✅ Vue 组件（左树右表） | `/system/menus` |
| 用户管理 | 用户列表 + 新增/编辑/分配角色 | ✅ Vue 表格 + 弹窗 | `/system/users` |
| 角色管理 | 角色列表 + 权限分配 | ✅ Vue 表格 + 权限树弹窗 | `/system/roles` |
| 部门管理 | 部门树 CRUD | ✅ Vue 树形表格 + 弹窗 | `/system/depts` |
| 岗位管理 | 岗位列表 CRUD | ✅ Vue 表格 + 弹窗 | `/system/posts` |
| 字典管理 | 字典类型 + 字典数据 | ✅ Vue 左右布局 | `/system/dicts` |
| 参数设置 | 系统参数 CRUD | ✅ Vue 表格 + 弹窗 | `/system/configs` |
| 操作日志 | 审计日志查看 | ✅ Vue 表格（只读+筛选） | `/system/audit-logs` |
| 登录日志 | 登录日志查看 | ✅ Vue 表格（只读+筛选） | `/system/login-logs` |
| 在线用户 | 在线用户管理 | ✅ Vue 表格 + 强制下线 | `/system/online-users` |
| 租户管理 | 租户列表 CRUD | ✅ Vue 表格 + 弹窗 | `/system/tenants` |
| 文件服务 | 图片/文件上传 | ✅ API 接口 | `/api/files/upload/*` |

---

## 二、菜单权限管理（核心页面）

### 2.1 参考 RuoYi 设计

RuoYi 的菜单管理是 **左树右表** 布局：
- 左侧：菜单树（目录 → 菜单 → 按钮，三层结构）
- 右侧：选中节点的详情/编辑表单
- 按钮类型节点 = 权限码，挂在菜单下

### 2.2 数据模型映射

```
Menu 树结构：
├── 目录 (type=menu, parentId=null, 有 path/icon)
│   ├── 菜单 (type=menu, parentId=目录id, 有 path/routeType)
│   │   ├── 按钮 (type=button, parentId=菜单id, 有 permission)
│   │   └── 按钮 (type=button, parentId=菜单id, 有 permission)
│   └── 菜单 (type=menu, parentId=目录id)
└── 目录 (type=menu, parentId=null)
```

### 2.3 界面布局

```
┌─────────────────────────────────────────────────────────────┐
│  菜单管理                                      [新增] [刷新] │
├──────────────────────┬──────────────────────────────────────┤
│  🔍 搜索             │  菜单信息                             │
│                      │                                      │
│  ▼ 系统管理          │  名称: [系统管理          ]           │
│    📁 用户管理        │  图标: [Setting] [选择]              │
│      🔘 用户新增      │  类型: ○目录 ○菜单 ○按钮             │
│      🔘 用户编辑      │  路径: [/admin/users    ]           │
│      🔘 用户删除      │  权限: [system:user:edit]           │
│    📁 角色管理        │  排序: [1]                          │
│      🔘 角色新增      │  状态: ●启用 ○停用                  │
│      🔘 角色编辑      │  路由类型: ○Schema ○微应用 ○外链    │
│    📁 菜单管理        │  Schema ID: [____________]          │
│                      │  所属应用: ○shell ○admin             │
│  ▼ 流程管理          │                                      │
│    📁 流程设计        │  [保存]  [删除]  [新增子菜单]       │
│    📁 流程监控        │                                      │
├──────────────────────┴──────────────────────────────────────┤
│  提示：按钮类型节点的"权限编码"字段为必填，用于接口权限校验    │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 交互逻辑

1. **树节点点击** → 右侧表单填充该节点数据
2. **新增** → 在选中节点下创建子节点（目录下可建菜单，菜单下可建按钮）
3. **保存** → 调用 `PUT /api/menus/:id`
4. **删除** → 调用 `DELETE /api/menus/:id`（有子节点时禁用）
5. **拖拽排序** → 更新 sort 字段
6. **按钮节点** → 只显示名称、权限编码、排序、状态

---

## 三、用户管理

### 3.1 Schema 驱动实现

用 Editor 设计一个 `search_list` 类型的 Schema：

**表格列配置：**

| 列名 | 字段 | 类型 | 宽度 |
|------|------|------|------|
| 用户名 | username | text | 120px |
| 显示名 | displayName | text | 120px |
| 所属部门 | deptId → dept.name | text | 120px |
| 手机号 | phone | text | 120px |
| 状态 | status | tag (active=success, inactive=danger) | 80px |
| 创建时间 | createdAt | datetime | 160px |
| 操作 | - | buttons | 200px |

**搜索条件：**
- 用户名/显示名（模糊搜索）
- 状态（下拉）
- 所属部门（树形选择）

**操作按钮：**
- 新增用户 → 弹窗表单（用户名、密码、显示名、角色多选、部门树选、手机、邮箱）
- 编辑 → 弹窗表单（同上，密码不可改）
- 重置密码 → 确认弹窗 + 新密码输入
- 删除 → 确认弹窗
- 分配角色 → 弹窗，角色多选 checkbox

### 3.2 角色分配交互

```
┌─── 分配角色: 张三 ────────────────────┐
│                                       │
│  ☑ 管理员    data_scope: all          │
│  ☐ 普通用户  data_scope: self         │
│  ☐ 编辑者    data_scope: dept         │
│                                       │
│  数据权限:                            │
│  ○ 全部数据  ○ 本部门  ○ 仅本人      │
│  ○ 自定义部门: [选择部门...]          │
│                                       │
│          [确定]  [取消]               │
└───────────────────────────────────────┘
```

---

## 四、角色管理

### 4.1 表格列

| 列名 | 字段 | 类型 |
|------|------|------|
| 角色名称 | name | text |
| 权限字符 | permissions.length | number tag |
| 数据范围 | data_scope | tag |
| 状态 | status | tag |
| 创建时间 | createdAt | datetime |
| 操作 | - | buttons: 编辑/删除/分配权限 |

### 4.2 权限分配弹窗

```
┌─── 分配权限: 管理员 ──────────────────────────┐
│                                                │
│  菜单权限:                数据权限:            │
│  ☑ 系统管理              ○ 全部数据            │
│    ☑ 用户管理            ○ 本部门数据          │
│      ☑ 用户新增          ○ 本部门及以下        │
│      ☑ 用户编辑          ○ 仅本人数据          │
│      ☑ 用户删除          ● 自定义              │
│      ☑ 重置密码            ☑ 技术部            │
│    ☑ 角色管理              ☑ 市场部            │
│      ☑ 角色新增                                │
│    ☑ 菜单管理                                  │
│  ☑ 流程管理                                    │
│    ☑ 流程设计                                  │
│    ☑ 流程审批                                  │
│                                                │
│  [全选] [全不选]            [确定] [取消]      │
└────────────────────────────────────────────────┘
```

### 4.3 实现方式

- 表格用 Schema 渲染
- 权限分配弹窗用 **Vue 组件**（需要递归树 + checkbox，Schema 表单不支持）
- 权限树数据源：`GET /api/menus/route`（返回完整菜单树，包含 button 类型）
- 保存：`PUT /api/roles/:id`，body 中 `permissions: string[]` + `data_scope` + `dept_ids`

---

## 五、部门管理

### 5.1 Schema 树形表格

| 列名 | 字段 | 类型 |
|------|------|------|
| 部门名称 | name | text |
| 负责人 | leader | text |
| 排序 | sort | number |
| 状态 | status | tag |
| 创建时间 | createdAt | datetime |
| 操作 | - | buttons: 编辑/新增子部门/删除 |

### 5.2 特殊交互

- 树形展开（parentId 构建树）
- 移动部门（拖拽或选择目标父部门）
- 环检测（后端已实现）

---

## 六、其他模块（Schema 驱动）

### 6.1 岗位管理

标准 CRUD 表格：岗位编码、名称、排序、状态

### 6.2 字典管理

两层结构：
- 字典类型列表（类型编码、名称、状态）
- 点击类型 → 展开字典数据列表（标签、值、排序、状态）

### 6.3 参数设置

标准 CRUD 表格：参数名称、参数键名、参数值、系统内置（是/否）

### 6.4 操作日志

只读表格：操作模块、操作类型、操作人、操作时间、IP、状态、耗时
- 搜索：模块、操作人、时间范围
- 操作：查看详情、清空

### 6.5 租户管理

标准 CRUD 表格：租户名称、租户编码、状态、最大用户数、功能特性
- 操作：新增、编辑、停用/启用、删除

### 6.6 凭证管理

标准 CRUD 表格：名称、类型（API Key/Basic Auth/Bearer Token）、创建时间
- 操作：新增（弹窗输入凭证数据，后端加密存储）、编辑、删除

---

## 七、权限基础设施（前端）

### 7.1 usePermission composable

```typescript
// composables/usePermission.ts
export function usePermission() {
  const authStore = useAuthStore()
  
  function hasPermission(code: string): boolean {
    return authStore.permissions.includes(code)
  }
  
  function hasAnyPermission(...codes: string[]): boolean {
    return codes.some(c => authStore.permissions.includes(c))
  }
  
  function hasAllPermissions(...codes: string[]): boolean {
    return codes.every(c => authStore.permissions.includes(c))
  }
  
  return { hasPermission, hasAnyPermission, hasAllPermissions }
}
```

### 7.2 权限指令（按钮级）

```typescript
// directives/vPermission.ts
export const vPermission = {
  mounted(el: HTMLElement, binding: { value: string | string[] }) {
    const { hasAnyPermission } = usePermission()
    const codes = Array.isArray(binding.value) ? binding.value : [binding.value]
    if (!hasAnyPermission(...codes)) {
      el.parentNode?.removeChild(el)
    }
  }
}
```

### 7.3 403 统一拦截

```typescript
// utils/apiClient.ts 中添加
if (response.status === 403) {
  ElMessage.error('没有操作权限')
  return
}
```

---

## 八、实施计划

### Phase 1 — 权限基础设施
1. `usePermission` composable — ⏳ 待实现
2. `v-permission` 指令 — ⏳ 待实现
3. apiClient 403 拦截 — ⏳ 待实现
4. authStore 存储 permissions — ⏳ 待实现

### Phase 2 — 系统管理页面 ✅ 已完成
1. ✅ 菜单权限管理（Vue 组件，admin 壳内）
2. ✅ 用户管理（Vue 表格 + 角色分配弹窗）
3. ✅ 角色管理（Vue 表格 + 权限树弹窗）
4. ✅ 部门管理（Vue 树形表格 + 弹窗）

### Phase 3 — 辅助模块 ✅ 已完成
1. ✅ 岗位、字典、参数、操作日志、登录日志、在线用户
2. ✅ 租户管理
3. ✅ 文件上传服务（图片/头像/附件）

### Phase 4 — 后端权限接入
1. 前端权限控制就绪后，逐步给后端路由加 `requirePermission`
2. 每加一个模块，同步验证前端按钮隐藏 + 后端 403 拦截
