import { publicSchema } from '../base/publicSchema'
import { pieChartConfig } from './config'
import type { Widget } from '../base/types'

export function createPieChartWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'pie-chart'),
    name: pieChartConfig.name,
    label: pieChartConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...pieChartConfig.defaultStyle },
    props: { ...pieChartConfig.defaultProps },
  }
}
