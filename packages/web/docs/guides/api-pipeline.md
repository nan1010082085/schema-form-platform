# API 数据管道指南

FormGrid 支持 3 层数据获取：字典码 → 缓存 → API 请求。

## 一、SchemaApiConfig

```typescript
interface SchemaApiConfig {
  url: string                              // API 地址（必需）
  method?: 'get' | 'post'                  // HTTP 方法（默认 get）
  params?: Record<string, unknown>          // 查询/body 参数，支持 ${fieldName} 模板
  dataPath?: string                        // dot-notation 数据路径（S16）
  labelKey?: string                        // 映射到 label 的键（默认 'label'）
  valueKey?: string                        // 映射到 value 的键（默认 'value'）
  childrenKey?: string                     // 树形子节点键（S17，保留嵌套）
  ttl?: number                             // 缓存 TTL 毫秒（默认 0=永不过期，S17）
  immediate?: boolean                      // 挂载时立即加载（默认 true）
  dictCode?: string                        // 字典码（优先于 url）
}
```

## 二、数据解析流程

```
API 响应
  → normalizeListResponse(res, { dataPath, totalPath })
    → 裸数组 → 使用
    → dataPath 配置 → getNestedValue 提取
    → 默认回退 → data > list > rows > items > records
      → childrenKey → 保留树形结构（不拍平）
      → 无 childrenKey → 拍平为 DictItem[]
```

## 三、基本用法

### 静态选项

```json
{ "type": "select", "field": "gender", "label": "性别",
  "options": [
    { "label": "男", "value": "male" },
    { "label": "女", "value": "female" }
  ]}
```

### 字典码

```json
{ "type": "select", "field": "status", "label": "状态",
  "api": { "url": "", "dictCode": "ORDER_STATUS" }}
```

### API 加载

```json
{ "type": "select", "field": "dept", "label": "部门",
  "api": {
    "url": "/api/dept/list",
    "method": "get",
    "labelKey": "deptName",
    "valueKey": "deptId"
  }}
```

## 四、嵌套数据路径 (dataPath)

```json
{ "api": {
  "url": "/api/records",
  "dataPath": "result.records"
}}
```
响应 `{ "result": { "records": [...] } }` → 正确提取

## 五、模板参数

```json
{ "api": {
  "url": "/api/children",
  "params": { "parentId": "${selectedParent}" }
}}
```
请求时 `${selectedParent}` → `formData.selectedParent` 的实际值

## 六、树形选项 (childrenKey)

```json
{ "type": "person-select", "field": "org", "label": "组织",
  "api": {
    "url": "/api/org/tree",
    "childrenKey": "children",
    "labelKey": "name",
    "valueKey": "id"
  }}
```
响应 `[{ id:1, name:"总部", children:[...] }]` → 保留嵌套，透传 person-select

## 七、缓存 TTL

```json
{ "api": {
  "url": "/api/dept/list",
  "ttl": 300000
}}
```
5 分钟（300000ms）后缓存过期，自动重新请求。默认 0 = 永不过期。

## 八、ListApiConfig（搜索列表专用）

```typescript
interface ListApiConfig {
  url: string
  method?: 'get' | 'post'           // 默认 post
  pageParam?: string                 // 默认 'pageNum'
  sizeParam?: string                 // 默认 'pageSize'
  dataPath?: string                  // 默认 'data'
  totalPath?: string                 // 默认 'total'
  extraParams?: Record<string, unknown>
  immediate?: boolean                // 默认 true
  resetOnSearch?: boolean            // 默认 true（搜索时回第一页）
}
```

## 九、LoadApiConfig（编辑回填）

```json
// FormGrid 组件 props：
{ "loadApi": {
  "url": "/api/form/123",
  "fieldMap": { "user_name": "name", "user_dept": "dept" }
}}
```
将 API 字段 `user_name` → formData `name`
