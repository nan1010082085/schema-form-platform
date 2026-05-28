import { publicSchema } from '../base/publicSchema'
import { cascaderConfig } from './config'
import type { Widget } from '../base/types'

export function createCascaderWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'cascader'),
    name: cascaderConfig.name,
    label: cascaderConfig.displayName,
    position: { x: 0, y: 0, w: 280, h: 44, zIndex: 1 },
    style: { ...cascaderConfig.defaultStyle },
    props: { ...cascaderConfig.defaultProps },
  }
}
