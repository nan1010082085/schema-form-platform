import { publicSchema } from '../base/publicSchema'
import { scatterChartConfig } from './config'
import type { Widget } from '../base/types'

export function createScatterChartWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'scatter-chart'),
    name: scatterChartConfig.name,
    label: scatterChartConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...scatterChartConfig.defaultStyle },
    props: { ...scatterChartConfig.defaultProps },
  }
}
