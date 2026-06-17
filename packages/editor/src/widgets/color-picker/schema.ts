import { publicSchema } from '../base/publicSchema'
import { colorPickerConfig } from './config'
import type { Widget } from '../base/types'

export function createColorPickerWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'color-picker'),
    name: colorPickerConfig.name,
    label: colorPickerConfig.displayName,
    position: { x: 0, y: 0, w: 280, h: 40, zIndex: 1 },
    style: { ...colorPickerConfig.defaultStyle },
    props: { ...colorPickerConfig.defaultProps },
  }
}
