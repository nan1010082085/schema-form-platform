import { publicSchema } from '../base/publicSchema'
import { titleConfig } from './config'
import type { Widget } from '../base/types'

export function createTitleWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'title'),
    name: titleConfig.name,
    label: titleConfig.displayName,
    position: { x: 0, y: 0, w: 400, h: 40, zIndex: 1 },
    style: { ...titleConfig.defaultStyle },
    props: { ...titleConfig.defaultProps },
  }
}
