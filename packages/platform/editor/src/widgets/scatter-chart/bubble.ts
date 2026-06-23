import { bubbleChartConfig } from './config-bubble'
import { FgBubbleChart, createScatterChartWidget } from './index'

export { FgBubbleChart }

export function createBubbleChartWidget(id: string) {
  return createScatterChartWidget(id, bubbleChartConfig)
}

export { bubbleChartConfig }
