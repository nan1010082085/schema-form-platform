# 数据源系统

Select、Radio、Checkbox 等选项类组件通过 `SchemaApiConfig` 配置动态数据源，支持两种模式：API 请求和字典编码查找。

## SchemaApiConfig 配置

```typescript
interface SchemaApiConfig {
  url: string              // API 地址（dictCode 模式可为空）
  method?: 'get' | 'post'  // 默认 'get'
  params?: Record<string, unknown>  // 请求参数，支持 ${field} 模板插值
  dataPath?: string         // 响应中数据数组的路径（点号分隔或 JSONPath）
  labelKey?: string         // 映射为选项文本的字段名，默认 'label'
  valueKey?: string         // 映射为选项值的字段名，默认 'value'
  childrenKey?: string      // 树形数据子节点字段，设置后保留嵌套结构
  ttl?: number              // 缓存时间（毫秒），0 = 永不过期
  immediate?: boolean       // 是否挂载时立即加载，默认 true
  dictCode?: string         // 字典编码，从全局 dictMap 查找（优先于 url）
}
```

### 字段说明

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `url` | - | API 地址，支持相对路径和绝对 URL |
| `method` | `'get'` | GET 请求参数拼到 query string，POST 请求参数放 body |
| `params` | - | 请求参数对象，值中 `${fieldName}` 会替换为当前表单字段值 |
| `dataPath` | - | 指定响应中数据数组的位置；留空则自动探测 `data` > `list` > `rows` > `items` > `records` |
| `labelKey` | `'label'` | 响应对象中作为选项文本的字段名 |
| `valueKey` | `'value'` | 响应对象中作为选项值的字段名 |
| `childrenKey` | - | 设置后保留树形嵌套结构，不拍平 |
| `ttl` | `0` | 缓存有效期，毫秒。`0` 表示同一会话内永不过期 |
| `immediate` | `true` | `false` 时需手动调用 `reload()` |
| `dictCode` | - | 字典编码，优先级高于 url |

## JSONPath 语法参考

`dataPath` 支持两种语法：

- **点号分隔**：`result.records` — 逐层取属性
- **JSONPath**（以 `$` 开头）：`$.data.list[*].name` — 使用 `jsonpath-plus` 库解析

### 常用 JSONPath 表达式

| 表达式 | 含义 |
|--------|------|
| `$.data` | 取顶层 `data` 属性 |
| `$.data.list` | 取 `data.list` |
| `$.data.list[*]` | 取 `data.list` 数组全部元素 |
| `$.result.items[0]` | 取数组第一项 |
| `$.result.items[0].children` | 取第一项的 `children` 字段 |

### 点号分隔示例

| dataPath | 响应结构 | 结果 |
|----------|----------|------|
| `data` | `{ data: [...] }` | 取出数组 |
| `result.records` | `{ result: { records: [...] } }` | 逐层取 |
| `content.list` | `{ content: { list: [...] } }` | 逐层取 |

## 响应格式要求

系统期望 API 返回**包含数据数组**的响应。支持以下常见包装格式：

### 自动探测（无需配置 dataPath）

响应对象中依次查找 `data` → `list` → `rows` → `items` → `records` 键，找到数组即使用。

```json
// 格式 1：标准 { data: [] } 包装
{
  "code": 200,
  "data": [
    { "label": "选项A", "value": 1 },
    { "label": "选项B", "value": 2 }
  ]
}

// 格式 2：直接返回数组
[
  { "label": "选项A", "value": 1 },
  { "label": "选项B", "value": 2 }
]

// 格式 3：深层嵌套
{
  "result": {
    "records": [
      { "name": "选项A", "id": 1 },
      { "name": "选项B", "id": 2 }
    ],
    "total": 2
  }
}
```

### 手动配置 dataPath

当响应结构不匹配常见键名时，设置 `dataPath` 指定路径：

```json
// 响应
{
  "status": "ok",
  "payload": {
    "items": [
      { "text": "是", "code": "Y" },
      { "text": "否", "code": "N" }
    ]
  }
}

// 配置
{
  "url": "/api/yes-no",
  "dataPath": "payload.items",
  "labelKey": "text",
  "valueKey": "code"
}
```

### 字段映射

系统按 `labelKey` 和 `valueKey` 将响应对象映射为 `{ label, value }` 选项：

```json
// 原始数据
{ "dept_name": "研发部", "dept_id": "D001" }

// 配置
{ "labelKey": "dept_name", "valueKey": "dept_id" }

// 输出
{ "label": "研发部", "value": "D001" }
```

### 树形数据

设置 `childrenKey` 保留嵌套结构（适用于 TreeSelect 等组件）：

```json
// 配置
{
  "url": "/api/dept-tree",
  "labelKey": "name",
  "valueKey": "id",
  "childrenKey": "children"
}

// 响应
[
  {
    "name": "总部",
    "id": "1",
    "children": [
      { "name": "研发部", "id": "1-1" },
      { "name": "产品部", "id": "1-2" }
    ]
  }
]

// 输出（保留嵌套）
[
  { "label": "总部", "value": "1", "children": [
    { "label": "研发部", "value": "1-1" },
    { "label": "产品部", "value": "1-2" }
  ]}
]
```

## 缓存策略

### 机制

- 缓存键 = `url + JSON(params)`，同一 URL + 参数组合共享缓存
- 缓存存储在内存中（`Map` 结构），页面刷新后清空
- `ttl = 0` 表示会话内永不过期（同一次页面会话中同一配置只请求一次）
- `ttl > 0` 时按毫秒计算过期，过期后下次访问自动重新请求

### 配置示例

```json
// 缓存 5 分钟
{ "url": "/api/provinces", "ttl": 300000 }

// 不缓存（每次加载都请求）
{ "url": "/api/user-roles", "ttl": 0 }
```

### 模板参数与缓存

`params` 中的 `${fieldName}` 模板在缓存键生成前完成替换，因此不同表单值会产生不同缓存条目：

```
// params: { "deptId": "${dept}" }
// 表单 dept = "D001" → 缓存键: "/api/users:{"deptId":"D001"}"
// 表单 dept = "D002" → 缓存键: "/api/users:{"deptId":"D002"}"
```

## dictCode 字典编码模式

当 `dictCode` 非空时，系统优先从全局 `dictMap` 中查找选项，不发起 HTTP 请求。

### 工作原理

1. 系统检查 `context.global.dictMap[dictCode]`
2. 找到则直接使用，跳过网络请求
3. 未找到则回退到 URL 模式（如果 `url` 也配置了）

### 使用场景

适用于选项固定、不需要实时请求后端的场景，如性别、状态枚举等。

```json
// 配置
{
  "dictCode": "gender_list"
}

// 全局 dictMap 中需预先注入
{
  "gender_list": [
    { "label": "男", "value": "M" },
    { "label": "女", "value": "F" }
  ]
}
```

## 完整配置示例

### 基础用法：GET 请求 + 自动探测

```json
{
  "url": "/api/options/gender",
  "labelKey": "name",
  "valueKey": "id"
}
```

### 带参数的 POST 请求

```json
{
  "url": "/api/users/search",
  "method": "post",
  "params": { "keyword": "${keyword}", "status": "active" },
  "dataPath": "result.list",
  "labelKey": "displayName",
  "valueKey": "userId"
}
```

### 树形数据 + 缓存

```json
{
  "url": "/api/dept-tree",
  "labelKey": "deptName",
  "valueKey": "deptId",
  "childrenKey": "children",
  "ttl": 600000
}
```

### JSONPath 取值

```json
{
  "url": "/api/v2/config/options",
  "dataPath": "$.result.data.items[*]",
  "labelKey": "text",
  "valueKey": "val"
}
```

### 字典编码 + 延迟加载

```json
{
  "dictCode": "status_list",
  "immediate": false
}
```

## 相关文件

| 文件 | 职责 |
|------|------|
| `src/components/FormGrid/types.ts` | `SchemaApiConfig` 类型定义 |
| `src/utils/responseNormalizer.ts` | 响应归一化：`extractByPath`、`normalizeListResponse` |
| `src/composables/useDynamicOptions.ts` | 选项加载 composable，处理请求、缓存、字典查找 |
| `src/utils/optionsCache.ts` | 内存缓存：TTL 过期、键构建 |
| `src/components/Editor/ApiConfig.vue` | 编辑器中 API 配置 UI + 测试连接 |
