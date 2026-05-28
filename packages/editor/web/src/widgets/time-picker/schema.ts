import { publicSchema } from '../base/publicSchema'
import { timePickerConfig } from './config'
import type { Widget } from '../base/types'

export function createTimePickerWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'time-picker'),
    name: timePickerConfig.name,
    label: timePickerConfig.displayName,
    position: { x: 0, y: 0, w: 280, h: 44, zIndex: 1 },
    style: { ...timePickerConfig.defaultStyle },
    props: { ...timePickerConfig.defaultProps },
  }
}
