import { publicSchema } from '../base/publicSchema'
import { sliderConfig } from './config'
import type { Widget } from '../base/types'

export function createSliderWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'slider'),
    name: sliderConfig.name,
    label: sliderConfig.displayName,
    position: { x: 0, y: 0, w: 280, h: 40, zIndex: 1 },
    style: { ...sliderConfig.defaultStyle },
    props: { ...sliderConfig.defaultProps },
  }
}
