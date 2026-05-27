import { publicSchema } from '../base/publicSchema'
import { dateTimeSlotConfig } from './config'
import type { Widget } from '../base/types'

export function createDateTimeSlotWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'date-time-slot'),
    name: dateTimeSlotConfig.name,
    label: dateTimeSlotConfig.displayName,
    position: { x: 0, y: 0, w: 400, h: 44, zIndex: 1 },
    style: { ...dateTimeSlotConfig.defaultStyle },
    props: { ...dateTimeSlotConfig.defaultProps },
  }
}
