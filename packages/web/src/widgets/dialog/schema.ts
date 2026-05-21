import { publicSchema } from '../base/publicSchema'
import { dialogConfig } from './config'
import type { Widget } from '../base/types'

export function createDialogWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'dialog'),
    name: dialogConfig.name,
    label: dialogConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 400, zIndex: 100 },
    style: { ...dialogConfig.defaultStyle },
    props: { ...dialogConfig.defaultProps },
    children: [],
  }
}
