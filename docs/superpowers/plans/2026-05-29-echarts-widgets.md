# ECharts 图表组件实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在编辑器中引入 9 种 ECharts 图表组件，每种独立 Widget，复用四大配置系统。

**Architecture:** 每种图表是独立 Widget（config/schema/组件），共享 `useChartOption` composable 处理数据→ECharts option 转换。ECharts 按需引入控制包体积。

**Tech Stack:** Vue 3 Composition API, TypeScript, ECharts 5 (tree-shaking), Element Plus

**Spec:** `docs/superpowers/specs/2026-05-29-echarts-widgets-design.md`

---

## 文件变更总览

| 文件 | 操作 | 说明 |
|---|---|---|
| `packages/editor/web/package.json` | 修改 | 新增 echarts 依赖 |
| `packages/editor/web/src/widgets/base/types.ts` | 修改 | 新增 9 个 BasicType + chart 分组 + FULL_WIDTH_TYPES |
| `packages/editor/web/src/widgets/base/useChartOption.ts` | 新增 | 数据→ECharts option 转换 composable |
| `packages/editor/web/src/widgets/base/useChartExpose.ts` | 新增 | 图表暴露值封装 |
| `packages/editor/web/src/widgets/base/echarts.ts` | 新增 | ECharts 按需引入 + 实例管理 |
| `packages/editor/web/src/widgets/bar-chart/` | 新增 | config.ts, schema.ts, FgBarChart.vue, index.ts |
| `packages/editor/web/src/widgets/line-chart/` | 新增 | 同构 |
| `packages/editor/web/src/widgets/pie-chart/` | 新增 | 同构 |
| `packages/editor/web/src/widgets/scatter-chart/` | 新增 | 同构 |
| `packages/editor/web/src/widgets/radar/` | 新增 | 同构 |
| `packages/editor/web/src/widgets/gauge/` | 新增 | 同构 |
| `packages/editor/web/src/widgets/heatmap/` | 新增 | 同构 |
| `packages/editor/web/src/widgets/funnel/` | 新增 | 同构 |
| `packages/editor/web/src/widgets/candlestick/` | 新增 | 同构 |
| `packages/editor/web/src/widgets/registry.ts` | 修改 | group 类型新增 'chart' |
| `packages/editor/web/src/widgets/index.ts` | 修改 | 注册 9 个图表 Widget |

---

### Task 1: 安装 echarts 依赖

**Files:**
- Modify: `packages/editor/web/package.json`

- [ ] **Step 1: 安装 echarts**

```bash
cd /Users/yangdongnan/work/schema-form-platform
pnpm --filter @schema-form/web add echarts
```

- [ ] **Step 2: 验证安装**

```bash
ls packages/editor/web/node_modules/echarts/package.json
```

- [ ] **Step 3: Commit**

```bash
git add packages/editor/web/package.json packages/editor/web/pnpm-lock.yaml
git commit -m "deps: add echarts for chart widgets"
```

---

### Task 2: 更新类型系统

**Files:**
- Modify: `packages/editor/web/src/widgets/base/types.ts`

- [ ] **Step 1: 在 BasicType 联合类型中新增 9 个图表类型**

在 `types.ts` 的 `BasicType` 定义中，追加：

```typescript
| 'bar-chart' | 'line-chart' | 'pie-chart' | 'scatter-chart'
| 'radar' | 'gauge' | 'heatmap' | 'funnel' | 'candlestick'
```

- [ ] **Step 2: 在 WidgetRegistryItem 的 group 类型中新增 'chart'**

在 `registry.ts` 的 `WidgetRegistryItem` 接口中，`group` 字段的联合类型新增 `'chart'`：

```typescript
group: 'layout' | 'form' | 'container' | 'table' | 'action' | 'static' | 'business' | 'chart'
```

- [ ] **Step 3: 在 FULL_WIDTH_TYPES 中新增 9 个图表类型**

在 `types.ts` 的 `FULL_WIDTH_TYPES` 数组末尾追加：

```typescript
'bar-chart', 'line-chart', 'pie-chart', 'scatter-chart',
'radar', 'gauge', 'heatmap', 'funnel', 'candlestick',
```

- [ ] **Step 4: 类型检查**

```bash
cd /Users/yangdongnan/work/schema-form-platform && pnpm build:web 2>&1 | tail -5
```

Expected: 编译通过（新增类型暂无引用，不影响现有代码）

- [ ] **Step 5: Commit**

```bash
git add packages/editor/web/src/widgets/base/types.ts packages/editor/web/src/widgets/registry.ts
git commit -m "feat(widgets): add chart types to SchemaType union and FULL_WIDTH_TYPES"
```

---

### Task 3: ECharts 按需引入模块

**Files:**
- Create: `packages/editor/web/src/widgets/base/echarts.ts`

- [ ] **Step 1: 创建 ECharts 按需引入模块**

```typescript
// packages/editor/web/src/widgets/base/echarts.ts
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { LineChart } from 'echarts/charts'
import { PieChart } from 'echarts/charts'
import { ScatterChart } from 'echarts/charts'
import { RadarChart } from 'echarts/charts'
import { GaugeChart } from 'echarts/charts'
import { HeatmapChart } from 'echarts/charts'
import { FunnelChart } from 'echarts/charts'
import { CandlestickChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DatasetComponent,
  TransformComponent,
  VisualMapComponent,
  ToolboxComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart, LineChart, PieChart, ScatterChart, RadarChart,
  GaugeChart, HeatmapChart, FunnelChart, CandlestickChart,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent,
  DatasetComponent, TransformComponent, VisualMapComponent, ToolboxComponent,
  CanvasRenderer,
])

export { echarts }
export type { EChartsType } from 'echarts/core'
```

- [ ] **Step 2: 验证导入**

在任意 `.vue` 文件中临时 `import { echarts } from '../base/echarts'` 确认无报错，然后移除临时导入。

- [ ] **Step 3: Commit**

```bash
git add packages/editor/web/src/widgets/base/echarts.ts
git commit -m "feat(widgets): create echarts tree-shaking module"
```

---

### Task 4: useChartOption composable

**Files:**
- Create: `packages/editor/web/src/widgets/base/useChartOption.ts`

- [ ] **Step 1: 创建 useChartOption composable**

```typescript
// packages/editor/web/src/widgets/base/useChartOption.ts
import { computed, ref, watch, type Ref } from 'vue'
import type { Widget } from './types'
import { useApiRequest } from '../../composables/useApiRequest'

export interface UseChartOptionOptions {
  widgetData: Ref<Widget>
  buildOption: (data: Record<string, unknown>[], props: Record<string, unknown>) => Record<string, unknown>
}

export function useChartOption({ widgetData, buildOption }: UseChartOptionOptions) {
  const { fetchApi } = useApiRequest()
  const loading = ref(false)
  const chartData = ref<Record<string, unknown>[]>([])

  const props = computed(() => widgetData.value.props ?? {})
  const staticData = computed(() => (props.value.staticData as Record<string, unknown>[]) ?? [])
  const apiUrl = computed(() => props.value.apiUrl as string)
  const apiMethod = computed(() => (props.value.apiMethod as string) ?? 'get')
  const apiHeaders = computed(() => (props.value.apiHeaders as Record<string, string>) ?? {})
  const responseDataPath = computed(() => props.value.responseDataPath as string)
  const rawOption = computed(() => (props.value.rawOption as Record<string, unknown>) ?? null)

  function resolveDataPath(data: unknown, path: string): unknown {
    if (!path) return data
    return path.split('.').reduce<unknown>((obj, key) => {
      if (obj && typeof obj === 'object' && key in (obj as Record<string, unknown>)) {
        return (obj as Record<string, unknown>)[key]
      }
      return undefined
    }, data)
  }

  async function loadData() {
    if (!apiUrl.value) return
    loading.value = true
    try {
      const result = await fetchApi(apiUrl.value, apiMethod.value, apiHeaders.value)
      const extracted = resolveDataPath(result, responseDataPath.value)
      chartData.value = Array.isArray(extracted) ? extracted as Record<string, unknown>[] : []
    } catch {
      chartData.value = []
    } finally {
      loading.value = false
    }
  }

  const chartOption = computed(() => {
    const data = apiUrl.value ? chartData.value : staticData.value
    if (!data || data.length === 0) return {}

    const option = buildOption(data, props.value)

    if (rawOption.value) {
      return deepMerge(option, rawOption.value)
    }
    return option
  })

  // 加载 API 数据
  if (apiUrl.value) {
    loadData()
  }
  watch(apiUrl, (url) => {
    if (url) loadData()
    else chartData.value = []
  })

  return { chartOption: chartOption, loading, chartData, loadData }
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (
      result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])
      && source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, source[key] as Record<string, unknown>)
    } else {
      result[key] = source[key]
    }
  }
  return result
}
```

注意：`chartOption` 在上面的解构中被遗漏了，修正返回：

```typescript
// 最后一行应为：
return { chartOption, loading, chartData, loadData }
```

- [ ] **Step 2: 类型检查**

```bash
cd /Users/yangdongnan/work/schema-form-platform && pnpm build:web 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add packages/editor/web/src/widgets/base/useChartOption.ts
git commit -m "feat(widgets): add useChartOption composable for chart data→option conversion"
```

---

### Task 5: 柱状图 Widget (bar-chart)

**Files:**
- Create: `packages/editor/web/src/widgets/bar-chart/config.ts`
- Create: `packages/editor/web/src/widgets/bar-chart/schema.ts`
- Create: `packages/editor/web/src/widgets/bar-chart/FgBarChart.vue`
- Create: `packages/editor/web/src/widgets/bar-chart/index.ts`

- [ ] **Step 1: 创建 config.ts**

```typescript
// packages/editor/web/src/widgets/bar-chart/config.ts
import type { WidgetConfig } from '../base/types'

export const barChartConfig: WidgetConfig = {
  name: 'FgBarChart',
  displayName: '柱状图',
  description: '柱状图组件，支持堆叠、水平方向、多系列',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '400px',
  },
  defaultProps: {
    staticData: [
      { category: '1月', value: 120 },
      { category: '2月', value: 200 },
      { category: '3月', value: 150 },
      { category: '4月', value: 80 },
      { category: '5月', value: 170 },
    ] as Record<string, unknown>[],
    xField: 'category',
    yField: 'value',
    title: '',
    showLegend: true,
    showLabel: false,
    colorScheme: 'default',
    stack: false,
    horizontal: false,
    apiUrl: '',
    apiMethod: 'get',
    apiHeaders: {} as Record<string, string>,
    responseDataPath: '',
    rawOption: null as Record<string, unknown> | null,
  },
  exposedValues: [
    { key: 'loading', type: 'boolean', description: '加载状态' },
    { key: 'chartData', type: 'array', description: '图表数据' },
  ],
  configPanels: ['api', 'variables'],
  receivableEvents: [
    { name: 'refresh', description: '重新加载数据' },
    { name: 'set-data', description: '设置图表数据', params: { data: '数据数组' } },
  ],
  propertyPanel: {
    basic: ['label'],
    props: [
      { key: 'xField', label: 'X 轴字段', type: 'input', placeholder: '如: category' },
      { key: 'yField', label: 'Y 轴字段', type: 'input', placeholder: '如: value' },
      { key: 'title', label: '图表标题', type: 'input' },
      { key: 'showLegend', label: '显示图例', type: 'switch', default: true },
      { key: 'showLabel', label: '显示标签', type: 'switch', default: false },
      { key: 'stack', label: '堆叠', type: 'switch', default: false },
      { key: 'horizontal', label: '水平方向', type: 'switch', default: false },
      { key: 'colorScheme', label: '颜色主题', type: 'select', options: [
        { label: '默认', value: 'default' },
        { label: '暗色', value: 'dark' },
        { label: '浅色', value: 'light' },
      ]},
      { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
    ],
  },
}
```

- [ ] **Step 2: 创建 schema.ts**

```typescript
// packages/editor/web/src/widgets/bar-chart/schema.ts
import { publicSchema } from '../base/publicSchema'
import { barChartConfig } from './config'
import type { Widget } from '../base/types'

export function createBarChartWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'bar-chart'),
    name: barChartConfig.name,
    label: barChartConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...barChartConfig.defaultStyle },
    props: { ...barChartConfig.defaultProps },
  }
}
```

- [ ] **Step 3: 创建 FgBarChart.vue**

```vue
<!-- packages/editor/web/src/widgets/bar-chart/FgBarChart.vue -->
<script setup lang="ts">
import { inject, watch, onMounted, onUnmounted, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'
import { useChartOption } from '../base/useChartOption'
import { echarts } from '../base/echarts'
import type { EChartsType } from '../base/echarts'

const widgetData = inject(widgetDataKey)!
const { isDisabled } = useWidgetRenderState()

const chartRef = ref<HTMLElement>()
let chartInstance: EChartsType | null = null

const { chartOption, loading, chartData } = useChartOption({
  widgetData,
  buildOption(data, props) {
    const xField = (props.xField as string) || 'category'
    const yField = (props.yField as string) || 'value'
    const title = props.title as string
    const showLegend = props.showLegend !== false
    const showLabel = props.showLabel === true
    const stack = props.stack === true
    const horizontal = props.horizontal === true
    const colorScheme = (props.colorScheme as string) || 'default'

    const xData = data.map(d => d[xField])
    const yData = data.map(d => d[yField])

    const axisType = horizontal ? 'yAxis' : 'xAxis'
    const valueAxis = horizontal ? 'xAxis' : 'yAxis'

    return {
      ...(title ? { title: { text: title, left: 'center' } } : {}),
      tooltip: { trigger: 'axis' },
      ...(showLegend ? { legend: { bottom: 0 } } : {}),
      [axisType]: { type: 'category', data: xData },
      [valueAxis]: { type: 'value' },
      series: [{
        type: 'bar',
        data: yData,
        ...(stack ? { stack: 'total' } : {}),
        ...(showLabel ? { label: { show: true, position: 'top' } } : {}),
      }],
      ...(colorScheme === 'dark' ? { backgroundColor: '#1a1a2e' } : {}),
    }
  },
})

useExposeWidget(() => ({
  get loading() { return loading.value },
  get chartData() { return chartData.value },
}))

function renderChart() {
  if (!chartRef.value || !chartOption.value || Object.keys(chartOption.value).length === 0) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  chartInstance.setOption(chartOption.value, true)
}

function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})

watch(chartOption, () => renderChart(), { deep: true })
</script>

<template>
  <div
    ref="chartRef"
    v-loading="loading"
    :class="['fg-chart', { 'is-disabled': isDisabled }]"
    :style="{ width: '100%', height: '100%', minHeight: '200px' }"
  />
</template>

<style module>
.fg-chart {
  position: relative;
}
.fg-chart.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
```

- [ ] **Step 4: 创建 index.ts**

```typescript
// packages/editor/web/src/widgets/bar-chart/index.ts
export { default as FgBarChart } from './FgBarChart.vue'
export { createBarChartWidget } from './schema'
export { barChartConfig } from './config'
```

- [ ] **Step 5: 类型检查**

```bash
cd /Users/yangdongnan/work/schema-form-platform && pnpm build:web 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
git add packages/editor/web/src/widgets/bar-chart/
git commit -m "feat(widgets): add bar-chart widget with ECharts rendering"
```

---

### Task 6: 折线图 Widget (line-chart)

**Files:**
- Create: `packages/editor/web/src/widgets/line-chart/config.ts`
- Create: `packages/editor/web/src/widgets/line-chart/schema.ts`
- Create: `packages/editor/web/src/widgets/line-chart/FgLineChart.vue`
- Create: `packages/editor/web/src/widgets/line-chart/index.ts`

- [ ] **Step 1: 创建 config.ts**

```typescript
// packages/editor/web/src/widgets/line-chart/config.ts
import type { WidgetConfig } from '../base/types'

export const lineChartConfig: WidgetConfig = {
  name: 'FgLineChart',
  displayName: '折线图',
  description: '折线图组件，支持平滑曲线、堆叠、面积图',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '400px',
  },
  defaultProps: {
    staticData: [
      { category: '1月', value: 120 },
      { category: '2月', value: 200 },
      { category: '3月', value: 150 },
      { category: '4月', value: 80 },
      { category: '5月', value: 170 },
    ] as Record<string, unknown>[],
    xField: 'category',
    yField: 'value',
    title: '',
    showLegend: true,
    showLabel: false,
    colorScheme: 'default',
    smooth: false,
    stack: false,
    area: false,
    apiUrl: '',
    apiMethod: 'get',
    apiHeaders: {} as Record<string, string>,
    responseDataPath: '',
    rawOption: null as Record<string, unknown> | null,
  },
  exposedValues: [
    { key: 'loading', type: 'boolean', description: '加载状态' },
    { key: 'chartData', type: 'array', description: '图表数据' },
  ],
  configPanels: ['api', 'variables'],
  receivableEvents: [
    { name: 'refresh', description: '重新加载数据' },
    { name: 'set-data', description: '设置图表数据', params: { data: '数据数组' } },
  ],
  propertyPanel: {
    basic: ['label'],
    props: [
      { key: 'xField', label: 'X 轴字段', type: 'input', placeholder: '如: category' },
      { key: 'yField', label: 'Y 轴字段', type: 'input', placeholder: '如: value' },
      { key: 'title', label: '图表标题', type: 'input' },
      { key: 'showLegend', label: '显示图例', type: 'switch', default: true },
      { key: 'showLabel', label: '显示标签', type: 'switch', default: false },
      { key: 'smooth', label: '平滑曲线', type: 'switch', default: false },
      { key: 'stack', label: '堆叠', type: 'switch', default: false },
      { key: 'area', label: '面积图', type: 'switch', default: false },
      { key: 'colorScheme', label: '颜色主题', type: 'select', options: [
        { label: '默认', value: 'default' },
        { label: '暗色', value: 'dark' },
        { label: '浅色', value: 'light' },
      ]},
      { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
    ],
  },
}
```

- [ ] **Step 2: 创建 schema.ts**

```typescript
// packages/editor/web/src/widgets/line-chart/schema.ts
import { publicSchema } from '../base/publicSchema'
import { lineChartConfig } from './config'
import type { Widget } from '../base/types'

export function createLineChartWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'line-chart'),
    name: lineChartConfig.name,
    label: lineChartConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...lineChartConfig.defaultStyle },
    props: { ...lineChartConfig.defaultProps },
  }
}
```

- [ ] **Step 3: 创建 FgLineChart.vue**

```vue
<!-- packages/editor/web/src/widgets/line-chart/FgLineChart.vue -->
<script setup lang="ts">
import { inject, watch, onMounted, onUnmounted, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'
import { useChartOption } from '../base/useChartOption'
import { echarts } from '../base/echarts'
import type { EChartsType } from '../base/echarts'

const widgetData = inject(widgetDataKey)!
const { isDisabled } = useWidgetRenderState()

const chartRef = ref<HTMLElement>()
let chartInstance: EChartsType | null = null

const { chartOption, loading, chartData } = useChartOption({
  widgetData,
  buildOption(data, props) {
    const xField = (props.xField as string) || 'category'
    const yField = (props.yField as string) || 'value'
    const title = props.title as string
    const showLegend = props.showLegend !== false
    const showLabel = props.showLabel === true
    const smooth = props.smooth === true
    const stack = props.stack === true
    const area = props.area === true
    const colorScheme = (props.colorScheme as string) || 'default'

    const xData = data.map(d => d[xField])
    const yData = data.map(d => d[yField])

    return {
      ...(title ? { title: { text: title, left: 'center' } } : {}),
      tooltip: { trigger: 'axis' },
      ...(showLegend ? { legend: { bottom: 0 } } : {}),
      xAxis: { type: 'category', data: xData },
      yAxis: { type: 'value' },
      series: [{
        type: 'line',
        data: yData,
        smooth,
        ...(stack ? { stack: 'total' } : {}),
        ...(area ? { areaStyle: {} } : {}),
        ...(showLabel ? { label: { show: true } } : {}),
      }],
      ...(colorScheme === 'dark' ? { backgroundColor: '#1a1a2e' } : {}),
    }
  },
})

useExposeWidget(() => ({
  get loading() { return loading.value },
  get chartData() { return chartData.value },
}))

function renderChart() {
  if (!chartRef.value || !chartOption.value || Object.keys(chartOption.value).length === 0) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  chartInstance.setOption(chartOption.value, true)
}

function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})

watch(chartOption, () => renderChart(), { deep: true })
</script>

<template>
  <div
    ref="chartRef"
    v-loading="loading"
    :class="['fg-chart', { 'is-disabled': isDisabled }]"
    :style="{ width: '100%', height: '100%', minHeight: '200px' }"
  />
</template>

<style module>
.fg-chart {
  position: relative;
}
.fg-chart.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
```

- [ ] **Step 4: 创建 index.ts**

```typescript
// packages/editor/web/src/widgets/line-chart/index.ts
export { default as FgLineChart } from './FgLineChart.vue'
export { createLineChartWidget } from './schema'
export { lineChartConfig } from './config'
```

- [ ] **Step 5: Commit**

```bash
git add packages/editor/web/src/widgets/line-chart/
git commit -m "feat(widgets): add line-chart widget"
```

---

### Task 7: 饼图 Widget (pie-chart)

**Files:**
- Create: `packages/editor/web/src/widgets/pie-chart/config.ts`
- Create: `packages/editor/web/src/widgets/pie-chart/schema.ts`
- Create: `packages/editor/web/src/widgets/pie-chart/FgPieChart.vue`
- Create: `packages/editor/web/src/widgets/pie-chart/index.ts`

- [ ] **Step 1: 创建 config.ts**

```typescript
// packages/editor/web/src/widgets/pie-chart/config.ts
import type { WidgetConfig } from '../base/types'

export const pieChartConfig: WidgetConfig = {
  name: 'FgPieChart',
  displayName: '饼图',
  description: '饼图组件，支持环形图、南丁格尔玫瑰图',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '400px',
  },
  defaultProps: {
    staticData: [
      { name: '直接访问', value: 335 },
      { name: '邮件营销', value: 310 },
      { name: '联盟广告', value: 234 },
      { name: '视频广告', value: 135 },
      { name: '搜索引擎', value: 548 },
    ] as Record<string, unknown>[],
    nameField: 'name',
    valueField: 'value',
    title: '',
    showLegend: true,
    showLabel: true,
    colorScheme: 'default',
    roseType: false,
    innerRadius: 0,
    apiUrl: '',
    apiMethod: 'get',
    apiHeaders: {} as Record<string, string>,
    responseDataPath: '',
    rawOption: null as Record<string, unknown> | null,
  },
  exposedValues: [
    { key: 'loading', type: 'boolean', description: '加载状态' },
    { key: 'chartData', type: 'array', description: '图表数据' },
  ],
  configPanels: ['api', 'variables'],
  receivableEvents: [
    { name: 'refresh', description: '重新加载数据' },
    { name: 'set-data', description: '设置图表数据', params: { data: '数据数组' } },
  ],
  propertyPanel: {
    basic: ['label'],
    props: [
      { key: 'nameField', label: '名称字段', type: 'input', placeholder: '如: name' },
      { key: 'valueField', label: '值字段', type: 'input', placeholder: '如: value' },
      { key: 'title', label: '图表标题', type: 'input' },
      { key: 'showLegend', label: '显示图例', type: 'switch', default: true },
      { key: 'showLabel', label: '显示标签', type: 'switch', default: true },
      { key: 'roseType', label: '南丁格尔玫瑰', type: 'switch', default: false },
      { key: 'innerRadius', label: '内环半径 (%)', type: 'number', default: 0, desc: '大于 0 时为环形图' },
      { key: 'colorScheme', label: '颜色主题', type: 'select', options: [
        { label: '默认', value: 'default' },
        { label: '暗色', value: 'dark' },
        { label: '浅色', value: 'light' },
      ]},
      { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
    ],
  },
}
```

- [ ] **Step 2: 创建 schema.ts**

```typescript
// packages/editor/web/src/widgets/pie-chart/schema.ts
import { publicSchema } from '../base/publicSchema'
import { pieChartConfig } from './config'
import type { Widget } from '../base/types'

export function createPieChartWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'pie-chart'),
    name: pieChartConfig.name,
    label: pieChartConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...pieChartConfig.defaultStyle },
    props: { ...pieChartConfig.defaultProps },
  }
}
```

- [ ] **Step 3: 创建 FgPieChart.vue**

```vue
<!-- packages/editor/web/src/widgets/pie-chart/FgPieChart.vue -->
<script setup lang="ts">
import { inject, watch, onMounted, onUnmounted, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'
import { useChartOption } from '../base/useChartOption'
import { echarts } from '../base/echarts'
import type { EChartsType } from '../base/echarts'

const widgetData = inject(widgetDataKey)!
const { isDisabled } = useWidgetRenderState()

const chartRef = ref<HTMLElement>()
let chartInstance: EChartsType | null = null

const { chartOption, loading, chartData } = useChartOption({
  widgetData,
  buildOption(data, props) {
    const nameField = (props.nameField as string) || 'name'
    const valueField = (props.valueField as string) || 'value'
    const title = props.title as string
    const showLegend = props.showLegend !== false
    const showLabel = props.showLabel !== false
    const roseType = props.roseType === true
    const innerRadius = Number(props.innerRadius) || 0

    const seriesData = data.map(d => ({ name: d[nameField], value: d[valueField] }))

    return {
      ...(title ? { title: { text: title, left: 'center' } } : {}),
      tooltip: { trigger: 'item' },
      ...(showLegend ? { legend: { bottom: 0 } } : {}),
      series: [{
        type: 'pie',
        data: seriesData,
        radius: innerRadius > 0 ? [`${innerRadius}%`, '70%'] : '70%',
        ...(roseType ? { roseType: 'area' } : {}),
        ...(showLabel ? { label: { show: true } } : { label: { show: false } }),
      }],
    }
  },
})

useExposeWidget(() => ({
  get loading() { return loading.value },
  get chartData() { return chartData.value },
}))

function renderChart() {
  if (!chartRef.value || !chartOption.value || Object.keys(chartOption.value).length === 0) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  chartInstance.setOption(chartOption.value, true)
}

function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})

watch(chartOption, () => renderChart(), { deep: true })
</script>

<template>
  <div
    ref="chartRef"
    v-loading="loading"
    :class="['fg-chart', { 'is-disabled': isDisabled }]"
    :style="{ width: '100%', height: '100%', minHeight: '200px' }"
  />
</template>

<style module>
.fg-chart {
  position: relative;
}
.fg-chart.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
```

- [ ] **Step 4: 创建 index.ts**

```typescript
// packages/editor/web/src/widgets/pie-chart/index.ts
export { default as FgPieChart } from './FgPieChart.vue'
export { createPieChartWidget } from './schema'
export { pieChartConfig } from './config'
```

- [ ] **Step 5: Commit**

```bash
git add packages/editor/web/src/widgets/pie-chart/
git commit -m "feat(widgets): add pie-chart widget"
```

---

### Task 8: 散点图 Widget (scatter-chart)

**Files:**
- Create: `packages/editor/web/src/widgets/scatter-chart/config.ts`
- Create: `packages/editor/web/src/widgets/scatter-chart/schema.ts`
- Create: `packages/editor/web/src/widgets/scatter-chart/FgScatterChart.vue`
- Create: `packages/editor/web/src/widgets/scatter-chart/index.ts`

- [ ] **Step 1: 创建 config.ts**

```typescript
// packages/editor/web/src/widgets/scatter-chart/config.ts
import type { WidgetConfig } from '../base/types'

export const scatterChartConfig: WidgetConfig = {
  name: 'FgScatterChart',
  displayName: '散点图',
  description: '散点图组件，用于展示数据分布和相关性',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '400px',
  },
  defaultProps: {
    staticData: [
      { x: 10, y: 8.04 },
      { x: 8, y: 6.95 },
      { x: 13, y: 7.58 },
      { x: 9, y: 8.81 },
      { x: 11, y: 8.33 },
      { x: 14, y: 9.96 },
      { x: 6, y: 7.24 },
      { x: 4, y: 4.26 },
      { x: 12, y: 10.84 },
      { x: 7, y: 4.82 },
      { x: 5, y: 5.68 },
    ] as Record<string, unknown>[],
    xField: 'x',
    yField: 'y',
    title: '',
    showLegend: false,
    showLabel: false,
    colorScheme: 'default',
    apiUrl: '',
    apiMethod: 'get',
    apiHeaders: {} as Record<string, string>,
    responseDataPath: '',
    rawOption: null as Record<string, unknown> | null,
  },
  exposedValues: [
    { key: 'loading', type: 'boolean', description: '加载状态' },
    { key: 'chartData', type: 'array', description: '图表数据' },
  ],
  configPanels: ['api', 'variables'],
  receivableEvents: [
    { name: 'refresh', description: '重新加载数据' },
    { name: 'set-data', description: '设置图表数据', params: { data: '数据数组' } },
  ],
  propertyPanel: {
    basic: ['label'],
    props: [
      { key: 'xField', label: 'X 轴字段', type: 'input', placeholder: '如: x' },
      { key: 'yField', label: 'Y 轴字段', type: 'input', placeholder: '如: y' },
      { key: 'title', label: '图表标题', type: 'input' },
      { key: 'showLegend', label: '显示图例', type: 'switch', default: false },
      { key: 'showLabel', label: '显示标签', type: 'switch', default: false },
      { key: 'colorScheme', label: '颜色主题', type: 'select', options: [
        { label: '默认', value: 'default' },
        { label: '暗色', value: 'dark' },
        { label: '浅色', value: 'light' },
      ]},
      { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
    ],
  },
}
```

- [ ] **Step 2: 创建 schema.ts**

```typescript
// packages/editor/web/src/widgets/scatter-chart/schema.ts
import { publicSchema } from '../base/publicSchema'
import { scatterChartConfig } from './config'
import type { Widget } from '../base/types'

export function createScatterChartWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'scatter-chart'),
    name: scatterChartConfig.name,
    label: scatterChartConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...scatterChartConfig.defaultStyle },
    props: { ...scatterChartConfig.defaultProps },
  }
}
```

- [ ] **Step 3: 创建 FgScatterChart.vue**

```vue
<!-- packages/editor/web/src/widgets/scatter-chart/FgScatterChart.vue -->
<script setup lang="ts">
import { inject, watch, onMounted, onUnmounted, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'
import { useChartOption } from '../base/useChartOption'
import { echarts } from '../base/echarts'
import type { EChartsType } from '../base/echarts'

const widgetData = inject(widgetDataKey)!
const { isDisabled } = useWidgetRenderState()

const chartRef = ref<HTMLElement>()
let chartInstance: EChartsType | null = null

const { chartOption, loading, chartData } = useChartOption({
  widgetData,
  buildOption(data, props) {
    const xField = (props.xField as string) || 'x'
    const yField = (props.yField as string) || 'y'
    const title = props.title as string
    const showLegend = props.showLegend === true
    const showLabel = props.showLabel === true

    const seriesData = data.map(d => [d[xField], d[yField]])

    return {
      ...(title ? { title: { text: title, left: 'center' } } : {}),
      tooltip: { trigger: 'item' },
      ...(showLegend ? { legend: { bottom: 0 } } : {}),
      xAxis: { type: 'value' },
      yAxis: { type: 'value' },
      series: [{
        type: 'scatter',
        data: seriesData,
        ...(showLabel ? { label: { show: true } } : {}),
      }],
    }
  },
})

useExposeWidget(() => ({
  get loading() { return loading.value },
  get chartData() { return chartData.value },
}))

function renderChart() {
  if (!chartRef.value || !chartOption.value || Object.keys(chartOption.value).length === 0) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  chartInstance.setOption(chartOption.value, true)
}

function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})

watch(chartOption, () => renderChart(), { deep: true })
</script>

<template>
  <div
    ref="chartRef"
    v-loading="loading"
    :class="['fg-chart', { 'is-disabled': isDisabled }]"
    :style="{ width: '100%', height: '100%', minHeight: '200px' }"
  />
</template>

<style module>
.fg-chart {
  position: relative;
}
.fg-chart.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
```

- [ ] **Step 4: 创建 index.ts**

```typescript
// packages/editor/web/src/widgets/scatter-chart/index.ts
export { default as FgScatterChart } from './FgScatterChart.vue'
export { createScatterChartWidget } from './schema'
export { scatterChartConfig } from './config'
```

- [ ] **Step 5: Commit**

```bash
git add packages/editor/web/src/widgets/scatter-chart/
git commit -m "feat(widgets): add scatter-chart widget"
```

---

### Task 9: 雷达图 Widget (radar)

**Files:**
- Create: `packages/editor/web/src/widgets/radar/config.ts`
- Create: `packages/editor/web/src/widgets/radar/schema.ts`
- Create: `packages/editor/web/src/widgets/radar/FgRadar.vue`
- Create: `packages/editor/web/src/widgets/radar/index.ts`

- [ ] **Step 1: 创建 config.ts**

```typescript
// packages/editor/web/src/widgets/radar/config.ts
import type { WidgetConfig } from '../base/types'

export const radarConfig: WidgetConfig = {
  name: 'FgRadar',
  displayName: '雷达图',
  description: '雷达图组件，用于多维度数据对比',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '400px',
  },
  defaultProps: {
    staticData: [
      { category: '销售', value: 90 },
      { category: '管理', value: 85 },
      { category: '信息技术', value: 80 },
      { category: '客服', value: 70 },
      { category: '研发', value: 95 },
      { category: '市场', value: 75 },
    ] as Record<string, unknown>[],
    categoryField: 'category',
    valueField: 'value',
    indicators: [
      { name: '销售', max: 100 },
      { name: '管理', max: 100 },
      { name: '信息技术', max: 100 },
      { name: '客服', max: 100 },
      { name: '研发', max: 100 },
      { name: '市场', max: 100 },
    ] as Array<{ name: string; max: number }>,
    title: '',
    showLegend: false,
    showLabel: false,
    colorScheme: 'default',
    apiUrl: '',
    apiMethod: 'get',
    apiHeaders: {} as Record<string, string>,
    responseDataPath: '',
    rawOption: null as Record<string, unknown> | null,
  },
  exposedValues: [
    { key: 'loading', type: 'boolean', description: '加载状态' },
    { key: 'chartData', type: 'array', description: '图表数据' },
  ],
  configPanels: ['api', 'variables'],
  receivableEvents: [
    { name: 'refresh', description: '重新加载数据' },
    { name: 'set-data', description: '设置图表数据', params: { data: '数据数组' } },
  ],
  propertyPanel: {
    basic: ['label'],
    props: [
      { key: 'categoryField', label: '分类字段', type: 'input', placeholder: '如: category' },
      { key: 'valueField', label: '值字段', type: 'input', placeholder: '如: value' },
      { key: 'indicators', label: '雷达轴定义', type: 'json', desc: '[{"name":"维度","max":100}]' },
      { key: 'title', label: '图表标题', type: 'input' },
      { key: 'showLegend', label: '显示图例', type: 'switch', default: false },
      { key: 'showLabel', label: '显示标签', type: 'switch', default: false },
      { key: 'colorScheme', label: '颜色主题', type: 'select', options: [
        { label: '默认', value: 'default' },
        { label: '暗色', value: 'dark' },
        { label: '浅色', value: 'light' },
      ]},
      { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
    ],
  },
}
```

- [ ] **Step 2: 创建 schema.ts**

```typescript
// packages/editor/web/src/widgets/radar/schema.ts
import { publicSchema } from '../base/publicSchema'
import { radarConfig } from './config'
import type { Widget } from '../base/types'

export function createRadarWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'radar'),
    name: radarConfig.name,
    label: radarConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...radarConfig.defaultStyle },
    props: { ...radarConfig.defaultProps },
  }
}
```

- [ ] **Step 3: 创建 FgRadar.vue**

```vue
<!-- packages/editor/web/src/widgets/radar/FgRadar.vue -->
<script setup lang="ts">
import { inject, watch, onMounted, onUnmounted, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'
import { useChartOption } from '../base/useChartOption'
import { echarts } from '../base/echarts'
import type { EChartsType } from '../base/echarts'

const widgetData = inject(widgetDataKey)!
const { isDisabled } = useWidgetRenderState()

const chartRef = ref<HTMLElement>()
let chartInstance: EChartsType | null = null

const { chartOption, loading, chartData } = useChartOption({
  widgetData,
  buildOption(data, props) {
    const categoryField = (props.categoryField as string) || 'category'
    const valueField = (props.valueField as string) || 'value'
    const title = props.title as string
    const showLegend = props.showLegend === true
    const showLabel = props.showLabel === true
    const indicators = (props.indicators as Array<{ name: string; max: number }>) ?? []

    const values = data.map(d => d[valueField])

    return {
      ...(title ? { title: { text: title, left: 'center' } } : {}),
      tooltip: {},
      ...(showLegend ? { legend: { bottom: 0 } } : {}),
      radar: {
        indicator: indicators,
      },
      series: [{
        type: 'radar',
        data: [{ value: values }],
        ...(showLabel ? { label: { show: true } } : {}),
      }],
    }
  },
})

useExposeWidget(() => ({
  get loading() { return loading.value },
  get chartData() { return chartData.value },
}))

function renderChart() {
  if (!chartRef.value || !chartOption.value || Object.keys(chartOption.value).length === 0) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  chartInstance.setOption(chartOption.value, true)
}

function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})

watch(chartOption, () => renderChart(), { deep: true })
</script>

<template>
  <div
    ref="chartRef"
    v-loading="loading"
    :class="['fg-chart', { 'is-disabled': isDisabled }]"
    :style="{ width: '100%', height: '100%', minHeight: '200px' }"
  />
</template>

<style module>
.fg-chart {
  position: relative;
}
.fg-chart.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
```

- [ ] **Step 4: 创建 index.ts**

```typescript
// packages/editor/web/src/widgets/radar/index.ts
export { default as FgRadar } from './FgRadar.vue'
export { createRadarWidget } from './schema'
export { radarConfig } from './config'
```

- [ ] **Step 5: Commit**

```bash
git add packages/editor/web/src/widgets/radar/
git commit -m "feat(widgets): add radar widget"
```

---

### Task 10: 仪表盘 Widget (gauge)

**Files:**
- Create: `packages/editor/web/src/widgets/gauge/config.ts`
- Create: `packages/editor/web/src/widgets/gauge/schema.ts`
- Create: `packages/editor/web/src/widgets/gauge/FgGauge.vue`
- Create: `packages/editor/web/src/widgets/gauge/index.ts`

- [ ] **Step 1: 创建 config.ts**

```typescript
// packages/editor/web/src/widgets/gauge/config.ts
import type { WidgetConfig } from '../base/types'

export const gaugeConfig: WidgetConfig = {
  name: 'FgGauge',
  displayName: '仪表盘',
  description: '仪表盘组件，用于展示单个指标进度',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '400px',
  },
  defaultProps: {
    staticData: [{ value: 75 }] as Record<string, unknown>[],
    valueField: 'value',
    min: 0,
    max: 100,
    unit: '',
    title: '',
    showLabel: true,
    colorScheme: 'default',
    apiUrl: '',
    apiMethod: 'get',
    apiHeaders: {} as Record<string, string>,
    responseDataPath: '',
    rawOption: null as Record<string, unknown> | null,
  },
  exposedValues: [
    { key: 'loading', type: 'boolean', description: '加载状态' },
    { key: 'chartData', type: 'array', description: '图表数据' },
  ],
  configPanels: ['api', 'variables'],
  receivableEvents: [
    { name: 'refresh', description: '重新加载数据' },
    { name: 'set-data', description: '设置图表数据', params: { data: '数据数组' } },
  ],
  propertyPanel: {
    basic: ['label'],
    props: [
      { key: 'valueField', label: '值字段', type: 'input', placeholder: '如: value' },
      { key: 'min', label: '最小值', type: 'number', default: 0 },
      { key: 'max', label: '最大值', type: 'number', default: 100 },
      { key: 'unit', label: '单位', type: 'input', placeholder: '如: %' },
      { key: 'title', label: '图表标题', type: 'input' },
      { key: 'showLabel', label: '显示标签', type: 'switch', default: true },
      { key: 'colorScheme', label: '颜色主题', type: 'select', options: [
        { label: '默认', value: 'default' },
        { label: '暗色', value: 'dark' },
        { label: '浅色', value: 'light' },
      ]},
      { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
    ],
  },
}
```

- [ ] **Step 2: 创建 schema.ts**

```typescript
// packages/editor/web/src/widgets/gauge/schema.ts
import { publicSchema } from '../base/publicSchema'
import { gaugeConfig } from './config'
import type { Widget } from '../base/types'

export function createGaugeWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'gauge'),
    name: gaugeConfig.name,
    label: gaugeConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...gaugeConfig.defaultStyle },
    props: { ...gaugeConfig.defaultProps },
  }
}
```

- [ ] **Step 3: 创建 FgGauge.vue**

```vue
<!-- packages/editor/web/src/widgets/gauge/FgGauge.vue -->
<script setup lang="ts">
import { inject, watch, onMounted, onUnmounted, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'
import { useChartOption } from '../base/useChartOption'
import { echarts } from '../base/echarts'
import type { EChartsType } from '../base/echarts'

const widgetData = inject(widgetDataKey)!
const { isDisabled } = useWidgetRenderState()

const chartRef = ref<HTMLElement>()
let chartInstance: EChartsType | null = null

const { chartOption, loading, chartData } = useChartOption({
  widgetData,
  buildOption(data, props) {
    const valueField = (props.valueField as string) || 'value'
    const min = Number(props.min) || 0
    const max = Number(props.max) || 100
    const unit = (props.unit as string) || ''
    const title = props.title as string
    const showLabel = props.showLabel !== false

    const value = data.length > 0 ? (data[0][valueField] as number) : 0

    return {
      ...(title ? { title: { text: title, left: 'center' } } : {}),
      series: [{
        type: 'gauge',
        min,
        max,
        data: [{ value, name: title }],
        detail: {
          formatter: `{value}${unit}`,
          ...(showLabel ? {} : { show: false }),
        },
        axisLabel: {
          formatter: `{value}${unit}`,
        },
      }],
    }
  },
})

useExposeWidget(() => ({
  get loading() { return loading.value },
  get chartData() { return chartData.value },
}))

function renderChart() {
  if (!chartRef.value || !chartOption.value || Object.keys(chartOption.value).length === 0) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  chartInstance.setOption(chartOption.value, true)
}

function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})

watch(chartOption, () => renderChart(), { deep: true })
</script>

<template>
  <div
    ref="chartRef"
    v-loading="loading"
    :class="['fg-chart', { 'is-disabled': isDisabled }]"
    :style="{ width: '100%', height: '100%', minHeight: '200px' }"
  />
</template>

<style module>
.fg-chart {
  position: relative;
}
.fg-chart.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
```

- [ ] **Step 4: 创建 index.ts**

```typescript
// packages/editor/web/src/widgets/gauge/index.ts
export { default as FgGauge } from './FgGauge.vue'
export { createGaugeWidget } from './schema'
export { gaugeConfig } from './config'
```

- [ ] **Step 5: Commit**

```bash
git add packages/editor/web/src/widgets/gauge/
git commit -m "feat(widgets): add gauge widget"
```

---

### Task 11: 热力图 Widget (heatmap)

**Files:**
- Create: `packages/editor/web/src/widgets/heatmap/config.ts`
- Create: `packages/editor/web/src/widgets/heatmap/schema.ts`
- Create: `packages/editor/web/src/widgets/heatmap/FgHeatmap.vue`
- Create: `packages/editor/web/src/widgets/heatmap/index.ts`

- [ ] **Step 1: 创建 config.ts**

```typescript
// packages/editor/web/src/widgets/heatmap/config.ts
import type { WidgetConfig } from '../base/types'

export const heatmapConfig: WidgetConfig = {
  name: 'FgHeatmap',
  displayName: '热力图',
  description: '热力图组件，用于展示二维数据密度',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '400px',
  },
  defaultProps: {
    staticData: [
      { x: 0, y: 0, value: 5 },
      { x: 0, y: 1, value: 1 },
      { x: 0, y: 2, value: 0 },
      { x: 1, y: 0, value: 7 },
      { x: 1, y: 1, value: 3 },
      { x: 1, y: 2, value: 1 },
      { x: 2, y: 0, value: 2 },
      { x: 2, y: 1, value: 4 },
      { x: 2, y: 2, value: 6 },
    ] as Record<string, unknown>[],
    xField: 'x',
    yField: 'y',
    valueField: 'value',
    title: '',
    showLabel: false,
    colorScheme: 'default',
    apiUrl: '',
    apiMethod: 'get',
    apiHeaders: {} as Record<string, string>,
    responseDataPath: '',
    rawOption: null as Record<string, unknown> | null,
  },
  exposedValues: [
    { key: 'loading', type: 'boolean', description: '加载状态' },
    { key: 'chartData', type: 'array', description: '图表数据' },
  ],
  configPanels: ['api', 'variables'],
  receivableEvents: [
    { name: 'refresh', description: '重新加载数据' },
    { name: 'set-data', description: '设置图表数据', params: { data: '数据数组' } },
  ],
  propertyPanel: {
    basic: ['label'],
    props: [
      { key: 'xField', label: 'X 轴字段', type: 'input', placeholder: '如: x' },
      { key: 'yField', label: 'Y 轴字段', type: 'input', placeholder: '如: y' },
      { key: 'valueField', label: '值字段', type: 'input', placeholder: '如: value' },
      { key: 'title', label: '图表标题', type: 'input' },
      { key: 'showLabel', label: '显示标签', type: 'switch', default: false },
      { key: 'colorScheme', label: '颜色主题', type: 'select', options: [
        { label: '默认', value: 'default' },
        { label: '暗色', value: 'dark' },
        { label: '浅色', value: 'light' },
      ]},
      { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
    ],
  },
}
```

- [ ] **Step 2: 创建 schema.ts**

```typescript
// packages/editor/web/src/widgets/heatmap/schema.ts
import { publicSchema } from '../base/publicSchema'
import { heatmapConfig } from './config'
import type { Widget } from '../base/types'

export function createHeatmapWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'heatmap'),
    name: heatmapConfig.name,
    label: heatmapConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...heatmapConfig.defaultStyle },
    props: { ...heatmapConfig.defaultProps },
  }
}
```

- [ ] **Step 3: 创建 FgHeatmap.vue**

```vue
<!-- packages/editor/web/src/widgets/heatmap/FgHeatmap.vue -->
<script setup lang="ts">
import { inject, watch, onMounted, onUnmounted, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'
import { useChartOption } from '../base/useChartOption'
import { echarts } from '../base/echarts'
import type { EChartsType } from '../base/echarts'

const widgetData = inject(widgetDataKey)!
const { isDisabled } = useWidgetRenderState()

const chartRef = ref<HTMLElement>()
let chartInstance: EChartsType | null = null

const { chartOption, loading, chartData } = useChartOption({
  widgetData,
  buildOption(data, props) {
    const xField = (props.xField as string) || 'x'
    const yField = (props.yField as string) || 'y'
    const valueField = (props.valueField as string) || 'value'
    const title = props.title as string
    const showLabel = props.showLabel === true

    const seriesData = data.map(d => [d[xField], d[yField], d[valueField]])
    const maxX = Math.max(...data.map(d => Number(d[xField]))) + 1
    const maxY = Math.max(...data.map(d => Number(d[yField]))) + 1

    return {
      ...(title ? { title: { text: title, left: 'center' } } : {}),
      tooltip: {},
      xAxis: { type: 'category', data: Array.from({ length: maxX }, (_, i) => String(i)), splitArea: { show: true } },
      yAxis: { type: 'category', data: Array.from({ length: maxY }, (_, i) => String(i)), splitArea: { show: true } },
      visualMap: {
        min: 0,
        max: Math.max(...data.map(d => Number(d[valueField]))),
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
      },
      series: [{
        type: 'heatmap',
        data: seriesData,
        ...(showLabel ? { label: { show: true } } : {}),
      }],
    }
  },
})

useExposeWidget(() => ({
  get loading() { return loading.value },
  get chartData() { return chartData.value },
}))

function renderChart() {
  if (!chartRef.value || !chartOption.value || Object.keys(chartOption.value).length === 0) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  chartInstance.setOption(chartOption.value, true)
}

function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})

watch(chartOption, () => renderChart(), { deep: true })
</script>

<template>
  <div
    ref="chartRef"
    v-loading="loading"
    :class="['fg-chart', { 'is-disabled': isDisabled }]"
    :style="{ width: '100%', height: '100%', minHeight: '200px' }"
  />
</template>

<style module>
.fg-chart {
  position: relative;
}
.fg-chart.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
```

- [ ] **Step 4: 创建 index.ts**

```typescript
// packages/editor/web/src/widgets/heatmap/index.ts
export { default as FgHeatmap } from './FgHeatmap.vue'
export { createHeatmapWidget } from './schema'
export { heatmapConfig } from './config'
```

- [ ] **Step 5: Commit**

```bash
git add packages/editor/web/src/widgets/heatmap/
git commit -m "feat(widgets): add heatmap widget"
```

---

### Task 12: 漏斗图 Widget (funnel)

**Files:**
- Create: `packages/editor/web/src/widgets/funnel/config.ts`
- Create: `packages/editor/web/src/widgets/funnel/schema.ts`
- Create: `packages/editor/web/src/widgets/funnel/FgFunnel.vue`
- Create: `packages/editor/web/src/widgets/funnel/index.ts`

- [ ] **Step 1: 创建 config.ts**

```typescript
// packages/editor/web/src/widgets/funnel/config.ts
import type { WidgetConfig } from '../base/types'

export const funnelConfig: WidgetConfig = {
  name: 'FgFunnel',
  displayName: '漏斗图',
  description: '漏斗图组件，用于展示流程转化率',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '400px',
  },
  defaultProps: {
    staticData: [
      { name: '展示', value: 100 },
      { name: '点击', value: 80 },
      { name: '访问', value: 60 },
      { name: '咨询', value: 40 },
      { name: '订单', value: 20 },
    ] as Record<string, unknown>[],
    nameField: 'name',
    valueField: 'value',
    title: '',
    showLegend: true,
    showLabel: true,
    colorScheme: 'default',
    apiUrl: '',
    apiMethod: 'get',
    apiHeaders: {} as Record<string, string>,
    responseDataPath: '',
    rawOption: null as Record<string, unknown> | null,
  },
  exposedValues: [
    { key: 'loading', type: 'boolean', description: '加载状态' },
    { key: 'chartData', type: 'array', description: '图表数据' },
  ],
  configPanels: ['api', 'variables'],
  receivableEvents: [
    { name: 'refresh', description: '重新加载数据' },
    { name: 'set-data', description: '设置图表数据', params: { data: '数据数组' } },
  ],
  propertyPanel: {
    basic: ['label'],
    props: [
      { key: 'nameField', label: '名称字段', type: 'input', placeholder: '如: name' },
      { key: 'valueField', label: '值字段', type: 'input', placeholder: '如: value' },
      { key: 'title', label: '图表标题', type: 'input' },
      { key: 'showLegend', label: '显示图例', type: 'switch', default: true },
      { key: 'showLabel', label: '显示标签', type: 'switch', default: true },
      { key: 'colorScheme', label: '颜色主题', type: 'select', options: [
        { label: '默认', value: 'default' },
        { label: '暗色', value: 'dark' },
        { label: '浅色', value: 'light' },
      ]},
      { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
    ],
  },
}
```

- [ ] **Step 2: 创建 schema.ts**

```typescript
// packages/editor/web/src/widgets/funnel/schema.ts
import { publicSchema } from '../base/publicSchema'
import { funnelConfig } from './config'
import type { Widget } from '../base/types'

export function createFunnelWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'funnel'),
    name: funnelConfig.name,
    label: funnelConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...funnelConfig.defaultStyle },
    props: { ...funnelConfig.defaultProps },
  }
}
```

- [ ] **Step 3: 创建 FgFunnel.vue**

```vue
<!-- packages/editor/web/src/widgets/funnel/FgFunnel.vue -->
<script setup lang="ts">
import { inject, watch, onMounted, onUnmounted, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'
import { useChartOption } from '../base/useChartOption'
import { echarts } from '../base/echarts'
import type { EChartsType } from '../base/echarts'

const widgetData = inject(widgetDataKey)!
const { isDisabled } = useWidgetRenderState()

const chartRef = ref<HTMLElement>()
let chartInstance: EChartsType | null = null

const { chartOption, loading, chartData } = useChartOption({
  widgetData,
  buildOption(data, props) {
    const nameField = (props.nameField as string) || 'name'
    const valueField = (props.valueField as string) || 'value'
    const title = props.title as string
    const showLegend = props.showLegend !== false
    const showLabel = props.showLabel !== false

    const seriesData = data.map(d => ({ name: d[nameField], value: d[valueField] }))

    return {
      ...(title ? { title: { text: title, left: 'center' } } : {}),
      tooltip: { trigger: 'item' },
      ...(showLegend ? { legend: { bottom: 0 } } : {}),
      series: [{
        type: 'funnel',
        data: seriesData,
        ...(showLabel ? { label: { show: true, position: 'inside' } } : {}),
      }],
    }
  },
})

useExposeWidget(() => ({
  get loading() { return loading.value },
  get chartData() { return chartData.value },
}))

function renderChart() {
  if (!chartRef.value || !chartOption.value || Object.keys(chartOption.value).length === 0) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  chartInstance.setOption(chartOption.value, true)
}

function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})

watch(chartOption, () => renderChart(), { deep: true })
</script>

<template>
  <div
    ref="chartRef"
    v-loading="loading"
    :class="['fg-chart', { 'is-disabled': isDisabled }]"
    :style="{ width: '100%', height: '100%', minHeight: '200px' }"
  />
</template>

<style module>
.fg-chart {
  position: relative;
}
.fg-chart.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
```

- [ ] **Step 4: 创建 index.ts**

```typescript
// packages/editor/web/src/widgets/funnel/index.ts
export { default as FgFunnel } from './FgFunnel.vue'
export { createFunnelWidget } from './schema'
export { funnelConfig } from './config'
```

- [ ] **Step 5: Commit**

```bash
git add packages/editor/web/src/widgets/funnel/
git commit -m "feat(widgets): add funnel widget"
```

---

### Task 13: K 线图 Widget (candlestick)

**Files:**
- Create: `packages/editor/web/src/widgets/candlestick/config.ts`
- Create: `packages/editor/web/src/widgets/candlestick/schema.ts`
- Create: `packages/editor/web/src/widgets/candlestick/FgCandlestick.vue`
- Create: `packages/editor/web/src/widgets/candlestick/index.ts`

- [ ] **Step 1: 创建 config.ts**

```typescript
// packages/editor/web/src/widgets/candlestick/config.ts
import type { WidgetConfig } from '../base/types'

export const candlestickConfig: WidgetConfig = {
  name: 'FgCandlestick',
  displayName: 'K 线图',
  description: 'K 线图组件，用于展示股票/金融数据',
  author: 'yangdongnan',
  defaultStyle: {
    width: '100%',
    height: '400px',
  },
  defaultProps: {
    staticData: [
      { date: '2024-01', open: 20, close: 30, low: 15, high: 35 },
      { date: '2024-02', open: 30, close: 25, low: 20, high: 35 },
      { date: '2024-03', open: 25, close: 35, low: 22, high: 38 },
      { date: '2024-04', open: 35, close: 28, low: 25, high: 40 },
      { date: '2024-05', open: 28, close: 38, low: 26, high: 42 },
    ] as Record<string, unknown>[],
    dateField: 'date',
    openField: 'open',
    closeField: 'close',
    lowField: 'low',
    highField: 'high',
    title: '',
    showLegend: false,
    colorScheme: 'default',
    apiUrl: '',
    apiMethod: 'get',
    apiHeaders: {} as Record<string, string>,
    responseDataPath: '',
    rawOption: null as Record<string, unknown> | null,
  },
  exposedValues: [
    { key: 'loading', type: 'boolean', description: '加载状态' },
    { key: 'chartData', type: 'array', description: '图表数据' },
  ],
  configPanels: ['api', 'variables'],
  receivableEvents: [
    { name: 'refresh', description: '重新加载数据' },
    { name: 'set-data', description: '设置图表数据', params: { data: '数据数组' } },
  ],
  propertyPanel: {
    basic: ['label'],
    props: [
      { key: 'dateField', label: '日期字段', type: 'input', placeholder: '如: date' },
      { key: 'openField', label: '开盘字段', type: 'input', placeholder: '如: open' },
      { key: 'closeField', label: '收盘字段', type: 'input', placeholder: '如: close' },
      { key: 'lowField', label: '最低字段', type: 'input', placeholder: '如: low' },
      { key: 'highField', label: '最高字段', type: 'input', placeholder: '如: high' },
      { key: 'title', label: '图表标题', type: 'input' },
      { key: 'showLegend', label: '显示图例', type: 'switch', default: false },
      { key: 'colorScheme', label: '颜色主题', type: 'select', options: [
        { label: '默认', value: 'default' },
        { label: '暗色', value: 'dark' },
        { label: '浅色', value: 'light' },
      ]},
      { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
    ],
  },
}
```

- [ ] **Step 2: 创建 schema.ts**

```typescript
// packages/editor/web/src/widgets/candlestick/schema.ts
import { publicSchema } from '../base/publicSchema'
import { candlestickConfig } from './config'
import type { Widget } from '../base/types'

export function createCandlestickWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'candlestick'),
    name: candlestickConfig.name,
    label: candlestickConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...candlestickConfig.defaultStyle },
    props: { ...candlestickConfig.defaultProps },
  }
}
```

- [ ] **Step 3: 创建 FgCandlestick.vue**

```vue
<!-- packages/editor/web/src/widgets/candlestick/FgCandlestick.vue -->
<script setup lang="ts">
import { inject, watch, onMounted, onUnmounted, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'
import { useChartOption } from '../base/useChartOption'
import { echarts } from '../base/echarts'
import type { EChartsType } from '../base/echarts'

const widgetData = inject(widgetDataKey)!
const { isDisabled } = useWidgetRenderState()

const chartRef = ref<HTMLElement>()
let chartInstance: EChartsType | null = null

const { chartOption, loading, chartData } = useChartOption({
  widgetData,
  buildOption(data, props) {
    const dateField = (props.dateField as string) || 'date'
    const openField = (props.openField as string) || 'open'
    const closeField = (props.closeField as string) || 'close'
    const lowField = (props.lowField as string) || 'low'
    const highField = (props.highField as string) || 'high'
    const title = props.title as string
    const showLegend = props.showLegend === true

    const dates = data.map(d => d[dateField])
    const ohlc = data.map(d => [d[openField], d[closeField], d[lowField], d[highField]])

    return {
      ...(title ? { title: { text: title, left: 'center' } } : {}),
      tooltip: { trigger: 'axis' },
      ...(showLegend ? { legend: { bottom: 0 } } : {}),
      xAxis: { type: 'category', data: dates },
      yAxis: { type: 'value' },
      series: [{
        type: 'candlestick',
        data: ohlc,
      }],
    }
  },
})

useExposeWidget(() => ({
  get loading() { return loading.value },
  get chartData() { return chartData.value },
}))

function renderChart() {
  if (!chartRef.value || !chartOption.value || Object.keys(chartOption.value).length === 0) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  chartInstance.setOption(chartOption.value, true)
}

function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})

watch(chartOption, () => renderChart(), { deep: true })
</script>

<template>
  <div
    ref="chartRef"
    v-loading="loading"
    :class="['fg-chart', { 'is-disabled': isDisabled }]"
    :style="{ width: '100%', height: '100%', minHeight: '200px' }"
  />
</template>

<style module>
.fg-chart {
  position: relative;
}
.fg-chart.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
```

- [ ] **Step 4: 创建 index.ts**

```typescript
// packages/editor/web/src/widgets/candlestick/index.ts
export { default as FgCandlestick } from './FgCandlestick.vue'
export { createCandlestickWidget } from './schema'
export { candlestickConfig } from './config'
```

- [ ] **Step 5: Commit**

```bash
git add packages/editor/web/src/widgets/candlestick/
git commit -m "feat(widgets): add candlestick widget"
```

---

### Task 14: 注册所有图表 Widget

**Files:**
- Modify: `packages/editor/web/src/widgets/registry.ts`
- Modify: `packages/editor/web/src/widgets/index.ts`

- [ ] **Step 1: 更新 registry.ts 的 group 类型**

在 `registry.ts` 的 `WidgetRegistryItem` 接口中，将 `group` 联合类型新增 `'chart'`：

```typescript
group: 'layout' | 'form' | 'container' | 'table' | 'action' | 'static' | 'business' | 'chart'
```

- [ ] **Step 2: 更新 index.ts — 新增导入**

在 `index.ts` 顶部 import 区域新增：

```typescript
import { FgBarChart, createBarChartWidget, barChartConfig } from './bar-chart'
import { FgLineChart, createLineChartWidget, lineChartConfig } from './line-chart'
import { FgPieChart, createPieChartWidget, pieChartConfig } from './pie-chart'
import { FgScatterChart, createScatterChartWidget, scatterChartConfig } from './scatter-chart'
import { FgRadar, createRadarWidget, radarConfig } from './radar'
import { FgGauge, createGaugeWidget, gaugeConfig } from './gauge'
import { FgHeatmap, createHeatmapWidget, heatmapConfig } from './heatmap'
import { FgFunnel, createFunnelWidget, funnelConfig } from './funnel'
import { FgCandlestick, createCandlestickWidget, candlestickConfig } from './candlestick'
```

- [ ] **Step 3: 更新 index.ts — 新增注册调用**

在 `registerAllWidgets()` 函数末尾，`// Table widgets` 分组之后新增：

```typescript
// Chart widgets (图表)
registerWidget({ name: barChartConfig.name, displayName: barChartConfig.displayName, type: 'bar-chart', group: 'chart', component: FgBarChart, create: createBarChartWidget, config: barChartConfig })
registerWidget({ name: lineChartConfig.name, displayName: lineChartConfig.displayName, type: 'line-chart', group: 'chart', component: FgLineChart, create: createLineChartWidget, config: lineChartConfig })
registerWidget({ name: pieChartConfig.name, displayName: pieChartConfig.displayName, type: 'pie-chart', group: 'chart', component: FgPieChart, create: createPieChartWidget, config: pieChartConfig })
registerWidget({ name: scatterChartConfig.name, displayName: scatterChartConfig.displayName, type: 'scatter-chart', group: 'chart', component: FgScatterChart, create: createScatterChartWidget, config: scatterChartConfig })
registerWidget({ name: radarConfig.name, displayName: radarConfig.displayName, type: 'radar', group: 'chart', component: FgRadar, create: createRadarWidget, config: radarConfig })
registerWidget({ name: gaugeConfig.name, displayName: gaugeConfig.displayName, type: 'gauge', group: 'chart', component: FgGauge, create: createGaugeWidget, config: gaugeConfig })
registerWidget({ name: heatmapConfig.name, displayName: heatmapConfig.displayName, type: 'heatmap', group: 'chart', component: FgHeatmap, create: createHeatmapWidget, config: heatmapConfig })
registerWidget({ name: funnelConfig.name, displayName: funnelConfig.displayName, type: 'funnel', group: 'chart', component: FgFunnel, create: createFunnelWidget, config: funnelConfig })
registerWidget({ name: candlestickConfig.name, displayName: candlestickConfig.displayName, type: 'candlestick', group: 'chart', component: FgCandlestick, create: createCandlestickWidget, config: candlestickConfig })
```

- [ ] **Step 4: 类型检查**

```bash
cd /Users/yangdongnan/work/schema-form-platform && pnpm build:web 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add packages/editor/web/src/widgets/registry.ts packages/editor/web/src/widgets/index.ts
git commit -m "feat(widgets): register all 9 chart widgets"
```

---

### Task 15: 最终验证

- [ ] **Step 1: 完整构建**

```bash
cd /Users/yangdongnan/work/schema-form-platform && pnpm build:web
```

Expected: 构建成功，无类型错误

- [ ] **Step 2: 启动开发服务器验证**

```bash
cd /Users/yangdongnan/work/schema-form-platform && pnpm dev:web
```

在浏览器中打开编辑器，验证：
- 左侧组件面板出现 "chart" 分组，包含 9 个图表组件
- 拖拽柱状图到画布，默认静态数据正确渲染
- 右侧属性面板显示配置项（xField, yField, title 等）
- 修改配置项后图表实时更新
- 保存后重新加载图表数据不丢失

- [ ] **Step 3: Commit（如有修复）**

```bash
git add -A
git commit -m "fix(widgets): chart widget integration fixes"
```
