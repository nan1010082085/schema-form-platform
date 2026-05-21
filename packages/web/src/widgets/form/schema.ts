import { publicSchema } from '../base/publicSchema'
import { formConfig } from './config'
import type { Widget } from '../base/types'

export function createFormWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'form'),
    name: formConfig.name,
    label: formConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 300, zIndex: 1 },
    style: { ...formConfig.defaultStyle },
    props: { ...formConfig.defaultProps },
    children: [],
  }
}
