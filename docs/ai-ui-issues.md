# AI 项目 Element Plus UI 问题清单

检查时间：2026-06-24
路径：`packages/platform/ai/app/`

---

## 高优先级

### 1. main-sidebar.ts 缺失 Element Plus 注册

- 入口文件未调用 `setupElementPlus(app)`，未导入 `element-plus/dist/index.css`
- 用此入口加载 AI 子应用时，所有 el-* 组件不会渲染
- 位置：`src/main-sidebar.ts`

### 2. 全局注册导致打包体积过大

- 当前使用 `app.use(ElementPlus)` 全量引入
- 实际只用了 26 种组件，大量未用组件被打包
- 建议改用 `unplugin-vue-components` + `unplugin-auto-import` 按需导入

---

## 中优先级

### 3. 样式隔离合规性

- 项目规则要求"全局所有组件统一开启 CSS Module 样式隔离"
- 部分组件 `<style>` 未使用 `module` 属性，需逐一确认
- 涉及文件：约 30 个 .vue 文件

### 4. 编程式 API 未使用

- `ElMessage` / `ElNotification` / `ElMessageBox` / `ElLoading` 全部未使用
- 对话交互场景适合用 `ElMessage` 做操作反馈提示

---

## 低优先级

### 5. 主题变量覆盖分散

- `App.vue` 覆盖 11 个变量
- `styles/theme-tech.scss` 覆盖 19 个变量
- `FlowCard.module.scss` 覆盖 Button 变量
- 建议统一到 `theme-tech.scss` 或创建专门的主题配置文件

---

## 组件使用统计

| 组件 | 出现文件数 |
|---|---|
| `el-button` | ~25 |
| `el-input` | ~8 |
| `el-select` / `el-option` | ~7 |
| `el-icon` | ~5 |
| `el-tag` | ~4 |
| `el-table` / `el-table-column` | ~3 |
| `el-dialog` | 1 |
| `el-form` 系列 | 1 |
| `el-pagination` | 2 |
| `el-tooltip` | 2 |

**总计：26 种组件，30 个文件**
