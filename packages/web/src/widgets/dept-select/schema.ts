import { publicSchema } from '../base/publicSchema'
import { deptSelectConfig } from './config'
import type { Widget } from '../base/types'

export function createDeptSelectWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'dept-select'),
    name: deptSelectConfig.name,
    label: deptSelectConfig.displayName,
    position: { x: 0, y: 0, w: 240, h: 32, zIndex: 1 },
    style: { ...deptSelectConfig.defaultStyle },
    props: { ...deptSelectConfig.defaultProps },
  }
}
