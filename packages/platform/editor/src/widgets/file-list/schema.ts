import { publicSchema } from '../base/publicSchema'
import { fileListConfig } from './config'
import type { Widget } from '../base/types'

export function createFileListWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'file-list'),
    name: fileListConfig.name,
    label: fileListConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 120, zIndex: 1 },
    style: { ...fileListConfig.defaultStyle },
    props: { ...fileListConfig.defaultProps },
  }
}
