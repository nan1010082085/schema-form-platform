import { publicSchema } from '../base/publicSchema'
import { editableTableConfig } from './config'
import type { Widget } from '../base/types'

export function createEditableTableWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'editable-table'),
    name: editableTableConfig.name,
    label: editableTableConfig.displayName,
    position: { x: 0, y: 0, w: 800, h: 300, zIndex: 1 },
    style: { ...editableTableConfig.defaultStyle },
    props: { ...editableTableConfig.defaultProps },
  }
}
