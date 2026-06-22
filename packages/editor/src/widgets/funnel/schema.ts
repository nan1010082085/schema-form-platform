import { publicSchema } from '../base/publicSchema'
import { funnelConfig } from './config'
import type { Widget, WidgetConfig } from '../base/types'

export function createFunnelWidget(id: string, config: WidgetConfig = funnelConfig): Widget {
  return {
    ...publicSchema(id, config.type || 'funnel'),
    name: config.name,
    label: config.displayName,
    position: { x: 0, y: 0, w: 300, h: 300, zIndex: 1 },
    style: { ...config.defaultStyle },
    props: { ...config.defaultProps },
  }
}
