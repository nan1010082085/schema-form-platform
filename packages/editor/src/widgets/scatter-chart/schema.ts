import { publicSchema } from '../base/publicSchema'
import { scatterChartConfig } from './config'
import type { Widget, WidgetConfig } from '../base/types'

export function createScatterChartWidget(id: string, config: WidgetConfig = scatterChartConfig): Widget {
  return {
    ...publicSchema(id, config.type || 'scatter-chart'),
    name: config.name,
    label: config.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...config.defaultStyle },
    props: { ...config.defaultProps },
  }
}
