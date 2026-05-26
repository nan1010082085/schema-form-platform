import { publicSchema } from '../base/publicSchema'
import { singleColConfig } from './config'
import type { Widget } from '../base/types'

export function createSingleColWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'single-col'),
    name: singleColConfig.name,
    label: singleColConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 60, zIndex: 1 },
    style: { ...singleColConfig.defaultStyle },
    props: { ...singleColConfig.defaultProps },
    children: [],
  }
}
