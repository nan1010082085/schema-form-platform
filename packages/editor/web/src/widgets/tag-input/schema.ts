import { publicSchema } from '../base/publicSchema'
import { tagInputConfig } from './config'
import type { Widget } from '../base/types'

export function createTagInputWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'tag-input'),
    name: tagInputConfig.name,
    label: tagInputConfig.displayName,
    position: { x: 0, y: 0, w: 280, h: 44, zIndex: 1 },
    style: { ...tagInputConfig.defaultStyle },
    props: { ...tagInputConfig.defaultProps },
  }
}
