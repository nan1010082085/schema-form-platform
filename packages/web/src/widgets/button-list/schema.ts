import { publicSchema } from '../base/publicSchema'
import { buttonListConfig } from './config'
import type { Widget } from '../base/types'

export function createButtonListWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'button-list'),
    name: buttonListConfig.name,
    label: buttonListConfig.displayName,
    position: { x: 0, y: 0, w: 280, h: 44, zIndex: 1 },
    style: { ...buttonListConfig.defaultStyle },
    props: { ...buttonListConfig.defaultProps },
  }
}
