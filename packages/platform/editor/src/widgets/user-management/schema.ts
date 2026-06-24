import { publicSchema } from '../base/publicSchema'
import { userManagementConfig } from './config'
import type { Widget } from '../base/types'

export function createUserManagementWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'user-management'),
    name: userManagementConfig.name,
    label: userManagementConfig.displayName,
    position: { x: 0, y: 0, w: 800, h: 600, zIndex: 1 },
    style: { ...userManagementConfig.defaultStyle },
    props: { ...userManagementConfig.defaultProps },
  }
}
