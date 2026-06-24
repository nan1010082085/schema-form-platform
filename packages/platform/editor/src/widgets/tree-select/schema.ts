import { publicSchema } from '../base/publicSchema'
import { treeSelectConfig } from './config'
import type { Widget } from '../base/types'

export function createTreeSelectWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'tree-select'),
    name: treeSelectConfig.name,
    label: treeSelectConfig.displayName,
    position: { x: 0, y: 0, w: 280, h: 40, zIndex: 1 },
    style: { ...treeSelectConfig.defaultStyle },
    props: { ...treeSelectConfig.defaultProps },
    options: [
      {
        label: '节点一',
        value: '1',
        children: [
          { label: '子节点 1-1', value: '1-1' },
          { label: '子节点 1-2', value: '1-2' },
        ],
      },
      {
        label: '节点二',
        value: '2',
        children: [
          { label: '子节点 2-1', value: '2-1' },
        ],
      },
      { label: '节点三', value: '3' },
    ],
  }
}
