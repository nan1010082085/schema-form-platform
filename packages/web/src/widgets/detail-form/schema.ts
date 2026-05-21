import { publicSchema } from '../base/publicSchema'
import { detailFormConfig } from './config'
import type { Widget } from '../base/types'

export function createDetailFormWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'detail-form'),
    name: detailFormConfig.name,
    label: detailFormConfig.displayName,
    position: { x: 0, y: 0, w: 600, h: 200, zIndex: 1 },
    style: { ...detailFormConfig.defaultStyle },
    props: { ...detailFormConfig.defaultProps },
  }
}
