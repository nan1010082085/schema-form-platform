# ECharts 图表组件设计

日期：2026-05-29

## 目标

在编辑器中引入 ECharts 图表组件，支持 9 种常用图表类型，每种类型作为独立 Widget 注册，复用已有的四大配置系统（API、变量、事件、规则）。

## 核心决策

| 决策 | 结论 |
|---|---|
| 拆分方式 | 每种图表独立 Widget（9 个），不耦合 |
| 数据来源 | API 数据源 + 静态 JSON 双模式，API 优先 |
| 字段映射 | xField/yField（XY 轴类）、nameField/valueField（分类类） |
| 高级定制 | `props.rawOption` JSON 字段，与模板配置合并覆盖 |
| 四大系统 | 全量复用：API 面板、变量暴露、事件收发、规则引擎 |

## 图表类型（9 个）

按数据结构分 4 组：

### XY 轴类（xField + yField）

| Widget | type | 说明 |
|---|---|---|
| FgBarChart | `bar-chart` | 柱状图 |
| FgLineChart | `line-chart` | 折线图 |
| FgScatterChart | `scatter-chart` | 散点图 |
| FgHeatmap | `heatmap` | 热力图 |
| FgCandlestick | `candlestick` | K 线图（open/close/low/high） |

### 分类占比类（nameField + valueField）

| Widget | type | 说明 |
|---|---|---|
| FgPieChart | `pie-chart` | 饼图 |
| FgFunnel | `funnel` | 漏斗图 |

### 多维类

| Widget | type | 说明 |
|---|---|---|
| FgRadar | `radar` | 雷达图（categoryField + indicators） |

### 单值类

| Widget | type | 说明 |
|---|---|---|
| FgGauge | `gauge` | 仪表盘 |

## 目录结构

```
widgets/
  bar-chart/
    config.ts
    schema.ts
    FgBarChart.vue
    index.ts
  line-chart/
    config.ts
    schema.ts
    FgLineChart.vue
    index.ts
  ... (每个图表类型同构)
```

## 共享基础设施

### useChartOption composable

`widgets/base/useChartOption.ts` — 所有图表组件共享的 composable：

- 接收 `widgetData`（注入的 Widget 定义）
- 从 `props` 读取静态数据 / API 配置 / 字段映射 / 外观配置
- 调用 `useApiRequest().fetchApi()` 获取 API 数据
- 根据图表类型 + 字段映射生成 ECharts option
- 合并 `props.rawOption`（高级覆盖）
- 返回响应式 `chartOption`

核心职责：**数据 → ECharts option 的转换逻辑**，避免 9 个组件重复实现。

### useChartExpose composable

`widgets/base/useChartExpose.ts` — 图表暴露值的统一封装：

- `loading: boolean` — API 加载状态
- `chartData: unknown[]` — 当前图表数据

## Props 结构

### 通用 Props（所有图表共享）

```typescript
interface BaseChartProps {
  // 数据源
  staticData?: unknown[]           // 静态 JSON 数据
  apiUrl?: string                  // API 地址
  apiMethod?: string               // GET/POST
  apiHeaders?: Record<string, string>
  responseDataPath?: string        // 响应数据路径

  // 外观
  title?: string                   // 图表标题
  showLegend?: boolean             // 显示图例
  showLabel?: boolean              // 显示数据标签
  colorScheme?: string             // 颜色主题

  // 高级
  rawOption?: Record<string, unknown>  // ECharts 原始 option 合并
}
```

### XY 轴类扩展

```typescript
interface XYChartProps extends BaseChartProps {
  xField: string                   // X 轴字段名
  yField: string                   // Y 轴字段名
  smooth?: boolean                 // 折线图平滑
  stack?: boolean                  // 堆叠
  horizontal?: boolean             // 水平方向
}
```

### K 线图扩展

```typescript
interface CandlestickProps extends BaseChartProps {
  dateField: string                // 日期字段
  openField: string                // 开盘字段
  closeField: string               // 收盘字段
  lowField: string                 // 最低字段
  highField: string                // 最高字段
}
```

### 分类占比类扩展

```typescript
interface CategoryChartProps extends BaseChartProps {
  nameField: string                // 名称字段
  valueField: string               // 值字段
  roseType?: boolean               // 饼图南丁格尔玫瑰
  innerRadius?: number             // 饼图内环半径（环形图）
}
```

### 雷达图扩展

```typescript
interface RadarProps extends BaseChartProps {
  categoryField: string            // 分类字段
  valueFields: string[]            // 多个维度字段
  indicators: Array<{ name: string; max: number }>  // 雷达轴定义
}
```

### 仪表盘扩展

```typescript
interface GaugeProps extends BaseChartProps {
  valueField: string               // 值字段
  min?: number
  max?: number
  unit?: string
}
```

## 属性面板配置

每种图表在 `propertyPanel.props` 中只声明该类型需要的配置项。通过 `visibleOn` 控制显隐。

示例（柱状图 config.ts）：

```typescript
propertyPanel: {
  basic: ['label'],
  props: [
    // 数据
    { key: 'xField', label: 'X 轴字段', type: 'input', placeholder: '如: month' },
    { key: 'yField', label: 'Y 轴字段', type: 'input', placeholder: '如: sales' },
    // 外观
    { key: 'title', label: '图表标题', type: 'input' },
    { key: 'showLegend', label: '显示图例', type: 'switch', default: true },
    { key: 'showLabel', label: '显示标签', type: 'switch', default: false },
    { key: 'colorScheme', label: '颜色主题', type: 'select', options: [
      { label: '默认', value: 'default' },
      { label: '暗色', value: 'dark' },
      { label: '浅色', value: 'light' },
    ]},
    { key: 'stack', label: '堆叠', type: 'switch', default: false },
    { key: 'horizontal', label: '水平方向', type: 'switch', default: false },
    // 高级
    { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
  ],
}
```

## 四大系统接入

### API 系统

- `configPanels: ['api']`
- 组件内用 `useApiRequest().fetchApi()` 发请求
- API 返回数据经 `responseDataPath` 提取后，按 xField/yField 生成 option

### 变量系统

- `configPanels: ['variables']`
- `exposedValues`:
  - `{ key: 'loading', type: 'boolean', description: '加载状态' }`
  - `{ key: 'chartData', type: 'array', description: '图表数据' }`

### 事件系统

- `configPanels: ['events']`
- `receivableEvents`:
  - `{ name: 'refresh', description: '重新加载数据' }`
  - `{ name: 'set-data', description: '设置图表数据', params: { data: '数据数组' } }`
- 图表 `click` 事件作为事件源（点击图表项触发动作）

### 规则系统

- `configPanels: ['rules']`
- `visibleOn` / `disabledOn` 表达式控制显隐/禁用

## 数据流

```
用户配置
  ├── 静态数据 (staticData)  ──┐
  └── API 数据 (apiUrl)  ─────┤
                               ▼
                    useChartOption composable
                    ├── 1. 确定数据源（API 优先，fallback 静态）
                    ├── 2. 按 xField/yField 提取字段
                    ├── 3. 根据图表类型生成 ECharts option
                    └── 4. 合并 rawOption（如有）
                               ▼
                    echarts.setOption(option)
```

## 注册方式

新增 `'chart'` 分组，9 个图表组件统一注册到该分组。

```typescript
// widgets/index.ts
registerWidget({ name: barChartConfig.name, displayName: barChartConfig.displayName, type: 'bar-chart', group: 'chart', component: FgBarChart, create: createBarChartWidget, config: barChartConfig })
// ... 其余 8 个同理
```

需要在 `registry.ts` 的 `WidgetRegistryItem.group` 类型中新增 `'chart'`。

## FULL_WIDTH_TYPES

所有图表类型加入 `FULL_WIDTH_TYPES`，在 grid-col 中强制占满整行。

## ECharts 按需引入

为控制包体积，使用 `echarts/core` 按需引入：

```typescript
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart, ... } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, ... } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, ...])
```

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `widgets/base/types.ts` | 修改 | `BasicType` 新增 9 个图表类型；`FULL_WIDTH_TYPES` 新增 9 个；`group` 类型新增 `'chart'` |
| `widgets/base/useChartOption.ts` | 新增 | 图表数据 → ECharts option 转换 composable |
| `widgets/base/useChartExpose.ts` | 新增 | 图表暴露值统一封装 |
| `widgets/bar-chart/config.ts` | 新增 | 柱状图配置 |
| `widgets/bar-chart/schema.ts` | 新增 | 柱状图工厂函数 |
| `widgets/bar-chart/FgBarChart.vue` | 新增 | 柱状图组件 |
| `widgets/bar-chart/index.ts` | 新增 | 桶导出 |
| `widgets/line-chart/` | 新增 | 同构 |
| `widgets/pie-chart/` | 新增 | 同构 |
| `widgets/scatter-chart/` | 新增 | 同构 |
| `widgets/radar/` | 新增 | 同构 |
| `widgets/gauge/` | 新增 | 同构 |
| `widgets/heatmap/` | 新增 | 同构 |
| `widgets/funnel/` | 新增 | 同构 |
| `widgets/candlestick/` | 新增 | 同构 |
| `widgets/registry.ts` | 修改 | `group` 类型新增 `'chart'` |
| `widgets/index.ts` | 修改 | 注册 9 个图表 Widget |
| `package.json` | 修改 | 新增 `echarts` 依赖 |

## 依赖

- `echarts` ^5.6 — 核心库，按需引入
