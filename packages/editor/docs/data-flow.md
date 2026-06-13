# 数据流转模型

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Pinia Store                          │
│  useWidgetStore.widgets: Widget[]     ← 唯一数据源            │
│  useEditorStore: selectedId, mode, history ...               │
│  useBoardStore: canvas, variables, events ...                │
│  useDragStore: isDragging, guideLines ...                    │
└───────────┬─────────────────────────────┬───────────────────┘
            │ 读取                         │ 读取
            ▼                              ▼
┌───────────────────────┐    ┌────────────────────────────────┐
│    EditorCanvas        │    │    PublishView                  │
│    (编辑器)             │    │    (发布渲染)                    │
│                       │    │                                │
│  SchemaRender         │    │  SchemaRender                  │
│  + EditorOverlay      │    │  纯渲染                         │
│  (选中/拖拽/辅助线)    │    │                                │
└───────────┬───────────┘    └────────────────────────────────┘
            │ emit
            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Pinia Store                          │
│  useWidgetStore.updateWidget() → 自上而下重新渲染              │
└─────────────────────────────────────────────────────────────┘
```

## 数据流方向

### 自上而下（读取 → 渲染）

```
useWidgetStore.widgets
  → EditorCanvas / PublishView（读取 store）
    → SchemaRender（接收 widgets prop）
      → provide(widgetDataKey, 组件数据)
        → 子组件 inject(widgetDataKey) 获取自身数据
          → 组件内部渲染（CSS Modules + JS-in-CSS）
```

### 自下而上（写入 → 更新）

```
用户操作（拖放 / 属性修改 / 事件配置）
  → emit 回调上报
    → useWidgetStore.updateWidget(id, patch)
      → useEditorStore.pushHistory() 记录快照
        → 自上而下重新渲染
```

## 写入时机

| 操作 | 写入 Store | pushHistory |
|---|---|---|
| 拖放组件完成 | ✅ | ✅ |
| 属性面板修改确认 | ✅ | ✅ |
| 删除组件 | ✅ | ✅ |
| 事件/规则弹框配置确认 | ✅ | ✅ |
| 拖拽移动过程中 | ✅（实时坐标） | ❌（结束时才记录） |
| 拖拽缩放过程中 | ✅（实时尺寸） | ❌（结束时才记录） |

## 属性面板闭环

```
选中组件 (useEditorStore.selectedId)
  → useWidgetStore.findWidget(id) 获取 Widget 数据
    → 属性面板展示 position / style / props / events / rules
      → 用户修改
        → useWidgetStore.updateWidget(id, patch)
          → 自上而下重新渲染
            → 组件内部应用新样式/属性
            → EditorOverlay 同步更新附加层
```

## 编辑器 vs 渲染器

| | 编辑器 (EditorCanvas) | 渲染器 (PublishView) |
|---|---|---|
| 数据源 | `useWidgetStore.widgets` | `useWidgetStore.widgets`（或 API 加载） |
| 渲染 | SchemaRender | SchemaRender（同一组件） |
| 附加层 | EditorOverlay（选中/拖拽/辅助线） | 无 |
| 交互 | 可选中、拖拽、编辑属性 | 纯表单填写 / 只读展示 |

## SchemaRender 渲染流程

```
SchemaRender(widgets)
│
├─ provide(widgetDataKey, 组件数据)       ← 向子组件 provide 自身数据
│
├─ 判断组件类型
│   ├─ 容器组件 → 渲染容器 + 递归渲染 children
│   └─ 基础组件 → 渲染对应组件
│
├─ evaluateRules(rules)                   ← 规则求值（condition）
│   ├─ visible → 控制显示/隐藏
│   ├─ disabled → 控制禁用
│   └─ required → 控制必填
│
└─ <component :is="compMap[type]">
     └─ 子组件 inject(widgetDataKey) 获取自身数据
```

## EditorOverlay 附加层

EditorOverlay 包裹 SchemaRender，读取同样的 Widget 数据，在渲染层上方叠加编辑 UI：

```
EditorOverlay(widgets)
│
├─ 选中框：根据 selectedId 找到 Widget，用 position 渲染选中边框
├─ 拖拽手柄：选中 Widget 的四角/四边渲染缩放手柄
├─ 容器拖放区域：容器 Widget 上渲染可拖放区域
├─ 对齐辅助线：拖拽时根据吸附结果显示虚线
│
└─ <SchemaRender :widgets="widgets" />   ← 纯渲染层
```

## 坐标系

### 三种坐标系

```
viewport 坐标：鼠标事件的 clientX/clientY，相对于浏览器视口
canvas 内容坐标：相对于画布内容区左上角（含滚动偏移）
容器本地坐标：相对于容器元素左上角
```

### 坐标链路

```
鼠标点击（viewport）
  → canvas 内容坐标 = viewport - canvas.getBoundingClientRect() + canvas.scroll
  → 命中判断：
      根级组件：直接比对 canvas 内容坐标 vs widget.position
      容器内组件：canvas 内容坐标 - container.position = 容器本地坐标，再比对
```

### 坐标转换

```
拖入容器：local = canvas - container.position
拖出容器：canvas = container.position + local
```

### DOM 定位

```
容器：position: relative; left: x; top: y;
子组件：position: absolute; left: x; top: y;
```

全链路统一使用 `left/top`，不使用 `transform`。

## 碰撞检测

拖拽时检测组件中心点是否在容器 bounding box 内：

```
中心点 (cx, cy) 在容器内？
  cx >= container.x && cx <= container.x + container.w
  cy >= container.y && cy <= container.y + container.h
  → 命中：进入该容器
  → 未命中：回到根级
```

容器禁止嵌套，只需检测根级容器，无需递归。

## 撤销/重做

```
pushHistory() → JSON.parse(JSON.stringify(widgets)) 深拷贝快照
  → 存入 history[]，上限 30 步

undo() → historyIndex--，恢复快照
redo() → historyIndex++，恢复快照
```

仅在 Store 方法内调用 pushHistory，不在 watch 中重复调用。
