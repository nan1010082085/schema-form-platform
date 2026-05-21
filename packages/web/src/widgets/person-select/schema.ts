import { publicSchema } from '../base/publicSchema'
import { personSelectConfig } from './config'
import type { Widget } from '../base/types'

export function createPersonSelectWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'person-select'),
    name: personSelectConfig.name,
    label: personSelectConfig.displayName,
    position: { x: 0, y: 0, w: 240, h: 32, zIndex: 1 },
    style: { ...personSelectConfig.defaultStyle },
    props: { ...personSelectConfig.defaultProps },
  }
}
