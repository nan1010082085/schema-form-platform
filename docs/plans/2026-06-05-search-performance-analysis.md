# SchemaSearchService 慢搜索性能分析

**日期**: 2026-06-05
**分析范围**: packages/server/src/services/schemaSearch.ts, schemaScorer.ts

## 数据概览

| 指标 | 值 |
|---|---|
| Schema 总数 | 1,452 条 |
| `json.id` 索引覆盖 | 1,450 条 (99.9%) |
| 搜索路径 | 全部走 `SEARCH_ALL` (global) |
| 缓存命中率 | 0% — 全部 MISS |
| 平均搜索耗时 | ~174ms |
| 平均返回结果 | ~7 条 |

## 核心问题

### 问题 1：`SEARCH_ALL` 的 `_candidates` 优化名存实亡

`_candidates()` 在全局搜索时返回空 Set，声称"跳过全表 id 扫描"。但 `_mergeScores()` 中 `candidateIds.size === 0` 时过滤逻辑不执行，所有 1,450 条通过 header 匹配的记录全部进入评分管线。

### 问题 2：`json` 字段始终全量加载

所有搜索模式都用 `FormSchema.find(query)` 无字段投影，每条记录的 `json.content`（完整 schema 树）都被加载到内存。估算 1,452 条 x 30KB = ~43MB。

### 问题 3：缺少关键数据库索引

缺失：`status`、`type`、`status + type` 复合索引。MongoDB 在这些字段上走 COLLSCAN。

### 问题 4：缓存策略过于保守

只有 `KEYWORD_SEARCH` 模式才缓存，当前所有搜索都是空 keyword，缓存命中率 0%。

### 问题 5：TEXT_CONTAINS 用 `$regex` 而非 `$text`

`name` 有文本索引但 `$regex` 不走文本索引，`json.title`/`json.description` 同理。

### 问题 6：正则转义冗余

`escapeRegex` 在 route 和 service 层各定义一份，双重转义（幂等但冗余）。

## 优化建议

| 优先级 | 优化项 | 预期收益 |
|---|---|---|
| P0 | 给 `status`、`type`、`status+type` 加索引 | TYPE_STATUS_SEARCH 和 _applyPostFilters 从 COLLSCAN → IXSCAN |
| P1 | _searchDatabase 投影排除 `json.content` | 内存占用从 ~43MB 降到 ~5MB |
| P2 | 扩大缓存范围到 TYPE_STATUS_SEARCH 和 FOLDER_ONLY | 重复搜索从 174ms 降到 <5ms |
| P3 | TEXT_CONTAINS 改用 `$text` 全文索引 | 从正则扫描改为索引查找 |
| P4 | SEARCH_ALL 有 type/status 时也做数据库预过滤 | 减少进入 scorer 的数据量 |
