import { publicSchema } from '../base/publicSchema'
import { textareaConfig } from './config'
import type { Widget } from '../base/types'

export function createTextareaWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'textarea'),
    name: textareaConfig.name,
    label: textareaConfig.displayName,
    position: { x: 0, y: 0, w: 240, h: 80, zIndex: 1 },
    style: { ...textareaConfig.defaultStyle },
    props: { ...textareaConfig.defaultProps },
  }
}
