# 编辑器优化需求 — 2026-05-18

> 来源：产品走查 `https://schema-form-platform.vercel.app/editor?id=8a8d2487-f51e-4721-b6ff-ef1603900195`
> 优先级：全部 P0（阻碍正常使用）

---

## 1. 左侧组件面板 — 折叠分组 + 两列布局

**现状**：所有 ~35 个组件一次平铺加载，无折叠，滚动冗长。

**要求**：
- 使用 Element Plus `el-collapse` 折叠面板按分类分组（布局 / 基础表单 / 业务组件），默认展开第一个分组
- 每行两列网格布局（`width: calc(50% - 4px)`），保持现有拖拽能力
- 性能：折叠分组收起时不渲染内部子项（`v-if` 按展开状态控制）

**涉及文件**：`packages/web/src/components/Editor/ComponentPanel.vue`

---

## 2. 画布内容内边距缩小

**现状**：画布包裹内容的内边距过大（当前约 24-32px）。

**要求**：内容区 padding 缩小至 **10px**。

**涉及文件**：`packages/web/src/components/Editor/EditorCanvas.vue`（`.editor-canvas__content` 或 FormGrid 容器样式）

---

## 3. 组件拖入后不立即弹出属性面板，改为悬浮属性标签

**现状**：组件拖入画布后自动选中并弹出右侧属性抽屉（el-drawer），遮挡画布操作。

**要求**：
- 拖入新组件后 **不自动打开属性面板**
- 点击画布上的组件时，组件 **左上角浮动显示属性标签按钮**（类似 Figma 的 selection badge），点击该标签才打开属性面板
- 属性标签样式：半透明背景 + 组件类型名，如 `[input]` `[表格]`，绝对定位在选中组件左上角（`position: absolute; top: -28px; left: 0`）

**涉及文件**：
- `packages/web/src/components/Editor/EditorCanvas.vue`（选中高亮 + 浮动标签渲染）
- `packages/web/src/views/EditorView.vue`（drawer 打开逻辑调整：拖入后不自动 `selectedPath` 赋值）

---

## 4. 顶部工具栏 — 撑满宽度 + 按钮收纳

**现状**：工具栏左右两端对齐，中间大量空白浪费；按钮全部外露拥挤。

**要求**：
- 工具栏 **撑满整行宽度**，按钮按功能分区均匀分布
- 低频操作收入下拉面板（`el-dropdown` 或 `el-popover`），高频操作保持外露
- 产品需参考以下设计参考，选择好看的 UI 模式：
  - **Notion**：顶部固定工具栏 + 右侧更多 `···` 菜单
  - **Figma**：分区 toolbar + hover 展开更多
  - **Linear**：精简顶部栏 + 右侧快捷操作组
  - **VSCode**：左侧编辑区 + 右侧操作区 + `...` 溢出菜单

**涉及文件**：`packages/web/src/components/Editor/EditorToolbar.vue`

---

## 5. 工具栏按钮图标优化 + 固定排列 + 更多菜单

**现状**：图标语义模糊（如 L/C/R 文字代替对齐图标），按钮排列随意。

**要求**：
- **图标替换**（使用 Element Plus Icons）：
  - 撤销：`RefreshLeft` → 保持
  - 重做：`RefreshRight` → 保持
  - 复制：`CopyDocument` → 保持
  - 删除：`Delete` → 保持
  - 上移：`Top` → `ArrowUpBold`（更直观）
  - 下移：`Bottom` → `ArrowDownBold`
  - 左对齐：文字 L → `AlignLeft`（Element Plus 图标 `List` 或自定义）
  - 居中：文字 C → `AlignCenter`
  - 右对齐：文字 R → `AlignRight`
  - 分组：`FolderAdd` → 保持
  - 取消分组：`FolderRemove` → 保持
  - 校验：`Warning`/`CircleCheck` → 保持

- **固定按钮排列**（从左到右）：
  ```
  [撤销] [重做] | [复制] [删除] [上移] [下移] | [居左] [居中] [居右] | [分组▾] [取消分组] | [校验]
  ```

- **更多操作**（`···` 图标下拉面板，收纳低频操作）：
  - 加载 Schema
  - 导入 JSON
  - 导入响应
  - 导出 JSON

- **高频操作外露**（保持在工具栏）：
  - 保存草稿 / 发布 / 预览（右侧固定）
  - 画布尺寸切换
  - 缩略图切换

**涉及文件**：`packages/web/src/components/Editor/EditorToolbar.vue`

---

## 6. 缩略图与画布联动

**现状**：缩略图仅静态展示，无法与画布交互联动。

**要求**：
- 缩略图实时镜像画布内容（跟随 schema 变更更新）
- 缩略图上的 **可视区域框**（viewport indicator）：标识当前画布 scroll 可见区域，拖拽该框可平移画布
- 点击缩略图某区域 → 画布 scrollTo 对应位置
- 缩略图缩放比：按画布实际尺寸等比例缩放至缩略图容器宽度

**涉及文件**：
- `packages/web/src/components/Editor/EditorCanvas.vue`（缩略图面板组件，需新建或扩展现有 ThumbnailPanel）
- `packages/web/src/views/EditorView.vue`（联动状态：画布 scroll 位置、可视区域计算）

---

## 实施建议

| 需求 | 复杂度 | 建议执行顺序 |
|------|--------|-------------|
| #2 画布间距 | 低 | 1（立即修复） |
| #1 组件面板折叠 | 中 | 2 |
| #5 工具栏图标优化 | 中 | 3 |
| #3 悬浮属性标签 | 高 | 4（交互逻辑重构） |
| #4 工具栏布局重构 | 中 | 5 |
| #6 缩略图联动 | 高 | 6（涉及画布双向绑定） |

**注意**：#3 和 #4/#5 可能需要同步设计，因属性面板行为和工具栏布局相互影响。
