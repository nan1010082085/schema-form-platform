import { publicSchema } from '../base/publicSchema'
import { dividerConfig } from './config'
import type { Widget } from '../base/types'

export function createDividerWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'divider'),
    name: dividerConfig.name,
    label: dividerConfig.displayName,
    position: { x: 0, y: 0, w: 400, h: 32, zIndex: 1 },
    style: { ...dividerConfig.defaultStyle },
    props: { ...dividerConfig.defaultProps },
  }
}
