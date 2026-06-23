import { publicSchema } from '../base/publicSchema'
import { switchConfig } from './config'
import type { Widget } from '../base/types'

export function createSwitchWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'switch'),
    name: switchConfig.name,
    label: switchConfig.displayName,
    position: { x: 0, y: 0, w: 280, h: 40, zIndex: 1 },
    style: { ...switchConfig.defaultStyle },
    props: { ...switchConfig.defaultProps },
  }
}
