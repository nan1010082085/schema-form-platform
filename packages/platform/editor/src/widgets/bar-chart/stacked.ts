import { stackedBarChartConfig } from './config-stacked'
import { FgStackedBarChart, createBarChartWidget } from './index'

export { FgStackedBarChart }

export function createStackedBarChartWidget(id: string) {
  return createBarChartWidget(id, stackedBarChartConfig)
}

export { stackedBarChartConfig }
