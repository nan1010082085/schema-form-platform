import { publicSchema } from '../base/publicSchema'
import { radarConfig } from './config'
import type { Widget, WidgetConfig } from '../base/types'

export function createRadarWidget(id: string, config: WidgetConfig = radarConfig): Widget {
  return {
    ...publicSchema(id, config.type || 'radar'),
    name: config.name,
    label: config.displayName,
    position: { x: 0, y: 0, w: 300, h: 300, zIndex: 1 },
    style: { ...config.defaultStyle },
    props: { ...config.defaultProps },
  }
}
