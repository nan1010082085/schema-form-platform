import { publicSchema } from '../base/publicSchema'
import { tripleColConfig } from './config'
import type { Widget } from '../base/types'

export function createTripleColWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'triple-col'),
    name: tripleColConfig.name,
    label: tripleColConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 60, zIndex: 1 },
    style: { ...tripleColConfig.defaultStyle },
    props: { ...tripleColConfig.defaultProps },
    children: [],
  }
}
