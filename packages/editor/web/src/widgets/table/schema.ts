import { publicSchema } from '../base/publicSchema'
import { tableConfig } from './config'
import type { Widget } from '../base/types'

export function createTableWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'table'),
    name: tableConfig.name,
    label: tableConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 300, zIndex: 1 },
    style: { ...tableConfig.defaultStyle },
    props: { ...tableConfig.defaultProps },
  }
}
