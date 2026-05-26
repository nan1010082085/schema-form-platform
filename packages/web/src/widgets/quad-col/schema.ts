import { publicSchema } from '../base/publicSchema'
import { quadColConfig } from './config'
import type { Widget } from '../base/types'

export function createQuadColWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'quad-col'),
    name: quadColConfig.name,
    label: quadColConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 60, zIndex: 1 },
    style: { ...quadColConfig.defaultStyle },
    props: { ...quadColConfig.defaultProps },
    children: [],
  }
}
