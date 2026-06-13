import { publicSchema } from '../base/publicSchema'
import { lineChartConfig } from './config'
import type { Widget } from '../base/types'

export function createLineChartWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'line-chart'),
    name: lineChartConfig.name,
    label: lineChartConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...lineChartConfig.defaultStyle },
    props: { ...lineChartConfig.defaultProps },
  }
}
