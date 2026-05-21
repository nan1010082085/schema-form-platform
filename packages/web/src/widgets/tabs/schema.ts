import { publicSchema } from '../base/publicSchema'
import { tabsConfig } from './config'
import type { Widget } from '../base/types'

export function createTabsWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'tabs'),
    name: tabsConfig.name,
    label: tabsConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 300, zIndex: 1 },
    style: { ...tabsConfig.defaultStyle },
    props: { ...tabsConfig.defaultProps },
    children: [],
  }
}
