import { publicSchema } from '../base/publicSchema'
import { radarConfig } from './config'
import type { Widget } from '../base/types'

export function createRadarWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'radar'),
    name: radarConfig.name,
    label: radarConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...radarConfig.defaultStyle },
    props: { ...radarConfig.defaultProps },
  }
}
