import { publicSchema } from '../base/publicSchema'
import { buttonConfig } from './config'
import type { Widget } from '../base/types'

export function createButtonWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'button'),
    name: buttonConfig.name,
    label: buttonConfig.displayName,
    position: { x: 0, y: 0, w: 120, h: 44, zIndex: 1 },
    props: { ...buttonConfig.defaultProps },
  }
}
