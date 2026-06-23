import { horizontalBarChartConfig } from './config-horizontal'
import { FgHorizontalBarChart, createBarChartWidget } from './index'

export { FgHorizontalBarChart }

export function createHorizontalBarChartWidget(id: string) {
  return createBarChartWidget(id, horizontalBarChartConfig)
}

export { horizontalBarChartConfig }
