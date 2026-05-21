import { publicSchema } from '../base/publicSchema'
import { dateConfig } from './config'
import type { Widget } from '../base/types'

export function createDateWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'date'),
    name: dateConfig.name,
    label: dateConfig.displayName,
    position: { x: 0, y: 0, w: 280, h: 44, zIndex: 1 },
    style: { ...dateConfig.defaultStyle },
    props: { ...dateConfig.defaultProps },
  }
}
