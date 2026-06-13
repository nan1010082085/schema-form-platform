import { publicSchema } from '../base/publicSchema'
import { rateConfig } from './config'
import type { Widget } from '../base/types'

export function createRateWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'rate'),
    name: rateConfig.name,
    label: rateConfig.displayName,
    position: { x: 0, y: 0, w: 240, h: 44, zIndex: 1 },
    style: { ...rateConfig.defaultStyle },
    props: { ...rateConfig.defaultProps },
  }
}
