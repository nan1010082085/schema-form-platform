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
