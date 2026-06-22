# 渲染器微应用设计方案

> 独立 Schema 渲染器，供 qiankun 宿主注册，只渲染不编辑

---

## 一、核心概念

### PublishView 就是渲染器

现有 `PublishView`（`/view?id=xxx`）已经是完整的渲染器：
- 通过 publishId 加载已发布 Schema
- WidgetRenderer 渲染
- postMessage 通信协议
- 表单模式控制（edit/view/partial）
- 表单提交

**渲染器 = PublishView 的独立化**，不是新建功能，而是将其从编辑器中解耦，作为独立微应用供宿主注册。

```
现状：
  编辑器 main.ts → 内含 PublishView（/view 路由）
  → 依赖整个编辑器才能运行

目标：
  渲染器 renderer-main.ts = PublishView 独立版本
  → 不依赖编辑器，可独立构建和部署
  → 宿主通过 qiankun 直接注册
```

### 两种微前端，用途不同

```
┌──────────────────────────────────────────────────────┐
│ 宿主应用（shell / admin / 第三方）                     │
│                                                      │
│  ① qiankun 加载的是：编辑器 / 渲染器（我们提供的）     │
│  ┌────────────────────────────────────────────────┐  │
│  │ 渲染器（qiankun 子应用）                         │  │
│  │                                                │  │
│  │  Schema Widget 渲染时：                          │  │
│  │  ② micro-app-container Widget                   │  │
│  │    └── @micro-zoe/micro-app 加载外部应用         │  │
│  │        ┌──────────────────────────────┐        │  │
│  │        │ 外部子应用（审批流/仪表盘）    │        │  │
│  │        └──────────────────────────────┘        │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

| | qiankun | @micro-zoe/micro-app |
|---|---|---|
| **用途** | 宿主加载编辑器/渲染器 | 编辑器/渲染器加载外部应用 |
| **方向** | 宿主 → 我们 | 我们 → 外部 |
| **场景** | shell 注册 editor/renderer | Schema 中 micro-app-container Widget |
| **粒度** | 整个编辑器/渲染器 | 单个 Widget 内嵌 |

---

## 二、四层架构关系

```
┌─────────────────────────────────────────────────────────────────────┐
│                        宿主应用（shell / admin / 第三方）            │
│  ┌───────────────────┐  ┌───────────────────┐                      │
│  │  qiankun 框架      │  │  micro-app 框架   │                      │
│  │  注册子应用        │  │  容器加载子应用    │                      │
│  └────────┬──────────┘  └────────┬──────────┘                      │
└───────────┼──────────────────────┼──────────────────────────────────┘
            │                      │
            ▼                      ▼
┌───────────────────────┐  ┌───────────────────────────────────────────┐
│   编辑器（Editor）     │  │   渲染器（Renderer）                      │
│   qiankun 子应用       │  │   qiankun 子应用                          │
│                       │  │                                           │
│   ├── 设计器画布       │  │   ├── SchemaRendererView                  │
│   ├── 属性面板         │  │   ├── WidgetRenderer（渲染引擎）          │
│   ├── 拖拽/选中        │  │   ├── registerAllWidgets()                │
│   ├── 事件/联动配置    │  │   └── 表单数据管理                        │
│   ├── 7 个 Store       │  │                                           │
│   └── Widget 体系 ─────┼──┤   共享 Widget 体系                       │
│       └── 50 个 Widget │  │       └── 50 个 Widget                    │
│       └── micro-app ───┼──┼───┐                                      │
│         container      │  │   │                                      │
└───────────────────────┘  │   │                                      │
                           └───┼──────────────────────────────────────┘
                               │
                               ▼
                     ┌─────────────────────┐
                     │  子应用（外部）       │
                     │  @micro-zoe/micro-app│
                     │                     │
                     │  审批流 / 仪表盘     │
                     │  第三方业务系统      │
                     └─────────────────────┘
```

### 1.1 四层定义

| 层级 | 名称 | 角色 | 产物 |
|------|------|------|------|
| **L1** | 宿主应用 | 加载和管理微应用 | shell / admin / 第三方 |
| **L2** | 编辑器 | Schema 设计（可视化拖拽、属性配置、事件联动） | `@schema-form/editor-web` |
| **L3** | 渲染器 | Schema 渲染（只渲染，不编辑） | `@schema-form/renderer` |
| **L4** | Widget 体系 | 50+ 组件，被编辑器和渲染器共享 | `widgets/` 目录 |
| **L4+** | 子应用加载 | micro-app-container Widget 嵌套加载外部应用 | `@micro-zoe/micro-app` |

### 1.2 依赖关系

```
编辑器 ──依赖──► Widget 体系（全量：50 个 Widget + 编辑器组件 + 7 Store）
渲染器 ──依赖──► Widget 体系（子集：50 个 Widget + WidgetRenderer + 1 Store）
Widget 体系 ──依赖──► Element Plus / ECharts / Vue 3
子应用加载 ──依赖──► @micro-zoe/micro-app（独立于编辑器/渲染器）
```

### 1.3 Widget 体系内部结构

```
widgets/
├── base/
│   ├── types.ts          # Widget 类型定义（685 行）
│   ├── publicSchema.ts   # 公共字段工厂
│   └── echarts.ts        # ECharts 按需引入
├── registry.ts           # 注册表（Map<SchemaType, WidgetRegistryItem>）
├── index.ts              # registerAllWidgets() 批量注册
├── input/                # 每个 Widget 一个目录
│   ├── FgInput.vue       # 组件实现
│   ├── config.ts         # 属性面板声明 + defaultProps
│   ├── schema.ts         # 工厂函数 createInputWidget(id)
│   └── style.module.scss # 样式
├── select/
├── form/                 # 容器组件（可嵌套子 Widget）
├── dialog/               # 弹窗容器
├── micro-app-container/  # 子应用加载容器 ◄── 关键组件
│   ├── FgMicroAppContainer.vue
│   ├── config.ts
│   └── schema.ts
└── ... (50+ 组件)
```

### 1.4 子应用加载机制（micro-app-container）

`micro-app-container` 是一个特殊 Widget，它在渲染时嵌套加载外部微应用：

```
Schema JSON 中:
{
  type: 'micro-app-container',
  props: {
    url: 'http://example.com/app',    // 子应用地址
    name: 'approval-flow',             // 子应用名称
    params: { orderId: '123' },        // 传递参数
  }
}

渲染时:
WidgetRenderer
  └── micro-app-container Widget
        └── <micro-app :url="props.url" :data="props.params" />
              └── 外部子应用（审批流、仪表盘等）
```

**关键点：**
- 子应用加载由 `@micro-zoe/micro-app` 库驱动，不依赖 qiankun
- 编辑器和渲染器都注册了这个 Widget，都能渲染子应用
- 宿主不需要关心子应用加载细节，Schema 配置中已声明 URL

---

## 二、编辑器 vs 渲染器对比

| 维度 | 编辑器（Editor） | 渲染器（Renderer） |
|------|-----------------|-------------------|
| **定位** | Schema 设计工具 | Schema 运行时渲染 |
| **用户** | 表单设计者 | 表单填写者 |
| **入口** | `main.ts` | `renderer-main.ts` |
| **路由** | `/editor`, `/preview`, `/view`, `/templates` | `/`（单页面） |
| **Store** | widget + editor + board + drag + api + app + request | app（上下文） |
| **组件** | 35 个编辑器组件 + 50 个 Widget | 50 个 Widget + WidgetRenderer |
| **交互** | 拖拽、选中、属性面板、撤销重做 | 填写、校验、提交 |
| **产物** | ~2.3 MB | ~800 KB |
| **qiankun 注册名** | `editor` | `schema-renderer` |
| **能渲染子应用** | ✅ micro-app-container | ✅ micro-app-container |
| **能设计 Schema** | ✅ | ❌ |

---

## 三、宿主接入方式

### 3.1 场景一：qiankun 注册渲染器

宿主注册渲染器为子应用，通过 props 传入配置：

```js
import { registerMicroApps } from 'qiankun'

registerMicroApps([{
  name: 'schema-renderer',
  entry: '//localhost:5100/renderer',
  container: '#form-container',
  activeRule: '/form',
  props: {
    publishId: 'xxx-yyy-zzz',           // 加载哪个已发布 Schema
    mode: 'edit',                        // edit / view / partial
    editableFields: ['name', 'phone'],   // partial 模式下可编辑字段
    user: { id: 'u1', name: '张三' },    // 用户上下文
    onSubmit: (data) => {                // 提交回调
      console.log('form data:', data)
    },
  },
}])
```

### 3.2 场景二：qiankun 注册编辑器

宿主注册完整编辑器用于 Schema 设计：

```js
registerMicroApps([{
  name: 'editor',
  entry: '//localhost:5100',
  container: '#editor-container',
  activeRule: '/editor',
  props: {
    getToken: () => localStorage.getItem('token'),
  },
}])
```

### 3.3 场景三：渲染器内嵌子应用

Schema 配置中包含 `micro-app-container`，渲染器自动加载：

```json
{
  "type": "micro-app-container",
  "props": {
    "url": "http://localhost:4000",
    "name": "approval-flow",
    "params": { "orderId": "123" }
  }
}
```

渲染器渲染到这个 Widget 时，自动通过 `@micro-zoe/micro-app` 加载子应用。宿主无需额外配置。

### 3.4 场景四：iframe 嵌入（postMessage）

```html
<iframe src="http://localhost:5100/renderer?id=xxx" />
```

```js
// 宿主通信（与 PublishView 协议兼容）
iframe.contentWindow.postMessage({ type: 'fg:set-data', data: { name: '张三' } }, '*')
iframe.contentWindow.postMessage({ type: 'fg:get-data', requestId: 'req-1' }, '*')

// 监听响应
window.addEventListener('message', (e) => {
  if (e.data.type === 'fg:data-response') {
    console.log('form data:', e.data.data)
  }
})
```

### 3.5 场景五：库模式（npm 包）

不作为微应用，而是作为 Vue 组件库使用：

```vue
<script setup>
import { WidgetRenderer, registerAllWidgets } from '@schema-form/editor-web/renderer'
registerAllWidgets()
</script>

<template>
  <WidgetRenderer
    :schema="schema"
    layout="absolute"
    :readonly="false"
    @submit="onSubmit"
  />
</template>
```

---

## 四、数据流

### 4.1 渲染器加载流程

```
宿主 props.publishId
  │
  ▼
fetchPublishedByPublishId(publishId)
  │
  ▼
API 返回 { json: Widget[], name, status }
  │
  ▼
registerAllWidgets() → 注册 50 个 Widget 组件到全局
  │
  ▼
<WidgetRenderer :schema="json" layout="absolute">
  │
  ├── 遍历 Widget 树
  │   ├── type: 'form'     → <FgForm>
  │   ├── type: 'input'    → <FgInput>
  │   ├── type: 'select'   → <FgSelect>
  │   ├── type: 'micro-app-container' → <FgMicroAppContainer>
  │   │     └── <micro-app :url="props.url" />  ← 加载外部子应用
  │   └── ...
  │
  ├── 初始化 formData（defaultValue）
  ├── 执行生命周期（onFormMount）
  ├── 加载数据源（API / 字典）
  └── 渲染完成
```

### 4.2 宿主 ↔ 渲染器通信

```
方式 1: qiankun props（初始化时）
  宿主 → props.publishId / mode / user / onSubmit
  渲染器 → props.onSubmit(data) 回调

方式 2: RendererApi（运行时控制）
  宿主 → api.setFormData() / api.validate() / api.submit()
  渲染器 → api.getFormData() 返回数据

方式 3: postMessage（iframe 场景）
  宿主 → postMessage({ type: 'fg:set-data', data })
  渲染器 → postMessage({ type: 'fg:data-response', data })
```

---

## 五、构建产物

### 5.1 两个独立入口

```
vite.config.ts          → editor 完整构建（main.ts）
vite.renderer.config.ts → renderer 独立构建（renderer-main.ts）
```

### 5.2 产物对比

| 构建目标 | 入口 | 包含 | 体积 |
|---------|------|------|------|
| editor | main.ts | 设计器 + 渲染器 + 全部 Widget | ~2.3 MB |
| renderer | renderer-main.ts | 渲染器 + 全部 Widget | ~800 KB |
| renderer-lib | renderer-lib.ts | WidgetRenderer 组件（库模式） | 按需 tree-shake |

---

## 六、实施步骤

1. **创建 `SchemaRendererView.vue`** — 渲染器主视图（加载 Schema + 渲染 + 通信）
2. **创建 `renderer-main.ts`** — qiankun 生命周期入口 + 独立运行检测
3. **创建 `router/renderer.ts`** — 渲染器专用路由（单页面）
4. **增强 `renderer-lib.ts`** — 导出 RendererApi 类型
5. **创建 `vite.renderer.config.ts`** — 独立构建配置
6. **验证** — qiankun 注册 / 独立运行 / postMessage / 子应用加载
