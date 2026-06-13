import { publicSchema } from '../base/publicSchema'
import { funnelConfig } from './config'
import type { Widget } from '../base/types'

export function createFunnelWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'funnel'),
    name: funnelConfig.name,
    label: funnelConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 1 },
    style: { ...funnelConfig.defaultStyle },
    props: { ...funnelConfig.defaultProps },
  }
}
