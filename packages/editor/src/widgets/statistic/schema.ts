import { publicSchema } from '../base/publicSchema'
import { statisticConfig } from './config'
import type { Widget } from '../base/types'

export function createStatisticWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'statistic'),
    name: statisticConfig.name,
    label: statisticConfig.displayName,
    position: { x: 0, y: 0, w: 300, h: 120, zIndex: 1 },
    style: { ...statisticConfig.defaultStyle },
    props: { ...statisticConfig.defaultProps },
  }
}
