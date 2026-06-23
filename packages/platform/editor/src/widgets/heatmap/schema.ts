import { publicSchema } from '../base/publicSchema'
import { heatmapConfig } from './config'
import type { Widget } from '../base/types'

export function createHeatmapWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'heatmap'),
    name: heatmapConfig.name,
    label: heatmapConfig.displayName,
    position: { x: 0, y: 0, w: 300, h: 300, zIndex: 1 },
    style: { ...heatmapConfig.defaultStyle },
    props: { ...heatmapConfig.defaultProps },
  }
}
