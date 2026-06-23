import { publicSchema } from '../base/publicSchema'
import { advancedTableConfig } from './config'
import type { Widget } from '../base/types'

export function createAdvancedTableWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'advanced-table'),
    name: advancedTableConfig.name,
    label: advancedTableConfig.displayName,
    position: { x: 0, y: 0, w: 700, h: 400, zIndex: 1 },
    style: { ...advancedTableConfig.defaultStyle },
    props: { ...advancedTableConfig.defaultProps },
  }
}
