import { publicSchema } from '../base/publicSchema'
import { gaugeConfig } from './config'
import type { Widget, WidgetConfig } from '../base/types'

export function createGaugeWidget(id: string, config: WidgetConfig = gaugeConfig): Widget {
  return {
    ...publicSchema(id, config.type || 'gauge'),
    name: config.name,
    label: config.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...config.defaultStyle },
    props: { ...config.defaultProps },
  }
}
