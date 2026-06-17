import { donutChartConfig } from './config-donut'
import { FgDonutChart, createPieChartWidget } from './index'

export { FgDonutChart }

export function createDonutChartWidget(id: string) {
  return createPieChartWidget(id, donutChartConfig)
}

export { donutChartConfig }
