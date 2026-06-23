# 项目结构重构计划：能力平台 vs 业务平台

## 一、目标

将当前平铺的 packages/ 重组为 **能力平台**（platform）和 **业务平台**（business）两大分组，
清晰划分公共组件归属，降低理解和开发成本。

---

## 二、现状依赖图

### 2.1 包清单

| 包路径 | 包名 | 层级 |
|---|---|---|
| packages/editor | @schema-form/editor-web | 能力 |
| packages/flow/web | @schema-form/flow-web | 能力 |
| packages/flow/shared | @schema-form/flow-shared | 能力 |
| packages/ai/app | @schema-form/ai-app | 能力 |
| packages/ai/sdk | @schema-form/ai-sdk | 能力 |
| packages/ai/shared | @schema-form/ai-shared | 能力 |
| packages/server | @schema-form/server | 能力 |
| packages/shell | @schema-form/shell | 业务 |
| packages/admin | @schema-form/admin | 业务 |

### 2.2 共享包依赖矩阵

| 共享包 | 被谁引用 |
|---|---|
| shared-components/AppIcon | shell, admin, editor, flow, ai |
| shared-components/AppDialog | editor, flow |
| shared-components/FilterTabs | editor, flow |
| shared-components/UserDropdown | **shell** |
| shared-components/LayoutSwitcher | **shell** |
| shared-components/FormDialog | editor |
| shared-utils/apiClient | shell, admin, editor, flow, ai |
| shared-utils/sso | shell, editor, flow, ai, server |
| shared-utils/message | shell, admin, editor, flow, ai, server |
| shared-utils/form | shell, admin, editor, flow, ai, server |
| shared-utils/iconResolver | **shell, admin** |
| shared-utils/authTypes | **shell** |
| shared-utils/useAuth | **shell** |
| shared-stores/layout | **shell** |
| shared-qiankun/* | shell, admin, editor, flow, ai |
| shared-socket | editor, flow, ai |

### 2.3 关键发现

- `UserDropdown`、`LayoutSwitcher`、`useAuth`、`authTypes`、`useLayoutStore`、`iconResolver` 仅被业务层引用
- `BaseButton`、`BaseTable`、`BaseCard`、`ConfirmDialog`、`microAppConfig` 无任何引用（死代码）
- `shared-qiankun` 同时被能力和业务两层引用（需保留在能力层，业务层依赖它）

---

## 三、目标结构

```
packages/
├── platform/                         # ═══ 能力平台 ═══
│   ├── editor/                       # 表单设计器 + 渲染器
│   │   ├── src/
│   │   ├── package.json              # @schema-form/editor-web
│   │   └── vite.config.ts
│   ├── flow/                         # BPMN 流程引擎
│   │   ├── web/                      #   前端
│   │   ├── shared/                   #   共享类型 + 引擎
│   │   └── package.json
│   ├── ai/                           # AI 助手
│   │   ├── app/                      #   前端
│   │   ├── sdk/                      #   Agent SDK
│   │   ├── shared/                   #   共享类型
│   │   └── package.json
│   ├── server/                       # 后端 API
│   │   ├── src/
│   │   └── package.json
│   └── shared/                       # 能力层公共（纯 UI + 基础设施）
│       ├── components/               #   AppDialog, AppIcon, FilterTabs, FormDialog
│       ├── utils/                    #   apiClient, sso, message, form
│       ├── qiankun/                  #   微前端基础设施
│       ├── socket/                   #   实时通信
│       ├── config/                   #   vite, element, vitest 配置
│       ├── styles/                   #   全局样式
│       └── package.json              # @schema-form/platform-shared
│
├── business/                         # ═══ 业务平台 ═══
│   ├── shell/                        # 主宿主应用
│   │   ├── src/
│   │   ├── package.json              # @schema-form/shell
│   │   └── vite.config.ts
│   ├── admin/                        # 系统管理
│   │   ├── src/
│   │   ├── package.json              # @schema-form/admin
│   │   └── vite.config.ts
│   └── shared/                       # 业务层公共
│       ├── components/
│       │   ├── UserDropdown.vue      #   用户下拉
│       │   ├── LayoutSwitcher.vue    #   布局切换
│       │   └── BaseButton.vue        #   基础按钮（保留）
│       ├── stores/
│       │   └── layout.ts             #   布局状态
│       ├── composables/
│       │   └── useMenu.ts            #   菜单逻辑（从 shell 迁出）
│       └── package.json              # @schema-form/business-shared
│
└── pnpm-workspace.yaml
```

---

## 四、归属划分明细

### 4.1 platform/shared（能力层公共）

| 文件 | 归属理由 |
|---|---|
| components/common/AppDialog.vue | 纯 UI 封装，无业务依赖 |
| components/common/AppIcon.vue | 纯图标组件 |
| components/common/FilterTabs.vue | 通用筛选组件 |
| components/common/FormDialog.vue | 表单弹框封装 |
| components/common/ConfirmDialog.vue | 确认弹框 |
| components/common/index.ts | 统一导出 |
| components/BaseButton.vue | 基础按钮 |
| components/BaseTable.vue | 基础表格 |
| components/BaseCard.vue | 基础卡片 |
| utils/apiClient.ts | HTTP 基础设施 |
| utils/sso.ts | 单点登录（server 也用） |
| utils/message.ts | 消息通知（server 也用） |
| utils/form.ts | 表单工具（server 也用） |
| utils/iconResolver.ts | 图标解析 → **移入此处** |
| qiankun/* | 微前端基础设施 |
| socket/* | 实时通信 |
| config/* | 构建配置 |
| styles/* | 全局样式 |

### 4.2 business/shared（业务层公共）

| 文件 | 归属理由 |
|---|---|
| components/UserDropdown.vue | 依赖认证状态 |
| components/LayoutSwitcher.vue | 布局偏好 |
| stores/layout.ts | 布局状态管理 |
| composables/useMenu.ts | 从 shell 迁出，admin 也可用 |
| utils/authTypes.ts | 认证类型 → **从 shared-utils 迁入** |
| utils/useAuth.ts | 认证逻辑 → **从 shared-utils 迁入** |

### 4.3 删除死代码

以下文件无任何引用，不迁移：

- `BaseTable.vue`
- `BaseCard.vue`
- `ConfirmDialog.vue`
- `microAppConfig.ts`

---

## 五、包名映射

| 旧包名 | 新包名 | 路径 |
|---|---|---|
| @schema-form/editor-web | 不变 | platform/editor |
| @schema-form/flow-web | 不变 | platform/flow/web |
| @schema-form/flow-shared | 不变 | platform/flow/shared |
| @schema-form/ai-app | 不变 | platform/ai/app |
| @schema-form/ai-sdk | 不变 | platform/ai/sdk |
| @schema-form/ai-shared | 不变 | platform/ai/shared |
| @schema-form/server | 不变 | platform/server |
| @schema-form/shell | 不变 | business/shell |
| @schema-form/admin | 不变 | business/admin |
| @schema-form/shared-components | → @schema-form/platform-shared | platform/shared |
| @schema-form/shared-utils | → @schema-form/platform-shared/utils | platform/shared |
| @schema-form/shared-qiankun | → @schema-form/platform-shared/qiankun | platform/shared |
| @schema-form/shared-config | → @schema-form/platform-shared/config | platform/shared |
| @schema-form/shared-stores | → @schema-form/business-shared/stores | business/shared |
| @schema-form/shared-utils/authTypes | → @schema-form/business-shared | business/shared |
| @schema-form/shared-utils/useAuth | → @schema-form/business-shared | business/shared |

**策略**：不改业务包名（shell/admin/editor 等），只合并 shared 层为两个新包。
这样业务层代码改动量最小。

---

## 六、实施步骤

### Phase 1：准备（无破坏性）

**1.1 创建目标目录结构**
```bash
mkdir -p packages/platform/shared
mkdir -p packages/platform/{editor,flow,ai,server}  # 用 symlink 或移动
mkdir -p packages/business/shared/composables
```

**1.2 删除死代码**
- 删除 `BaseTable.vue`、`BaseCard.vue`、`ConfirmDialog.vue`、`microAppConfig.ts`

**1.3 创建 business/shared 包**
```
packages/business/shared/
├── package.json          # @schema-form/business-shared
├── components/
│   ├── UserDropdown.vue  # 从 shared/components/ 迁入
│   └── LayoutSwitcher.vue
├── stores/
│   └── layout.ts         # 从 shared/stores/ 迁入
├── composables/
│   └── useMenu.ts        # 从 shell/composables/ 迁出
├── utils/
│   ├── authTypes.ts      # 从 shared/utils/ 迁入
│   └── useAuth.ts        # 从 shared/utils/ 迁入
└── index.ts
```

### Phase 2：创建 platform/shared 包

**2.1 移动文件**
```
packages/shared/components/common/*  → packages/platform/shared/components/
packages/shared/components/auth/*    → packages/platform/shared/components/auth/
packages/shared/utils/{apiClient,sso,message,form,iconResolver}.ts
                                     → packages/platform/shared/utils/
packages/shared/qiankun/*            → packages/platform/shared/qiankun/
packages/shared/socket/*             → packages/platform/shared/socket/
packages/shared/config/*             → packages/platform/shared/config/
packages/shared/styles/*             → packages/platform/shared/styles/
```

**2.2 创建 package.json**
```json
{
  "name": "@schema-form/platform-shared",
  "exports": {
    ".": "./src/index.ts",
    "./components/*": "./src/components/*",
    "./utils/*": "./src/utils/*",
    "./qiankun": "./src/qiankun/index.ts",
    "./socket": "./src/socket/index.ts",
    "./config/element": "./src/config/element.ts"
  }
}
```

**2.3 导出统一入口**
```ts
// packages/platform/shared/src/index.ts
export * from './components/common'
export * from './utils/apiClient'
// ...
```

### Phase 3：移动业务应用

**3.1 移动 shell 和 admin**
```bash
mv packages/shell packages/business/shell
mv packages/admin packages/business/admin
```

**3.2 移动能力应用**
```bash
mv packages/editor packages/platform/editor
mv packages/flow packages/platform/flow
mv packages/ai packages/platform/ai
mv packages/server packages/platform/server
```

### Phase 4：更新所有引用

**4.1 更新业务层 import**
```ts
// shell 和 admin 中：
// 旧：import { UserDropdown } from '@schema-form/shared-components/navigation/UserDropdown.vue'
// 新：import { UserDropdown } from '@schema-form/business-shared'

// 旧：import { useLayoutStore } from '@schema-form/shared-stores/layout'
// 新：import { useLayoutStore } from '@schema-form/business-shared/stores/layout'
```

**4.2 更新能力层 import**
```ts
// editor/flow/ai 中：
// 旧：import AppDialog from '@schema-form/shared-components/common/AppDialog.vue'
// 新：import AppDialog from '@schema-form/platform-shared/components/AppDialog.vue'
```

**4.3 更新 server import**
```ts
// 旧：import { apiClient } from '@schema-form/shared-utils/apiClient'
// 新：import { apiClient } from '@schema-form/platform-shared/utils/apiClient'
```

### Phase 5：更新构建配置

**5.1 pnpm-workspace.yaml**
```yaml
packages:
  - 'packages/platform/*'
  - 'packages/platform/ai/*'
  - 'packages/platform/flow/*'
  - 'packages/business/*'
```

**5.2 各包 vite.config.ts**
- 更新别名路径
- 更新 base URL（如有变化）

**5.3 部署脚本**
- 更新 `deploy/pack.sh` 中的构建路径
- 更新 `deploy/deploy.sh` 中的包路径

### Phase 6：验证

**6.1 类型检查**
```bash
pnpm -r exec vue-tsc --noEmit
```

**6.2 构建验证**
```bash
pnpm -r build
```

**6.3 测试验证**
```bash
pnpm -r test
```

---

## 七、风险与缓解

| 风险 | 缓解措施 |
|---|---|
| 路径别名变更导致编译失败 | Phase 2 先建包，Phase 4 批量替换 import |
| vite 配置错误 | Phase 5 逐个调整，每次构建验证 |
| 部署脚本路径错误 | Phase 5.3 同步更新 |
| 环境变量路径变化 | 检查 `.env` 文件中的 `BASE_URL` |

---

## 八、不改的部分

| 保持不变 | 理由 |
|---|---|
| 业务包名（shell/admin/editor 等） | 改名会影响 qiankun 配置和部署 |
| server 后端逻辑 | 后端不需要重组 |
| flow/shared 和 ai/shared | 已经是独立子包，结构合理 |
| qiankun 微前端注册配置 | 只改 import 路径，不改运行时行为 |
