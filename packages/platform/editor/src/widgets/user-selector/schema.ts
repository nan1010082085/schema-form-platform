import { publicSchema } from '../base/publicSchema'
import { userSelectorConfig } from './config'
import type { Widget } from '../base/types'

export function createUserSelectorWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'user-selector'),
    name: userSelectorConfig.name,
    label: userSelectorConfig.displayName,
    position: { x: 0, y: 0, w: 280, h: 40, zIndex: 1 },
    style: { ...userSelectorConfig.defaultStyle },
    props: { ...userSelectorConfig.defaultProps },
  }
}
