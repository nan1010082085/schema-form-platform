# AI 对话界面需求（2026-06-05）

## 两个场景的差异

| 场景 | 核心功能 | 按钮操作 |
|---|---|---|
| **主对话（ChatView）** | 创建新实例（未发布） | "创建" / "保存为草稿" |
| **抽屉（Sidebar）** | 修改当前实例 | "应用到画布" |

## 主对话（ChatView）需求

**流程**：
```
用户输入 → AI 生成 Schema/Flow → 点击"创建" → 保存到服务端（未发布状态）
```

**按钮**：
- 主按钮："创建" — 保存为草稿（status: draft）
- 次按钮："继续优化" — 追加对话

**不需要**：
- ❌ 渲染预览
- ❌ 应用到画布

**待实现**：
- @editor — 引用编辑器实例，获取当前 Schema 上下文
- @flow — 引用流程实例，获取当前 Flow 上下文
- 将实例数据带入 AI prompt

## 抽屉（Sidebar）需求

**流程**：
```
用户输入 → AI 生成 Schema/Flow → 点击"应用到画布" → Socket 推送到宿主编辑器
```

**按钮**：
- 主按钮："应用到画布" — Socket 推送 + 服务端发布
- 次按钮："继续优化" — 追加对话

**关联当前实例**：
- 读取当前 Schema/Flow 作为上下文
- 支持增量修改（diff）

## @editor/@flow 引用实例功能

**需求**：
1. 提供新的精简接口，只返回 id 和 name
2. 作为 user message 传递给 AI
3. API 调用可以在 ai-app 或对应项目中

**接口设计**：
- `GET /api/schemas/search?q=xxx` → 返回 `[{ id, name }]`
- `GET /api/flows/search?q=xxx` → 返回 `[{ id, name }]`

**数据流**：
```
用户输入 @editor:请假表
  ↓
搜索 API: GET /api/schemas/search?q=请假表
  ↓
返回列表: [{ id: "pf_abc", name: "请假申请表单" }]
  ↓
用户选择一项
  ↓
上下文: { type: "editor", id: "pf_abc", name: "请假申请表单" }
  ↓
作为 user message 的一部分传递给 AI
```

**实现位置**：
- 服务端：新增精简搜索接口
- 前端：ai-app 中调用 API，或 editor/flow 项目中调用

## 待实现功能

1. 主对话界面按钮文案修改
2. 服务端新增精简搜索接口
3. @editor/@flow 引用实例功能
4. 实例数据作为 user message 传递
