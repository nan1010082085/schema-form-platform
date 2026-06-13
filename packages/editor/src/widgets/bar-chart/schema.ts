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
