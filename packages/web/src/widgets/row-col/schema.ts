import { publicSchema } from '../base/publicSchema'
import { rowColConfig } from './config'
import type { Widget } from '../base/types'

export function createRowColWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'row-col'),
    name: rowColConfig.name,
    label: rowColConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 44, zIndex: 1 },
    style: { ...rowColConfig.defaultStyle },
    props: { ...rowColConfig.defaultProps },
    children: [],
  }
}
