import { publicSchema } from '../base/publicSchema'
import { toolbarButtonsConfig } from './config'
import type { Widget } from '../base/types'

export function createToolbarButtonsWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'toolbar-buttons'),
    name: toolbarButtonsConfig.name,
    label: toolbarButtonsConfig.displayName,
    position: { x: 0, y: 0, w: 320, h: 40, zIndex: 1 },
    style: { ...toolbarButtonsConfig.defaultStyle },
    props: { ...toolbarButtonsConfig.defaultProps },
  }
}
