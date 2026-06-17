import { publicSchema } from '../base/publicSchema'
import { numberConfig } from './config'
import type { Widget } from '../base/types'

export function createNumberWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'number'),
    name: numberConfig.name,
    label: numberConfig.displayName,
    position: { x: 0, y: 0, w: 280, h: 40, zIndex: 1 },
    style: { ...numberConfig.defaultStyle },
    props: { ...numberConfig.defaultProps },
  }
}
