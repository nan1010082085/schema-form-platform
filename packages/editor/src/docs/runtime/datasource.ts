/**
 * 数据源系统文档
 *
 * 三大配置之三：数据源
 * 定位：外部数据获取与缓存引擎
 *
 * 流转：配置 → 请求 → 解析 → 缓存 → 应用
 */
import type { RuntimeSystemDoc } from './types'

export const dataSourceSystem: RuntimeSystemDoc = {
  id: 'datasource',
  name: '数据源系统',
  role: 'config',
  description:
    '数据源系统负责从外部 API 获取数据，支持缓存、重试、字段映射等能力。' +
    '主要用于 select / radio / checkbox 等需要动态选项的组件，以及 search-list 的数据加载。',

  concepts: [
    'API 配置 (SchemaApiConfig) — 声明式的请求配置',
    '字典优先 (dictCode) — 优先从全局 dictMap 查找，减少网络请求',
    '缓存策略 — memory / indexeddb / both，支持 TTL 过期',
    '数据解析 — dataPath 支持点号路径，自动探测数据数组',
    '请求队列 — 并发控制 + 去重，避免重复请求',
    '失败重试 — 可选的重试机制（最多 5 次）',
  ],

  configItems: [
    { name: 'url', type: 'string', description: 'API 地址' },
    { name: 'method', type: '"get" | "post"', description: '请求方法，默认 get' },
    { name: 'params', type: 'Record<string, unknown>', description: '请求参数' },
    { name: 'dataPath', type: 'string', description: '响应数据路径（点号分隔），如 "result.list"' },
    { name: 'labelKey', type: 'string', description: '选项标签字段，默认 "label"' },
    { name: 'valueKey', type: 'string', description: '选项值字段，默认 "value"' },
    { name: 'childrenKey', type: 'string', description: '树形数据子节点字段' },
    { name: 'ttl', type: 'number', description: '缓存有效期（毫秒），0 = 永不过期' },
    { name: 'immediate', type: 'boolean', description: '是否挂载时加载，默认 true' },
    { name: 'dictCode', type: 'string', description: '字典编码，优先从 dictMap 查找' },
    { name: 'cacheLevel', type: '"memory" | "indexeddb" | "both"', description: '缓存策略，默认 memory' },
    { name: 'enableRetry', type: 'boolean', description: '开启重试，默认 false，开启后最多 3 次' },
  ],

  relations: [
    { target: 'linkage', relation: 'reads', description: 'options 联动的 thenApi 触发数据源加载' },
    { target: 'variables', relation: 'reads', description: 'API 参数中可引用变量' },
    { target: 'events', relation: 'reads', description: 'api 动作可触发数据源请求' },
  ],

  scenarios: [],
}

// ============================================================
// 数据源配置详解
// ============================================================

export const dataSourceConfig = {
  title: '数据源配置详解',

  staticOptions: `
// 静态选项 — 不需要 API
{
  type: 'select',
  options: [
    { label: '启用', value: 'enabled' },
    { label: '禁用', value: 'disabled' },
  ],
}`,

  dynamicOptions: `
// 动态选项 — API 加载
{
  type: 'select',
  api: {
    url: '/api/departments',
    method: 'get',
    labelKey: 'name',      // 响应中的标签字段
    valueKey: 'id',        // 响应中的值字段
    dataPath: 'data.list', // 响应数据路径
    ttl: 300000,           // 缓存 5 分钟
    cacheLevel: 'memory',
  },
}`,

  dictOptions: `
// 字典选项 — 从全局 dictMap 查找
{
  type: 'select',
  api: {
    dictCode: 'STATUS',    // 优先从 global.dictMap.STATUS 查找
    url: '/api/dict/data/by-type/STATUS', // 找不到时回退到 API
  },
}`,

  treeOptions: `
// 树形选项 — 保留层级结构
{
  type: 'select',
  api: {
    url: '/api/regions',
    childrenKey: 'children',  // 保留树形结构
    labelKey: 'name',
    valueKey: 'code',
  },
}`,
}

// ============================================================
// 数据源流转
// ============================================================

export const dataSourceFlow = {
  title: '数据源流转',

  flow: `
组件挂载 (onMounted)
  │
  ├── immediate !== false ?
  │     │
  │     ├── true ──→ 检查 dictCode
  │     │              │
  │     │              ├── 有 dictCode ──→ 查找 dictMap
  │     │              │                    │
  │     │              │                    ├── 找到 ──→ 直接使用
  │     │              │                    │
  │     │              │                    └── 未找到 ──→ 发起 API 请求
  │     │              │
  │     │              └── 无 dictCode ──→ 检查缓存
  │     │                                   │
  │     │                                   ├── 命中 ──→ 使用缓存
  │     │                                   │
  │     │                                   └── 未命中 ──→ 发起 API 请求
  │     │
  │     └── false ──→ 不加载，等待手动触发
  │
  ▼
API 请求 (requestQueue)
  │
  ├── 并发控制: 同一 URL 去重
  ├── 失败重试: enableRetry ? 最多 3 次 : 不重试
  │
  ▼
响应解析 (responseNormalizer)
  │
  ├── dataPath 定位: 'result.list' → response.result.list
  ├── 自动探测: data > list > rows > items > records
  ├── labelKey/valueKey 映射 → DictItem[]
  │
  ▼
缓存写入
  │
  ├── memory: Map<string, { data, expireAt }>
  ├── indexeddb: IDBObjectStore
  └── both: 同时写入
  │
  ▼
组件应用
  │
  └── options.value = DictItem[] → 渲染下拉选项`,
}

// ============================================================
// 数据源与联动的关系
// ============================================================

export const dataSourceLinkage = {
  title: '数据源与联动的关系',

  description: 'options 联动可以触发数据源加载，实现级联选择',

  example: `
// 省市级联示例
{
  type: 'select',
  field: 'city',
  linkages: [
    {
      type: 'options',
      watchFields: ['province'],
      condition: 'values.province === "guangdong"',
      thenOptions: [                    // 静态选项
        { label: '广州', value: 'gz' },
        { label: '深圳', value: 'sz' },
      ],
    },
    {
      type: 'options',
      watchFields: ['province'],
      condition: 'values.province === "zhejiang"',
      thenApi: {                        // 动态 API
        url: '/api/cities',
        params: { province: 'zhejiang' },
        labelKey: 'name',
        valueKey: 'code',
      },
    },
  ],
}

// 流转:
// 1. 用户选择 province = "guangdong"
// 2. useLinkage 检测到 watchFields 变化
// 3. 条件求值: values.province === "guangdong" → true
// 4. state.options = thenOptions (静态)
// 5. 或 state.optionsApi = thenApi → 触发 API 加载`,
}

export default {
  dataSourceSystem,
  dataSourceConfig,
  dataSourceFlow,
  dataSourceLinkage,
}
