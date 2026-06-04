# Editor 项目完善计划

> 更新日期：2026/06/04
> 当前完成度：85%
> 预估总工作量：9-10 人天

---

## 实施路线图

| 阶段 | 功能 | 工作量 | 依赖 | 优先级 |
|------|------|--------|------|--------|
| **第 1 周** | 图表组件配置面板 | 2 天 | 无 | P0 |
| **第 1 周** | 数据源 UI 样式统一 | 1 天 | 无 | P0 |
| **第 2 周** | 组件模板库（后端） | 1 天 | 无 | P1 |
| **第 2-3 周** | 组件模板库（前端） | 2-3 天 | 后端 Model | P1 |
| **第 3 周** | Schema 版本对比 | 3 天 | 无 | P1 |

---

## 一、图表组件配置面板（2 天）

### 现状问题

1. **`json` 类型未被渲染器支持** — 9 个图表的 `rawOption` 属性声明了 `type: 'json'`，但 `PropertyField.vue` 没有处理该分支
2. **图表组件使用内嵌 API 字段** — 与统一的 `SchemaApiConfig` 模型分离，无法使用"数据源"按钮
3. **缺少 `staticData` 编辑入口** — 所有图表共有的核心属性没有 UI 编辑器

### 实施步骤

#### Step 1：在 `PropertyField.vue` 增加 `json` 类型支持

- **文件**：`packages/editor/web/src/components/Editor/PropertyField.vue`
- **实现**：使用 `el-input type="textarea"` 渲染 JSON 字符串，失焦时 `JSON.parse` 校验并 emit
- **改动量**：约 30 行

#### Step 2：为 9 个图表添加 `staticData` 可视化编辑

在每个图表的 `config.ts` 头部增加：

```typescript
{ key: 'staticData', label: '静态数据', type: 'array-editor', fields: [...] }
```

`fields` 根据图表类型定制：

| 图表类型 | fields 定义 |
|----------|-------------|
| bar-chart | `[{ key: 'category', label: '分类', type: 'text' }, { key: 'value', label: '值', type: 'number' }]` |
| line-chart | `[{ key: 'category', label: '分类', type: 'text' }, { key: 'value', label: '值', type: 'number' }]` |
| pie-chart | `[{ key: 'name', label: '名称', type: 'text' }, { key: 'value', label: '值', type: 'number' }]` |
| scatter-chart | `[{ key: 'x', label: 'X', type: 'number' }, { key: 'y', label: 'Y', type: 'number' }]` |
| radar | `[{ key: 'name', label: '指标', type: 'text' }, { key: 'value', label: '值', type: 'number' }]` |
| gauge | `[{ key: 'value', label: '值', type: 'number' }]` |
| heatmap | `[{ key: 'x', label: 'X', type: 'number' }, { key: 'y', label: 'Y', type: 'number' }, { key: 'value', label: '值', type: 'number' }]` |
| funnel | `[{ key: 'name', label: '名称', type: 'text' }, { key: 'value', label: '值', type: 'number' }]` |
| candlestick | `[{ key: 'date', label: '日期', type: 'text' }, { key: 'open', label: '开盘', type: 'number' }, { key: 'close', label: '收盘', type: 'number' }, { key: 'low', label: '最低', type: 'number' }, { key: 'high', label: '最高', type: 'number' }]` |

#### Step 3：补充遗漏的配置项

| 组件 | 补充内容 | 说明 |
|------|----------|------|
| heatmap | 添加 `showLegend` 配置 | 热力图需要图例说明颜色含义 |
| gauge | 保持现状 | 单值仪表盘无需图例 |
| candlestick | 保持现状 | K 线图一般不显示标签 |

#### Step 4：添加单元测试

在每个图表的 `__tests__/` 目录下补充属性配置面板渲染测试，验证：
- `json` 类型的 `rawOption` 正确渲染为 textarea
- `staticData` 编辑器正确渲染
- 配置修改后 Widget props 正确更新

### 需要修改的文件

```
packages/editor/web/src/components/Editor/PropertyField.vue          # 新增 json 分支
packages/editor/web/src/widgets/bar-chart/config.ts                  # 补充 staticData
packages/editor/web/src/widgets/line-chart/config.ts                 # 补充 staticData
packages/editor/web/src/widgets/pie-chart/config.ts                  # 补充 staticData
packages/editor/web/src/widgets/scatter-chart/config.ts              # 补充 staticData
packages/editor/web/src/widgets/radar/config.ts                      # 补充 staticData
packages/editor/web/src/widgets/gauge/config.ts                      # 补充 staticData
packages/editor/web/src/widgets/heatmap/config.ts                    # 补充 staticData + showLegend
packages/editor/web/src/widgets/funnel/config.ts                     # 补充 staticData
packages/editor/web/src/widgets/candlestick/config.ts                # 补充 staticData
```

---

## 二、数据源 UI 样式统一（1 天）

### 现状问题

存在三套独立实现，样式不一致：

| 属性 | ApiConfig | Event/Linkage/Variable |
|------|-----------|------------------------|
| `.card` 背景色 | `--bg-color-gray-light` | `--bg-color-surface` |
| `.cardTitle` 颜色 | `--text-color-primary` | `--text-color-title` |
| `.label` 颜色 | `--text-color-secondary` | `--text-color-regular` |
| `.test` 面板背景 | `--bg-color-gray-light` | `--bg-color-surface` |
| 弹窗宽度 | 900px | 900px（RequestConfigDialog 560px） |

### 实施步骤

#### Step 1：提取共享的 Dialog 样式 Token

**新建文件**：`packages/editor/web/src/styles/dialog-tokens.scss`

```scss
@mixin dialog-body {
  height: 60vh;
  display: flex;
  gap: 16px;
  min-height: 0;
}

@mixin dialog-card {
  border: 1px solid var(--border-color-light);
  border-radius: 6px;
  padding: 12px;
  background: var(--bg-color-surface);
}

@mixin dialog-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color-title);
}

@mixin dialog-label {
  width: 50px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-color-regular);
  line-height: 32px;
}

@mixin dialog-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

@mixin unified-control-height {
  :global(.el-input__wrapper),
  :global(.el-select .el-input__wrapper),
  :global(.el-button:not(.is-text):not(.is-link)) {
    height: 32px !important;
    min-height: 32px !important;
  }
}
```

#### Step 2：统一 `ApiConfig.module.scss`

- `.card` 背景色 → `--bg-color-surface`
- `.cardTitle` 颜色 → `--text-color-title`
- `.label` 颜色 → `--text-color-regular`
- `.test` 面板背景 → `--bg-color-surface`
- 使用 mixin 简化重复代码

#### Step 3：统一 `RequestConfigDialog`

- 弹窗宽度从 560px 改为 900px（与 OptionsApiConfigDialog 一致）
- 长期方案：让图表组件也使用统一的 `SchemaApiConfig` 模型，逐步废弃 `RequestConfigDialog`

#### Step 4：验证其他 Dialog 一致性

检查以下文件是否已使用统一 Token：
- `EventConfigDialog.module.scss`
- `LinkageConfigDialog.module.scss`
- `VariableConfigDialog.module.scss`

### 需要修改的文件

```
packages/editor/web/src/styles/dialog-tokens.scss                              # 新建
packages/editor/web/src/components/Editor/ApiConfig.module.scss                # 修改
packages/editor/web/src/components/Editor/OptionsApiConfigDialog.module.scss   # 修改
packages/editor/web/src/components/Editor/RequestConfigDialog.module.scss      # 修改
packages/editor/web/src/components/Editor/RequestConfigDialog.vue              # 宽度调整
```

---

## 三、组件模板库（3-4 天）

### 数据模型设计

#### 后端 Mongoose Model：`WidgetTemplate`

```typescript
interface IWidgetTemplate {
  _id: string
  name: string           // 模板名称，如"查询表单模板"
  description?: string   // 描述
  category?: string      // 分类（表单/报表/布局）
  thumbnail?: string     // 预览图（base64 data URL）
  widgets: Record<string, unknown>[]  // Widget JSON 数组
  tags?: string[]        // 标签，用于搜索
  isBuiltin: boolean     // 是否内置模板
  createdBy?: string     // 创建者
  createdAt: Date
  updatedAt: Date
}
```

#### 后端 API 路由：`/api/templates`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/templates` | 分页列表（支持 search/category/page/pageSize） |
| POST | `/api/templates` | 创建模板 |
| GET | `/api/templates/:id` | 获取详情 |
| PUT | `/api/templates/:id` | 更新模板 |
| DELETE | `/api/templates/:id` | 删除模板 |
| POST | `/api/templates/:id/apply` | 应用模板（返回 widgets JSON，重新生成 ID） |

### 实施步骤

#### Step 1：后端 — Model 和路由

**新建文件**：
- `packages/server/src/models/WidgetTemplate.ts`
- `packages/server/src/routes/template.ts`

**修改文件**：
- `packages/server/src/app.ts` — 注册新路由

#### Step 2：前端 — API 类型和客户端方法

**修改文件**：
- `packages/editor/web/src/types/api.ts` — 新增 `WidgetTemplate` 类型
- `packages/editor/web/src/utils/apiClient.ts` — 新增 `fetchTemplates`、`createTemplate`、`deleteTemplate`、`applyTemplate`

#### Step 3：前端 — 模板面板 UI

**新建文件**：
- `packages/editor/web/src/components/Editor/TemplatePanel.vue`
- `packages/editor/web/src/components/Editor/TemplatePanel.module.scss`

**UI 设计**：
- 顶部搜索框 + 分类筛选（下拉或 Tab）
- 模板卡片列表（缩略图 + 名称 + 描述）
- 每个卡片可拖拽到画布（复用 `handleDragStart` 的 dataTransfer 机制）
- 右键菜单：编辑、删除

#### Step 4：前端 — 保存模板功能

**新建文件**：
- `packages/editor/web/src/components/Editor/SaveTemplateDialog.vue`

**修改文件**：
- `packages/editor/web/src/components/Editor/WidgetContextMenu.vue` — 增加"保存为模板"菜单项

**UI 设计**：
- 弹出 Dialog 让用户输入模板名称、描述、分类
- 将选中的 Widget（或全部 Widget）序列化为 JSON 保存

#### Step 5：前端 — 应用模板功能

- 拖拽模板到画布时调用 `applyTemplate` API
- 获取 widgets JSON（已重新生成 ID）
- 通过 `widgetStore.addWidget` 逐个添加到画布

#### Step 6：前端 — 集成到左侧面板

**修改文件**：
- `packages/editor/web/src/components/Editor/EditorLeftPanel.vue` — 增加第三个 Tab `templates`

### 需要新增/修改的文件

```
# 后端
packages/server/src/models/WidgetTemplate.ts                    # 新建
packages/server/src/routes/template.ts                          # 新建
packages/server/src/app.ts                                      # 修改

# 前端
packages/editor/web/src/types/api.ts                            # 修改
packages/editor/web/src/utils/apiClient.ts                      # 修改
packages/editor/web/src/components/Editor/TemplatePanel.vue     # 新建
packages/editor/web/src/components/Editor/TemplatePanel.module.scss  # 新建
packages/editor/web/src/components/Editor/SaveTemplateDialog.vue     # 新建
packages/editor/web/src/components/Editor/EditorLeftPanel.vue        # 修改
packages/editor/web/src/components/Editor/WidgetContextMenu.vue      # 修改
```

---

## 四、Schema 版本对比（3 天）

### 实施步骤

#### Step 1：实现 Schema Diff 算法

**新建文件**：`packages/editor/web/src/utils/schemaDiff.ts`

**核心算法**：

```typescript
interface DiffResult {
  added: WidgetDiff[]      // 新增
  removed: WidgetDiff[]    // 删除
  modified: WidgetDiff[]   // 修改
  moved: WidgetDiff[]      // 移动
}

interface WidgetDiff {
  id: string
  name: string
  type: string
  label?: string
  path: string             // 树中的路径，如 "root > card_abc > input_def"
  changes?: FieldChange[]  // 具体字段变化
}

interface FieldChange {
  field: string            // 变化的字段路径，如 "props.title"
  oldValue: unknown
  newValue: unknown
}
```

**算法流程**：
1. 将两个版本的 Widget 树展平为 `Map<string, Widget>`（按 id 索引）
2. 遍历旧版本 Map，检查每个 Widget 在新版本中是否存在
   - 不存在：标记为 `removed`
   - 存在但内容不同：标记为 `modified`，递归比较 `props`、`style`、`position`、`events`、`api` 等子对象
3. 遍历新版本 Map，检查每个 Widget 在旧版本中是否存在
   - 不存在：标记为 `added`
4. 比较 `children` 数组顺序变化，标记 `moved`

**字段比较规则**：
- 使用深度 JSON diff
- 忽略 `id` 字段（因为复制粘贴会产生新 id）
- 数组类型使用最长公共子序列（LCS）算法比较

#### Step 2：创建版本对比 Dialog

**新建文件**：
- `packages/editor/web/src/components/Editor/VersionDiffDialog.vue`
- `packages/editor/web/src/components/Editor/VersionDiffDialog.module.scss`

**UI 设计**：
- **顶部**：两个版本选择器（el-select），默认选择当前版本和上一个版本
- **中部**：左右分栏对比视图
  - 左侧：版本 A 的 Widget 树，差异节点高亮（红色背景表示删除，黄色表示修改）
  - 右侧：版本 B 的 Widget 树，差异节点高亮（绿色背景表示新增，黄色表示修改）
  - 左右滚动联动
- **底部**：差异统计摘要（"新增 3 个组件，修改 5 个属性，删除 1 个组件"）
- **操作按钮**：
  - "加载此版本" — 将版本 B 的内容加载到画布
  - "关闭"

**交互细节**：
- 每个差异节点可展开查看具体的字段变化（`FieldChange` 列表）
- 字段变化以 key-value 对比的形式展示 old vs new
- 点击差异节点可在画布中定位到对应组件

#### Step 3：在 EditorView 中集成入口

**修改文件**：`packages/editor/web/src/views/EditorView.vue`

- 在版本历史 Popover 中为每个非当前版本增加"对比"按钮
- 点击后打开 `VersionDiffDialog`，传入 `currentVersion` 和选中的 `targetVersion`

#### Step 4：添加单元测试

**新建文件**：`packages/editor/web/src/__tests__/schemaDiff.spec.ts`

**测试场景**：
- 两个空数组的 diff
- 新增 Widget
- 删除 Widget
- 修改 Widget 属性
- 嵌套 Widget 的 diff
- children 顺序变化
- 复杂嵌套结构的 diff

### 需要新增/修改的文件

```
packages/editor/web/src/utils/schemaDiff.ts                          # 新建
packages/editor/web/src/components/Editor/VersionDiffDialog.vue      # 新建
packages/editor/web/src/components/Editor/VersionDiffDialog.module.scss  # 新建
packages/editor/web/src/views/EditorView.vue                         # 修改
packages/editor/web/src/__tests__/schemaDiff.spec.ts                 # 新建
```

---

## 关键文件清单

| 文件 | 用途 | 涉及功能 |
|------|------|----------|
| `packages/editor/web/src/components/Editor/PropertyField.vue` | 图表配置面板核心改动点 | 图表组件配置 |
| `packages/editor/web/src/components/Editor/ApiConfig.module.scss` | 数据源样式统一主要修改文件 | 数据源 UI |
| `packages/editor/web/src/components/Editor/EditorLeftPanel.vue` | 组件模板库 UI 入口 | 组件模板库 |
| `packages/editor/web/src/views/EditorView.vue` | 版本对比功能集成点 | 版本对比 |
| `packages/editor/web/src/widgets/base/types.ts` | Widget 类型定义（所有功能的基础） | 全部 |

---

## 验收标准

### 图表组件配置面板
- [ ] 9 个图表组件的 `rawOption` 可通过 JSON 编辑器修改
- [ ] 9 个图表组件的 `staticData` 可通过数组编辑器修改
- [ ] 配置修改后图表正确渲染
- [ ] 单元测试通过

### 数据源 UI 样式统一
- [ ] 所有 Dialog 的 `.card` 背景色统一为 `--bg-color-surface`
- [ ] 所有 Dialog 的 `.cardTitle` 颜色统一为 `--text-color-title`
- [ ] 所有 Dialog 的 `.label` 颜色统一为 `--text-color-regular`
- [ ] 所有 Dialog 的弹窗宽度统一为 900px
- [ ] 提取的 mixin 被所有 Dialog 复用

### 组件模板库
- [ ] 后端 API 正确实现 CRUD 和 apply 功能
- [ ] 左侧面板显示模板 Tab
- [ ] 模板卡片可拖拽到画布
- [ ] 可从画布保存为模板
- [ ] 应用模板时 Widget ID 正确重新生成

### Schema 版本对比
- [ ] Diff 算法正确识别新增/删除/修改/移动
- [ ] 对比 Dialog 左右分栏正确显示差异
- [ ] 差异节点高亮正确（红/黄/绿）
- [ ] 可加载历史版本到画布
- [ ] 单元测试通过

---

## 后续优化方向

完成以上四个功能后，Editor 项目将达到 95%+ 完成度。后续可考虑：

1. **组件模板库增强**
   - 内置模板（常用表单、报表模板）
   - 模板分享和导入/导出
   - 模板预览图自动生成

2. **版本对比增强**
   - 三路合并（three-way merge）
   - 版本回滚（revert to version）
   - 版本标签（tag version）

3. **协同编辑**
   - 基于 WebSocket 的实时同步
   - 光标位置共享
   - 冲突解决策略

4. **移动端预览**
   - 响应式断点配置面板
   - 移动端模拟器
   - 断点切换预览
