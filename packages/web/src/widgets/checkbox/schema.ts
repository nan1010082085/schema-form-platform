import { publicSchema } from '../base/publicSchema'
import { checkboxConfig } from './config'
import type { Widget } from '../base/types'

export function createCheckboxWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'checkbox'),
    name: checkboxConfig.name,
    label: checkboxConfig.displayName,
    position: { x: 0, y: 0, w: 280, h: 44, zIndex: 1 },
    style: { ...checkboxConfig.defaultStyle },
    props: { ...checkboxConfig.defaultProps },
    options: [
      { label: '选项一', value: '1' },
      { label: '选项二', value: '2' },
      { label: '选项三', value: '3' },
    ],
    defaultValue: [],
  }
}
