import { publicSchema } from '../base/publicSchema'
import { iconPickerConfig } from './config'
import type { Widget } from '../base/types'

export function createIconPickerWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'icon-picker'),
    name: iconPickerConfig.name,
    label: iconPickerConfig.displayName,
    position: { x: 0, y: 0, w: 280, h: 40, zIndex: 1 },
    style: { ...iconPickerConfig.defaultStyle },
    props: { ...iconPickerConfig.defaultProps },
  }
}
