import { publicSchema } from '../base/publicSchema'
import { barChartConfig } from './config'
import type { Widget, WidgetConfig } from '../base/types'

export function createBarChartWidget(id: string, config: WidgetConfig = barChartConfig): Widget {
  return {
    ...publicSchema(id, config.type || 'bar-chart'),
    name: config.name,
    label: config.displayName,
    position: { x: 0, y: 0, w: 300, h: 300, zIndex: 1 },
    style: { ...config.defaultStyle },
    props: { ...config.defaultProps },
  }
}
