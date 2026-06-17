import { publicSchema } from '../base/publicSchema'
import { inputConfig } from './config'
import type { Widget } from '../base/types'

export function createInputWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'input'),
    name: inputConfig.name,
    label: inputConfig.displayName,
    position: { x: 0, y: 0, w: 280, h: 40, zIndex: 1 },
    style: { ...inputConfig.defaultStyle },
    props: { ...inputConfig.defaultProps },
  }
}
