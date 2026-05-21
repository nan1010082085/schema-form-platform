import { publicSchema } from '../base/publicSchema'
import { cardConfig } from './config'
import type { Widget } from '../base/types'

export function createCardWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'card'),
    name: cardConfig.name,
    label: cardConfig.displayName,
    position: { x: 0, y: 0, w: 400, h: 200, zIndex: 1 },
    style: { ...cardConfig.defaultStyle },
    props: { ...cardConfig.defaultProps },
    children: [],
  }
}
