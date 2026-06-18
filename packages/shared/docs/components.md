# 共享组件

`@schema-form/shared-components`

## 组件列表

| 组件 | 路径 | 说明 |
|------|------|------|
| `AppDialog` | `common/AppDialog.vue` | 统一弹窗（蓝底白字头部、拖拽、全屏） |
| `AppIcon` | `common/AppIcon.vue` | 图标组件 |
| `FilterTabs` | `common/FilterTabs.vue` | 分段式筛选标签栏 |
| `LoginView` | `auth/LoginView.vue` | 共享登录页 |
| `AuthCallback` | `auth/AuthCallback.vue` | SSO 回调处理 |
| `BaseButton` | `BaseButton.vue` | 基础按钮 |
| `BaseCard` | `BaseCard.vue` | 基础卡片 |
| `BaseTable` | `BaseTable.vue` | 基础表格 |
| `EmptyState` | `feedback/EmptyState.vue` | 空状态占位 |
| `UserDropdown` | `navigation/UserDropdown.vue` | 用户下拉菜单 |

## AppDialog

统一弹窗组件，替代原生 el-dialog。

**Props**：
- `modelValue` — v-model 控制显隐
- `title` — 标题
- `width` — 宽度（默认 580px）
- `draggable` — 可拖拽（默认 true）
- `destroyOnClose` — 关闭销毁（默认 true）
- `appendToBody` — 挂载到 body（默认 true）

**Events**：
- `update:modelValue` — 显隐变更
- `confirm` — 确认
- `cancel` — 取消
- `close` — 关闭

**Slots**：
- 默认 — 内容区
- `footer` — 底部按钮区

## FilterTabs

分段式筛选标签栏。

```vue
<FilterTabs
  v-model="selected"
  :options="[
    { label: '全部', value: '' },
    { label: '表单', value: 'form' },
    { label: '表格', value: 'table' },
  ]"
/>
```

## LoginView

所有子应用独立运行时复用的登录页。

```vue
<LoginView
  title="系统管理"
  subtitle="Schema Form Platform"
  :on-success="(redirect) => router.push(redirect)"
/>
```
