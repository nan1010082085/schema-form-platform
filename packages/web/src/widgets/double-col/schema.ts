import { publicSchema } from '../base/publicSchema'
import { doubleColConfig } from './config'
import type { Widget } from '../base/types'

export function createDoubleColWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'double-col'),
    name: doubleColConfig.name,
    label: doubleColConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 60, zIndex: 1 },
    style: { ...doubleColConfig.defaultStyle },
    props: { ...doubleColConfig.defaultProps },
    children: [],
  }
}
