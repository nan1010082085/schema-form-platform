import { publicSchema } from '../base/publicSchema'
import { lineChartConfig } from './config'
import type { Widget, WidgetConfig } from '../base/types'

export function createLineChartWidget(id: string, config: WidgetConfig = lineChartConfig): Widget {
  return {
    ...publicSchema(id, config.type || 'line-chart'),
    name: config.name,
    label: config.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...config.defaultStyle },
    props: { ...config.defaultProps },
  }
}
