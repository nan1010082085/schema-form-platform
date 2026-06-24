import { publicSchema } from '../base/publicSchema'
import { roleManagementConfig } from './config'
import type { Widget } from '../base/types'

export function createRoleManagementWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'role-management'),
    name: roleManagementConfig.name,
    label: roleManagementConfig.displayName,
    position: { x: 0, y: 0, w: 800, h: 600, zIndex: 1 },
    style: { ...roleManagementConfig.defaultStyle },
    props: { ...roleManagementConfig.defaultProps },
  }
}
