import { areaChartConfig } from './config-area'
import { FgAreaChart, createLineChartWidget } from './index'

export { FgAreaChart }

export function createAreaChartWidget(id: string) {
  return createLineChartWidget(id, areaChartConfig)
}

export { areaChartConfig }
