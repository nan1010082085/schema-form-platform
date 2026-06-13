import { publicSchema } from '../base/publicSchema'
import { gaugeConfig } from './config'
import type { Widget } from '../base/types'

export function createGaugeWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'gauge'),
    name: gaugeConfig.name,
    label: gaugeConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...gaugeConfig.defaultStyle },
    props: { ...gaugeConfig.defaultProps },
  }
}
