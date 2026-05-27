import { publicSchema } from '../base/publicSchema'
import { spacerConfig } from './config'
import type { Widget } from '../base/types'

export function createSpacerWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'spacer'),
    name: spacerConfig.name,
    label: spacerConfig.displayName,
    position: { x: 0, y: 0, w: 400, h: 20, zIndex: 1 },
    style: { ...spacerConfig.defaultStyle },
    props: { ...spacerConfig.defaultProps },
  }
}
