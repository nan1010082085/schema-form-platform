# 实施计划

## 整体分为三条线

- **架构线**：数据模型、Store、渲染引擎、事件/规则引擎
- **布局线**：画布、拖拽、坐标系、辅助线、属性面板
- **组件线**：Widget 体系、容器组件、基础组件

三条线并行推进，架构线先行（其他线依赖），布局线和组件线可部分并行。

---

## 架构线

### Phase 1：数据模型

**目标**：定义 Widget 类型体系

- [ ] 1.1 定义 `Widget` 类型（position、style、events、rules、variables、formId、tabKey、colIndex）
- [ ] 1.2 定义 `Board` 类型（canvas、variables、events、widgets）
- [ ] 1.3 定义公共 schema 字段（`base/publicSchema.ts`：公共字段 + 公共样式）
- [ ] 1.4 定义 inject key（`base/types.ts`：widgetDataKey、widgetStyleKey）

### Phase 2：Store 重构

**目标**：4 个 Store 管理 Board 数据

- [ ] 2.1 新建 `useBoardStore`：实例信息、画布配置、顶层变量/事件
- [ ] 2.2 新建 `useWidgetStore`：Widget 集合的 CRUD、树结构操作
- [ ] 2.3 新建 `useEditorStore`：选中、历史、剪贴板、模式、弹窗编辑器（独立历史）
- [ ] 2.4 新建 `useDragStore`：拖拽状态、碰撞、辅助线
- [ ] 2.5 快照策略：全局深拷贝，上限 30 步，仅在 Store 方法内调用

### Phase 3：渲染引擎

**目标**：SchemaRender 统一渲染 Widget

- [ ] 3.1 重写 `SchemaRender.vue`：接收 Widget[]，递归渲染
- [ ] 3.2 Widget 通过 inject 接收自身数据（widgetDataKey、widgetStyleKey）
- [ ] 3.3 容器 Widget 渲染子 Widget：递归调用 SchemaRender
- [ ] 3.4 规则求值引擎：evaluateRules(rules) → visible / disabled / required
- [ ] 3.5 formData 绑定：Widget 的 field 与 formData 双向绑定
- [ ] 3.6 校验规则：validationRules 字段校验

### Phase 4：事件/规则引擎

**目标**：独立的事件和规则执行引擎

- [ ] 4.1 事件引擎：解析 WidgetEvent，执行 SchemaEventAction（show/hide/open-dialog/close-dialog/switch-tab）
- [ ] 4.2 规则引擎：解析 WidgetRule，监听 watches，判断 condition，执行 actions
- [ ] 4.3 动作执行器：fetch-data、set-value、submit、validate、reset
- [ ] 4.4 弹框配置 UI：事件配置弹框、规则配置弹框

---

## 布局线

### Phase 5：画布与坐标系

**目标**：统一坐标系，解决选中位置不一致问题

- [ ] 5.1 统一使用 `left/top` 定位，废弃 `transform: translate`
- [ ] 5.2 坐标链路实现：viewport → canvas 内容坐标 → Widget position
- [ ] 5.3 根级组件边界约束：`x >= 0, y >= 0, x+w <= canvasWidth, y+h <= canvasHeight`
- [ ] 5.4 缩放支持：100%-150%，拖拽 delta 除以 zoomLevel
- [ ] 5.5 画布滚动：内容超出视口时可滚动

### Phase 6：拖拽系统

**目标**：统一拖拽逻辑，支持容器进出

- [ ] 6.1 组件面板拖拽：从面板拖出 Widget 到画布，调用对应 schema.ts 生成初始数据
- [ ] 6.2 画布内拖拽：移动 Widget 位置，实时更新 position.x/y
- [ ] 6.3 缩放拖拽：拖拽 Widget 边角调整 position.w/h
- [ ] 6.4 碰撞检测：中心点判断是否进入容器 bounding box
- [ ] 6.5 拖入容器：canvas 坐标 → 容器本地坐标，绑定 formId / tabKey / colIndex
- [ ] 6.6 拖出容器：容器本地坐标 → canvas 坐标，解绑容器字段
- [ ] 6.7 容器禁止嵌套：碰撞检测排除容器组件

### Phase 7：对齐辅助线

**目标**：拖拽时显示辅助线，支持碰撞吸附

- [ ] 7.1 辅助线渲染：EditorOverlay 层渲染浅灰色虚线（#c0c0c0），超出对齐边缘 20px
- [ ] 7.2 对齐检测：Widget 四边/中心 ↔ 容器四边/中心 + 其他 Widget 四边/中心
- [ ] 7.3 碰撞吸附：±5px 阈值自动吸附到对齐位置
- [ ] 7.4 辅助线消失：拖拽结束后清除

### Phase 8：EditorOverlay 附加层

**目标**：编辑器 UI 与渲染逻辑解耦

- [ ] 8.1 EditorOverlay 组件：包裹 SchemaRender，读取同一份 Widget 数据
- [ ] 8.2 选中框：根据 selectedId 用 position 渲染选中边框
- [ ] 8.3 拖拽手柄：选中 Widget 的四角/四边渲染缩放手柄
- [ ] 8.4 容器拖放区域：容器 Widget 上渲染可拖放区域
- [ ] 8.5 辅助线层：集成对齐辅助线

### Phase 9：属性面板

**目标**：统一 form 体系，动态组件渲染

- [ ] 9.1 属性面板框架：统一 form + provide/inject + 动态组件
- [ ] 9.2 动态组件实现：InputText、InputNumber、ColorPicker、Select、Switch、ArrayEditor、ObjectEditor
- [ ] 9.3 根据 Widget config.propertyPanel 声明渲染可编辑属性
- [ ] 9.4 属性修改回写 Store：useWidgetStore.updateWidget() → 自上而下渲染
- [ ] 9.5 事件/规则配置入口：EventButton / RuleButton 打开弹框

---

## 组件线

### Phase 10：Widget 基础架构

**目标**：建立 Widget 开发框架

- [ ] 10.1 `base/publicSchema.ts`：公共字段 + 公共样式面板声明
- [ ] 10.2 `base/types.ts`：Widget 类型、inject key
- [ ] 10.3 `widgets/registry.ts`：Widget 注册表（按容器/基础/业务分组）
- [ ] 10.4 组件面板从 registry 读取可拖拽列表

### Phase 11：容器 Widget

**目标**：实现 5 类容器组件

- [ ] 11.1 表单容器（form）：el-form 包裹，收集值 emit，校验 required，提交/刷新配置
- [ ] 11.2 卡片容器（card）：纯容器包裹
- [ ] 11.3 行列容器（row-col）：el-row + el-col，图标选择 1/2/3/4 列
- [ ] 11.4 页签容器（tabs）：动态标签管理，Widget 绑定 tabKey
- [ ] 11.5 弹窗容器（dialog）：el-dialog slot（header/content/footer），编辑模式（独立画布）和微前端模式互斥

### Phase 12：基础 Widget

**目标**：实现基础组件

- [ ] 12.1 输入框（input）
- [ ] 12.2 下拉选择（select）
- [ ] 12.3 数字输入（number）
- [ ] 12.4 单选（radio）
- [ ] 12.5 多选（checkbox）
- [ ] 12.6 日期选择（date）
- [ ] 12.7 文本域（textarea）
- [ ] 12.8 按钮列表（button-list）
- [ ] 12.9 标题（title）
- [ ] 12.10 分割线（divider）
- [ ] 12.11 间距（spacer）
- [ ] 12.12 工具栏按钮（toolbar-buttons）

### Phase 13：独立构建与 Microapp

**目标**：Widget 独立构建，支持 microapp 加载

- [ ] 13.1 Vite 多入口配置：每个 Widget 独立入口
- [ ] 13.2 构建产物：每个 Widget 独立 JS 文件
- [ ] 13.3 Microapp 加载接口：dialog 微前端模式加载已发布表单
- [ ] 13.4 postMessage 通信：顶层统一消息收发，支持指定 publishId

---

## 依赖关系

```
Phase 1 (数据模型)
  ├── Phase 2 (Store)
  │     ├── Phase 3 (渲染引擎)
  │     │     ├── Phase 4 (事件/规则引擎)
  │     │     └── Phase 8 (EditorOverlay)
  │     └── Phase 5 (画布坐标系)
  │           ├── Phase 6 (拖拽系统)
  │           │     └── Phase 7 (对齐辅助线)
  │           └── Phase 9 (属性面板)
  └── Phase 10 (Widget 基础架构)
        ├── Phase 11 (容器 Widget)
        ├── Phase 12 (基础 Widget)
        └── Phase 13 (独立构建)
```

## 本期范围

| 优先级 | Phase | 内容 |
|---|---|---|
| P0 | 1-3 | 数据模型 + Store + 渲染引擎（核心链路跑通） |
| P0 | 5-6 | 画布坐标系 + 拖拽系统（基础交互） |
| P0 | 10-11 | Widget 基础架构 + 容器 Widget |
| P1 | 7 | 对齐辅助线 |
| P1 | 8 | EditorOverlay |
| P1 | 9 | 属性面板 |
| P1 | 12 | 基础 Widget |
| P2 | 4 | 事件/规则引擎 |
| P2 | 13 | 独立构建 + Microapp |
