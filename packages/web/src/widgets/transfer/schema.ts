import { publicSchema } from '../base/publicSchema'
import { transferConfig } from './config'
import type { Widget } from '../base/types'

export function createTransferWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'transfer'),
    name: transferConfig.name,
    label: transferConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 300, zIndex: 1 },
    style: { ...transferConfig.defaultStyle },
    props: { ...transferConfig.defaultProps },
  }
}
