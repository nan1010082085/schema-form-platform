# Store 设计

## 拆分策略

将 Board 数据拆分为 4 个 Store，各司其职：

```
useBoardStore       — 实例信息、画布配置、顶层变量/事件
useWidgetStore      — Widget 集合的 CRUD、树结构操作
useEditorStore      — 编辑器交互状态（选中、历史、剪贴板、模式）
useDragStore        — 拖拽状态（拖拽中、碰撞、辅助线）
```

---

## 1. useBoardStore

实例信息和画布配置，变化频率低。

```typescript
// stores/board.ts
export const useBoardStore = defineStore('board', () => {
  // === 实例信息 ===
  const id = ref('')
  const name = ref('')
  const type = ref<'form' | 'search_list'>('form')
  const status = ref<'draft' | 'published'>('draft')

  // === 画布配置 ===
  const canvas = ref<CanvasConfig>({
    width: 1920,
    height: 1080,
    backgroundColor: '#ffffff',
    padding: '0px',
    zoom: 100,
  })

  // === 顶层变量集合 ===
  const variables = ref<BoardVariable[]>([])

  // === 顶层事件集合 ===
  const events = ref<BoardEvent[]>([])

  // === 操作 ===
  function updateCanvas(patch: Partial<CanvasConfig>) { ... }
  function addVariable(variable: BoardVariable) { ... }
  function removeVariable(name: string) { ... }
  function updateVariable(name: string, patch: Partial<BoardVariable>) { ... }
  function addEvent(event: BoardEvent) { ... }
  function removeEvent(index: number) { ... }
  function updateEvent(index: number, patch: Partial<BoardEvent>) { ... }
  function setZoom(zoom: number) { ... }

  return {
    id, name, type, status,
    canvas, variables, events,
    updateCanvas, addVariable, removeVariable, updateVariable,
    addEvent, removeEvent, updateEvent, setZoom,
  }
})
```

---

## 2. useWidgetStore

Widget 集合的 CRUD 和树结构操作，是核心数据 Store。

```typescript
// stores/widget.ts
export const useWidgetStore = defineStore('widget', () => {
  // === Widget 集合 ===
  const widgets = ref<Widget[]>([])

  // === 树结构操作 ===
  function findWidget(id: string, list = widgets.value): Widget | null { ... }
  function findParent(id: string, list = widgets.value): Widget | null { ... }

  // === CRUD ===
  function addWidget(widget: Widget) { ... }
  function removeWidget(id: string) { ... }
  function updateWidget(id: string, patch: Partial<Widget>) { ... }

  // === 位置操作 ===
  function moveWidget(id: string, x: number, y: number) { ... }
  function resizeWidget(id: string, w: number, h: number) { ... }
  function setZIndex(id: string, zIndex: number) { ... }

  // === 容器操作 ===
  function addToContainer(widgetId: string, containerId: string) { ... }
  function removeFromContainer(widgetId: string) { ... }
  function reparentToRoot(id: string) { ... }
  function reparentToContainer(id: string, targetId: string, x: number, y: number) { ... }

  // === 表单容器绑定 ===
  // Widget 拖入表单容器时，绑定容器的 formId
  // Widget 数据中增加 formId 字段，标识归属哪个表单容器
  // 表单提交时，按 formId 收集所有子 Widget 的值
  function bindToForm(widgetId: string, formId: string) { ... }
  function unbindFromForm(widgetId: string) { ... }
  function collectFormValues(formId: string): Record<string, unknown> { ... }

  // === 页签操作 ===
  // Widget 拖入页签容器时，绑定当前激活标签的 key
  function setTabKey(widgetId: string, tabKey: string) { ... }

  return {
    widgets,
    findWidget, findParent,
    addWidget, removeWidget, updateWidget,
    moveWidget, resizeWidget, setZIndex,
    addToContainer, removeFromContainer, reparentToRoot, reparentToContainer,
    setTabKey,
  }
})
```

---

## 3. useEditorStore

编辑器交互状态，不涉及 Widget 数据本身。

```typescript
// stores/editor.ts
export const useEditorStore = defineStore('editor', () => {
  // === 选中状态 ===
  const selectedId = ref<string | null>(null)
  const selectedIds = ref<string[]>([])

  // === 编辑器模式 ===
  const mode = ref<'edit' | 'preview'>('edit')

  // === 撤销/重做（主画布） ===
  const history = ref<Widget[][]>([])
  const historyIndex = ref(-1)
  const MAX_HISTORY = 30

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  // === 弹窗编辑器（独立历史） ===
  const editingDialogId = ref<string | null>(null)
  const dialogHistory = ref<Widget[][]>([])
  const dialogHistoryIndex = ref(-1)

  const canUndoDialog = computed(() => dialogHistoryIndex.value > 0)
  const canRedoDialog = computed(() => dialogHistoryIndex.value < dialogHistory.value.length - 1)

  // === 剪贴板 ===
  const clipboard = ref<Widget | null>(null)

  // === 选择操作 ===
  function select(id: string | null) { ... }
  function toggleSelect(id: string) { ... }
  function clearSelection() { ... }

  // === 历史操作 ===
  function pushHistory(widgets: Widget[]) { ... }
  function undo(): Widget[] | null { ... }
  function redo(): Widget[] | null { ... }

  // === 剪贴板操作 ===
  function copy(widget: Widget) { ... }
  function paste(): Widget | null { ... }

  // === 模式切换 ===
  function setMode(mode: 'edit' | 'preview') { ... }

  // === 弹窗编辑器 ===
  function openDialogEditor(id: string) { ... }
  function closeDialogEditor() { ... }
  function pushDialogHistory(widgets: Widget[]) { ... }
  function undoDialog(): Widget[] | null { ... }
  function redoDialog(): Widget[] | null { ... }

  return {
    selectedId, selectedIds, mode,
    history, historyIndex, canUndo, canRedo,
    editingDialogId, dialogHistory, dialogHistoryIndex, canUndoDialog, canRedoDialog,
    clipboard,
    select, toggleSelect, clearSelection,
    pushHistory, undo, redo,
    copy, paste,
    setMode,
    openDialogEditor, closeDialogEditor,
    pushDialogHistory, undoDialog, redoDialog,
  }
})
```

---

## 4. useDragStore

拖拽状态，变化频率最高，独立管理避免污染其他 Store。

```typescript
// stores/drag.ts
export const useDragStore = defineStore('drag', () => {
  // === 拖拽状态 ===
  const isDragging = ref(false)
  const dragSource = ref<'panel' | 'canvas' | null>(null)
  const dragWidgetId = ref<string | null>(null)       // 画布内拖拽的 Widget ID
  const dragWidgetType = ref<string | null>(null)      // 面板拖拽的 Widget 类型

  // === 拖拽位置 ===
  const dragX = ref(0)
  const dragY = ref(0)
  const dragDeltaX = ref(0)
  const dragDeltaY = ref(0)

  // === 碰撞状态 ===
  const hoveredContainerId = ref<string | null>(null)  // 当前悬停的容器 ID
  const isInContainer = ref(false)                      // 是否在容器内

  // === 辅助线 ===
  const guideLines = ref<GuideLine[]>([])              // 当前显示的辅助线
  const snapX = ref<number | null>(null)               // 吸附位置 x
  const snapY = ref<number | null>(null)               // 吸附位置 y

  // === 操作 ===
  function startDrag(source: 'panel' | 'canvas', id?: string, type?: string) { ... }
  function updateDragPosition(x: number, y: number) { ... }
  function updateCollision(containerId: string | null) { ... }
  function updateGuideLines(lines: GuideLine[]) { ... }
  function updateSnap(x: number | null, y: number | null) { ... }
  function endDrag() { ... }

  return {
    isDragging, dragSource, dragWidgetId, dragWidgetType,
    dragX, dragY, dragDeltaX, dragDeltaY,
    hoveredContainerId, isInContainer,
    guideLines, snapX, snapY,
    startDrag, updateDragPosition, updateCollision,
    updateGuideLines, updateSnap, endDrag,
  }
})

interface GuideLine {
  type: 'horizontal' | 'vertical'
  position: number              // 辅助线位置
  start: number                 // 起始坐标
  end: number                   // 结束坐标（超出对齐边缘 20px）
}
```

---

## Store 间关系

```
useBoardStore ──────┐
                    ├── EditorView 读取，组装完整 Board 数据
useWidgetStore ─────┤
                    │
useEditorStore ─────┤── 选中状态、历史、模式
                    │
useDragStore ───────┘── 拖拽状态、碰撞、辅助线
```

### 写入流程

```
用户操作
  → useDragStore（拖拽状态）
    → 拖拽结束
      → useWidgetStore（更新 Widget 位置）
        → useEditorStore.pushHistory（记录快照）

属性面板修改
  → useWidgetStore.updateWidget（更新 Widget）
    → useEditorStore.pushHistory（记录快照）

撤销/重做
  → useEditorStore.undo/redo（恢复快照）
    → useWidgetStore.widgets = 快照数据
```

### 快照策略

- 全局快照：`JSON.parse(JSON.stringify(widgets))` 深拷贝整个 widgets 数组
- 上限：30 步
- 触发时机：add/remove/update/move/resize/zIndex 变更、拖拽结束、属性修改确认、事件/规则配置确认
- 不触发：拖拽移动过程中的实时坐标更新
- 不做增量快照，先保持简单，后续按需优化

### 读取流程

```
EditorView
  ├── useBoardStore.canvas        → 画布配置（尺寸、背景、缩放）
  ├── useWidgetStore.widgets      → Widget 集合（传入 SchemaRender）
  ├── useEditorStore.selectedId   → 选中状态（传入 EditorOverlay）
  └── useDragStore.isDragging     → 拖拽状态（传入 EditorOverlay）

SchemaRender
  └── Widget 数据通过 provide/inject 传递，不直接读 Store

EditorOverlay
  ├── useEditorStore.selectedId   → 渲染选中框
  ├── useDragStore.guideLines     → 渲染辅助线
  └── useDragStore.hoveredContainerId → 渲染容器拖放区域

PropertyPanel
  ├── useEditorStore.selectedId   → 获取选中 Widget
  ├── useWidgetStore.findWidget   → 查找 Widget 数据
  └── widgetConfig.propertyPanel  → 渲染可编辑属性
```
