import { publicSchema } from '../base/publicSchema'
import { permissionTreeConfig } from './config'
import type { Widget } from '../base/types'

export function createPermissionTreeWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'permission-tree'),
    name: permissionTreeConfig.name,
    label: permissionTreeConfig.displayName,
    position: { x: 0, y: 0, w: 400, h: 400, zIndex: 1 },
    props: { ...permissionTreeConfig.defaultProps },
  }
}
