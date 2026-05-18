# FormGrid 快速开始

5 分钟从零到第一个表单。

## 1. 安装

```bash
# FormGrid 作为 qiankun 子应用，默认随宿主注册
# 独立开发：
pnpm dev
# → http://localhost:5173
```

## 2. 最小 Schema

```json
[
  { "type": "input", "field": "name", "label": "姓名" },
  { "type": "select", "field": "gender", "label": "性别",
    "options": [
      { "label": "男", "value": "male" },
      { "label": "女", "value": "female" }
    ]
  }
]
```

在 DemoView 粘贴 → 实时渲染。

## 3. 加点布局

```json
[
  { "type": "page", "children": [
    { "type": "toolbar", "children": [
      { "type": "title", "label": "个人信息" }
    ]},
    { "type": "card", "children": [
      { "type": "grid-row", "children": [
        { "type": "grid-col", "span": 12, "label": "姓名", "children": [
          { "type": "input", "field": "name" }
        ]},
        { "type": "grid-col", "span": 12, "label": "年龄", "children": [
          { "type": "number", "field": "age" }
        ]}
      ]}
    ]}
  ]}
]
```

## 4. 核心概念

| 概念 | 说明 |
|------|------|
| **Schema** | JSON 数组，每个元素是一个组件描述 |
| **FormSchemaItem** | 单个组件：type（类型）、field（绑定字段）、label（标签） |
| **栅格** | 24 列 flex 布局：`grid-row` 行 → `grid-col` 列（span=1-24） |
| **容器** | page → toolbar → card 层级嵌套；所有容器通过 `children` 嵌套 |
| **联动** | 字段 A 变化 → 控制字段 B 的可见/禁用/必填/选项/设值 |

## 5. 下一步

- [Schema 编写指南](./schema-writing.md) — 完整组件参考
- [联动配置指南](./linkage-guide.md) — 6 种联动类型
- [API 数据管道](./api-pipeline.md) — 动态选项/列表/TTL
- [迁移指南](./migration-guide.md) — MSA-Form → FormGrid
